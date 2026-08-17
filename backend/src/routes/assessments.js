import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ENUMS, ApiError, asDate, asEnum, asNumber, asText, asUuid, asyncRoute, sendData } from '../lib/api.js'
import { assertTeacherOwnsCourse } from '../lib/ownership.js'
import { studentCourseIdsForUser, teacherCourseIdsForUser } from '../lib/enrollmentScope.js'

const router = express.Router()
router.use(requireAuth)

router.get('/', asyncRoute(async (req, res) => {
  let query = supabase.from('assessment').select('*, course(*)').order('due_date', { ascending: true, nullsFirst: false })
  if (req.user.role === 'student') {
    const courseIds = await studentCourseIdsForUser(req.user.user_id)
    if (!courseIds.length) return sendData(res, [])
    query = query.in('course_id', courseIds)
  } else if (req.user.role === 'teacher') {
    const courseIds = await teacherCourseIdsForUser(req.user.user_id)
    if (!courseIds.length) return sendData(res, [])
    query = query.in('course_id', courseIds)
  }
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
  if (req.user.role === 'student') {
    const courseIds = await studentCourseIdsForUser(req.user.user_id)
    if (!courseIds.includes(data.course_id)) throw new ApiError(403, 'You do not have permission to view this assessment')
  } else if (req.user.role === 'teacher') {
    const courseIds = await teacherCourseIdsForUser(req.user.user_id)
    if (!courseIds.includes(data.course_id)) throw new ApiError(403, 'You do not have permission to view this assessment')
  }
  return sendData(res, data)
}))

router.post('/', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const course_id = asUuid(req.body?.course_id, 'course_id')
  const title = asText(req.body?.title, 'title', { max: 200 })
  const assessment_type = asEnum(req.body?.assessment_type, 'assessment_type', ENUMS.assessmentType)
  const max_score = asNumber(req.body?.max_score ?? 100, 'max_score', { min: 0.01, max: 999999 })
  const term = asText(req.body?.term, 'term', { max: 80, optional: true })
  const assessment_number = req.body?.assessment_number == null || req.body?.assessment_number === '' ? null : asNumber(req.body.assessment_number, 'assessment_number', { min: 1, max: 3, integer: true })
  if (assessment_type === 'Test' && assessment_number == null) throw new ApiError(400, 'assessment_number is required for Test assessments')
  if (assessment_type !== 'Test' && assessment_number != null) throw new ApiError(400, 'assessment_number is only valid for Test assessments')
  const weight = assessment_type === 'Test' ? 20 : assessment_type === 'Final' ? 40 : asNumber(req.body?.weight, 'weight', { min: 0, max: 100 })
  const due_date = asDate(req.body?.due_date, 'due_date', { optional: true })
  await assertTeacherOwnsCourse(course_id, req)
  const { data, error } = await supabase.from('assessment').insert({ course_id, title, assessment_type, assessment_number, term, max_score, weight, due_date }).select('*, course(*)').single()
  if (error) throw error
  return sendData(res, data, 201)
}))

router.patch('/:assessmentId', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const assessmentId = asUuid(req.params.assessmentId, 'assessmentId')
  const { data: current, error: currentError } = await supabase.from('assessment').select('assessment_id,course_id').eq('assessment_id', assessmentId).maybeSingle()
  if (currentError) throw currentError
  if (!current) throw new ApiError(404, 'Assessment not found')
  await assertTeacherOwnsCourse(current.course_id, req)
  const updates = {}
  if (req.body?.course_id !== undefined) {
    updates.course_id = asUuid(req.body.course_id, 'course_id')
    await assertTeacherOwnsCourse(updates.course_id, req)
  }
  if (req.body?.title !== undefined) updates.title = asText(req.body.title, 'title', { max: 200 })
  if (req.body?.assessment_type !== undefined) updates.assessment_type = asEnum(req.body.assessment_type, 'assessment_type', ENUMS.assessmentType)
  if (req.body?.term !== undefined) updates.term = asText(req.body.term, 'term', { max: 80, optional: true })
  if (req.body?.assessment_number !== undefined) updates.assessment_number = req.body.assessment_number == null || req.body.assessment_number === '' ? null : asNumber(req.body.assessment_number, 'assessment_number', { min: 1, max: 3, integer: true })
  if (req.body?.max_score !== undefined) updates.max_score = asNumber(req.body.max_score, 'max_score', { min: 0.01, max: 999999 })
  if (req.body?.assessment_type === 'Test') updates.weight = 20
  else if (req.body?.assessment_type === 'Final') updates.weight = 40
  else if (req.body?.weight !== undefined) updates.weight = asNumber(req.body.weight, 'weight', { min: 0, max: 100 })
  if (req.body?.due_date !== undefined) updates.due_date = asDate(req.body.due_date, 'due_date', { optional: true })
  if (!Object.keys(updates).length) throw new ApiError(400, 'At least one editable field is required')
  const { data, error } = await supabase.from('assessment').update(updates).eq('assessment_id', assessmentId).select('*, course(*)').single()
  if (error) throw error
  return sendData(res, data)
}))

router.delete('/:assessmentId', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const assessmentId = asUuid(req.params.assessmentId, 'assessmentId')
  const { data: current, error: currentError } = await supabase.from('assessment').select('course_id').eq('assessment_id', assessmentId).maybeSingle()
  if (currentError) throw currentError
  if (!current) throw new ApiError(404, 'Assessment not found')
  await assertTeacherOwnsCourse(current.course_id, req)
  const { error } = await supabase.from('assessment').delete().eq('assessment_id', assessmentId)
  if (error) throw error
  return res.status(204).send()
}))

export default router
