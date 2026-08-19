import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ApiError, asNumber, asText, asUuid, asyncRoute, sendData } from '../lib/api.js'
import { studentIdForUser } from '../lib/enrollmentScope.js'
import { safeNotifyStudentAndGuardians, safeNotifyUsers, userIdsForAudience } from '../lib/notifications.js'

const router = express.Router()
router.use(requireAuth)

export async function deadlineForAbsence() {
  const { data, error } = await supabase.from('absence_policy_setting').select('justification_deadline_days').eq('setting_id', 1).maybeSingle()
  if (error) throw error
  const days = Number(data?.justification_deadline_days || 3)
  const deadline = new Date()
  deadline.setUTCDate(deadline.getUTCDate() + days)
  return deadline.toISOString()
}

export async function prepareAbsenceJustification(attendanceId) {
  const deadline = await deadlineForAbsence()
  const { error } = await supabase.from('attendance').update({ justification_status: 'PENDING', justification_deadline_at: deadline, justification_submitted_at: null, justification_reviewed_at: null, justification_reviewed_by: null, justification_review_note: null, expired_notified_at: null }).eq('attendance_id', attendanceId).eq('status', 'Absent').is('justification_deadline_at', null)
  if (error) throw error
}

router.get('/policy', requireRole('administrator'), asyncRoute(async (req, res) => {
  const { data, error } = await supabase.from('absence_policy_setting').select('*').eq('setting_id', 1).single()
  if (error) throw error
  return sendData(res, data)
}))

router.patch('/policy', requireRole('administrator'), asyncRoute(async (req, res) => {
  const justification_deadline_days = asNumber(req.body?.justification_deadline_days, 'justification_deadline_days', { min: 1, max: 30, integer: true })
  const { data, error } = await supabase.from('absence_policy_setting').upsert({ setting_id: 1, justification_deadline_days, updated_by: req.user.user_id, updated_at: new Date().toISOString() }).select('*').single()
  if (error) throw error
  return sendData(res, data)
}))

router.get('/', asyncRoute(async (req, res) => {
  let query = supabase.from('attendance').select('attendance_id,student_id,session_id,session_date,status,justification_status,justification_text,justification_submitted_at,justification_deadline_at,justification_reviewed_at,justification_reviewed_by,justification_review_note,student(student_id,user_id,full_name),class_session(course(course_code,course_name),start_time,end_time)')
    .eq('status', 'Absent').order('justification_deadline_at')
  if (req.user.role === 'student') {
    const studentId = await studentIdForUser(req.user.user_id)
    if (!studentId) return sendData(res, [])
    query = query.eq('student_id', studentId)
  } else if (req.user.role !== 'administrator') {
    throw new ApiError(403, 'You do not have permission to view absence justifications')
  }
  if (req.query.status && req.user.role === 'administrator') query = query.eq('justification_status', asText(req.query.status, 'status', { max: 30 }))
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data || [])
}))

router.post('/:attendanceId', requireRole('student'), asyncRoute(async (req, res) => {
  const attendanceId = asUuid(req.params.attendanceId, 'attendanceId')
  const justification_text = asText(req.body?.justification_text, 'justification_text', { max: 2000 })
  const studentId = await studentIdForUser(req.user.user_id)
  const { data: attendance, error: attendanceError } = await supabase.from('attendance').select('attendance_id,student_id,status,justification_status,justification_deadline_at').eq('attendance_id', attendanceId).maybeSingle()
  if (attendanceError) throw attendanceError
  if (!attendance || attendance.student_id !== studentId) throw new ApiError(404, 'Absence record not found')
  if (attendance.status !== 'Absent') throw new ApiError(400, 'Only an absent attendance record can be justified')
  if (!attendance.justification_deadline_at) await prepareAbsenceJustification(attendanceId)
  const deadline = new Date(attendance.justification_deadline_at || await deadlineForAbsence())
  if (new Date() > deadline) throw new ApiError(409, 'The deadline for this absence justification has expired')
  const { data, error } = await supabase.from('attendance').update({ justification_status: 'SUBMITTED', justification_text, justification_submitted_at: new Date().toISOString(), expired_notified_at: null }).eq('attendance_id', attendanceId).select('*').single()
  if (error) throw error
  return sendData(res, data)
}))

router.post('/:attendanceId/review', requireRole('administrator'), asyncRoute(async (req, res) => {
  const attendanceId = asUuid(req.params.attendanceId, 'attendanceId')
  const status = asText(req.body?.status, 'status', { max: 20 })
  if (!['APPROVED', 'REJECTED'].includes(status)) throw new ApiError(400, 'status must be APPROVED or REJECTED')
  const justification_review_note = asText(req.body?.justification_review_note, 'justification_review_note', { max: 1000, optional: true })
  const finalStatus = status === 'APPROVED' ? 'APPROVED' : 'UNJUSTIFIED'
  const { data, error } = await supabase.from('attendance').update({ justification_status: finalStatus, justification_reviewed_at: new Date().toISOString(), justification_reviewed_by: req.user.user_id, justification_review_note }).eq('attendance_id', attendanceId).eq('status', 'Absent').select('attendance_id,student_id,session_date,justification_status').single()
  if (error) throw error
  if (finalStatus === 'UNJUSTIFIED') {
    await safeNotifyStudentAndGuardians(data.student_id, {
      notification_type: 'attendance_justification_rejected',
      title: 'Absence justification rejected',
      body: `The absence recorded on ${data.session_date} was not approved.`,
      link_path: '/student-portal',
      event_key: `attendance:${attendanceId}:justification-rejected`,
    })
    const admins = await userIdsForAudience('administrators')
    await safeNotifyUsers(admins, {
      notification_type: 'attendance_discipline_review',
      title: 'Unjustified absence requires disciplinary review',
      body: `An absence recorded on ${data.session_date} was rejected and requires follow-up.`,
      link_path: '/behavior-discipline',
      event_key: `attendance:${attendanceId}:discipline-review`,
    })
  }
  return sendData(res, data)
}))

export default router
