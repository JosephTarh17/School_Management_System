import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ApiError, asDateTime, asText, asUuid, asyncRoute, sendData } from '../lib/api.js'

const router = express.Router()
router.use(requireAuth)
const select = '*, course(*), teacher(*), room(*), substitute_teacher:substitute_teacher_id(*)'

function validateTimes(start_time, end_time) {
  const start = asDateTime(start_time, 'start_time')
  const end = asDateTime(end_time, 'end_time')
  if (new Date(start) >= new Date(end)) throw new ApiError(400, 'start_time must be before end_time')
  return { start_time: start, end_time: end }
}

router.get('/', asyncRoute(async (req, res) => {
  let query = supabase.from('class_session').select(select).order('start_time')
  if (req.query.course_id) query = query.eq('course_id', asUuid(req.query.course_id, 'course_id'))
  if (req.query.teacher_id) query = query.eq('teacher_id', asUuid(req.query.teacher_id, 'teacher_id'))
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data)
}))

router.get('/:sessionId', asyncRoute(async (req, res) => {
  const sessionId = asUuid(req.params.sessionId, 'sessionId')
  const { data, error } = await supabase.from('class_session').select(select).eq('session_id', sessionId).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'Class session not found')
  return sendData(res, data)
}))

router.post('/', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const course_id = asUuid(req.body?.course_id, 'course_id')
  const teacher_id = asUuid(req.body?.teacher_id, 'teacher_id')
  const room_id = asUuid(req.body?.room_id, 'room_id')
  const substitute_teacher_id = asUuid(req.body?.substitute_teacher_id, 'substitute_teacher_id', { optional: true })
  const recurrence_pattern = asText(req.body?.recurrence_pattern, 'recurrence_pattern', { max: 120, optional: true })
  const times = validateTimes(req.body?.start_time, req.body?.end_time)
  const { data, error } = await supabase.from('class_session').insert({ course_id, teacher_id, room_id, substitute_teacher_id, recurrence_pattern, ...times }).select(select).single()
  if (error) throw error
  return sendData(res, data, 201)
}))

router.patch('/:sessionId', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const sessionId = asUuid(req.params.sessionId, 'sessionId')
  const updates = {}
  for (const field of ['course_id', 'teacher_id', 'room_id', 'substitute_teacher_id']) {
    if (req.body?.[field] !== undefined) updates[field] = asUuid(req.body[field], field, { optional: true })
  }
  if (req.body?.recurrence_pattern !== undefined) updates.recurrence_pattern = asText(req.body.recurrence_pattern, 'recurrence_pattern', { max: 120, optional: true })
  if (req.body?.start_time !== undefined || req.body?.end_time !== undefined) {
    const { data: current, error: currentError } = await supabase.from('class_session').select('start_time,end_time').eq('session_id', sessionId).maybeSingle()
    if (currentError) throw currentError
    if (!current) throw new ApiError(404, 'Class session not found')
    Object.assign(updates, validateTimes(req.body.start_time ?? current.start_time, req.body.end_time ?? current.end_time))
  }
  if (!Object.keys(updates).length) throw new ApiError(400, 'At least one editable field is required')
  const { data, error } = await supabase.from('class_session').update(updates).eq('session_id', sessionId).select(select).single()
  if (error) throw error
  return sendData(res, data)
}))

router.delete('/:sessionId', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const sessionId = asUuid(req.params.sessionId, 'sessionId')
  const { error } = await supabase.from('class_session').delete().eq('session_id', sessionId)
  if (error) throw error
  return res.status(204).send()
}))

export default router
