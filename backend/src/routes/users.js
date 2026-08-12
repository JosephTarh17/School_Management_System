import express from 'express'
import bcrypt from 'bcryptjs'
import { supabase } from '../supabaseClient.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()
router.use(requireAuth)

router.get('/me', async (req, res) => {
  const { user_id } = req.user

  const { data, error } = await supabase
    .from('user_account')
    .select('user_id,email,role,created_at,last_login, student(*), teacher(*), guardian(*), administrator(*)')
    .eq('user_id', user_id)
    .limit(1)

  if (error) {
    return res.status(500).json({ error: 'Database error' })
  }

  const user = data?.[0]
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  res.json({ data: user })
})

router.post('/register', async (req, res) => {
  const { role, email, password } = req.body

  if (req.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Only administrators can register new accounts' })
  }

  if (!role || !email || !password) {
    return res.status(400).json({ error: 'Role, email, and password are required' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const { data, error } = await supabase.from('user_account').insert([
    { role, email, password_hash: passwordHash },
  ])

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.status(201).json({ data })
})

export default router
