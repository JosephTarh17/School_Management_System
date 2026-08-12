<template>
  <AuthenticatedLayout>
    <section class="space-y-8">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm uppercase tracking-[0.18em] text-slate-500">Attendance</p>
          <h1 class="text-3xl font-semibold text-slate-900">Attendance Management</h1>
          <p class="mt-2 text-slate-600">Track attendance and manage student status for today’s classes.</p>
        </div>
        <button
          @click="logout"
          class="rounded-2xl bg-rose-600 px-4 py-3 text-white transition hover:bg-rose-700"
        >
          Sign out
        </button>
      </div>

      <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">Filters</h2>
            <p class="text-sm text-slate-500">Search by student name, date, or course.</p>
          </div>
          <button
            @click="fetchAttendance"
            :disabled="loadingAttendance"
            class="rounded-2xl bg-sky-600 px-4 py-3 text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span v-if="loadingAttendance">Refreshing...</span>
            <span v-else>Refresh</span>
          </button>
        </div>

        <div class="mt-6 grid gap-4 sm:grid-cols-3">
          <input type="text" placeholder="Student name" class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900" />
          <input type="date" class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900" />
          <select class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900">
            <option value="">All courses</option>
            <option>Algebra I</option>
            <option>English Composition</option>
            <option>Science Lab</option>
          </select>
        </div>
      </div>

      <div class="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-slate-900">Attendance records</h2>
        <div class="mt-6 overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-600">
            <thead class="bg-slate-100 text-slate-700">
              <tr>
                <th class="px-5 py-4 font-semibold">Student</th>
                <th class="px-5 py-4 font-semibold">Course</th>
                <th class="px-5 py-4 font-semibold">Date</th>
                <th class="px-5 py-4 font-semibold">Status</th>
                <th class="px-5 py-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr v-for="record in attendance" :key="record.id" class="bg-white">
                <td class="px-5 py-4">{{ record.student }}</td>
                <td class="px-5 py-4">{{ record.course }}</td>
                <td class="px-5 py-4">{{ record.date }}</td>
                <td class="px-5 py-4">{{ record.status }}</td>
                <td class="px-5 py-4">
                  <button class="rounded-2xl border border-slate-200 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">Update</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="attendanceError" class="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{{ attendanceError }}</div>
    </section>
  </AuthenticatedLayout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthenticatedLayout from '../components/AuthenticatedLayout.vue'

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
