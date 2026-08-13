<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Administrator Dashboard</h1>
        <p class="mt-1 text-xs text-slate-500 font-geist">Live institutional metrics from the current database.</p>
      </div>
      <span v-if="metrics.lastUpdated" class="text-xs text-slate-400 font-geist">Updated {{ formatUpdated(metrics.lastUpdated) }}</span>
    </div>

    <div v-if="errorMessage" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
      {{ errorMessage }}
    </div>

    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Total Students" :value="loading ? '…' : formatNumber(metrics.students)" change="Database count" :changeIsPositive="true" icon="school" variant="primary" />
      <StatCard title="Staff Members" :value="loading ? '…' : formatNumber(metrics.faculty)" change="Teachers and administrators" :changeIsPositive="true" icon="badge" variant="secondary" />
      <StatCard title="Courses" :value="loading ? '…' : formatNumber(metrics.courses)" change="Configured courses" :changeIsPositive="true" icon="auto_stories" variant="emerald" />
      <StatCard title="Attendance Rate" :value="loading ? '…' : `${metrics.attendanceRate}%`" change="Recorded attendance" :changeIsPositive="metrics.attendanceRate >= 75" icon="fact_check" variant="amber" />
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div class="rounded-xl border border-border-subtle bg-white p-6 shadow-xs lg:col-span-2">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-slate-900 font-sans">Live academic snapshot</h2>
            <p class="mt-1 text-xs text-slate-500">Aggregated records visible to administrators.</p>
          </div>
          <span class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Live data</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs font-geist">
            <tbody class="divide-y divide-slate-100">
              <tr><td class="py-3 text-slate-500">Class sessions</td><td class="py-3 text-right font-semibold text-slate-900">{{ loading ? '…' : formatNumber(metrics.sessions) }}</td></tr>
              <tr><td class="py-3 text-slate-500">Assessment records</td><td class="py-3 text-right font-semibold text-slate-900">{{ loading ? '…' : formatNumber(metrics.assessments) }}</td></tr>
              <tr><td class="py-3 text-slate-500">Attendance records</td><td class="py-3 text-right font-semibold text-slate-900">{{ loading ? '…' : formatNumber(metrics.attendanceRecords) }}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="rounded-xl border border-border-subtle bg-white p-6 shadow-xs">
        <h2 class="text-base font-bold text-slate-900 font-sans">Data status</h2>
        <p class="mt-2 text-xs leading-5 text-slate-500">These figures are loaded from protected backend endpoints using the current administrator session.</p>
        <button type="button" :disabled="loading" @click="loadMetrics" class="mt-5 rounded-eight bg-primary-container px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
          {{ loading ? 'Refreshing…' : 'Refresh metrics' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import StatCard from '../components/StatCard.vue'
import { fetchDashboardMetrics } from '../api.js'
import { authStore } from '../store/auth.js'

const loading = ref(true)
const errorMessage = ref('')
const metrics = reactive({ students: 0, faculty: 0, courses: 0, attendanceRate: 0, sessions: 0, assessments: 0, attendanceRecords: 0, lastUpdated: '' })

function formatNumber(value) {
  return new Intl.NumberFormat().format(Number(value) || 0)
}

function formatUpdated(value) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

async function loadMetrics() {
  loading.value = true
  errorMessage.value = ''
  const result = await fetchDashboardMetrics(authStore.token.value)
  if (!result.ok) {
    errorMessage.value = result.error || 'Unable to load dashboard metrics.'
  } else {
    Object.assign(metrics, result.data || {})
  }
  loading.value = false
}

onMounted(loadMetrics)
</script>
