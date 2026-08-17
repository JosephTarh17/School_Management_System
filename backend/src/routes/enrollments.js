import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ENUMS, ApiError, asAcademicYear, asEnum, asSemester, asUuid, asyncRoute, sendData } from '../lib/api.js'
import { enrolledStudentIdsForTeacher, studentIdForUser, teacherCourseIdsForUser } from '../lib/enrollmentScope.js'
import { resolveAcademicPeriod } from '../lib/academicPeriod.js'

const router = express.Router()
router.use(requireAuth)

const select = 'enrollment_id,student_id,course_id,academic_year,semester,status,enrolled_at,student(student_id,user_id,full_name),course(course_id,course_name,course_code,credit_units)'

router.get('/', asyncRoute(async (req, res) => {
  let query = supabase.from('enrollment').select(select).order('enrolled_at', { ascending: false })
  const academic_year = req.query.academic_year || req.query.year ? asAcademicYear(req.query.academic_year ?? req.query.year, 'academic_year') : undefined
  const semester = req.query.semester ? asSemester(req.query.semester, 'semester') : undefined
  if (req.user.role === 'student') {
    const studentId = await studentIdForUser(req.user.user_id)
    if (!studentId) return sendData(res, [])
    query = query.eq('student_id', studentId)
  } else if (req.user.role === 'teacher') {
    const courseIds = await teacherCourseIdsForUser(req.user.user_id, { academic_year, semester })
    if (!courseIds.length) return sendData(res, [])
    query = query.in('course_id', courseIds)
  }
  if (academic_year !== undefined) query = query.eq('academic_year', academic_year)
  if (semester) query = query.eq('semester', semester)
  if (req.query.student_id) query = query.eq('student_id', asUuid(req.query.student_id, 'student_id'))
  if (req.query.course_id) query = query.eq('course_id', asUuid(req.query.course_id, 'course_id'))
  if (req.query.status) query = query.eq('status', asEnum(req.query.status, 'status', ENUMS.enrollmentStatus))
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data)
}))

router.post('/', requireRole('administrator'), asyncRoute(async (req, res) => {
  const student_id = asUuid(req.body?.student_id, 'student_id')
  const course_id = asUuid(req.body?.course_id, 'course_id')
  const { academic_year, semester } = await resolveAcademicPeriod(req.body)
  const status = asEnum(req.body?.status ?? 'active', 'status', ENUMS.enrollmentStatus)
  const { data: offering, error: offeringError } = await supabase.from('teacher_course_assignment')
    .select('assignment_id')
    .eq('course_id', course_id)
    .eq('academic_year', academic_year)
    .eq('semester', semester)
    .eq('status', 'active')
    .maybeSingle()
  if (offeringError) throw offeringError
  if (!offering) throw new ApiError(400, 'The course is not currently assigned to a teacher for this academic period')
  const { data, error } = await supabase.from('enrollment').insert({ student_id, course_id, academic_year, semester, status }).select(select).single()
  if (error?.code === '23505') throw new ApiError(409, 'The student is already enrolled in this course for this academic period')
  if (error) throw error
  return sendData(res, data, 201)
}))

router.patch('/:enrollmentId', requireRole('administrator'), asyncRoute(async (req, res) => {
  const enrollmentId = asUuid(req.params.enrollmentId, 'enrollmentId')
  const status = asEnum(req.body?.status, 'status', ENUMS.enrollmentStatus)
  const { data, error } = await supabase.from('enrollment').update({ status }).eq('enrollment_id', enrollmentId).select(select).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'Enrollment not found')
  return sendData(res, data)
}))

router.delete('/:enrollmentId', requireRole('administrator'), asyncRoute(async (req, res) => {
  const enrollmentId = asUuid(req.params.enrollmentId, 'enrollmentId')
  const { data, error } = await supabase.from('enrollment').delete().eq('enrollment_id', enrollmentId).select('enrollment_id').maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'Enrollment not found')
  return res.status(204).send()
}))

export default router
