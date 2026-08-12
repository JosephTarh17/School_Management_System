<template>
  <AuthenticatedLayout>
    <section class="space-y-8">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-sm uppercase tracking-[0.18em] text-slate-500">Class Sessions</p>
          <h1 class="text-3xl font-semibold text-slate-900">Timetable</h1>
        </div>
        <button class="inline-flex items-center rounded-2xl bg-sky-600 px-5 py-3 text-white transition hover:bg-sky-700">
          Create session
        </button>
      </div>

      <div class="grid gap-6 lg:grid-cols-3">
        <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 class="text-xl font-semibold text-slate-900">Today's sessions</h2>
          <ul class="mt-5 space-y-4">
            <li v-for="session in todaySessions" :key="session.id" class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p class="text-sm font-semibold text-slate-900">{{ session.time }} · {{ session.course }}</p>
              <p class="text-sm text-slate-600">{{ session.room }} · {{ session.instructor }}</p>
            </li>
          </ul>
        </div>

        <div class="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 class="text-xl font-semibold text-slate-900">Upcoming sessions</h2>
          <div class="mt-5 space-y-4">
            <div v-for="session in upcomingSessions" :key="session.id" class="rounded-3xl border border-slate-200 p-5">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-base font-semibold text-slate-900">{{ session.course }}</p>
                  <p class="text-sm text-slate-600">{{ session.instructor }}</p>
                </div>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">{{ session.day }}</span>
              </div>
              <p class="mt-3 text-sm text-slate-600">{{ session.time }} · {{ session.room }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </AuthenticatedLayout>
</template>

<script setup>
import AuthenticatedLayout from '../components/AuthenticatedLayout.vue'

const todaySessions = [
  { id: 1, course: 'Algebra I', time: '9:00 AM - 10:15 AM', room: 'B101', instructor: 'Mr. Imran' },
  { id: 2, course: 'English Composition', time: '10:30 AM - 11:45 AM', room: 'A204', instructor: 'Ms. Silva' },
]

const upcomingSessions = [
  { id: 3, course: 'Science Lab', day: 'Wednesday', time: '1:00 PM - 2:30 PM', room: 'Lab 3', instructor: 'Dr. Ram' },
  { id: 4, course: 'World History', day: 'Thursday', time: '11:00 AM - 12:15 PM', room: 'C102', instructor: 'Ms. Lee' },
]
</script>
