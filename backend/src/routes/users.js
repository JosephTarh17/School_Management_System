import express from 'express'
import { randomBytes } from 'node:crypto'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ENUMS, ApiError, asEnum, asText, asUuid, asyncRoute, sendData } from '../lib/api.js'
import { hashPassword, verifyPassword } from '../lib/security.js'
import { revokeAllUserSessions } from '../lib/sessions.js'
import { recordAuditEvent } from '../lib/audit.js'
import { safeNotifyUsers, userIdsForStudentAndGuardians } from '../lib/notifications.js'

const router = express.Router()
router.use(requireAuth)
const publicFields = 'user_id,email,role,mfa_enabled,created_at,last_login,disabled_at,must_change_password,first_login_at,mfa_reset_required,suspension_until,account_expires_at,account_status_reason,failed_login_count,last_failed_login,last_login_ip,last_login_user_agent'

async function accountNotificationRecipients(userId, role) {
  if (role !== 'student') return [userId]
  const { data: student, error } = await supabase.from('student').select('student_id').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return student ? userIdsForStudentAndGuardians(student.student_id) : [userId]
}

async function notifyAccount(userId, role, payload) {
  const recipients = await accountNotificationRecipients(userId, role)
  await safeNotifyUsers(recipients, payload)
}

export function parseAccountStatusChange(body = {}) {
  if (typeof body.enabled !== 'boolean') throw new ApiError(400, 'enabled must be a boolean')
  const reason = asText(body.reason, 'reason', { max: 500, optional: true }) || null
  if (!body.enabled && !reason) throw new ApiError(400, 'reason is required when disabling an account')
  return { enabled: body.enabled, reason }
}

export function assertAccountStatusChangeAllowed({ actorUserId, targetUserId, targetRole, activeAdministratorCount, enabled }) {
  if (!enabled && actorUserId === targetUserId) throw new ApiError(400, 'You cannot disable your own administrator account')
  if (!enabled && targetRole === 'administrator' && activeAdministratorCount <= 1) {
    throw new ApiError(400, 'The last active administrator account cannot be disabled')
  }
}

export function parseAccountLifecycleChange(body = {}) {
  const reason = asText(body.reason, 'reason', { max: 500 })
  const suspensionUntil = body.suspension_until ? asText(body.suspension_until, 'suspension_until', { max: 40 }) : null
  const accountExpiresAt = body.account_expires_at ? asText(body.account_expires_at, 'account_expires_at', { max: 40 }) : null
  for (const [field, value] of [['suspension_until', suspensionUntil], ['account_expires_at', accountExpiresAt]]) {
    if (value && Number.isNaN(new Date(value).getTime())) throw new ApiError(400, `${field} must be a valid date-time`)
  }
  if (suspensionUntil && new Date(suspensionUntil).getTime() <= Date.now()) throw new ApiError(400, 'suspension_until must be in the future')
  if (accountExpiresAt && new Date(accountExpiresAt).getTime() <= Date.now()) throw new ApiError(400, 'account_expires_at must be in the future')
  return { reason, suspensionUntil, accountExpiresAt }
}

export function parseAdministrativeReason(body = {}) {
  const reason = asText(body.reason, 'reason', { max: 500 })
  return { reason }
}

export function generateTemporaryPassword() {
  return randomBytes(12).toString('base64url')
}

export function parsePasswordChange(body = {}) {
  const currentPassword = asText(body.current_password, 'current_password', { max: 128 })
  const newPassword = asText(body.new_password, 'new_password', { max: 128 })
  if (newPassword.length < 8) throw new ApiError(400, 'new_password must be at least 8 characters')
  if (currentPassword === newPassword) throw new ApiError(400, 'new_password must be different from the current password')
  return { currentPassword, newPassword }
}

router.get('/', requireRole('administrator'), asyncRoute(async (req, res) => {
  const { data, error } = await supabase
    .from('user_account')
    .select(`${publicFields}, student(student_id,full_name,class_level), teacher(teacher_id,full_name,email,department), guardian(guardian_id,full_name,email,phone,relationship), administrator(administrator_id,full_name,department)`)
    .order('created_at', { ascending: false })
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

router.patch('/:userId/status', requireRole('administrator'), asyncRoute(async (req, res) => {
  const userId = asUuid(req.params.userId, 'userId')
  const { enabled, reason } = parseAccountStatusChange(req.body)
  const { data: target, error: targetError } = await supabase
    .from('user_account')
    .select('user_id,email,role,disabled_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (targetError) throw targetError
  if (!target) throw new ApiError(404, 'User account not found')

  let activeAdministratorCount = null
  if (!enabled && target.role === 'administrator') {
    const { count, error: countError } = await supabase
      .from('user_account')
      .select('user_id', { count: 'exact', head: true })
      .eq('role', 'administrator')
      .is('disabled_at', null)
    if (countError) throw countError
    activeAdministratorCount = count || 0
  }

  assertAccountStatusChangeAllowed({
    actorUserId: req.user.user_id,
    targetUserId: userId,
    targetRole: target.role,
    activeAdministratorCount,
    enabled,
  })

  const disabledAt = enabled ? null : new Date().toISOString()
  const { data: updated, error: updateError } = await supabase
    .from('user_account')
    .update({ disabled_at: disabledAt, suspension_until: null, account_status_reason: reason })
    .eq('user_id', userId)
    .select(publicFields)
    .single()
  if (updateError) throw updateError

  if (!enabled) await revokeAllUserSessions(userId)
  await notifyAccount(userId, target.role, {
    notification_type: enabled ? 'account_enabled' : 'account_disabled',
    title: enabled ? 'Your account has been enabled' : 'Your account has been disabled',
    body: enabled ? 'You can sign in again.' : 'Your account access has been disabled. Contact the school administrator if this is unexpected.',
    link_path: '/profile',
    event_key: `account:${userId}:status:${enabled ? 'enabled' : 'disabled'}:${disabledAt || 'none'}`,
  })

  await recordAuditEvent({
    req,
    action: enabled ? 'ACCOUNT_ENABLED' : 'ACCOUNT_DISABLED',
    statusCode: 200,
    resourceType: 'user_account',
    resourceId: userId,
    metadata: {
      target_email: target.email,
      target_role: target.role,
      previous_status: target.disabled_at ? 'disabled' : 'enabled',
      new_status: enabled ? 'enabled' : 'disabled',
      reason,
    },
  })

  return sendData(res, updated)
}))

router.patch('/:userId/lifecycle', requireRole('administrator'), asyncRoute(async (req, res) => {
  const userId = asUuid(req.params.userId, 'userId')
  const { reason, suspensionUntil, accountExpiresAt } = parseAccountLifecycleChange(req.body)
  const { data: target, error: targetError } = await supabase.from('user_account').select('user_id,email,role,disabled_at,suspension_until,account_expires_at').eq('user_id', userId).maybeSingle()
  if (targetError) throw targetError
  if (!target) throw new ApiError(404, 'User account not found')
  let activeAdministratorCount = null
  if (suspensionUntil && target.role === 'administrator') {
    const { count, error: countError } = await supabase.from('user_account').select('user_id', { count: 'exact', head: true }).eq('role', 'administrator').is('disabled_at', null)
    if (countError) throw countError
    activeAdministratorCount = count || 0
  }
  assertAccountStatusChangeAllowed({ actorUserId: req.user.user_id, targetUserId: userId, targetRole: target.role, activeAdministratorCount, enabled: !suspensionUntil })
  const disabledAt = suspensionUntil ? new Date().toISOString() : target.disabled_at
  const { data: updated, error: updateError } = await supabase
    .from('user_account')
    .update({ suspension_until: suspensionUntil, account_expires_at: accountExpiresAt, disabled_at: disabledAt, account_status_reason: reason })
    .eq('user_id', userId)
    .select(publicFields)
    .single()
  if (updateError) throw updateError
  if (suspensionUntil) await revokeAllUserSessions(userId)
  await notifyAccount(userId, target.role, {
    notification_type: suspensionUntil ? 'account_suspended' : 'account_lifecycle_updated',
    title: suspensionUntil ? 'Your account has been temporarily suspended' : 'Your account lifecycle was updated',
    body: suspensionUntil ? `Your account is suspended until ${new Date(suspensionUntil).toLocaleString()}.` : 'An administrator updated your account lifecycle settings.',
    link_path: '/profile',
    event_key: `account:${userId}:lifecycle:${suspensionUntil || 'cleared'}:${accountExpiresAt || 'none'}`,
  })
  await recordAuditEvent({
    req,
    action: 'ACCOUNT_LIFECYCLE_UPDATED',
    statusCode: 200,
    resourceType: 'user_account',
    resourceId: userId,
    metadata: { target_email: target.email, target_role: target.role, reason, suspension_until: suspensionUntil, account_expires_at: accountExpiresAt },
  })
  await safeNotifyUsers([userId], {
    notification_type: suspensionUntil ? 'account_suspended' : 'account_lifecycle_updated',
    title: suspensionUntil ? 'Your account has been temporarily suspended' : 'Your account settings were updated',
    body: suspensionUntil ? `Your account is suspended until ${new Date(suspensionUntil).toLocaleString()}.` : 'An administrator updated your account lifecycle settings.',
    link_path: '/profile',
    event_key: `account:${userId}:lifecycle:${suspensionUntil || 'cleared'}:${accountExpiresAt || 'none'}`,
  })
  return sendData(res, updated)
}))

router.post('/:userId/reset-mfa', requireRole('administrator'), asyncRoute(async (req, res) => {
  const userId = asUuid(req.params.userId, 'userId')
  const { reason } = parseAdministrativeReason(req.body)
  if (req.user.user_id === userId) throw new ApiError(400, 'Use your current MFA code to manage your own MFA')
  const { data: target, error: targetError } = await supabase.from('user_account').select('user_id,email,role').eq('user_id', userId).maybeSingle()
  if (targetError) throw targetError
  if (!target) throw new ApiError(404, 'User account not found')
  if (target.role !== 'administrator') throw new ApiError(400, 'MFA reset is available only for administrator accounts')
  const { data: updated, error: updateError } = await supabase
    .from('user_account')
    .update({ mfa_enabled: false, mfa_secret_enc: null, mfa_pending_secret_enc: null, mfa_enrolled_at: null, mfa_reset_required: true })
    .eq('user_id', userId)
    .select(publicFields)
    .single()
  if (updateError) throw updateError
  await revokeAllUserSessions(userId)
  await recordAuditEvent({ req, action: 'MFA_RESET_BY_ADMIN', statusCode: 200, resourceType: 'user_account', resourceId: userId, metadata: { target_email: target.email, target_role: target.role, reason } })
  await safeNotifyUsers([userId], { notification_type: 'mfa_reset', title: 'MFA setup is required again', body: 'An administrator reset your MFA enrollment. Set it up again after signing in.', link_path: '/profile', event_key: `account:${userId}:mfa-reset` })
  return sendData(res, updated)
}))

router.post('/:userId/force-logout', requireRole('administrator'), asyncRoute(async (req, res) => {
  const userId = asUuid(req.params.userId, 'userId')
  const { reason } = parseAdministrativeReason(req.body)
  if (req.user.user_id === userId) throw new ApiError(400, 'Use the normal logout action for your own account')
  const { data: target, error: targetError } = await supabase.from('user_account').select('user_id,email,role').eq('user_id', userId).maybeSingle()
  if (targetError) throw targetError
  if (!target) throw new ApiError(404, 'User account not found')

  await revokeAllUserSessions(userId)
  await recordAuditEvent({
    req,
    action: 'ACCOUNT_SESSIONS_REVOKED',
    statusCode: 200,
    resourceType: 'user_account',
    resourceId: userId,
    metadata: { target_email: target.email, target_role: target.role, reason },
  })
  return sendData(res, { message: 'All active sessions for this account were revoked.' })
}))

router.post('/:userId/reset-password', requireRole('administrator'), asyncRoute(async (req, res) => {
  const userId = asUuid(req.params.userId, 'userId')
  const { reason } = parseAdministrativeReason(req.body)
  if (req.user.user_id === userId) throw new ApiError(400, 'Use the change-password feature for your own account')
  const { data: target, error: targetError } = await supabase.from('user_account').select('user_id,email,role').eq('user_id', userId).maybeSingle()
  if (targetError) throw targetError
  if (!target) throw new ApiError(404, 'User account not found')

  const temporaryPassword = generateTemporaryPassword()
  const password_hash = await hashPassword(temporaryPassword)
  const { error: updateError } = await supabase
    .from('user_account')
    .update({ password_hash, password_algorithm: 'argon2id', must_change_password: true })
    .eq('user_id', userId)
  if (updateError) throw updateError

  await revokeAllUserSessions(userId)
  await recordAuditEvent({
    req,
    action: 'ADMIN_PASSWORD_RESET',
    statusCode: 200,
    resourceType: 'user_account',
    resourceId: userId,
    metadata: { target_email: target.email, target_role: target.role, reason, sessions_revoked: true },
  })
  return sendData(res, { message: 'A temporary password was generated. Share it securely and require the user to change it.', temporary_password: temporaryPassword })
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
  const { data, error } = await supabase.from('user_account').insert({ email, password_hash, role, must_change_password: true }).select(publicFields).single()
  if (error?.code === '23505') throw new ApiError(409, 'An account with this email already exists')
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
    .insert({ email, password_hash, role: 'guardian', must_change_password: true })
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
    .update({ password_hash, password_algorithm: 'argon2id', must_change_password: false })
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
