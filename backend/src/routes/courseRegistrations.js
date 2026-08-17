import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ApiError, asAcademicYear, asEnum, asSemester, asText, asUuid, asyncRoute, sendData } from '../lib/api.js'
import { studentIdForUser } from '../lib/enrollmentScope.js'
import { resolveAcademicPeriod } from '../lib/academicPeriod.js'

const router = express.Router()
router.use(requireAuth)

const requestSelect = `
  registration_request_id, student_id, academic_year, semester, status, total_credits,
  submitted_at, reviewed_by, reviewed_at, review_notes,
  student(student_id, user_id, full_name, class_level),
  course_registration_item(
    registration_item_id, course_id, credit_units,
    course(course_id, course_name, course_code, academic_year, semester, credit_units)
  )
`

function registrationError(error, fallback = 'Unable to process course registration request') {
  if (!error) return null
  const message = String(error.message || '')
  if (message) return new ApiError(400, message.replace(/^ERROR:\s*/i, ''))
  return new ApiError(500, fallback)
}

function courseIdsFromBody(value) {
  if (!Array.isArray(value) || value.length === 0) throw new ApiError(400, 'course_ids must contain at least one course')
  if (value.length > 50) throw new ApiError(400, 'A registration request cannot contain more than 50 courses')
  return value.map((courseId) => asUuid(courseId, 'course_id'))
}

function exposeCourse(course) {
  if (!course) return course
  return { ...course, semester: course.semester, academic_year: course.academic_year }
}

function exposeRegistration(registration) {
  if (!registration) return registration
  return {
    ...registration,
    course_registration_item: (registration.course_registration_item || []).map((item) => ({
      ...item,
      course: exposeCourse(item.course),
    })),
  }
}

function exposeRegistrations(value) {
  return Array.isArray(value) ? value.map(exposeRegistration) : exposeRegistration(value)
}

router.get('/eligibility', requireRole('student'), asyncRoute(async (req, res) => {
  const studentId = await studentIdForUser(req.user.user_id)
  if (!studentId) throw new ApiError(403, 'Student profile is not configured')
  const { data: student, error: studentError } = await supabase.from('student').select('student_id,class_level').eq('student_id', studentId).maybeSingle()
  if (studentError) throw studentError
  if (!student) throw new ApiError(404, 'Student profile not found')
  const { data: setting, error: settingError } = await supabase.from('class_fee_setting').select('class_level,max_credits').eq('class_level', student.class_level).maybeSingle()
  if (settingError) throw settingError
  const { academic_year, semester } = await resolveAcademicPeriod(req.query)
  let enrollmentQuery = supabase.from('enrollment').select('course(credit_units)').eq('student_id', studentId)
  if (academic_year !== undefined) enrollmentQuery = enrollmentQuery.eq('academic_year', academic_year)
  if (semester) enrollmentQuery = enrollmentQuery.eq('semester', semester)
  const { data: enrollments, error: enrollmentError } = await enrollmentQuery
  if (enrollmentError) throw enrollmentError
  const enrolledCredits = (enrollments || []).reduce((sum, enrollment) => sum + Number(enrollment.course?.credit_units || 0), 0)
  return sendData(res, {
    student_id: studentId,
    class_level: student.class_level,
    academic_year,
    semester,
    max_credits: Number(setting?.max_credits || 0),
    enrolled_credits: enrolledCredits,
  })
}))

router.get('/catalog', asyncRoute(async (req, res) => {
  const { academic_year, semester } = await resolveAcademicPeriod(req.query)
  const { data, error } = await supabase.from('teacher_course_assignment')
    .select('course(course_id,course_name,course_code,credit_units),academic_year,semester,status')
    .eq('academic_year', academic_year)
    .eq('semester', semester)
    .eq('status', 'active')
    .order('course_id')
  if (error) throw error
  const courses = (data || []).map((offering) => ({
    ...(offering.course || {}),
    academic_year: offering.academic_year,
    semester: offering.semester,
  }))
  return sendData(res, courses.map(exposeCourse))
}))

router.get('/', asyncRoute(async (req, res) => {
  let query = supabase.from('course_registration_request').select(requestSelect).order('submitted_at', { ascending: false })
  if (req.user.role === 'student') {
    const studentId = await studentIdForUser(req.user.user_id)
    if (!studentId) return sendData(res, [])
    query = query.eq('student_id', studentId)
  } else if (req.user.role !== 'administrator') {
    return sendData(res, [])
  }
  if (req.query.status) query = query.eq('status', asEnum(req.query.status, 'status', ['pending', 'approved', 'rejected', 'cancelled']))
  if (req.query.academic_year || req.query.year) query = query.eq('academic_year', asAcademicYear(req.query.academic_year ?? req.query.year, 'academic_year'))
  if (req.query.semester) query = query.eq('semester', asSemester(req.query.semester, 'semester'))
  const { data, error } = await query
  if (error) throw error
  return sendData(res, exposeRegistrations(data || []))
}))

router.post('/', requireRole('student'), asyncRoute(async (req, res) => {
  const studentId = await studentIdForUser(req.user.user_id)
  if (!studentId) throw new ApiError(403, 'Student profile is not configured')
  const { academic_year, semester } = await resolveAcademicPeriod(req.body)
  const courseIds = courseIdsFromBody(req.body?.course_ids)
  const { data, error } = await supabase.rpc('submit_course_registration', {
    p_student_id: studentId,
    p_academic_year: academic_year,
    p_semester: semester,
    p_course_ids: courseIds,
  })
  if (error) throw registrationError(error)
  return sendData(res, exposeRegistrations(data), 201)
}))

router.patch('/:requestId/cancel', requireRole('student'), asyncRoute(async (req, res) => {
  const requestId = asUuid(req.params.requestId, 'requestId')
  const studentId = await studentIdForUser(req.user.user_id)
  const { data, error } = await supabase.from('course_registration_request')
    .update({ status: 'cancelled', reviewed_at: null, reviewed_by: null })
    .eq('registration_request_id', requestId)
    .eq('student_id', studentId)
    .eq('status', 'pending')
    .select(requestSelect)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'Pending registration request not found')
  return sendData(res, exposeRegistration(data))
}))

router.patch('/:requestId/review', requireRole('administrator'), asyncRoute(async (req, res) => {
  const requestId = asUuid(req.params.requestId, 'requestId')
  const status = asEnum(req.body?.status, 'status', ['approved', 'rejected'])
  const reviewNotes = req.body?.review_notes == null || req.body.review_notes === ''
    ? null
    : asText(req.body.review_notes, 'review_notes', { max: 1000 })

  if (status === 'approved') {
    const { data, error } = await supabase.rpc('approve_course_registration', {
      p_request_id: requestId,
      p_reviewer_id: req.user.user_id,
      p_review_notes: reviewNotes,
    })
    if (error) throw registrationError(error, 'Unable to approve registration request')
    return sendData(res, exposeRegistrations(data))
  }

  const { data, error } = await supabase.from('course_registration_request')
    .update({ status: 'rejected', reviewed_by: req.user.user_id, reviewed_at: new Date().toISOString(), review_notes: reviewNotes })
    .eq('registration_request_id', requestId)
    .eq('status', 'pending')
    .select(requestSelect)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'Pending registration request not found')
  return sendData(res, exposeRegistration(data))
}))

export default router
