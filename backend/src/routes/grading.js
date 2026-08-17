import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ENUMS, ApiError, asAcademicYear, asDate, asEnum, asNumber, asSemester, asText, asUuid, asyncRoute, sendData } from '../lib/api.js'
import { assertTeacherOwnsCourse } from '../lib/ownership.js'
import { studentIdForUser, studentCourseIdsForUser, teacherCourseIdsForUser } from '../lib/enrollmentScope.js'
import { resolveAcademicPeriod } from '../lib/academicPeriod.js'
import { PASS_PERCENT, PASS_GPA, TEST_WEIGHT, FINAL_WEIGHT, assessmentWeight, calculateCourseResult, gpaForScore, letterGrade, round2, statusForRecord } from '../lib/grading.js'

const router = express.Router()
router.use(requireAuth)

async function courseFor(courseId) {
  const { data, error } = await supabase.from('course').select('*').eq('course_id', courseId).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'Course not found')
  return data
}

async function assessmentFor(assessmentId) {
  const { data, error } = await supabase.from('assessment').select('*,course(*)').eq('assessment_id', assessmentId).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'Assessment not found')
  return data
}

async function assertTeacherCanUseCourse(req, courseId, period = {}) {
  await assertTeacherOwnsCourse(courseId, req, period)
  return courseFor(courseId)
}

async function activeStudentsForCourse(courseId, period = {}) {
  let query = supabase.from('enrollment').select('student_id,student(student_id,full_name)').eq('course_id', courseId).eq('status', 'active').order('student_id')
  if (period.academic_year !== undefined) query = query.eq('academic_year', period.academic_year)
  if (period.semester) query = query.eq('semester', period.semester)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

async function assessmentsForCourse(courseId, academic_year, semester) {
  let query = supabase.from('assessment').select('*,course(course_id,course_code,course_name,academic_year,semester,credit_units)').eq('course_id', courseId).order('assessment_type').order('assessment_number', { ascending: true, nullsFirst: false })
  if (academic_year) query = query.eq('academic_year', academic_year)
  if (semester) query = query.eq('semester', semester)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

async function calculateStudentSemester(studentId, academic_year, semester, { publishedOnly = false } = {}) {
  let enrollmentQuery = supabase.from('enrollment').select('course_id,academic_year,semester,course(*)').eq('student_id', studentId).eq('status', 'active')
  if (academic_year) enrollmentQuery = enrollmentQuery.eq('academic_year', academic_year)
  if (semester) enrollmentQuery = enrollmentQuery.eq('semester', semester)
  const { data: enrollments, error: enrollmentError } = await enrollmentQuery
  if (enrollmentError) throw enrollmentError
  const courses = (enrollments || []).map((row) => row.course ? { ...row.course, academic_year: row.academic_year, semester: row.semester } : null).filter(Boolean)
  const results = []
  for (const course of courses) {
    const assessments = await assessmentsForCourse(course.course_id, academic_year, semester)
    const assessmentIds = assessments.map((assessment) => assessment.assessment_id)
    let records = []
    if (assessmentIds.length) {
      let query = supabase.from('academic_record').select('*').eq('student_id', studentId).in('assessment_id', assessmentIds)
      if (publishedOnly) query = query.eq('published', true)
      const { data, error } = await query
      if (error) throw error
      records = data || []
    }
    results.push(calculateCourseResult({ course, assessments, records }))
  }
  const totalCredits = results.reduce((sum, result) => sum + result.credit_units, 0)
  const completedResults = results.filter((result) => result.complete && result.average != null)
  const completedCredits = completedResults.reduce((sum, result) => sum + result.credit_units, 0)
  const weightedScore = completedCredits ? round2(completedResults.reduce((sum, result) => sum + result.average * result.credit_units, 0) / completedCredits) : null
  const gpa = completedCredits ? round2(completedResults.reduce((sum, result) => sum + result.gpa * result.credit_units, 0) / completedCredits) : null
  const passedCourses = completedResults.filter((result) => result.passed).length
  const failedCourses = completedResults.filter((result) => !result.passed).length
  const promotionStatus = completedResults.length !== results.length ? 'Incomplete' : failedCourses ? 'Fail' : 'Pass'
  return { student_id: studentId, academic_year, semester, courses: results, overall_average: weightedScore, gpa, total_credits: totalCredits, earned_credits: passedCourses ? results.filter((result) => result.passed).reduce((sum, result) => sum + result.credit_units, 0) : 0, passed_courses: passedCourses, failed_courses: failedCourses, promotion_status: promotionStatus }
}

async function assertStudentCourseAccess(studentId, courseId, period = {}) {
  let query = supabase.from('enrollment').select('enrollment_id').eq('student_id', studentId).eq('course_id', courseId).eq('status', 'active')
  if (period.academic_year !== undefined) query = query.eq('academic_year', period.academic_year)
  if (period.semester) query = query.eq('semester', period.semester)
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(400, 'The student is not actively registered for this course')
}

async function assertGuardianStudent(guardianUserId, studentId) {
  const { data: guardian, error: guardianError } = await supabase.from('guardian').select('guardian_id').eq('user_id', guardianUserId).maybeSingle()
  if (guardianError) throw guardianError
  if (!guardian) throw new ApiError(403, 'Guardian profile not found')
  const { data: link, error } = await supabase.from('student_guardian').select('student_guardian_id').eq('guardian_id', guardian.guardian_id).eq('student_id', studentId).maybeSingle()
  if (error) throw error
  if (!link) throw new ApiError(403, 'You do not have access to this student')
}

router.get('/gradebook', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const courseId = asUuid(req.query.course_id, 'course_id')
  const { academic_year, semester } = await resolveAcademicPeriod(req.query)
  const assessmentId = req.query.assessment_id ? asUuid(req.query.assessment_id, 'assessment_id') : null
  if (req.user.role === 'teacher') await assertTeacherCanUseCourse(req, courseId, { academic_year, semester })
  const course = { ...(await courseFor(courseId)), academic_year, semester }
  const assessments = await assessmentsForCourse(courseId, academic_year, semester)
  const selectedAssessment = assessmentId ? assessments.find((assessment) => assessment.assessment_id === assessmentId) : assessments[0]
  if (assessmentId && !selectedAssessment) throw new ApiError(404, 'Assessment not found for this course and semester')
  const students = await activeStudentsForCourse(courseId, { academic_year, semester })
  const selectedIds = selectedAssessment ? [selectedAssessment.assessment_id] : []
  let records = []
  if (selectedIds.length && students.length) {
    const { data, error } = await supabase.from('academic_record').select('*,student(student_id,full_name)').eq('assessment_id', selectedIds[0]).in('student_id', students.map((student) => student.student_id))
    if (error) throw error
    records = data || []
  }
  const fullSemester = semester || course.semester || null
  const live = await Promise.all(students.map(async (entry) => {
    const { data: studentRecords, error } = await supabase.from('academic_record').select('*').eq('student_id', entry.student_id).in('assessment_id', assessments.map((assessment) => assessment.assessment_id))
    if (error) throw error
    const result = calculateCourseResult({ course, assessments, records: studentRecords || [] })
    const current = (studentRecords || []).find((record) => record.assessment_id === selectedAssessment?.assessment_id)
    return { student: entry.student, current_record: current || null, live_result: result }
  }))
  return sendData(res, { course, academic_year, semester: fullSemester, assessments, selected_assessment_id: selectedAssessment?.assessment_id || null, students: live, selected_records: records })
}))

router.post('/marks', requireRole('teacher'), asyncRoute(async (req, res) => {
  const student_id = asUuid(req.body?.student_id, 'student_id')
  const assessment_id = asUuid(req.body?.assessment_id, 'assessment_id')
  const assessment = await assessmentFor(assessment_id)
  await assertTeacherCanUseCourse(req, assessment.course_id, { academic_year: assessment.academic_year, semester: assessment.semester })
  await assertStudentCourseAccess(student_id, assessment.course_id, { academic_year: assessment.academic_year, semester: assessment.semester })
  if (assessment.published) throw new ApiError(400, 'This assessment has already been published and cannot be edited')
  const record_status = asEnum(req.body?.record_status || 'GRADED', 'record_status', ['GRADED', 'ABSENT_UNJUSTIFIED', 'ABSENT_JUSTIFIED'])
  const absence_reason = req.body?.absence_reason == null ? null : asText(req.body.absence_reason, 'absence_reason', { max: 1000 })
  let score = null
  let grade = null
  if (record_status === 'GRADED') {
    score = asNumber(req.body?.score, 'score', { min: 0, max: Number(assessment.max_score) })
    grade = letterGrade(round2((score / Number(assessment.max_score)) * 100))
  } else if (record_status === 'ABSENT_UNJUSTIFIED') score = 0
  if (record_status === 'ABSENT_JUSTIFIED' && !absence_reason) throw new ApiError(400, 'A justification is required for an excused absence')
  const { data, error } = await supabase.from('academic_record').upsert({ student_id, assessment_id, score, grade, record_status, absence_reason, published: false, teacher_confirmed: false, admin_reviewed: false, evaluation_date: req.body?.evaluation_date ? asDate(req.body.evaluation_date, 'evaluation_date', { optional: true }) : null }, { onConflict: 'student_id,assessment_id' }).select('*').single()
  if (error) throw error
  return sendData(res, data, 201)
}))

router.post('/assessments/:assessmentId/confirm', requireRole('teacher'), asyncRoute(async (req, res) => {
  const assessment = await assessmentFor(asUuid(req.params.assessmentId, 'assessmentId'))
  await assertTeacherCanUseCourse(req, assessment.course_id, { academic_year: assessment.academic_year, semester: assessment.semester })
  if (assessment.published) throw new ApiError(400, 'This assessment has already been published')
  const students = await activeStudentsForCourse(assessment.course_id, { academic_year: assessment.academic_year, semester: assessment.semester })
  const { data: records, error: recordsError } = await supabase.from('academic_record').select('student_id,record_status').eq('assessment_id', assessment.assessment_id)
  if (recordsError) throw recordsError
  const recordIds = new Set((records || []).map((record) => record.student_id))
  if (students.some((student) => !recordIds.has(student.student_id))) throw new ApiError(400, 'Every actively registered student must have a mark or absence decision before confirmation')
  const { error: recordUpdateError } = await supabase.from('academic_record').update({ teacher_confirmed: true, teacher_confirmed_by: req.user.user_id, teacher_confirmed_at: new Date().toISOString(), admin_reviewed: false, published: false }).eq('assessment_id', assessment.assessment_id)
  if (recordUpdateError) throw recordUpdateError
  const { data, error } = await supabase.from('assessment').update({ teacher_confirmed: true, confirmed_by: req.user.user_id, confirmed_at: new Date().toISOString() }).eq('assessment_id', assessment.assessment_id).select('*,course(*)').single()
  if (error) throw error
  return sendData(res, data)
}))

router.get('/review', requireRole('administrator'), asyncRoute(async (req, res) => {
  const { academic_year, semester } = await resolveAcademicPeriod(req.query)
  let query = supabase.from('assessment').select('*,course(course_id,course_code,course_name,academic_year,semester,credit_units)').eq('academic_year', academic_year).eq('semester', semester).order('course_id').order('assessment_type').order('assessment_number')
  const { data: assessments, error: assessmentError } = await query
  if (assessmentError) throw assessmentError
  const assessmentIds = (assessments || []).map((assessment) => assessment.assessment_id)
  let records = []
  if (assessmentIds.length) {
    const { data, error } = await supabase.from('academic_record').select('*,student(student_id,full_name),assessment(assessment_id,title,assessment_type,assessment_number,course(course_id,course_code,course_name))').in('assessment_id', assessmentIds).order('student_id')
    if (error) throw error
    records = data || []
  }
  return sendData(res, { academic_year, semester, assessments: assessments || [], records })
}))

router.post('/assessments/:assessmentId/publish', requireRole('administrator'), asyncRoute(async (req, res) => {
  const assessment = await assessmentFor(asUuid(req.params.assessmentId, 'assessmentId'))
  if (!assessment.teacher_confirmed) throw new ApiError(400, 'The teacher must confirm this assessment before administrator publication')
  const { data: records, error: recordsError } = await supabase.from('academic_record').select('record_id,teacher_confirmed').eq('assessment_id', assessment.assessment_id)
  if (recordsError) throw recordsError
  if ((records || []).some((record) => !record.teacher_confirmed)) throw new ApiError(400, 'Every student mark must be teacher-confirmed before publication')
  const now = new Date().toISOString()
  const { error: recordError } = await supabase.from('academic_record').update({ admin_reviewed: true, admin_reviewed_by: req.user.user_id, admin_reviewed_at: now, published: true, published_by: req.user.user_id, published_at: now }).eq('assessment_id', assessment.assessment_id)
  if (recordError) throw recordError
  const { data, error } = await supabase.from('assessment').update({ published: true, published_by: req.user.user_id, published_at: now }).eq('assessment_id', assessment.assessment_id).select('*,course(*)').single()
  if (error) throw error
  return sendData(res, data)
}))

router.post('/assessments/:assessmentId/unpublish', requireRole('administrator'), asyncRoute(async (req, res) => {
  const assessmentId = asUuid(req.params.assessmentId, 'assessmentId')
  const { data, error } = await supabase.from('assessment').update({ published: false, published_by: null, published_at: null }).eq('assessment_id', assessmentId).select('*,course(*)').single()
  if (error) throw error
  const { error: recordError } = await supabase.from('academic_record').update({ published: false, published_by: null, published_at: null }).eq('assessment_id', assessmentId)
  if (recordError) throw recordError
  return sendData(res, data)
}))

router.get('/report-cards/:studentId', asyncRoute(async (req, res) => {
  const studentId = asUuid(req.params.studentId, 'studentId')
  const { academic_year, semester } = await resolveAcademicPeriod(req.query)
  if (req.user.role === 'student') {
    const ownId = await studentIdForUser(req.user.user_id)
    if (ownId !== studentId) throw new ApiError(403, 'You do not have permission to view this report card')
  } else if (req.user.role === 'guardian') await assertGuardianStudent(req.user.user_id, studentId)
  else if (req.user.role === 'teacher') {
    const courseIds = await teacherCourseIdsForUser(req.user.user_id, { academic_year, semester })
    const { data: enrollments, error } = await supabase.from('enrollment').select('course_id').eq('student_id', studentId).eq('academic_year', academic_year).eq('semester', semester).eq('status', 'active').in('course_id', courseIds)
    if (error) throw error
    if (!enrollments?.length) throw new ApiError(403, 'You do not have permission to view this report card')
  }
  const calculation = await calculateStudentSemester(studentId, academic_year, semester, { publishedOnly: req.user.role === 'student' || req.user.role === 'guardian' })
  let cardQuery = supabase.from('report_card').select('*').eq('student_id', studentId)
  if (academic_year) cardQuery = cardQuery.eq('academic_year', academic_year)
  if (semester) cardQuery = cardQuery.eq('semester', semester)
  const { data: cards, error } = await cardQuery.order('academic_year').order('semester')
  if (error) throw error
  const visibleCards = (req.user.role === 'student' || req.user.role === 'guardian') ? (cards || []).filter((card) => card.status === 'PUBLISHED') : (cards || [])
  if ((req.user.role === 'student' || req.user.role === 'guardian') && !visibleCards.length) return sendData(res, { calculation: null, report_cards: [] })
  return sendData(res, { calculation, report_cards: visibleCards })
}))

router.post('/report-cards/:studentId/generate', requireRole('administrator'), asyncRoute(async (req, res) => {
  const studentId = asUuid(req.params.studentId, 'studentId')
  const { academic_year, semester } = await resolveAcademicPeriod(req.body)
  const calculation = await calculateStudentSemester(studentId, academic_year, semester)
  const { data, error } = await supabase.from('report_card').upsert({ student_id: studentId, academic_year, semester, status: 'ADMIN_REVIEW',
 overall_average: calculation.overall_average, gpa: calculation.gpa, total_credits: calculation.total_credits, earned_credits: calculation.earned_credits, passed_courses: calculation.passed_courses, failed_courses: calculation.failed_courses, promotion_status: calculation.promotion_status, administrator_comments: req.body?.administrator_comments ? asText(req.body.administrator_comments, 'administrator_comments', { max: 2000 }) : null, reviewed_by: req.user.user_id, reviewed_at: new Date().toISOString() }, { onConflict: 'student_id,academic_year,semester' }).select('*').single()
  if (error) throw error
  return sendData(res, { report_card: data, calculation })
}))

router.post('/report-cards/:studentId/publish', requireRole('administrator'), asyncRoute(async (req, res) => {
  const studentId = asUuid(req.params.studentId, 'studentId')
  const { academic_year, semester } = await resolveAcademicPeriod(req.body)
  const calculation = await calculateStudentSemester(studentId, academic_year, semester)
  if (calculation.promotion_status === 'Incomplete') throw new ApiError(400, 'The report card cannot be published until all registered-course assessments have a mark or absence decision')
  if (calculation.courses.some((course) => course.assessments.some((item) => !item.published))) throw new ApiError(400, 'Every individual assessment must be reviewed and published before the final report card')
  const now = new Date().toISOString()
    const { data, error } = await supabase.from('report_card').upsert({ student_id: studentId, academic_year, semester, status: 'PUBLISHED',
 overall_average: calculation.overall_average, gpa: calculation.gpa, total_credits: calculation.total_credits, earned_credits: calculation.earned_credits, passed_courses: calculation.passed_courses, failed_courses: calculation.failed_courses, promotion_status: calculation.promotion_status, administrator_comments: req.body?.administrator_comments ? asText(req.body.administrator_comments, 'administrator_comments', { max: 2000 }) : null, reviewed_by: req.user.user_id, reviewed_at: now, published_by: req.user.user_id, published_at: now }, { onConflict: 'student_id,academic_year,semester' }).select('*').single()
  if (error) throw error
  return sendData(res, { report_card: data, calculation })
}))

router.post('/report-cards/:studentId/unpublish', requireRole('administrator'), asyncRoute(async (req, res) => {
  const studentId = asUuid(req.params.studentId, 'studentId')
  const { academic_year, semester } = await resolveAcademicPeriod(req.body)
  const { data, error } = await supabase.from('report_card').update({ status: 'ADMIN_REVIEW', published_by: null, published_at: null }).eq('student_id', studentId).eq('academic_year', academic_year).eq('semester', semester).select('*').single()
  if (error) throw error
  return sendData(res, data)
}))

export { calculateStudentSemester, calculateCourseResult, gpaForScore, letterGrade }
export default router
