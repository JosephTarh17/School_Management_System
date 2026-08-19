<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h1 class="text-2xl font-bold tracking-tight text-slate-900">Teacher Absence Reports</h1><p class="mt-1 text-xs text-slate-500">{{ role === 'administrator' ? 'Review reports submitted before scheduled lessons.' : 'Review your submitted absence reports.' }}</p></div><button type="button" class="btn-primary px-3 py-2 text-xs font-semibold" @click="loadReports">Refresh</button></div>
    <div v-if="errorMessage" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{{ errorMessage }}</div><div v-if="successMessage" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">{{ successMessage }}</div>
    <section class="rounded-xl border border-border-subtle bg-white p-4 shadow-xs sm:p-6"><div v-if="loading" class="py-10 text-center text-sm text-slate-500">Loading absence reports…</div><div v-else-if="!reports.length" class="py-10 text-center text-sm text-slate-500">No teacher absence reports are pending.</div><div v-else class="space-y-3"><article v-for="report in reports" :key="report.absence_report_id" class="rounded-lg border border-slate-200 bg-slate-50 p-4"><div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p class="font-bold text-slate-900">{{ report.teacher?.full_name || 'Teacher' }} · {{ report.occurrence?.course?.course_code || 'Course' }}</p><p class="mt-1 text-xs text-slate-500">Scheduled: {{ formatDate(report.occurrence?.start_at) }} · {{ report.occurrence?.room?.room_name || 'Location' }}</p><p class="mt-2 text-sm text-slate-700">{{ report.reason }}</p><p class="mt-1 text-xs text-slate-500">Replacement requested: {{ report.replacement_requested ? 'Yes' : 'No' }} · Status: {{ report.status }}</p><p v-if="report.review_notes" class="mt-1 text-xs text-slate-500">Review note: {{ report.review_notes }}</p></div><div v-if="role === 'administrator' && report.status === 'Pending'" class="flex shrink-0 gap-2"><button type="button" class="btn-primary px-2.5 py-1.5 text-xs font-semibold" @click="review(report, 'Approved')">Approve</button><button type="button" class="btn-danger px-2.5 py-1.5 text-xs font-semibold" @click="review(report, 'Rejected')">Reject</button></div></div></article></div></section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { authStore } from '../store/auth.js'
import { fetchTeacherAbsenceReports, reviewTeacherAbsence } from '../api.js'

const role = computed(() => authStore.userRole.value)
const reports = ref([])
const loading = ref(true)
const errorMessage = ref('')
const successMessage = ref('')
function formatDate(value) { return value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not available' }
async function loadReports() { loading.value = true; const result = await fetchTeacherAbsenceReports(authStore.token.value); if (!result.ok) errorMessage.value = result.error || 'Unable to load teacher absence reports.'; else reports.value = result.data || []; loading.value = false }
async function review(report, status) { const note = window.prompt(`${status} note (optional):`) || ''; const result = await reviewTeacherAbsence(authStore.token.value, report.absence_report_id, { status, review_notes: note }); if (!result.ok) errorMessage.value = result.error || 'Unable to review report.'; else { successMessage.value = `Teacher absence report ${status.toLowerCase()}.`; await loadReports() } }
onMounted(loadReports)
</script>
