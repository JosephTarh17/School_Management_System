<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Institutional Attendance Management</h1>
      <p class="text-xs text-slate-500 font-geist mt-1">Audit logs, absence excuse management, and automated regulatory attendance reporting.</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <StatCard title="Overall Attendance" value="96.4%" change="Institutional Target 95%" :changeIsPositive="true" icon="fact_check" variant="emerald" />
      <StatCard title="Total Excused" value="142" change="Medical/Official" :changeIsPositive="true" icon="verified" variant="primary" />
      <StatCard title="Unexcused Absences" value="38" change="Alerts Sent to Parents" :changeIsPositive="false" icon="warning" variant="amber" />
      <StatCard title="Pending Excuses" value="7" change="Needs Admin Approval" :changeIsPositive="true" icon="assignment_late" variant="secondary" />
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
import StatCard from '../components/StatCard.vue'
import Badge from '../components/Badge.vue'

const logs = [
  { id: '#LOG-901', student: 'David Miller', course: 'CS-301 Database Systems', date: 'Aug 11, 2026', status: 'Excused' },
  { id: '#LOG-902', student: 'Bob Sterling', course: 'CS-304 Software Arch', date: 'Aug 11, 2026', status: 'Late' },
  { id: '#LOG-903', student: 'Catherine Bell', course: 'MATH-202 Logic', date: 'Aug 10, 2026', status: 'Absent' }
]
</script>
