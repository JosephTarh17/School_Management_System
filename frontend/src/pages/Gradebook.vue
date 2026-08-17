<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Teaching Workspace</p>
        <h1 class="mt-1 text-2xl font-bold text-slate-950">Excel-style gradebook</h1>
        <p class="mt-1 max-w-3xl text-sm text-slate-500">Select one of your courses and one test or final exam, enter marks for actively registered students, and confirm the assessment for administrator review.</p>
      </div>
      <div class="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-right">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">Passing threshold</p>
        <p class="text-lg font-bold text-indigo-900">60% · 2.4 GPA</p>
      </div>
    </header>

    <p v-if="message" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{{ message }}</p>
    <p v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{{ errorMessage }}</p>

    <div class="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-5">
      <label class="text-sm font-medium text-slate-700">Course
        <select v-model="selectedCourseId" class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" :disabled="loading">
          <option value="">Select course</option>
          <option v-for="course in courses" :key="course.course_id" :value="course.course_id">{{ course.course_code }} — {{ course.course_name }} ({{ course.credit_units || 0 }} credits)</option>
        </select>
      </label>
      <label class="text-sm font-medium text-slate-700">Academic year
        <input v-model.number="academicYear" type="number" min="2000" max="9999" class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" @change="loadGradebook" />
      </label>
      <label class="text-sm font-medium text-slate-700">Semester
        <select v-model="semester" class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" @change="loadGradebook">
          <option v-for="option in semesters" :key="option" :value="option">{{ option }}</option>
        </select>
      </label>
      <label class="text-sm font-medium text-slate-700 md:col-span-2">Assessment or exam
        <select v-model="selectedAssessmentId" class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" :disabled="loading || !assessments.length">
          <option value="">Select assessment</option>
          <option v-for="assessment in assessments" :key="assessment.assessment_id" :value="assessment.assessment_id">{{ assessmentLabel(assessment) }} · {{ assessment.max_score }} points · {{ assessmentWeight(assessment) }}%</option>
        </select>
      </label>
    </div>

    <div v-if="selectedAssessment" class="grid grid-cols-2 gap-3 md:grid-cols-5">
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p class="text-xs text-slate-500">Assessment</p><p class="mt-1 font-bold text-slate-900">{{ assessmentLabel(selectedAssessment) }}</p></div>
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p class="text-xs text-slate-500">Weight</p><p class="mt-1 text-xl font-bold text-indigo-700">{{ assessmentWeight(selectedAssessment) }}%</p></div>
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p class="text-xs text-slate-500">Class average</p><p class="mt-1 text-xl font-bold text-slate-900">{{ formatPercent(classAverage) }}</p></div>
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p class="text-xs text-slate-500">Students marked</p><p class="mt-1 text-xl font-bold text-slate-900">{{ markedCount }}/{{ rows.length }}</p></div>
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p class="text-xs text-slate-500">Assessment state</p><p class="mt-1 text-sm font-bold" :class="selectedAssessment.published ? 'text-emerald-700' : selectedAssessment.teacher_confirmed ? 'text-amber-700' : 'text-slate-900'">{{ assessmentState(selectedAssessment) }}</p></div>
    </div>

    <div v-if="selectedAssessment" class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
        <div><h2 class="font-bold text-slate-900">{{ selectedAssessment.title }}</h2><p class="mt-1 text-xs text-slate-500">Teacher marks are provisional until an administrator reviews and publishes them.</p></div>
        <div class="flex flex-wrap gap-2">
          <button class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50" :disabled="saving || selectedAssessment.published" @click="saveAll">{{ saving ? 'Saving…' : 'Save marks' }}</button>
          <button class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" :disabled="saving || selectedAssessment.teacher_confirmed || selectedAssessment.published || !canConfirm" @click="confirmAssessment">{{ selectedAssessment.teacher_confirmed ? 'Confirmed for review' : 'Confirm assessment' }}</button>
        </div>
      </div>
      <table class="min-w-[900px] w-full text-left text-sm">
        <thead class="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-4 py-3">Student</th><th class="px-4 py-3">Mark / {{ selectedAssessment.max_score }}</th><th class="px-4 py-3">Absence decision</th><th class="px-4 py-3">Percentage</th><th class="px-4 py-3">Live grade</th><th class="px-4 py-3">Publication</th></tr></thead>
        <tbody>
          <tr v-for="row in rows" :key="row.student.student_id" class="border-b border-slate-100 last:border-0">
            <td class="px-4 py-3 font-semibold text-slate-900">{{ row.student.full_name }}</td>
            <td class="px-4 py-3"><input v-model="row.score" type="number" min="0" :max="selectedAssessment.max_score" step="0.01" class="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" :disabled="row.status !== 'GRADED' || selectedAssessment.published" @input="recalculateRow(row)" /></td>
            <td class="px-4 py-3"><select v-model="row.status" class="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" :disabled="selectedAssessment.published" @change="recalculateRow(row)"><option value="GRADED">Mark entered</option><option value="ABSENT_UNJUSTIFIED">Absent — no justification (0)</option><option value="ABSENT_JUSTIFIED">Absent — justified</option></select><input v-if="row.status === 'ABSENT_JUSTIFIED'" v-model="row.absence_reason" class="mt-2 w-64 rounded-lg border border-slate-300 px-3 py-2 text-xs" placeholder="Justification" :disabled="selectedAssessment.published" /></td>
            <td class="px-4 py-3 font-semibold text-slate-700">{{ row.percentage == null ? 'Excluded' : `${formatPercent(row.percentage)}%` }}</td>
            <td class="px-4 py-3"><span class="font-bold text-indigo-700">{{ row.grade || '—' }}</span><span v-if="row.status === 'ABSENT_UNJUSTIFIED'" class="ml-2 text-xs text-red-600">0%</span></td>
            <td class="px-4 py-3"><span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="row.published ? 'bg-emerald-100 text-emerald-700' : row.teacher_confirmed ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'">{{ row.published ? 'Published' : row.teacher_confirmed ? 'Confirmed' : 'Draft' }}</span></td>
          </tr>
          <tr v-if="!rows.length"><td colspan="6" class="px-4 py-10 text-center text-slate-500">No actively registered students are available for this course.</td></tr>
        </tbody>
      </table>
    </div>
    <div v-else class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">Select a course and an assessment to open the gradebook.</div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { authStore } from '../store/auth'
import { fetchCourses, fetchGradingGradebook, saveGradingMark, confirmGradingAssessment } from '../api.js'

const courses = ref([])
const assessments = ref([])
const rows = ref([])
const selectedCourseId = ref('')
const selectedAssessmentId = ref('')
const semesters = ['Semester 1', 'Semester 2']
const academicYear = ref(2026)
const semester = ref('Semester 1')
const selectedCourse = ref(null)
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const message = ref('')
const token = () => authStore.token.value

const selectedAssessment = computed(() => assessments.value.find((assessment) => assessment.assessment_id === selectedAssessmentId.value) || null)
const markedCount = computed(() => rows.value.filter((row) => row.status === 'GRADED' && row.score !== '' && row.score != null || row.status !== 'GRADED').length)
const canConfirm = computed(() => rows.value.length > 0 && rows.value.every((row) => row.status !== 'ABSENT_JUSTIFIED' || String(row.absence_reason || '').trim().length > 0) && rows.value.every((row) => row.status !== 'GRADED' || row.score !== '' && row.score != null))
const classAverage = computed(() => {
  const values = rows.value.map((row) => row.percentage).filter((value) => value != null)
  return values.length ? values.reduce((sum, value) => sum + Number(value), 0) / values.length : null
})

function formatPercent(value) { return value == null || Number.isNaN(Number(value)) ? '—' : Number(value).toFixed(2) }
function assessmentWeight(assessment) { return assessment?.assessment_type === 'Final' ? 40 : assessment?.assessment_type === 'Test' ? 20 : Number(assessment?.weight || 0) }
function assessmentLabel(assessment) { return assessment?.assessment_type === 'Test' ? `Test ${assessment.assessment_number || ''}` : assessment?.assessment_type || assessment?.title || 'Assessment' }
function assessmentState(assessment) { return assessment?.published ? 'Published by administrator' : assessment?.teacher_confirmed ? 'Awaiting administrator review' : 'Draft' }
function recalculateRow(row) {
  if (row.status === 'ABSENT_UNJUSTIFIED') { row.score = 0; row.percentage = 0; row.grade = 'F'; return }
  if (row.status === 'ABSENT_JUSTIFIED') { row.score = ''; row.percentage = null; row.grade = ''; return }
  const score = Number(row.score)
  const max = Number(selectedAssessment.value?.max_score || 0)
  row.percentage = max && row.score !== '' ? (score / max) * 100 : null
  row.grade = row.percentage == null ? '' : row.percentage >= 90 ? 'A' : row.percentage >= 80 ? 'B' : row.percentage >= 70 ? 'C' : row.percentage >= 60 ? 'D' : 'F'
}
function mapResponse(payload) {
  selectedCourse.value = payload?.course || null
  assessments.value = payload?.assessments || []
  if (!selectedAssessmentId.value || !assessments.value.some((item) => item.assessment_id === selectedAssessmentId.value)) selectedAssessmentId.value = payload?.selected_assessment_id || assessments.value[0]?.assessment_id || ''
  rows.value = (payload?.students || []).map((entry) => {
    const record = entry.current_record
    const row = { student: entry.student, score: record?.score ?? '', status: record?.record_status || (record?.score == null ? 'ABSENT_JUSTIFIED' : 'GRADED'), absence_reason: record?.absence_reason || '', percentage: null, grade: record?.grade || '', teacher_confirmed: record?.teacher_confirmed === true, published: record?.published === true }
    recalculateRow(row)
    return row
  })
}
async function loadGradebook() {
  if (!selectedCourseId.value) return
  loading.value = true; errorMessage.value = ''; message.value = ''
  try {
    const result = await fetchGradingGradebook(token(), { course_id: selectedCourseId.value, academic_year: academicYear.value, semester: semester.value, assessment_id: selectedAssessmentId.value })
    if (!result.ok) throw new Error(result.error)
    mapResponse(result.data)
  } catch (error) { errorMessage.value = error.message || 'Unable to load the gradebook.' }
  finally { loading.value = false }
}
async function saveAll() {
  if (!selectedAssessment.value) return
  saving.value = true; errorMessage.value = ''; message.value = ''
  try {
    for (const row of rows.value) {
      const result = await saveGradingMark(token(), { student_id: row.student.student_id, assessment_id: selectedAssessment.value.assessment_id, score: row.status === 'GRADED' ? Number(row.score) : undefined, record_status: row.status, absence_reason: row.status === 'ABSENT_JUSTIFIED' ? row.absence_reason : undefined })
      if (!result.ok) throw new Error(`${row.student.full_name}: ${result.error}`)
    }
    message.value = 'Marks saved. Confirm this assessment when every student has a mark or absence decision.'
    await loadGradebook()
    return true
  } catch (error) { errorMessage.value = error.message || 'Unable to save marks.'; return false }
  finally { saving.value = false }
}
async function confirmAssessment() {
  saving.value = true; errorMessage.value = ''; message.value = ''
  try {
    const saved = await saveAll()
    if (saved === false) return
    const result = await confirmGradingAssessment(token(), selectedAssessment.value.assessment_id)
    if (!result.ok) throw new Error(result.error)
    message.value = 'Assessment confirmed and submitted for administrator review.'
    await loadGradebook()
  } catch (error) { errorMessage.value = error.message || 'Unable to confirm assessment.' }
  finally { saving.value = false }
}
watch(selectedCourseId, async () => { selectedAssessmentId.value = ''; await loadGradebook() })
watch(selectedAssessmentId, loadGradebook)
onMounted(async () => {
  const result = await fetchCourses(token())
  if (result.ok) { courses.value = result.data || []; selectedCourseId.value = courses.value[0]?.course_id || '' }
})
</script>
