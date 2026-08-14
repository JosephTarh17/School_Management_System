import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ENUMS, ApiError, asDate, asEnum, asNumber, asText, asUuid, asXafAmount, asyncRoute, sendData } from '../lib/api.js'

const router = express.Router()
router.use(requireAuth)

const paymentMethods = ['Cash', 'Bank transfer', 'Mobile money - manual', 'Other']
const classLevels = ['Freshman', 'Sophomore', 'Junior']

async function studentIdForUser(userId) {
  const { data, error } = await supabase.from('student').select('student_id').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data?.student_id
}

async function guardianIdForUser(userId) {
  const { data, error } = await supabase.from('guardian').select('guardian_id').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data?.guardian_id
}

async function assertInvoiceAccess(invoice, req) {
  if (req.user.role === 'administrator') return
  if (req.user.role === 'student') {
    const studentId = await studentIdForUser(req.user.user_id)
    if (invoice.student_id !== studentId) throw new ApiError(403, 'You do not have permission to view this financial record')
    return
  }
  if (req.user.role === 'guardian') {
    const guardianId = await guardianIdForUser(req.user.user_id)
    const { data: link, error } = await supabase.from('student_guardian').select('student_guardian_id').eq('guardian_id', guardianId).eq('student_id', invoice.student_id).maybeSingle()
    if (error) throw error
    if (!link) throw new ApiError(403, 'You do not have permission to view this financial record')
    return
  }
  throw new ApiError(403, 'You do not have permission to view this financial record')
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
  const fee_xaf = asXafAmount(req.body?.fee_xaf, 'fee_xaf', { positive: true })
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

router.get('/:invoiceId/installments', asyncRoute(async (req, res) => {
  const invoiceId = asUuid(req.params.invoiceId, 'invoiceId')
  const { data: invoice, error: invoiceError } = await supabase.from('financial_record').select('invoice_id,student_id').eq('invoice_id', invoiceId).maybeSingle()
  if (invoiceError) throw invoiceError
  if (!invoice) throw new ApiError(404, 'Financial record not found')
  await assertInvoiceAccess(invoice, req)
  let query = supabase.from('fee_installment').select('installment_id,invoice_id,installment_number,guardian_id,amount_due,amount_paid,balance_due,due_date,status,created_at,updated_at,guardian(guardian_id,full_name,email)').eq('invoice_id', invoiceId).order('installment_number')
  if (req.user.role === 'guardian') query = query.eq('guardian_id', await guardianIdForUser(req.user.user_id))
  const { data, error } = await query
  if (error) throw error
  return sendData(res, data || [])
}))

router.post('/:invoiceId/installments', requireRole('administrator'), asyncRoute(async (req, res) => {
  const invoiceId = asUuid(req.params.invoiceId, 'invoiceId')
  const installments = req.body?.installments
  if (!Array.isArray(installments) || installments.length === 0 || installments.length > 24) throw new ApiError(400, 'installments must contain between 1 and 24 items')
  const { data: invoice, error: invoiceError } = await supabase.from('financial_record').select('invoice_id,student_id,amount_due').eq('invoice_id', invoiceId).maybeSingle()
  if (invoiceError) throw invoiceError
  if (!invoice) throw new ApiError(404, 'Financial record not found')
  const rows = installments.map((item, index) => ({
    invoice_id: invoiceId,
    installment_number: index + 1,
    guardian_id: asUuid(item?.guardian_id, 'guardian_id'),
    amount_due: asXafAmount(item?.amount_due, 'amount_due', { positive: true }),
    amount_paid: 0,
    balance_due: asXafAmount(item?.amount_due, 'amount_due', { positive: true }),
    due_date: asDate(item?.due_date, 'due_date'),
  }))
  const total = rows.reduce((sum, row) => sum + Number(row.amount_due), 0)
  if (total !== Number(invoice.amount_due || 0)) throw new ApiError(400, 'Installment amounts must equal the invoice amount due in whole XAF units')
  const guardianIds = [...new Set(rows.map((row) => row.guardian_id))]
  const { data: links, error: linkError } = await supabase.from('student_guardian').select('guardian_id').eq('student_id', invoice.student_id).in('guardian_id', guardianIds)
  if (linkError) throw linkError
  if ((links || []).length !== guardianIds.length) throw new ApiError(400, 'Every installment guardian must be linked to the invoice student')
  const { data, error } = await supabase.from('fee_installment').insert(rows).select('*, guardian(guardian_id,full_name,email)').order('installment_number')
  if (error?.code === '23505') throw new ApiError(409, 'An installment schedule already exists for this invoice')
  if (error) throw error
  return sendData(res, data || [], 201)
}))

router.post('/:invoiceId/installments/:installmentId/payments', requireRole('administrator'), asyncRoute(async (req, res) => {
  const invoiceId = asUuid(req.params.invoiceId, 'invoiceId')
  const installmentId = asUuid(req.params.installmentId, 'installmentId')
  const amount = asXafAmount(req.body?.amount, 'amount', { positive: true })
  const payment_method = asEnum(req.body?.payment_method, 'payment_method', paymentMethods)
  const receipt_number = asText(req.body?.receipt_number, 'receipt_number', { max: 80 })
  const payment_reference = req.body?.payment_reference ? asText(req.body.payment_reference, 'payment_reference', { max: 120, optional: true }) : null
  const notes = req.body?.notes ? asText(req.body.notes, 'notes', { max: 500, optional: true }) : null
  const paid_at = req.body?.paid_at ? new Date(req.body.paid_at).toISOString() : new Date().toISOString()
  const payer_guardian_id = asUuid(req.body?.payer_guardian_id || req.body?.guardian_id, 'payer_guardian_id')
  if (Number.isNaN(new Date(paid_at).getTime())) throw new ApiError(400, 'paid_at must be a valid date')
  const { data, error } = await supabase.rpc('record_installment_payment', { p_invoice_id: invoiceId, p_installment_id: installmentId, p_amount: amount, p_payment_method: payment_method, p_receipt_number: receipt_number, p_payment_reference: payment_reference, p_notes: notes, p_paid_at: paid_at, p_recorded_by: req.user.user_id, p_payer_guardian_id: payer_guardian_id })
  if (error) throw new ApiError(400, String(error.message || 'Unable to record installment payment').replace(/^ERROR:\s*/i, ''))
  return sendData(res, data, 201)
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
  const amount_due = asXafAmount(req.body?.amount_due, 'amount_due', { positive: true })
  const amount_paid = asXafAmount(req.body?.amount_paid ?? 0, 'amount_paid')
  if (amount_paid > amount_due) throw new ApiError(400, 'amount_paid cannot exceed amount_due')
  const payment_status = asEnum(req.body?.payment_status ?? statusForBalance(amount_due, amount_paid), 'payment_status', ENUMS.paymentStatus)
  const due_date = asDate(req.body?.due_date, 'due_date', { optional: true })
  const { data, error } = await supabase.from('financial_record').insert({ student_id, amount_due, amount_paid, balance_due: Math.max(amount_due - amount_paid, 0), payment_status, due_date }).select('*, student(*)').single()
  if (error) throw error
  return sendData(res, data, 201)
}))

router.post('/:invoiceId/payments', requireRole('administrator'), asyncRoute(async (req, res) => {
  const invoiceId = asUuid(req.params.invoiceId, 'invoiceId')
  const amount = asXafAmount(req.body?.amount, 'amount', { positive: true })
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
  const { count: installmentCount, error: installmentError } = await supabase.from('fee_installment').select('installment_id', { count: 'exact', head: true }).eq('invoice_id', invoiceId)
  if (installmentError) throw installmentError
  if (installmentCount > 0) throw new ApiError(400, 'This invoice has an installment schedule. Record the payment against a specific installment.')
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
  if (req.body?.amount_due !== undefined) updates.amount_due = asXafAmount(req.body.amount_due, 'amount_due', { positive: true })
  if (req.body?.amount_paid !== undefined) updates.amount_paid = asXafAmount(req.body.amount_paid, 'amount_paid')
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
