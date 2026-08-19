import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ApiError, asAcademicYear, asDateTime, asEnum, asSemester, asText, asUuid, asyncRoute, sendData } from '../lib/api.js'
import { safeNotifyUsers, userIdsForAudience } from '../lib/notifications.js'

const router = express.Router()
router.use(requireAuth)
const categories = ['Meeting', 'Deadline', 'Examination', 'Holiday', 'Orientation', 'Registration', 'General']
const statuses = ['Draft', 'Published', 'Cancelled', 'Archived']
const audiences = ['Everyone', 'Teachers', 'Students', 'Guardians', 'Course', 'Class Group']
const select = '*'

async function visibleForUser(req) {
  if (req.user.role === 'administrator') return null
  const roleAudience = {
    teacher: ['Everyone', 'Teachers'],
    student: ['Everyone', 'Students'],
    guardian: ['Everyone', 'Guardians'],
  }[req.user.role] || ['Everyone']
  return roleAudience
}

async function audienceUserIds(audience) {
  if (audience === 'Everyone') return userIdsForAudience('all')
  if (audience === 'Teachers') return userIdsForAudience('teachers')
  if (audience === 'Students') return userIdsForAudience('students')
  if (audience === 'Guardians') return userIdsForAudience('guardians')
  return []
}

async function publishEvent(event, actorId) {
  if (!event.notify_on_publish) return []
  const ids = await audienceUserIds(event.audience)
  return safeNotifyUsers(ids, {
    notification_type: 'school_event_published',
    title: event.title,
    body: `${event.category} scheduled for ${new Date(event.start_at).toLocaleString()}.`,
    link_path: '/calendar',
    event_key: `school-event:${event.event_id}:published:${event.updated_at}`,
  })
}

router.get('/', asyncRoute(async (req, res) => {
  let query = supabase.from('school_event').select(select).order('start_at')
  const roleAudiences = await visibleForUser(req)
  if (roleAudiences) query = query.in('audience', roleAudiences).eq('status', 'Published')
  if (req.query.status && req.user.role === 'administrator') query = query.eq('status', asEnum(req.query.status, 'status', statuses))
  if (req.query.category) query = query.eq('category', asEnum(req.query.category, 'category', categories))
  if (req.query.from) query = query.gte('start_at', asDateTime(req.query.from, 'from'))
  if (req.query.to) query = query.lte('start_at', asDateTime(req.query.to, 'to'))
  if (req.query.academic_year || req.query.year) query = query.eq('academic_year', asAcademicYear(req.query.academic_year ?? req.query.year))
  if (req.query.semester) query = query.eq('semester', asSemester(req.query.semester))
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data || [])
}))

router.get('/:eventId', asyncRoute(async (req, res) => {
  const eventId = asUuid(req.params.eventId, 'eventId')
  const { data, error } = await supabase.from('school_event').select('*').eq('event_id', eventId).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'School Event not found')
  if (req.user.role !== 'administrator' && (data.status !== 'Published' || !['Everyone', req.user.role === 'teacher' ? 'Teachers' : req.user.role === 'student' ? 'Students' : 'Guardians'].includes(data.audience))) throw new ApiError(403, 'You do not have permission to view this event')
  return sendData(res, data)
}))

router.post('/', requireRole('administrator'), asyncRoute(async (req, res) => {
  const title = asText(req.body?.title, 'title', { max: 200 })
  const description = asText(req.body?.description, 'description', { max: 5000 })
  const category = asEnum(req.body?.category, 'category', categories)
  const start_at = asDateTime(req.body?.start_at, 'start_at')
  const end_at = asDateTime(req.body?.end_at, 'end_at')
  if (new Date(start_at) >= new Date(end_at)) throw new ApiError(400, 'end_at must be after start_at')
  const audience = asEnum(req.body?.audience, 'audience', audiences)
  const audience_id = audience === 'Course' || audience === 'Class Group' ? asUuid(req.body?.audience_id, 'audience_id') : undefined
  const academic_year = req.body?.academic_year ? asAcademicYear(req.body.academic_year) : undefined
  const semester = req.body?.semester ? asSemester(req.body.semester) : undefined
  if ((academic_year && !semester) || (!academic_year && semester)) throw new ApiError(400, 'academic_year and semester must be provided together')
  const location = asText(req.body?.location, 'location', { max: 255, optional: true })
  const online_url = asText(req.body?.online_url, 'online_url', { max: 500, optional: true })
  const { data, error } = await supabase.from('school_event').insert({ title, description, category, start_at, end_at, location, online_url, academic_year, semester, audience, audience_id, notify_on_publish: req.body?.notify_on_publish !== false, notify_on_change: req.body?.notify_on_change !== false, created_by: req.user.user_id, updated_by: req.user.user_id }).select('*').single()
  if (error) throw error
  return sendData(res, data, 201)
}))

router.patch('/:eventId', requireRole('administrator'), asyncRoute(async (req, res) => {
  const eventId = asUuid(req.params.eventId, 'eventId')
  const { data: current, error: currentError } = await supabase.from('school_event').select('*').eq('event_id', eventId).maybeSingle()
  if (currentError) throw currentError
  if (!current) throw new ApiError(404, 'School Event not found')
  const updates = {}
  for (const field of ['title', 'description', 'location', 'online_url']) if (req.body?.[field] !== undefined) updates[field] = asText(req.body[field], field, { max: field === 'description' ? 5000 : field === 'title' ? 200 : 500, optional: true })
  if (req.body?.category !== undefined) updates.category = asEnum(req.body.category, 'category', categories)
  if (req.body?.audience !== undefined) updates.audience = asEnum(req.body.audience, 'audience', audiences)
  if (req.body?.audience_id !== undefined) updates.audience_id = asUuid(req.body.audience_id, 'audience_id', { optional: true })
  if (req.body?.start_at !== undefined) updates.start_at = asDateTime(req.body.start_at, 'start_at')
  if (req.body?.end_at !== undefined) updates.end_at = asDateTime(req.body.end_at, 'end_at')
  if (req.body?.academic_year !== undefined) updates.academic_year = asAcademicYear(req.body.academic_year, 'academic_year', { optional: true })
  if (req.body?.semester !== undefined) updates.semester = asSemester(req.body.semester, 'semester', { optional: true })
  if (req.body?.notify_on_publish !== undefined) updates.notify_on_publish = Boolean(req.body.notify_on_publish)
  if (req.body?.notify_on_change !== undefined) updates.notify_on_change = Boolean(req.body.notify_on_change)
  if (updates.start_at && updates.end_at && new Date(updates.start_at) >= new Date(updates.end_at)) throw new ApiError(400, 'end_at must be after start_at')
  if (updates.start_at && !updates.end_at && new Date(updates.start_at) >= new Date(current.end_at)) throw new ApiError(400, 'end_at must be after start_at')
  if (updates.end_at && !updates.start_at && new Date(current.start_at) >= new Date(updates.end_at)) throw new ApiError(400, 'end_at must be after start_at')
  if ((updates.academic_year && !updates.semester && !current.semester) || (updates.semester && !updates.academic_year && !current.academic_year)) throw new ApiError(400, 'academic_year and semester must be provided together')
  if (!Object.keys(updates).length) throw new ApiError(400, 'At least one editable field is required')
  const { data, error } = await supabase.from('school_event').update({ ...updates, updated_by: req.user.user_id }).eq('event_id', eventId).select('*').single()
  if (error) throw error
  if (data.status === 'Published' && data.notify_on_change) await publishEvent(data, req.user.user_id)
  return sendData(res, data)
}))

router.post('/:eventId/publish', requireRole('administrator'), asyncRoute(async (req, res) => {
  const eventId = asUuid(req.params.eventId, 'eventId')
  const { data, error } = await supabase.from('school_event').update({ status: 'Published', published_at: new Date().toISOString(), updated_by: req.user.user_id }).eq('event_id', eventId).eq('status', 'Draft').select('*').single()
  if (error) throw error
  await publishEvent(data, req.user.user_id)
  return sendData(res, data)
}))

router.post('/:eventId/cancel', requireRole('administrator'), asyncRoute(async (req, res) => {
  const eventId = asUuid(req.params.eventId, 'eventId')
  const reason = asText(req.body?.reason, 'reason', { max: 1000 })
  const { data, error } = await supabase.from('school_event').update({ status: 'Cancelled', cancelled_at: new Date().toISOString(), updated_by: req.user.user_id }).eq('event_id', eventId).in('status', ['Draft', 'Published']).select('*').single()
  if (error) throw error
  if (data.notify_on_change) await publishEvent({ ...data, title: `${data.title} cancelled`, body: reason }, req.user.user_id)
  return sendData(res, data)
}))

router.delete('/:eventId', requireRole('administrator'), asyncRoute(async (req, res) => {
  const eventId = asUuid(req.params.eventId, 'eventId')
  const { data: current, error: currentError } = await supabase.from('school_event').select('status').eq('event_id', eventId).maybeSingle()
  if (currentError) throw currentError
  if (!current) throw new ApiError(404, 'School Event not found')
  if (current.status !== 'Draft') throw new ApiError(409, 'Published, cancelled, or archived events must be archived instead of deleted')
  const { error } = await supabase.from('school_event').delete().eq('event_id', eventId)
  if (error) throw error
  return res.status(204).send()
}))

export default router
