import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth } from '../middleware/auth.js'
import { asDate, asDateTime, asNumber, asyncRoute, sendData } from '../lib/api.js'
import { permittedCourseIdsForUser } from '../lib/calendarScope.js'

const router = express.Router()
router.use(requireAuth)

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

function defaultRange(role, query) {
  const now = new Date()
  if (query.from && query.to) return { from: query.from, to: query.to }
  if (role === 'administrator') {
    const today = isoDate(now)
    return { from: today, to: today }
  }
  if (role === 'teacher') {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
    return { from: isoDate(from), to: isoDate(to) }
  }
  const from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
  const to = new Date(Date.UTC(now.getUTCFullYear(), 11, 31))
  return { from: isoDate(from), to: isoDate(to) }
}

router.get('/', asyncRoute(async (req, res) => {
  const range = defaultRange(req.user.role, req.query)
  const from = asDate(range.from, 'from')
  const to = asDate(range.to, 'to')
  const occurrenceSelect = 'occurrence_id,occurrence_date,start_at,end_at,status,planned_minutes,course_id,teacher_id,room_id,class_session_id,course(course_id,course_code,course_name),teacher(teacher_id,full_name,email),room(room_id,room_name),timetable_entry(academic_year,semester,status)'
  let occurrenceQuery = supabase.from('timetable_occurrence').select(occurrenceSelect).gte('occurrence_date', from).lte('occurrence_date', to).order('start_at')
  let courseIds = null
  if (req.user.role === 'teacher') {
    const { data: teacher, error } = await supabase.from('teacher').select('teacher_id').eq('user_id', req.user.user_id).maybeSingle()
    if (error) throw error
    if (!teacher) return sendData(res, { role: req.user.role, from, to, events: [] })
    occurrenceQuery = occurrenceQuery.eq('teacher_id', teacher.teacher_id)
  } else if (req.user.role === 'student' || req.user.role === 'guardian') {
    courseIds = await permittedCourseIdsForUser(req.user)
    if (!courseIds.length) return sendData(res, { role: req.user.role, from, to, events: [] })
    occurrenceQuery = occurrenceQuery.in('course_id', courseIds).eq('timetable_entry.status', 'Published').not('status', 'in', '(Voided,Cancelled)')
  }
  const { data: occurrences, error: occurrenceError } = await occurrenceQuery
  if (occurrenceError) throw occurrenceError

  let eventQuery = supabase.from('school_event').select('*').eq('status', 'Published').lt('start_at', `${to}T23:59:59.999Z`).gt('end_at', `${from}T00:00:00.000Z`).order('start_at')
  const { data: schoolEvents, error: eventError } = await eventQuery
  if (eventError) throw eventError
  const audience = req.user.role === 'teacher' ? ['Everyone', 'Teachers'] : req.user.role === 'student' ? ['Everyone', 'Students', 'Course'] : req.user.role === 'guardian' ? ['Everyone', 'Guardians', 'Course'] : null
  const visibleEvents = (schoolEvents || []).filter((event) => !audience || audience.includes(event.audience) && (event.audience !== 'Course' || courseIds?.includes(event.audience_id)))

  const normalizedOccurrences = (occurrences || []).map((item) => ({
    id: item.occurrence_id,
    source: 'timetable',
    title: `${item.course?.course_code || 'Course'} lesson`,
    subtitle: `${item.teacher?.full_name || 'Teacher'} • ${item.room?.room_name || 'Location'}`,
    start_at: item.start_at,
    end_at: item.end_at,
    date: item.occurrence_date,
    status: item.status,
    course_id: item.course_id,
    teacher_id: item.teacher_id,
    room_id: item.room_id,
    planned_minutes: item.planned_minutes,
    actionable: req.user.role === 'teacher' && ['Scheduled', 'Pending Teacher Absence'].includes(item.status),
  }))
  const normalizedSchoolEvents = visibleEvents.map((event) => ({
    id: event.event_id,
    source: 'school_event',
    title: event.title,
    subtitle: event.category,
    description: event.description,
    start_at: event.start_at,
    end_at: event.end_at,
    status: event.status,
    category: event.category,
    location: event.location,
    online_url: event.online_url,
    audience: event.audience,
    actionable: false,
  }))

  const extra = []
  if (req.user.role === 'administrator') {
    const { data: absenceReports, error: absenceError } = await supabase.from('teacher_absence_report').select('absence_report_id,occurrence_id,status,reason,submitted_at,occurrence:timetable_occurrence(occurrence_date,start_at,end_at,course(course_code,course_name)),teacher(full_name)').eq('status', 'Pending').gte('submitted_at', `${from}T00:00:00.000Z`).lte('submitted_at', `${to}T23:59:59.999Z`)
    if (absenceError) throw absenceError
    extra.push(...(absenceReports || []).map((report) => ({ id: report.absence_report_id, source: 'teacher_absence_review', title: `Teacher absence review: ${report.teacher?.full_name || 'Teacher'}`, subtitle: report.occurrence?.course?.course_code || 'Course', start_at: report.occurrence?.start_at || report.submitted_at, end_at: report.occurrence?.end_at || report.submitted_at, status: report.status, reason: report.reason, actionable: true })))

    const { data: pendingAbsences, error: pendingError } = await supabase.from('attendance').select('attendance_id,student_id,session_date,justification_status,justification_deadline_at,student(full_name),class_session(course(course_code,course_name))').in('justification_status', ['PENDING', 'SUBMITTED']).gte('justification_deadline_at', `${from}T00:00:00.000Z`).lte('justification_deadline_at', `${to}T23:59:59.999Z`).order('justification_deadline_at')
    if (pendingError) throw pendingError
    extra.push(...(pendingAbsences || []).map((record) => ({ id: record.attendance_id, source: 'absence_justification_deadline', title: `Absence justification: ${record.student?.full_name || 'Student'}`, subtitle: record.class_session?.course?.course_code || 'Course', start_at: record.justification_deadline_at, end_at: record.justification_deadline_at, status: record.justification_status, actionable: true })))
  }
  return sendData(res, { role: req.user.role, from, to, events: [...normalizedOccurrences, ...normalizedSchoolEvents, ...extra].sort((a, b) => new Date(a.start_at) - new Date(b.start_at)) })
}))

export default router
