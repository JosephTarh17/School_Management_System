import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ENUMS, ApiError, asDate, asEnum, asNumber, asUuid, asyncRoute, sendData } from '../lib/api.js'

const router = express.Router()
router.use(requireAuth)

const paymentMethods = ['Cash', 'Bank transfer', 'Mobile money - manual', 'Other']
const classLevels = ['Freshman', 'Sophomore', 'Junior']

async function studentIdForUser(userId) {
  const { data, error } = await supabase.from('student').select('student_id').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data?.student_id
}

function statusForBalance(amountDue, amountPaid) {
  if (Number(amountPaid) >= Number(amountDue) && Number(amountDue) > 0) return 'Paid'
  if (Number(amountPaid) > 0) return 'Partial'
  return 'Pending'
}

router.get('/class-fees', requireRole('administrator'), asyncRoute(async (req, res) => {
  const { data, error } = await supabase.from('class_fee_setting').select('class_fee_setting_id,class_level,fee_xaf,max_credits,updated_by,updated_at').order('class_level')
  if (error) throw error
  return sendData(res, data || [])
}))

router.patch('/class-fees/:classLevel', requireRole('administrator'), asyncRoute(async (req, res) => {
  const class_level = asEnum(req.params.classLevel, 'class_level', classLevels)
  const fee_xaf = asNumber(req.body?.fee_xaf, 'fee_xaf', { min: 0, max: 999999999 })
  const max_credits = asNumber(req.body?.max_credits, 'max_credits', { min: 0, max: 999, integer: true })
  const { data, error } = await supabase.from('class_fee_setting').upsert({ class_level, fee_xaf, max_credits, updated_by: req.user.user_id, updated_at: new Date().toISOString() }, { onConflict: 'class_level' }).select('class_fee_setting_id,class_level,fee_xaf,max_credits,updated_by,updated_at').single()
  if (error) throw error
  return sendData(res, data)
}))

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

router.get('/:invoiceId/payments', asyncRoute(async (req, res) => {
  const invoiceId = asUuid(req.params.invoiceId, 'invoiceId')
  const { data: invoice, error: invoiceError } = await supabase.from('financial_record').select('invoice_id,student_id').eq('invoice_id', invoiceId).maybeSingle()
  if (invoiceError) throw invoiceError
  if (!invoice) throw new ApiError(404, 'Financial record not found')
  if (req.user.role === 'student') {
    const studentId = await studentIdForUser(req.user.user_id)
    if (invoice.student_id !== studentId) throw new ApiError(403, 'You do not have permission to view these payments')
  }
  const { data, error } = await supabase.from('payment_record').select('payment_id,invoice_id,amount,payment_method,receipt_number,payment_reference,notes,paid_at,created_at,recorded_by').eq('invoice_id', invoiceId).order('paid_at', { ascending: false })
  if (error) throw error
  return sendData(res, data || [])
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
  const payment_status = asEnum(req.body?.payment_status ?? statusForBalance(amount_due, amount_paid), 'payment_status', ENUMS.paymentStatus)
  const due_date = asDate(req.body?.due_date, 'due_date', { optional: true })
  const { data, error } = await supabase.from('financial_record').insert({ student_id, amount_due, amount_paid, balance_due: Math.max(amount_due - amount_paid, 0), payment_status, due_date }).select('*, student(*)').single()
  if (error) throw error
  return sendData(res, data, 201)
}))

router.post('/:invoiceId/payments', requireRole('administrator'), asyncRoute(async (req, res) => {
  const invoiceId = asUuid(req.params.invoiceId, 'invoiceId')
  const amount = asNumber(req.body?.amount, 'amount', { min: 0.01, max: 999999999 })
  const payment_method = asEnum(req.body?.payment_method, 'payment_method', paymentMethods)
  const receipt_number = String(req.body?.receipt_number || '').trim()
  if (!receipt_number || receipt_number.length > 80) throw new ApiError(400, 'receipt_number is required and must be 80 characters or fewer')
  const payment_reference = req.body?.payment_reference ? String(req.body.payment_reference).trim().slice(0, 120) : null
  const notes = req.body?.notes ? String(req.body.notes).trim().slice(0, 500) : null
  const paid_at = req.body?.paid_at ? new Date(req.body.paid_at).toISOString() : new Date().toISOString()
  if (Number.isNaN(new Date(paid_at).getTime())) throw new ApiError(400, 'paid_at must be a valid date')

  const { data: invoice, error: invoiceError } = await supabase.from('financial_record').select('invoice_id,amount_due,amount_paid').eq('invoice_id', invoiceId).maybeSingle()
  if (invoiceError) throw invoiceError
  if (!invoice) throw new ApiError(404, 'Financial record not found')
  const currentPaid = Number(invoice.amount_paid || 0)
  const amountDue = Number(invoice.amount_due || 0)
  if (currentPaid + amount > amountDue) throw new ApiError(400, 'Payment cannot exceed the outstanding balance')

  const { data: payment, error: paymentError } = await supabase.from('payment_record').insert({ invoice_id: invoiceId, amount, payment_method, receipt_number, payment_reference, notes, paid_at, recorded_by: req.user.user_id }).select('*').single()
  if (paymentError) throw paymentError

  const updatedPaid = currentPaid + amount
  const { data: updatedInvoice, error: updateError } = await supabase.from('financial_record').update({ amount_paid: updatedPaid, balance_due: Math.max(amountDue - updatedPaid, 0), payment_status: statusForBalance(amountDue, updatedPaid), last_payment_at: paid_at }).eq('invoice_id', invoiceId).select('*, student(*)').single()
  if (updateError) throw updateError
  return sendData(res, { payment, invoice: updatedInvoice }, 201)
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
  if (updates.amount_due !== undefined || updates.amount_paid !== undefined) updates.balance_due = Math.max(Number(updates.amount_due ?? current.amount_due) - Number(updates.amount_paid ?? current.amount_paid), 0)
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
