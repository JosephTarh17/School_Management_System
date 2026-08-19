import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ApiError, asAcademicYear, asDate, asDateTime, asEnum, asNumber, asSemester, asText, asUuid, asyncRoute, sendData } from '../lib/api.js'
import { activeAssignmentsForTeacher, teacherIdForUser } from '../lib/teacherAssignments.js'
import { studentCourseIdsForUser } from '../lib/enrollmentScope.js'
import { resolveAcademicPeriod } from '../lib/academicPeriod.js'
import { occurrenceAt, datesForWeekday, dayName, plannedMinutes, assertTimetableConflicts, assertOccurrenceWithinAllocation, progressForAllocation } from '../lib/timetable.js'

const router = express.Router()
router.use(requireAuth)
const statuses = ['Draft', 'Published', 'Suspended', 'Cancelled', 'Archived']
const occurrenceStatuses = ['Scheduled', 'Pending Teacher Absence', 'Completed', 'No Attendance', 'Cancelled', 'Voided', 'Unfunded', 'Requires Review']
const occurrenceSelect = 'occurrence_id,timetable_entry_id,allocation_id,assignment_id,course_id,teacher_id,room_id,occurrence_date,start_at,end_at,planned_minutes,status,class_session_id,completion_actor,completed_at,void_reason,course(course_id,course_code,course_name,credit_units),teacher(teacher_id,full_name,email),room(room_id,room_name,location,capacity),timetable_entry(timetable_entry_id,academic_year,semester,day_of_week,start_local_time,end_local_time,effective_from,effective_to,status,notes)'

async function allowedCourseIdsForGuardian(userId) {
  const { data: guardian, error: guardianError } = await supabase.from('guardian').select('guardian_id').eq('user_id', userId).maybeSingle()
  if (guardianError) throw guardianError
  if (!guardian) return []
  const { data: links, error: linksError } = await supabase.from('student_guardian').select('student_id').eq('guardian_id', guardian.guardian_id)
  if (linksError) throw linksError
  const studentIds = (links || []).map((row) => row.student_id)
  if (!studentIds.length) return []
  const { data: enrollments, error: enrollmentError } = await supabase.from('enrollment').select('course_id').in('student_id', studentIds).eq('status', 'active')
  if (enrollmentError) throw enrollmentError
  return [...new Set((enrollments || []).map((row) => row.course_id))]
}

async function permittedCourseIds(req) {
  if (req.user.role === 'student') return studentCourseIdsForUser(req.user.user_id)
  if (req.user.role === 'guardian') return allowedCourseIdsForGuardian(req.user.user_id)
  return null
}

async function occurrenceForAccess(occurrenceId, req) {
  const occurrence = await assertOccurrenceWithinAllocation(occurrenceId)
  if (req.user.role === 'administrator') return occurrence
  if (req.user.role === 'teacher') {
    const teacherId = await teacherIdForUser(req.user.user_id)
    if (!teacherId || occurrence.teacher_id !== teacherId) throw new ApiError(403, 'You may only access your own timetable occurrences')
    return occurrence
  }
  const courseIds = await permittedCourseIds(req)
  if (!courseIds?.includes(occurrence.course_id) || occurrence.status === 'Voided' || occurrence.status === 'Cancelled') throw new ApiError(403, 'You do not have permission to view this timetable occurrence')
  return occurrence
}

async function createOccurrences(entry, dates) {
  const rows = []
  for (const date of dates) {
    const times = occurrenceAt(date, entry.start_local_time, entry.end_local_time)
    await assertTimetableConflicts({ teacherId: entry.teacher_id, roomId: entry.room_id, startAt: times.start_at, endAt: times.end_at })
    rows.push({
      timetable_entry_id: entry.timetable_entry_id,
      allocation_id: entry.allocation_id,
      assignment_id: entry.assignment_id,
      course_id: entry.course_id,
      teacher_id: entry.teacher_id,
      room_id: entry.room_id,
      occurrence_date: date,
      ...times,
      planned_minutes: plannedMinutes(entry.start_local_time, entry.end_local_time),
      status: 'Scheduled',
    })
  }
  if (!rows.length) throw new ApiError(400, 'The selected weekday does not occur in the effective date range')
  const { data, error } = await supabase.from('timetable_occurrence').insert(rows).select(occurrenceSelect)
  if (error) throw error
  return data || []
}

router.get('/resources', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const period = await resolveAcademicPeriod(req.query)
  const [assignmentsResult, roomsResult, policyResult] = await Promise.all([
    req.user.role === 'teacher'
      ? activeAssignmentsForTeacher(req.user.user_id, period).then(({ assignments }) => assignments)
      : supabase.from('teacher_course_assignment').select('assignment_id,teacher_id,course_id,academic_year,semester,status,course(course_id,course_code,course_name,credit_units),teacher(teacher_id,full_name,email)').eq('academic_year', period.academic_year).eq('semester', period.semester).eq('status', 'active').order('course_id').then(({ data, error }) => { if (error) throw error; return data || [] }),
    supabase.from('room').select('*').order('room_name').then(({ data, error }) => { if (error) throw error; return data || [] }),
    supabase.from('absence_policy_setting').select('*').eq('setting_id', 1).maybeSingle().then(({ data, error }) => { if (error) throw error; return data }),
  ])
  return sendData(res, { ...period, assignments: assignmentsResult, rooms: roomsResult, absence_policy: policyResult })
}))

router.get('/', asyncRoute(async (req, res) => {
  let query = supabase.from('timetable_occurrence').select(occurrenceSelect).order('occurrence_date').order('start_at')
  if (req.user.role === 'teacher') {
    const teacherId = await teacherIdForUser(req.user.user_id)
    if (!teacherId) return sendData(res, [])
    query = query.eq('teacher_id', teacherId)
  } else if (req.user.role === 'student' || req.user.role === 'guardian') {
    const courseIds = await permittedCourseIds(req)
    if (!courseIds?.length) return sendData(res, [])
    query = query.in('course_id', courseIds).eq('timetable_entry.status', 'Published').not('status', 'in', '(Voided,Cancelled)')
  }
  if (req.query.academic_year || req.query.year) query = query.eq('academic_year', asAcademicYear(req.query.academic_year ?? req.query.year, 'academic_year'))
  if (req.query.semester) query = query.eq('semester', asSemester(req.query.semester, 'semester'))
  if (req.query.from) query = query.gte('occurrence_date', asDate(req.query.from, 'from'))
  if (req.query.to) query = query.lte('occurrence_date', asDate(req.query.to, 'to'))
  if (req.query.teacher_id && req.user.role === 'administrator') query = query.eq('teacher_id', asUuid(req.query.teacher_id, 'teacher_id'))
  if (req.query.room_id && req.user.role === 'administrator') query = query.eq('room_id', asUuid(req.query.room_id, 'room_id'))
  if (req.query.status && req.user.role === 'administrator') query = query.eq('status', asEnum(req.query.status, 'status', occurrenceStatuses))
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data || [])
}))

router.get('/entries', requireRole('administrator', 'teacher'), asyncRoute(async (req, res) => {
  let query = supabase.from('timetable_entry').select('*,course(course_id,course_code,course_name,credit_units),teacher(teacher_id,full_name,email),room(room_id,room_name,location,capacity),course_hour_allocation(allocation_id,approved_hours,status)').order('effective_from')
  if (req.user.role === 'teacher') {
    const teacherId = await teacherIdForUser(req.user.user_id)
    if (!teacherId) return sendData(res, [])
    query = query.eq('teacher_id', teacherId)
  }
  if (req.query.academic_year || req.query.year) query = query.eq('academic_year', asAcademicYear(req.query.academic_year ?? req.query.year, 'academic_year'))
  if (req.query.semester) query = query.eq('semester', asSemester(req.query.semester, 'semester'))
  if (req.query.status) query = query.eq('status', asEnum(req.query.status, 'status', statuses))
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data || [])
}))

router.post('/', requireRole('administrator'), asyncRoute(async (req, res) => {
  const allocation_id = asUuid(req.body?.allocation_id, 'allocation_id')
  const day_of_week = asNumber(req.body?.day_of_week, 'day_of_week', { min: 1, max: 7, integer: true })
  const start_local_time = asText(req.body?.start_local_time ?? req.body?.start_time, 'start_local_time', { max: 8 })
  const end_local_time = asText(req.body?.end_local_time ?? req.body?.end_time, 'end_local_time', { max: 8 })
  const effective_from = asDate(req.body?.effective_from, 'effective_from')
  const effective_to = asDate(req.body?.effective_to, 'effective_to')
  if (effective_from > effective_to) throw new ApiError(400, 'effective_from must be before or equal to effective_to')
  const notes = asText(req.body?.notes, 'notes', { max: 1000, optional: true })
  const room_id = asUuid(req.body?.room_id, 'room_id')
  const { data: allocation, error: allocationError } = await supabase.from('course_hour_allocation')
    .select('allocation_id,assignment_id,course_id,teacher_id,academic_year,semester,status')
    .eq('allocation_id', allocation_id)
    .maybeSingle()
  if (allocationError) throw allocationError
  if (!allocation || allocation.status !== 'Active') throw new ApiError(400, 'An active course-hour allocation is required')
  const entry = { allocation_id, assignment_id: allocation.assignment_id, course_id: allocation.course_id, teacher_id: allocation.teacher_id, room_id, academic_year: allocation.academic_year, semester: allocation.semester, day_of_week, start_local_time: start_local_time.length === 5 ? `${start_local_time}:00` : start_local_time, end_local_time: end_local_time.length === 5 ? `${end_local_time}:00` : end_local_time, effective_from, effective_to, status: 'Draft', notes, created_by: req.user.user_id, updated_by: req.user.user_id }
  plannedMinutes(entry.start_local_time, entry.end_local_time)
  const { data: created, error: createError } = await supabase.from('timetable_entry').insert(entry).select('timetable_entry_id,allocation_id,assignment_id,course_id,teacher_id,room_id,academic_year,semester,day_of_week,start_local_time,end_local_time,effective_from,effective_to,status,notes').single()
  if (createError) throw createError
  try {
    const occurrenceRows = await createOccurrences(created, datesForWeekday(effective_from, effective_to, day_of_week))
    return sendData(res, { entry: created, occurrences: occurrenceRows, progress: await progressForAllocation(allocation_id) }, 201)
  } catch (error) {
    await supabase.from('timetable_entry').delete().eq('timetable_entry_id', created.timetable_entry_id)
    throw error
  }
}))

router.patch('/:entryId', requireRole('administrator'), asyncRoute(async (req, res) => {
  const entryId = asUuid(req.params.entryId, 'entryId')
  const { data: current, error: currentError } = await supabase.from('timetable_entry').select('*').eq('timetable_entry_id', entryId).maybeSingle()
  if (currentError) throw currentError
  if (!current) throw new ApiError(404, 'Timetable entry not found')
  const changes = {}
  if (req.body?.notes !== undefined) changes.notes = asText(req.body.notes, 'notes', { max: 1000, optional: true })
  if (req.body?.status !== undefined) changes.status = asEnum(req.body.status, 'status', statuses)
  const scheduleChanged = ['day_of_week', 'start_local_time', 'end_local_time', 'effective_from', 'effective_to', 'room_id'].some((field) => req.body?.[field] !== undefined)
  if (scheduleChanged && current.status !== 'Draft') throw new ApiError(400, 'Only draft timetable entries can be rescheduled through this action')
  if (scheduleChanged) {
    const day = req.body?.day_of_week !== undefined ? asNumber(req.body.day_of_week, 'day_of_week', { min: 1, max: 7, integer: true }) : current.day_of_week
    const start = req.body?.start_local_time ?? current.start_local_time
    const end = req.body?.end_local_time ?? current.end_local_time
    const from = req.body?.effective_from ? asDate(req.body.effective_from, 'effective_from') : current.effective_from
    const to = req.body?.effective_to ? asDate(req.body.effective_to, 'effective_to') : current.effective_to
    const roomId = req.body?.room_id ? asUuid(req.body.room_id, 'room_id') : current.room_id
    if (from > to) throw new ApiError(400, 'effective_from must be before or equal to effective_to')
    plannedMinutes(start, end)
    changes.day_of_week = day
    changes.start_local_time = start.length === 5 ? `${start}:00` : start
    changes.end_local_time = end.length === 5 ? `${end}:00` : end
    changes.effective_from = from
    changes.effective_to = to
    changes.room_id = roomId
    changes.change_reason = asText(req.body?.change_reason, 'change_reason', { max: 1000 })
    const { data: completed, error: completedError } = await supabase.from('timetable_occurrence').select('occurrence_id').eq('timetable_entry_id', entryId).eq('status', 'Completed').limit(1)
    if (completedError) throw completedError
    if (completed?.length) throw new ApiError(409, 'A timetable entry with completed sessions cannot be rescheduled')
    await supabase.from('timetable_occurrence').delete().eq('timetable_entry_id', entryId)
  }
  if (!Object.keys(changes).length) throw new ApiError(400, 'At least one editable field is required')
  const { data: updated, error: updateError } = await supabase.from('timetable_entry').update({ ...changes, updated_by: req.user.user_id }).eq('timetable_entry_id', entryId).select('*').single()
  if (updateError) throw updateError
  if (scheduleChanged) await createOccurrences({ ...updated, room_id: changes.room_id }, datesForWeekday(updated.effective_from, updated.effective_to, updated.day_of_week))
  if (changes.status === 'Published') await supabase.from('timetable_occurrence').update({ status: 'Scheduled' }).eq('timetable_entry_id', entryId).in('status', ['Scheduled', 'Requires Review'])
  if (changes.status === 'Cancelled') await supabase.from('timetable_occurrence').update({ status: 'Cancelled', void_reason: changes.change_reason || 'Timetable entry cancelled' }).eq('timetable_entry_id', entryId).in('status', ['Scheduled', 'Pending Teacher Absence', 'Requires Review'])
  return sendData(res, updated)
}))

router.post('/occurrences/:occurrenceId/open-session', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const occurrenceId = asUuid(req.params.occurrenceId, 'occurrenceId')
  const occurrence = await occurrenceForAccess(occurrenceId, req)
  if (['Voided', 'Cancelled', 'No Attendance'].includes(occurrence.status)) throw new ApiError(409, 'This occurrence cannot open an actual class session')
  if (occurrence.class_session_id) {
    const { data, error } = await supabase.from('class_session').select('*').eq('session_id', occurrence.class_session_id).maybeSingle()
    if (error) throw error
    return sendData(res, data)
  }
  const { data, error } = await supabase.from('class_session').insert({ course_id: occurrence.course_id, teacher_id: occurrence.teacher_id, room_id: occurrence.room_id, start_time: occurrence.start_at, end_time: occurrence.end_at, academic_year: occurrence.timetable_entry?.academic_year, semester: occurrence.timetable_entry?.semester, assignment_id: occurrence.assignment_id, timetable_occurrence_id: occurrenceId }).select('*').single()
  if (error?.code === '23505') {
    const { data: existing, error: existingError } = await supabase.from('class_session').select('*').eq('timetable_occurrence_id', occurrenceId).maybeSingle()
    if (existingError) throw existingError
    return sendData(res, existing)
  }
  if (error) throw error
  const { error: linkError } = await supabase.from('timetable_occurrence').update({ class_session_id: data.session_id }).eq('occurrence_id', occurrenceId)
  if (linkError) throw linkError
  return sendData(res, data, 201)
}))

router.post('/occurrences/:occurrenceId/complete', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const occurrenceId = asUuid(req.params.occurrenceId, 'occurrenceId')
  const occurrence = await occurrenceForAccess(occurrenceId, req)
  if (new Date(occurrence.end_at) > new Date()) throw new ApiError(400, 'A timetable occurrence can be completed only after its scheduled end time')
  if (['Voided', 'Cancelled', 'No Attendance'].includes(occurrence.status)) throw new ApiError(409, 'This occurrence cannot be completed')
  if (!occurrence.class_session_id) throw new ApiError(400, 'Open the actual class session and record attendance before completing this occurrence')
  const { data: attendance, error: attendanceError } = await supabase.from('attendance').select('attendance_id,status').eq('session_id', occurrence.class_session_id)
  if (attendanceError) throw attendanceError
  if (!attendance?.length) throw new ApiError(400, 'Attendance is required before a session can be completed')
  if (!attendance.some((row) => row.status === 'Present')) {
    await supabase.from('timetable_occurrence').update({ status: 'No Attendance', void_reason: 'All enrolled students were absent' }).eq('occurrence_id', occurrenceId)
    return sendData(res, { status: 'No Attendance', completed_hours: 0 })
  }
  const { data, error } = await supabase.from('timetable_occurrence').update({ status: 'Completed', completion_actor: req.user.user_id, completed_at: new Date().toISOString() }).eq('occurrence_id', occurrenceId).in('status', ['Scheduled', 'Requires Review']).select('*').single()
  if (error) throw error
  return sendData(res, { occurrence: data, progress: await progressForAllocation(occurrence.allocation_id) })
}))

router.post('/occurrences/:occurrenceId/absence-report', requireRole('teacher'), asyncRoute(async (req, res) => {
  const occurrenceId = asUuid(req.params.occurrenceId, 'occurrenceId')
  const occurrence = await occurrenceForAccess(occurrenceId, req)
  if (new Date(occurrence.start_at) <= new Date()) throw new ApiError(400, 'Teacher absence reports must be submitted before the scheduled session')
  const reason = asText(req.body?.reason, 'reason', { max: 1000 })
  const replacement_requested = Boolean(req.body?.replacement_requested)
  const teacherId = await teacherIdForUser(req.user.user_id)
  const { data, error } = await supabase.from('teacher_absence_report').insert({ occurrence_id: occurrenceId, teacher_id: teacherId, reason, replacement_requested }).select('*').single()
  if (error) throw error
  await supabase.from('timetable_occurrence').update({ status: 'Pending Teacher Absence' }).eq('occurrence_id', occurrenceId).eq('status', 'Scheduled')
  return sendData(res, data, 201)
}))

router.get('/absence-reports', requireRole('administrator', 'teacher'), asyncRoute(async (req, res) => {
  let query = supabase.from('teacher_absence_report').select('*,occurrence:timetable_occurrence(*,course(course_code,course_name),room(room_name)),teacher(teacher_id,full_name,email)').order('submitted_at', { ascending: false })
  if (req.user.role === 'teacher') {
    const teacherId = await teacherIdForUser(req.user.user_id)
    query = query.eq('teacher_id', teacherId)
  }
  if (req.query.status) query = query.eq('status', asEnum(req.query.status, 'status', ['Pending', 'Approved', 'Rejected', 'Cancelled']))
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data || [])
}))

router.post('/absence-reports/:reportId/review', requireRole('administrator'), asyncRoute(async (req, res) => {
  const reportId = asUuid(req.params.reportId, 'reportId')
  const status = asEnum(req.body?.status, 'status', ['Approved', 'Rejected', 'Cancelled'])
  const review_notes = asText(req.body?.review_notes, 'review_notes', { max: 1000, optional: true })
  const { data: report, error: reportError } = await supabase.from('teacher_absence_report').select('absence_report_id,occurrence_id,status').eq('absence_report_id', reportId).maybeSingle()
  if (reportError) throw reportError
  if (!report) throw new ApiError(404, 'Teacher absence report not found')
  const { data, error } = await supabase.from('teacher_absence_report').update({ status, review_notes, reviewed_at: new Date().toISOString(), reviewed_by: req.user.user_id }).eq('absence_report_id', reportId).select('*').single()
  if (error) throw error
  const nextOccurrenceStatus = status === 'Approved' || status === 'Cancelled' ? 'Cancelled' : 'Scheduled'
  await supabase.from('timetable_occurrence').update({ status: nextOccurrenceStatus, void_reason: status === 'Rejected' ? null : review_notes || `Teacher absence ${status.toLowerCase()}` }).eq('occurrence_id', report.occurrence_id)
  return sendData(res, data)
}))

router.post('/hour-requests', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const allocation_id = asUuid(req.body?.allocation_id, 'allocation_id')
  const requested_hours = asNumber(req.body?.requested_hours, 'requested_hours', { min: 0.01, max: 10000 })
  const reason = asText(req.body?.reason, 'reason', { max: 1000 })
  const { data: allocation, error: allocationError } = await supabase.from('course_hour_allocation').select('allocation_id,teacher_id').eq('allocation_id', allocation_id).maybeSingle()
  if (allocationError) throw allocationError
  if (!allocation) throw new ApiError(404, 'Course-hour allocation not found')
  if (req.user.role === 'teacher') {
    const teacherId = await teacherIdForUser(req.user.user_id)
    if (teacherId !== allocation.teacher_id) throw new ApiError(403, 'You may request hours only for your own course offering')
  }
  const { data, error } = await supabase.from('timetable_hour_request').insert({ allocation_id, requested_by: req.user.user_id, requested_hours, reason, status: 'Pending' }).select('*').single()
  if (error) throw error
  return sendData(res, data, 201)
}))

router.get('/hour-requests', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  let query = supabase.from('timetable_hour_request').select('*,course_hour_allocation(*,course(course_code,course_name),teacher(full_name,email))').order('requested_at', { ascending: false })
  if (req.user.role === 'teacher') query = query.eq('requested_by', req.user.user_id)
  if (req.query.status) query = query.eq('status', asEnum(req.query.status, 'status', ['Pending', 'Approved', 'Rejected', 'Cancelled']))
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data || [])
}))

router.post('/hour-requests/:requestId/review', requireRole('administrator'), asyncRoute(async (req, res) => {
  const requestId = asUuid(req.params.requestId, 'requestId')
  const status = asEnum(req.body?.status, 'status', ['Approved', 'Rejected', 'Cancelled'])
  const review_note = asText(req.body?.review_note, 'review_note', { max: 1000, optional: true })
  const { data: request, error: requestError } = await supabase.from('timetable_hour_request').select('*').eq('request_id', requestId).eq('status', 'Pending').maybeSingle()
  if (requestError) throw requestError
  if (!request) throw new ApiError(404, 'Pending additional-hours request not found')
  if (status === 'Approved') {
    const { data: allocation, error: allocationError } = await supabase.from('course_hour_allocation').select('allocation_id,approved_hours').eq('allocation_id', request.allocation_id).single()
    if (allocationError) throw allocationError
    const newHours = Number(allocation.approved_hours) + Number(request.requested_hours)
    const { error: allocationUpdateError } = await supabase.from('course_hour_allocation').update({ approved_hours: newHours, updated_by: req.user.user_id }).eq('allocation_id', request.allocation_id)
    if (allocationUpdateError) throw allocationUpdateError
    const { error: revisionError } = await supabase.from('course_hour_allocation_revision').insert({ allocation_id: request.allocation_id, previous_hours: allocation.approved_hours, new_hours: newHours, action: 'Increased', reason: review_note || `Approved additional-hours request: ${request.reason}`, changed_by: req.user.user_id })
    if (revisionError) throw revisionError
  }
  const { data, error } = await supabase.from('timetable_hour_request').update({ status, review_note, reviewed_by: req.user.user_id, reviewed_at: new Date().toISOString() }).eq('request_id', requestId).eq('status', 'Pending').select('*').single()
  if (error) throw error
  return sendData(res, data)
}))

export default router
