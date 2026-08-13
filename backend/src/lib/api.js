import { createHash } from 'node:crypto'

export const ENUMS = {
  roles: ['student', 'teacher', 'guardian', 'administrator'],
  attendanceStatus: ['Present', 'Absent', 'Late', 'Excused'],
  assessmentType: ['Quiz', 'Assignment', 'Midterm', 'Final'],
  participationRating: ['Active', 'Moderate', 'Passive', 'Disruptive'],
  paymentStatus: ['Pending', 'Paid', 'Overdue', 'Cancelled'],
}

export function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function isDateTime(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

export function asText(value, field, { max = 255, optional = false } = {}) {
  if (value == null || value === '') {
    if (optional) return undefined
    throw new ApiError(400, `${field} is required`)
  }
  if (typeof value !== 'string' || value.trim().length === 0) throw new ApiError(400, `${field} must be a non-empty string`)
  if (value.trim().length > max) throw new ApiError(400, `${field} must be at most ${max} characters`)
  return value.trim()
}

export function asUuid(value, field, { optional = false } = {}) {
  if (value == null || value === '') {
    if (optional) return undefined
    throw new ApiError(400, `${field} is required`)
  }
  if (!isUuid(value)) throw new ApiError(400, `${field} must be a valid UUID`)
  return value
}

export function asDate(value, field, { optional = false } = {}) {
  if (value == null || value === '') {
    if (optional) return undefined
    throw new ApiError(400, `${field} is required`)
  }
  if (!isDate(value)) throw new ApiError(400, `${field} must be a valid YYYY-MM-DD date`)
  return value
}

export function asDateTime(value, field, { optional = false } = {}) {
  if (value == null || value === '') {
    if (optional) return undefined
    throw new ApiError(400, `${field} is required`)
  }
  if (!isDateTime(value)) throw new ApiError(400, `${field} must be a valid date-time`)
  return value
}

export function asNumber(value, field, { optional = false, min, max, integer = false } = {}) {
  if (value == null || value === '') {
    if (optional) return undefined
    throw new ApiError(400, `${field} is required`)
  }
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number) || (integer && !Number.isInteger(number))) throw new ApiError(400, `${field} must be a valid ${integer ? 'integer' : 'number'}`)
  if (min != null && number < min) throw new ApiError(400, `${field} must be at least ${min}`)
  if (max != null && number > max) throw new ApiError(400, `${field} must be at most ${max}`)
  return number
}

export function asEnum(value, field, values, { optional = false } = {}) {
  if (value == null || value === '') {
    if (optional) return undefined
    throw new ApiError(400, `${field} is required`)
  }
  if (!values.includes(value)) throw new ApiError(400, `${field} must be one of: ${values.join(', ')}`)
  return value
}

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

export function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

export function sendData(res, data, status = 200) {
  return res.status(status).json({ data })
}

export function supabaseError(error) {
  if (!error) return null
  const code = error.code
  if (code === '23505') return new ApiError(409, 'A record with the same unique value already exists')
  if (code === '23503') return new ApiError(400, 'One or more referenced records do not exist')
  if (code === '23514' || code === '22P02') return new ApiError(400, 'The request contains invalid data')
  if (code === 'PGRST116') return new ApiError(404, 'Record not found')
  return new ApiError(500, 'Database error')
}

export function assertRole(req, roles) {
  if (!roles.includes(req.user?.role)) throw new ApiError(403, `Only ${roles.join(' or ')} can perform this action`)
}

export function stableId(value) {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 8)
}

export function errorHandler(error, req, res, next) {
  const normalized = error instanceof ApiError ? error : supabaseError(error) || new ApiError(500, 'Internal server error')
  if (normalized.status >= 500) console.error(`[${stableId(error?.stack || normalized.message)}]`, error)
  return res.status(normalized.status).json({ error: normalized.message, ...(normalized.details ? { details: normalized.details } : {}) })
}
