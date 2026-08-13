import jwt from 'jsonwebtoken'
import { ApiError } from '../lib/api.js'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key'

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return next(new ApiError(401, 'Authentication required'))

  const token = authHeader.slice('Bearer '.length).trim()
  if (!token) return next(new ApiError(401, 'Authentication required'))

  try {
    req.user = jwt.verify(token, JWT_SECRET)
    return next()
  } catch {
    return next(new ApiError(401, 'Invalid or expired token'))
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) return next(new ApiError(403, 'You do not have permission to perform this action'))
    return next()
  }
}

export { JWT_SECRET }
