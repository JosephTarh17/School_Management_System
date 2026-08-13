import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { ApiError } from '../lib/api.js'

const JWT_ALGORITHM = 'HS256'
const JWT_ISSUER = process.env.JWT_ISSUER || 'school-management-system'
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'school-management-client'
const ACCESS_TOKEN_COOKIE = process.env.ACCESS_TOKEN_COOKIE || 'sms_access_token'
const DEFAULT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h'

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) throw new ApiError(500, 'JWT_SECRET must be configured with at least 32 characters')
  return secret
}

export function signAccessToken(user) {
  if (!user?.user_id || !user?.email || !user?.role) throw new ApiError(500, 'Cannot create a session for an incomplete user')
  return jwt.sign(
    { user_id: user.user_id, email: user.email, role: user.role, token_type: 'access' },
    getJwtSecret(),
    { algorithm: JWT_ALGORITHM, expiresIn: DEFAULT_EXPIRES_IN, issuer: JWT_ISSUER, audience: JWT_AUDIENCE, jwtid: randomUUID() }
  )
}

export function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret(), { algorithms: [JWT_ALGORITHM], issuer: JWT_ISSUER, audience: JWT_AUDIENCE })
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

export function requireAuth(req, res, next) {
  try {
    const token = extractToken(req)
    if (token.length > 4096) throw new ApiError(401, 'Invalid or expired token')
    const payload = verifyAccessToken(token)
    if (payload.token_type !== 'access' || !payload.user_id || !payload.email || !payload.role) throw new ApiError(401, 'Invalid or expired token')
    req.auth = { token, payload }
    req.user = payload
    return next()
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
  res.setHeader('Set-Cookie', `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secure}`)
}

export function clearAuthCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.setHeader('Set-Cookie', `${ACCESS_TOKEN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`)
}

export { ACCESS_TOKEN_COOKIE, JWT_AUDIENCE, JWT_ISSUER }
