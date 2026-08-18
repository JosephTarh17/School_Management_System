import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ApiError, asNumber, asText, asUuid, asyncRoute, sendData, supabaseError } from '../lib/api.js'
import { studentCourseIdsForUser, teacherCourseIdsForUser } from '../lib/enrollmentScope.js'

const router = express.Router()
router.use(requireAuth)
const select = '*'

function normalizedSearch(value) {
  return value.replace(/[^a-zA-Z0-9À-ÿ -]/g, ' ').replace(/\s+/g, ' ').trim()
}

function courseMutationError(error) {
  if (error?.code === '23505') {
    const message = String(error.message || '').toLowerCase()
    if (message.includes('course_code') || message.includes('course_course_code_key')) {
      return new ApiError(409, 'A course with this course code already exists. Use a unique course code.')
    }
    return new ApiError(409, 'A course with the same unique value already exists.')
  }
  if (error?.code === '23502') {
    return new ApiError(500, 'The catalog database still requires an academic period. Apply migration 024, then try again.')
  }
  if (error?.code === '42P01' || error?.code === 'PGRST205') {
    return new ApiError(500, 'The course catalog table is unavailable. Verify that the database migrations are applied.')
  }
  return supabaseError(error) || error
}

function exposeCourse(course) {
  if (!course) return course
  return { ...course, semester: course.semester, academic_year: course.academic_year }
}

router.get('/', asyncRoute(async (req, res) => {
  let query = supabase.from('course').select(select).order('course_name')
  if (req.user.role === 'student') {
    const courseIds = await studentCourseIdsForUser(req.user.user_id)
    if (!courseIds.length) return sendData(res, [])
    query = query.in('course_id', courseIds)
  } else if (req.user.role === 'teacher') {
    const courseIds = await teacherCourseIdsForUser(req.user.user_id)
    if (!courseIds.length) return sendData(res, [])
    query = query.in('course_id', courseIds)
  }
  if (req.query.course_code) query = query.eq('course_code', asText(req.query.course_code, 'course_code', { max: 40 }).toUpperCase())
  if (req.query.search) {
    const search = normalizedSearch(asText(req.query.search, 'search', { max: 80 }))
    if (search) query = query.or(`course_name.ilike.%${search}%,course_code.ilike.%${search}%`)
  }
  const { data, error } = await query
  if (error) throw error
  return sendData(res, (data || []).map(exposeCourse))
}))

router.get('/:courseId', asyncRoute(async (req, res) => {
  const courseId = asUuid(req.params.courseId, 'courseId')
  if (req.user.role === 'student') {
    const courseIds = await studentCourseIdsForUser(req.user.user_id)
    if (!courseIds.includes(courseId)) throw new ApiError(403, 'You do not have permission to view this course')
  } else if (req.user.role === 'teacher') {
    const courseIds = await teacherCourseIdsForUser(req.user.user_id)
    if (!courseIds.includes(courseId)) throw new ApiError(403, 'You do not have permission to view this course')
  }
  const { data, error } = await supabase.from('course').select(select).eq('course_id', courseId).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'Course not found')
  return sendData(res, exposeCourse(data))
}))

router.post('/', requireRole('administrator'), asyncRoute(async (req, res) => {
  const course_name = asText(req.body?.course_name, 'course_name', { max: 160 })
  const course_code = asText(req.body?.course_code, 'course_code', { max: 40 }).toUpperCase()
  const credit_units = asNumber(req.body?.credit_units, 'credit_units', { optional: true, min: 0, max: 100, integer: true })
  const { data, error } = await supabase.from('course').insert({ course_name, course_code, credit_units }).select(select).single()
  if (error) throw courseMutationError(error)
  return sendData(res, exposeCourse(data), 201)
}))

router.patch('/:courseId', requireRole('administrator'), asyncRoute(async (req, res) => {
  const courseId = asUuid(req.params.courseId, 'courseId')
  const updates = {}
  if (req.body?.course_name !== undefined) updates.course_name = asText(req.body.course_name, 'course_name', { max: 160 })
  if (req.body?.course_code !== undefined) updates.course_code = asText(req.body.course_code, 'course_code', { max: 40 }).toUpperCase()
  if (req.body?.credit_units !== undefined) updates.credit_units = asNumber(req.body.credit_units, 'credit_units', { optional: true, min: 0, max: 100, integer: true })
  if (!Object.keys(updates).length) throw new ApiError(400, 'At least one editable field is required')
  const { data, error } = await supabase.from('course').update(updates).eq('course_id', courseId).select(select).single()
  if (error) throw courseMutationError(error)
  return sendData(res, exposeCourse(data))
}))

router.delete('/:courseId', requireRole('administrator'), asyncRoute(async (req, res) => {
  const courseId = asUuid(req.params.courseId, 'courseId')
  const { error } = await supabase.from('course').delete().eq('course_id', courseId)
  if (error) throw error
  return res.status(204).send()
}))

export default router
