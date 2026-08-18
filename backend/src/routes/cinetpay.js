import express from 'express'
import { randomUUID } from 'node:crypto'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ApiError, asNumber, asText, asUuid, asXafAmount, asyncRoute, sendData } from '../lib/api.js'
import { assertVerifiedPaymentMatchesAttempt, initializeCinetPayPayment, verifyCinetPayPayment } from '../lib/cinetpay.js'

const router = express.Router()

const publicValue = (value) => {
  if (value == null) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  return undefined
}

function safeProviderMetadata(payload) {
  const data = payload?.data || payload || {}
  return {
    code: publicValue(payload?.code ?? data?.code),
    status: publicValue(payload?.status ?? data?.status),
    message: publicValue(payload?.message ?? data?.message),
  }
}

async function guardianForUser(userId) {
  const { data, error } = await supabase.from('guardian').select('guardian_id,user_id,full_name,email').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'Guardian profile not found')
  return data
}

async function assertInvoiceAccess(invoiceId, guardianId) {
  const { data: invoice, error: invoiceError } = await supabase.from('financial_record').select('invoice_id,student_id,amount_due,amount_paid,payment_status').eq('invoice_id', invoiceId).maybeSingle()
  if (invoiceError) throw invoiceError
  if (!invoice) throw new ApiError(404, 'Financial record not found')
  const { data: link, error: linkError } = await supabase.from('student_guardian').select('student_guardian_id').eq('guardian_id', guardianId).eq('student_id', invoice.student_id).maybeSingle()
  if (linkError) throw linkError
  if (!link) throw new ApiError(403, 'You do not have permission to pay this financial record')
  return invoice
}

async function resolvePaymentTarget({ invoiceId, installmentId, guardianId, amount }) {
  const invoice = await assertInvoiceAccess(invoiceId, guardianId)
  let installment = null
  if (installmentId) {
    const { data, error } = await supabase.from('fee_installment').select('installment_id,invoice_id,guardian_id,amount_due,amount_paid,balance_due,status,installment_number').eq('installment_id', installmentId).eq('invoice_id', invoiceId).eq('guardian_id', guardianId).maybeSingle()
    if (error) throw error
    if (!data) throw new ApiError(404, 'Installment not found for this guardian and invoice')
    installment = data
  } else {
    const { count, error } = await supabase.from('fee_installment').select('installment_id', { count: 'exact', head: true }).eq('invoice_id', invoiceId).eq('guardian_id', guardianId)
    if (error) throw error
    if (count > 0) throw new ApiError(400, 'Choose a specific installment when an installment schedule exists')
  }

  const outstanding = installment ? Number(installment.balance_due || 0) : Math.max(Number(invoice.amount_due || 0) - Number(invoice.amount_paid || 0), 0)
  if (amount > outstanding) throw new ApiError(400, 'Payment amount cannot exceed the outstanding balance')
  return { invoice, installment, outstanding }
}

async function getAttemptForAuthorizedUser(merchantTransactionId, req) {
  const { data: attempt, error } = await supabase.from('cinetpay_payment_attempt').select('*,financial_record(invoice_id,student_id,amount_due,amount_paid,payment_status),fee_installment(installment_id,installment_number,amount_due,amount_paid,balance_due,status)').eq('merchant_transaction_id', merchantTransactionId).maybeSingle()
  if (error) throw error
  if (!attempt) throw new ApiError(404, 'CinetPay payment attempt not found')
  if (req.user.role === 'administrator') return attempt
  const guardian = await guardianForUser(req.user.user_id)
  if (attempt.payer_guardian_id !== guardian.guardian_id) throw new ApiError(403, 'You do not have permission to view this payment attempt')
  return attempt
}

async function settleAttempt(attempt, verified) {
  assertVerifiedPaymentMatchesAttempt(verified, attempt)
  const status = verified.status
  const { data, error } = await supabase.rpc('settle_cinetpay_payment_attempt', {
    p_payment_attempt_id: attempt.payment_attempt_id,
    p_status: status,
    p_cinetpay_transaction_id: verified.providerTransactionId || null,
    p_provider_response: safeProviderMetadata(verified.providerResponse),
    p_payment_method: 'Mobile money - CinetPay',
    p_paid_at: verified.paidAt || null,
    p_failure_reason: status === 'ACCEPTED' ? null : verified.rawStatus || null,
  })
  if (error) throw new ApiError(400, String(error.message || 'Unable to settle CinetPay payment').replace(/^ERROR:\s*/i, ''))
  return data
}

// CinetPay notification endpoint. It is intentionally public: CinetPay cannot
// present the user's bearer token. The notification is never trusted directly;
// the provider status is verified server-to-server before settlement.
router.post('/notify', asyncRoute(async (req, res) => {
  const merchantTransactionId = asText(req.body?.merchant_transaction_id || req.body?.transaction_id || req.query?.merchant_transaction_id || req.query?.transaction_id, 'merchant_transaction_id', { max: 100 })
  const { data: attempt, error } = await supabase.from('cinetpay_payment_attempt').select('*').eq('merchant_transaction_id', merchantTransactionId).maybeSingle()
  if (error) throw error
  if (!attempt) return res.status(404).json({ error: 'Payment attempt not found' })
  if (attempt.status === 'ACCEPTED') return res.status(200).json({ data: { status: 'ACCEPTED', merchant_transaction_id: merchantTransactionId } })

  const verified = await verifyCinetPayPayment(merchantTransactionId)
  const settlement = await settleAttempt(attempt, verified)
  return res.status(200).json({ data: { ...settlement, status: verified.status } })
}))

router.use(requireAuth)

router.post('/initialize', requireRole('guardian'), asyncRoute(async (req, res) => {
  const guardian = await guardianForUser(req.user.user_id)
  const invoiceId = asUuid(req.body?.invoice_id, 'invoice_id')
  const installmentId = req.body?.installment_id ? asUuid(req.body.installment_id, 'installment_id', { optional: true }) : null
  const amount = asXafAmount(req.body?.amount, 'amount', { positive: true })
  const description = asText(req.body?.description || 'School fee payment', 'description', { max: 180 })
  const { invoice, installment } = await resolvePaymentTarget({ invoiceId, installmentId, guardianId: guardian.guardian_id, amount })

  if (installmentId) {
    const { data: existing, error: existingError } = await supabase.from('cinetpay_payment_attempt').select('*').eq('installment_id', installmentId).in('status', ['PENDING', 'INITIATED']).maybeSingle()
    if (existingError) throw existingError
    if (existing) return sendData(res, { payment_attempt_id: existing.payment_attempt_id, merchant_transaction_id: existing.merchant_transaction_id, amount: existing.amount, status: existing.status, paymentToken: existing.provider_response?.paymentToken || null, paymentUrl: existing.payment_url || null, reusable: true })
  }

  const merchantTransactionId = `SMS-${Date.now()}-${randomUUID().replaceAll('-', '').slice(0, 12)}`
  const { data: attempt, error: attemptError } = await supabase.from('cinetpay_payment_attempt').insert({ merchant_transaction_id: merchantTransactionId, invoice_id: invoice.invoice_id, installment_id: installment?.installment_id || null, payer_guardian_id: guardian.guardian_id, amount, currency: 'XAF', status: 'PENDING' }).select('*').single()
  if (attemptError) throw attemptError

  try {
    const payment = await initializeCinetPayPayment({
      merchantTransactionId,
      amount,
      description,
      customer: { email: guardian.email, firstName: guardian.full_name?.split(' ')[0] || 'Guardian', lastName: guardian.full_name?.split(' ').slice(1).join(' ') || 'Parent' },
    })
    const { data: updated, error: updateError } = await supabase.from('cinetpay_payment_attempt').update({ status: 'INITIATED', payment_url: payment.paymentUrl, provider_response: { paymentToken: payment.paymentToken, ...safeProviderMetadata(payment.providerResponse) } }).eq('payment_attempt_id', attempt.payment_attempt_id).select('*').single()
    if (updateError) throw updateError
    return sendData(res, { payment_attempt_id: updated.payment_attempt_id, merchant_transaction_id: updated.merchant_transaction_id, amount: updated.amount, status: updated.status, paymentToken: payment.paymentToken, paymentUrl: payment.paymentUrl }, 201)
  } catch (error) {
    await supabase.from('cinetpay_payment_attempt').update({ status: 'ERROR', failure_reason: error.message?.slice(0, 500) || 'CinetPay initialization failed' }).eq('payment_attempt_id', attempt.payment_attempt_id)
    throw error
  }
}))

router.get('/status/:merchantTransactionId', asyncRoute(async (req, res) => {
  const merchantTransactionId = asText(req.params.merchantTransactionId, 'merchantTransactionId', { max: 100 })
  const attempt = await getAttemptForAuthorizedUser(merchantTransactionId, req)
  if (attempt.status === 'ACCEPTED' || ['REFUSED', 'EXPIRED', 'CANCELLED'].includes(attempt.status)) return sendData(res, attempt)
  const verified = await verifyCinetPayPayment(merchantTransactionId)
  await settleAttempt(attempt, verified)
  const refreshed = await getAttemptForAuthorizedUser(merchantTransactionId, req)
  return sendData(res, refreshed)
}))

export default router
