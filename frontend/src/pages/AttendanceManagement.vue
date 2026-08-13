<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Institutional Attendance Management</h1>
      <p class="text-xs text-slate-500 font-geist mt-1">Audit logs, absence excuse management, and automated regulatory attendance reporting.</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <StatCard title="Overall Attendance" value="—" change="Awaiting database records" :changeIsPositive="true" icon="fact_check" variant="emerald" />
      <StatCard title="Total Excused" value="0" change="Awaiting database records" :changeIsPositive="true" icon="verified" variant="primary" />
      <StatCard title="Unexcused Absences" value="0" change="Awaiting database records" :changeIsPositive="true" icon="warning" variant="amber" />
      <StatCard title="Pending Excuses" value="0" change="Awaiting database records" :changeIsPositive="true" icon="assignment_late" variant="secondary" />
    </div>

    <!-- Attendance Audit Table -->
    <div class="bg-white rounded-xl border border-border-subtle shadow-xs p-6">
      <h2 class="text-base font-bold text-slate-900 mb-4 font-sans">Recent Attendance Exception Logs</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs font-geist">
          <thead>
            <tr class="bg-slate-50 text-slate-500 border-b border-slate-200">
              <th class="py-3 px-4 font-semibold">Log ID</th>
              <th class="py-3 px-4 font-semibold">Student</th>
              <th class="py-3 px-4 font-semibold">Course</th>
              <th class="py-3 px-4 font-semibold">Date</th>
              <th class="py-3 px-4 font-semibold">Status</th>
              <th class="py-3 px-4 font-semibold">Excuse Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-700">
            <tr v-if="!logs.length"><td colspan="6" class="py-8 px-4 text-center text-slate-500">No attendance exception records are available.</td></tr>
            <tr v-for="log in logs" :key="log.id" class="hover:bg-slate-50/80">
              <td class="py-3.5 px-4 font-bold text-slate-900">{{ log.id }}</td>
              <td class="py-3.5 px-4 font-medium">{{ log.student }}</td>
              <td class="py-3.5 px-4">{{ log.course }}</td>
              <td class="py-3.5 px-4 text-slate-500">{{ log.date }}</td>
              <td class="py-3.5 px-4">
                <Badge :type="log.status.toLowerCase()" :text="log.status" />
              </td>
              <td class="py-3.5 px-4">
                <button class="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200">
                  Review Excuse
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import StatCard from '../components/StatCard.vue'
import Badge from '../components/Badge.vue'
import { authStore } from '../store/auth'
import { fetchAttendance } from '../api.js'

const logs = ref([])
onMounted(async () => {
  const result = await fetchAttendance(authStore.token.value)
  if (result.ok) logs.value = (result.data || []).map((record) => ({
    id: record.attendance_id,
    student: record.student?.full_name || record.student_id,
    course: record.session?.course?.course_name || record.session_id,
    date: record.session_date,
    status: record.status,
  }))
})
</script>
