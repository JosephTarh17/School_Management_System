<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Guardian Portal</p>
        <h1 class="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">Children overview</h1>
        <p class="mt-1 max-w-2xl text-sm text-slate-500">Monitor linked children, review school operations, and keep up with published information.</p>
      </div>
      <label class="w-full text-sm font-semibold text-slate-700 lg:w-auto">
        Selected child
        <select v-model="selectedStudentId" class="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 lg:min-w-72">
          <option value="">Select a child</option>
          <option v-for="child in children" :key="child.student_id" :value="child.student_id">{{ child.student?.full_name || child.full_name }}</option>
        </select>
      </label>
    </header>

    <p v-if="errorMessage" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{{ errorMessage }}</p>
    <p v-if="successMessage" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{{ successMessage }}</p>

    <div v-if="loading" class="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading linked children…</div>
    <div v-else-if="!children.length" class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-600">No linked children are available for this account. Contact an administrator to establish the relationship.</div>

    <template v-else-if="summary">
      <section v-if="alerts.length" class="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
        <div class="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><h2 class="font-bold text-amber-950">Attendance alerts</h2><span class="text-xs text-amber-800">Review with the school</span></div>
        <div v-for="alert in alerts" :key="alert.alert_id" class="flex flex-col gap-3 border-t border-amber-200 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span class="text-amber-950">{{ alert.message }}</span><button type="button" class="btn-secondary px-3 py-1.5 text-xs font-semibold" @click="acknowledge(alert.alert_id)">Acknowledge</button></div>
      </section>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p class="text-xs text-slate-500">Child</p><p class="mt-1 truncate font-bold text-slate-900">{{ summary.student.full_name }}</p></article>
        <article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p class="text-xs text-slate-500">Active courses</p><p class="mt-1 text-2xl font-bold text-indigo-700">{{ activeEnrollments.length }}</p></article>
        <article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p class="text-xs text-slate-500">Balance due</p><p class="mt-1 text-2xl font-bold text-amber-700">{{ formatXaf(totalBalance) }}</p></article>
        <article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p class="text-xs text-slate-500">Upcoming lessons</p><p class="mt-1 text-2xl font-bold text-indigo-700">{{ schedule.length }}</p></article>
        <article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p class="text-xs text-slate-500">Unread notifications</p><p class="mt-1 text-2xl font-bold text-emerald-700">{{ unreadNotifications }}</p></article>
      </div>

      <div class="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
        <section class="rounded-xl border border-rose-200 bg-white p-5 shadow-sm sm:p-6">
          <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h2 class="font-bold text-slate-900">Absence justifications</h2><p class="mt-1 text-xs text-slate-500">Submit an explanation before the administrator-defined deadline.</p></div><span class="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">{{ openAbsenceCount }} open</span></div>
          <div v-if="absenceLoading" class="py-6 text-center text-sm text-slate-500">Loading absence records…</div>
          <div v-else-if="!absenceRecords.length" class="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">No absence records are available for this child.</div>
          <div v-else class="space-y-3"><article v-for="record in absenceRecords" :key="record.attendance_id" class="rounded-lg border border-slate-200 bg-slate-50 p-4"><div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p class="font-semibold text-slate-900">{{ record.class_session?.course?.course_code || 'Course' }} · {{ formatDate(record.session_date) }}</p><p class="mt-1 text-xs text-slate-500">Status: {{ record.justification_status || 'PENDING' }} · Deadline: {{ formatDate(record.justification_deadline_at) }}</p></div><span :class="justificationClass(record.justification_status)" class="w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold">{{ record.justification_status || 'PENDING' }}</span></div><p v-if="record.justification_text" class="mt-3 rounded-md bg-white px-3 py-2 text-sm text-slate-700">{{ record.justification_text }}</p><p v-if="record.justification_review_note" class="mt-2 text-xs text-slate-500">Review note: {{ record.justification_review_note }}</p><div v-if="canSubmitJustification(record)" class="mt-3 space-y-2"><textarea v-model="absenceDrafts[record.attendance_id]" rows="3" maxlength="2000" class="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" placeholder="Explain the reason for the absence."></textarea><button type="button" class="btn-primary px-3 py-2 text-xs font-semibold" :disabled="submittingAttendanceId === record.attendance_id" @click="submitAbsence(record)">{{ submittingAttendanceId === record.attendance_id ? 'Submitting…' : 'Submit justification' }}</button></div></article></div>
        </section>

        <section class="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
          <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h2 class="font-bold text-slate-900">Notifications</h2><p class="mt-1 text-xs text-slate-500">Important notices for your guardian account.</p></div><button v-if="unreadNotifications" type="button" class="btn-secondary px-3 py-1.5 text-xs font-semibold" @click="markAllRead">Mark all read</button></div>
          <div v-if="notificationsLoading" class="py-6 text-center text-sm text-slate-500">Loading notifications…</div>
          <div v-else-if="!notifications.length" class="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">No notifications yet.</div>
          <div v-else class="space-y-2"><article v-for="notification in notifications" :key="notification.notification_id" :class="notification.read_at ? 'bg-slate-50' : 'border-indigo-200 bg-indigo-50/60'" class="rounded-lg border border-slate-200 p-3"><div class="flex items-start justify-between gap-3"><div><p class="font-semibold text-slate-900">{{ notification.title }}</p><p class="mt-1 text-sm text-slate-600">{{ notification.body }}</p><p class="mt-2 text-[11px] text-slate-400">{{ formatDateTime(notification.created_at) }}</p></div><button v-if="!notification.read_at" type="button" class="btn-ghost shrink-0 px-2 py-1 text-[11px] font-semibold" @click="markRead(notification)">Mark read</button></div></article></div>
        </section>

        <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
          <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h2 class="font-bold text-slate-900">Fees and receipts</h2><p class="mt-1 text-xs text-slate-500">Read-only view of existing manual finance records.</p></div><span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Online payment unavailable</span></div>
          <div v-if="!summary.financial_records.length" class="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">No financial records are available.</div>
          <div v-for="invoice in summary.financial_records" :key="invoice.invoice_id" class="border-b border-slate-100 py-4 last:border-0"><div class="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p class="font-semibold text-slate-900">Invoice {{ invoice.invoice_id.slice(0, 8) }}</p><p class="text-xs text-slate-500">Due {{ invoice.due_date || 'Not specified' }}</p></div><div class="text-left sm:text-right"><p class="font-bold text-slate-900">{{ formatXaf(invoice.amount_paid) }} / {{ formatXaf(invoice.amount_due) }}</p><p class="text-xs text-slate-500">Balance {{ formatXaf(invoiceBalance(invoice)) }} · {{ invoice.payment_status }}</p></div></div><div v-if="invoice.installments?.length" class="mt-3 rounded-lg bg-slate-50 p-3"><div class="mb-2 flex flex-wrap items-center justify-between gap-2"><h3 class="text-xs font-bold uppercase tracking-wide text-slate-600">Installment schedule</h3><span class="text-[11px] text-slate-500">{{ countLabel(invoice.installments.length, 'installment') }}</span></div><div v-for="installment in invoice.installments" :key="installment.installment_id" class="border-t border-slate-200 py-2 text-xs"><p class="font-semibold text-slate-800">Installment {{ installment.installment_number }} · Due {{ installment.due_date }}</p><p class="text-slate-500">{{ formatXaf(installment.amount_paid) }} / {{ formatXaf(installment.amount_due) }} · Balance {{ formatXaf(installment.balance_due) }} · {{ installment.status }}</p></div></div><div v-if="invoice.payments?.length" class="mt-3 border-t border-dashed border-slate-200 pt-3"><h3 class="text-xs font-bold uppercase tracking-wide text-slate-600">Manual receipt history</h3><div v-for="payment in invoice.payments" :key="payment.payment_id" class="flex flex-col items-start gap-1 py-1.5 text-xs sm:flex-row sm:items-center sm:justify-between"><span class="text-slate-500">{{ payment.receipt_number }} · {{ payment.payment_method }} · {{ payment.paid_at ? formatDate(payment.paid_at) : 'Date unavailable' }}</span><strong class="text-emerald-700">{{ formatXaf(payment.amount) }}</strong></div></div></div>
        </section>

        <section class="rounded-xl border border-indigo-200 bg-white p-5 shadow-sm sm:p-6">
          <div class="mb-4 flex items-start justify-between gap-3"><div><h2 class="font-bold text-slate-900">Linked-child timetable</h2><p class="mt-1 text-xs text-slate-500">Published lessons for the selected child.</p></div><RouterLink to="/timetables" class="btn-secondary px-3 py-2 text-xs font-semibold">Open timetable</RouterLink></div>
          <div v-if="scheduleLoading" class="py-6 text-center text-sm text-slate-500">Loading timetable…</div>
          <div v-else-if="!schedule.length" class="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">No published lessons are available for this child.</div>
          <div v-else class="space-y-2"><article v-for="entry in schedule.slice(0, 8)" :key="entry.occurrence_id" class="rounded-lg border border-slate-100 bg-slate-50 p-3"><div class="flex items-start justify-between gap-3"><div><p class="font-semibold text-slate-900">{{ entry.course?.course_code || 'Course' }} · {{ formatDate(entry.occurrence_date) }}</p><p class="mt-1 text-xs text-slate-500">{{ formatDateTime(entry.start_at) }}–{{ formatTime(entry.end_at) }}</p></div><span class="text-xs font-semibold text-indigo-700">{{ entry.room?.room_name || 'Location pending' }}</span></div><p class="mt-2 text-xs text-slate-500">{{ entry.course?.course_name || 'Course' }} · {{ entry.teacher?.full_name || 'Teacher' }}</p></article></div>
        </section>

        <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div class="mb-4 flex items-start justify-between gap-3"><div><h2 class="font-bold text-slate-900">Calendar and events</h2><p class="mt-1 text-xs text-slate-500">Published events permitted for this child and guardian audience.</p></div><RouterLink to="/calendar" class="btn-secondary px-3 py-2 text-xs font-semibold">Open calendar</RouterLink></div>
          <div v-if="calendarLoading" class="py-6 text-center text-sm text-slate-500">Loading calendar…</div>
          <div v-else-if="!calendarEvents.length" class="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">No published events are available.</div>
          <div v-else class="space-y-2"><article v-for="event in calendarEvents.slice(0, 8)" :key="`${event.source}-${event.id}`" class="rounded-lg border border-slate-100 bg-slate-50 p-3"><p class="font-semibold text-slate-900">{{ event.title }}</p><p class="mt-1 text-xs text-slate-500">{{ formatDateTime(event.start_at) }} · {{ event.subtitle || event.category || 'School event' }}</p><p v-if="event.description" class="mt-2 line-clamp-2 text-sm text-slate-600">{{ event.description }}</p></article></div>
        </section>

        <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div class="mb-4 flex items-start justify-between gap-3"><div><h2 class="font-bold text-slate-900">School announcements</h2><p class="mt-1 text-xs text-slate-500">Published notices for guardians and the school community.</p></div><RouterLink to="/announcements" class="btn-secondary px-3 py-2 text-xs font-semibold">Open announcements</RouterLink></div>
          <div v-if="announcementsLoading" class="py-6 text-center text-sm text-slate-500">Loading announcements…</div>
          <div v-else-if="!announcements.length" class="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">No published announcements are available.</div>
          <div v-else class="space-y-2"><article v-for="announcement in announcements.slice(0, 6)" :key="announcement.announcement_id" class="rounded-lg border border-slate-100 bg-slate-50 p-3"><div class="flex items-start justify-between gap-3"><p class="font-semibold text-slate-900">{{ announcement.title }}</p><span class="rounded-full bg-indigo-100 px-2 py-1 text-[10px] font-semibold text-indigo-700">{{ announcement.priority }}</span></div><p class="mt-1 line-clamp-3 text-sm text-slate-600">{{ announcement.body }}</p><p class="mt-2 text-[11px] text-slate-400">Published {{ formatDate(announcement.published_at || announcement.created_at) }}</p></article></div>
        </section>

        <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2"><div class="mb-4"><h2 class="font-bold text-slate-900">Published academic results</h2><p class="mt-1 text-xs text-slate-500">Only administrator-published marks are shown.</p></div><div v-if="!summary.academic_records.length" class="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">No published assessment results are available.</div><div v-else class="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2"><article v-for="record in summary.academic_records.slice(0, 8)" :key="record.record_id" class="flex flex-col gap-1 border-b border-slate-100 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p class="font-semibold text-slate-900">{{ record.assessment?.title }}</p><p class="text-xs text-slate-500">{{ record.assessment?.course?.course_code }} · {{ record.assessment?.academic_year }} · {{ record.assessment?.semester }}</p></div><span class="font-bold text-emerald-700">{{ record.score }}/{{ record.assessment?.max_score }} · {{ record.grade }}</span></article></div></section>

        <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div class="mb-4 flex items-center justify-between"><div><h2 class="font-bold text-slate-900">Attendance history</h2><p class="mt-1 text-xs text-slate-500">Recent attendance records for the selected child.</p></div><span class="text-xs font-semibold text-slate-500">{{ summary.attendance.length }} records</span></div><div v-if="!summary.attendance.length" class="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">No attendance records are available.</div><div v-else class="space-y-2"><div v-for="entry in summary.attendance.slice(0, 12)" :key="entry.attendance_id" class="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-sm last:border-0"><span class="min-w-0 truncate">{{ entry.session?.course?.course_code || 'Course' }} · {{ formatDate(entry.session_date) }}</span><span :class="attendanceClass(entry.status)" class="shrink-0 font-semibold">{{ entry.status }}</span></div></div></section>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { authStore } from '../store/auth'
import { acknowledgeAttendanceAlert, fetchAnnouncements, fetchAttendanceAlerts, fetchCalendar, fetchGuardianAbsenceJustifications, fetchGuardianChildSummary, fetchGuardianChildren, fetchNotifications, fetchTimetables, markAllNotificationsRead, markNotificationRead, submitGuardianAbsenceJustification } from '../api.js'
import { countLabel, formatXaf } from '../lib/formatters.js'

const children = ref([])
const selectedStudentId = ref('')
const summary = ref(null)
const absenceRecords = ref([])
const schedule = ref([])
const calendarEvents = ref([])
const announcements = ref([])
const notifications = ref([])
const unreadNotifications = ref(0)
const alerts = ref([])
const loading = ref(true)
const absenceLoading = ref(false)
const scheduleLoading = ref(false)
const calendarLoading = ref(false)
const announcementsLoading = ref(false)
const notificationsLoading = ref(false)
const submittingAttendanceId = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const absenceDrafts = reactive({})
const token = () => authStore.token.value
const activeEnrollments = computed(() => (summary.value?.enrollments || []).filter((entry) => entry.status === 'active'))
const openAbsenceCount = computed(() => absenceRecords.value.filter((record) => canSubmitJustification(record)).length)
const totalBalance = computed(() => (summary.value?.financial_records || []).reduce((total, invoice) => total + invoiceBalance(invoice), 0))

function formatDate(value) { return value ? new Date(value).toLocaleDateString() : 'Not recorded' }
function formatDateTime(value) { return value ? new Date(value).toLocaleString() : 'Not recorded' }
function formatTime(value) { return value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Time unavailable' }
function attendanceClass(status) { return status === 'Present' ? 'text-emerald-700' : status === 'Late' ? 'text-amber-700' : status === 'Excused' ? 'text-indigo-700' : 'text-rose-700' }
function justificationClass(status) { return status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : status === 'SUBMITTED' ? 'bg-indigo-100 text-indigo-700' : status === 'UNJUSTIFIED' || status === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700' }
function canSubmitJustification(record) { return ['PENDING', 'SUBMITTED'].includes(record.justification_status || 'PENDING') && record.status === 'Absent' && (!record.justification_deadline_at || new Date(record.justification_deadline_at) >= new Date()) }
function invoiceBalance(invoice) { return Math.max(Number(invoice.amount_due || 0) - Number(invoice.amount_paid || 0), 0) }

async function loadChild() {
  if (!selectedStudentId.value) return
  errorMessage.value = ''
  absenceLoading.value = true
  scheduleLoading.value = true
  calendarLoading.value = true
  const [summaryResult, absenceResult, scheduleResult, calendarResult] = await Promise.all([
    fetchGuardianChildSummary(token(), selectedStudentId.value),
    fetchGuardianAbsenceJustifications(token(), selectedStudentId.value),
    fetchTimetables(token(), { student_id: selectedStudentId.value }),
    fetchCalendar(token(), { student_id: selectedStudentId.value }),
  ])
  if (!summaryResult.ok) errorMessage.value = summaryResult.error || 'Unable to load the selected child.'
  else summary.value = summaryResult.data
  if (!absenceResult.ok) errorMessage.value = absenceResult.error || 'Unable to load absence justifications.'
  else absenceRecords.value = absenceResult.data || []
  if (!scheduleResult.ok) errorMessage.value = scheduleResult.error || 'Unable to load the child timetable.'
  else schedule.value = scheduleResult.data || []
  if (!calendarResult.ok) errorMessage.value = calendarResult.error || 'Unable to load the child calendar.'
  else calendarEvents.value = calendarResult.data?.events || []
  absenceLoading.value = false
  scheduleLoading.value = false
  calendarLoading.value = false
}

async function loadAnnouncements() {
  announcementsLoading.value = true
  const result = await fetchAnnouncements(token())
  if (result.ok) announcements.value = result.data || []
  else if (!errorMessage.value) errorMessage.value = result.error || 'Unable to load announcements.'
  announcementsLoading.value = false
}

async function loadNotifications() {
  notificationsLoading.value = true
  const result = await fetchNotifications(token(), { limit: 20 })
  if (result.ok) { notifications.value = result.data || []; unreadNotifications.value = notifications.value.filter((notification) => !notification.read_at).length }
  else if (!errorMessage.value) errorMessage.value = result.error || 'Unable to load notifications.'
  notificationsLoading.value = false
}

async function submitAbsence(record) {
  const justification_text = String(absenceDrafts[record.attendance_id] || '').trim()
  if (!justification_text) { errorMessage.value = 'Please explain the reason for the absence before submitting.'; return }
  submittingAttendanceId.value = record.attendance_id
  errorMessage.value = ''
  const result = await submitGuardianAbsenceJustification(token(), selectedStudentId.value, record.attendance_id, { justification_text })
  if (!result.ok) errorMessage.value = result.error || 'Unable to submit the absence justification.'
  else { successMessage.value = 'Absence justification submitted for administrator review.'; absenceDrafts[record.attendance_id] = ''; await loadChild() }
  submittingAttendanceId.value = ''
}

async function markRead(notification) {
  const result = await markNotificationRead(token(), notification.notification_id)
  if (!result.ok) { errorMessage.value = result.error || 'Unable to mark the notification as read.'; return }
  notification.read_at = result.data?.read_at || new Date().toISOString()
  unreadNotifications.value = Math.max(0, unreadNotifications.value - 1)
}

async function markAllRead() {
  const result = await markAllNotificationsRead(token())
  if (!result.ok) { errorMessage.value = result.error || 'Unable to mark notifications as read.'; return }
  notifications.value.forEach((notification) => { notification.read_at ||= new Date().toISOString() })
  unreadNotifications.value = 0
}

async function acknowledge(alertId) {
  const result = await acknowledgeAttendanceAlert(token(), alertId)
  if (!result.ok) errorMessage.value = result.error || 'Unable to acknowledge the attendance alert.'
  else alerts.value = alerts.value.filter((alert) => alert.alert_id !== alertId)
}

watch(selectedStudentId, loadChild)
onMounted(async () => {
  const [childrenResult, alertsResult] = await Promise.all([fetchGuardianChildren(token()), fetchAttendanceAlerts(token())])
  if (!childrenResult.ok) errorMessage.value = childrenResult.error || 'Unable to load linked children.'
  else { children.value = childrenResult.data || []; selectedStudentId.value = children.value[0]?.student_id || '' }
  if (alertsResult.ok) alerts.value = alertsResult.data || []
  await Promise.all([loadAnnouncements(), loadNotifications()])
  loading.value = false
})
</script>
