import { supabase } from '../supabaseClient.js'
import { ApiError } from './api.js'

export async function guardianIdForUser(userId) {
  const { data, error } = await supabase.from('guardian').select('guardian_id').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'Guardian profile not found')
  return data.guardian_id
}

export async function linkedStudentIdsForGuardian(guardianId) {
  const { data, error } = await supabase.from('student_guardian').select('student_id').eq('guardian_id', guardianId)
  if (error) throw error
  return (data || []).map((row) => row.student_id)
}

export async function assertGuardianLinkedStudent(guardianId, studentId) {
  const { data, error } = await supabase.from('student_guardian').select('student_id').eq('guardian_id', guardianId).eq('student_id', studentId).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(403, 'You do not have permission to access this child')
  return studentId
}

export async function guardianUserIdsForStudent(studentId) {
  const { data: links, error: linkError } = await supabase.from('student_guardian').select('guardian_id').eq('student_id', studentId)
  if (linkError) throw linkError
  const guardianIds = (links || []).map((link) => link.guardian_id)
  if (!guardianIds.length) return []
  const { data: guardians, error: guardianError } = await supabase.from('guardian').select('user_id').in('guardian_id', guardianIds)
  if (guardianError) throw guardianError
  return (guardians || []).map((guardian) => guardian.user_id)
}
