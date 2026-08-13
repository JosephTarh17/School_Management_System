import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ENUMS, ApiError, asDate, asEnum, asNumber, asText, asUuid, asyncRoute, sendData } from '../lib/api.js'

const router = express.Router()
router.use(requireAuth)

router.get('/', asyncRoute(async (req, res) => {
  let query = supabase.from('assessment').select('*, course(*)').order('due_date', { ascending: true, nullsFirst: false })
  if (req.query.course_id) query = query.eq('course_id', asUuid(req.query.course_id, 'course_id'))
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data)
}))

router.get('/:assessmentId', asyncRoute(async (req, res) => {
  const assessmentId = asUuid(req.params.assessmentId, 'assessmentId')
  const { data, error } = await supabase.from('assessment').select('*, course(*)').eq('assessment_id', assessmentId).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'Assessment not found')
  return sendData(res, data)
}))

router.post('/', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const course_id = asUuid(req.body?.course_id, 'course_id')
  const title = asText(req.body?.title, 'title', { max: 200 })
  const assessment_type = asEnum(req.body?.assessment_type, 'assessment_type', ENUMS.assessmentType)
  const max_score = asNumber(req.body?.max_score ?? 100, 'max_score', { min: 0.01, max: 999999 })
  const weight = asNumber(req.body?.weight, 'weight', { min: 0, max: 100 })
  const due_date = asDate(req.body?.due_date, 'due_date', { optional: true })
  const { data, error } = await supabase.from('assessment').insert({ course_id, title, assessment_type, max_score, weight, due_date }).select('*, course(*)').single()
  if (error) throw error
  return sendData(res, data, 201)
}))

router.patch('/:assessmentId', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const assessmentId = asUuid(req.params.assessmentId, 'assessmentId')
  const updates = {}
  if (req.body?.course_id !== undefined) updates.course_id = asUuid(req.body.course_id, 'course_id')
  if (req.body?.title !== undefined) updates.title = asText(req.body.title, 'title', { max: 200 })
  if (req.body?.assessment_type !== undefined) updates.assessment_type = asEnum(req.body.assessment_type, 'assessment_type', ENUMS.assessmentType)
  if (req.body?.max_score !== undefined) updates.max_score = asNumber(req.body.max_score, 'max_score', { min: 0.01, max: 999999 })
  if (req.body?.weight !== undefined) updates.weight = asNumber(req.body.weight, 'weight', { min: 0, max: 100 })
  if (req.body?.due_date !== undefined) updates.due_date = asDate(req.body.due_date, 'due_date', { optional: true })
  if (!Object.keys(updates).length) throw new ApiError(400, 'At least one editable field is required')
  const { data, error } = await supabase.from('assessment').update(updates).eq('assessment_id', assessmentId).select('*, course(*)').single()
  if (error) throw error
  return sendData(res, data)
}))

router.delete('/:assessmentId', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const assessmentId = asUuid(req.params.assessmentId, 'assessmentId')
  const { error } = await supabase.from('assessment').delete().eq('assessment_id', assessmentId)
  if (error) throw error
  return res.status(204).send()
}))

export default router
