import { supabase } from '../supabaseClient.js'
import { studentCourseIdsForUser } from './enrollmentScope.js'

export async function permittedCourseIdsForUser(user, { studentId = null } = {}) {
  if (user.role === 'student') return studentCourseIdsForUser(user.user_id)
  if (user.role !== 'guardian') return []
  const { data: guardian, error: guardianError } = await supabase.from('guardian').select('guardian_id').eq('user_id', user.user_id).maybeSingle()
  if (guardianError) throw guardianError
  if (!guardian) return []
  let linkQuery = supabase.from('student_guardian').select('student_id').eq('guardian_id', guardian.guardian_id)
  if (studentId) linkQuery = linkQuery.eq('student_id', studentId)
  const { data: links, error: linkError } = await linkQuery
  if (linkError) throw linkError
  const studentIds = (links || []).map((row) => row.student_id)
  if (!studentIds.length) return []
  const { data: enrollments, error: enrollmentError } = await supabase.from('enrollment').select('course_id').in('student_id', studentIds).eq('status', 'active')
  if (enrollmentError) throw enrollmentError
  return [...new Set((enrollments || []).map((row) => row.course_id))]
}
