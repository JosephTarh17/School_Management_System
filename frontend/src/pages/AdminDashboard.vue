<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Administrator Dashboard</h1>
        <p class="text-xs text-slate-500 font-geist mt-1">Institutional oversight, user role administration, and security analytics.</p>
      </div>
      <button class="px-4 py-2 bg-primary-container hover:bg-blue-700 text-white text-xs font-semibold rounded-eight font-geist transition-colors shadow-xs flex items-center gap-2">
        <span class="material-symbols-outlined text-sm">person_add</span>
        Add Staff / Student
      </button>
    </div>

    <!-- Stat Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <StatCard title="Active Enrolments" value="2,845" change="98.2% Active" :changeIsPositive="true" icon="school" variant="primary" />
      <StatCard title="Staff Members" value="184" change="Full faculty" :changeIsPositive="true" icon="badge" variant="secondary" />
      <StatCard title="System Health" value="99.9%" change="Optimal" :changeIsPositive="true" icon="verified_user" variant="emerald" />
      <StatCard title="Audit Warnings" value="3" change="Low risk" :changeIsPositive="true" icon="security" variant="amber" />
    </div>

    <!-- Main Content Split -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Recent User Activity -->
      <div class="lg:col-span-2 bg-white rounded-xl p-6 border border-border-subtle shadow-xs">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-bold text-slate-900 font-sans">Recent Institutional Audits</h2>
          <span class="text-xs text-slate-500 font-geist">Live Updates</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs font-geist">
            <thead>
              <tr class="bg-slate-50 text-slate-500 border-b border-slate-200">
                <th class="py-2.5 px-3 font-semibold">User</th>
                <th class="py-2.5 px-3 font-semibold">Action</th>
                <th class="py-2.5 px-3 font-semibold">Module</th>
                <th class="py-2.5 px-3 font-semibold">Timestamp</th>
                <th class="py-2.5 px-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              <tr v-for="(log, i) in auditLogs" :key="i" class="hover:bg-slate-50/80">
                <td class="py-3 px-3 font-semibold text-slate-900">{{ log.user }}</td>
                <td class="py-3 px-3">{{ log.action }}</td>
                <td class="py-3 px-3">{{ log.module }}</td>
                <td class="py-3 px-3 text-slate-400">{{ log.time }}</td>
                <td class="py-3 px-3">
                  <Badge :type="log.status === 'Success' ? 'present' : 'absent'" :text="log.status" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Quick Controls -->
      <div class="bg-white rounded-xl p-6 border border-border-subtle shadow-xs space-y-4">
        <h2 class="text-base font-bold text-slate-900 font-sans">Quick Security Policies</h2>
        <div class="space-y-3">
          <div class="p-3 bg-slate-50 rounded-eight border border-slate-200 flex items-center justify-between">
            <div>
              <p class="text-xs font-bold text-slate-800">Biometric Attendance Sync</p>
              <p class="text-[11px] text-slate-500">Automated gate check-in</p>
            </div>
            <span class="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded">Active</span>
          </div>

          <div class="p-3 bg-slate-50 rounded-eight border border-slate-200 flex items-center justify-between">
            <div>
              <p class="text-xs font-bold text-slate-800">Gradebook Locking</p>
              <p class="text-[11px] text-slate-500">Term 2026-A Final Submissions</p>
            </div>
            <span class="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded">Pending</span>
          </div>

          <div class="p-3 bg-slate-50 rounded-eight border border-slate-200 flex items-center justify-between">
            <div>
              <p class="text-xs font-bold text-slate-800">Parent SMS Alerts</p>
              <p class="text-[11px] text-slate-500">Instant absence notifications</p>
            </div>
            <span class="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded">Active</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import StatCard from '../components/StatCard.vue'
import Badge from '../components/Badge.vue'

const auditLogs = [
  { user: 'Dr. Eleanor Vance', action: 'Grade Submitted', module: 'Assessments', time: '10 mins ago', status: 'Success' },
  { user: 'Prof. Marcus Brody', action: 'Attendance Recorded', module: 'Class Sessions', time: '24 mins ago', status: 'Success' },
  { user: 'Admin User', action: 'Policy Update', module: 'Role Management', time: '1 hour ago', status: 'Success' },
  { user: 'System Service', action: 'MFA Failed Entry', module: 'Auth Service', time: '2 hours ago', status: 'Warning' }
]
</script>
