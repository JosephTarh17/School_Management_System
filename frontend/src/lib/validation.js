export function required(value, label = 'This field') {
  return String(value ?? '').trim() ? '' : `${label} is required.`
}

export function email(value) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return 'Email is required.'
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? '' : 'Enter a valid email address.'
}

export function password(value, { minLength = 8 } = {}) {
  const normalized = String(value ?? '')
  if (!normalized) return 'Password is required.'
  return normalized.length >= minLength ? '' : `Password must be at least ${minLength} characters.`
}

export function uuid(value, label = 'ID') {
  const normalized = String(value ?? '').trim()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)
    ? ''
    : `${label} must be a valid identifier.`
}

export function dateOrder(start, end, startLabel = 'Start date', endLabel = 'End date') {
  if (!start || !end) return ''
  return new Date(start) <= new Date(end) ? '' : `${endLabel} must be on or after ${startLabel.toLowerCase()}.`
}

export function numberRange(value, label, { min = -Infinity, max = Infinity, requiredValue = true } = {}) {
  if (value === '' || value === null || value === undefined) return requiredValue ? `${label} is required.` : ''
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return `${label} must be a number.`
  if (parsed < min || parsed > max) return `${label} must be between ${min} and ${max}.`
  return ''
}

export function validate(rules) {
  return Object.fromEntries(Object.entries(rules).map(([field, messages]) => [field, messages.find(Boolean) || '']))
}

export function firstError(errors) {
  return Object.values(errors).find(Boolean) || ''
}
