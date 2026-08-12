import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  const { role, user_id } = req.user

  let query = supabase.from('student').select('*, user_account(*)')

  if (role === 'student') {
    query = query.eq('user_id', user_id)
  }

  const { data, error } = await query
  if (error) {
    return res.status(500).json({ error: 'Database error' })
  }

  res.json({ data })
})

router.post('/', async (req, res) => {
  const { role } = req.user
  if (role !== 'administrator') {
    return res.status(403).json({ error: 'Only administrators can create student profiles' })
  }

  const { user_id, full_name, dob, phone, address } = req.body
  if (!user_id || !full_name) {
    return res.status(400).json({ error: 'user_id and full_name are required' })
  }

  const { data, error } = await supabase.from('student').insert([
    { user_id, full_name, dob, phone, address },
  ])

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.status(201).json({ data })
})

export default router
