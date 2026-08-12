<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Gradebook & Assessments</h1>
      <p class="text-xs text-slate-500 font-geist mt-1">Weighted evaluation matrices, exam scoring, and GPA computations.</p>
    </div>

    <div class="bg-white rounded-xl border border-border-subtle p-6 shadow-xs">
      <h2 class="text-base font-bold text-slate-900 mb-4 font-sans">Active Examinations & Assignments</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs font-geist">
          <thead>
            <tr class="bg-slate-50 text-slate-500 border-b border-slate-200">
              <th class="py-3 px-4 font-semibold">Assessment Title</th>
              <th class="py-3 px-4 font-semibold">Course Code</th>
              <th class="py-3 px-4 font-semibold">Type</th>
              <th class="py-3 px-4 font-semibold">Weight</th>
              <th class="py-3 px-4 font-semibold">Due Date</th>
              <th class="py-3 px-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-700">
            <tr v-for="a in assessments" :key="a.title" class="hover:bg-slate-50/80">
              <td class="py-3.5 px-4 font-bold text-slate-900">{{ a.title }}</td>
              <td class="py-3.5 px-4 font-semibold text-primary-container">{{ a.code }}</td>
              <td class="py-3.5 px-4">{{ a.type }}</td>
              <td class="py-3.5 px-4">{{ a.weight }}</td>
              <td class="py-3.5 px-4 text-slate-500">{{ a.due }}</td>
              <td class="py-3.5 px-4">
                <Badge :type="a.status === 'Graded' ? 'present' : 'warning'" :text="a.status" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import Badge from '../components/Badge.vue'

const assessments = [
  { title: 'CS-301 Midterm Examination', code: 'CS-301', type: 'Exam', weight: '30%', due: 'Aug 14, 2026', status: 'Upcoming' },
  { title: 'Relational Schema Project', code: 'CS-301', type: 'Project', weight: '20%', due: 'Aug 05, 2026', status: 'Graded' },
  { title: 'Software Architecture Quiz 2', code: 'CS-304', type: 'Quiz', weight: '10%', due: 'Aug 10, 2026', status: 'Graded' }
]
</script>
