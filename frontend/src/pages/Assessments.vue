<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">Teaching</p>
        <h1 class="mt-1 text-2xl font-bold tracking-tight text-slate-900">Assessments</h1>
        <p class="mt-1 text-sm text-slate-500">Create tests and finals for your courses. The current academic period is loaded automatically.</p>
      </div>
      <button v-if="canManage" @click="showForm = !showForm" class="btn-primary self-start px-4 py-2 text-sm font-semibold sm:self-auto">{{ showForm ? 'Close' : 'New assessment' }}</button>
    </div>

    <form v-if="showForm" @submit.prevent="createNewAssessment" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label class="text-sm font-medium text-slate-700 md:col-span-2">Course
          <select v-model="form.course_id" required class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Select course</option><option v-for="course in courses" :key="course.course_id" :value="course.course_id">{{ course.course_code }} — {{ course.course_name }}</option></select>
        </label>
        <label class="text-sm font-medium text-slate-700">Type
          <select v-model="form.assessment_type" required class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="Test">Test</option><option value="Final">Final examination</option></select>
        </label>
        <label v-if="form.assessment_type === 'Test'" class="text-sm font-medium text-slate-700">Assessment
          <select v-model.number="form.assessment_number" required class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option :value="null">Select test</option><option :value="1">Test 1</option><option :value="2">Test 2</option><option :value="3">Test 3</option></select>
        </label>
        <div v-else class="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"><span class="block text-xs font-semibold uppercase tracking-wide text-slate-500">Assessment</span><span class="font-semibold">Final examination</span></div>
        <label class="text-sm font-medium text-slate-700">Maximum score
          <input v-model.number="form.max_score" type="number" min="0.01" required class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label class="text-sm font-medium text-slate-700">Weight
          <input v-model.number="form.weight" type="number" min="0" max="100" :disabled="['Test', 'Final'].includes(form.assessment_type)" :placeholder="form.assessment_type === 'Test' ? '20% automatic' : form.assessment_type === 'Final' ? '40% automatic' : 'Weight %'" class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" />
        </label>
        <label class="text-sm font-medium text-slate-700">Due date
          <input v-model="form.due_date" type="date" class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
      </div>
      <details class="mt-4 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
        <summary class="cursor-pointer font-semibold text-slate-700">Academic period</summary>
        <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label>Academic year<input v-model.number="form.academic_year" type="number" min="2000" max="9999" required class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
          <label>Semester<select v-model="form.semester" required class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"><option v-for="semester in semesters" :key="semester" :value="semester">{{ semester }}</option></select></label>
        </div>
      </details>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <button :disabled="saving" class="btn-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{{ saving ? 'Saving…' : 'Save assessment' }}</button>
        <span class="text-xs text-slate-500">Tests use 20% and the final uses 40% automatically.</span>
      </div>
    </form>

    <p v-if="errorMessage" class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{{ errorMessage }}</p>
    <div v-if="loading" class="p-8 text-center text-slate-500">Loading assessments…</div>
    <div v-else class="bg-white rounded-xl border border-border-subtle p-6 shadow-xs">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs font-geist">
          <thead><tr class="bg-slate-50 text-slate-500 border-b border-slate-200"><th class="py-3 px-4 font-semibold">Assessment Title</th><th class="py-3 px-4 font-semibold">Course Code</th><th class="py-3 px-4 font-semibold">Type</th><th class="py-3 px-4 font-semibold">Weight</th><th class="py-3 px-4 font-semibold">Due Date</th><th class="py-3 px-4 font-semibold">Actions</th></tr></thead>
          <tbody class="divide-y divide-slate-100 text-slate-700">
            <tr v-if="!assessments.length"><td colspan="6" class="py-8 px-4 text-center text-slate-500">No assessments are available.</td></tr>
            <tr v-for="a in assessments" :key="a.assessment_id" class="hover:bg-slate-50/80"><td class="py-3.5 px-4 font-bold text-slate-900">{{ a.title }}</td><td class="py-3.5 px-4 font-semibold text-primary-container">{{ a.course?.course_code || a.course_id }}</td><td class="py-3.5 px-4">{{ a.assessment_type === 'Test' ? `Test ${a.assessment_number || ''}` : a.assessment_type }}</td><td class="py-3.5 px-4">{{ a.assessment_type === 'Test' ? 20 : a.assessment_type === 'Final' ? 40 : a.weight }}%</td><td class="py-3.5 px-4 text-slate-500">{{ a.academic_year || a.course?.academic_year || 'Year not set' }} · {{ a.semester || a.course?.semester || 'Semester not set' }} · {{ a.due_date || 'Not scheduled' }}</td><td class="py-3.5 px-4"><button v-if="canDelete" @click="removeAssessment(a.assessment_id)" class="btn-danger px-3 py-1.5 text-xs font-semibold">Delete</button><span v-else class="text-slate-400">—</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { authStore } from '../store/auth'
import { createAssessment, deleteAssessment, fetchAssessments, fetchCourses, fetchCurrentAcademicPeriod } from '../api.js'

const assessments = ref([])
const courses = ref([])
const semesters = ['Semester 1', 'Semester 2']
const loading = ref(true)
const saving = ref(false)
const showForm = ref(false)
const errorMessage = ref('')
const form = reactive({ course_id: '', title: 'Test 1', assessment_type: 'Test', assessment_number: 1, academic_year: 2026, semester: 'Semester 1', max_score: 100, weight: 20, due_date: '' })
const canManage = computed(() => ['teacher', 'administrator'].includes(authStore.userRole.value))
const canDelete = computed(() => ['teacher', 'administrator'].includes(authStore.userRole.value))

async function load() {
  loading.value = true
  const [assessmentResult, courseResult] = await Promise.all([fetchAssessments(authStore.token.value, { academic_year: form.academic_year, semester: form.semester }), fetchCourses(authStore.token.value, { academic_year: form.academic_year, semester: form.semester })])
  if (!assessmentResult.ok) errorMessage.value = assessmentResult.error || 'Unable to load assessments.'
  else assessments.value = assessmentResult.data || []
  if (courseResult.ok) courses.value = courseResult.data || []
  loading.value = false
}
watch([() => form.assessment_type, () => form.assessment_number], ([type]) => {
  if (type === 'Test') form.title = `Test ${form.assessment_number || ''}`.trim()
  if (type === 'Final') form.title = 'Final Examination'
})

async function createNewAssessment() {
  saving.value = true
  const result = await createAssessment(authStore.token.value, form)
  if (!result.ok) errorMessage.value = result.error || 'Unable to create assessment.'
  else { assessments.value.push(result.data); showForm.value = false; Object.assign(form, { course_id: '', title: 'Test 1', assessment_type: 'Test', assessment_number: 1, academic_year: form.academic_year, semester: form.semester, max_score: 100, weight: 20, due_date: '' }) }
  saving.value = false
}
async function removeAssessment(id) {
  if (!window.confirm('Delete this assessment?')) return
  const result = await deleteAssessment(authStore.token.value, id)
  if (!result.ok) errorMessage.value = result.error || 'Unable to delete assessment.'
  else assessments.value = assessments.value.filter((item) => item.assessment_id !== id)
}
async function initialize() {
  const periodResult = await fetchCurrentAcademicPeriod(authStore.token.value)
  if (periodResult.ok) {
    form.academic_year = periodResult.data.academic_year
    form.semester = periodResult.data.semester
  } else errorMessage.value = periodResult.error || 'Unable to load the current academic period.'
  await load()
}

onMounted(initialize)
</script>
