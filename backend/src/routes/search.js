import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth } from '../middleware/auth.js'
import { ApiError, asyncRoute, asText, sendData } from '../lib/api.js'
import { enrolledStudentIdsForTeacher, studentCourseIdsForUser, studentIdForUser, teacherCourseIdsForUser } from '../lib/enrollmentScope.js'

const router = express.Router()
router.use(requireAuth)

const RESULT_LIMIT = 10
const CANDIDATE_LIMIT = 40
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizedTerm(value) {
  return value
    .replace(/[^a-zA-Z0-9À-ÿ@._ -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function ilikePattern(term) {
  return `%${term}%`
}

function normalizeForMatch(value) {
  return String(value || '').toLocaleLowerCase()
}

function includesTerm(value, term) {
  return normalizeForMatch(value).includes(normalizeForMatch(term))
}

function result(type, id, title, subtitle, linkPath, searchValue = '') {
  return { type, id, title: title || 'Untitled', subtitle: subtitle || '', link_path: linkPath, search_value: searchValue || title || '' }
}

function exactUuid(value) {
  return UUID_PATTERN.test(value) ? value : null
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))]
}

function intersect(first, second) {
  const allowed = new Set(second || [])
  return unique((first || []).filter((value) => allowed.has(value)))
}

function audienceOptionsForUser(role) {
  if (role === 'administrator') return ['all', 'students', 'teachers', 'guardians', 'administrators']
  const audienceByRole = { student: 'students', teacher: 'teachers', guardian: 'guardians' }
  return ['all', audienceByRole[role] || role]
}

async function guardianStudentIdsForUser(userId) {
  const { data: guardian, error: guardianError } = await supabase.from('guardian').select('guardian_id').eq('user_id', userId).maybeSingle()
  if (guardianError) throw guardianError
  if (!guardian) return []

  const { data: links, error: linkError } = await supabase.from('student_guardian').select('student_id').eq('guardian_id', guardian.guardian_id)
  if (linkError) throw linkError
  return unique((links || []).map((row) => row.student_id))
}

async function courseIdsForStudents(studentIds) {
  if (!studentIds?.length) return []
  const { data, error } = await supabase.from('enrollment').select('course_id').in('student_id', studentIds).eq('status', 'active')
  if (error) throw error
  return unique((data || []).map((row) => row.course_id))
}

async function buildScope(user) {
  if (user.role === 'administrator') return { courseIds: null, studentIds: null }
  if (user.role === 'student') {
    const [studentId, courseIds] = await Promise.all([
      studentIdForUser(user.user_id),
      studentCourseIdsForUser(user.user_id),
    ])
    return { courseIds, studentIds: studentId ? [studentId] : [] }
  }
  if (user.role === 'teacher') {
    const [courseIds, studentIds] = await Promise.all([
      teacherCourseIdsForUser(user.user_id),
      enrolledStudentIdsForTeacher(user.user_id),
    ])
    return { courseIds, studentIds }
  }
  if (user.role === 'guardian') {
    const studentIds = await guardianStudentIdsForUser(user.user_id)
    return { courseIds: await courseIdsForStudents(studentIds), studentIds }
  }
  return { courseIds: [], studentIds: [] }
}

async function findCourses(term, scope) {
  if (Array.isArray(scope.courseIds) && !scope.courseIds.length) return []
  let query = supabase
    .from('course')
    .select('course_id,course_name,course_code,credit_units')
    .or(`course_name.ilike.${ilikePattern(term)},course_code.ilike.${ilikePattern(term)}`)
    .limit(CANDIDATE_LIMIT)
  if (Array.isArray(scope.courseIds)) query = query.in('course_id', scope.courseIds)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

async function findStudents(term, scope) {
  if (Array.isArray(scope.studentIds) && !scope.studentIds.length) return []
  let query = supabase.from('student').select('student_id,full_name,class_level,user_account(email)').limit(CANDIDATE_LIMIT)
  if (Array.isArray(scope.studentIds)) query = query.in('student_id', scope.studentIds)

  const uuid = exactUuid(term)
  query = uuid
    ? query.or(`full_name.ilike.${ilikePattern(term)},student_id.eq.${uuid}`)
    : query.ilike('full_name', ilikePattern(term))

  const { data, error } = await query
  if (error) throw error
  return data || []
}

async function findTeachers(term, role) {
  if (role !== 'administrator') return []
  let query = supabase.from('teacher').select('teacher_id,full_name,email').limit(CANDIDATE_LIMIT)
  const uuid = exactUuid(term)
  query = uuid
    ? query.or(`full_name.ilike.${ilikePattern(term)},email.ilike.${ilikePattern(term)},teacher_id.eq.${uuid}`)
    : query.or(`full_name.ilike.${ilikePattern(term)},email.ilike.${ilikePattern(term)}`)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

async function findAnnouncements(term, role) {
  let query = supabase
    .from('announcement')
    .select('announcement_id,title,body,audience,priority,status,published_at,expires_at')
    .or(`title.ilike.${ilikePattern(term)},body.ilike.${ilikePattern(term)}`)
    .order('created_at', { ascending: false })
    .limit(CANDIDATE_LIMIT)

  if (role !== 'administrator') {
    const today = new Date().toISOString().slice(0, 10)
    query = query.eq('status', 'published').in('audience', audienceOptionsForUser(role)).or(`expires_at.is.null,expires_at.gte.${today}`)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

async function findAssessments(term, scope) {
  let query = supabase
    .from('assessment')
    .select('assessment_id,title,assessment_type,assessment_number,max_score,weight,due_date,academic_year,semester,course(course_id,course_code,course_name)')
    .or(`title.ilike.${ilikePattern(term)},assessment_type.ilike.${ilikePattern(term)}`)
    .limit(CANDIDATE_LIMIT)

  if (Array.isArray(scope.courseIds)) {
    if (!scope.courseIds.length) return []
    query = query.in('course_id', scope.courseIds)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

async function findFinalGrades(term, scope, matchedCourseIds, matchedStudentIds) {
  let query = supabase
    .from('final_grade')
    .select('final_grade_id,student_id,course_id,academic_year,semester,computed_score,letter_grade,gpa,course(course_id,course_code,course_name)')
    .limit(CANDIDATE_LIMIT)

  if (matchedCourseIds.length) {
    const allowedCourseIds = Array.isArray(scope.courseIds) ? intersect(scope.courseIds, matchedCourseIds) : matchedCourseIds
    if (!allowedCourseIds.length) return []
    query = query.in('course_id', allowedCourseIds)
  } else if (Array.isArray(scope.courseIds)) {
    if (!scope.courseIds.length) return []
    query = query.in('course_id', scope.courseIds)
  } else if (!matchedStudentIds.length) {
    return []
  }

  if (Array.isArray(scope.studentIds)) {
    const allowedStudentIds = matchedStudentIds.length ? intersect(scope.studentIds, matchedStudentIds) : scope.studentIds
    if (!allowedStudentIds.length) return []
    query = query.in('student_id', allowedStudentIds)
  } else if (matchedStudentIds.length) {
    query = query.in('student_id', matchedStudentIds)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

async function findRooms(term) {
  const { data, error } = await supabase.from('room').select('room_id,room_name').ilike('room_name', ilikePattern(term)).limit(CANDIDATE_LIMIT)
  if (error) throw error
  return data || []
}

async function findSessions(term, scope, matchedCourseIds) {
  const rooms = await findRooms(term)
  const roomIds = rooms.map((room) => room.room_id)
  const courseIds = Array.isArray(scope.courseIds) ? scope.courseIds : null
  const courseMatchIds = courseIds === null ? matchedCourseIds : intersect(courseIds, matchedCourseIds)
  const queries = []

  if (courseMatchIds.length) {
    let query = supabase
      .from('class_session')
      .select('session_id,course_id,room_id,start_time,end_time,academic_year,semester,course(course_id,course_code,course_name),room(room_id,room_name)')
      .in('course_id', courseMatchIds)
      .limit(CANDIDATE_LIMIT)
    queries.push(query)
  }

  if (roomIds.length) {
    let query = supabase
      .from('class_session')
      .select('session_id,course_id,room_id,start_time,end_time,academic_year,semester,course(course_id,course_code,course_name),room(room_id,room_name)')
      .in('room_id', roomIds)
      .limit(CANDIDATE_LIMIT)
    if (courseIds !== null) query = query.in('course_id', courseIds)
    queries.push(query)
  }

  if (!queries.length) return []
  const responses = await Promise.all(queries)
  const rows = []
  for (const response of responses) {
    if (response.error) throw response.error
    rows.push(...(response.data || []))
  }

  const seen = new Set()
  return rows.filter((row) => {
    if (seen.has(row.session_id)) return false
    seen.add(row.session_id)
    const courseText = `${row.course?.course_code || ''} ${row.course?.course_name || ''}`
    const roomText = row.room?.room_name || ''
    return includesTerm(courseText, term) || includesTerm(roomText, term)
  })
}

async function findFinancialRecords(term, scope, matchedStudentIds, role) {
  if (!['administrator', 'guardian'].includes(role)) return []
  if (scope.studentIds !== null && !scope.studentIds.length) return []
  const uuid = exactUuid(term)
  const statusMatch = ['pending', 'partial', 'paid', 'overdue', 'cancelled'].some((status) => status.includes(normalizeForMatch(term)))
  if (!matchedStudentIds.length && !uuid && !statusMatch) return []

  let query = supabase
    .from('financial_record')
    .select('invoice_id,student_id,amount_due,amount_paid,balance_due,payment_status,student(student_id,full_name)')
    .limit(CANDIDATE_LIMIT)
  if (Array.isArray(scope.studentIds)) query = query.in('student_id', scope.studentIds)

  const filters = []
  if (matchedStudentIds.length) filters.push(`student_id.in.(${matchedStudentIds.join(',')})`)
  if (statusMatch) filters.push(`payment_status.ilike.${ilikePattern(term)}`)
  if (uuid) filters.push(`invoice_id.eq.${uuid}`)
  if (filters.length > 1) query = query.or(filters.join(','))
  else if (filters.length === 1) {
    const [field, operator, value] = filters[0].split('.', 3)
    if (field === 'student_id' && operator === 'in') query = query.in('student_id', value.slice(1, -1).split(','))
    else if (field === 'payment_status') query = query.ilike('payment_status', ilikePattern(term))
    else if (field === 'invoice_id') query = query.eq('invoice_id', uuid)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []).filter((row) => {
    const studentName = row.student?.full_name || ''
    return includesTerm(studentName, term) || includesTerm(row.payment_status, term) || row.invoice_id === uuid || matchedStudentIds.includes(row.student_id)
  })
}

function mapResults({ role, courses, students, teachers, announcements, assessments, grades, sessions, financialRecords }) {
  const mapped = []
  for (const course of courses) {
    mapped.push(result('course', course.course_id, course.course_name, `${course.course_code || 'No code'} · ${Number(course.credit_units || 0)} credits`, role === 'student' ? '/course-registration' : '/course-catalog', course.course_code || course.course_name))
  }
  for (const student of students) {
    const path = role === 'administrator' ? '/student-enrollment' : role === 'teacher' ? '/gradebook' : role === 'guardian' ? '/guardian-portal' : '/profile'
    mapped.push(result('student', student.student_id, student.full_name, `${student.class_level || 'Student'}${student.user_account?.email ? ` · ${student.user_account.email}` : ''}`, path, student.full_name))
  }
  for (const teacher of teachers) {
    mapped.push(result('teacher', teacher.teacher_id, teacher.full_name, teacher.email || 'Teacher', '/admin-dashboard', teacher.full_name || teacher.email))
  }
  for (const announcement of announcements) {
    mapped.push(result('announcement', announcement.announcement_id, announcement.title, `${announcement.priority || 'normal'} announcement`, '/announcements', announcement.title))
  }
  for (const assessment of assessments) {
    const course = assessment.course || {}
    const path = role === 'administrator' ? '/grading-review' : role === 'teacher' ? '/gradebook' : '/assessments'
    mapped.push(result('assessment', assessment.assessment_id, assessment.title || assessment.assessment_type, `${course.course_code || ''} · ${course.course_name || ''}`, path, course.course_code || assessment.title))
  }
  for (const grade of grades) {
    const course = grade.course || {}
    const path = role === 'administrator' ? '/grading-review' : role === 'teacher' ? '/gradebook' : '/report-card'
    mapped.push(result('grade', grade.final_grade_id, `${course.course_code || ''} final grade`, `${course.course_name || ''} · ${grade.letter_grade || 'Pending'} · GPA ${grade.gpa ?? '—'}`, path, course.course_code || course.course_name))
  }
  for (const session of sessions) {
    const course = session.course || {}
    const room = session.room?.room_name ? ` · ${session.room.room_name}` : ''
    mapped.push(result('session', session.session_id, `${course.course_code || ''} class session`, `${course.course_name || 'Class session'}${room}`, '/class-sessions', course.course_code || course.course_name))
  }
  for (const invoice of financialRecords) {
    mapped.push(result('financial', invoice.invoice_id, `${invoice.student?.full_name || 'Student'} financial record`, `${invoice.payment_status || 'Pending'} · Balance ${Number(invoice.balance_due || 0).toLocaleString()} XAF`, role === 'administrator' ? '/financial-records' : '/guardian-portal', invoice.student?.full_name || invoice.payment_status))
  }
  return mapped
}

function rankSearchResult(item, term) {
  const normalizedQuery = normalizeForMatch(term)
  const title = normalizeForMatch(item.title)
  const subtitle = normalizeForMatch(item.subtitle)
  const searchValue = normalizeForMatch(item.search_value)
  if (title === normalizedQuery || searchValue === normalizedQuery) return 100
  if (title.startsWith(normalizedQuery) || searchValue.startsWith(normalizedQuery)) return 90
  if (title.includes(normalizedQuery) || searchValue.includes(normalizedQuery)) return 80
  if (subtitle.startsWith(normalizedQuery)) return 70
  if (subtitle.includes(normalizedQuery)) return 60
  return 10
}

router.get('/', asyncRoute(async (req, res) => {
  const rawQuery = asText(req.query?.q, 'q', { max: 80 }).trim()
  const term = normalizedTerm(rawQuery)
  if (term.length < 2) throw new ApiError(400, 'Search query must contain at least 2 characters')

  const scope = await buildScope(req.user)
  const courses = await findCourses(term, scope)
  const students = await findStudents(term, scope)
  const matchedCourseIds = courses.map((course) => course.course_id)
  const matchedStudentIds = students.map((student) => student.student_id)

  const [teachers, announcements, assessments, grades, sessions, financialRecords] = await Promise.all([
    findTeachers(term, req.user.role),
    findAnnouncements(term, req.user.role),
    findAssessments(term, scope),
    findFinalGrades(term, scope, matchedCourseIds, matchedStudentIds),
    findSessions(term, scope, matchedCourseIds),
    findFinancialRecords(term, scope, matchedStudentIds, req.user.role),
  ])

  const results = mapResults({
    role: req.user.role,
    courses,
    students,
    teachers,
    announcements,
    assessments,
    grades,
    sessions,
    financialRecords,
  })
    .sort((left, right) => rankSearchResult(right, term) - rankSearchResult(left, term))
    .slice(0, RESULT_LIMIT)

  return sendData(res, { query: rawQuery, results })
}))

export default router
