<template>
  <AuthenticatedLayout>
    <section class="space-y-8">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm uppercase tracking-[0.18em] text-slate-500">Dashboard</p>
          <h1 class="text-3xl font-semibold text-slate-900">Welcome back</h1>
          <p class="mt-2 text-slate-600">Use the portal to manage attendance, courses, assessments, finance, and participation.</p>
        </div>
        <button
          @click="logout"
          class="rounded-2xl bg-rose-600 px-4 py-3 text-white transition hover:bg-rose-700"
        >
          Sign out
        </button>
      </div>

      <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p class="text-sm uppercase tracking-[0.18em] text-slate-500">Students</p>
          <p class="mt-4 text-3xl font-semibold text-slate-900">1,240</p>
        </div>
        <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p class="text-sm uppercase tracking-[0.18em] text-slate-500">Attendance rate</p>
          <p class="mt-4 text-3xl font-semibold text-slate-900">92%</p>
        </div>
        <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p class="text-sm uppercase tracking-[0.18em] text-slate-500">Courses</p>
          <p class="mt-4 text-3xl font-semibold text-slate-900">18</p>
        </div>
        <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p class="text-sm uppercase tracking-[0.18em] text-slate-500">Pending invoices</p>
          <p class="mt-4 text-3xl font-semibold text-slate-900">23</p>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-3">
        <RouterLink to="/attendance" class="block rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5">
          <h2 class="text-xl font-semibold text-slate-900">Attendance</h2>
          <p class="mt-3 text-slate-600">Mark attendance, review records, and manage student status.</p>
        </RouterLink>
        <RouterLink to="/courses" class="block rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5">
          <h2 class="text-xl font-semibold text-slate-900">Courses</h2>
          <p class="mt-3 text-slate-600">Browse and manage course catalog details for the semester.</p>
        </RouterLink>
        <RouterLink to="/assessments" class="block rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5">
          <h2 class="text-xl font-semibold text-slate-900">Assessments</h2>
          <p class="mt-3 text-slate-600">Create assessments, review weights, and grade student work.</p>
        </RouterLink>
      </div>

      <div class="grid gap-6 lg:grid-cols-2">
        <div class="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <h2 class="text-xl font-semibold text-slate-900">Protected token</h2>
          <p class="mt-2 text-slate-700 text-sm">A JWT is stored locally so you can call protected API endpoints.</p>
        </div>

        <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 class="text-xl font-semibold text-slate-900">Quick actions</h2>
          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <button @click="fetchAttendance" class="rounded-2xl bg-sky-600 px-4 py-3 text-white transition hover:bg-sky-700" :disabled="loadingAttendance">
              {{ loadingAttendance ? 'Loading...' : 'Load attendance' }}
            </button>
            <RouterLink to="/finance" class="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-slate-700 transition hover:bg-slate-50">View finance</RouterLink>
          </div>
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
    </section>
  </AuthenticatedLayout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthenticatedLayout from '../components/AuthenticatedLayout.vue'

const router = useRouter()
const attendance = ref(null)
const attendanceError = ref('')
const loadingAttendance = ref(false)

const logout = () => {
  window.localStorage.removeItem('sms_token')
  router.push('/login')
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
