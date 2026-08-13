import { supabase } from '../supabaseClient.js'

export async function studentIdForUser(userId) {
  const { data, error } = await supabase.from('student').select('student_id').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data?.student_id || null
}

export async function studentCourseIdsForUser(userId) {
  const studentId = await studentIdForUser(userId)
  if (!studentId) return []
  const { data, error } = await supabase.from('enrollment').select('course_id').eq('student_id', studentId).eq('status', 'active')
  if (error) throw error
  return [...new Set((data || []).map((row) => row.course_id))]
}

export async function teacherSessionIdsForUser(userId) {
  const { data: teacher, error: teacherError } = await supabase.from('teacher').select('teacher_id').eq('user_id', userId).maybeSingle()
  if (teacherError) throw teacherError
  if (!teacher) return []
  const { data: sessions, error: sessionError } = await supabase.from('class_session').select('session_id').eq('teacher_id', teacher.teacher_id)
  if (sessionError) throw sessionError
  return (sessions || []).map((session) => session.session_id)
}

export async function studentSessionIdsForUser(userId) {
  const courseIds = await studentCourseIdsForUser(userId)
  if (!courseIds.length) return []
  const { data, error } = await supabase.from('class_session').select('session_id').in('course_id', courseIds)
  if (error) throw error
  return (data || []).map((session) => session.session_id)
}

export async function teacherCourseIdsForUser(userId) {
  const { data: teacher, error: teacherError } = await supabase.from('teacher').select('teacher_id').eq('user_id', userId).maybeSingle()
  if (teacherError) throw teacherError
  if (!teacher) return []
  const { data: sessions, error: sessionError } = await supabase.from('class_session').select('course_id').eq('teacher_id', teacher.teacher_id)
  if (sessionError) throw sessionError
  return [...new Set((sessions || []).map((session) => session.course_id))]
}

export async function enrolledStudentIdsForTeacher(userId) {
  const courseIds = await teacherCourseIdsForUser(userId)
  if (!courseIds.length) return []
  const { data, error } = await supabase.from('enrollment').select('student_id').in('course_id', courseIds).eq('status', 'active')
  if (error) throw error
  return [...new Set((data || []).map((row) => row.student_id))]
}
