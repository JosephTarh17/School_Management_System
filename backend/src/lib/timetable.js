import { supabase } from '../supabaseClient.js'
import { ApiError } from './api.js'
import { safeNotifyStudentAndGuardians, safeNotifyUsers, userIdsForAudience } from './notifications.js'

export const TIMETABLE_ACTIVE_STATUSES = ['Scheduled', 'Pending Teacher Absence', 'Requires Review']
export const TIMETABLE_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function dateFromUtc(value) {
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) throw new ApiError(400, 'Invalid timetable date')
  return date
}

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

export function dayName(dayOfWeek) {
  return TIMETABLE_DAY_NAMES[Number(dayOfWeek) - 1] || 'Unknown day'
}

export function plannedMinutes(startTime, endTime) {
  const start = Date.parse(`1970-01-01T${startTime}Z`)
  const end = Date.parse(`1970-01-01T${endTime}Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new ApiError(400, 'end_time must be later than start_time')
  return Math.round((end - start) / 60000)
}

export function occurrenceAt(date, startTime, endTime) {
  const start = new Date(`${date}T${startTime}Z`)
  const end = new Date(`${date}T${endTime}Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) throw new ApiError(400, 'Invalid timetable occurrence time')
  return { start_at: start.toISOString(), end_at: end.toISOString() }
}

export function datesForWeekday(from, to, dayOfWeek) {
  const start = dateFromUtc(from)
  const end = dateFromUtc(to)
  const target = Number(dayOfWeek) - 1
  const dates = []
  const cursor = new Date(start)
  while (cursor <= end) {
    const mondayFirstDay = (cursor.getUTCDay() + 6) % 7
    if (mondayFirstDay === target) dates.push(isoDate(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
    if (dates.length > 60) throw new ApiError(400, 'A timetable entry cannot generate more than 60 occurrences')
  }
  return dates
}

export async function assertTimetableConflicts({ teacherId, roomId, startAt, endAt, excludeOccurrenceId = null }) {
  let occurrenceQuery = supabase.from('timetable_occurrence')
    .select('occurrence_id,course_id,teacher_id,room_id,start_at,end_at,course(course_code,course_name),room(room_name)')
    .in('status', TIMETABLE_ACTIVE_STATUSES)
    .lt('start_at', endAt)
    .gt('end_at', startAt)
  if (excludeOccurrenceId) occurrenceQuery = occurrenceQuery.neq('occurrence_id', excludeOccurrenceId)
  const { data: occurrences, error: occurrenceError } = await occurrenceQuery
  if (occurrenceError) throw occurrenceError
  const teacherConflict = (occurrences || []).find((row) => row.teacher_id === teacherId)
  if (teacherConflict) throw new ApiError(409, `The teacher is already scheduled for ${teacherConflict.course?.course_code || 'another course'} during this time.`)
  const roomConflict = (occurrences || []).find((row) => row.room_id === roomId)
  if (roomConflict) throw new ApiError(409, `${roomConflict.room?.room_name || 'The selected location'} is already booked during this time.`)

  let sessionQuery = supabase.from('class_session')
    .select('session_id,course_id,teacher_id,room_id,start_time,end_time,course(course_code,course_name),room(room_name)')
    .lt('start_time', endAt)
    .gt('end_time', startAt)
  const { data: sessions, error: sessionError } = await sessionQuery
  if (sessionError) throw sessionError
  const sessionTeacher = (sessions || []).find((row) => row.teacher_id === teacherId)
  if (sessionTeacher) throw new ApiError(409, `The teacher has an actual class session during this time.`)
  const sessionRoom = (sessions || []).find((row) => row.room_id === roomId)
  if (sessionRoom) throw new ApiError(409, `${sessionRoom.room?.room_name || 'The selected location'} is occupied by an actual class session during this time.`)
}

export async function assertOccurrenceWithinAllocation(occurrenceId) {
  const { data: occurrence, error } = await supabase.from('timetable_occurrence')
    .select('occurrence_id,allocation_id,status,planned_minutes,teacher_id,course_id,assignment_id,room_id,start_at,end_at,class_session_id,course(course_code,course_name),room(room_name),timetable_entry(academic_year,semester,status)')
    .eq('occurrence_id', occurrenceId)
    .maybeSingle()
  if (error) throw error
  if (!occurrence) throw new ApiError(404, 'Timetable occurrence not found')
  return occurrence
}

export async function progressForAllocation(allocationId) {
  const { data: allocation, error: allocationError } = await supabase.from('course_hour_allocation')
    .select('allocation_id,assignment_id,course_id,teacher_id,academic_year,semester,approved_hours,status,course(course_code,course_name),teacher(teacher_id,full_name,email)')
    .eq('allocation_id', allocationId)
    .maybeSingle()
  if (allocationError) throw allocationError
  if (!allocation) throw new ApiError(404, 'Course-hour allocation not found')
  const { data: occurrences, error: occurrenceError } = await supabase.from('timetable_occurrence')
    .select('occurrence_id,status,planned_minutes,occurrence_date,start_at,end_at,course(course_code,course_name),room(room_name)')
    .eq('allocation_id', allocationId)
    .order('occurrence_date')
  if (occurrenceError) throw occurrenceError
  const rows = occurrences || []
  const sumHours = (statuses) => rows.filter((row) => statuses.includes(row.status)).reduce((total, row) => total + Number(row.planned_minutes || 0), 0) / 60
  const scheduledHours = sumHours(['Scheduled', 'Pending Teacher Absence', 'Requires Review'])
  const completedHours = sumHours(['Completed'])
  const voidedHours = sumHours(['No Attendance', 'Cancelled', 'Voided', 'Unfunded'])
  return {
    ...allocation,
    approved_hours: Number(allocation.approved_hours),
    scheduled_hours: Number(scheduledHours.toFixed(2)),
    completed_hours: Number(completedHours.toFixed(2)),
    remaining_hours: Number(Math.max(Number(allocation.approved_hours) - completedHours, 0).toFixed(2)),
    voided_hours: Number(voidedHours.toFixed(2)),
    excess_hours: Number(Math.max(completedHours - Number(allocation.approved_hours), 0).toFixed(2)),
    occurrences: rows,
  }
}

export async function voidFutureExcessOccurrences(allocationId, approvedHours, reason, changedBy) {
  const { data: rows, error } = await supabase.from('timetable_occurrence')
    .select('occurrence_id,planned_minutes,status,occurrence_date')
    .eq('allocation_id', allocationId)
    .in('status', ['Scheduled', 'Pending Teacher Absence', 'Requires Review'])
    .gte('occurrence_date', new Date().toISOString().slice(0, 10))
    .order('occurrence_date')
    .order('start_at')
  if (error) throw error
  const { data: completed, error: completedError } = await supabase.from('timetable_occurrence')
    .select('planned_minutes')
    .eq('allocation_id', allocationId)
    .eq('status', 'Completed')
  if (completedError) throw completedError
  let usedMinutes = (completed || []).reduce((total, row) => total + Number(row.planned_minutes || 0), 0)
  const limitMinutes = Number(approvedHours) * 60
  const voided = []
  for (const row of rows || []) {
    if (usedMinutes + Number(row.planned_minutes || 0) <= limitMinutes) {
      usedMinutes += Number(row.planned_minutes || 0)
      continue
    }
    const { data: updated, error: updateError } = await supabase.from('timetable_occurrence')
      .update({ status: 'Voided', void_reason: reason, completion_actor: changedBy })
      .eq('occurrence_id', row.occurrence_id)
      .in('status', ['Scheduled', 'Pending Teacher Absence', 'Requires Review'])
      .select('occurrence_id,status,occurrence_date,planned_minutes')
      .maybeSingle()
    if (updateError) throw updateError
    if (updated) voided.push(updated)
  }
  return voided
}

export async function expireStudentAbsenceJustifications() {
  const now = new Date().toISOString()
  const { data: expired, error } = await supabase.from('attendance')
    .update({ justification_status: 'UNJUSTIFIED', expired_notified_at: now })
    .in('justification_status', ['PENDING', 'SUBMITTED'])
    .lt('justification_deadline_at', now)
    .is('expired_notified_at', null)
    .select('attendance_id,student_id,session_id,session_date')
  if (error) throw error
  const admins = await userIdsForAudience('administrators')
  for (const record of expired || []) {
    await safeNotifyStudentAndGuardians(record.student_id, {
      notification_type: 'attendance_justification_expired',
      title: 'Absence justification deadline expired',
      body: `The absence recorded on ${record.session_date} was not justified before the deadline.`,
      link_path: '/student-portal',
      event_key: `attendance:${record.attendance_id}:justification-expired`,
    })
    await safeNotifyUsers(admins, {
      notification_type: 'attendance_justification_expired_admin',
      title: 'Unjustified absence requires review',
      body: `A student absence on ${record.session_date} passed its justification deadline.`,
      link_path: '/attendance-reports',
      event_key: `attendance:${record.attendance_id}:justification-expired-admin`,
    })
  }
  return expired || []
}

export function startDailyTimetableMaintenance() {
  const run = () => expireStudentAbsenceJustifications().catch((error) => console.error('Daily timetable maintenance failed', error))
  run()
  const timer = setInterval(run, 24 * 60 * 60 * 1000)
  timer.unref?.()
  return timer
}
