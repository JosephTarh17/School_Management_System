<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Student Services</p>
        <h1 class="mt-1 text-2xl font-bold tracking-tight text-slate-900">Course Registration</h1>
        <p class="mt-1 text-sm text-slate-500">Submit your course selections for administrator approval.</p>
      </div>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label class="text-sm font-semibold text-slate-700">Academic year<input v-model.number="academicYear" type="number" min="2000" max="9999" class="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-xs" /></label>
        <label class="text-sm font-semibold text-slate-700">Semester<select v-model="semester" class="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"><option v-for="option in semesters" :key="option" :value="option">{{ option }}</option></select></label>
      </div>
    </div>

    <p v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ errorMessage }}</p>
    <p v-if="successMessage" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{{ successMessage }}</p>

    <div class="grid gap-4 sm:grid-cols-3">
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Class level</p>
        <p class="mt-2 text-xl font-bold text-slate-900">{{ eligibility.class_level || 'Not configured' }}</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Configured limit</p>
        <p class="mt-2 text-xl font-bold text-blue-700">{{ eligibility.max_credits ?? 0 }} credits</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Selected</p>
        <p class="mt-2 text-xl font-bold" :class="selectedCredits > Number(eligibility.max_credits || 0) ? 'text-red-700' : 'text-emerald-700'">{{ selectedCredits }} credits</p>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-bold text-slate-900">Available courses</h2>
            <p class="mt-1 text-xs text-slate-500">Select courses offered for {{ academicYear }} — {{ semester }}.</p>
          </div>
          <span class="text-xs font-semibold text-slate-500">{{ countLabel(selectedCourseIds.length, 'course selected', 'courses selected') }}</span>
        </div>
        <label v-if="!loading && catalog.length" class="relative mb-4 block">
          <span class="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400">search</span>
          <input v-model="searchQuery" type="search" placeholder="Search by course name or code" class="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-container" />
        </label>
        <div v-if="loading" class="py-10 text-center text-sm text-slate-500">Loading registration options…</div>
        <div v-else-if="!catalog.length" class="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No courses are available for this semester.</div>
        <div v-else-if="!filteredCatalog.length" class="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No offered courses match that name or code.</div>
        <div v-else class="grid gap-3 md:grid-cols-2">
          <label v-for="course in filteredCatalog" :key="course.course_id" class="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition" :class="selectedCourseIds.includes(course.course_id) ? 'border-blue-400 bg-blue-50/60' : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'">
            <input v-model="selectedCourseIds" type="checkbox" :value="course.course_id" class="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            <span class="min-w-0">
              <span class="flex flex-wrap items-center gap-2">
                <span class="text-xs font-bold text-blue-700">{{ course.course_code }}</span>
                <span class="text-xs font-semibold text-slate-500">{{ Number(course.credit_units || 0) }} credits</span>
              </span>
              <span class="mt-1 block text-sm font-semibold text-slate-900">{{ course.course_name }}</span>
              <span class="mt-1 block text-xs text-slate-500">{{ course.semester || 'Semester not assigned' }}</span>
            </span>
          </label>
        </div>
      </section>

      <aside class="h-fit rounded-xl border border-slate-200 bg-slate-900 p-5 text-white shadow-xs xl:sticky xl:top-20">
        <h2 class="text-base font-bold">Submit selection</h2>
        <p class="mt-2 text-sm text-slate-300">Your request will remain pending until an administrator reviews it.</p>
        <div class="mt-5 space-y-2 border-t border-slate-700 pt-4 text-sm">
          <div class="flex justify-between gap-3"><span class="text-slate-400">Courses</span><span class="font-semibold">{{ countLabel(selectedCourseIds.length, 'course') }}</span></div>
          <div class="flex justify-between gap-3"><span class="text-slate-400">Credits</span><span class="font-semibold">{{ selectedCredits }}</span></div>
        </div>
        <button :disabled="submitting || !selectedCourseIds.length || !semester || selectedCredits > Number(eligibility.max_credits || 0)" @click="submitRequest" class="btn-primary mt-5 w-full px-4 py-3 text-sm font-bold">
          {{ submitting ? 'Submitting…' : 'Submit registration request' }}
        </button>
      </aside>
    </div>

    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div class="mb-4 flex items-center justify-between gap-3"><h2 class="text-base font-bold text-slate-900">My registration requests</h2><button @click="loadRequests" class="btn-primary px-3 py-1.5 text-xs font-semibold">Refresh</button></div>
      <div v-if="!requests.length" class="rounded-lg border border-dashed border-slate-300 p-7 text-center text-sm text-slate-500">No registration requests have been submitted.</div>
      <div v-else class="space-y-3">
        <article v-for="request in requests" :key="request.registration_request_id" class="rounded-xl border border-slate-200 p-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><p class="font-semibold text-slate-900">{{ request.academic_year || 'Year not assigned' }} — {{ request.semester || 'Semester not assigned' }}</p><p class="mt-1 text-xs text-slate-500">{{ request.total_credits }} credits · {{ countLabel(request.course_registration_item?.length || 0, 'course') }} · {{ formatDate(request.submitted_at) }}</p></div>
            <div class="flex items-center gap-3"><span class="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider" :class="statusClasses(request.status)">{{ request.status }}</span><button v-if="request.status === 'pending'" @click="cancelRequest(request.registration_request_id)" class="btn-danger px-3 py-1.5 text-xs font-semibold">Cancel</button></div>
          </div>
          <p v-if="request.review_notes" class="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{{ request.review_notes }}</p>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { authStore } from '../store/auth'
import { cancelCourseRegistration, fetchCourseRegistrationRequests, fetchCurrentAcademicPeriod, fetchRegistrationCatalog, fetchRegistrationEligibility, submitCourseRegistration } from '../api.js'
import { countLabel } from '../lib/formatters.js'

const route = useRoute()
const semesters = ['Semester 1', 'Semester 2']
const academicYear = ref(2026)
const semester = ref('Semester 1')
const catalog = ref([])
const requests = ref([])
const searchQuery = ref(String(route.query.search || ''))
const filteredCatalog = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  if (!query) return catalog.value
  return catalog.value.filter((course) => `${course.course_code || ''} ${course.course_name || ''}`.toLocaleLowerCase().includes(query))
})
const selectedCourseIds = ref([])
const eligibility = ref({ class_level: null, max_credits: 0, enrolled_credits: 0 })
const loading = ref(true)
const submitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const selectedCredits = computed(() => catalog.value.filter((course) => selectedCourseIds.value.includes(course.course_id)).reduce((sum, course) => sum + Number(course.credit_units || 0), 0))

function statusClasses(status) {
  return { pending: 'bg-amber-100 text-amber-800', approved: 'bg-emerald-100 text-emerald-800', rejected: 'bg-red-100 text-red-800', cancelled: 'bg-slate-100 text-slate-700' }[status] || 'bg-slate-100 text-slate-700'
}
function formatDate(value) { return value ? new Date(value).toLocaleDateString() : '—' }

async function loadRequests() {
  const result = await fetchCourseRegistrationRequests(authStore.token.value)
  if (result.ok) requests.value = result.data || []
  else errorMessage.value = result.error || 'Unable to load registration requests.'
}

async function loadData() {
  loading.value = true
  errorMessage.value = ''
  const token = authStore.token.value
  const [catalogResult, eligibilityResult] = await Promise.all([fetchRegistrationCatalog(token, { academic_year: academicYear.value, semester: semester.value }), fetchRegistrationEligibility(token, { academic_year: academicYear.value, semester: semester.value })])
  if (catalogResult.ok) catalog.value = catalogResult.data || []
  else errorMessage.value = catalogResult.error || 'Unable to load course catalog.'
  if (eligibilityResult.ok) eligibility.value = eligibilityResult.data || eligibility.value
  else errorMessage.value = eligibilityResult.error || errorMessage.value
  await loadRequests()
  loading.value = false
}

async function submitRequest() {
  submitting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  const result = await submitCourseRegistration(authStore.token.value, { academic_year: academicYear.value, semester: semester.value, course_ids: selectedCourseIds.value })
  if (!result.ok) errorMessage.value = result.error || 'Unable to submit registration request.'
  else { successMessage.value = 'Registration request submitted for administrator review.'; selectedCourseIds.value = []; await loadRequests() }
  submitting.value = false
}

async function cancelRequest(requestId) {
  const result = await cancelCourseRegistration(authStore.token.value, requestId)
  if (!result.ok) errorMessage.value = result.error || 'Unable to cancel request.'
  else await loadRequests()
}

async function initialize() {
  const result = await fetchCurrentAcademicPeriod(authStore.token.value)
  if (result.ok) {
    academicYear.value = result.data.academic_year
    semester.value = result.data.semester
  } else errorMessage.value = result.error || 'Unable to load the current academic period.'
  await loadData()
}

onMounted(initialize)
watch([academicYear, semester], loadData)
watch(() => route.query.search, (value) => { searchQuery.value = String(value || '') })
</script>
