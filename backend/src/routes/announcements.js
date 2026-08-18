import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ENUMS, ApiError, asDate, asEnum, asText, asUuid, asyncRoute, sendData } from '../lib/api.js'
import { safeNotifyUsers, userIdsForAudience } from '../lib/notifications.js'

const router = express.Router()
router.use(requireAuth)

const priorities = ['normal', 'important', 'urgent']
const statuses = ['draft', 'published', 'archived']
const announcementSelect = 'announcement_id,title,body,audience,priority,status,expires_at,published_at,created_by,created_at,updated_at'

function audienceOptionsForUser(role) {
  if (role === 'administrator') return ['all', 'students', 'teachers', 'guardians', 'administrators']
  const audienceByRole = { student: 'students', teacher: 'teachers', guardian: 'guardians' }
  return ['all', audienceByRole[role] || role]
}

function visibleQuery(query, role) {
  if (role === 'administrator') return query
  const today = new Date().toISOString().slice(0, 10)
  return query
    .eq('status', 'published')
    .in('audience', audienceOptionsForUser(role))
    .or(`expires_at.is.null,expires_at.gte.${today}`)
}

async function publishAnnouncement(announcement) {
  const userIds = await userIdsForAudience(announcement.audience)
  await safeNotifyUsers(userIds, {
    notification_type: 'announcement',
    title: announcement.title,
    body: announcement.body,
    link_path: '/announcements',
    announcement_id: announcement.announcement_id,
    event_key: `announcement:${announcement.announcement_id}:published`,
  })
}

router.get('/', asyncRoute(async (req, res) => {
  let query = supabase.from('announcement').select(announcementSelect).order('created_at', { ascending: false })
  query = visibleQuery(query, req.user.role)
  if (req.query.status && req.user.role === 'administrator') query = query.eq('status', asEnum(req.query.status, 'status', statuses))
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data || [])
}))

router.post('/', requireRole('administrator'), asyncRoute(async (req, res) => {
  const title = asText(req.body?.title, 'title', { max: 200 })
  const body = asText(req.body?.body, 'body', { max: 5000 })
  const audience = asEnum(req.body?.audience || 'all', 'audience', ENUMS.announcementAudience)
  const priority = asEnum(req.body?.priority || 'normal', 'priority', priorities)
  const status = asEnum(req.body?.status || 'draft', 'status', statuses)
  const expires_at = asDate(req.body?.expires_at, 'expires_at', { optional: true }) || null
  const published_at = status === 'published' ? new Date().toISOString() : null

  const { data, error } = await supabase.from('announcement').insert({
    title,
    body,
    audience,
    priority,
    status,
    expires_at,
    published_at,
    created_by: req.user.user_id,
  }).select(announcementSelect).single()
  if (error) throw error

  if (status === 'published') await publishAnnouncement(data)
  return sendData(res, data, 201)
}))

router.patch('/:announcementId', requireRole('administrator'), asyncRoute(async (req, res) => {
  const announcementId = asUuid(req.params.announcementId, 'announcementId')
  const { data: current, error: currentError } = await supabase.from('announcement').select('*').eq('announcement_id', announcementId).maybeSingle()
  if (currentError) throw currentError
  if (!current) throw new ApiError(404, 'Announcement not found')

  const updates = {}
  if (req.body?.title !== undefined) updates.title = asText(req.body.title, 'title', { max: 200 })
  if (req.body?.body !== undefined) updates.body = asText(req.body.body, 'body', { max: 5000 })
  if (req.body?.audience !== undefined) updates.audience = asEnum(req.body.audience, 'audience', ENUMS.announcementAudience)
  if (req.body?.priority !== undefined) updates.priority = asEnum(req.body.priority, 'priority', priorities)
  if (req.body?.expires_at !== undefined) updates.expires_at = asDate(req.body.expires_at, 'expires_at', { optional: true }) || null
  if (req.body?.status !== undefined) updates.status = asEnum(req.body.status, 'status', statuses)
  if (!Object.keys(updates).length) throw new ApiError(400, 'At least one editable field is required')

  const nextStatus = updates.status || current.status
  if (nextStatus === 'published' && current.status !== 'published') updates.published_at = new Date().toISOString()
  if (nextStatus !== 'published' && current.status === 'draft') updates.published_at = null
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase.from('announcement').update(updates).eq('announcement_id', announcementId).select(announcementSelect).single()
  if (error) throw error

  if (nextStatus === 'published' && current.status !== 'published') await publishAnnouncement(data)
  return sendData(res, data)
}))

export default router
