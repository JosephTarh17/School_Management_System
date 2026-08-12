<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Class Sessions & Scheduling</h1>
        <p class="text-xs text-slate-500 font-geist mt-1">Timetable allocation, room occupancy management, and lab bookings.</p>
      </div>
      <button class="px-4 py-2 bg-primary-container text-white text-xs font-semibold rounded-eight shadow-xs font-geist">
        + Schedule New Session
      </button>
    </div>

    <!-- Sessions Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div v-for="session in sessions" :key="session.id" class="bg-white rounded-xl border border-border-subtle p-5 shadow-xs hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between mb-3">
          <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 font-geist">{{ session.code }}</span>
          <span class="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-geist">{{ session.status }}</span>
        </div>
        <h3 class="text-base font-bold text-slate-900 font-sans mb-1">{{ session.title }}</h3>
        <p class="text-xs text-slate-500 font-geist mb-3">Instructor: {{ session.instructor }}</p>
        <div class="space-y-1.5 text-xs text-slate-600 font-geist border-t border-slate-100 pt-3">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-base text-slate-400">schedule</span>
            <span>{{ session.time }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-base text-slate-400">room</span>
            <span>{{ session.room }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const sessions = [
  { id: 1, code: 'CS-301', title: 'Database Systems Lecture', instructor: 'Dr. Eleanor Vance', time: 'Mon, Wed 09:00 - 10:30 AM', room: 'Building A • Auditorium 101', status: 'Scheduled' },
  { id: 2, code: 'CS-304', title: 'Software Architecture Lab', instructor: 'Prof. Marcus Brody', time: 'Tue, Thu 11:00 - 01:00 PM', room: 'Computer Lab 3', status: 'Scheduled' },
  { id: 3, code: 'MATH-202', title: 'Discrete Math Seminar', instructor: 'Dr. Sarah Connor', time: 'Fri 02:00 - 04:00 PM', room: 'Building B • Room 204', status: 'In Progress' }
]
</script>
