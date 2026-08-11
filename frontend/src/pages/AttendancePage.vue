<template>
  <div class="min-h-screen bg-slate-100 px-4 py-10">
    <div class="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-xl">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-semibold">Attendance</h1>
          <p class="text-slate-600">Manage attendance records and view protected attendance data.</p>
        </div>
        <button
          @click="logout"
          class="rounded-lg bg-rose-600 px-4 py-3 text-white transition hover:bg-rose-700"
        >
          Sign out
        </button>
      </div>

      <div class="mt-8 space-y-6">
        <div class="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <h2 class="text-xl font-semibold mb-2">Protected token</h2>
          <p class="text-slate-700 text-sm">A JWT is stored locally so you can call protected API endpoints.</p>
        </div>

        <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="text-lg font-semibold">Reload records</h3>
              <p class="text-slate-600 text-sm">Fetch the latest attendance records for your role.</p>
            </div>
            <button
              @click="fetchAttendance"
              :disabled="loadingAttendance"
              class="rounded-lg bg-sky-600 px-4 py-3 text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span v-if="loadingAttendance">Loading...</span>
              <span v-else>Refresh</span>
            </button>
          </div>
        </div>

        <div v-if="attendanceError" class="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{{ attendanceError }}</div>

        <div v-if="attendance && attendance.length" class="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <h3 class="text-lg font-semibold mb-4">Attendance records</h3>
          <div class="space-y-4">
            <div
              v-for="record in attendance"
              :key="record.id || record.student_id + '-' + record.session_id"
              class="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <p class="text-sm text-slate-700"><strong>Student:</strong> {{ record.student_id }}</p>
              <p class="text-sm text-slate-700"><strong>Session:</strong> {{ record.session_id }}</p>
              <p class="text-sm text-slate-700"><strong>Status:</strong> {{ record.status }}</p>
              <p class="text-sm text-slate-700"><strong>Date:</strong> {{ record.session_date }}</p>
            </div>
          </div>
        </div>

        <div v-if="attendance && !attendance.length" class="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
          No attendance records found.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const attendance = ref([])
const attendanceError = ref('')
const loadingAttendance = ref(false)
const router = useRouter()

const logout = () => {
  window.localStorage.removeItem('sms_token')
  router.push('/login')
}

const fetchAttendance = async () => {
  attendanceError.value = ''
  loadingAttendance.value = true

  const token = window.localStorage.getItem('sms_token')
  if (!token) {
    attendanceError.value = 'No token available. Please sign in first.'
    loadingAttendance.value = false
    return
  }

  try {
    const res = await fetch('http://localhost:4000/attendance', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (!res.ok) {
      attendanceError.value = json.error || 'Failed to load attendance'
      attendance.value = []
      return
    }
    attendance.value = Array.isArray(json.data) ? json.data : []
  } catch (err) {
    attendanceError.value = 'Unable to reach backend. Is it running?'
    attendance.value = []
  } finally {
    loadingAttendance.value = false
  }
}

fetchAttendance()
</script>
