<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p class="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Attendance</p><h1 class="mt-1 text-2xl font-bold text-slate-950">Attendance reports & alerts</h1><p class="mt-1 text-sm text-slate-500">Review attendance percentages for students in your teaching scope.</p></div><button @click="load" class="btn-primary px-4 py-2 text-sm font-semibold text-white">Refresh</button></header>
    <p v-if="message" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{{ message }}</p><p v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{{ errorMessage }}</p>
    <div v-if="settings" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 class="font-bold text-slate-900">Alert thresholds</h2><p class="text-xs text-slate-500">Absence and late percentages trigger guardian alerts.</p></div><form v-if="isAdministrator" @submit.prevent="saveSettings" class="flex flex-wrap items-end gap-3"><label class="text-xs text-slate-600">Absence %<input v-model.number="settings.absence_threshold_percent" type="number" min="0" max="100" step="0.01" class="mt-1 block w-24 rounded-lg border px-2 py-1.5 text-sm" /></label><label class="text-xs text-slate-600">Late %<input v-model.number="settings.late_threshold_percent" type="number" min="0" max="100" step="0.01" class="mt-1 block w-24 rounded-lg border px-2 py-1.5 text-sm" /></label><button class="btn-primary px-3 py-2 text-xs font-semibold text-white">Save thresholds</button></form><div v-else class="text-xs text-slate-600">Absence {{ formatPercent(settings.absence_threshold_percent) }} · Late {{ formatPercent(settings.late_threshold_percent) }}</div></div></div>
    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><table class="min-w-full text-left text-sm"><thead class="border-b text-xs uppercase text-slate-500"><tr><th class="px-3 py-2">Student</th><th class="px-3 py-2">Attendance</th><th class="px-3 py-2">Absent</th><th class="px-3 py-2">Late</th><th class="px-3 py-2">Total</th><th class="px-3 py-2">Status</th></tr></thead><tbody><tr v-for="report in reports" :key="report.student_id" class="border-b last:border-0"><td class="px-3 py-3 font-semibold text-slate-900">{{ report.student_name }}</td><td class="px-3 py-3">{{ formatPercent(report.attendance_percent) }}</td><td class="px-3 py-3">{{ formatPercent(report.absence_percent) }}</td><td class="px-3 py-3">{{ formatPercent(report.late_percent) }}</td><td class="px-3 py-3">{{ report.total }}</td><td class="px-3 py-3"><span :class="report.at_risk ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'" class="rounded-full px-2 py-1 text-xs font-semibold">{{ report.at_risk ? 'At risk' : 'Within threshold' }}</span></td></tr><tr v-if="!reports.length"><td colspan="6" class="px-3 py-8 text-center text-slate-500">No attendance records are available for your scope.</td></tr></tbody></table></div>
  </section>
</template>
<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { authStore } from '../store/auth'
import { fetchAttendanceReports, fetchAttendanceSettings, updateAttendanceSettings } from '../api.js'
import { formatPercent } from '../lib/formatters.js'
const reports = ref([])
const settings = reactive({ absence_threshold_percent: 20, late_threshold_percent: 20 })
const hasSettings = ref(false)
const errorMessage = ref('')
const message = ref('')
const isAdministrator = computed(() => authStore.userRole.value === 'administrator')
async function load() { errorMessage.value = ''; const [reportsResult, settingsResult] = await Promise.all([fetchAttendanceReports(authStore.token.value), fetchAttendanceSettings(authStore.token.value)]); if (reportsResult.ok) reports.value = reportsResult.data || []; else errorMessage.value = reportsResult.error; if (settingsResult.ok) { Object.assign(settings, settingsResult.data); hasSettings.value = true } }
async function saveSettings() { const result = await updateAttendanceSettings(authStore.token.value, settings); if (!result.ok) errorMessage.value = result.error; else { Object.assign(settings, result.data); message.value = 'Attendance thresholds updated.' } }
onMounted(load)
</script>
