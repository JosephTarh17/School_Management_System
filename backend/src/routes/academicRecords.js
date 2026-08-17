import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ENUMS, ApiError, asAcademicYear, asDate, asNumber, asSemester, asUuid, asyncRoute, sendData } from '../lib/api.js'
import { assertTeacherOwnsCourse } from '../lib/ownership.js'
import { enrolledStudentIdsForTeacher, studentCourseIdsForUser, studentIdForUser, teacherCourseIdsForUser } from '../lib/enrollmentScope.js'

const router = express.Router()
router.use(requireAuth)
const select = 'record_id,student_id,assessment_id,score,grade,evaluation_date,published,updated_at,student(student_id,full_name),assessment(assessment_id,course_id,title,assessment_type,max_score,weight,academic_year,semester,course(course_id,course_code,course_name))'

function letterGrade(score) {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}
function gpaForScore(score) {
  if (score >= 90) return 4
  if (score >= 80) return 3
  if (score >= 70) return 2
  if (score >= 60) return 1
  return 0
}
function round2(value) { return Math.round((value + Number.EPSILON) * 100) / 100 }
function clampPercent(value) { return Math.min(100, Math.max(0, Number(value) || 0)) }

async function recalculateFinalGrade(studentId, courseId, academic_year, semester) {
  const [{ data: assessments, error: assessmentError }, { data: records, error: recordError }] = await Promise.all([
    supabase.from('assessment').select('assessment_id,max_score,weight').eq('course_id', courseId).eq('academic_year', academic_year).eq('semester', semester),
    supabase.from('academic_record').select('assessment_id,score,published').eq('student_id', studentId).eq('published', true),
  ])
  if (assessmentError) throw assessmentError
  if (recordError) throw recordError
  const byAssessment = new Map((records || []).map((record) => [record.assessment_id, record]))
  const graded = (assessments || []).filter((assessment) => byAssessment.get(assessment.assessment_id)?.score != null)
  const totalWeight = graded.reduce((sum, assessment) => sum + Number(assessment.weight || 0), 0)
  const computedScore = totalWeight ? clampPercent(round2(graded.reduce((sum, assessment) => sum + ((Number(byAssessment.get(assessment.assessment_id).score) / Number(assessment.max_score)) * 100 * Number(assessment.weight)), 0) / totalWeight)) : null
  const payload = { student_id: studentId, course_id: courseId, academic_year, semester, computed_score: computedScore, letter_grade: computedScore == null ? null : letterGrade(computedScore), gpa: computedScore == null ? null : gpaForScore(computedScore) }
  const { error } = await supabase.from('final_grade').upsert(payload, { onConflict: 'student_id,course_id,academic_year,semester' })
  if (error) throw error
  return payload
}

async function assertStudentInCourse(studentId, courseId, academic_year, semester) {
  const { data, error } = await supabase.from('enrollment').select('enrollment_id').eq('student_id', studentId).eq('course_id', courseId).eq('academic_year', academic_year).eq('semester', semester).eq('status', 'active').maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(400, 'Student is not actively enrolled in this course for this academic period')
}

router.get('/', asyncRoute(async (req, res) => {
  let query = supabase.from('academic_record').select(select).order('updated_at', { ascending: false })
  const academic_year = req.query.academic_year || req.query.year ? asAcademicYear(req.query.academic_year ?? req.query.year, 'academic_year') : undefined
  const semester = req.query.semester ? asSemester(req.query.semester, 'semester') : undefined
  if (req.user.role === 'student') {
    const studentId = await studentIdForUser(req.user.user_id)
    if (!studentId) return sendData(res, [])
    query = query.eq('student_id', studentId).eq('published', true)
  } else if (req.user.role === 'teacher') {
    const courseIds = await teacherCourseIdsForUser(req.user.user_id, { academic_year, semester })
    if (!courseIds.length) return sendData(res, [])
    const { data: assessments, error } = await supabase.from('assessment').select('assessment_id').in('course_id', courseIds)
    if (error) throw error
    const assessmentIds = (assessments || []).map((item) => item.assessment_id)
    if (!assessmentIds.length) return sendData(res, [])
    query = query.in('assessment_id', assessmentIds)
  }
  if (req.query.course_id) {
    const courseId = asUuid(req.query.course_id, 'course_id')
    const { data: assessments, error } = await supabase.from('assessment').select('assessment_id').eq('course_id', courseId)
    if (error) throw error
    query = query.in('assessment_id', (assessments || []).map((item) => item.assessment_id))
  }
  if (academic_year !== undefined || semester) {
    const { data: assessments, error } = await supabase.from('assessment').select('assessment_id').match({ ...(academic_year !== undefined ? { academic_year } : {}), ...(semester ? { semester } : {}) })
    if (error) throw error
    query = query.in('assessment_id', (assessments || []).map((item) => item.assessment_id))
  }
  if (req.query.student_id) query = query.eq('student_id', asUuid(req.query.student_id, 'student_id'))
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data)
}))

router.get('/final-grades', asyncRoute(async (req, res) => {
  let query = supabase.from('final_grade').select('final_grade_id,student_id,course_id,academic_year,semester,computed_score,letter_grade,gpa,course(course_id,course_code,course_name)').order('course_id')
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
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data)
}))

router.post('/', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const student_id = asUuid(req.body?.student_id, 'student_id')
  const assessment_id = asUuid(req.body?.assessment_id, 'assessment_id')
  const score = asNumber(req.body?.score, 'score', { min: 0 })
  const evaluation_date = asDate(req.body?.evaluation_date, 'evaluation_date', { optional: true })
  if (req.user.role === 'teacher' && req.body?.published === true) throw new ApiError(403, 'Teachers must confirm marks for administrator review before publication')
  const published = req.user.role === 'administrator' && req.body?.published === true
  const { data: assessment, error: assessmentError } = await supabase.from('assessment').select('assessment_id,course_id,academic_year,semester,max_score').eq('assessment_id', assessment_id).maybeSingle()
  if (assessmentError) throw assessmentError
  if (!assessment) throw new ApiError(404, 'Assessment not found')
  if (score > Number(assessment.max_score)) throw new ApiError(400, 'score cannot exceed the assessment maximum')
  await assertTeacherOwnsCourse(assessment.course_id, req, { academic_year: assessment.academic_year, semester: assessment.semester })
  if (req.user.role === 'teacher') {
    const studentIds = await enrolledStudentIdsForTeacher(req.user.user_id, { academic_year: assessment.academic_year, semester: assessment.semester })
    if (!studentIds.includes(student_id)) throw new ApiError(403, 'You do not have permission to grade this student')
  }
  await assertStudentInCourse(student_id, assessment.course_id, assessment.academic_year, assessment.semester)
  const grade = letterGrade(clampPercent(round2((score / Number(assessment.max_score)) * 100)))
  const { data, error } = await supabase.from('academic_record').upsert({ student_id, assessment_id, score, grade, evaluation_date, published }, { onConflict: 'student_id,assessment_id' }).select(select).single()
  if (error) throw error
  await recalculateFinalGrade(student_id, assessment.course_id, assessment.academic_year, assessment.semester)
  return sendData(res, data, 201)
}))

router.patch('/:recordId', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const recordId = asUuid(req.params.recordId, 'recordId')
  const { data: current, error: currentError } = await supabase.from('academic_record').select('record_id,student_id,assessment_id,assessment(course_id,academic_year,semester,max_score)').eq('record_id', recordId).maybeSingle()
  if (currentError) throw currentError
  if (!current) throw new ApiError(404, 'Academic record not found')
  await assertTeacherOwnsCourse(current.assessment.course_id, req, { academic_year: current.assessment.academic_year, semester: current.assessment.semester })
  const updates = {}
  if (req.body?.score !== undefined) {
    updates.score = asNumber(req.body.score, 'score', { min: 0 })
    if (updates.score > Number(current.assessment.max_score)) throw new ApiError(400, 'score cannot exceed the assessment maximum')
    updates.grade = letterGrade(clampPercent(round2((updates.score / Number(current.assessment.max_score)) * 100)))
  }
  if (req.body?.evaluation_date !== undefined) updates.evaluation_date = asDate(req.body.evaluation_date, 'evaluation_date', { optional: true })
  if (req.body?.published === true && req.user.role === 'teacher') throw new ApiError(403, 'Teachers must confirm marks for administrator review before publication')
  if (req.body?.published !== undefined) updates.published = req.user.role === 'administrator' && req.body.published === true
  if (!Object.keys(updates).length) throw new ApiError(400, 'At least one editable field is required')
  const { data, error } = await supabase.from('academic_record').update(updates).eq('record_id', recordId).select(select).single()
  if (error) throw error
  await recalculateFinalGrade(current.student_id, current.assessment.course_id, current.assessment.academic_year, current.assessment.semester)
  return sendData(res, data)
}))

export default router
