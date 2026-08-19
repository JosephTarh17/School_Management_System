<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Class Sessions & Scheduling</h1>
        <p class="text-xs text-slate-500 font-geist mt-1">Schedules loaded from the institutional database. Teachers create their own sessions through Teacher Attendance.</p>
      </div>
      <button v-if="canManage" @click="showForm = !showForm" class="btn-primary px-4 py-2 text-xs font-semibold font-geist">{{ showForm ? 'Close Form' : '+ Schedule Session' }}</button>
    </div>

    <form v-if="showForm" @submit.prevent="createNewSession" class="bg-white rounded-xl border border-border-subtle p-6 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-3">
      <select v-model="form.course_id" required class="px-3 py-2 border rounded-lg text-sm"><option value="">Select course</option><option v-for="course in courses" :key="course.course_id" :value="course.course_id">{{ course.course_code }} — {{ course.course_name }}</option></select>
      <input v-model="form.teacher_id" required placeholder="Teacher UUID" class="px-3 py-2 border rounded-lg text-sm" />
      <input v-model="form.room_id" required placeholder="Room UUID" class="px-3 py-2 border rounded-lg text-sm" />
      <input v-model.number="form.academic_year" type="number" min="2000" max="9999" required placeholder="Academic year e.g. 2026" class="px-3 py-2 border rounded-lg text-sm" />
      <select v-model="form.semester" required class="px-3 py-2 border rounded-lg text-sm"><option v-for="semester in semesters" :key="semester" :value="semester">{{ semester }}</option></select>
      <input v-model="form.start_time" type="datetime-local" required class="px-3 py-2 border rounded-lg text-sm" />
      <input v-model="form.end_time" type="datetime-local" required class="px-3 py-2 border rounded-lg text-sm" />
      <input v-model="form.recurrence_pattern" placeholder="Recurrence (optional)" class="px-3 py-2 border rounded-lg text-sm" />
      <button :disabled="saving" class="btn-primary md:col-span-3 justify-self-start px-4 py-2 text-white text-sm font-semibold disabled:opacity-60">{{ saving ? 'Saving…' : 'Save Session' }}</button>
    </form>

    <p v-if="errorMessage" class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{{ errorMessage }}</p>
    <div v-if="loading" class="p-8 text-center text-slate-500">Loading class sessions…</div>
    <div v-else-if="!sessions.length" class="bg-white rounded-xl border border-border-subtle p-8 text-center text-slate-500">No class sessions are available.</div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div v-for="session in sessions" :key="session.session_id" class="bg-white rounded-xl border border-border-subtle p-5 shadow-xs hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between mb-3"><span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 font-geist">{{ session.course?.course_code || session.course_id }}</span><button v-if="canManage" @click="removeSession(session.session_id)" class="btn-danger px-3 py-1.5 text-xs font-semibold">Delete</button></div>
        <h3 class="text-base font-bold text-slate-900 font-sans mb-1">{{ session.course?.course_name || 'Scheduled session' }}</h3>
        <p class="text-xs text-slate-500 font-geist mb-3">{{ session.academic_year || session.course?.academic_year || 'Year not assigned' }} · {{ session.semester || session.course?.semester || 'Semester not assigned' }} · Instructor: {{ session.teacher?.full_name || session.teacher_id }}</p>
        <div class="space-y-1.5 text-xs text-slate-600 font-geist border-t border-slate-100 pt-3"><div class="flex items-center gap-2"><span class="material-symbols-outlined text-base text-slate-400">schedule</span><span>{{ formatTime(session.start_time) }} — {{ formatTime(session.end_time) }}</span></div><div class="flex items-center gap-2"><span class="material-symbols-outlined text-base text-slate-400">room</span><span>{{ session.room?.room_name || session.room_id }}</span></div></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { authStore } from '../store/auth'
import { createClassSession, deleteClassSession, fetchClassSessions, fetchCourses, fetchCurrentAcademicPeriod } from '../api.js'

const sessions = ref([])
const courses = ref([])
const loading = ref(true)
const saving = ref(false)
const showForm = ref(false)
const errorMessage = ref('')
const semesters = ['Semester 1', 'Semester 2']
const form = reactive({ course_id: '', teacher_id: '', room_id: '', academic_year: 2026, semester: 'Semester 1', start_time: '', end_time: '', recurrence_pattern: '' })
const canManage = computed(() => authStore.userRole.value === 'administrator')
const formatTime = (value) => value ? new Date(value).toLocaleString() : 'Not scheduled'

async function load() {
  loading.value = true
  const [sessionResult, courseResult] = await Promise.all([fetchClassSessions(authStore.token.value), fetchCourses(authStore.token.value)])
  if (!sessionResult.ok) errorMessage.value = sessionResult.error || 'Unable to load sessions.'
  else sessions.value = sessionResult.data || []
  if (courseResult.ok) courses.value = courseResult.data || []
  loading.value = false
}
async function createNewSession() {
  saving.value = true
  const result = await createClassSession(authStore.token.value, form)
  if (!result.ok) errorMessage.value = result.error || 'Unable to create session.'
  else { sessions.value.push(result.data); showForm.value = false; Object.assign(form, { course_id: '', teacher_id: '', room_id: '', academic_year: form.academic_year, semester: form.semester, start_time: '', end_time: '', recurrence_pattern: '' }) }
  saving.value = false
}
async function removeSession(id) {
  if (!window.confirm('Delete this class session?')) return
  const result = await deleteClassSession(authStore.token.value, id)
  if (!result.ok) errorMessage.value = result.error || 'Unable to delete session.'
  else sessions.value = sessions.value.filter((session) => session.session_id !== id)
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
