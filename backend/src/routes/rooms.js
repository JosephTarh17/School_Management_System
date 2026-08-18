import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ApiError, asNumber, asText, asUuid, asyncRoute, sendData, supabaseError } from '../lib/api.js'

const router = express.Router()
router.use(requireAuth)

const select = 'room_id,room_name,location,capacity'

function normalizedSearch(value) {
  return value.replace(/[^a-zA-Z0-9À-ÿ -]/g, ' ').replace(/\s+/g, ' ').trim()
}

function roomMutationError(error) {
  if (error?.code === '23505') throw new ApiError(409, 'A class location with this name already exists.')
  throw supabaseError(error) || error
}

router.get('/', asyncRoute(async (req, res) => {
  let query = supabase.from('room').select(select).order('room_name')
  if (req.query.search) {
    const search = normalizedSearch(asText(req.query.search, 'search', { max: 80 }))
    if (search) query = query.ilike('room_name', `%${search}%`)
  }
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data || [])
}))

router.post('/', requireRole('administrator'), asyncRoute(async (req, res) => {
  const room_name = asText(req.body?.room_name, 'room_name', { max: 120 })
  const location = asText(req.body?.location, 'location', { max: 160, optional: true }) || null
  const capacity = asNumber(req.body?.capacity, 'capacity', { optional: true, min: 1, max: 100000, integer: true })
  const { data, error } = await supabase.from('room').insert({ room_name, location, capacity }).select(select).single()
  if (error) roomMutationError(error)
  return sendData(res, data, 201)
}))

router.patch('/:roomId', requireRole('administrator'), asyncRoute(async (req, res) => {
  const roomId = asUuid(req.params.roomId, 'roomId')
  const updates = {}
  if (req.body?.room_name !== undefined) updates.room_name = asText(req.body.room_name, 'room_name', { max: 120 })
  if (req.body?.location !== undefined) updates.location = asText(req.body.location, 'location', { max: 160, optional: true }) || null
  if (req.body?.capacity !== undefined) updates.capacity = asNumber(req.body.capacity, 'capacity', { optional: true, min: 1, max: 100000, integer: true })
  if (!Object.keys(updates).length) throw new ApiError(400, 'At least one editable location field is required')

  const { data, error } = await supabase.from('room').update(updates).eq('room_id', roomId).select(select).single()
  if (error) roomMutationError(error)
  return sendData(res, data)
}))

router.delete('/:roomId', requireRole('administrator'), asyncRoute(async (req, res) => {
  const roomId = asUuid(req.params.roomId, 'roomId')
  const { count, error: countError } = await supabase.from('class_session').select('session_id', { count: 'exact', head: true }).eq('room_id', roomId)
  if (countError) throw countError
  if (Number(count || 0) > 0) throw new ApiError(409, 'This class location is used by existing sessions and cannot be deleted. Rename it or keep it for historical records.')

  const { error } = await supabase.from('room').delete().eq('room_id', roomId)
  if (error) throw error
  return res.status(204).send()
}))

export default router
