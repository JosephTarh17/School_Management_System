import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ENUMS, ApiError, asEnum, asText, asUuid, asyncRoute, sendData } from '../lib/api.js'
import { hashPassword, verifyPassword } from '../lib/security.js'
import { revokeAllUserSessions } from '../lib/sessions.js'

const router = express.Router()
router.use(requireAuth)
const publicFields = 'user_id,email,role,mfa_enabled,created_at,last_login'

export function parsePasswordChange(body = {}) {
  const currentPassword = asText(body.current_password, 'current_password', { max: 128 })
  const newPassword = asText(body.new_password, 'new_password', { max: 128 })
  if (newPassword.length < 8) throw new ApiError(400, 'new_password must be at least 8 characters')
  if (currentPassword === newPassword) throw new ApiError(400, 'new_password must be different from the current password')
  return { currentPassword, newPassword }
}

router.get('/', requireRole('administrator'), asyncRoute(async (req, res) => {
  const { data, error } = await supabase.from('user_account').select(`${publicFields}, guardian(guardian_id,full_name,email,phone,relationship)`).order('created_at', { ascending: false })
  if (error) throw error
  return sendData(res, data)
}))

router.get('/me', asyncRoute(async (req, res) => {
  const { data, error } = await supabase
    .from('user_account')
    .select(`${publicFields}, student(*), teacher(*), guardian(*), administrator(*)`)
    .eq('user_id', req.user.user_id)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'User not found')
  return sendData(res, data)
}))

router.get('/:userId', asyncRoute(async (req, res) => {
  const userId = asUuid(req.params.userId, 'userId')
  if (req.user.role !== 'administrator' && req.user.user_id !== userId) throw new ApiError(403, 'You do not have permission to view this user')
  const { data, error } = await supabase.from('user_account').select(`${publicFields}, student(*), teacher(*), guardian(*), administrator(*)`).eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'User not found')
  return sendData(res, data)
}))

router.post('/register', requireRole('administrator'), asyncRoute(async (req, res) => {
  const email = asText(req.body?.email, 'email', { max: 320 }).toLowerCase()
  const password = asText(req.body?.password, 'password', { max: 128 })
  const role = asEnum(req.body?.role, 'role', ENUMS.roles)
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'email must be a valid email address')
  if (password.length < 8) throw new ApiError(400, 'password must be at least 8 characters')
  const password_hash = await hashPassword(password)
  const { data, error } = await supabase.from('user_account').insert({ email, password_hash, role }).select(publicFields).single()
  if (error) throw error
  return sendData(res, data, 201)
}))

router.post('/register-guardian', requireRole('administrator'), asyncRoute(async (req, res) => {
  const email = asText(req.body?.email, 'email', { max: 320 }).toLowerCase()
  const password = asText(req.body?.password, 'password', { max: 128 })
  const full_name = asText(req.body?.full_name, 'full_name', { max: 160 })
  const phone = asText(req.body?.phone, 'phone', { max: 40, optional: true })
  const relationship = asText(req.body?.relationship, 'relationship', { max: 80, optional: true })
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'email must be a valid email address')
  if (password.length < 8) throw new ApiError(400, 'password must be at least 8 characters')

  const password_hash = await hashPassword(password)
  const { data: account, error: accountError } = await supabase
    .from('user_account')
    .insert({ email, password_hash, role: 'guardian' })
    .select(publicFields)
    .single()
  if (accountError?.code === '23505') throw new ApiError(409, 'An account with this email already exists')
  if (accountError) throw accountError

  const { data: guardian, error: guardianError } = await supabase
    .from('guardian')
    .insert({ user_id: account.user_id, full_name, email, phone, relationship })
    .select('guardian_id,user_id,full_name,email,phone,relationship')
    .single()
  if (guardianError) {
    await supabase.from('user_account').delete().eq('user_id', account.user_id)
    if (guardianError.code === '23505') throw new ApiError(409, 'This user account already has a guardian profile')
    throw guardianError
  }

  return sendData(res, { ...account, guardian }, 201)
}))

router.post('/me/change-password', asyncRoute(async (req, res) => {
  const { currentPassword, newPassword } = parsePasswordChange(req.body)

  const { data: user, error: userError } = await supabase
    .from('user_account')
    .select('user_id,password_hash')
    .eq('user_id', req.user.user_id)
    .maybeSingle()
  if (userError) throw userError
  if (!user?.password_hash || !await verifyPassword(user.password_hash, currentPassword)) throw new ApiError(401, 'Current password is incorrect')

  const password_hash = await hashPassword(newPassword)
  const { error: updateError } = await supabase
    .from('user_account')
    .update({ password_hash, password_algorithm: 'argon2id' })
    .eq('user_id', req.user.user_id)
  if (updateError) throw updateError

  await revokeAllUserSessions(req.user.user_id)
  return sendData(res, { message: 'Password changed successfully. Please sign in again.' })
}))

router.patch('/me', asyncRoute(async (req, res) => {
  if (req.body?.password !== undefined) throw new ApiError(400, 'Use the change-password feature to update your password')
  const updates = {}
  if (req.body?.email !== undefined) updates.email = asText(req.body.email, 'email', { max: 320 }).toLowerCase()
  if (!Object.keys(updates).length) throw new ApiError(400, 'At least one editable field is required')
  const { data, error } = await supabase.from('user_account').update(updates).eq('user_id', req.user.user_id).select(publicFields).single()
  if (error) throw error
  return sendData(res, data)
}))

export default router
