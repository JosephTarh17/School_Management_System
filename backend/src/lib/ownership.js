import { supabase } from '../supabaseClient.js'
import { ApiError } from './api.js'

export async function teacherIdForUser(userId) {
  const { data, error } = await supabase.from('teacher').select('teacher_id').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data?.teacher_id || null
}

export async function sessionForAccess(sessionId, req) {
  const { data, error } = await supabase.from('class_session').select('session_id,teacher_id,course_id').eq('session_id', sessionId).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'Class session not found')
  if (req.user.role === 'administrator') return data
  const teacherId = await teacherIdForUser(req.user.user_id)
  if (!teacherId || data.teacher_id !== teacherId) throw new ApiError(403, 'You do not have permission to access this class session')
  return data
}

export async function assertTeacherOwnsCourse(courseId, req) {
  if (req.user.role === 'administrator') return
  const teacherId = await teacherIdForUser(req.user.user_id)
  if (!teacherId) throw new ApiError(403, 'Teacher profile not found')
  const { data, error } = await supabase.from('class_session').select('session_id').eq('course_id', courseId).eq('teacher_id', teacherId).limit(1)
  if (error) throw error
  if (!data?.length) throw new ApiError(403, 'You do not have permission to access this course')
}

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
