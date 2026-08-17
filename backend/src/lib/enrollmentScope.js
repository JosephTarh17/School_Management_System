import { supabase } from '../supabaseClient.js'
import { activeAssignmentsForTeacher } from './teacherAssignments.js'

export async function studentIdForUser(userId) {
  const { data, error } = await supabase.from('student').select('student_id').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data?.student_id || null
}

export async function studentCourseIdsForUser(userId, { academic_year, semester } = {}) {
  const studentId = await studentIdForUser(userId)
  if (!studentId) return []
  let query = supabase.from('enrollment').select('course_id').eq('student_id', studentId).eq('status', 'active')
  if (academic_year !== undefined) query = query.eq('academic_year', academic_year)
  if (semester) query = query.eq('semester', semester)
  const { data, error } = await query
  if (error) throw error
  return [...new Set((data || []).map((row) => row.course_id))]
}

export async function teacherSessionIdsForUser(userId) {
  const { teacherId } = await activeAssignmentsForTeacher(userId)
  if (!teacherId) return []
  const { data, error } = await supabase.from('class_session').select('session_id').eq('teacher_id', teacherId)
  if (error) throw error
  return (data || []).map((session) => session.session_id)
}

export async function studentSessionIdsForUser(userId, period = {}) {
  const courseIds = await studentCourseIdsForUser(userId, period)
  if (!courseIds.length) return []
  let query = supabase.from('class_session').select('session_id').in('course_id', courseIds)
  if (period.academic_year !== undefined) query = query.eq('academic_year', period.academic_year)
  if (period.semester) query = query.eq('semester', period.semester)
  const { data, error } = await query
  if (error) throw error
  return (data || []).map((session) => session.session_id)
}

export async function teacherCourseIdsForUser(userId, period = {}) {
  const { teacherId, assignments } = await activeAssignmentsForTeacher(userId, period)
  if (!teacherId) return []
  if (assignments.length) return [...new Set(assignments.map((assignment) => assignment.course_id))]

  // Transitional compatibility for class sessions that predate migration 021.
  let query = supabase.from('class_session').select('course_id').eq('teacher_id', teacherId)
  if (period.academic_year !== undefined) query = query.eq('academic_year', period.academic_year)
  if (period.semester) query = query.eq('semester', period.semester)
  const { data, error } = await query
  if (error) throw error
  return [...new Set((data || []).map((session) => session.course_id))]
}

export async function enrolledStudentIdsForTeacher(userId, period = {}) {
  const courseIds = await teacherCourseIdsForUser(userId, period)
  if (!courseIds.length) return []
  let query = supabase.from('enrollment').select('student_id').in('course_id', courseIds).eq('status', 'active')
  if (period.academic_year !== undefined) query = query.eq('academic_year', period.academic_year)
  if (period.semester) query = query.eq('semester', period.semester)
  const { data, error } = await query
  if (error) throw error
  return [...new Set((data || []).map((row) => row.student_id))]
}
