import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ApiError, asNumber, asText, asUuid, asyncRoute, sendData } from '../lib/api.js'

const router = express.Router()
router.use(requireAuth)
const select = '*'

router.get('/', asyncRoute(async (req, res) => {
  let query = supabase.from('course').select(select).order('course_name')
  if (req.query.course_code) query = query.eq('course_code', asText(req.query.course_code, 'course_code', { max: 40 }))
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data)
}))

router.get('/:courseId', asyncRoute(async (req, res) => {
  const courseId = asUuid(req.params.courseId, 'courseId')
  const { data, error } = await supabase.from('course').select(select).eq('course_id', courseId).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'Course not found')
  return sendData(res, data)
}))

router.post('/', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const course_name = asText(req.body?.course_name, 'course_name', { max: 160 })
  const course_code = asText(req.body?.course_code, 'course_code', { max: 40 }).toUpperCase()
  const term = asText(req.body?.term, 'term', { max: 80, optional: true })
  const credit_units = asNumber(req.body?.credit_units, 'credit_units', { optional: true, min: 0, max: 100, integer: true })
  const { data, error } = await supabase.from('course').insert({ course_name, course_code, term, credit_units }).select(select).single()
  if (error) throw error
  return sendData(res, data, 201)
}))

router.patch('/:courseId', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const courseId = asUuid(req.params.courseId, 'courseId')
  const updates = {}
  if (req.body?.course_name !== undefined) updates.course_name = asText(req.body.course_name, 'course_name', { max: 160 })
  if (req.body?.course_code !== undefined) updates.course_code = asText(req.body.course_code, 'course_code', { max: 40 }).toUpperCase()
  if (req.body?.term !== undefined) updates.term = asText(req.body.term, 'term', { max: 80, optional: true })
  if (req.body?.credit_units !== undefined) updates.credit_units = asNumber(req.body.credit_units, 'credit_units', { optional: true, min: 0, max: 100, integer: true })
  if (!Object.keys(updates).length) throw new ApiError(400, 'At least one editable field is required')
  const { data, error } = await supabase.from('course').update(updates).eq('course_id', courseId).select(select).single()
  if (error) throw error
  return sendData(res, data)
}))

router.delete('/:courseId', requireRole('administrator'), asyncRoute(async (req, res) => {
  const courseId = asUuid(req.params.courseId, 'courseId')
  const { error } = await supabase.from('course').delete().eq('course_id', courseId)
  if (error) throw error
  return res.status(204).send()
}))

export default router
