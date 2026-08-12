import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('participation_log')
    .select('*, student(*), class_session(*)')

  if (error) {
    return res.status(500).json({ error: 'Database error' })
  }

  res.json({ data })
})

router.post('/', async (req, res) => {
  const { role } = req.user
  if (!['teacher', 'administrator'].includes(role)) {
    return res.status(403).json({ error: 'Only teachers and administrators can create participation logs' })
  }

  const { student_id, session_id, rating, notes } = req.body
  if (!student_id || !session_id || !rating) {
    return res.status(400).json({ error: 'student_id, session_id, and rating are required' })
  }

  const { data, error } = await supabase.from('participation_log').insert([
    { student_id, session_id, rating, notes },
  ])

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.status(201).json({ data })
})

export default router
