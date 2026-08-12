<template>
  <AuthenticatedLayout>
    <section class="space-y-8">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm uppercase tracking-[0.18em] text-slate-500">Course Catalog</p>
          <h1 class="text-3xl font-semibold text-slate-900">Courses</h1>
        </div>
        <button class="inline-flex items-center rounded-2xl bg-sky-600 px-5 py-3 text-white transition hover:bg-sky-700">
          Add New Course
        </button>
      </div>

      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <article v-for="course in courses" :key="course.id" class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5">
          <div class="mb-4 flex items-center justify-between gap-3">
            <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">{{ course.code }}</span>
            <StatusBadge :type="course.status" class="whitespace-nowrap" />
          </div>
          <h2 class="text-xl font-semibold text-slate-900">{{ course.name }}</h2>
          <p class="mt-3 text-sm text-slate-600">{{ course.department }} · {{ course.term }} · {{ course.credits }} credits</p>
          <div class="mt-6 flex flex-wrap gap-2">
            <button class="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">View</button>
            <button class="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Manage</button>
          </div>
        </article>
      </div>
    </section>
  </AuthenticatedLayout>
</template>

<script setup>
import AuthenticatedLayout from '../components/AuthenticatedLayout.vue'
import StatusBadge from '../components/StatusBadge.vue'

const courses = [
  { id: 1, code: 'MATH101', name: 'Algebra I', department: 'Mathematics', term: 'Fall 2026', credits: 3, status: 'Active' },
  { id: 2, code: 'ENG201', name: 'English Composition', department: 'Language Arts', term: 'Fall 2026', credits: 4, status: 'Active' },
  { id: 3, code: 'SCI150', name: 'General Science', department: 'Science', term: 'Fall 2026', credits: 3, status: 'Active' },
  { id: 4, code: 'HIST210', name: 'World History', department: 'Social Studies', term: 'Fall 2026', credits: 3, status: 'Pending' },
]
</script>
