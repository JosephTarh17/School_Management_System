import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ApiError, asNumber, asUuid, asyncRoute, sendData } from '../lib/api.js'
import { enrolledStudentIdsForTeacher, studentIdForUser } from '../lib/enrollmentScope.js'

const router = express.Router()
router.use(requireAuth)

function clampPercent(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.min(100, Math.max(0, numeric))
}

async function guardianStudentIds(userId) {
  const { data: guardian, error: guardianError } = await supabase.from('guardian').select('guardian_id').eq('user_id', userId).maybeSingle()
  if (guardianError) throw guardianError
  if (!guardian) return []
  const { data, error } = await supabase.from('student_guardian').select('student_id').eq('guardian_id', guardian.guardian_id)
  if (error) throw error
  return (data || []).map((row) => row.student_id)
}

async function accessibleStudentIds(req) {
  if (req.user.role === 'administrator') return null
  if (req.user.role === 'teacher') return enrolledStudentIdsForTeacher(req.user.user_id)
  if (req.user.role === 'student') {
    const studentId = await studentIdForUser(req.user.user_id)
    return studentId ? [studentId] : []
  }
  if (req.user.role === 'guardian') return guardianStudentIds(req.user.user_id)
  return []
}

async function settings() {
  const { data, error } = await supabase.from('attendance_settings').select('setting_id,absence_threshold_percent,late_threshold_percent,updated_at').eq('setting_id', 1).single()
  if (error) throw error
  return data
}

router.get('/settings', requireRole('administrator', 'teacher'), asyncRoute(async (req, res) => sendData(res, await settings())))

router.patch('/settings', requireRole('administrator'), asyncRoute(async (req, res) => {
  const updates = {}
  if (req.body?.absence_threshold_percent !== undefined) updates.absence_threshold_percent = asNumber(req.body.absence_threshold_percent, 'absence_threshold_percent', { min: 0, max: 100 })
  if (req.body?.late_threshold_percent !== undefined) updates.late_threshold_percent = asNumber(req.body.late_threshold_percent, 'late_threshold_percent', { min: 0, max: 100 })
  if (!Object.keys(updates).length) throw new ApiError(400, 'At least one attendance threshold is required')
  updates.updated_at = new Date().toISOString()
  const { data, error } = await supabase.from('attendance_settings').update(updates).eq('setting_id', 1).select('setting_id,absence_threshold_percent,late_threshold_percent,updated_at').single()
  if (error) throw error
  return sendData(res, data)
}))

router.get('/reports', asyncRoute(async (req, res) => {
  const allowedIds = await accessibleStudentIds(req)
  if (allowedIds && !allowedIds.length) return sendData(res, [])
  let query = supabase.from('attendance').select('student_id,status,session_date,student(student_id,full_name),class_session(course(course_id,course_code,course_name))').order('session_date', { ascending: false })
  if (allowedIds) query = query.in('student_id', allowedIds)
  if (req.query.student_id) {
    const studentId = asUuid(req.query.student_id, 'student_id')
    if (allowedIds && !allowedIds.includes(studentId)) throw new ApiError(403, 'You do not have permission to view this attendance report')
    query = query.eq('student_id', studentId)
  }
  const { data: records, error } = await query
  if (error) throw error
  const threshold = await settings()
  const grouped = new Map()
  for (const record of records || []) {
    const entry = grouped.get(record.student_id) || { student_id: record.student_id, student_name: record.student?.full_name || record.student_id, total: 0, present: 0, absent: 0, late: 0, excused: 0, latest_session_date: record.session_date, courses: [] }
    entry.total += 1
    if (record.status === 'Present') entry.present += 1
    if (record.status === 'Absent') entry.absent += 1
    if (record.status === 'Late') entry.late += 1
    if (record.status === 'Excused') entry.excused += 1
    if (record.class_session?.course && !entry.courses.some((course) => course.course_id === record.class_session.course.course_id)) entry.courses.push(record.class_session.course)
    grouped.set(record.student_id, entry)
  }
  const reports = [...grouped.values()].map((entry) => {
    const absencePercent = clampPercent(entry.total ? Math.round((entry.absent / entry.total) * 10000) / 100 : 0)
    const latePercent = clampPercent(entry.total ? Math.round((entry.late / entry.total) * 10000) / 100 : 0)
    const attendancePercent = clampPercent(entry.total ? Math.round((entry.present / entry.total) * 10000) / 100 : 0)
    return { ...entry, attendance_percent: attendancePercent, absence_percent: absencePercent, late_percent: latePercent, at_risk: absencePercent >= Number(threshold.absence_threshold_percent) || latePercent >= Number(threshold.late_threshold_percent) }
  })
  for (const report of reports.filter((entry) => entry.at_risk)) {
    const alertType = report.absence_percent >= Number(threshold.absence_threshold_percent) ? 'absence_threshold' : 'late_threshold'
    const percent = clampPercent(alertType === 'absence_threshold' ? report.absence_percent : report.late_percent)
    const message = `${report.student_name} has reached the ${alertType === 'absence_threshold' ? 'absence' : 'late'} attendance threshold (${percent}%).`
    const { data: existing, error: existingError } = await supabase.from('attendance_alert').select('alert_id').eq('student_id', report.student_id).eq('alert_type', alertType).is('acknowledged_at', null).limit(1)
    if (existingError) throw existingError
    if (!existing?.length) {
      const { error: insertError } = await supabase.from('attendance_alert').insert({ student_id: report.student_id, alert_type: alertType, attendance_percent: percent, message })
      if (insertError) throw insertError
    }
  }
  return sendData(res, reports)
}))

router.get('/alerts', asyncRoute(async (req, res) => {
  const allowedIds = await accessibleStudentIds(req)
  if (allowedIds && !allowedIds.length) return sendData(res, [])
  let query = supabase.from('attendance_alert').select('alert_id,student_id,alert_type,attendance_percent,message,acknowledged_at,created_at,student(student_id,full_name)').order('created_at', { ascending: false })
  if (allowedIds) query = query.in('student_id', allowedIds)
  if (req.user.role !== 'administrator') query = query.is('acknowledged_at', null)
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data || [])
}))

router.patch('/alerts/:alertId/acknowledge', requireRole('guardian', 'administrator'), asyncRoute(async (req, res) => {
  const alertId = asUuid(req.params.alertId, 'alertId')
  const allowedIds = await accessibleStudentIds(req)
  const { data: current, error: currentError } = await supabase.from('attendance_alert').select('alert_id,student_id').eq('alert_id', alertId).maybeSingle()
  if (currentError) throw currentError
  if (!current) throw new ApiError(404, 'Attendance alert not found')
  if (allowedIds && !allowedIds.includes(current.student_id)) throw new ApiError(403, 'You do not have permission to acknowledge this alert')
  const { data, error } = await supabase.from('attendance_alert').update({ acknowledged_at: new Date().toISOString() }).eq('alert_id', alertId).select('alert_id,acknowledged_at').single()
  if (error) throw error
  return sendData(res, data)
}))

export default router
