<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 rounded-xl bg-gradient-to-r from-slate-900 to-blue-900 p-6 text-white shadow-md md:flex-row md:items-center md:justify-between">
      <div>
        <div class="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/20 px-2.5 py-1 text-xs font-semibold text-blue-300 font-geist">
          <span class="h-2 w-2 animate-pulse rounded-full bg-emerald-400"></span>
          Live database metrics
        </div>
        <h1 class="text-2xl font-bold tracking-tight font-sans">Teacher Dashboard</h1>
        <p class="mt-1 text-xs text-slate-300 font-geist">Your sessions, courses, assessments, and recorded attendance.</p>
      </div>
      <router-link to="/teacher-attendance" class="rounded-eight border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 font-geist">
        Attendance Entry
      </router-link>
    </div>

    <div v-if="errorMessage" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
      {{ errorMessage }}
    </div>

    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title="My Sessions" :value="loading ? '…' : formatNumber(metrics.sessions)" change="Assigned class sessions" :changeIsPositive="true" icon="calendar_month" variant="primary" />
      <StatCard title="My Courses" :value="loading ? '…' : formatNumber(metrics.courses)" change="Courses with sessions" :changeIsPositive="true" icon="auto_stories" variant="secondary" />
      <StatCard title="Attendance Rate" :value="loading ? '…' : `${metrics.attendanceRate}%`" change="Recorded attendance" :changeIsPositive="metrics.attendanceRate >= 75" icon="fact_check" variant="emerald" />
      <StatCard title="Assessments" :value="loading ? '…' : formatNumber(metrics.assessments)" change="Assigned to my courses" :changeIsPositive="true" icon="assignment" variant="amber" />
    </div>

    <div class="rounded-xl border border-border-subtle bg-white p-6 shadow-xs">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-base font-bold text-slate-900 font-sans">My live data summary</h2>
          <p class="mt-1 text-xs text-slate-500">Metrics are returned by the protected dashboard endpoint.</p>
        </div>
        <button type="button" :disabled="loading" @click="loadMetrics" class="rounded-eight bg-primary-container px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
          {{ loading ? 'Refreshing…' : 'Refresh metrics' }}
        </button>
      </div>
      <div class="mt-5 grid gap-4 sm:grid-cols-2">
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p class="text-xs text-slate-500">Students represented in attendance records</p>
          <p class="mt-1 text-xl font-bold text-slate-900">{{ loading ? '…' : formatNumber(metrics.students) }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p class="text-xs text-slate-500">Attendance records submitted</p>
          <p class="mt-1 text-xl font-bold text-slate-900">{{ loading ? '…' : formatNumber(metrics.attendanceRecords) }}</p>
        </div>
      </div>
    </div>

    <div class="rounded-xl border border-border-subtle bg-white p-6 shadow-xs">
      <h2 class="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 font-sans">
        <span class="material-symbols-outlined text-primary-container">widgets</span>
        Academic modules
      </h2>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <router-link v-for="mod in visibleModules" :key="mod.path" :to="mod.path" class="group flex min-w-0 items-start gap-4 rounded-eight border border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-blue-400 hover:bg-white hover:shadow-sm">
          <div :class="['flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', mod.bgClass]"><span class="material-symbols-outlined text-xl" :class="mod.iconClass">{{ mod.icon }}</span></div>
          <div class="min-w-0 flex-1"><h3 class="text-sm font-bold text-slate-900 transition-colors group-hover:text-primary-container">{{ mod.title }}</h3><p class="mt-0.5 line-clamp-2 text-xs text-slate-500 font-geist">{{ mod.desc }}</p></div>
          <span class="material-symbols-outlined text-lg text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-primary-container">chevron_right</span>
        </router-link>
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
const metrics = reactive({ students: 0, courses: 0, attendanceRate: 0, sessions: 0, assessments: 0, attendanceRecords: 0 })

const modules = [
  { title: 'Teacher Attendance', path: '/teacher-attendance', icon: 'co_present', bgClass: 'bg-indigo-50', iconClass: 'text-indigo-700', desc: 'Mark attendance for your assigned class sessions.' },
  { title: 'Attendance Management', path: '/attendance-management', icon: 'fact_check', bgClass: 'bg-emerald-50', iconClass: 'text-emerald-700', desc: 'Review attendance records and trends.' },
  { title: 'Class Sessions', path: '/class-sessions', icon: 'calendar_month', bgClass: 'bg-amber-50', iconClass: 'text-amber-700', desc: 'Review schedules, rooms, and assigned sessions.' },
  { title: 'Course Catalog', path: '/course-catalog', icon: 'auto_stories', bgClass: 'bg-purple-50', iconClass: 'text-purple-700', desc: 'Review academic course definitions.' },
  { title: 'Assessments', path: '/assessments', icon: 'assignment', bgClass: 'bg-sky-50', iconClass: 'text-sky-700', desc: 'Manage assessments for your courses.' },
  { title: 'Participation Log', path: '/participation-log', icon: 'how_to_reg', bgClass: 'bg-emerald-50', iconClass: 'text-emerald-700', desc: 'Record student engagement and participation.' },
]

const visibleModules = modules.filter((module) => module.path !== '/student-portal')

function formatNumber(value) {
  return new Intl.NumberFormat().format(Number(value) || 0)
}

async function loadMetrics() {
  loading.value = true
  errorMessage.value = ''
  const result = await fetchDashboardMetrics(authStore.token.value)
  if (!result.ok) errorMessage.value = result.error || 'Unable to load dashboard metrics.'
  else Object.assign(metrics, result.data || {})
  loading.value = false
}

onMounted(loadMetrics)
</script>
