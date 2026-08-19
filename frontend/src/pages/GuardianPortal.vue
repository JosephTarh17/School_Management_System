<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><p class="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Guardian Portal</p><h1 class="mt-1 text-2xl font-bold text-slate-950">Children overview</h1><p class="mt-1 text-sm text-slate-500">View information and pay fees for children linked to your guardian account.</p></div>
      <label class="w-full text-sm text-slate-700 sm:w-auto">Selected child<select v-model="selectedStudentId" class="mt-1 block w-full rounded-lg border px-3 py-2 text-sm sm:min-w-64 sm:w-auto"><option value="">Select a child</option><option v-for="child in children" :key="child.student_id" :value="child.student_id">{{ child.student?.full_name || child.full_name }}</option></select></label>
    </header>
    <p v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{{ errorMessage }}</p>
    <p v-if="paymentMessage" :class="paymentMessageType === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : paymentMessageType === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-indigo-200 bg-indigo-50 text-indigo-800'" class="rounded-lg border px-4 py-3 text-sm" role="status">{{ paymentMessage }}</p>
    <div v-if="loading" class="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading linked children…</div>
    <div v-else-if="!children.length" class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">No linked children are available for this account. Contact an administrator to establish the relationship.</div>
    <template v-else-if="summary">
      <div v-if="alerts.length" class="rounded-xl border border-amber-200 bg-amber-50 p-4"><div class="mb-2 flex items-center justify-between"><h2 class="font-bold text-amber-900">Attendance alerts</h2><span class="text-xs text-amber-700">Review with the school</span></div><div v-for="alert in alerts" :key="alert.alert_id" class="flex flex-col gap-2 border-t border-amber-200 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span class="text-amber-900">{{ alert.message }}</span><button @click="acknowledge(alert.alert_id)" class="btn-secondary px-3 py-1.5 text-xs font-semibold">Acknowledge</button></div></div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"><div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p class="text-xs text-slate-500">Child</p><p class="mt-1 font-bold text-slate-900">{{ summary.student.full_name }}</p></div><div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p class="text-xs text-slate-500">{{ pluralize(activeEnrollments.length, 'Active course', 'Active courses') }}</p><p class="mt-1 text-2xl font-bold text-indigo-700">{{ activeEnrollments.length }}</p></div><div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p class="text-xs text-slate-500">{{ pluralize(summary.final_grades.length, 'Published grade', 'Published grades') }}</p><p class="mt-1 text-2xl font-bold text-emerald-700">{{ summary.final_grades.length }}</p></div><div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p class="text-xs text-slate-500">{{ pluralize(summary.attendance.length, 'Attendance record', 'Attendance records') }}</p><p class="mt-1 text-2xl font-bold text-amber-700">{{ summary.attendance.length }}</p></div></div>
      <div class="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 class="mb-4 font-bold text-slate-900">Enrollment and final grades</h2><div v-if="!activeEnrollments.length" class="text-sm text-slate-500">No enrollment records available.</div><div v-for="entry in activeEnrollments" :key="entry.enrollment_id" class="flex flex-col items-start gap-1 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div><p class="font-semibold text-slate-900">{{ entry.course?.course_code }} — {{ entry.course?.course_name }}</p><p class="text-xs text-slate-500">{{ entry.academic_year }} · {{ entry.semester }} · {{ entry.status }}</p></div><span class="font-bold text-indigo-700">{{ gradeFor(entry.course_id, entry.academic_year, entry.semester) }}</span></div></div>
        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 class="mb-4 font-bold text-slate-900">Published assessment results</h2><div v-if="!summary.academic_records.length" class="text-sm text-slate-500">No published assessment results available.</div><div v-for="record in summary.academic_records" :key="record.record_id" class="flex flex-col items-start gap-1 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div><p class="font-semibold text-slate-900">{{ record.assessment?.title }}</p><p class="text-xs text-slate-500">{{ record.assessment?.course?.course_code }} · {{ record.assessment?.academic_year }} · {{ record.assessment?.semester }} · {{ record.evaluation_date || 'Date not recorded' }}</p></div><span class="font-bold text-emerald-700">{{ record.score }}/{{ record.assessment?.max_score }} ({{ record.grade }})</span></div></div>
        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 class="mb-4 font-bold text-slate-900">Attendance history</h2><div v-if="!summary.attendance.length" class="text-sm text-slate-500">No attendance records available.</div><div v-for="entry in summary.attendance.slice(0, 12)" :key="entry.attendance_id" class="flex items-start justify-between gap-3 border-b py-2 text-sm last:border-0"><span>{{ entry.session?.course?.course_code || 'Course' }} · {{ entry.session_date }}</span><span :class="entry.status === 'Present' ? 'text-emerald-700' : 'text-red-700'" class="font-semibold">{{ entry.status }}</span></div></div>
        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 class="mb-4 font-bold text-slate-900">Financial status and installments</h2>
          <div v-if="!summary.financial_records.length" class="text-sm text-slate-500">No financial records available.</div>
          <div v-for="invoice in summary.financial_records" :key="invoice.invoice_id" class="border-b py-4 last:border-0">
            <div class="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div><p class="font-semibold text-slate-900">Invoice {{ invoice.invoice_id.slice(0, 8) }}</p><p class="text-xs text-slate-500">Due {{ invoice.due_date || 'Not specified' }}</p></div>
              <div class="flex w-full flex-col gap-2 text-left sm:w-auto sm:items-end sm:text-right"><div><p class="break-words font-bold text-slate-900">{{ formatXaf(invoice.amount_paid) }} / {{ formatXaf(invoice.amount_due) }}</p><p class="text-xs text-slate-500">Balance {{ formatXaf(invoiceBalance(invoice)) }} · {{ invoice.payment_status }}</p></div><button v-if="!invoice.installments?.length && invoiceBalance(invoice) > 0" type="button" :disabled="isPaymentLoading(invoice.invoice_id)" @click="startCinetPayPayment(invoice)" class="btn-primary px-3 py-2 text-xs font-semibold">{{ isPaymentLoading(invoice.invoice_id) ? 'Opening payment…' : `Pay ${formatXaf(invoiceBalance(invoice))} with CinetPay` }}</button></div>
            </div>
            <div v-if="invoice.installment_total_due" class="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2 text-xs"><div class="flex flex-wrap justify-between gap-2"><span class="font-semibold text-indigo-900">Installment schedule total: {{ formatXaf(invoice.installment_total_due) }}</span><span class="text-indigo-700">Allocated: {{ formatXaf(invoice.installment_paid) }}</span></div><p v-if="invoice.unallocated_paid" class="mt-1 text-indigo-700">Unallocated invoice payment: {{ formatXaf(invoice.unallocated_paid) }}. Contact the administrator to allocate it to an installment.</p></div>
            <div v-if="invoice.installments?.length" class="mt-4 rounded-lg bg-slate-50 p-3">
              <div class="mb-2 flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between"><h3 class="text-xs font-bold uppercase tracking-wide text-slate-600">Guardian-paid installment schedule</h3><span class="text-[11px] text-slate-500">{{ countLabel(invoice.installments.length, 'installment') }}</span></div>
              <div v-for="installment in invoice.installments" :key="installment.installment_id" class="flex flex-col gap-2 border-t border-slate-200 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                <div><p class="font-semibold text-slate-800">Installment {{ installment.installment_number }} · Due {{ installment.due_date }}</p><p class="text-slate-500">Payer: {{ installment.guardian?.full_name || 'Linked guardian' }}</p><p class="text-slate-500">{{ formatXaf(installment.amount_paid) }} / {{ formatXaf(installment.amount_due) }} · Balance {{ formatXaf(installment.balance_due) }} · {{ installment.status }}</p></div>
                <button v-if="Number(installment.balance_due || 0) > 0" type="button" :disabled="isPaymentLoading(installment.installment_id)" @click="startCinetPayPayment(invoice, installment)" class="btn-primary px-3 py-2 text-xs font-semibold">{{ isPaymentLoading(installment.installment_id) ? 'Opening payment…' : `Pay ${formatXaf(installment.balance_due)} with CinetPay` }}</button>
              </div>
            </div>
            <div v-if="invoice.payments?.length" class="mt-3 border-t border-dashed border-slate-200 pt-3"><h3 class="text-xs font-bold uppercase tracking-wide text-slate-600">Payment history</h3><div v-for="payment in invoice.payments" :key="payment.payment_id" class="flex flex-col items-start gap-1 py-1.5 text-xs sm:flex-row sm:items-center sm:justify-between"><span class="text-slate-500">{{ payment.receipt_number }} · {{ payment.payment_method }} · {{ payment.paid_at ? new Date(payment.paid_at).toLocaleDateString() : 'Date unavailable' }}</span><strong class="text-emerald-700">{{ formatXaf(payment.amount) }}</strong></div></div>
            <p v-if="invoice.last_payment_at" class="mt-2 text-xs text-slate-400">Last payment {{ new Date(invoice.last_payment_at).toLocaleDateString() }}</p>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { authStore } from '../store/auth'
import { acknowledgeAttendanceAlert, fetchAttendanceAlerts, fetchCinetPayStatus, fetchGuardianChildSummary, fetchGuardianChildren, initializeCinetPayPayment } from '../api.js'
import { countLabel, formatXaf, pluralize } from '../lib/formatters.js'

const children = ref([])
const selectedStudentId = ref('')
const summary = ref(null)
const loading = ref(true)
const errorMessage = ref('')
const alerts = ref([])
const paymentLoadingKey = ref('')
const paymentMessage = ref('')
const paymentMessageType = ref('info')
const cinetPayEnvironment = import.meta.env.VITE_CINETPAY_ENVIRONMENT || 'sandbox'
const token = () => authStore.token.value
const activeEnrollments = computed(() => (summary.value?.enrollments || []).filter((entry) => entry.status === 'active'))
function gradeFor(courseId, academicYear, semester) { return summary.value?.final_grades?.find((grade) => grade.course_id === courseId && grade.academic_year === academicYear && grade.semester === semester)?.letter_grade || 'Pending' }
function invoiceBalance(invoice) { return Math.max(Number(invoice.amount_due || 0) - Number(invoice.amount_paid || 0), 0) }
function paymentKey(invoice, installment) { return installment?.installment_id || `${invoice.invoice_id}:invoice` }
function isPaymentLoading(key) { return paymentLoadingKey.value === key }
function showPaymentMessage(message, type = 'info') { paymentMessage.value = message; paymentMessageType.value = type }
async function loadSummary() { if (!selectedStudentId.value) return; const result = await fetchGuardianChildSummary(token(), selectedStudentId.value); if (!result.ok) errorMessage.value = result.error; else summary.value = result.data }
async function loadAlerts() { const result = await fetchAttendanceAlerts(token()); if (result.ok) alerts.value = result.data || [] }
async function acknowledge(alertId) { const result = await acknowledgeAttendanceAlert(token(), alertId); if (!result.ok) errorMessage.value = result.error; else alerts.value = alerts.value.filter((alert) => alert.alert_id !== alertId) }

async function refreshCinetPayStatus(merchantTransactionId) {
  const result = await fetchCinetPayStatus(token(), merchantTransactionId)
  if (!result.ok) throw new Error(result.error || 'Unable to verify payment status.')
  return result.data
}

async function completeCinetPayPayment(merchantTransactionId) {
  const result = await refreshCinetPayStatus(merchantTransactionId)
  if (result.status === 'ACCEPTED') {
    showPaymentMessage('Payment accepted. Your fee balance is being refreshed.', 'success')
    await loadSummary()
    return
  }
  if (['REFUSED', 'EXPIRED', 'CANCELLED'].includes(result.status)) showPaymentMessage(`CinetPay payment status: ${result.status.toLowerCase()}.`, 'error')
  else showPaymentMessage('Payment is still pending. You can refresh this page to check again.', 'info')
}

async function startCinetPayPayment(invoice, installment = null) {
  const key = paymentKey(invoice, installment)
  if (paymentLoadingKey.value) return
  const amount = installment ? Number(installment.balance_due || 0) : invoiceBalance(invoice)
  if (!Number.isInteger(amount) || amount <= 0) { showPaymentMessage('There is no payable whole-number XAF balance for this item.', 'error'); return }
  if (!window.CinetPaySeamless) { showPaymentMessage('The CinetPay payment component is not available. Refresh the page and try again.', 'error'); return }
  paymentLoadingKey.value = key
  showPaymentMessage('Preparing the secure CinetPay payment window…')
  try {
    const initialized = await initializeCinetPayPayment(token(), { invoice_id: invoice.invoice_id, installment_id: installment?.installment_id || null, amount, description: installment ? `School fee installment ${installment.installment_number}` : 'School fee balance' })
    if (!initialized.ok) throw new Error(initialized.error || 'Unable to initialize CinetPay payment.')
    const payment = initialized.data
    const handleSuccess = () => completeCinetPayPayment(payment.merchant_transaction_id).catch((error) => showPaymentMessage(error.message, 'error'))
    window.CinetPaySeamless.open({
      paymentToken: payment.paymentToken,
      paymentUrl: payment.paymentUrl,
      environment: cinetPayEnvironment,
      statusPollInterval: 3000,
      checkStatus: () => refreshCinetPayStatus(payment.merchant_transaction_id),
      onPaymentSuccess: handleSuccess,
      onPaymentFailed: () => showPaymentMessage('CinetPay refused the payment.', 'error'),
      onPaymentPending: () => showPaymentMessage('Payment is pending confirmation. Please keep this page open or refresh later.', 'info'),
      onClose: ({ status } = {}) => { if (!['ACCEPTED', 'REFUSED'].includes(status)) showPaymentMessage('CinetPay payment window closed. Verify the status before trying again.', 'info') },
      onError: (error) => showPaymentMessage(error?.message || 'CinetPay could not open the payment window.', 'error'),
    })
  } catch (error) {
    showPaymentMessage(error.message || 'Unable to initialize the CinetPay payment.', 'error')
  } finally {
    paymentLoadingKey.value = ''
  }
}

watch(selectedStudentId, loadSummary)
onMounted(async () => { const [result] = await Promise.all([fetchGuardianChildren(token()), loadAlerts()]); if (!result.ok) errorMessage.value = result.error; else { children.value = result.data || []; selectedStudentId.value = children.value[0]?.student_id || '' } loading.value = false })
</script>
