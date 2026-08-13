import express from 'express'
import { generateSecret, generateURI, verify as verifyTotp } from 'otplib'
import { supabase } from '../supabaseClient.js'
import { ApiError, asText, asyncRoute, sendData } from '../lib/api.js'
import { clearAuthCookie, requireAuth, requireRole, signAccessToken, signMfaChallenge, verifyAccessToken, verifyMfaChallenge, setAuthCookie } from '../middleware/auth.js'
import { decryptSecret, encryptSecret, hashPassword, isArgon2Hash, verifyPassword } from '../lib/security.js'
import { createSession, newSessionId, revokeAllUserSessions, revokeSession, tokenExpiryDate } from '../lib/sessions.js'

const router = express.Router()
const attempts = new Map()
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const MAX_LOGIN_ATTEMPTS = 5
const publicUserFields = 'user_id,email,password_hash,password_algorithm,role,mfa_enabled,mfa_secret_enc,mfa_pending_secret_enc,disabled_at'

function loginKey(req, email) { return `${req.ip}:${email}` }
function assertLoginAllowed(key) {
  const now = Date.now()
  const recent = (attempts.get(key) || []).filter((timestamp) => now - timestamp < LOGIN_WINDOW_MS)
  attempts.set(key, recent)
  if (recent.length >= MAX_LOGIN_ATTEMPTS) throw new ApiError(429, 'Too many login attempts. Try again later')
}
function recordFailedLogin(key) { attempts.set(key, [...(attempts.get(key) || []), Date.now()]) }

async function loadUserByEmail(email) {
  const { data: users, error } = await supabase.from('user_account').select(publicUserFields).eq('email', email).limit(1)
  if (error) throw error
  return users?.[0]
}

async function loadUserById(userId) {
  const { data, error } = await supabase.from('user_account').select(publicUserFields).eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data
}

async function issueSession(user, req, res) {
  const sessionId = newSessionId()
  const token = signAccessToken(user, sessionId)
  const payload = verifyAccessToken(token)
  await createSession(user.user_id, sessionId, token, req, tokenExpiryDate(payload))
  setAuthCookie(res, token)
  return token
}

async function markLogin(user) {
  const updates = { last_login: new Date().toISOString() }
  if (!isArgon2Hash(user.password_hash)) {
    updates.password_hash = await hashPassword(user.__login_password)
    updates.password_algorithm = 'argon2id'
  }
  const { error } = await supabase.from('user_account').update(updates).eq('user_id', user.user_id)
  if (error) throw error
}

async function verifyTotpSecret(secret, code) {
  const result = await verifyTotp({ secret, token: code })
  return Boolean(result?.valid)
}

router.post('/login', asyncRoute(async (req, res) => {
  const email = asText(req.body?.email, 'email', { max: 320 }).toLowerCase()
  const password = asText(req.body?.password, 'password', { max: 128 })
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'email must be a valid email address')
  const key = loginKey(req, email)
  assertLoginAllowed(key)
  const user = await loadUserByEmail(email)
  const valid = user?.password_hash ? await verifyPassword(user.password_hash, password) : false
  if (!user || !valid || user.disabled_at) {
    recordFailedLogin(key)
    throw new ApiError(401, 'Invalid email or password')
  }
  attempts.delete(key)
  user.__login_password = password
  if (user.role === 'administrator' && user.mfa_enabled) {
    await markLogin(user)
    return res.json({ data: { mfa_required: true, challenge_token: signMfaChallenge(user) } })
  }
  await markLogin(user)
  const token = await issueSession(user, req, res)
  return res.json({ token, data: { token, user: { user_id: user.user_id, email: user.email, role: user.role } } })
}))

router.post('/mfa/verify', asyncRoute(async (req, res) => {
  const challenge = asText(req.body?.challenge_token, 'challenge_token', { max: 4096 })
  const code = asText(req.body?.code, 'code', { max: 12 })
  const payload = verifyMfaChallenge(challenge)
  const user = await loadUserById(payload.user_id)
  if (!user || user.role !== 'administrator' || !user.mfa_enabled || !user.mfa_secret_enc) throw new ApiError(401, 'MFA verification is unavailable')
  const valid = await verifyTotpSecret(decryptSecret(user.mfa_secret_enc), code)
  if (!valid) throw new ApiError(401, 'Invalid MFA code')
  const token = await issueSession(user, req, res)
  return res.json({ token, data: { token, user: { user_id: user.user_id, email: user.email, role: user.role } } })
}))

router.post('/refresh', requireAuth, asyncRoute(async (req, res) => {
  await revokeSession(req.auth.token)
  const user = await loadUserById(req.user.user_id)
  if (!user || user.disabled_at) throw new ApiError(401, 'Account is disabled or unavailable')
  const token = await issueSession(user, req, res)
  return res.json({ token, data: { token } })
}))

router.post('/logout', requireAuth, asyncRoute(async (req, res) => {
  await revokeSession(req.auth.token)
  clearAuthCookie(res)
  return res.status(204).send()
}))

router.get('/session', requireAuth, asyncRoute(async (req, res) => {
  return sendData(res, { user_id: req.user.user_id, email: req.user.email, role: req.user.role, session_id: req.user.session_id, expires_at: req.user.exp ? new Date(req.user.exp * 1000).toISOString() : null })
}))

router.post('/mfa/enroll', requireRole('administrator'), asyncRoute(async (req, res) => {
  const user = await loadUserById(req.user.user_id)
  const secret = generateSecret()
  const uri = generateURI({ issuer: process.env.MFA_ISSUER || 'School Management System', label: user.email, secret })
  const { error } = await supabase.from('user_account').update({ mfa_pending_secret_enc: encryptSecret(secret) }).eq('user_id', user.user_id)
  if (error) throw error
  return sendData(res, { provisioning_uri: uri, expires_in: 'until replaced or verified' })
}))

router.post('/mfa/verify-enrollment', requireRole('administrator'), asyncRoute(async (req, res) => {
  const code = asText(req.body?.code, 'code', { max: 12 })
  const user = await loadUserById(req.user.user_id)
  if (!user?.mfa_pending_secret_enc) throw new ApiError(400, 'MFA enrollment has not been started')
  const secret = decryptSecret(user.mfa_pending_secret_enc)
  if (!await verifyTotpSecret(secret, code)) throw new ApiError(400, 'Invalid MFA code')
  const { error } = await supabase.from('user_account').update({ mfa_enabled: true, mfa_secret_enc: encryptSecret(secret), mfa_pending_secret_enc: null, mfa_enrolled_at: new Date().toISOString() }).eq('user_id', user.user_id)
  if (error) throw error
  return sendData(res, { mfa_enabled: true })
}))

router.post('/mfa/disable', requireRole('administrator'), asyncRoute(async (req, res) => {
  const code = asText(req.body?.code, 'code', { max: 12 })
  const user = await loadUserById(req.user.user_id)
  if (!user?.mfa_enabled || !user.mfa_secret_enc || !await verifyTotpSecret(decryptSecret(user.mfa_secret_enc), code)) throw new ApiError(400, 'Valid current MFA code is required')
  const { error } = await supabase.from('user_account').update({ mfa_enabled: false, mfa_secret_enc: null, mfa_pending_secret_enc: null }).eq('user_id', user.user_id)
  if (error) throw error
  return sendData(res, { mfa_enabled: false })
}))

export { issueSession }
export default router
