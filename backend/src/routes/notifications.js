import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth } from '../middleware/auth.js'
import { ApiError, asNumber, asUuid, asyncRoute, sendData } from '../lib/api.js'

const router = express.Router()
router.use(requireAuth)
const select = 'notification_id,notification_type,title,body,link_path,announcement_id,read_at,created_at'

router.get('/', asyncRoute(async (req, res) => {
  const limit = asNumber(req.query.limit || 30, 'limit', { min: 1, max: 100, integer: true })
  let query = supabase.from('user_notification').select(select).eq('user_id', req.user.user_id).order('created_at', { ascending: false }).limit(limit)
  if (String(req.query.unread_only).toLowerCase() === 'true') query = query.is('read_at', null)
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data || [])
}))

router.get('/unread-count', asyncRoute(async (req, res) => {
  const { count, error } = await supabase.from('user_notification').select('notification_id', { count: 'exact', head: true }).eq('user_id', req.user.user_id).is('read_at', null)
  if (error) throw error
  return sendData(res, { unread_count: count || 0 })
}))

router.patch('/:notificationId/read', asyncRoute(async (req, res) => {
  const notificationId = asUuid(req.params.notificationId, 'notificationId')
  const { data, error } = await supabase.from('user_notification').update({ read_at: new Date().toISOString() }).eq('notification_id', notificationId).eq('user_id', req.user.user_id).select(select).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'Notification not found')
  return sendData(res, data)
}))

router.post('/read-all', asyncRoute(async (req, res) => {
  const { data, error } = await supabase.from('user_notification').update({ read_at: new Date().toISOString() }).eq('user_id', req.user.user_id).is('read_at', null).select('notification_id')
  if (error) throw error
  return sendData(res, { updated: data?.length || 0 })
}))

export default router
