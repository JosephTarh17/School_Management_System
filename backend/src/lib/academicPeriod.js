import { supabase } from '../supabaseClient.js'
import { ApiError, asAcademicYear, asSemester } from './api.js'

export async function currentAcademicPeriod() {
  const { data, error } = await supabase.from('academic_period_settings')
    .select('setting_id,academic_year,semester,updated_by,updated_at')
    .eq('setting_id', 1)
    .single()
  if (error) throw error
  if (!data) throw new ApiError(500, 'The current academic period is not configured')
  return data
}

export async function resolveAcademicPeriod({ academic_year, year, semester } = {}) {
  const hasYear = academic_year !== undefined && academic_year !== null && academic_year !== '' || year !== undefined && year !== null && year !== ''
  const hasSemester = semester !== undefined && semester !== null && semester !== ''
  if (!hasYear && !hasSemester) return currentAcademicPeriod()
  if (!hasYear || !hasSemester) throw new ApiError(400, 'academic_year and semester must be provided together')
  return {
    academic_year: asAcademicYear(academic_year ?? year, 'academic_year'),
    semester: asSemester(semester, 'semester'),
  }
}
