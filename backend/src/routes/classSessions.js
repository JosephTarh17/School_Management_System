import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ApiError, asAcademicYear, asDateTime, asSemester, asText, asUuid, asyncRoute, sendData } from '../lib/api.js'
import { activeAssignmentForCoursePeriod, availableCoursesForPeriod, ensureTeacherCourseAssignment, teacherIdForUser } from '../lib/teacherAssignments.js'
import { resolveAcademicPeriod } from '../lib/academicPeriod.js'
import { sessionForAccess } from '../lib/ownership.js'
import { studentCourseIdsForUser } from '../lib/enrollmentScope.js'

const router = express.Router()
router.use(requireAuth)
const select = '*, course(*), teacher:teacher!class_session_teacher_id_fkey(*), room(*), substitute_teacher:teacher!class_session_substitute_teacher_id_fkey(*)'

function exposeCourse(course) {
  if (!course) return course
  return { ...course, semester: course.semester, academic_year: course.academic_year }
}

function exposeSession(session) {
  if (!session) return session
  return { ...session, course: exposeCourse(session.course) }
}

function classSessionMutationError(error) {
  if (error?.code === '23P01') throw new ApiError(409, 'The selected class location is already booked during the selected time. Choose another location or time.')
  throw error
}

function validateTimes(start_time, end_time) {
  const start = asDateTime(start_time, 'start_time')
  const end = asDateTime(end_time, 'end_time')
  if (new Date(start) >= new Date(end)) throw new ApiError(400, 'start_time must be before end_time')
  return { start_time: start, end_time: end }
}

async function assertRoomAvailable({ roomId, startTime, endTime, excludeSessionId = null }) {
  if (!roomId) return
  let query = supabase
    .from('class_session')
    .select('session_id,start_time,end_time,room(room_name),course(course_code,course_name)')
    .eq('room_id', roomId)
    .lt('start_time', endTime)
    .gt('end_time', startTime)
    .limit(1)
  if (excludeSessionId) query = query.neq('session_id', excludeSessionId)

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  if (data) {
    const roomName = data.room?.room_name || 'selected location'
    const courseName = data.course?.course_code || data.course?.course_name || 'another course'
    throw new ApiError(409, `${roomName} is already booked by ${courseName} during the selected time. Choose another location or time.`)
  }
}

router.get('/', asyncRoute(async (req, res) => {
  let query = supabase.from('class_session').select(select).order('start_time')
  if (req.user.role === 'teacher') {
    const teacherId = await teacherIdForUser(req.user.user_id)
    if (!teacherId) return sendData(res, [])
    query = query.eq('teacher_id', teacherId)
  } else if (req.user.role === 'student') {
    const courseIds = await studentCourseIdsForUser(req.user.user_id)
    if (!courseIds.length) return sendData(res, [])
    query = query.in('course_id', courseIds)
  }
  if (req.query.course_id) query = query.eq('course_id', asUuid(req.query.course_id, 'course_id'))
  if (req.query.teacher_id) query = query.eq('teacher_id', asUuid(req.query.teacher_id, 'teacher_id'))
  if (req.query.academic_year || req.query.year) query = query.eq('academic_year', asAcademicYear(req.query.academic_year ?? req.query.year, 'academic_year'))
  if (req.query.semester) query = query.eq('semester', asSemester(req.query.semester, 'semester'))
  const { data, error } = await query
  if (error) throw error
  return sendData(res, (data || []).map(exposeSession))
}))

router.get('/resources', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const { academic_year, semester } = await resolveAcademicPeriod(req.query)
  const [courses, rooms] = await Promise.all([
    req.user.role === 'teacher'
      ? availableCoursesForPeriod(academic_year, semester)
      : supabase.from('course').select('course_id,course_name,course_code,credit_units').order('course_code').then(({ data, error }) => {
        if (error) throw error
        return data || []
      }),
    supabase.from('room').select('*').order('room_name').then(({ data, error }) => {
      if (error) throw error
      return data || []
    }),
  ])
  return sendData(res, { courses: (courses || []).map(exposeCourse), rooms })
}))

router.get('/:sessionId', asyncRoute(async (req, res) => {
  const sessionId = asUuid(req.params.sessionId, 'sessionId')
  if (req.user.role === 'student') {
    const courseIds = await studentCourseIdsForUser(req.user.user_id)
    const { data: session, error: sessionError } = await supabase.from('class_session').select('course_id').eq('session_id', sessionId).maybeSingle()
    if (sessionError) throw sessionError
    if (!session || !courseIds.includes(session.course_id)) throw new ApiError(403, 'You do not have permission to view this class session')
  } else {
    await sessionForAccess(sessionId, req)
  }
  const { data, error } = await supabase.from('class_session').select(select).eq('session_id', sessionId).maybeSingle()
  if (error) throw error
  return sendData(res, exposeSession(data))
}))

router.post('/', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const course_id = asUuid(req.body?.course_id, 'course_id')
  const room_id = asUuid(req.body?.room_id, 'room_id')
  const substitute_teacher_id = asUuid(req.body?.substitute_teacher_id, 'substitute_teacher_id', { optional: true })
  const { academic_year, semester } = await resolveAcademicPeriod(req.body)
  const recurrence_pattern = asText(req.body?.recurrence_pattern, 'recurrence_pattern', { max: 120, optional: true })
  const times = validateTimes(req.body?.start_time, req.body?.end_time)
  await assertRoomAvailable({ roomId: room_id, startTime: times.start_time, endTime: times.end_time })
  const teacher_id = req.user.role === 'teacher'
    ? await teacherIdForUser(req.user.user_id)
    : asUuid(req.body?.teacher_id, 'teacher_id')
  if (!teacher_id) throw new ApiError(403, 'Teacher profile not found')

  const assignment = await ensureTeacherCourseAssignment({
    userId: req.user.user_id,
    teacherId: teacher_id,
    courseId: course_id,
    academic_year,
    semester,
    assignedBy: req.user.role === 'administrator' ? req.user.user_id : null,
  })

  const { data, error } = await supabase.from('class_session').insert({
    assignment_id: assignment.assignment_id,
    course_id,
    teacher_id,
    room_id,
    substitute_teacher_id,
    academic_year,
    semester,
    recurrence_pattern,
    ...times,
  }).select(select).single()
  if (error) classSessionMutationError(error)
  return sendData(res, exposeSession(data), 201)
}))

router.patch('/:sessionId', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const sessionId = asUuid(req.params.sessionId, 'sessionId')
  const currentAccess = await sessionForAccess(sessionId, req)
  const { data: current, error: currentError } = await supabase.from('class_session')
    .select('session_id,assignment_id,course_id,teacher_id,room_id,substitute_teacher_id,academic_year,semester,start_time,end_time,recurrence_pattern')
    .eq('session_id', sessionId)
    .maybeSingle()
  if (currentError) throw currentError
  if (!current) throw new ApiError(404, 'Class session not found')

  const updates = {}
  const nextRoomId = req.body?.room_id !== undefined ? asUuid(req.body.room_id, 'room_id') : current.room_id
  const nextTimes = req.body?.start_time !== undefined || req.body?.end_time !== undefined
    ? validateTimes(req.body.start_time ?? current.start_time, req.body.end_time ?? current.end_time)
    : { start_time: current.start_time, end_time: current.end_time }
  await assertRoomAvailable({ roomId: nextRoomId, startTime: nextTimes.start_time, endTime: nextTimes.end_time, excludeSessionId: sessionId })

  for (const field of ['substitute_teacher_id']) {
    if (req.body?.[field] !== undefined) updates[field] = asUuid(req.body[field], field, { optional: true })
  }
  if (req.body?.room_id !== undefined) updates.room_id = nextRoomId

  const nextCourseId = req.body?.course_id !== undefined ? asUuid(req.body.course_id, 'course_id') : current.course_id
  const nextTeacherId = req.user.role === 'teacher'
    ? await teacherIdForUser(req.user.user_id)
    : req.body?.teacher_id !== undefined ? asUuid(req.body.teacher_id, 'teacher_id') : current.teacher_id
  const nextAcademicYear = req.body?.academic_year !== undefined || req.body?.year !== undefined
    ? asAcademicYear(req.body.academic_year ?? req.body.year, 'academic_year')
    : current.academic_year
  const nextSemester = req.body?.semester !== undefined ? asSemester(req.body.semester, 'semester') : current.semester

  if (!nextTeacherId) throw new ApiError(403, 'Teacher profile not found')
  if (req.user.role === 'teacher' && nextTeacherId !== (await teacherIdForUser(req.user.user_id))) {
    throw new ApiError(403, 'Teachers may only assign sessions to themselves')
  }

  if (nextCourseId !== current.course_id || nextTeacherId !== current.teacher_id || nextAcademicYear !== current.academic_year || nextSemester !== current.semester) {
    const assignment = await ensureTeacherCourseAssignment({
      userId: req.user.user_id,
      teacherId: nextTeacherId,
      courseId: nextCourseId,
      academic_year: nextAcademicYear,
      semester: nextSemester,
      assignedBy: req.user.role === 'administrator' ? req.user.user_id : null,
    })
    Object.assign(updates, {
      assignment_id: assignment.assignment_id,
      course_id: nextCourseId,
      teacher_id: nextTeacherId,
      academic_year: nextAcademicYear,
      semester: nextSemester,
    })
  }

  if (req.body?.recurrence_pattern !== undefined) updates.recurrence_pattern = asText(req.body.recurrence_pattern, 'recurrence_pattern', { max: 120, optional: true })
  if (req.body?.start_time !== undefined || req.body?.end_time !== undefined) Object.assign(updates, nextTimes)
  if (!Object.keys(updates).length) throw new ApiError(400, 'At least one editable field is required')

  const { data, error } = await supabase.from('class_session').update(updates).eq('session_id', sessionId).select(select).single()
  if (error) classSessionMutationError(error)
  return sendData(res, exposeSession(data))
}))

router.delete('/:sessionId', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const sessionId = asUuid(req.params.sessionId, 'sessionId')
  await sessionForAccess(sessionId, req)
  const { error } = await supabase.from('class_session').delete().eq('session_id', sessionId)
  if (error) throw error
  return res.status(204).send()
}))

export default router
