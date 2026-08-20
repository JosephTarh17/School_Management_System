<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h1 class="text-2xl font-bold tracking-tight text-slate-900">{{ title }}</h1><p class="mt-1 text-xs text-slate-500">{{ description }}</p></div><button type="button" class="btn-primary px-3 py-2 text-xs font-semibold" :disabled="loading" @click="loadCalendar">Refresh</button></div>
    <div v-if="errorMessage" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{{ errorMessage }}</div>
    <section class="rounded-xl border border-border-subtle bg-white p-4 shadow-xs sm:p-6"><div class="mb-4 flex flex-wrap items-end gap-3"><label class="block text-xs font-semibold text-slate-700">From<input v-model="filters.from" type="date" class="mt-1 block rounded-md border border-slate-200 px-3 py-2 text-xs" @change="loadCalendar" /></label><label class="block text-xs font-semibold text-slate-700">To<input v-model="filters.to" type="date" class="mt-1 block rounded-md border border-slate-200 px-3 py-2 text-xs" @change="loadCalendar" /></label><span v-if="role === 'guardian' && selectedStudent" class="rounded-full bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800">Student: {{ selectedStudent.full_name }}</span><span class="rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">{{ events.length }} event{{ events.length === 1 ? '' : 's' }}</span></div>
      <div v-if="loading" class="py-10 text-center text-sm text-slate-500">Loading calendar…</div><div v-else-if="!events.length" class="py-10 text-center text-sm text-slate-500">No important events are scheduled in this date range.</div><div v-else class="space-y-3"><article v-for="event in events" :key="`${event.source}-${event.id}`" class="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-start"><div class="w-24 shrink-0"><p class="text-xs font-bold uppercase tracking-wide text-blue-700">{{ displayDate(event.start_at) }}</p><p class="mt-1 text-xs text-slate-500">{{ displayTime(event.start_at) }}</p></div><div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><h2 class="font-bold text-slate-900">{{ event.title }}</h2><span class="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-600">{{ event.source.replaceAll('_', ' ') }}</span><span v-if="event.status" class="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-700">{{ event.status }}</span></div><p v-if="event.subtitle" class="mt-1 text-xs text-slate-600">{{ event.subtitle }}</p><p v-if="event.description" class="mt-1 text-xs text-slate-500">{{ event.description }}</p><p v-if="event.location" class="mt-1 text-xs text-slate-500">Location: {{ event.location }}</p><p v-if="event.reason" class="mt-1 text-xs text-amber-700">Review reason: {{ event.reason }}</p></div></article></div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { authStore } from '../store/auth.js'
import { fetchCalendar } from '../api.js'
import { guardianStudentContext } from '../store/guardianStudentContext.js'

const role = computed(() => authStore.userRole.value)
const selectedStudentId = guardianStudentContext.selectedStudentId
const selectedStudent = guardianStudentContext.selectedStudent
const today = new Date()
const iso = (date) => date.toISOString().slice(0, 10)
function rangeForRole() {
  if (role.value === 'administrator') { const day = iso(today); return { from: day, to: day } }
  if (role.value === 'teacher') return { from: iso(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))), to: iso(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0))) }
  return { from: iso(new Date(Date.UTC(today.getUTCFullYear(), 0, 1))), to: iso(new Date(Date.UTC(today.getUTCFullYear(), 11, 31))) }
}
const filters = reactive(rangeForRole())
const events = ref([])
const loading = ref(true)
const errorMessage = ref('')
const title = computed(() => role.value === 'administrator' ? 'Operations Calendar' : role.value === 'teacher' ? 'Monthly Teaching Calendar' : 'Semester Calendar')
const description = computed(() => role.value === 'administrator' ? 'Review today’s school operations, absence reports, deadlines, and events.' : role.value === 'teacher' ? 'Review lessons, attendance progress, absence reports, and monthly workload.' : 'Review your permitted lessons, meetings, examinations, deadlines, and school events.')
function displayDate(value) { return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) }
function displayTime(value) { return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
async function loadCalendar() {
  loading.value = true
  errorMessage.value = ''
  if (role.value === 'guardian' && !selectedStudentId.value) {
    events.value = []
    loading.value = false
    return
  }
  const params = role.value === 'guardian' ? { ...filters, student_id: selectedStudentId.value } : filters
  const result = await fetchCalendar(authStore.token.value, params)
  if (!result.ok) errorMessage.value = result.error || 'Unable to load the calendar.'
  else events.value = result.data?.events || []
  loading.value = false
}
onMounted(async () => {
  if (role.value === 'guardian') await guardianStudentContext.ensureLoaded(authStore.token.value, authStore.user.value?.user_id || authStore.user.value?.id)
  await loadCalendar()
})
watch(selectedStudentId, () => { if (role.value === 'guardian') loadCalendar() })
</script>
