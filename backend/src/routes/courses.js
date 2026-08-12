import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('course').select('*')
  if (error) {
    return res.status(500).json({ error: 'Database error' })
  }

  res.json({ data })
})

router.post('/', async (req, res) => {
  const { role } = req.user
  if (!['teacher', 'administrator'].includes(role)) {
    return res.status(403).json({ error: 'Only teachers and administrators can create courses' })
  }

  const { course_name, course_code, term, credit_units } = req.body
  if (!course_name || !course_code) {
    return res.status(400).json({ error: 'Course name and course code are required' })
  }

  const { data, error } = await supabase.from('course').insert([
    { course_name, course_code, term, credit_units },
  ])

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.status(201).json({ data })
})

export default router
