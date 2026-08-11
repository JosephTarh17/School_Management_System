import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// Protect attendance routes: only authenticated users can use them.
router.use(requireAuth)

// GET /attendance
// Returns attendance records for the authenticated user. In a real app,
// this would use the user's role to determine what data is allowed.
router.get('/', async (req, res) => {
  const { user } = req
  const { role, user_id } = user

  let query = supabase.from('attendance').select('*')

  if (role === 'student') {
    // Students should only see their own attendance.
    const { data, error } = await query.eq('student_id', user_id)
    if (error) return res.status(500).json({ error: 'Database error' })
    return res.json({ data })
  }

  if (role === 'teacher') {
    // For teachers, return all attendance records for sessions they teach.
    const { data, error } = await supabase
      .from('attendance')
      .select('*, class_session(*)')
      .eq('class_session.teacher_id', user_id)

    if (error) return res.status(500).json({ error: 'Database error' })
    return res.json({ data })
  }

  // Administrators and guardians can see all attendance for now.
  const { data, error } = await query
  if (error) return res.status(500).json({ error: 'Database error' })
  res.json({ data })
})

// POST /attendance
// Create a new attendance record.
router.post('/', async (req, res) => {
  const { student_id, session_id, session_date, status } = req.body

  if (!student_id || !session_id || !session_date || !status) {
    return res.status(400).json({ error: 'All fields are required' })
  }

  const { data, error } = await supabase.from('attendance').insert([
    { student_id, session_id, session_date, status },
  ])

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(201).json({ data })
})

export default router
