<template>
  <AuthenticatedLayout>
    <section class="space-y-8">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-sm uppercase tracking-[0.18em] text-slate-500">Participation</p>
          <h1 class="text-3xl font-semibold text-slate-900">Engagement Logs</h1>
        </div>
        <button class="inline-flex items-center rounded-2xl bg-sky-600 px-5 py-3 text-white transition hover:bg-sky-700">
          Add log entry
        </button>
      </div>

      <div class="grid gap-5 lg:grid-cols-3">
        <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 class="text-lg font-semibold text-slate-900">Engagement Summary</h2>
          <div class="mt-5 space-y-4 text-sm text-slate-600">
            <div class="rounded-3xl bg-slate-50 p-4">
              <p class="font-semibold text-slate-900">Highly Active</p>
              <p class="mt-2">24 students</p>
            </div>
            <div class="rounded-3xl bg-slate-50 p-4">
              <p class="font-semibold text-slate-900">Needs Attention</p>
              <p class="mt-2">6 students</p>
            </div>
          </div>
        </div>

        <div class="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 class="text-lg font-semibold text-slate-900">Recent Logs</h2>
          <div class="mt-5 space-y-4">
            <div v-for="log in logs" :key="log.id" class="rounded-3xl border border-slate-200 p-5">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="font-semibold text-slate-900">{{ log.student }}</p>
                  <p class="text-sm text-slate-600">{{ log.date }} · {{ log.course }}</p>
                </div>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">{{ log.rating }}</span>
              </div>
              <p class="mt-3 text-sm text-slate-600">{{ log.note }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </AuthenticatedLayout>
</template>

<script setup>
import AuthenticatedLayout from '../components/AuthenticatedLayout.vue'

const logs = [
  { id: 1, student: 'Samuel N.', date: '2026-09-06', course: 'Algebra I', rating: 'High', note: 'Participated actively in group problem-solving.' },
  { id: 2, student: 'Priya M.', date: '2026-09-06', course: 'English Composition', rating: 'Medium', note: 'Shared a thoughtful response in class discussion.' },
  { id: 3, student: 'Janelle D.', date: '2026-09-05', course: 'Science Lab', rating: 'Low', note: 'Needs encouragement during lab activities.' },
]
</script>
