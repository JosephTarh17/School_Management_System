import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ApiError, asDate, asEnum, asText, asUuid, asyncRoute, sendData } from '../lib/api.js'
import { enrolledStudentIdsForTeacher, studentIdForUser } from '../lib/enrollmentScope.js'

const router = express.Router()
router.use(requireAuth)

const incidentTypes = ['Academic', 'Attendance', 'Conduct', 'Safety', 'Other']
const severities = ['Low', 'Medium', 'High', 'Critical']
const severityPoints = Object.freeze({ Low: 0.25, Medium: 0.5, High: 0.75, Critical: 1 })
const statuses = ['Open', 'Under review', 'Resolved', 'Dismissed']

function pointsForSeverity(severity) {
  return severityPoints[severity]
}
const select = '*, student(student_id,full_name,class_level)'

async function guardianStudentIds(userId) {
  const { data: guardian, error: guardianError } = await supabase.from('guardian').select('guardian_id').eq('user_id', userId).maybeSingle()
  if (guardianError) throw guardianError
  if (!guardian) return []
  const { data, error } = await supabase.from('student_guardian').select('student_id').eq('guardian_id', guardian.guardian_id)
  if (error) throw error
  return (data || []).map((row) => row.student_id)
}

async function canReadIncident(incident, req) {
  if (req.user.role === 'administrator') return true
  if (req.user.role === 'student') return incident.student_id === await studentIdForUser(req.user.user_id)
  if (req.user.role === 'guardian') return (await guardianStudentIds(req.user.user_id)).includes(incident.student_id)
  if (req.user.role === 'teacher') return (await enrolledStudentIdsForTeacher(req.user.user_id)).includes(incident.student_id)
  return false
}

async function assertStudentScope(studentId, req) {
  if (req.user.role === 'administrator') return
  if (req.user.role === 'teacher') {
    if (!(await enrolledStudentIdsForTeacher(req.user.user_id)).includes(studentId)) throw new ApiError(403, 'You do not have permission to access this student')
    return
  }
  throw new ApiError(403, 'Only administrators and teachers can manage behavior incidents')
}

function incidentPayload(body, { partial = false } = {}) {
  if (body.points !== undefined) throw new ApiError(400, 'points are calculated automatically from severity')
  const payload = {}
  if (!partial || body.student_id !== undefined) payload.student_id = asUuid(body.student_id, 'student_id')
  if (!partial || body.incident_type !== undefined) payload.incident_type = asEnum(body.incident_type, 'incident_type', incidentTypes)
  if (!partial || body.severity !== undefined) {
    payload.severity = asEnum(body.severity, 'severity', severities)
    payload.points = pointsForSeverity(payload.severity)
  }
  if (!partial || body.incident_date !== undefined) payload.incident_date = asDate(body.incident_date, 'incident_date')
  if (!partial || body.description !== undefined) payload.description = asText(body.description, 'description', { max: 1000 })
  if (body.action_taken !== undefined) payload.action_taken = body.action_taken == null || body.action_taken === '' ? null : asText(body.action_taken, 'action_taken', { max: 1000 })
  if (body.resolution_notes !== undefined) payload.resolution_notes = body.resolution_notes == null || body.resolution_notes === '' ? null : asText(body.resolution_notes, 'resolution_notes', { max: 1000 })
  if (body.status !== undefined) payload.status = asEnum(body.status, 'status', statuses)
  return payload
}

function validateResolution(payload, current = {}) {
  const status = payload.status ?? current.status
  if (['Resolved', 'Dismissed'].includes(status) && !(payload.resolution_notes ?? current.resolution_notes ?? payload.action_taken ?? current.action_taken)) {
    throw new ApiError(400, 'resolution_notes or action_taken is required when an incident is resolved or dismissed')
  }
}

router.get('/', asyncRoute(async (req, res) => {
  let query = supabase.from('behavior_incident').select(select).order('incident_date', { ascending: false }).order('created_at', { ascending: false })
  if (req.user.role === 'student') {
    const studentId = await studentIdForUser(req.user.user_id)
    query = studentId ? query.eq('student_id', studentId) : query.eq('student_id', '00000000-0000-0000-0000-000000000000')
  } else if (req.user.role === 'guardian') {
    const ids = await guardianStudentIds(req.user.user_id)
    query = ids.length ? query.in('student_id', ids) : query.eq('student_id', '00000000-0000-0000-0000-000000000000')
  } else if (req.user.role === 'teacher') {
    const ids = await enrolledStudentIdsForTeacher(req.user.user_id)
    query = ids.length ? query.in('student_id', ids) : query.eq('student_id', '00000000-0000-0000-0000-000000000000')
  }
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data || [])
}))

router.post('/', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const payload = incidentPayload(req.body || {})
  await assertStudentScope(payload.student_id, req)
  validateResolution(payload)
  const { data, error } = await supabase.from('behavior_incident').insert({ ...payload, reported_by: req.user.user_id }).select(select).single()
  if (error) throw error
  return sendData(res, data, 201)
}))

router.get('/:incidentId', asyncRoute(async (req, res) => {
  const incidentId = asUuid(req.params.incidentId, 'incidentId')
  const { data, error } = await supabase.from('behavior_incident').select(select).eq('incident_id', incidentId).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'Behavior incident not found')
  if (!(await canReadIncident(data, req))) throw new ApiError(403, 'You do not have permission to view this behavior incident')
  return sendData(res, data)
}))

router.patch('/:incidentId', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const incidentId = asUuid(req.params.incidentId, 'incidentId')
  const { data: current, error: currentError } = await supabase.from('behavior_incident').select('*').eq('incident_id', incidentId).maybeSingle()
  if (currentError) throw currentError
  if (!current) throw new ApiError(404, 'Behavior incident not found')
  await assertStudentScope(current.student_id, req)
  if (req.user.role === 'teacher' && current.reported_by !== req.user.user_id) throw new ApiError(403, 'Teachers can update only incidents they reported')
  const updates = incidentPayload(req.body || {}, { partial: true })
  if (updates.student_id !== undefined) await assertStudentScope(updates.student_id, req)
  validateResolution(updates, current)
  if (!Object.keys(updates).length) throw new ApiError(400, 'At least one editable field is required')
  const { data, error } = await supabase.from('behavior_incident').update(updates).eq('incident_id', incidentId).select(select).single()
  if (error) throw error
  return sendData(res, data)
}))

router.delete('/:incidentId', requireRole('teacher', 'administrator'), asyncRoute(async (req, res) => {
  const incidentId = asUuid(req.params.incidentId, 'incidentId')
  const { data: current, error: currentError } = await supabase.from('behavior_incident').select('incident_id,student_id,reported_by,status').eq('incident_id', incidentId).maybeSingle()
  if (currentError) throw currentError
  if (!current) throw new ApiError(404, 'Behavior incident not found')
  await assertStudentScope(current.student_id, req)
  if (req.user.role === 'teacher' && (current.reported_by !== req.user.user_id || !['Open', 'Under review'].includes(current.status))) throw new ApiError(403, 'Teachers can delete only their open or under-review incidents')
  const { error } = await supabase.from('behavior_incident').delete().eq('incident_id', incidentId)
  if (error) throw error
  return res.status(204).send()
}))

export default router
