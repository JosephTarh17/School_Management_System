import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('assessment').select('*')
  if (error) {
    return res.status(500).json({ error: 'Database error' })
  }

  res.json({ data })
})

router.post('/', async (req, res) => {
  const { role } = req.user
  if (!['teacher', 'administrator'].includes(role)) {
    return res.status(403).json({ error: 'Only teachers and administrators can create assessments' })
  }

  const { course_id, title, assessment_type, max_score, weight, due_date } = req.body
  if (!course_id || !title || !assessment_type) {
    return res.status(400).json({ error: 'course_id, title, and assessment_type are required' })
  }

  const { data, error } = await supabase.from('assessment').insert([
    { course_id, title, assessment_type, max_score, weight, due_date },
  ])

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.status(201).json({ data })
})

export default router
