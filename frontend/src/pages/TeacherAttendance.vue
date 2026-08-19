<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 font-sans">Teacher Attendance Entry</h1>
        <p class="mt-1 text-xs text-slate-500 font-geist">Select one of your class sessions, mark the roster, and save the attendance record.</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <button type="button" :disabled="loading || saving" @click="showCreatePanel = !showCreatePanel" class="btn-primary px-3 py-2 text-xs font-semibold">
          {{ showCreatePanel ? 'Close session form' : 'Create class session' }}
        </button>
        <button
          type="button"
          :disabled="loading || saving || !roster.length"
          @click="markAll('Present')"
          class="btn-secondary px-3 py-2 text-xs font-semibold"
        >
          Mark all present
        </button>
        <button
          type="button"
          :disabled="loading || saving || !roster.length || !selectedSessionId"
          @click="saveAttendance"
          class="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white transition-all disabled:opacity-50"
        >
          <span class="material-symbols-outlined text-base">save</span>
          {{ saving ? 'Saving…' : 'Save attendance' }}
        </button>
      </div>
    </div>

    <form v-if="showCreatePanel" @submit.prevent="createSession" class="rounded-xl border border-blue-200 bg-blue-50/60 p-5 shadow-xs">
      <div class="mb-4">
        <h2 class="text-base font-bold text-slate-900 font-sans">Create class session</h2>
        <p class="mt-1 text-xs text-slate-600">Create a session for yourself, then use it immediately to record attendance.</p>
      </div>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <label class="block text-xs font-semibold text-slate-700">
          Course
          <input v-model="courseSearchQuery" type="search" placeholder="Search course name or code" :disabled="loading || saving" class="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50" />
          <select v-model="newSession.course_id" required :disabled="loading || saving" class="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50">
            <option value="">Select a course</option>
            <option v-for="course in filteredAvailableCourses" :key="course.course_id" :value="course.course_id">
              {{ course.course_code }} — {{ course.course_name }}{{ course.semester ? ` · ${course.semester}` : '' }}
            </option>
          </select>
        </label>
        <label class="block text-xs font-semibold text-slate-700">
          Room
          <select v-model="newSession.room_id" required :disabled="loading || saving" class="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50">
            <option value="">Select a room</option>
            <option v-for="room in rooms" :key="room.room_id" :value="room.room_id">
              {{ room.room_name }}{{ room.location ? ` · ${room.location}` : '' }}
            </option>
          </select>
        </label>
        <label class="block text-xs font-semibold text-slate-700">
          Academic year
          <input v-model.number="newSession.academic_year" type="number" min="2000" max="9999" required :disabled="loading || saving" class="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50" />
        </label>
        <label class="block text-xs font-semibold text-slate-700">
          Semester
          <select v-model="newSession.semester" required :disabled="loading || saving" class="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50">
            <option v-for="semester in semesters" :key="semester" :value="semester">{{ semester }}</option>
          </select>
        </label>
        <label class="block text-xs font-semibold text-slate-700">
          Start date and time
          <input v-model="newSession.start_time" type="datetime-local" required :disabled="loading || saving" class="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50" />
        </label>
        <label class="block text-xs font-semibold text-slate-700">
          End date and time
          <input v-model="newSession.end_time" type="datetime-local" required :disabled="loading || saving" class="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50" />
        </label>
        <label class="block text-xs font-semibold text-slate-700">
          Recurrence (optional)
          <input v-model="newSession.recurrence_pattern" type="text" maxlength="120" placeholder="e.g. Weekly on Monday" :disabled="loading || saving" class="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50" />
        </label>
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" :disabled="loading || saving || !filteredAvailableCourses.length || !rooms.length" class="btn-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
          {{ saving ? 'Creating…' : 'Create and select session' }}
        </button>
        <p v-if="!availableCourses.length || !rooms.length" class="text-xs text-amber-700">An administrator must configure at least one course and one room before a session can be created.</p>
      </div>
    </form>

    <div class="rounded-xl border border-border-subtle bg-white p-5 shadow-xs">
      <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
        <label class="block text-xs font-semibold text-slate-700">
          Class session
          <select
            v-model="selectedSessionId"
            :disabled="loading || saving"
            class="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
          >
            <option value="">Select a class session</option>
            <option v-for="session in sessions" :key="session.session_id" :value="session.session_id">
              {{ sessionLabel(session) }}
            </option>
          </select>
        </label>
        <label class="block text-xs font-semibold text-slate-700">
          Attendance date
          <input
            v-model="sessionDate"
            type="date"
            :disabled="loading || saving || !selectedSessionId"
            class="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
          />
        </label>
      </div>
      <p v-if="selectedSession" class="mt-3 text-xs text-slate-500">
        {{ selectedSession.course?.course_code || 'Course' }} · {{ selectedSession.academic_year || selectedSession.course?.academic_year || 'Year not assigned' }} · {{ selectedSession.semester || selectedSession.course?.semester || 'Semester not assigned' }} · {{ selectedSession.room?.room_name || 'Room not assigned' }}
      </p>
    </div>

    <div v-if="errorMessage" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
      {{ errorMessage }}
    </div>
    <div v-if="successMessage" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">
      {{ successMessage }}
    </div>

    <div class="rounded-xl border border-border-subtle bg-white p-4 shadow-xs sm:p-6">
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-base font-bold text-slate-900 font-sans">Student attendance roster</h2>
          <p class="mt-1 text-xs text-slate-500">{{ roster.length }} student{{ roster.length === 1 ? '' : 's' }} loaded</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <span class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Present: {{ countStatus('Present') }}</span>
          <span class="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Late: {{ countStatus('Late') }}</span>
          <span class="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">Absent: {{ countStatus('Absent') }}</span>
          <span class="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">Excused: {{ countStatus('Excused') }}</span>
        </div>
      </div>

      <div v-if="loading" class="py-10 text-center text-sm text-slate-500">Loading your sessions, courses, rooms, and student roster…</div>
      <div v-else-if="!selectedSessionId" class="py-10 text-center text-sm text-slate-500">Select or create a class session to load attendance.</div>
      <div v-else-if="!roster.length" class="py-10 text-center text-sm text-slate-500">No students are available for this session.</div>
      <div v-else>
        <div class="space-y-3 md:hidden">
          <article v-for="student in roster" :key="student.student_id" class="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
            <div class="flex items-start justify-between gap-3"><div class="min-w-0"><p class="break-all text-[11px] font-bold text-slate-500">{{ student.student_id }}</p><p class="mt-1 truncate text-sm font-semibold text-slate-900">{{ student.full_name }}</p></div><span class="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{{ student.status }}</span></div>
            <div class="mt-4 grid grid-cols-2 gap-2" role="group" :aria-label="`Attendance status for ${student.full_name}`">
              <button v-for="status in statuses" :key="status" type="button" :aria-pressed="student.status === status" :disabled="saving" @click="student.status = status" :class="['rounded-md border px-2 py-2 text-[11px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60', student.status === status ? getActiveStatusBtnClass(status) : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50']">{{ status }}</button>
            </div>
          </article>
        </div>
        <div class="hidden overflow-x-auto md:block"><table class="w-full min-w-[680px] text-left text-xs font-geist"><thead><tr class="border-b border-slate-200 bg-slate-50 text-slate-500"><th class="px-4 py-3 font-semibold">Student ID</th><th class="px-4 py-3 font-semibold">Student name</th><th class="px-4 py-3 font-semibold">Status</th></tr></thead><tbody class="divide-y divide-slate-100 text-slate-700"><tr v-for="student in roster" :key="student.student_id" class="hover:bg-slate-50/80"><td class="px-4 py-3.5 font-bold text-slate-900">{{ student.student_id }}</td><td class="px-4 py-3.5 font-medium text-slate-900">{{ student.full_name }}</td><td class="px-4 py-3.5"><div class="inline-flex rounded-md shadow-xs" role="group" :aria-label="`Attendance status for ${student.full_name}`"><button v-for="status in statuses" :key="status" type="button" :aria-pressed="student.status === status" :disabled="saving" @click="student.status = status" :class="['border px-2.5 py-1 text-[11px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60', student.status === status ? getActiveStatusBtnClass(status) : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50']">{{ status }}</button></div></td></tr></tbody></table></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { authStore } from '../store/auth.js'
import { createClassSession, fetchAttendance, fetchClassSessionResources, fetchClassSessions, fetchCurrentAcademicPeriod, fetchStudents, saveAttendanceBatch } from '../api.js'

const statuses = ['Present', 'Late', 'Absent', 'Excused']
const semesters = ['Semester 1', 'Semester 2']
const route = useRoute()
const sessions = ref([])
const availableCourses = ref([])
const courseSearchQuery = ref(String(route.query.search || ''))
const filteredAvailableCourses = computed(() => {
  const query = courseSearchQuery.value.trim().toLocaleLowerCase()
  if (!query) return availableCourses.value
  return availableCourses.value.filter((course) => `${course.course_code || ''} ${course.course_name || ''}`.toLocaleLowerCase().includes(query))
})
const rooms = ref([])
const roster = ref([])
const selectedSessionId = ref('')
const sessionDate = ref('')
const loading = ref(true)
const saving = ref(false)
const showCreatePanel = ref(Boolean(route.query.search))
const errorMessage = ref('')
const successMessage = ref('')
const currentPeriod = reactive({ academic_year: 2026, semester: 'Semester 1' })
const newSession = reactive({ course_id: '', room_id: '', academic_year: 2026, semester: 'Semester 1', start_time: '', end_time: '', recurrence_pattern: '' })

const selectedSession = computed(() => sessions.value.find((session) => session.session_id === selectedSessionId.value) || null)

function dateOnly(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : ''
}

function sessionLabel(session) {
  const course = session.course?.course_code || session.course?.course_name || 'Class session'
  const start = session.start_time ? new Date(session.start_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Date unavailable'
  return `${course} · ${session.academic_year || session.course?.academic_year || 'Year not assigned'} · ${session.semester || session.course?.semester || 'Semester not assigned'} · ${start}`
}

function countStatus(status) {
  return roster.value.filter((student) => student.status === status).length
}

function markAll(status) {
  roster.value.forEach((student) => { student.status = status })
}

function getActiveStatusBtnClass(status) {
  return {
    Present: 'border-emerald-600 bg-emerald-600 text-white',
    Late: 'border-amber-600 bg-amber-600 text-white',
    Absent: 'border-rose-600 bg-rose-600 text-white',
    Excused: 'border-indigo-600 bg-indigo-600 text-white',
  }[status]
}

function resetNewSession() {
  Object.assign(newSession, { course_id: '', room_id: '', academic_year: currentPeriod.academic_year, semester: currentPeriod.semester, start_time: '', end_time: '', recurrence_pattern: '' })
}

async function loadRoster() {
  if (!selectedSessionId.value) {
    roster.value = []
    return
  }
  const [studentsResult, attendanceResult] = await Promise.all([
    fetchStudents(authStore.token.value),
    fetchAttendance(authStore.token.value),
  ])
  if (!studentsResult.ok) throw new Error(studentsResult.error || 'Unable to load students')
  if (!attendanceResult.ok) throw new Error(attendanceResult.error || 'Unable to load attendance')
  const existing = (attendanceResult.data || []).filter((record) => record.session_id === selectedSessionId.value && record.session_date === sessionDate.value)
  const existingByStudent = new Map(existing.map((record) => [record.student_id, record.status]))
  roster.value = (studentsResult.data || []).map((student) => ({
    ...student,
    status: existingByStudent.get(student.student_id) || 'Absent',
  }))
}

async function loadResourcesForPeriod() {
  const result = await fetchClassSessionResources(authStore.token.value, { academic_year: newSession.academic_year, semester: newSession.semester })
  if (!result.ok) throw new Error(result.error || 'Unable to load available courses')
  availableCourses.value = result.data?.courses || []
  rooms.value = result.data?.rooms || rooms.value
  if (!availableCourses.value.some((course) => course.course_id === newSession.course_id)) newSession.course_id = ''
}

async function loadData() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [sessionsResult, resourcesResult] = await Promise.all([
      fetchClassSessions(authStore.token.value),
      fetchClassSessionResources(authStore.token.value, { academic_year: newSession.academic_year, semester: newSession.semester }),
    ])
    if (!sessionsResult.ok) throw new Error(sessionsResult.error || 'Unable to load class sessions')
    if (!resourcesResult.ok) throw new Error(resourcesResult.error || 'Unable to load session resources')
    sessions.value = (sessionsResult.data || []).sort((left, right) => new Date(left.start_time) - new Date(right.start_time))
    availableCourses.value = resourcesResult.data?.courses || []
    rooms.value = resourcesResult.data?.rooms || []
    if (sessions.value.length) {
      selectedSessionId.value = sessions.value[0].session_id
      sessionDate.value = dateOnly(sessions.value[0].start_time)
      await loadRoster()
    }
  } catch (error) {
    errorMessage.value = error.message || 'Unable to load attendance data'
  } finally {
    loading.value = false
  }
}

async function createSession() {
  errorMessage.value = ''
  successMessage.value = ''
  saving.value = true
  try {
    const result = await createClassSession(authStore.token.value, {
      ...newSession,
      start_time: new Date(newSession.start_time).toISOString(),
      end_time: new Date(newSession.end_time).toISOString(),
    })
    if (!result.ok) throw new Error(result.error || 'Unable to create class session')
    sessions.value = [...sessions.value, result.data].sort((left, right) => new Date(left.start_time) - new Date(right.start_time))
    selectedSessionId.value = result.data.session_id
    sessionDate.value = dateOnly(result.data.start_time)
    showCreatePanel.value = false
    resetNewSession()
    await loadRoster()
    successMessage.value = 'Class session created and selected for attendance.'
  } catch (error) {
    errorMessage.value = error.message || 'Unable to create class session'
  } finally {
    saving.value = false
  }
}

async function saveAttendance() {
  errorMessage.value = ''
  successMessage.value = ''
  if (!selectedSessionId.value) {
    errorMessage.value = 'Select a class session before saving attendance.'
    return
  }
  if (!sessionDate.value) {
    errorMessage.value = 'Select the date for this attendance record.'
    return
  }
  if (!roster.value.length) {
    errorMessage.value = 'There are no students to save for this session.'
    return
  }
  saving.value = true
  try {
    const result = await saveAttendanceBatch(authStore.token.value, {
      session_id: selectedSessionId.value,
      session_date: sessionDate.value,
      entries: roster.value.map((student) => ({ student_id: student.student_id, status: student.status })),
    })
    if (!result.ok) throw new Error(result.error || 'Unable to save attendance')
    successMessage.value = `Attendance saved for ${result.data?.length || roster.value.length} student${(result.data?.length || roster.value.length) === 1 ? '' : 's'}.`
  } catch (error) {
    errorMessage.value = error.message || 'Unable to save attendance'
  } finally {
    saving.value = false
  }
}

watch([selectedSessionId, sessionDate], async ([sessionId, date], [previousSessionId, previousDate]) => {
  if (!sessionId || (sessionId === previousSessionId && date === previousDate) || loading.value) return
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await loadRoster()
  } catch (error) {
    errorMessage.value = error.message || 'Unable to load attendance data'
  }
})

async function initialize() {
  const periodResult = await fetchCurrentAcademicPeriod(authStore.token.value)
  if (periodResult.ok) {
    Object.assign(currentPeriod, periodResult.data || {})
    newSession.academic_year = currentPeriod.academic_year
    newSession.semester = currentPeriod.semester
  } else {
    errorMessage.value = periodResult.error || 'Unable to load the current academic period.'
  }
  await loadData()
}

watch(() => route.query.search, (value) => {
  courseSearchQuery.value = String(value || '')
  if (value) showCreatePanel.value = true
})
onMounted(initialize)
watch([() => newSession.academic_year, () => newSession.semester], async () => {
  if (loading.value || saving.value) return
  try {
    await loadResourcesForPeriod()
  } catch (error) {
    errorMessage.value = error.message || 'Unable to load available courses'
  }
})
</script>
