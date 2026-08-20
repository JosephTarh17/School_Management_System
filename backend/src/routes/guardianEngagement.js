import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ApiError, asDateTime, asEnum, asText, asUuid, asyncRoute, sendData } from '../lib/api.js'
import { safeNotifyUsers, userIdsForAudience } from '../lib/notifications.js'
import { assertGuardianLinkedStudent, guardianIdForUser, guardianUserIdsForStudent, linkedStudentIdsForGuardian } from '../lib/guardianScope.js'

const router = express.Router()
router.use(requireAuth)

const communicationCategories = ['Academic', 'Attendance', 'Behavior', 'Finance', 'Appointment', 'General']
const communicationStatuses = ['Submitted', 'In Review', 'Responded', 'Closed', 'Rejected', 'Cancelled', 'Archived']
const appointmentStatuses = ['Requested', 'Proposed', 'Confirmed', 'Completed', 'Declined', 'Cancelled', 'Reschedule Requested', 'No Show']
const documentDecisions = ['Accepted', 'Declined', 'Needs Clarification']
const profileStatuses = ['Pending', 'Approved', 'Rejected', 'Withdrawn']

function booleanField(value, field) {
  if (typeof value !== 'boolean') throw new ApiError(400, `${field} must be a boolean`)
  return value
}

function decisionReason(body, field = 'decision_note') {
  return asText(body?.[field], field, { max: 1000 })
}

function safeDocumentReference(value) {
  const reference = asText(value, 'document_url', { max: 1000 })
  if (!/^(https?:\/\/|\/)/i.test(reference)) throw new ApiError(400, 'document_url must be an HTTPS/HTTP URL or an internal path')
  return reference
}

async function notifyAdministrators(payload) {
  const administrators = await userIdsForAudience('administrators')
  await safeNotifyUsers(administrators, payload)
}

async function notifyGuardians(studentId, payload) {
  const guardians = studentId ? await guardianUserIdsForStudent(studentId) : await userIdsForAudience('guardians')
  await safeNotifyUsers(guardians, payload)
}

async function guardianContext(req, studentId = null) {
  const guardianId = await guardianIdForUser(req.user.user_id)
  if (studentId) await assertGuardianLinkedStudent(guardianId, studentId)
  return guardianId
}

async function optionalLinkedStudent(req, body) {
  if (body?.student_id == null || body.student_id === '') return null
  const studentId = asUuid(body.student_id, 'student_id')
  await guardianContext(req, studentId)
  return studentId
}

const communicationSelect = 'request_id,guardian_id,student_id,category,subject,message,status,administrator_response,response_by,response_at,closed_at,created_at,updated_at,guardian(guardian_id,full_name,email),student(student_id,full_name)'
const appointmentSelect = 'appointment_id,guardian_id,student_id,purpose,preferred_start_at,preferred_end_at,proposed_start_at,proposed_end_at,status,administrator_note,decision_by,decision_at,created_at,updated_at,guardian(guardian_id,full_name,email),student(student_id,full_name)'
const documentSelect = 'document_id,title,description,document_url,student_id,version,consent_required,status,effective_from,effective_to,created_by,published_by,published_at,created_at,updated_at,student(student_id,full_name)'
const profileSelect = 'request_id,guardian_id,requested_by,proposed_full_name,proposed_email,proposed_phone,proposed_address,proposed_relationship,reason,status,decision_note,decision_by,decision_at,created_at,updated_at,guardian(guardian_id,user_id,full_name,email,phone,address,relationship)'

router.get('/communications', requireRole('guardian'), asyncRoute(async (req, res) => {
  const guardianId = await guardianContext(req)
  let query = supabase.from('guardian_communication_request').select(communicationSelect).eq('guardian_id', guardianId).order('created_at', { ascending: false })
  if (req.query.status) query = query.eq('status', asEnum(req.query.status, 'status', communicationStatuses))
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data || [])
}))

router.post('/communications', requireRole('guardian'), asyncRoute(async (req, res) => {
  const guardianId = await guardianContext(req)
  const studentId = await optionalLinkedStudent(req, req.body)
  const category = asEnum(req.body?.category, 'category', communicationCategories)
  const subject = asText(req.body?.subject, 'subject', { max: 200 })
  const message = asText(req.body?.message, 'message', { max: 4000 })
  const { data, error } = await supabase.from('guardian_communication_request').insert({ guardian_id: guardianId, student_id: studentId, category, subject, message, status: 'Submitted' }).select(communicationSelect).single()
  if (error) throw error
  await notifyAdministrators({ notification_type: 'guardian_communication_submitted', title: 'Guardian communication request submitted', body: `${subject} requires administrator review.`, link_path: '/guardian-communication-review', event_key: `guardian-communication:${data.request_id}:submitted` })
  return sendData(res, data, 201)
}))

router.patch('/communications/:requestId', requireRole('guardian'), asyncRoute(async (req, res) => {
  const requestId = asUuid(req.params.requestId, 'requestId')
  const guardianId = await guardianContext(req)
  const { data: current, error: currentError } = await supabase.from('guardian_communication_request').select('*').eq('request_id', requestId).eq('guardian_id', guardianId).maybeSingle()
  if (currentError) throw currentError
  if (!current) throw new ApiError(404, 'Communication request not found')
  const status = asEnum(req.body?.status, 'status', ['Closed', 'Cancelled'])
  if (!['Submitted', 'In Review', 'Responded'].includes(current.status)) throw new ApiError(409, 'This communication request cannot be changed')
  const { data, error } = await supabase.from('guardian_communication_request').update({ status, closed_at: status === 'Closed' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('request_id', requestId).eq('guardian_id', guardianId).select(communicationSelect).single()
  if (error) throw error
  return sendData(res, data)
}))

router.get('/admin/communications', requireRole('administrator'), asyncRoute(async (req, res) => {
  let query = supabase.from('guardian_communication_request').select(communicationSelect).order('created_at', { ascending: false })
  if (req.query.status) query = query.eq('status', asEnum(req.query.status, 'status', communicationStatuses))
  if (req.query.student_id) query = query.eq('student_id', asUuid(req.query.student_id, 'student_id'))
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data || [])
}))

router.post('/admin/communications/:requestId/respond', requireRole('administrator'), asyncRoute(async (req, res) => {
  const requestId = asUuid(req.params.requestId, 'requestId')
  const response = asText(req.body?.administrator_response, 'administrator_response', { max: 4000 })
  const status = asEnum(req.body?.status || 'Responded', 'status', ['In Review', 'Responded', 'Rejected', 'Closed'])
  const { data: current, error: currentError } = await supabase.from('guardian_communication_request').select('request_id,guardian_id,subject,status').eq('request_id', requestId).maybeSingle()
  if (currentError) throw currentError
  if (!current) throw new ApiError(404, 'Communication request not found')
  const now = new Date().toISOString()
  const { data, error } = await supabase.from('guardian_communication_request').update({ status, administrator_response: response, response_by: req.user.user_id, response_at: now, closed_at: status === 'Closed' ? now : null, updated_at: now }).eq('request_id', requestId).select(communicationSelect).single()
  if (error) throw error
  const { data: guardian } = await supabase.from('guardian').select('user_id').eq('guardian_id', current.guardian_id).maybeSingle()
  if (guardian?.user_id) await safeNotifyUsers([guardian.user_id], { notification_type: 'guardian_communication_response', title: 'Response to your communication request', body: `An administrator responded to: ${current.subject}.`, link_path: '/guardian-communication', event_key: `guardian-communication:${requestId}:response:${status}` })
  return sendData(res, data)
}))

router.get('/appointments', requireRole('guardian'), asyncRoute(async (req, res) => {
  const guardianId = await guardianContext(req)
  let query = supabase.from('guardian_appointment_request').select(appointmentSelect).eq('guardian_id', guardianId).order('preferred_start_at', { ascending: false })
  if (req.query.status) query = query.eq('status', asEnum(req.query.status, 'status', appointmentStatuses))
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data || [])
}))

router.post('/appointments', requireRole('guardian'), asyncRoute(async (req, res) => {
  const guardianId = await guardianContext(req)
  const studentId = await optionalLinkedStudent(req, req.body)
  const purpose = asText(req.body?.purpose, 'purpose', { max: 2000 })
  const preferredStartAt = asDateTime(req.body?.preferred_start_at, 'preferred_start_at')
  const preferredEndAt = asDateTime(req.body?.preferred_end_at, 'preferred_end_at')
  if (preferredEndAt <= preferredStartAt) throw new ApiError(400, 'preferred_end_at must be after preferred_start_at')
  const { data, error } = await supabase.from('guardian_appointment_request').insert({ guardian_id: guardianId, student_id: studentId, purpose, preferred_start_at: preferredStartAt, preferred_end_at: preferredEndAt, status: 'Requested' }).select(appointmentSelect).single()
  if (error) throw error
  await notifyAdministrators({ notification_type: 'guardian_appointment_requested', title: 'Guardian appointment requested', body: 'A guardian requested an appointment and selected a preferred time window.', link_path: '/guardian-appointment-review', event_key: `guardian-appointment:${data.appointment_id}:requested` })
  return sendData(res, data, 201)
}))

router.patch('/appointments/:appointmentId/cancel', requireRole('guardian'), asyncRoute(async (req, res) => {
  const appointmentId = asUuid(req.params.appointmentId, 'appointmentId')
  const guardianId = await guardianContext(req)
  const { data: current, error: currentError } = await supabase.from('guardian_appointment_request').select('appointment_id,status').eq('appointment_id', appointmentId).eq('guardian_id', guardianId).maybeSingle()
  if (currentError) throw currentError
  if (!current) throw new ApiError(404, 'Appointment request not found')
  if (!['Requested', 'Proposed', 'Reschedule Requested'].includes(current.status)) throw new ApiError(409, 'This appointment cannot be cancelled')
  const { data, error } = await supabase.from('guardian_appointment_request').update({ status: 'Cancelled', updated_at: new Date().toISOString() }).eq('appointment_id', appointmentId).eq('guardian_id', guardianId).select(appointmentSelect).single()
  if (error) throw error
  return sendData(res, data)
}))

router.get('/admin/appointments', requireRole('administrator'), asyncRoute(async (req, res) => {
  let query = supabase.from('guardian_appointment_request').select(appointmentSelect).order('preferred_start_at')
  if (req.query.status) query = query.eq('status', asEnum(req.query.status, 'status', appointmentStatuses))
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data || [])
}))

router.post('/admin/appointments/:appointmentId/decision', requireRole('administrator'), asyncRoute(async (req, res) => {
  const appointmentId = asUuid(req.params.appointmentId, 'appointmentId')
  const status = asEnum(req.body?.status, 'status', ['Proposed', 'Confirmed', 'Declined', 'Completed', 'Reschedule Requested', 'No Show', 'Cancelled'])
  const note = asText(req.body?.administrator_note, 'administrator_note', { max: 2000, optional: true })
  const { data: current, error: currentError } = await supabase.from('guardian_appointment_request').select('appointment_id,guardian_id,student_id,status').eq('appointment_id', appointmentId).maybeSingle()
  if (currentError) throw currentError
  if (!current) throw new ApiError(404, 'Appointment request not found')
  const updates = { status, administrator_note: note, decision_by: req.user.user_id, decision_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  if (['Proposed', 'Confirmed'].includes(status)) {
    updates.proposed_start_at = asDateTime(req.body?.proposed_start_at, 'proposed_start_at')
    updates.proposed_end_at = asDateTime(req.body?.proposed_end_at, 'proposed_end_at')
    if (updates.proposed_end_at <= updates.proposed_start_at) throw new ApiError(400, 'proposed_end_at must be after proposed_start_at')
  }
  const { data, error } = await supabase.from('guardian_appointment_request').update(updates).eq('appointment_id', appointmentId).select(appointmentSelect).single()
  if (error) throw error
  const { data: guardian } = await supabase.from('guardian').select('user_id').eq('guardian_id', current.guardian_id).maybeSingle()
  if (guardian?.user_id) await safeNotifyUsers([guardian.user_id], { notification_type: 'guardian_appointment_decision', title: 'Appointment request updated', body: `Your appointment request is now ${status}.`, link_path: '/guardian-appointments', event_key: `guardian-appointment:${appointmentId}:${status}` })
  return sendData(res, data)
}))

router.get('/discipline-notices', requireRole('guardian'), asyncRoute(async (req, res) => {
  const guardianId = await guardianContext(req)
  const studentIds = await linkedStudentIdsForGuardian(guardianId)
  if (!studentIds.length) return sendData(res, [])
  let query = supabase.from('behavior_incident').select('incident_id,student_id,incident_type,severity,incident_date,description,action_taken,status,points,guardian_acknowledgement_required,created_at,updated_at,student(student_id,full_name)').in('student_id', studentIds).eq('guardian_visible', true).order('incident_date', { ascending: false })
  if (req.query.student_id) query = query.eq('student_id', asUuid(req.query.student_id, 'student_id'))
  const { data: incidents, error } = await query
  if (error) throw error
  const incidentIds = (incidents || []).map((incident) => incident.incident_id)
  let acknowledgements = []
  if (incidentIds.length) {
    const { data, error: acknowledgementError } = await supabase.from('guardian_disciplinary_acknowledgement').select('acknowledgement_id,incident_id,student_id,status,response_note,acknowledged_at,updated_at').eq('guardian_id', guardianId).in('incident_id', incidentIds)
    if (acknowledgementError) throw acknowledgementError
    acknowledgements = data || []
  }
  const byIncident = new Map(acknowledgements.map((item) => [item.incident_id, item]))
  return sendData(res, (incidents || []).map((incident) => ({ ...incident, acknowledgement: byIncident.get(incident.incident_id) || { status: incident.guardian_acknowledgement_required ? 'Pending' : 'Not Required', response_note: null, acknowledged_at: null } })))
}))

router.post('/discipline-notices/:incidentId/acknowledge', requireRole('guardian'), asyncRoute(async (req, res) => {
  const incidentId = asUuid(req.params.incidentId, 'incidentId')
  const guardianId = await guardianContext(req)
  const { data: incident, error: incidentError } = await supabase.from('behavior_incident').select('incident_id,student_id,guardian_visible,guardian_acknowledgement_required').eq('incident_id', incidentId).maybeSingle()
  if (incidentError) throw incidentError
  if (!incident || !incident.guardian_visible) throw new ApiError(404, 'Disciplinary notice not found')
  await assertGuardianLinkedStudent(guardianId, incident.student_id)
  if (!incident.guardian_acknowledgement_required) throw new ApiError(409, 'This notice does not require acknowledgement')
  const responseNote = asText(req.body?.response_note, 'response_note', { max: 2000, optional: true })
  const { data: existing, error: existingError } = await supabase.from('guardian_disciplinary_acknowledgement').select('acknowledgement_id').eq('incident_id', incidentId).eq('guardian_id', guardianId).maybeSingle()
  if (existingError) throw existingError
  const payload = { incident_id: incidentId, guardian_id: guardianId, student_id: incident.student_id, status: 'Acknowledged', response_note: responseNote, acknowledged_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  const query = existing ? supabase.from('guardian_disciplinary_acknowledgement').update(payload).eq('acknowledgement_id', existing.acknowledgement_id) : supabase.from('guardian_disciplinary_acknowledgement').insert(payload)
  const { data, error } = await query.select('*').single()
  if (error) throw error
  await notifyAdministrators({ notification_type: 'guardian_discipline_acknowledged', title: 'Guardian acknowledged a disciplinary notice', body: 'A guardian acknowledged a guardian-visible disciplinary notice.', link_path: '/behavior-discipline', event_key: `discipline:${incidentId}:guardian:${guardianId}:acknowledged` })
  return sendData(res, data)
}))

router.get('/admin/discipline-acknowledgements', requireRole('administrator'), asyncRoute(async (req, res) => {
  let query = supabase.from('guardian_disciplinary_acknowledgement').select('*,guardian(guardian_id,full_name,email),student(student_id,full_name),behavior_incident(incident_id,severity,incident_date,guardian_visible)').order('updated_at', { ascending: false })
  if (req.query.status) query = query.eq('status', asEnum(req.query.status, 'status', ['Pending', 'Acknowledged']))
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data || [])
}))

router.get('/documents', requireRole('guardian'), asyncRoute(async (req, res) => {
  const guardianId = await guardianContext(req)
  const studentIds = await linkedStudentIdsForGuardian(guardianId)
  let query = supabase.from('guardian_document').select(documentSelect).eq('status', 'Published').order('published_at', { ascending: false })
  const { data: documents, error } = await query
  if (error) throw error
  const visible = (documents || []).filter((document) => !document.student_id || studentIds.includes(document.student_id))
  const ids = visible.map((document) => document.document_id)
  let responses = []
  if (ids.length) {
    const { data, error: responseError } = await supabase.from('guardian_document_response').select('response_id,document_id,guardian_id,student_id,decision,response_note,responded_at,updated_at').eq('guardian_id', guardianId).in('document_id', ids)
    if (responseError) throw responseError
    responses = data || []
  }
  const responseByDocument = new Map(responses.map((response) => [`${response.document_id}:${response.student_id || ''}`, response]))
  return sendData(res, visible.map((document) => ({ ...document, responses: responses.filter((response) => response.document_id === document.document_id), response: responseByDocument.get(`${document.document_id}:${document.student_id || ''}`) || null })))
}))

router.post('/documents/:documentId/respond', requireRole('guardian'), asyncRoute(async (req, res) => {
  const documentId = asUuid(req.params.documentId, 'documentId')
  const guardianId = await guardianContext(req)
  const decision = asEnum(req.body?.decision, 'decision', documentDecisions)
  const responseNote = asText(req.body?.response_note, 'response_note', { max: 2000, optional: true })
  const requestedStudentId = req.body?.student_id ? asUuid(req.body.student_id, 'student_id') : null
  if (requestedStudentId) await assertGuardianLinkedStudent(guardianId, requestedStudentId)
  const { data: document, error: documentError } = await supabase.from('guardian_document').select('document_id,title,student_id,status,consent_required').eq('document_id', documentId).maybeSingle()
  if (documentError) throw documentError
  if (!document || document.status !== 'Published') throw new ApiError(404, 'Document not found')
  const studentId = document.student_id || requestedStudentId
  if (document.student_id) await assertGuardianLinkedStudent(guardianId, document.student_id)
  let existingQuery = supabase.from('guardian_document_response').select('response_id').eq('document_id', documentId).eq('guardian_id', guardianId)
  existingQuery = studentId ? existingQuery.eq('student_id', studentId) : existingQuery.is('student_id', null)
  const { data: existing, error: existingError } = await existingQuery.maybeSingle()
  if (existingError) throw existingError
  const payload = { document_id: documentId, guardian_id: guardianId, student_id: studentId, decision, response_note: responseNote, responded_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  const query = existing ? supabase.from('guardian_document_response').update(payload).eq('response_id', existing.response_id) : supabase.from('guardian_document_response').insert(payload)
  const { data, error } = await query.select('*').single()
  if (error) throw error
  await notifyAdministrators({ notification_type: 'guardian_document_response', title: 'Guardian document response received', body: `A guardian responded to ${document.title}.`, link_path: '/guardian-documents', event_key: `guardian-document:${documentId}:${guardianId}:${studentId || 'all'}:${decision}` })
  return sendData(res, data)
}))

router.get('/admin/documents', requireRole('administrator'), asyncRoute(async (req, res) => {
  let query = supabase.from('guardian_document').select(documentSelect).order('created_at', { ascending: false })
  if (req.query.status) query = query.eq('status', asEnum(req.query.status, 'status', ['Draft', 'Published', 'Archived']))
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data || [])
}))

router.post('/admin/documents', requireRole('administrator'), asyncRoute(async (req, res) => {
  const title = asText(req.body?.title, 'title', { max: 200 })
  const description = asText(req.body?.description, 'description', { max: 4000, optional: true })
  const documentUrl = safeDocumentReference(req.body?.document_url)
  const studentId = req.body?.student_id ? asUuid(req.body.student_id, 'student_id') : null
  const consentRequired = req.body?.consent_required === undefined ? false : booleanField(req.body.consent_required, 'consent_required')
  const effectiveFrom = asText(req.body?.effective_from, 'effective_from', { max: 10, optional: true })
  const effectiveTo = asText(req.body?.effective_to, 'effective_to', { max: 10, optional: true })
  const { data, error } = await supabase.from('guardian_document').insert({ title, description, document_url: documentUrl, student_id: studentId, consent_required: consentRequired, effective_from: effectiveFrom, effective_to: effectiveTo, status: 'Draft', created_by: req.user.user_id }).select(documentSelect).single()
  if (error) throw error
  return sendData(res, data, 201)
}))

router.patch('/admin/documents/:documentId', requireRole('administrator'), asyncRoute(async (req, res) => {
  const documentId = asUuid(req.params.documentId, 'documentId')
  const updates = {}
  if (req.body?.title !== undefined) updates.title = asText(req.body.title, 'title', { max: 200 })
  if (req.body?.description !== undefined) updates.description = asText(req.body.description, 'description', { max: 4000, optional: true })
  if (req.body?.document_url !== undefined) updates.document_url = safeDocumentReference(req.body.document_url)
  if (req.body?.consent_required !== undefined) updates.consent_required = booleanField(req.body.consent_required, 'consent_required')
  if (req.body?.status !== undefined) updates.status = asEnum(req.body.status, 'status', ['Draft', 'Published', 'Archived'])
  if (!Object.keys(updates).length) throw new ApiError(400, 'At least one editable field is required')
  if (updates.status === 'Published') { updates.published_by = req.user.user_id; updates.published_at = new Date().toISOString() }
  if (updates.status && updates.status !== 'Published') { updates.published_by = null; updates.published_at = null }
  updates.updated_at = new Date().toISOString()
  const { data, error } = await supabase.from('guardian_document').update(updates).eq('document_id', documentId).select(documentSelect).single()
  if (error) throw error
  if (updates.status === 'Published') await notifyGuardians(data.student_id, { notification_type: 'guardian_document_published', title: 'Guardian document published', body: `${data.title} is now available to guardians.`, link_path: '/guardian-documents', event_key: `guardian-document:${documentId}:published:${data.version}` })
  return sendData(res, data)
}))

router.get('/admin/documents/:documentId/responses', requireRole('administrator'), asyncRoute(async (req, res) => {
  const documentId = asUuid(req.params.documentId, 'documentId')
  const { data, error } = await supabase.from('guardian_document_response').select('*,guardian(guardian_id,full_name,email),student(student_id,full_name)').eq('document_id', documentId).order('responded_at', { ascending: false })
  if (error) throw error
  return sendData(res, data || [])
}))

router.get('/profile', requireRole('guardian'), asyncRoute(async (req, res) => {
  const guardianId = await guardianContext(req)
  const { data, error } = await supabase.from('guardian').select('guardian_id,user_id,full_name,email,phone,address,relationship').eq('guardian_id', guardianId).single()
  if (error) throw error
  return sendData(res, data)
}))

router.get('/profile/change-requests', requireRole('guardian'), asyncRoute(async (req, res) => {
  const guardianId = await guardianContext(req)
  const { data, error } = await supabase.from('guardian_profile_change_request').select(profileSelect).eq('guardian_id', guardianId).order('created_at', { ascending: false })
  if (error) throw error
  return sendData(res, data || [])
}))

router.post('/profile/change-requests', requireRole('guardian'), asyncRoute(async (req, res) => {
  const guardianId = await guardianContext(req)
  const updates = {}
  if (req.body?.proposed_full_name !== undefined) updates.proposed_full_name = asText(req.body.proposed_full_name, 'proposed_full_name', { max: 160 })
  if (req.body?.proposed_email !== undefined) updates.proposed_email = asText(req.body.proposed_email, 'proposed_email', { max: 320 }).toLowerCase()
  if (req.body?.proposed_phone !== undefined) updates.proposed_phone = asText(req.body.proposed_phone, 'proposed_phone', { max: 40, optional: true })
  if (req.body?.proposed_address !== undefined) updates.proposed_address = asText(req.body.proposed_address, 'proposed_address', { max: 300, optional: true })
  if (req.body?.proposed_relationship !== undefined) updates.proposed_relationship = asText(req.body.proposed_relationship, 'proposed_relationship', { max: 80, optional: true })
  if (!Object.keys(updates).length) throw new ApiError(400, 'At least one profile change is required')
  updates.reason = asText(req.body?.reason, 'reason', { max: 1000 })
  const { data: pending, error: pendingError } = await supabase.from('guardian_profile_change_request').select('request_id').eq('guardian_id', guardianId).eq('status', 'Pending').limit(1)
  if (pendingError) throw pendingError
  if (pending?.length) throw new ApiError(409, 'A profile change request is already pending review')
  const { data, error } = await supabase.from('guardian_profile_change_request').insert({ guardian_id: guardianId, requested_by: req.user.user_id, ...updates, status: 'Pending' }).select(profileSelect).single()
  if (error) throw error
  await notifyAdministrators({ notification_type: 'guardian_profile_change_submitted', title: 'Guardian profile change submitted', body: 'A guardian profile change is awaiting administrator review.', link_path: '/guardian-profile-review', event_key: `guardian-profile:${data.request_id}:submitted` })
  return sendData(res, data, 201)
}))

router.patch('/profile/change-requests/:requestId/withdraw', requireRole('guardian'), asyncRoute(async (req, res) => {
  const requestId = asUuid(req.params.requestId, 'requestId')
  const guardianId = await guardianContext(req)
  const { data, error } = await supabase.from('guardian_profile_change_request').update({ status: 'Withdrawn', updated_at: new Date().toISOString() }).eq('request_id', requestId).eq('guardian_id', guardianId).eq('status', 'Pending').select(profileSelect).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'Pending profile change request not found')
  return sendData(res, data)
}))

router.get('/admin/profile-change-requests', requireRole('administrator'), asyncRoute(async (req, res) => {
  let query = supabase.from('guardian_profile_change_request').select(profileSelect).order('created_at', { ascending: false })
  if (req.query.status) query = query.eq('status', asEnum(req.query.status, 'status', profileStatuses))
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data || [])
}))

router.post('/admin/profile-change-requests/:requestId/decision', requireRole('administrator'), asyncRoute(async (req, res) => {
  const requestId = asUuid(req.params.requestId, 'requestId')
  const status = asEnum(req.body?.status, 'status', ['Approved', 'Rejected'])
  const decisionNote = decisionReason(req.body)
  const { data: current, error: currentError } = await supabase.from('guardian_profile_change_request').select('*').eq('request_id', requestId).eq('status', 'Pending').maybeSingle()
  if (currentError) throw currentError
  if (!current) throw new ApiError(404, 'Pending profile change request not found')
  const { data: guardian, error: guardianError } = await supabase.from('guardian').select('guardian_id,user_id').eq('guardian_id', current.guardian_id).single()
  if (guardianError) throw guardianError
  if (status === 'Approved') {
    if (current.proposed_email) {
      if (!/^\S+@\S+\.\S+$/.test(current.proposed_email)) throw new ApiError(400, 'The proposed email is invalid')
      const { data: duplicate, error: duplicateError } = await supabase.from('user_account').select('user_id').eq('email', current.proposed_email).neq('user_id', guardian.user_id).maybeSingle()
      if (duplicateError) throw duplicateError
      if (duplicate) throw new ApiError(409, 'The proposed email is already used by another account')
    }
    const guardianUpdates = {}
    if (current.proposed_full_name) guardianUpdates.full_name = current.proposed_full_name
    if (current.proposed_email) guardianUpdates.email = current.proposed_email
    if (current.proposed_phone !== null) guardianUpdates.phone = current.proposed_phone
    if (current.proposed_address !== null) guardianUpdates.address = current.proposed_address
    if (current.proposed_relationship !== null) guardianUpdates.relationship = current.proposed_relationship
    const { error: guardianUpdateError } = await supabase.from('guardian').update(guardianUpdates).eq('guardian_id', guardian.guardian_id)
    if (guardianUpdateError) throw guardianUpdateError
    if (current.proposed_email) {
      const { error: accountUpdateError } = await supabase.from('user_account').update({ email: current.proposed_email }).eq('user_id', guardian.user_id)
      if (accountUpdateError) throw accountUpdateError
    }
  }
  const { data, error } = await supabase.from('guardian_profile_change_request').update({ status, decision_note: decisionNote, decision_by: req.user.user_id, decision_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('request_id', requestId).select(profileSelect).single()
  if (error) throw error
  const { data: guardianUser } = await supabase.from('guardian').select('user_id').eq('guardian_id', current.guardian_id).maybeSingle()
  if (guardianUser?.user_id) await safeNotifyUsers([guardianUser.user_id], { notification_type: 'guardian_profile_change_decision', title: 'Guardian profile change decision', body: `Your profile change request was ${status.toLowerCase()}.`, link_path: '/profile', event_key: `guardian-profile:${requestId}:${status}` })
  return sendData(res, data)
}))

export default router
