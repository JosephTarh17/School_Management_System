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
      <StatCard :title="loading ? 'Total Students' : `Total ${pluralize(metrics.students, 'Student', 'Students')}`" :value="loading ? '…' : formatNumber(metrics.students)" change="Database count" :changeIsPositive="true" icon="school" variant="primary" />
      <StatCard :title="loading ? 'Staff Members' : pluralize(metrics.faculty, 'Staff Member', 'Staff Members')" :value="loading ? '…' : formatNumber(metrics.faculty)" change="Teachers and administrators" :changeIsPositive="true" icon="badge" variant="secondary" />
      <StatCard :title="loading ? 'Courses' : pluralize(metrics.courses, 'Course', 'Courses')" :value="loading ? '…' : formatNumber(metrics.courses)" change="Configured courses" :changeIsPositive="true" icon="auto_stories" variant="emerald" />
      <StatCard title="Attendance Rate" :value="loading ? '…' : `${metrics.attendanceRate}%`" change="Recorded attendance" :changeIsPositive="metrics.attendanceRate >= 75" icon="fact_check" variant="amber" />
    </div>

    <section class="rounded-xl border border-border-subtle bg-white p-4 shadow-xs sm:p-6">
      <div class="mb-4">
        <h2 class="text-base font-bold text-slate-900 font-sans">Add guardian account</h2>
        <p class="mt-1 text-xs text-slate-500">Create a guardian login and profile here, then link the guardian to a student from Student Enrollment.</p>
      </div>
      <form class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" @submit.prevent="createGuardianProfile">
        <label class="text-xs font-semibold text-slate-700">Full name<input v-model.trim="guardianForm.full_name" required maxlength="160" placeholder="Guardian full name" class="mt-1.5 block w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none" /></label>
        <label class="text-xs font-semibold text-slate-700">Email<input v-model.trim="guardianForm.email" required type="email" maxlength="320" placeholder="guardian@example.com" class="mt-1.5 block w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none" /></label>
        <label class="text-xs font-semibold text-slate-700">Temporary password<input v-model="guardianForm.password" required type="password" minlength="8" maxlength="128" placeholder="At least 8 characters" class="mt-1.5 block w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none" /></label>
        <label class="text-xs font-semibold text-slate-700">Phone<input v-model.trim="guardianForm.phone" maxlength="40" placeholder="Optional phone number" class="mt-1.5 block w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none" /></label>
        <label class="text-xs font-semibold text-slate-700">Relationship<input v-model.trim="guardianForm.relationship" maxlength="80" placeholder="Parent, sponsor, etc." class="mt-1.5 block w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none" /></label>
        <div class="flex items-end"><button type="submit" :disabled="guardianSaving" class="w-full rounded-eight bg-primary-container px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{{ guardianSaving ? 'Creating…' : 'Create guardian' }}</button></div>
      </form>
      <p v-if="successMessage" class="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">{{ successMessage }}</p>
    </section>

    <section class="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 shadow-xs sm:p-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">Security & compliance</p>
          <h2 class="mt-1 text-base font-bold text-slate-900 font-sans">Administrator audit logs</h2>
          <p class="mt-1 max-w-2xl text-xs leading-5 text-slate-600">Review protected backend activity, including the actor, action, resource, request path, status code, correlation ID, and sanitized metadata. Records are append-only.</p>
        </div>
        <router-link to="/audit-logs" class="inline-flex shrink-0 items-center justify-center gap-2 rounded-eight bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
          <span class="material-symbols-outlined text-base">history</span>
          Open Audit Logs
        </router-link>
      </div>
    </section>

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
              <tr><td class="py-3 text-slate-500">{{ loading ? 'Class sessions' : countLabel(metrics.sessions, 'Class session') }}</td><td class="py-3 text-right font-semibold text-slate-900">{{ loading ? '…' : formatNumber(metrics.sessions) }}</td></tr>
              <tr><td class="py-3 text-slate-500">{{ loading ? 'Assessment records' : countLabel(metrics.assessments, 'Assessment record') }}</td><td class="py-3 text-right font-semibold text-slate-900">{{ loading ? '…' : formatNumber(metrics.assessments) }}</td></tr>
              <tr><td class="py-3 text-slate-500">{{ loading ? 'Attendance records' : countLabel(metrics.attendanceRecords, 'Attendance record') }}</td><td class="py-3 text-right font-semibold text-slate-900">{{ loading ? '…' : formatNumber(metrics.attendanceRecords) }}</td></tr>
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
import { createGuardian, fetchDashboardMetrics } from '../api.js'
import { authStore } from '../store/auth.js'
import { countLabel, pluralize } from '../lib/formatters.js'

const loading = ref(true)
const guardianSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const guardianForm = reactive({ full_name: '', email: '', password: '', phone: '', relationship: '' })
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

async function createGuardianProfile() {
  errorMessage.value = ''
  successMessage.value = ''
  guardianSaving.value = true
  const result = await createGuardian(authStore.token.value, { ...guardianForm })
  if (!result.ok) {
    errorMessage.value = result.error || 'Unable to create guardian account.'
  } else {
    successMessage.value = `Guardian account created for ${result.data?.guardian?.full_name || guardianForm.full_name}. Link it to a student from Student Enrollment.`
    Object.keys(guardianForm).forEach((key) => { guardianForm[key] = '' })
  }
  guardianSaving.value = false
}

onMounted(loadMetrics)
</script>
