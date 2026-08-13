<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Student Participation & Behavior Log</h1>
      <p class="text-xs text-slate-500 font-geist mt-1">Classroom engagement metrics, active contributions, and behavioral incident logs.</p>
    </div>

    <div class="bg-white rounded-xl border border-border-subtle p-6 shadow-xs">
      <h2 class="text-base font-bold text-slate-900 mb-4 font-sans">Recent Classroom Engagements</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs font-geist">
          <thead>
            <tr class="bg-slate-50 text-slate-500 border-b border-slate-200">
              <th class="py-3 px-4 font-semibold">Entry ID</th>
              <th class="py-3 px-4 font-semibold">Student Name</th>
              <th class="py-3 px-4 font-semibold">Course</th>
              <th class="py-3 px-4 font-semibold">Engagement Level</th>
              <th class="py-3 px-4 font-semibold">Instructor Comment</th>
              <th class="py-3 px-4 font-semibold">Date</th>
            </tr>
          </thead>
                      <tbody class="divide-y divide-slate-100 text-slate-700">
            <tr v-if="!logs.length"><td colspan="6" class="py-8 px-4 text-center text-slate-500">No participation records are available.</td></tr>
            <tr v-for="p in logs" :key="p.id" class="hover:bg-slate-50/80">

              <td class="py-3.5 px-4 font-bold text-slate-900">{{ p.id }}</td>
              <td class="py-3.5 px-4 font-medium">{{ p.student }}</td>
              <td class="py-3.5 px-4">{{ p.course }}</td>
              <td class="py-3.5 px-4">
                <Badge :type="p.level === 'Active' ? 'present' : p.level === 'Disruptive' ? 'danger' : 'info'" :text="p.level" />
              </td>
              <td class="py-3.5 px-4 text-slate-600">{{ p.comment }}</td>
              <td class="py-3.5 px-4 text-slate-500">{{ p.date }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import Badge from '../components/Badge.vue'

const logs = []
</script>
