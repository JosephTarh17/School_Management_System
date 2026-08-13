import { randomUUID } from 'node:crypto'
import { supabase } from '../supabaseClient.js'
import { ApiError } from './api.js'
import { hashToken } from './security.js'

export function newSessionId() {
  return randomUUID()
}

export async function createSession(userId, sessionId, token, req, expiresAt) {
  const { error } = await supabase.from('auth_session').insert({
    session_id: sessionId,
    user_id: userId,
    token_hash: hashToken(token),
    expires_at: expiresAt,
    ip_address: req?.ip || null,
    user_agent: req?.get?.('user-agent')?.slice(0, 1000) || null,
  })
  if (error) throw error
  return sessionId
}

export async function assertActiveSession(token, sessionId) {
  if (!sessionId) throw new ApiError(401, 'Invalid or expired token')
  const { data, error } = await supabase.from('auth_session').select('session_id,user_id,expires_at,revoked_at').eq('session_id', sessionId).eq('token_hash', hashToken(token)).maybeSingle()
  if (error) throw error
  if (!data || data.revoked_at || new Date(data.expires_at).getTime() <= Date.now()) throw new ApiError(401, 'Session is revoked or expired')
  return data
}

export async function revokeSession(token) {
  const { error } = await supabase.from('auth_session').update({ revoked_at: new Date().toISOString() }).eq('token_hash', hashToken(token)).is('revoked_at', null)
  if (error) throw error
}

export async function revokeAllUserSessions(userId) {
  const { error } = await supabase.from('auth_session').update({ revoked_at: new Date().toISOString() }).eq('user_id', userId).is('revoked_at', null)
  if (error) throw error
}

export function tokenExpiryDate(payload) {
  if (!payload?.exp) throw new ApiError(500, 'Token expiry is missing')
  return new Date(payload.exp * 1000).toISOString()
}
