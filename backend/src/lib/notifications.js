import { supabase } from '../supabaseClient.js'

function uniqueIds(values = []) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value))]
}

export async function notifyUsers(userIds, { notification_type, title, body, link_path, announcement_id, event_key } = {}) {
  const ids = uniqueIds(userIds)
  if (!ids.length) return []

  const rows = ids.map((user_id) => ({
    user_id,
    notification_type,
    title,
    body,
    link_path: link_path || null,
    announcement_id: announcement_id || null,
    event_key: event_key || null,
  }))

  let query = supabase.from('user_notification')
  if (event_key) {
    query = query.upsert(rows, { onConflict: 'user_id,event_key', ignoreDuplicates: true })
  } else {
    query = query.insert(rows)
  }
  const { data, error } = await query.select('*')
  if (error) throw error
  return data || []
}

export async function safeNotifyUsers(userIds, payload) {
  try {
    return await notifyUsers(userIds, payload)
  } catch (error) {
    console.error('Notification delivery failed', error)
    return []
  }
}

export async function userIdsForAudience(audience) {
  let query = supabase.from('user_account').select('user_id,role').is('disabled_at', null)
  const roleByAudience = { students: 'student', teachers: 'teacher', guardians: 'guardian', administrators: 'administrator' }
  if (audience !== 'all') query = query.eq('role', roleByAudience[audience] || audience)
  const { data, error } = await query
  if (error) throw error
  return (data || []).map((user) => user.user_id)
}

export async function userIdsForStudentAndGuardians(studentId) {
  const [{ data: student, error: studentError }, { data: links, error: linksError }] = await Promise.all([
    supabase.from('student').select('user_id').eq('student_id', studentId).maybeSingle(),
    supabase.from('student_guardian').select('guardian_id').eq('student_id', studentId),
  ])
  if (studentError) throw studentError
  if (linksError) throw linksError

  const guardianIds = uniqueIds((links || []).map((link) => link.guardian_id))
  let guardianUserIds = []
  if (guardianIds.length) {
    const { data: guardians, error: guardianError } = await supabase.from('guardian').select('user_id').in('guardian_id', guardianIds)
    if (guardianError) throw guardianError
    guardianUserIds = (guardians || []).map((guardian) => guardian.user_id)
  }

  return uniqueIds([student?.user_id, ...guardianUserIds])
}

export async function notifyStudentAndGuardians(studentId, payload) {
  const userIds = await userIdsForStudentAndGuardians(studentId)
  return safeNotifyUsers(userIds, payload)
}

export async function safeNotifyStudentAndGuardians(studentId, payload) {
  try {
    return await notifyStudentAndGuardians(studentId, payload)
  } catch (error) {
    console.error('Student notification fanout failed', error)
    return []
  }
}

export async function notifyStudentsAndGuardians(studentIds, payloadFactory) {
  const results = []
  for (const studentId of uniqueIds(studentIds)) {
    const payload = typeof payloadFactory === 'function' ? payloadFactory(studentId) : payloadFactory
    results.push(await safeNotifyStudentAndGuardians(studentId, payload))
  }
  return results.flat()
}
