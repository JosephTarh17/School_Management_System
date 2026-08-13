<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><p class="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Guardian Portal</p><h1 class="mt-1 text-2xl font-bold text-slate-950">Children overview</h1><p class="mt-1 text-sm text-slate-500">View information only for children linked to your guardian account.</p></div>
      <label class="text-sm text-slate-700">Selected child<select v-model="selectedStudentId" class="mt-1 block min-w-64 rounded-lg border px-3 py-2 text-sm"><option value="">Select a child</option><option v-for="child in children" :key="child.student_id" :value="child.student_id">{{ child.student?.full_name || child.full_name }}</option></select></label>
    </header>
    <p v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{{ errorMessage }}</p>
    <div v-if="loading" class="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading linked children…</div>
    <div v-else-if="!children.length" class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">No linked children are available for this account. Contact an administrator to establish the relationship.</div>
    <template v-else-if="summary">
      <div v-if="alerts.length" class="rounded-xl border border-amber-200 bg-amber-50 p-4"><div class="mb-2 flex items-center justify-between"><h2 class="font-bold text-amber-900">Attendance alerts</h2><span class="text-xs text-amber-700">Review with the school</span></div><div v-for="alert in alerts" :key="alert.alert_id" class="flex flex-col gap-2 border-t border-amber-200 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span class="text-amber-900">{{ alert.message }}</span><button @click="acknowledge(alert.alert_id)" class="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white">Acknowledge</button></div></div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"><div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p class="text-xs text-slate-500">Child</p><p class="mt-1 font-bold text-slate-900">{{ summary.student.full_name }}</p></div><div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p class="text-xs text-slate-500">Active courses</p><p class="mt-1 text-2xl font-bold text-indigo-700">{{ activeEnrollments.length }}</p></div><div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p class="text-xs text-slate-500">Published grades</p><p class="mt-1 text-2xl font-bold text-emerald-700">{{ summary.final_grades.length }}</p></div><div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p class="text-xs text-slate-500">Attendance records</p><p class="mt-1 text-2xl font-bold text-amber-700">{{ summary.attendance.length }}</p></div></div>
      <div class="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 class="mb-4 font-bold text-slate-900">Enrollment and final grades</h2><div v-if="!activeEnrollments.length" class="text-sm text-slate-500">No enrollment records available.</div><div v-for="entry in activeEnrollments" :key="entry.enrollment_id" class="flex items-center justify-between border-b py-3 last:border-0"><div><p class="font-semibold text-slate-900">{{ entry.course?.course_code }} — {{ entry.course?.course_name }}</p><p class="text-xs text-slate-500">{{ entry.status }}</p></div><span class="font-bold text-indigo-700">{{ gradeFor(entry.course_id) }}</span></div></div>
        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 class="mb-4 font-bold text-slate-900">Published assessment results</h2><div v-if="!summary.academic_records.length" class="text-sm text-slate-500">No published assessment results available.</div><div v-for="record in summary.academic_records" :key="record.record_id" class="flex items-center justify-between border-b py-3 last:border-0"><div><p class="font-semibold text-slate-900">{{ record.assessment?.title }}</p><p class="text-xs text-slate-500">{{ record.assessment?.course?.course_code }} · {{ record.evaluation_date || 'Date not recorded' }}</p></div><span class="font-bold text-emerald-700">{{ record.score }}/{{ record.assessment?.max_score }} ({{ record.grade }})</span></div></div>
        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 class="mb-4 font-bold text-slate-900">Attendance history</h2><div v-if="!summary.attendance.length" class="text-sm text-slate-500">No attendance records available.</div><div v-for="entry in summary.attendance.slice(0, 12)" :key="entry.attendance_id" class="flex items-center justify-between border-b py-2 text-sm last:border-0"><span>{{ entry.session?.course?.course_code || 'Course' }} · {{ entry.session_date }}</span><span :class="entry.status === 'Present' ? 'text-emerald-700' : 'text-red-700'" class="font-semibold">{{ entry.status }}</span></div></div>
        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 class="mb-4 font-bold text-slate-900">Financial status and installments</h2>
          <div v-if="!summary.financial_records.length" class="text-sm text-slate-500">No financial records available.</div>
          <div v-for="invoice in summary.financial_records" :key="invoice.invoice_id" class="border-b py-4 last:border-0">
            <div class="flex items-center justify-between gap-4">
              <div><p class="font-semibold text-slate-900">Invoice {{ invoice.invoice_id.slice(0, 8) }}</p><p class="text-xs text-slate-500">Due {{ invoice.due_date || 'Not specified' }}</p></div>
              <div class="text-right"><p class="font-bold text-slate-900">{{ formatXaf(invoice.amount_paid) }} / {{ formatXaf(invoice.amount_due) }}</p><p class="text-xs text-slate-500">Balance {{ formatXaf(invoice.balance_due ?? Math.max(Number(invoice.amount_due || 0) - Number(invoice.amount_paid || 0), 0)) }} · {{ invoice.payment_status }}</p></div>
            </div>
            <div v-if="invoice.installments?.length" class="mt-4 rounded-lg bg-slate-50 p-3">
              <div class="mb-2 flex items-center justify-between"><h3 class="text-xs font-bold uppercase tracking-wide text-slate-600">Guardian-paid installment schedule</h3><span class="text-[11px] text-slate-500">{{ invoice.installments.length }} installment(s)</span></div>
              <div v-for="installment in invoice.installments" :key="installment.installment_id" class="flex flex-col gap-1 border-t border-slate-200 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                <div><p class="font-semibold text-slate-800">Installment {{ installment.installment_number }} · Due {{ installment.due_date }}</p><p class="text-slate-500">Payer: {{ installment.guardian?.full_name || 'Linked guardian' }}</p></div>
                <div class="text-left sm:text-right"><p class="font-semibold text-slate-800">{{ formatXaf(installment.amount_paid) }} / {{ formatXaf(installment.amount_due) }}</p><p class="text-slate-500">Balance {{ formatXaf(installment.balance_due) }} · {{ installment.status }}</p></div>
              </div>
            </div>
            <div v-if="invoice.payments?.length" class="mt-3 border-t border-dashed border-slate-200 pt-3"><h3 class="text-xs font-bold uppercase tracking-wide text-slate-600">Payment history</h3><div v-for="payment in invoice.payments" :key="payment.payment_id" class="flex items-center justify-between py-1.5 text-xs"><span class="text-slate-500">{{ payment.receipt_number }} · {{ payment.payment_method }} · {{ payment.paid_at ? new Date(payment.paid_at).toLocaleDateString() : 'Date unavailable' }}</span><strong class="text-emerald-700">{{ formatXaf(payment.amount) }}</strong></div></div>
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
import { acknowledgeAttendanceAlert, fetchAttendanceAlerts, fetchGuardianChildSummary, fetchGuardianChildren } from '../api.js'
import { formatXaf } from '../lib/formatters.js'
const children = ref([])
const selectedStudentId = ref('')
const summary = ref(null)
const loading = ref(true)
const errorMessage = ref('')
const alerts = ref([])
const token = () => authStore.token.value
const activeEnrollments = computed(() => (summary.value?.enrollments || []).filter((entry) => entry.status === 'active'))
function gradeFor(courseId) { return summary.value?.final_grades?.find((grade) => grade.course_id === courseId)?.letter_grade || 'Pending' }
async function loadSummary() { if (!selectedStudentId.value) return; const result = await fetchGuardianChildSummary(token(), selectedStudentId.value); if (!result.ok) errorMessage.value = result.error; else summary.value = result.data }
async function loadAlerts() { const result = await fetchAttendanceAlerts(token()); if (result.ok) alerts.value = result.data || [] }
async function acknowledge(alertId) { const result = await acknowledgeAttendanceAlert(token(), alertId); if (!result.ok) errorMessage.value = result.error; else alerts.value = alerts.value.filter((alert) => alert.alert_id !== alertId) }
watch(selectedStudentId, loadSummary)
onMounted(async () => { const [result] = await Promise.all([fetchGuardianChildren(token()), loadAlerts()]); if (!result.ok) errorMessage.value = result.error; else { children.value = result.data || []; selectedStudentId.value = children.value[0]?.student_id || '' } loading.value = false })
</script>
