<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Institutional Attendance Management</h1>
      <p class="text-xs text-slate-500 font-geist mt-1">Review attendance records and identify absence patterns from the database.</p>
      <button type="button" :disabled="loading" @click="loadAttendance" class="rounded-eight bg-primary-container px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
        {{ loading ? 'Refreshing…' : 'Refresh records' }}
      </button>
    </div>

    <div v-if="errorMessage" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
      {{ errorMessage }}
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <StatCard title="Attendance Rate" :value="loading ? '…' : `${attendanceRate}%`" change="Present or late records" :changeIsPositive="attendanceRate >= 75" icon="fact_check" variant="emerald" />
      <StatCard title="Total Excused" :value="loading ? '…' : String(countStatus('Excused'))" change="Database records" :changeIsPositive="true" icon="verified" variant="primary" />
      <StatCard title="Unexcused Absences" :value="loading ? '…' : String(countStatus('Absent'))" change="Absent records" :changeIsPositive="countStatus('Absent') === 0" icon="warning" variant="amber" />
      <StatCard title="Pending Excuses" value="Not tracked" change="No excuse workflow in schema" :changeIsPositive="false" icon="assignment_late" variant="secondary" />
    </div>

    <!-- Attendance Audit Table -->
    <div class="bg-white rounded-xl border border-border-subtle shadow-xs p-6">
      <div class="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-base font-bold text-slate-900 font-sans">Recent Attendance Records</h2>
          <p class="text-xs text-slate-500">{{ loading ? 'Loading records…' : `${logs.length} record${logs.length === 1 ? '' : 's'} loaded` }}</p>
        </div>
        <p class="text-xs text-slate-400">Excuse review is not configured in the current database schema.</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs font-geist">
          <thead>
            <tr class="bg-slate-50 text-slate-500 border-b border-slate-200">
              <th class="py-3 px-4 font-semibold">Record ID</th>
              <th class="py-3 px-4 font-semibold">Student</th>
              <th class="py-3 px-4 font-semibold">Course</th>
              <th class="py-3 px-4 font-semibold">Date</th>
              <th class="py-3 px-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-700">
            <tr v-if="!loading && !logs.length"><td colspan="5" class="py-8 px-4 text-center text-slate-500">No attendance records are available.</td></tr>
            <tr v-for="log in logs" :key="log.id" class="hover:bg-slate-50/80">
              <td class="py-3.5 px-4 font-bold text-slate-900">{{ log.id }}</td>
              <td class="py-3.5 px-4 font-medium">{{ log.student }}</td>
              <td class="py-3.5 px-4">{{ log.course }}</td>
              <td class="py-3.5 px-4 text-slate-500">{{ log.date }}</td>
              <td class="py-3.5 px-4"><Badge :type="log.status.toLowerCase()" :text="log.status" /></td>
            </tr>
            <tr v-if="loading"><td colspan="5" class="py-8 px-4 text-center text-slate-500">Loading attendance records…</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import StatCard from '../components/StatCard.vue'
import Badge from '../components/Badge.vue'
import { authStore } from '../store/auth'
import { fetchAttendance } from '../api.js'

const logs = ref([])
const loading = ref(true)
const errorMessage = ref('')
const countStatus = (status) => logs.value.filter((record) => record.status === status).length
const attendanceRate = computed(() => {
  if (!logs.value.length) return 0
  return Math.round(((countStatus('Present') + countStatus('Late')) / logs.value.length) * 1000) / 10
})

async function loadAttendance() {
  loading.value = true
  errorMessage.value = ''
  const result = await fetchAttendance(authStore.token.value)
  if (!result.ok) {
    errorMessage.value = result.error || 'Unable to load attendance records.'
    logs.value = []
  } else {
    logs.value = (result.data || []).map((record) => ({
      id: record.attendance_id,
      student: record.student?.full_name || record.student_id,
      course: record.session?.course?.course_name || record.session_id,
      date: record.session_date,
      status: record.status,
    }))
  }
  loading.value = false
}

onMounted(loadAttendance)
</script>
