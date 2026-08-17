import { supabase } from '../supabaseClient.js'
import { ApiError } from './api.js'

export async function teacherIdForUser(userId) {
  const { data, error } = await supabase.from('teacher').select('teacher_id').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data?.teacher_id || null
}

export async function activeAssignmentForCoursePeriod(courseId, academic_year, semester) {
  const { data, error } = await supabase.from('teacher_course_assignment')
    .select('assignment_id,teacher_id,course_id,academic_year,semester,status,assigned_at,assigned_by,teacher(teacher_id,full_name,email)')
    .eq('course_id', courseId)
    .eq('academic_year', academic_year)
    .eq('semester', semester)
    .eq('status', 'active')
    .maybeSingle()
  if (error) throw error
  return data || null
}

export async function activeAssignmentsForTeacher(userId, { academic_year, semester } = {}) {
  const teacherId = await teacherIdForUser(userId)
  if (!teacherId) return { teacherId: null, assignments: [] }
  let query = supabase.from('teacher_course_assignment')
    .select('assignment_id,teacher_id,course_id,academic_year,semester,status,assigned_at,assigned_by,course(course_id,course_name,course_code,credit_units),teacher(teacher_id,full_name,email)')
    .eq('teacher_id', teacherId)
    .eq('status', 'active')
  if (academic_year !== undefined) query = query.eq('academic_year', academic_year)
  if (semester) query = query.eq('semester', semester)
  const { data, error } = await query.order('academic_year').order('semester').order('course_id')
  if (error) throw error
  return { teacherId, assignments: data || [] }
}

export async function ensureTeacherCourseAssignment({ userId, teacherId, courseId, academic_year, semester, assignedBy }) {
  const existing = await activeAssignmentForCoursePeriod(courseId, academic_year, semester)
  if (existing) {
    if (existing.teacher_id !== teacherId) {
      throw new ApiError(409, 'This course is already assigned to another teacher for this academic year and semester')
    }
    return existing
  }

  const { data, error } = await supabase.from('teacher_course_assignment')
    .insert({ teacher_id: teacherId, course_id: courseId, academic_year, semester, assigned_by: assignedBy || userId || null, status: 'active' })
    .select('assignment_id,teacher_id,course_id,academic_year,semester,status,assigned_at,assigned_by,teacher(teacher_id,full_name,email),course(course_id,course_name,course_code,credit_units)')
    .single()
  if (error?.code === '23505') {
    const concurrent = await activeAssignmentForCoursePeriod(courseId, academic_year, semester)
    if (concurrent && concurrent.teacher_id !== teacherId) {
      throw new ApiError(409, 'This course is already assigned to another teacher for this academic year and semester')
    }
    if (concurrent) return concurrent
  }
  if (error) throw error
  return data
}

export async function assertTeacherAssignedToCoursePeriod(userId, courseId, academic_year, semester) {
  const { teacherId, assignments } = await activeAssignmentsForTeacher(userId, { academic_year, semester })
  if (!teacherId) throw new ApiError(403, 'Teacher profile not found')
  const assignment = assignments.find((item) => item.course_id === courseId)
  if (assignment) return assignment

  // Transitional compatibility for sessions created before migration 021.
  const { data: legacySession, error } = await supabase.from('class_session')
    .select('session_id,teacher_id,course_id,academic_year,semester')
    .eq('teacher_id', teacherId)
    .eq('course_id', courseId)
    .eq('academic_year', academic_year)
    .eq('semester', semester)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (legacySession) return legacySession
  throw new ApiError(403, 'You do not have permission to access this course for this academic period')
}

export async function availableCoursesForPeriod(academic_year, semester) {
  const [{ data: courses, error: courseError }, { data: assignments, error: assignmentError }] = await Promise.all([
    supabase.from('course').select('course_id,course_name,course_code,credit_units').order('course_code'),
    supabase.from('teacher_course_assignment').select('course_id').eq('academic_year', academic_year).eq('semester', semester).eq('status', 'active'),
  ])
  if (courseError) throw courseError
  if (assignmentError) throw assignmentError
  const assignedCourseIds = new Set((assignments || []).map((row) => row.course_id))
  return (courses || []).filter((course) => !assignedCourseIds.has(course.course_id))
}
