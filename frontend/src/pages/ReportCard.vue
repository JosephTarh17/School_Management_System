<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p class="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Academic Results</p><h1 class="mt-1 text-2xl font-bold text-slate-950">Report card</h1><p class="mt-1 text-sm text-slate-500">Official results become visible here only after administrator publication.</p></div><button class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" @click="printReport">Print report card</button></header>
    <p v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{{ errorMessage }}</p>
    <div v-if="isGuardian" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><label class="text-sm font-medium text-slate-700">Child<select v-model="selectedStudentId" class="mt-1 block w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Select child</option><option v-for="child in children" :key="child.student_id" :value="child.student_id">{{ child.student?.full_name || child.full_name }}</option></select></label></div>
    <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><h2 class="font-bold text-slate-900">Semester report card</h2><p class="mt-1 text-xs text-slate-500">{{ academicYear }} · {{ semester }}</p></div><div class="flex flex-col gap-3 sm:flex-row"><label class="text-sm font-medium text-slate-700">Academic year<input v-model.number="academicYear" type="number" min="2000" max="9999" class="mt-1 block w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm" @change="load" /></label><label class="text-sm font-medium text-slate-700">Semester<select v-model="semester" class="mt-1 block w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm" @change="load"><option v-for="option in semesters" :key="option" :value="option">{{ option }}</option></select></label></div></div></div>

    <div v-if="reportCard" id="printable-report-card" class="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
      <div class="grid grid-cols-2 gap-4 md:grid-cols-6"><div class="rounded-lg bg-indigo-50 p-4"><p class="text-xs text-indigo-600">Overall average</p><p class="mt-1 text-2xl font-bold text-indigo-900">{{ format(reportCard.overall_average) }}%</p></div><div class="rounded-lg bg-emerald-50 p-4"><p class="text-xs text-emerald-600">GPA</p><p class="mt-1 text-2xl font-bold text-emerald-900">{{ format(reportCard.gpa) }}/4</p></div><div class="rounded-lg bg-slate-50 p-4"><p class="text-xs text-slate-500">Credits earned</p><p class="mt-1 text-2xl font-bold text-slate-900">{{ reportCard.earned_credits }}</p></div><div class="rounded-lg bg-slate-50 p-4"><p class="text-xs text-slate-500">Total credits</p><p class="mt-1 text-2xl font-bold text-slate-900">{{ reportCard.total_credits }}</p></div><div class="rounded-lg bg-slate-50 p-4"><p class="text-xs text-slate-500">Passed</p><p class="mt-1 text-2xl font-bold text-slate-900">{{ reportCard.passed_courses }}</p></div><div class="rounded-lg bg-slate-50 p-4"><p class="text-xs text-slate-500">Status</p><p class="mt-1 text-lg font-bold" :class="reportCard.promotion_status === 'Pass' ? 'text-emerald-700' : 'text-amber-700'">{{ reportCard.promotion_status }}</p></div></div>
      <div><h2 class="mb-3 font-bold text-slate-900">Course results</h2><div class="overflow-x-auto"><table class="min-w-[850px] w-full text-left text-sm"><thead class="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-4 py-3">Course</th><th class="px-4 py-3">Credits</th><th class="px-4 py-3">Average</th><th class="px-4 py-3">Grade</th><th class="px-4 py-3">GPA</th><th class="px-4 py-3">Assessment details</th><th class="px-4 py-3">Result</th></tr></thead><tbody><tr v-for="course in reportCard.courses" :key="course.course_id" class="border-b border-slate-100 last:border-0"><td class="px-4 py-3"><p class="font-semibold text-slate-900">{{ course.course_code }}</p><p class="text-xs text-slate-500">{{ course.course_name }}</p></td><td class="px-4 py-3">{{ course.credit_units }}</td><td class="px-4 py-3 font-semibold">{{ format(course.average) }}%</td><td class="px-4 py-3 font-bold text-indigo-700">{{ course.letter_grade || '—' }}</td><td class="px-4 py-3">{{ format(course.gpa) }}</td><td class="px-4 py-3"><div class="space-y-1 text-xs"><p v-for="item in course.assessments" :key="item.assessment.assessment_id"><span class="font-semibold">{{ assessmentLabel(item.assessment) }}:</span> {{ item.record_status === 'ABSENT_JUSTIFIED' ? 'Excused — excluded' : item.score == null ? 'Pending' : `${format(item.percentage)}%` }}</p></div></td><td class="px-4 py-3"><span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="course.passed ? 'bg-emerald-100 text-emerald-700' : course.complete ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'">{{ course.complete ? course.passed ? 'Passed' : 'Failed' : 'Incomplete' }}</span></td></tr><tr v-if="!reportCard.courses?.length"><td colspan="7" class="px-4 py-8 text-center text-slate-500">No registered courses are available for this semester.</td></tr></tbody></table></div></div>
      <p class="border-t border-slate-200 pt-4 text-xs text-slate-500">This report card is official because it was published by an administrator. A justified absence is excluded from the affected assessment calculation; an unjustified absence receives zero.</p>
    </div>
    <div v-else class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">No administrator-published report card is available for this semester.</div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { authStore } from '../store/auth'
import { fetchCurrentAcademicPeriod, fetchGuardianChildren, fetchReportCard } from '../api.js'

const currentUser = computed(() => authStore.user.value)
const isGuardian = computed(() => authStore.userRole.value === 'guardian')
const children = ref([])
const selectedStudentId = ref('')
const semesters = ['Semester 1', 'Semester 2']
const academicYear = ref(2026)
const semester = ref('Semester 1')
const reportCard = ref(null)
const errorMessage = ref('')
function format(value) { return value == null || Number.isNaN(Number(value)) ? '—' : Number(value).toFixed(2) }
function assessmentLabel(assessment) { return assessment?.assessment_type === 'Test' ? `Test ${assessment.assessment_number || ''}` : assessment?.assessment_type || assessment?.title || 'Assessment' }
async function load() {
  errorMessage.value = ''; reportCard.value = null
  const studentId = isGuardian.value ? selectedStudentId.value : currentUser.value?.profile?.student_id
  if (!studentId) return
  const result = await fetchReportCard(authStore.token.value, studentId, { academic_year: academicYear.value, semester: semester.value })
  if (!result.ok) errorMessage.value = result.error
  else if (result.data?.report_cards?.length) reportCard.value = { ...result.data.calculation, ...result.data.report_cards[0] }
}
function printReport() { window.print() }
onMounted(async () => {
  const periodResult = await fetchCurrentAcademicPeriod(authStore.token.value)
  if (periodResult.ok) {
    academicYear.value = periodResult.data.academic_year
    semester.value = periodResult.data.semester
  } else errorMessage.value = periodResult.error || 'Unable to load the current academic period.'
  if (isGuardian.value) {
    const result = await fetchGuardianChildren(authStore.token.value)
    if (result.ok) { children.value = result.data || []; selectedStudentId.value = children.value[0]?.student_id || '' }
  } else await load()
})
watch(selectedStudentId, load)
</script>
