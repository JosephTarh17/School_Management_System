import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('class_session')
    .select('*, course(*), teacher(*), room(*)')

  if (error) {
    return res.status(500).json({ error: 'Database error' })
  }

  res.json({ data })
})

router.post('/', async (req, res) => {
  const { role } = req.user
  if (!['teacher', 'administrator'].includes(role)) {
    return res.status(403).json({ error: 'Only teachers and administrators can create class sessions' })
  }

  const { course_id, teacher_id, room_id, start_time, end_time, recurrence_pattern } = req.body
  if (!course_id || !teacher_id || !room_id || !start_time || !end_time) {
    return res.status(400).json({ error: 'course_id, teacher_id, room_id, start_time, and end_time are required' })
  }

  const { data, error } = await supabase.from('class_session').insert([
    { course_id, teacher_id, room_id, start_time, end_time, recurrence_pattern },
  ])

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.status(201).json({ data })
})

export default router
