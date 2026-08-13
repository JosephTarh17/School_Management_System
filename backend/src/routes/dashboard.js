import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { asyncRoute, sendData } from '../lib/api.js'

const router = express.Router()
router.use(requireAuth)
router.use(requireRole('teacher', 'administrator'))

async function countRows(table, column = '*') {
  const { count, error } = await supabase.from(table).select(column, { count: 'exact', head: true })
  if (error) throw error
  return count || 0
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function attendanceRate(records) {
  if (!records.length) return 0
  const present = records.filter((record) => record.status === 'Present').length
  return Math.round((present / records.length) * 1000) / 10
}

router.get('/metrics', asyncRoute(async (req, res) => {
  const isAdministrator = req.user.role === 'administrator'
  let sessionsQuery = supabase.from('class_session').select('session_id,course_id')
  let relevantCourseIds = []

  if (!isAdministrator) {
    const { data: teacher, error: teacherError } = await supabase
      .from('teacher')
      .select('teacher_id')
      .eq('user_id', req.user.user_id)
      .maybeSingle()
    if (teacherError) throw teacherError
    if (!teacher) return sendData(res, { role: req.user.role, students: 0, sessions: 0, courses: 0, assessments: 0, attendanceRate: 0, attendanceRecords: 0, lastUpdated: new Date().toISOString() })
    sessionsQuery = sessionsQuery.eq('teacher_id', teacher.teacher_id)
  }

  const [{ data: sessions, error: sessionsError }, studentCount, courseCount, assessmentCount, facultyCount] = await Promise.all([
    sessionsQuery,
    countRows('student', 'student_id'),
    isAdministrator ? countRows('course', 'course_id') : Promise.resolve(null),
    isAdministrator ? countRows('assessment', 'assessment_id') : Promise.resolve(null),
    isAdministrator
      ? Promise.all([countRows('teacher', 'teacher_id'), countRows('administrator', 'administrator_id')]).then(([teachers, administrators]) => teachers + administrators)
      : Promise.resolve(null),
  ])
  if (sessionsError) throw sessionsError

  const sessionRows = sessions || []
  relevantCourseIds = unique(sessionRows.map((session) => session.course_id))
  const sessionIds = unique(sessionRows.map((session) => session.session_id))

  let attendanceRecords = []
  if (sessionIds.length) {
    let attendanceQuery = supabase.from('attendance').select('status,student_id,session_id').in('session_id', sessionIds)
    const { data, error } = await attendanceQuery
    if (error) throw error
    attendanceRecords = data || []
  }

  let teacherStudents = 0
  if (!isAdministrator) {
    teacherStudents = unique(attendanceRecords.map((record) => record.student_id)).length
  }

  let scopedCourseCount = courseCount
  let scopedAssessmentCount = assessmentCount
  if (!isAdministrator && relevantCourseIds.length) {
    const [{ count: courses, error: courseError }, { count: assessments, error: assessmentError }] = await Promise.all([
      supabase.from('course').select('course_id', { count: 'exact', head: true }).in('course_id', relevantCourseIds),
      supabase.from('assessment').select('assessment_id', { count: 'exact', head: true }).in('course_id', relevantCourseIds),
    ])
    if (courseError) throw courseError
    if (assessmentError) throw assessmentError
    scopedCourseCount = courses || 0
    scopedAssessmentCount = assessments || 0
  }

  return sendData(res, {
    role: req.user.role,
    students: isAdministrator ? studentCount : teacherStudents,
    faculty: facultyCount,
    courses: scopedCourseCount || 0,
    sessions: sessionIds.length,
    assessments: scopedAssessmentCount || 0,
    attendanceRate: attendanceRate(attendanceRecords),
    attendanceRecords: attendanceRecords.length,
    lastUpdated: new Date().toISOString(),
  })
}))

export default router
