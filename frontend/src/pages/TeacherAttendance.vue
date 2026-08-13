<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 font-sans">Teacher Attendance Entry</h1>
        <p class="mt-1 text-xs text-slate-500 font-geist">Select one of your class sessions, mark the roster, and save the attendance record.</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          :disabled="loading || saving || !roster.length"
          @click="markAll('Present')"
          class="rounded-eight border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Mark all present
        </button>
        <button
          type="button"
          :disabled="loading || saving || !roster.length || !selectedSessionId"
          @click="saveAttendance"
          class="flex items-center gap-1.5 rounded-eight bg-primary-container px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span class="material-symbols-outlined text-base">save</span>
          {{ saving ? 'Saving…' : 'Save attendance' }}
        </button>
      </div>
    </div>

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
        {{ selectedSession.course?.course_code || 'Course' }} · {{ selectedSession.room?.room_name || 'Room not assigned' }}
      </p>
    </div>

    <div v-if="errorMessage" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
      {{ errorMessage }}
    </div>
    <div v-if="successMessage" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">
      {{ successMessage }}
    </div>

    <div class="rounded-xl border border-border-subtle bg-white p-6 shadow-xs">
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

      <div v-if="loading" class="py-10 text-center text-sm text-slate-500">Loading your sessions and student roster…</div>
      <div v-else-if="!selectedSessionId" class="py-10 text-center text-sm text-slate-500">Select a class session to load attendance.</div>
      <div v-else-if="!roster.length" class="py-10 text-center text-sm text-slate-500">No students are available for this session.</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[680px] text-left text-xs font-geist">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-slate-500">
              <th class="px-4 py-3 font-semibold">Student ID</th>
              <th class="px-4 py-3 font-semibold">Student name</th>
              <th class="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-700">
            <tr v-for="student in roster" :key="student.student_id" class="hover:bg-slate-50/80">
              <td class="px-4 py-3.5 font-bold text-slate-900">{{ student.student_id }}</td>
              <td class="px-4 py-3.5 font-medium text-slate-900">{{ student.full_name }}</td>
              <td class="px-4 py-3.5">
                <div class="inline-flex rounded-md shadow-xs" role="group" :aria-label="`Attendance status for ${student.full_name}`">
                  <button
                    v-for="status in statuses"
                    :key="status"
                    type="button"
                    :aria-pressed="student.status === status"
                    :disabled="saving"
                    @click="student.status = status"
                    :class="[
                      'border px-2.5 py-1 text-[11px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60',
                      student.status === status ? getActiveStatusBtnClass(status) : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    ]"
                  >
                    {{ status }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { authStore } from '../store/auth.js'
import { fetchAttendance, fetchClassSessions, fetchStudents, saveAttendanceBatch } from '../api.js'

const statuses = ['Present', 'Late', 'Absent', 'Excused']
const sessions = ref([])
const roster = ref([])
const selectedSessionId = ref('')
const sessionDate = ref('')
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const selectedSession = computed(() => sessions.value.find((session) => session.session_id === selectedSessionId.value) || null)

function dateOnly(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : ''
}

function sessionLabel(session) {
  const course = session.course?.course_code || session.course?.course_name || 'Class session'
  const start = session.start_time ? new Date(session.start_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Date unavailable'
  return `${course} · ${start}`
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

async function loadData() {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await fetchClassSessions(authStore.token.value)
    if (!result.ok) throw new Error(result.error || 'Unable to load class sessions')
    const userId = authStore.user.value?.user_id || authStore.user.value?.id
    sessions.value = (result.data || []).filter((session) => session.teacher?.user_id === userId)
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

onMounted(loadData)
</script>
