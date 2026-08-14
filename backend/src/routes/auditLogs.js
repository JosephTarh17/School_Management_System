import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ApiError, asNumber, asText, asyncRoute, sendData } from '../lib/api.js'

const router = express.Router()
router.use(requireAuth, requireRole('administrator'))

router.get('/', asyncRoute(async (req, res) => {
  const limit = asNumber(req.query?.limit, 'limit', { optional: true, min: 1, max: 200, integer: true }) || 100
  const action = asText(req.query?.action, 'action', { max: 120, optional: true })

  let query = supabase
    .from('security_audit_log')
    .select('audit_id,actor_user_id,action,resource_type,resource_id,http_method,request_path,status_code,correlation_id,metadata,created_at,user_account(email,role)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (action) query = query.ilike('action', `%${action}%`)

  const { data, error } = await query
  if (error) throw new ApiError(500, 'Unable to load audit logs')
  return sendData(res, data || [])
}))

export default router
