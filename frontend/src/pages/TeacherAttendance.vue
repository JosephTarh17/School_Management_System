<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight font-sans">Teacher Attendance & Participation Log</h1>
        <p class="text-xs text-slate-500 font-geist mt-1">Class: CS-301 Database Systems • Session: Aug 12, 2026 (09:00 - 10:30 AM)</p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="markAllPresent" class="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-eight border border-emerald-200 font-geist transition-colors">
          Mark All Present
        </button>
        <button @click="saveAttendance" class="px-4 py-2 bg-primary-container hover:bg-blue-700 text-white text-xs font-semibold rounded-eight shadow-xs font-geist transition-all flex items-center gap-1.5">
          <span class="material-symbols-outlined text-base">save</span>
          Save Session Log
        </button>
      </div>
    </div>

    <!-- Attendance Roster Matrix -->
    <div class="bg-white rounded-xl border border-border-subtle shadow-xs p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-bold text-slate-900 font-sans">Student Attendance Roster</h2>
        <div class="flex gap-2">
          <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 font-geist">Present: {{ countStatus('Present') }}</span>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 font-geist">Late: {{ countStatus('Late') }}</span>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 font-geist">Absent: {{ countStatus('Absent') }}</span>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs font-geist">
          <thead>
            <tr class="bg-slate-50 text-slate-500 border-b border-slate-200">
              <th class="py-3 px-4 font-semibold">Student ID</th>
              <th class="py-3 px-4 font-semibold">Student Name</th>
              <th class="py-3 px-4 font-semibold">Status Selection</th>
              <th class="py-3 px-4 font-semibold">Participation Level</th>
              <th class="py-3 px-4 font-semibold">Notes / Reason</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-700">
            <tr v-for="student in roster" :key="student.id" class="hover:bg-slate-50/80">
              <td class="py-3.5 px-4 font-bold text-slate-900">{{ student.id }}</td>
              <td class="py-3.5 px-4 font-medium text-slate-900">{{ student.name }}</td>
              <td class="py-3.5 px-4">
                <div class="inline-flex rounded-md shadow-xs" role="group">
                  <button
                    v-for="st in ['Present', 'Late', 'Absent', 'Excused']"
                    :key="st"
                    @click="student.status = st"
                    :class="[
                      'px-2.5 py-1 text-[11px] font-semibold border transition-all',
                      student.status === st
                        ? getActiveStatusBtnClass(st)
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    ]"
                  >
                    {{ st }}
                  </button>
                </div>
              </td>
              <td class="py-3.5 px-4">
                <select v-model="student.participation" class="px-2 py-1 text-xs border border-slate-200 rounded-md bg-slate-50 font-geist">
                  <option value="High (Active)">High (Active)</option>
                  <option value="Normal">Normal</option>
                  <option value="Low">Low</option>
                  <option value="Disruptive">Disruptive</option>
                </select>
              </td>
              <td class="py-3.5 px-4">
                <input v-model="student.notes" type="text" placeholder="Add note..." class="w-full px-2 py-1 text-xs border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:outline-none" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const roster = ref([
  { id: '#ST-884920', name: 'Julian Dabney', status: 'Present', participation: 'High (Active)', notes: '' },
  { id: '#ST-884921', name: 'Alice Montgomery', status: 'Present', participation: 'Normal', notes: '' },
  { id: '#ST-884922', name: 'Bob Sterling', status: 'Late', participation: 'Normal', notes: 'Arrived at 09:12 AM' },
  { id: '#ST-884923', name: 'Catherine Bell', status: 'Absent', participation: 'Low', notes: 'Unexcused' },
  { id: '#ST-884924', name: 'David Miller', status: 'Excused', participation: 'Normal', notes: 'Medical certificate submitted' }
])

const countStatus = (st) => roster.value.filter(s => s.status === st).length

const markAllPresent = () => {
  roster.value.forEach(s => s.status = 'Present')
}

const saveAttendance = () => {
  alert('Attendance and participation session saved successfully!')
}

const getActiveStatusBtnClass = (st) => {
  switch(st) {
    case 'Present': return 'bg-emerald-600 text-white border-emerald-600'
    case 'Late': return 'bg-amber-600 text-white border-amber-600'
    case 'Absent': return 'bg-rose-600 text-white border-rose-600'
    case 'Excused': return 'bg-indigo-600 text-white border-indigo-600'
    default: return 'bg-slate-800 text-white border-slate-800'
  }
}
</script>
