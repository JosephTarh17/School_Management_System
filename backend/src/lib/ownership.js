import { ApiError } from './api.js'
import { activeAssignmentsForTeacher, assertTeacherAssignedToCoursePeriod, teacherIdForUser } from './teacherAssignments.js'

export { teacherIdForUser }

export async function sessionForAccess(sessionId, req) {
  const { data, error } = await supabase.from('class_session')
    .select('session_id,teacher_id,course_id,assignment_id,academic_year,semester')
    .eq('session_id', sessionId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'Class session not found')
  if (req.user.role === 'administrator') return data
  const teacherId = await teacherIdForUser(req.user.user_id)
  if (!teacherId || data.teacher_id !== teacherId) throw new ApiError(403, 'You do not have permission to access this class session')
  return data
}

export async function assertTeacherOwnsCourse(courseId, req, period = {}) {
  if (req.user.role === 'administrator') return
  const { teacherId, assignments } = await activeAssignmentsForTeacher(req.user.user_id, period)
  if (!teacherId) throw new ApiError(403, 'Teacher profile not found')
  if (assignments.some((assignment) => assignment.course_id === courseId)) return assignments.find((assignment) => assignment.course_id === courseId)

  let query = supabase.from('class_session').select('session_id,course_id,academic_year,semester').eq('course_id', courseId).eq('teacher_id', teacherId).limit(1)
  if (period.academic_year !== undefined) query = query.eq('academic_year', period.academic_year)
  if (period.semester) query = query.eq('semester', period.semester)
  const { data, error } = await query
  if (error) throw error
  if (!data?.length) throw new ApiError(403, 'You do not have permission to access this course for this academic period')
  return data[0]
}

export { assertTeacherAssignedToCoursePeriod }

export async function assertTeacherOwnsAttendance(attendanceId, req) {
  if (req.user.role === 'administrator') return
  const { data, error } = await supabase.from('attendance').select('attendance_id,session_id').eq('attendance_id', attendanceId).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'Attendance record not found')
  await sessionForAccess(data.session_id, req)
}

export async function assertTeacherOwnsParticipation(participationId, req) {
  if (req.user.role === 'administrator') return
  const { data, error } = await supabase.from('participation_log').select('participation_id,session_id').eq('participation_id', participationId).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'Participation log not found')
  await sessionForAccess(data.session_id, req)
}
