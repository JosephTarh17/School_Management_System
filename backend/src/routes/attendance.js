import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ENUMS, ApiError, asDate, asEnum, asUuid, asyncRoute, sendData } from '../lib/api.js'

const router = express.Router()
router.use(requireAuth)
const select = '*, student(*), class_session(*)'

async function studentIdForUser(userId) {
  const { data, error } = await supabase.from('student').select('student_id').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data?.student_id
}

router.get('/', asyncRoute(async (req, res) => {
  let query = supabase.from('attendance').select(select).order('session_date', { ascending: false })
  if (req.user.role === 'student') {
    const studentId = await studentIdForUser(req.user.user_id)
    if (!studentId) return sendData(res, [])
    query = query.eq('student_id', studentId)
  }
  if (req.query.student_id) query = query.eq('student_id', asUuid(req.query.student_id, 'student_id'))
  if (req.query.session_id) query = query.eq('session_id', asUuid(req.query.session_id, 'session_id'))
  if (req.query.status) query = query.eq('status', asEnum(req.query.status, 'status', ENUMS.attendanceStatus))
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data)
}))

router.post('/batch', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const session_id = asUuid(req.body?.session_id, 'session_id')
  const session_date = asDate(req.body?.session_date, 'session_date')
  const entries = req.body?.entries
  if (!Array.isArray(entries) || entries.length === 0 || entries.length > 500) {
    throw new ApiError(400, 'entries must contain between 1 and 500 attendance records')
  }

  const { data: session, error: sessionError } = await supabase
    .from('class_session')
    .select('session_id,teacher_id,teacher(user_id)')
    .eq('session_id', session_id)
    .maybeSingle()
  if (sessionError) throw sessionError
  if (!session) throw new ApiError(404, 'Class session not found')
  if (req.user.role === 'teacher' && session.teacher?.user_id !== req.user.user_id) {
    throw new ApiError(403, 'You do not have permission to record attendance for this session')
  }

  const records = entries.map((entry, index) => ({
    student_id: asUuid(entry?.student_id, `entries[${index}].student_id`),
    session_id,
    session_date,
    status: asEnum(entry?.status, `entries[${index}].status`, ENUMS.attendanceStatus),
  }))
  const { data, error } = await supabase
    .from('attendance')
    .upsert(records, { onConflict: 'student_id,session_id,session_date' })
    .select(select)
  if (error) throw error
  return sendData(res, data)
}))

router.get('/:attendanceId', asyncRoute(async (req, res) => {
  const attendanceId = asUuid(req.params.attendanceId, 'attendanceId')
  const { data, error } = await supabase.from('attendance').select(select).eq('attendance_id', attendanceId).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'Attendance record not found')
  if (req.user.role === 'student' && data.student?.user_id !== req.user.user_id) throw new ApiError(403, 'You do not have permission to view this attendance record')
  return sendData(res, data)
}))

router.post('/', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const student_id = asUuid(req.body?.student_id, 'student_id')
  const session_id = asUuid(req.body?.session_id, 'session_id')
  const session_date = asDate(req.body?.session_date, 'session_date')
  const status = asEnum(req.body?.status, 'status', ENUMS.attendanceStatus)
  const { data, error } = await supabase.from('attendance').insert({ student_id, session_id, session_date, status }).select(select).single()
  if (error) throw error
  return sendData(res, data, 201)
}))

router.patch('/:attendanceId', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const attendanceId = asUuid(req.params.attendanceId, 'attendanceId')
  const updates = {}
  if (req.body?.student_id !== undefined) updates.student_id = asUuid(req.body.student_id, 'student_id')
  if (req.body?.session_id !== undefined) updates.session_id = asUuid(req.body.session_id, 'session_id')
  if (req.body?.session_date !== undefined) updates.session_date = asDate(req.body.session_date, 'session_date')
  if (req.body?.status !== undefined) updates.status = asEnum(req.body.status, 'status', ENUMS.attendanceStatus)
  if (!Object.keys(updates).length) throw new ApiError(400, 'At least one editable field is required')
  const { data, error } = await supabase.from('attendance').update(updates).eq('attendance_id', attendanceId).select(select).single()
  if (error) throw error
  return sendData(res, data)
}))

router.delete('/:attendanceId', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const attendanceId = asUuid(req.params.attendanceId, 'attendanceId')
  const { error } = await supabase.from('attendance').delete().eq('attendance_id', attendanceId)
  if (error) throw error
  return res.status(204).send()
}))

export default router
