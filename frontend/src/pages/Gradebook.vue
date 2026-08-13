<template>
  <section class="space-y-6">
    <header>
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Teaching Workspace</p>
      <h1 class="mt-1 text-2xl font-bold text-slate-950">Teacher gradebook</h1>
      <p class="mt-1 text-sm text-slate-500">Enter scores for enrolled students and publish results to student portals.</p>
    </header>
    <p v-if="message" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{{ message }}</p>
    <p v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{{ errorMessage }}</p>
    <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label class="text-sm text-slate-700">Course<select v-model="selectedCourseId" class="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"><option value="">Select course</option><option v-for="course in courses" :key="course.course_id" :value="course.course_id">{{ course.course_code }} — {{ course.course_name }}</option></select></label>
        <label class="text-sm text-slate-700">Assessment<select v-model="selectedAssessmentId" class="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"><option value="">Select assessment</option><option v-for="assessment in courseAssessments" :key="assessment.assessment_id" :value="assessment.assessment_id">{{ assessment.title }} ({{ assessment.max_score }} pts)</option></select></label>
        <label class="text-sm text-slate-700">Evaluation date<input v-model="evaluationDate" type="date" class="mt-1 block w-full rounded-lg border px-3 py-2 text-sm" /></label>
      </div>
    </div>
    <div v-if="selectedAssessment" class="overflow-x-auto rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 class="font-bold text-slate-900">{{ selectedAssessment.title }}</h2><p class="text-xs text-slate-500">Maximum {{ selectedAssessment.max_score }} points · Weight {{ selectedAssessment.weight }}%</p></div><button @click="saveAll" :disabled="saving" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{{ saving ? 'Saving…' : 'Save gradebook' }}</button></div>
      <table class="min-w-full text-left text-sm"><thead class="border-b text-xs uppercase text-slate-500"><tr><th class="px-3 py-2">Student</th><th class="px-3 py-2">Score</th><th class="px-3 py-2">Published</th><th class="px-3 py-2">Current grade</th></tr></thead><tbody><tr v-for="student in students" :key="student.student_id" class="border-b last:border-0"><td class="px-3 py-3 font-semibold text-slate-900">{{ student.full_name }}</td><td class="px-3 py-3"><input v-model="rows[student.student_id].score" type="number" min="0" :max="selectedAssessment.max_score" step="0.01" class="w-28 rounded-lg border px-2 py-1.5 text-sm" /></td><td class="px-3 py-3"><label class="inline-flex items-center gap-2 text-xs"><input v-model="rows[student.student_id].published" type="checkbox" /> Publish</label></td><td class="px-3 py-3 text-slate-600">{{ rows[student.student_id].grade || 'Not graded' }}</td></tr><tr v-if="!students.length"><td colspan="4" class="px-3 py-8 text-center text-slate-500">No actively enrolled students are available for this course.</td></tr></tbody></table>
    </div>
    <div v-else class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">Select a course and assessment to open the gradebook.</div>
  </section>
</template>
<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { authStore } from '../store/auth'
import { fetchAcademicRecords, fetchAssessments, fetchCourses, fetchEnrollments, fetchStudents, saveAcademicRecord, updateAcademicRecord } from '../api.js'
const courses = ref([])
const assessments = ref([])
const students = ref([])
const records = ref([])
const selectedCourseId = ref('')
const selectedAssessmentId = ref('')
const evaluationDate = ref(new Date().toISOString().slice(0, 10))
const rows = reactive({})
const saving = ref(false)
const errorMessage = ref('')
const message = ref('')
const token = () => authStore.token.value
const courseAssessments = computed(() => assessments.value.filter((assessment) => assessment.course_id === selectedCourseId.value))
const selectedAssessment = computed(() => assessments.value.find((assessment) => assessment.assessment_id === selectedAssessmentId.value))
function resetRows() {
  Object.keys(rows).forEach((key) => delete rows[key])
  students.value.forEach((student) => {
    const record = records.value.find((item) => item.student_id === student.student_id && item.assessment_id === selectedAssessmentId.value)
    rows[student.student_id] = { score: record?.score ?? '', published: record?.published === true, grade: record?.grade || '', recordId: record?.record_id || null }
  })
}
watch(selectedCourseId, async (courseId) => { selectedAssessmentId.value = courseAssessments.value[0]?.assessment_id || ''; if (courseId) { const result = await fetchEnrollments(token(), { course_id: courseId, status: 'active' }); const ids = result.ok ? (result.data || []).map((entry) => entry.student_id) : []; students.value = (await fetchStudents(token())).data?.filter((student) => ids.includes(student.student_id)) || [] } else students.value = []; resetRows() })
watch(selectedAssessmentId, resetRows)
async function load() {
  const [coursesResult, assessmentsResult, recordsResult] = await Promise.all([fetchCourses(token()), fetchAssessments(token()), fetchAcademicRecords(token())])
  if (coursesResult.ok) courses.value = coursesResult.data || []
  if (assessmentsResult.ok) assessments.value = assessmentsResult.data || []
  if (recordsResult.ok) records.value = recordsResult.data || []
}
async function saveAll() {
  errorMessage.value = ''; message.value = ''; saving.value = true
  try {
    for (const student of students.value) {
      const row = rows[student.student_id]
      if (row.score === '' || row.score == null) continue
      const body = { student_id: student.student_id, assessment_id: selectedAssessmentId.value, score: Number(row.score), published: row.published, evaluation_date: evaluationDate.value }
      const result = row.recordId ? await updateAcademicRecord(token(), row.recordId, { score: body.score, published: body.published, evaluation_date: body.evaluation_date }) : await saveAcademicRecord(token(), body)
      if (!result.ok) throw new Error(`${student.full_name}: ${result.error}`)
    }
    message.value = 'Gradebook saved. Published results are now visible to authorized students.'
    const refreshed = await fetchAcademicRecords(token())
    if (refreshed.ok) records.value = refreshed.data || []
    resetRows()
  } catch (error) { errorMessage.value = error.message || 'Unable to save gradebook.' }
  finally { saving.value = false }
}
onMounted(load)
</script>
