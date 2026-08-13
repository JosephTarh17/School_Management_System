import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ENUMS, ApiError, asEnum, asText, asUuid, asyncRoute, sendData } from '../lib/api.js'

const router = express.Router()
router.use(requireAuth)
const select = '*, student(*), class_session(*)'

router.get('/', asyncRoute(async (req, res) => {
  let query = supabase.from('participation_log').select(select).order('recorded_at', { ascending: false })
  if (req.user.role === 'student') {
    const { data: student, error: studentError } = await supabase.from('student').select('student_id').eq('user_id', req.user.user_id).maybeSingle()
    if (studentError) throw studentError
    if (!student) return sendData(res, [])
    query = query.eq('student_id', student.student_id)
  }
  if (req.query.student_id) query = query.eq('student_id', asUuid(req.query.student_id, 'student_id'))
  if (req.query.session_id) query = query.eq('session_id', asUuid(req.query.session_id, 'session_id'))
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data)
}))

router.get('/:participationId', asyncRoute(async (req, res) => {
  const participationId = asUuid(req.params.participationId, 'participationId')
  const { data, error } = await supabase.from('participation_log').select(select).eq('participation_id', participationId).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'Participation log not found')
  if (req.user.role === 'student' && data.student?.user_id !== req.user.user_id) throw new ApiError(403, 'You do not have permission to view this participation log')
  return sendData(res, data)
}))

router.post('/', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const student_id = asUuid(req.body?.student_id, 'student_id')
  const session_id = asUuid(req.body?.session_id, 'session_id')
  const rating = asEnum(req.body?.rating, 'rating', ENUMS.participationRating)
  const notes = asText(req.body?.notes, 'notes', { max: 1000, optional: true })
  const { data, error } = await supabase.from('participation_log').insert({ student_id, session_id, rating, notes }).select(select).single()
  if (error) throw error
  return sendData(res, data, 201)
}))

router.patch('/:participationId', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const participationId = asUuid(req.params.participationId, 'participationId')
  const updates = {}
  if (req.body?.student_id !== undefined) updates.student_id = asUuid(req.body.student_id, 'student_id')
  if (req.body?.session_id !== undefined) updates.session_id = asUuid(req.body.session_id, 'session_id')
  if (req.body?.rating !== undefined) updates.rating = asEnum(req.body.rating, 'rating', ENUMS.participationRating)
  if (req.body?.notes !== undefined) updates.notes = asText(req.body.notes, 'notes', { max: 1000, optional: true })
  if (!Object.keys(updates).length) throw new ApiError(400, 'At least one editable field is required')
  const { data, error } = await supabase.from('participation_log').update(updates).eq('participation_id', participationId).select(select).single()
  if (error) throw error
  return sendData(res, data)
}))

router.delete('/:participationId', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const participationId = asUuid(req.params.participationId, 'participationId')
  const { error } = await supabase.from('participation_log').delete().eq('participation_id', participationId)
  if (error) throw error
  return res.status(204).send()
}))

export default router
