import express from 'express'
import bcrypt from 'bcryptjs'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ENUMS, ApiError, asEnum, asText, asUuid, asyncRoute, sendData } from '../lib/api.js'

const router = express.Router()
router.use(requireAuth)
const publicFields = 'user_id,email,role,created_at,last_login'

router.get('/', requireRole('administrator'), asyncRoute(async (req, res) => {
  const { data, error } = await supabase.from('user_account').select(publicFields).order('created_at', { ascending: false })
  if (error) throw error
  return sendData(res, data)
}))

router.get('/me', asyncRoute(async (req, res) => {
  const { data, error } = await supabase
    .from('user_account')
    .select(`${publicFields}, student(*), teacher(*), guardian(*), administrator(*)`)
    .eq('user_id', req.user.user_id)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'User not found')
  return sendData(res, data)
}))

router.get('/:userId', asyncRoute(async (req, res) => {
  const userId = asUuid(req.params.userId, 'userId')
  if (req.user.role !== 'administrator' && req.user.user_id !== userId) throw new ApiError(403, 'You do not have permission to view this user')
  const { data, error } = await supabase.from('user_account').select(`${publicFields}, student(*), teacher(*), guardian(*), administrator(*)`).eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'User not found')
  return sendData(res, data)
}))

router.post('/register', requireRole('administrator'), asyncRoute(async (req, res) => {
  const email = asText(req.body?.email, 'email', { max: 320 }).toLowerCase()
  const password = asText(req.body?.password, 'password', { max: 128 })
  const role = asEnum(req.body?.role, 'role', ENUMS.roles)
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'email must be a valid email address')
  if (password.length < 8) throw new ApiError(400, 'password must be at least 8 characters')
  const password_hash = await bcrypt.hash(password, 12)
  const { data, error } = await supabase.from('user_account').insert({ email, password_hash, role }).select(publicFields).single()
  if (error) throw error
  return sendData(res, data, 201)
}))

router.patch('/me', asyncRoute(async (req, res) => {
  const updates = {}
  if (req.body?.email !== undefined) updates.email = asText(req.body.email, 'email', { max: 320 }).toLowerCase()
  if (req.body?.password !== undefined) {
    const password = asText(req.body.password, 'password', { max: 128 })
    if (password.length < 8) throw new ApiError(400, 'password must be at least 8 characters')
    updates.password_hash = await bcrypt.hash(password, 12)
  }
  if (!Object.keys(updates).length) throw new ApiError(400, 'At least one editable field is required')
  const { data, error } = await supabase.from('user_account').update(updates).eq('user_id', req.user.user_id).select(publicFields).single()
  if (error) throw error
  return sendData(res, data)
}))

export default router
