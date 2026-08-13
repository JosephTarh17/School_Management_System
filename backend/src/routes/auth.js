import express from 'express'
import bcrypt from 'bcryptjs'
import { supabase } from '../supabaseClient.js'
import { ApiError, asText, asyncRoute, sendData } from '../lib/api.js'
import { clearAuthCookie, requireAuth, setAuthCookie, signAccessToken } from '../middleware/auth.js'

const router = express.Router()
const attempts = new Map()
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const MAX_LOGIN_ATTEMPTS = 5

function loginKey(req, email) {
  return `${req.ip}:${email}`
}

function assertLoginAllowed(key) {
  const now = Date.now()
  const recent = (attempts.get(key) || []).filter((timestamp) => now - timestamp < LOGIN_WINDOW_MS)
  attempts.set(key, recent)
  if (recent.length >= MAX_LOGIN_ATTEMPTS) throw new ApiError(429, 'Too many login attempts. Try again later')
}

function recordFailedLogin(key) {
  attempts.set(key, [...(attempts.get(key) || []), Date.now()])
}

router.post('/login', asyncRoute(async (req, res) => {
  const email = asText(req.body?.email, 'email', { max: 320 }).toLowerCase()
  const password = asText(req.body?.password, 'password', { max: 128 })
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'email must be a valid email address')
  const key = loginKey(req, email)
  assertLoginAllowed(key)

  const { data: users, error } = await supabase
    .from('user_account')
    .select('user_id,email,password_hash,role')
    .eq('email', email)
    .limit(1)
  if (error) throw error

  const user = users?.[0]
  if (!user?.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
    recordFailedLogin(key)
    throw new ApiError(401, 'Invalid email or password')
  }

  attempts.delete(key)
  const { error: loginError } = await supabase.from('user_account').update({ last_login: new Date().toISOString() }).eq('user_id', user.user_id)
  if (loginError) throw loginError
  const token = signAccessToken(user)
  setAuthCookie(res, token)
  return res.json({ token, data: { token, user: { user_id: user.user_id, email: user.email, role: user.role } } })
}))

router.post('/refresh', requireAuth, asyncRoute(async (req, res) => {
  const token = signAccessToken(req.user)
  setAuthCookie(res, token)
  return res.json({ token, data: { token } })
}))

router.post('/logout', requireAuth, asyncRoute(async (req, res) => {
  clearAuthCookie(res)
  return res.status(204).send()
}))

router.get('/session', requireAuth, asyncRoute(async (req, res) => {
  return sendData(res, {
    user_id: req.user.user_id,
    email: req.user.email,
    role: req.user.role,
    expires_at: req.user.exp ? new Date(req.user.exp * 1000).toISOString() : null,
  })
}))

export default router
