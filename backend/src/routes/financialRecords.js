import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ENUMS, ApiError, asDate, asEnum, asNumber, asUuid, asyncRoute, sendData } from '../lib/api.js'

const router = express.Router()
router.use(requireAuth)

async function studentIdForUser(userId) {
  const { data, error } = await supabase.from('student').select('student_id').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data?.student_id
}

router.get('/', asyncRoute(async (req, res) => {
  let query = supabase.from('financial_record').select('*, student(*)').order('created_at', { ascending: false })
  if (req.user.role === 'student') {
    const studentId = await studentIdForUser(req.user.user_id)
    if (!studentId) return sendData(res, [])
    query = query.eq('student_id', studentId)
  } else if (req.query.student_id) {
    query = query.eq('student_id', asUuid(req.query.student_id, 'student_id'))
  }
  if (req.query.payment_status) query = query.eq('payment_status', asEnum(req.query.payment_status, 'payment_status', ENUMS.paymentStatus))
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data)
}))

router.get('/:invoiceId', asyncRoute(async (req, res) => {
  const invoiceId = asUuid(req.params.invoiceId, 'invoiceId')
  const { data, error } = await supabase.from('financial_record').select('*, student(*)').eq('invoice_id', invoiceId).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'Financial record not found')
  if (req.user.role === 'student' && data.student?.user_id !== req.user.user_id) throw new ApiError(403, 'You do not have permission to view this financial record')
  return sendData(res, data)
}))

router.post('/', requireRole('administrator'), asyncRoute(async (req, res) => {
  const student_id = asUuid(req.body?.student_id, 'student_id')
  const amount_due = asNumber(req.body?.amount_due, 'amount_due', { min: 0, max: 999999999 })
  const amount_paid = asNumber(req.body?.amount_paid ?? 0, 'amount_paid', { min: 0, max: 999999999 })
  if (amount_paid > amount_due) throw new ApiError(400, 'amount_paid cannot exceed amount_due')
  const payment_status = asEnum(req.body?.payment_status ?? 'Pending', 'payment_status', ENUMS.paymentStatus)
  const due_date = asDate(req.body?.due_date, 'due_date', { optional: true })
  const { data, error } = await supabase.from('financial_record').insert({ student_id, amount_due, amount_paid, payment_status, due_date }).select('*, student(*)').single()
  if (error) throw error
  return sendData(res, data, 201)
}))

router.patch('/:invoiceId', requireRole('administrator'), asyncRoute(async (req, res) => {
  const invoiceId = asUuid(req.params.invoiceId, 'invoiceId')
  const updates = {}
  if (req.body?.student_id !== undefined) updates.student_id = asUuid(req.body.student_id, 'student_id')
  if (req.body?.amount_due !== undefined) updates.amount_due = asNumber(req.body.amount_due, 'amount_due', { min: 0, max: 999999999 })
  if (req.body?.amount_paid !== undefined) updates.amount_paid = asNumber(req.body.amount_paid, 'amount_paid', { min: 0, max: 999999999 })
  if (req.body?.payment_status !== undefined) updates.payment_status = asEnum(req.body.payment_status, 'payment_status', ENUMS.paymentStatus)
  if (req.body?.due_date !== undefined) updates.due_date = asDate(req.body.due_date, 'due_date', { optional: true })
  if (!Object.keys(updates).length) throw new ApiError(400, 'At least one editable field is required')
  const { data: current, error: currentError } = await supabase.from('financial_record').select('amount_due,amount_paid').eq('invoice_id', invoiceId).maybeSingle()
  if (currentError) throw currentError
  if (!current) throw new ApiError(404, 'Financial record not found')
  if ((updates.amount_paid ?? current.amount_paid) > (updates.amount_due ?? current.amount_due)) throw new ApiError(400, 'amount_paid cannot exceed amount_due')
  const { data, error } = await supabase.from('financial_record').update(updates).eq('invoice_id', invoiceId).select('*, student(*)').single()
  if (error) throw error
  return sendData(res, data)
}))

router.delete('/:invoiceId', requireRole('administrator'), asyncRoute(async (req, res) => {
  const invoiceId = asUuid(req.params.invoiceId, 'invoiceId')
  const { error } = await supabase.from('financial_record').delete().eq('invoice_id', invoiceId)
  if (error) throw error
  return res.status(204).send()
}))

export default router
