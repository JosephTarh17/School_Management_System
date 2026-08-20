import { randomUUID } from 'node:crypto'
import { supabase } from '../supabaseClient.js'
import { safeNotifyUsers, userIdsForStudentAndGuardians } from './notifications.js'
import { revokeAllUserSessions } from './sessions.js'
import { expireStudentAbsenceJustifications } from './timetable.js'
import { safeSecurityMetadata } from './security.js'

const JOB_PATH = '/jobs/daily-maintenance'

async function recordSystemAudit({ action, resourceId, metadata = {} }) {
  const { error } = await supabase.from('security_audit_log').insert({
    actor_user_id: null,
    action,
    resource_type: 'user_account',
    resource_id: resourceId,
    http_method: 'POST',
    request_path: JOB_PATH,
    status_code: 200,
    correlation_id: randomUUID(),
    metadata: safeSecurityMetadata(metadata),
  })
  if (error) throw error
}

async function notificationRecipients(account) {
  if (account.role !== 'student') return [account.user_id]
  const { data: student, error } = await supabase.from('student').select('student_id').eq('user_id', account.user_id).maybeSingle()
  if (error) throw error
  if (!student) return [account.user_id]
  return userIdsForStudentAndGuardians(student.student_id)
}

async function notifyLifecycle(account, { eventKey, notificationType, title, body }) {
  const recipients = await notificationRecipients(account)
  await safeNotifyUsers(recipients, {
    notification_type: notificationType,
    title,
    body,
    link_path: account.role === 'student' ? '/student-portal' : '/profile',
    event_key: eventKey,
  })
}

export async function reactivateDueSuspensions(now = new Date().toISOString()) {
  const { data: due, error } = await supabase
    .from('user_account')
    .update({ disabled_at: null, suspension_until: null, account_status_reason: null })
    .not('disabled_at', 'is', null)
    .not('suspension_until', 'is', null)
    .lte('suspension_until', now)
    .select('user_id,email,role,suspension_until')
  if (error) throw error
  for (const account of due || []) {
    await notifyLifecycle(account, {
      eventKey: `account:${account.user_id}:suspension-ended:${account.suspension_until}`,
      notificationType: 'account_reenabled',
      title: 'Your account has been re-enabled',
      body: 'Your temporary suspension has ended. You can sign in again.',
    })
    await recordSystemAudit({
      action: 'ACCOUNT_AUTO_REENABLED',
      resourceId: account.user_id,
      metadata: { target_email: account.email, target_role: account.role, suspension_until: account.suspension_until },
    })
  }
  return due || []
}

export async function expireDueAccounts(now = new Date().toISOString()) {
  const { data: expired, error } = await supabase
    .from('user_account')
    .update({ disabled_at: now, account_status_reason: 'Account expiration reached' })
    .is('disabled_at', null)
    .not('account_expires_at', 'is', null)
    .lte('account_expires_at', now)
    .select('user_id,email,role,account_expires_at')
  if (error) throw error
  for (const account of expired || []) {
    await revokeAllUserSessions(account.user_id)
    await notifyLifecycle(account, {
      eventKey: `account:${account.user_id}:expired:${account.account_expires_at}`,
      notificationType: 'account_expired',
      title: 'Your account has expired',
      body: 'Your account is no longer active. Contact the school administrator if access should be restored.',
    })
    await recordSystemAudit({
      action: 'ACCOUNT_AUTO_EXPIRED',
      resourceId: account.user_id,
      metadata: { target_email: account.email, target_role: account.role, account_expires_at: account.account_expires_at },
    })
  }
  return expired || []
}

let nextAccessCheckAt = 0
let accessCheckPromise = null

export async function runAccountLifecycleMaintenance(now = new Date().toISOString()) {
  const reactivated = await reactivateDueSuspensions(now)
  const expired = await expireDueAccounts(now)
  const absenceExpirations = await expireStudentAbsenceJustifications()
  return { reactivated, expired, absenceExpirations }
}

export async function runAccountLifecycleMaintenanceIfDue(now = Date.now()) {
  if (accessCheckPromise) return accessCheckPromise
  if (now < nextAccessCheckAt) return { skipped: true }
  nextAccessCheckAt = now + 60 * 1000
  accessCheckPromise = runAccountLifecycleMaintenance()
    .catch((error) => {
      console.error('[account-lifecycle] check-on-access failed:', error)
      return { error: error.message || 'maintenance failed' }
    })
    .finally(() => { accessCheckPromise = null })
  return accessCheckPromise
}
