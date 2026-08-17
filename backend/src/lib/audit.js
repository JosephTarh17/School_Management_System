import { randomUUID } from 'node:crypto'
import { supabase } from '../supabaseClient.js'
import { safeSecurityMetadata } from './security.js'

export async function recordAuditEvent({ req, action, statusCode, resourceType = null, resourceId = null, metadata = {} }) {
  const { error } = await supabase.from('security_audit_log').insert({
    actor_user_id: req.user?.user_id || null,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    http_method: req.method,
    request_path: req.originalUrl?.slice(0, 500) || req.path,
    status_code: statusCode,
    ip_address: req.ip || null,
    user_agent: req.get?.('user-agent')?.slice(0, 1000) || null,
    correlation_id: req.id || randomUUID(),
    metadata: safeSecurityMetadata(metadata),
  })
  if (error) throw error
}

const NON_AUDITABLE_AUTH_PATHS = new Set([
  '/auth/login',
  '/auth/logout',
  '/auth/refresh',
  '/auth/mfa/verify',
  '/translations',
])

export function shouldAuditRequest(req) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !NON_AUDITABLE_AUTH_PATHS.has(req.path)
}

export function securityAuditMiddleware(req, res, next) {
  if (!shouldAuditRequest(req)) return next()
  res.on('finish', () => {
    recordAuditEvent({ req, action: `${req.method} ${req.path}`, statusCode: res.statusCode }).catch(() => {})
  })
  return next()
}
