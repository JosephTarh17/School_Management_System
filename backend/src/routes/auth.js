import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { supabase } from '../supabaseClient.js'
import { ApiError, asText, asyncRoute, sendData } from '../lib/api.js'
import { JWT_SECRET } from '../middleware/auth.js'

const router = express.Router()

router.post('/login', asyncRoute(async (req, res) => {
  const email = asText(req.body?.email, 'email', { max: 320 }).toLowerCase()
  const password = asText(req.body?.password, 'password', { max: 128 })
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, 'email must be a valid email address')

  const { data: users, error } = await supabase
    .from('user_account')
    .select('user_id,email,password_hash,role')
    .eq('email', email)
    .limit(1)
  if (error) throw error

  const user = users?.[0]
  if (!user?.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
    throw new ApiError(401, 'Invalid email or password')
  }

  await supabase.from('user_account').update({ last_login: new Date().toISOString() }).eq('user_id', user.user_id)
  const token = jwt.sign({ user_id: user.user_id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '8h' })
  return res.json({ token, data: { token } })
}))

export default router
