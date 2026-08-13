<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Gradebook & Assessments</h1>
        <p class="text-xs text-slate-500 font-geist mt-1">Assessments loaded from the institutional database.</p>
      </div>
      <button v-if="canManage" @click="showForm = !showForm" class="px-4 py-2 bg-primary-container text-white text-xs font-semibold rounded-eight shadow-xs font-geist">{{ showForm ? 'Close Form' : 'Add Assessment' }}</button>
    </div>

    <form v-if="showForm" @submit.prevent="createNewAssessment" class="bg-white rounded-xl border border-border-subtle p-6 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-3">
      <select v-model="form.course_id" required class="px-3 py-2 border rounded-lg text-sm"><option value="">Select course</option><option v-for="course in courses" :key="course.course_id" :value="course.course_id">{{ course.course_code }} — {{ course.course_name }}</option></select>
      <input v-model="form.title" required placeholder="Assessment title" class="px-3 py-2 border rounded-lg text-sm" />
      <select v-model="form.assessment_type" required class="px-3 py-2 border rounded-lg text-sm"><option>Quiz</option><option>Assignment</option><option>Midterm</option><option>Final</option></select>
      <input v-model.number="form.max_score" type="number" min="0.01" required placeholder="Max score" class="px-3 py-2 border rounded-lg text-sm" />
      <input v-model.number="form.weight" type="number" min="0" max="100" required placeholder="Weight %" class="px-3 py-2 border rounded-lg text-sm" />
      <input v-model="form.due_date" type="date" class="px-3 py-2 border rounded-lg text-sm" />
      <button :disabled="saving" class="md:col-span-3 justify-self-start px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold disabled:opacity-60">{{ saving ? 'Saving…' : 'Save Assessment' }}</button>
    </form>

    <p v-if="errorMessage" class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{{ errorMessage }}</p>
    <div v-if="loading" class="p-8 text-center text-slate-500">Loading assessments…</div>
    <div v-else class="bg-white rounded-xl border border-border-subtle p-6 shadow-xs">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs font-geist">
          <thead><tr class="bg-slate-50 text-slate-500 border-b border-slate-200"><th class="py-3 px-4 font-semibold">Assessment Title</th><th class="py-3 px-4 font-semibold">Course Code</th><th class="py-3 px-4 font-semibold">Type</th><th class="py-3 px-4 font-semibold">Weight</th><th class="py-3 px-4 font-semibold">Due Date</th><th class="py-3 px-4 font-semibold">Actions</th></tr></thead>
          <tbody class="divide-y divide-slate-100 text-slate-700">
            <tr v-if="!assessments.length"><td colspan="6" class="py-8 px-4 text-center text-slate-500">No assessments are available.</td></tr>
            <tr v-for="a in assessments" :key="a.assessment_id" class="hover:bg-slate-50/80"><td class="py-3.5 px-4 font-bold text-slate-900">{{ a.title }}</td><td class="py-3.5 px-4 font-semibold text-primary-container">{{ a.course?.course_code || a.course_id }}</td><td class="py-3.5 px-4">{{ a.assessment_type }}</td><td class="py-3.5 px-4">{{ a.weight }}%</td><td class="py-3.5 px-4 text-slate-500">{{ a.due_date || 'Not scheduled' }}</td><td class="py-3.5 px-4"><button v-if="canDelete" @click="removeAssessment(a.assessment_id)" class="text-red-700 font-semibold">Delete</button><span v-else class="text-slate-400">—</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { authStore } from '../store/auth'
import { createAssessment, deleteAssessment, fetchAssessments, fetchCourses } from '../api.js'

const assessments = ref([])
const courses = ref([])
const loading = ref(true)
const saving = ref(false)
const showForm = ref(false)
const errorMessage = ref('')
const form = reactive({ course_id: '', title: '', assessment_type: 'Quiz', max_score: 100, weight: 0, due_date: '' })
const canManage = computed(() => ['teacher', 'administrator'].includes(authStore.userRole.value))
const canDelete = computed(() => ['teacher', 'administrator'].includes(authStore.userRole.value))

async function load() {
  loading.value = true
  const [assessmentResult, courseResult] = await Promise.all([fetchAssessments(authStore.token.value), fetchCourses(authStore.token.value)])
  if (!assessmentResult.ok) errorMessage.value = assessmentResult.error || 'Unable to load assessments.'
  else assessments.value = assessmentResult.data || []
  if (courseResult.ok) courses.value = courseResult.data || []
  loading.value = false
}
async function createNewAssessment() {
  saving.value = true
  const result = await createAssessment(authStore.token.value, form)
  if (!result.ok) errorMessage.value = result.error || 'Unable to create assessment.'
  else { assessments.value.push(result.data); showForm.value = false; Object.assign(form, { course_id: '', title: '', assessment_type: 'Quiz', max_score: 100, weight: 0, due_date: '' }) }
  saving.value = false
}
async function removeAssessment(id) {
  if (!window.confirm('Delete this assessment?')) return
  const result = await deleteAssessment(authStore.token.value, id)
  if (!result.ok) errorMessage.value = result.error || 'Unable to delete assessment.'
  else assessments.value = assessments.value.filter((item) => item.assessment_id !== id)
}
onMounted(load)
</script>
