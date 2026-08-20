import express from 'express'
import { supabase } from '../supabaseClient.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ApiError, asText, asUuid, asyncRoute, sendData } from '../lib/api.js'
import { safeNotifyUsers, userIdsForAudience } from '../lib/notifications.js'

const router = express.Router()
router.use(requireAuth, requireRole('guardian'))

async function guardianIdForUser(userId) {
  const { data, error } = await supabase.from('guardian').select('guardian_id').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'Guardian profile not found')
  return data.guardian_id
}

async function assertLinkedStudent(studentId, userId) {
  const guardianId = await guardianIdForUser(userId)
  const { data, error } = await supabase.from('student_guardian').select('student_id').eq('guardian_id', guardianId).eq('student_id', studentId).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(403, 'You do not have permission to view this child')
  return guardianId
}

async function absenceDeadline() {
  const { data, error } = await supabase.from('absence_policy_setting').select('justification_deadline_days').eq('setting_id', 1).maybeSingle()
  if (error) throw error
  const days = Number(data?.justification_deadline_days || 3)
  const deadline = new Date()
  deadline.setUTCDate(deadline.getUTCDate() + days)
  return deadline.toISOString()
}

export function assertGuardianJustificationOpen({ status, justificationStatus, justification_status, deadlineAt, justification_deadline_at, now = new Date() }) {
  const currentStatus = justificationStatus ?? justification_status ?? 'PENDING'
  const currentDeadline = deadlineAt ?? justification_deadline_at
  if (status !== 'Absent') throw new ApiError(409, 'Only an absent attendance record can be justified')
  if (['APPROVED', 'UNJUSTIFIED', 'REJECTED'].includes(currentStatus)) throw new ApiError(409, 'This absence justification has already been reviewed')
  if (currentDeadline && new Date(now) > new Date(currentDeadline)) throw new ApiError(409, 'The deadline for this absence justification has expired')
}

const absenceSelect = 'attendance_id,student_id,session_id,session_date,status,justification_status,justification_text,justification_submitted_at,justification_deadline_at,justification_reviewed_at,justification_review_note,student(student_id,full_name),class_session(session_id,start_time,end_time,course(course_id,course_code,course_name))'

router.get('/children', asyncRoute(async (req, res) => {
  const guardianId = await guardianIdForUser(req.user.user_id)
  const { data, error } = await supabase.from('student_guardian').select('student_id,primary_contact,student(student_id,user_id,full_name,dob,phone,address)').eq('guardian_id', guardianId)
  if (error) throw error
  return sendData(res, data || [])
}))

router.get('/children/:studentId/absence-justifications', asyncRoute(async (req, res) => {
  const studentId = asUuid(req.params.studentId, 'studentId')
  await assertLinkedStudent(studentId, req.user.user_id)
  const { data, error } = await supabase.from('attendance').select(absenceSelect).eq('student_id', studentId).eq('status', 'Absent').order('session_date', { ascending: false }).limit(100)
  if (error) throw error
  return sendData(res, data || [])
}))

router.post('/children/:studentId/absence-justifications/:attendanceId', asyncRoute(async (req, res) => {
  const studentId = asUuid(req.params.studentId, 'studentId')
  const attendanceId = asUuid(req.params.attendanceId, 'attendanceId')
  await assertLinkedStudent(studentId, req.user.user_id)
  const justification_text = asText(req.body?.justification_text, 'justification_text', { max: 2000 })

  const { data: attendance, error: attendanceError } = await supabase.from('attendance')
    .select('attendance_id,student_id,status,justification_status,justification_deadline_at,session_date')
    .eq('attendance_id', attendanceId)
    .eq('student_id', studentId)
    .maybeSingle()
  if (attendanceError) throw attendanceError
  if (!attendance) throw new ApiError(404, 'Absence record not found')
  assertGuardianJustificationOpen(attendance)

  let deadline = attendance.justification_deadline_at
  if (!deadline) {
    deadline = await absenceDeadline()
    const { error: prepareError } = await supabase.from('attendance').update({
      justification_status: 'PENDING',
      justification_deadline_at: deadline,
      justification_submitted_at: null,
      justification_reviewed_at: null,
      justification_reviewed_by: null,
      justification_review_note: null,
      expired_notified_at: null,
    }).eq('attendance_id', attendanceId).eq('student_id', studentId).eq('status', 'Absent').is('justification_deadline_at', null)
    if (prepareError) throw prepareError
  }

  assertGuardianJustificationOpen({ ...attendance, deadlineAt: deadline })

  const { data, error } = await supabase.from('attendance').update({
    justification_status: 'SUBMITTED',
    justification_text,
    justification_submitted_at: new Date().toISOString(),
    expired_notified_at: null,
  }).eq('attendance_id', attendanceId).eq('student_id', studentId).eq('status', 'Absent').in('justification_status', ['PENDING', 'SUBMITTED']).select(absenceSelect).single()
  if (error) throw error

  const administrators = await userIdsForAudience('administrators')
  await safeNotifyUsers(administrators, {
    notification_type: 'guardian_absence_justification_submitted',
    title: 'Guardian absence justification submitted',
    body: `A guardian submitted an explanation for the absence recorded on ${data.session_date}.`,
    link_path: '/absence-justifications',
    event_key: `guardian-absence:${attendanceId}:submitted`,
  })

  return sendData(res, data)
}))

router.get('/children/:studentId', asyncRoute(async (req, res) => {
  const studentId = asUuid(req.params.studentId, 'studentId')
  await assertLinkedStudent(studentId, req.user.user_id)
  const [studentResult, enrollmentResult, attendanceResult, recordsResult, gradesResult, financeResult] = await Promise.all([
    supabase.from('student').select('student_id,full_name,dob,phone,address').eq('student_id', studentId).single(),
    supabase.from('enrollment').select('enrollment_id,academic_year,semester,status,enrolled_at,course(course_id,course_code,course_name,credit_units)').eq('student_id', studentId).order('enrolled_at', { ascending: false }),
    supabase.from('attendance').select('attendance_id,session_date,status,justification_status,justification_text,justification_submitted_at,justification_deadline_at,justification_reviewed_at,justification_review_note,session:class_session(session_id,start_time,academic_year,semester,course(course_code,course_name))').eq('student_id', studentId).order('session_date', { ascending: false }).limit(100),
    supabase.from('academic_record').select('record_id,score,grade,evaluation_date,published,assessment(assessment_id,title,assessment_type,max_score,weight,academic_year,semester,course(course_code,course_name))').eq('student_id', studentId).eq('published', true).order('updated_at', { ascending: false }),
    supabase.from('final_grade').select('final_grade_id,course_id,academic_year,semester,computed_score,letter_grade,gpa,course(course_code,course_name)').eq('student_id', studentId),
    supabase.from('financial_record').select('invoice_id,amount_due,amount_paid,payment_status,due_date,created_at').eq('student_id', studentId).order('created_at', { ascending: false }),
  ])
  const failed = [studentResult, enrollmentResult, attendanceResult, recordsResult, gradesResult, financeResult].find((item) => item.error)
  if (failed) throw failed.error

  const financialRecords = financeResult.data || []
  const invoiceIds = financialRecords.map((invoice) => invoice.invoice_id)
  let installments = []
  let payments = []
  if (invoiceIds.length) {
    const guardianId = await guardianIdForUser(req.user.user_id)
    const [installmentResult, paymentResult] = await Promise.all([
      supabase.from('fee_installment').select('installment_id,invoice_id,installment_number,guardian_id,amount_due,amount_paid,balance_due,due_date,status,guardian(guardian_id,full_name,email)').in('invoice_id', invoiceIds).eq('guardian_id', guardianId).order('installment_number'),
      supabase.from('payment_record').select('payment_id,invoice_id,installment_id,payer_guardian_id,amount,payment_method,receipt_number,payment_reference,notes,paid_at,created_at').in('invoice_id', invoiceIds).eq('payer_guardian_id', guardianId).order('paid_at', { ascending: false }),
    ])
    if (installmentResult.error) throw installmentResult.error
    if (paymentResult.error) throw paymentResult.error
    installments = installmentResult.data || []
    payments = paymentResult.data || []
  }

  const financialWithInstallments = financialRecords.map((invoice) => {
    const invoiceInstallments = installments.filter((item) => item.invoice_id === invoice.invoice_id)
    const invoicePayments = payments.filter((payment) => payment.invoice_id === invoice.invoice_id)
    const installmentTotalDue = invoiceInstallments.reduce((sum, item) => sum + Number(item.amount_due || 0), 0)
    const installmentPaid = invoiceInstallments.reduce((sum, item) => sum + Number(item.amount_paid || 0), 0)
    return {
      ...invoice,
      installments: invoiceInstallments,
      payments: invoicePayments,
      installment_total_due: installmentTotalDue,
      installment_paid: installmentPaid,
      unallocated_paid: Math.max(Number(invoice.amount_paid || 0) - installmentPaid, 0),
    }
  })
  return sendData(res, { student: studentResult.data, enrollments: enrollmentResult.data || [], attendance: attendanceResult.data || [], academic_records: recordsResult.data || [], final_grades: gradesResult.data || [], financial_records: financialWithInstallments })
}))

export default router
