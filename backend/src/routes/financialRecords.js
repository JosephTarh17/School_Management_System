import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()
router.use(requireAuth)

router.get('/', async (req, res) => {
  const { role, user_id } = req.user
  let query = supabase.from('financial_record').select('*')

  if (role === 'student') {
    const { data, error } = await query.eq('student_id', user_id)
    if (error) {
      return res.status(500).json({ error: 'Database error' })
    }
    return res.json({ data })
  }

  const { data, error } = await query
  if (error) {
    return res.status(500).json({ error: 'Database error' })
  }

  res.json({ data })
})

router.post('/', async (req, res) => {
  const { role } = req.user
  if (!['administrator', 'guardian', 'student'].includes(role)) {
    return res.status(403).json({ error: 'Only administrators, guardians, or students can create financial records' })
  }

  const { student_id, amount_due, amount_paid, payment_status, due_date } = req.body
  if (!student_id || amount_due == null || amount_paid == null || !payment_status) {
    return res.status(400).json({ error: 'student_id, amount_due, amount_paid, and payment_status are required' })
  }

  const { data, error } = await supabase.from('financial_record').insert([
    { student_id, amount_due, amount_paid, payment_status, due_date },
  ])

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.status(201).json({ data })
})

export default router
