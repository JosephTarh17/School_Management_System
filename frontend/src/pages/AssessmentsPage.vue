<template>
  <AuthenticatedLayout>
    <section class="space-y-8">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-sm uppercase tracking-[0.18em] text-slate-500">Assessments</p>
          <h1 class="text-3xl font-semibold text-slate-900">Gradebook</h1>
        </div>
        <button class="inline-flex items-center rounded-2xl bg-sky-600 px-5 py-3 text-white transition hover:bg-sky-700">
          Create Assessment
        </button>
      </div>

      <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-slate-500">Manage assessment details, due dates, weights, and grading status.</p>
          </div>
          <button class="rounded-2xl border border-slate-200 px-4 py-3 text-slate-700 hover:bg-slate-50">Export report</button>
        </div>

        <div class="mt-6 overflow-hidden rounded-3xl border border-slate-200">
          <table class="min-w-full border-collapse text-left text-sm">
            <thead class="bg-slate-50 text-slate-600">
              <tr>
                <th class="px-5 py-4 font-semibold">Title</th>
                <th class="px-5 py-4 font-semibold">Course</th>
                <th class="px-5 py-4 font-semibold">Due date</th>
                <th class="px-5 py-4 font-semibold">Weight</th>
                <th class="px-5 py-4 font-semibold">Status</th>
                <th class="px-5 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="assessment in assessments" :key="assessment.id" class="border-t border-slate-200">
                <td class="px-5 py-4 font-medium text-slate-900">{{ assessment.title }}</td>
                <td class="px-5 py-4 text-slate-600">{{ assessment.course }}</td>
                <td class="px-5 py-4 text-slate-600">{{ assessment.dueDate }}</td>
                <td class="px-5 py-4 text-slate-600">{{ assessment.weight }}%</td>
                <td class="px-5 py-4 text-slate-600">{{ assessment.status }}</td>
                <td class="px-5 py-4 text-slate-600">
                  <button class="rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">Grade</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </AuthenticatedLayout>
</template>

<script setup>
import AuthenticatedLayout from '../components/AuthenticatedLayout.vue'

const assessments = [
  { id: 1, title: 'Quiz 1', course: 'Algebra I', dueDate: '2026-09-15', weight: 10, status: 'Open' },
  { id: 2, title: 'Midterm Exam', course: 'General Science', dueDate: '2026-10-12', weight: 25, status: 'Draft' },
  { id: 3, title: 'Essay Assignment', course: 'English Composition', dueDate: '2026-10-02', weight: 15, status: 'Open' },
]
</script>
