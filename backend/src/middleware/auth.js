import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { supabase } from '../supabaseClient.js'
import { ApiError } from '../lib/api.js'
import { assertActiveSession } from '../lib/sessions.js'

const JWT_ALGORITHM = 'HS256'
const JWT_ISSUER = process.env.JWT_ISSUER || 'school-management-system'
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'school-management-client'
const ACCESS_TOKEN_COOKIE = process.env.ACCESS_TOKEN_COOKIE || 'sms_access_token'
const DEFAULT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h'
// A fresh process identifier invalidates all access tokens after a backend restart.
const SESSION_INSTANCE_ID = randomUUID()
const ACCOUNT_SETUP_PATHS = new Set([
  '/auth/logout',
  '/auth/refresh',
  '/auth/session',
  '/users/me',
  '/users/me/change-password',
  '/auth/mfa/enroll',
  '/auth/mfa/verify-enrollment',
  '/auth/mfa/disable',
])

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) throw new ApiError(500, 'JWT_SECRET must be configured with at least 32 characters')
  return secret
}

export function signAccessToken(user, sessionId = randomUUID()) {
  if (!user?.user_id || !user?.email || !user?.role) throw new ApiError(500, 'Cannot create a session for an incomplete user')
  return jwt.sign(
    { user_id: user.user_id, email: user.email, role: user.role, token_type: 'access', instance_id: SESSION_INSTANCE_ID, session_id: sessionId },
    getJwtSecret(),
    { algorithm: JWT_ALGORITHM, expiresIn: DEFAULT_EXPIRES_IN, issuer: JWT_ISSUER, audience: JWT_AUDIENCE, jwtid: randomUUID() }
  )
}

export function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret(), { algorithms: [JWT_ALGORITHM], issuer: JWT_ISSUER, audience: JWT_AUDIENCE })
}

export function signMfaChallenge(user) {
  return jwt.sign({ user_id: user.user_id, token_type: 'mfa_challenge', instance_id: SESSION_INSTANCE_ID }, getJwtSecret(), { algorithm: JWT_ALGORITHM, expiresIn: '5m', issuer: JWT_ISSUER, audience: JWT_AUDIENCE, jwtid: randomUUID() })
}

export function verifyMfaChallenge(token) {
  const payload = jwt.verify(token, getJwtSecret(), { algorithms: [JWT_ALGORITHM], issuer: JWT_ISSUER, audience: JWT_AUDIENCE })
  if (payload.token_type !== 'mfa_challenge' || payload.instance_id !== SESSION_INSTANCE_ID || !payload.user_id) throw new ApiError(401, 'Invalid or expired MFA challenge')
  return payload
}

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((part) => part.trim().split('='))
    .filter(([name, value]) => name && value)
    .map(([name, value]) => [name, decodeURIComponent(value)]))
}

function extractToken(req) {
  const authHeader = req.headers.authorization
  if (authHeader) {
    if (!authHeader.startsWith('Bearer ')) throw new ApiError(401, 'Authorization must use the Bearer scheme')
    const token = authHeader.slice('Bearer '.length).trim()
    if (!token) throw new ApiError(401, 'Authentication required')
    return token
  }
  const cookieToken = parseCookies(req.headers.cookie || '')[ACCESS_TOKEN_COOKIE]
  if (cookieToken) return cookieToken
  throw new ApiError(401, 'Authentication required')
}

async function assertAccountAccessAllowed(userId, req) {
  const { data: account, error } = await supabase.from('user_account').select('disabled_at,must_change_password,mfa_reset_required,role').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!account || account.disabled_at) throw new ApiError(401, 'Account is disabled or unavailable')
  const fullPath = `${req.baseUrl || ''}${req.path || ''}`
  if (!ACCOUNT_SETUP_PATHS.has(fullPath)) {
    if (account.must_change_password) throw new ApiError(403, 'Password change required before continuing')
    if (account.role === 'administrator' && account.mfa_reset_required) throw new ApiError(403, 'MFA setup required before continuing')
  }
  return account
}

export function requireAuth(req, res, next) {
  let token
  try {
    token = extractToken(req)
    if (token.length > 4096) throw new ApiError(401, 'Invalid or expired token')
    const payload = verifyAccessToken(token)
    if (payload.token_type !== 'access' || payload.instance_id !== SESSION_INSTANCE_ID || !payload.user_id || !payload.email || !payload.role || !payload.session_id) throw new ApiError(401, 'Invalid or expired token')
    req.auth = { token, payload }
    req.user = payload
    return assertActiveSession(token, payload.session_id)
      .then(() => assertAccountAccessAllowed(payload.user_id, req))
      .then(() => next())
      .catch((error) => next(error instanceof ApiError ? error : new ApiError(401, 'Invalid or expired session')))
  } catch (error) {
    return next(error instanceof ApiError ? error : new ApiError(401, 'Invalid or expired token'))
  }
}

export function requireRole(...roles) {
  if (!roles.length) throw new Error('requireRole requires at least one role')
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Authentication required'))
    if (!roles.includes(req.user.role)) return next(new ApiError(403, 'You do not have permission to perform this action'))
    return next()
  }
}

export function setAuthCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  // No Max-Age/Expires: this is a browser-session cookie and is not persistent across browser close.
  res.setHeader('Set-Cookie', `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict${secure}`)
}

export function clearAuthCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.setHeader('Set-Cookie', `${ACCESS_TOKEN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`)
}

export { ACCESS_TOKEN_COOKIE, JWT_AUDIENCE, JWT_ISSUER }
