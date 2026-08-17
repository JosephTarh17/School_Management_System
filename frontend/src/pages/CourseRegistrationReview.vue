<template>
  <div class="space-y-6">
    <div>
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Administration</p>
      <h1 class="mt-1 text-2xl font-bold tracking-tight text-slate-900">Course Registration Review</h1>
      <p class="mt-1 text-sm text-slate-500">Review student course selections before they become official enrollments.</p>
    </div>

    <p v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ errorMessage }}</p>
    <div v-if="loading" class="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading pending requests…</div>
    <div v-else-if="!requests.length" class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">There are no pending registration requests.</div>
    <div v-else class="space-y-4">
      <article v-for="request in requests" :key="request.registration_request_id" class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 class="text-base font-bold text-slate-900">{{ request.student?.full_name || request.student_id }}</h2>
            <p class="mt-1 text-xs text-slate-500">{{ request.student?.class_level || 'Class level not configured' }} · {{ request.academic_year || 'Year not assigned' }} · {{ request.semester || 'Semester not assigned' }} · submitted {{ formatDate(request.submitted_at) }}</p>
          </div>
          <span class="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800">{{ request.total_credits }} credits · pending</span>
        </div>
        <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div v-for="item in request.course_registration_item || []" :key="item.registration_item_id" class="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p class="text-xs font-bold text-blue-700">{{ item.course?.course_code || item.course_id }}</p>
            <p class="mt-1 text-sm font-semibold text-slate-900">{{ item.course?.course_name || 'Course' }}</p>
            <p class="mt-1 text-xs text-slate-500">{{ item.credit_units }} credits</p>
          </div>
        </div>
        <div class="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-end">
          <label class="flex-1 text-xs font-semibold text-slate-700">Review notes
            <textarea v-model="notes[request.registration_request_id]" rows="2" class="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="Optional decision notes"></textarea>
          </label>
          <div class="flex gap-2"><button :disabled="reviewingId === request.registration_request_id" @click="review(request, 'rejected')" class="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Reject</button><button :disabled="reviewingId === request.registration_request_id" @click="review(request, 'approved')" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{{ reviewingId === request.registration_request_id ? 'Reviewing…' : 'Approve' }}</button></div>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { authStore } from '../store/auth'
import { fetchCourseRegistrationRequests, reviewCourseRegistration } from '../api.js'

const requests = ref([])
const notes = reactive({})
const loading = ref(true)
const reviewingId = ref(null)
const errorMessage = ref('')

function formatDate(value) { return value ? new Date(value).toLocaleDateString() : '—' }

async function loadRequests() {
  loading.value = true
  const result = await fetchCourseRegistrationRequests(authStore.token.value, { status: 'pending' })
  if (!result.ok) errorMessage.value = result.error || 'Unable to load pending registration requests.'
  else requests.value = result.data || []
  loading.value = false
}

async function review(request, status) {
  reviewingId.value = request.registration_request_id
  errorMessage.value = ''
  const result = await reviewCourseRegistration(authStore.token.value, request.registration_request_id, { status, review_notes: notes[request.registration_request_id] || '' })
  if (!result.ok) errorMessage.value = result.error || `Unable to ${status} registration request.`
  else await loadRequests()
  reviewingId.value = null
}

onMounted(loadRequests)
</script>
