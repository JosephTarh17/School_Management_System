<template>
  <div class="min-h-screen bg-slate-100 px-4 py-10">
    <div class="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-xl">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-semibold">Dashboard</h1>
          <p class="text-slate-600">You are signed in. Use this page as the start of your attendance portal.</p>
        </div>
        <button
          @click="logout"
          class="rounded-2xl bg-rose-600 px-4 py-3 text-white transition hover:bg-rose-700"
        >
          Sign out
        </button>
      </div>

      <div class="mt-8 space-y-6">
        <div class="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <h2 class="text-xl font-semibold mb-2">Protected token</h2>
          <p class="text-slate-700 text-sm">A JWT is stored locally so you can call protected API endpoints.</p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 class="text-lg font-semibold mb-2">Attendance</h3>
            <p class="text-slate-600 mb-4">Load your protected attendance records from the backend.</p>
            <button
              @click="fetchAttendance"
              class="rounded-2xl bg-sky-600 px-4 py-3 text-white transition hover:bg-sky-700"
              :disabled="loadingAttendance"
            >
              <span v-if="loadingAttendance">Loading...</span>
              <span v-else>Load attendance</span>
            </button>
          </div>

          <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 class="text-lg font-semibold mb-2">Welcome</h3>
            <p class="text-slate-600 text-sm">Access your attendance portal and protected data after sign in.</p>
          </div>
        </div>

        <div v-if="attendanceError" class="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{{ attendanceError }}</div>
        <div v-if="attendance && attendance.length" class="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <h3 class="text-lg font-semibold mb-4">Attendance result</h3>
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
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const attendance = ref(null)
const attendanceError = ref('')
const loadingAttendance = ref(false)

const logout = () => {
  window.localStorage.removeItem('sms_token')
  window.location.reload()
}

const fetchAttendance = async () => {
  attendanceError.value = ''
  loadingAttendance.value = true
  attendance.value = null

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
      return
    }

    attendance.value = Array.isArray(json.data) ? json.data : []
    if (attendance.value.length === 0) {
      attendanceError.value = 'No attendance records found.'
    }
  } catch (err) {
    attendanceError.value = 'Unable to reach backend. Is it running?'
  } finally {
    loadingAttendance.value = false
  }
}
</script>
