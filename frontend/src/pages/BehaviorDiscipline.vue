<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Student support</p>
        <h1 class="mt-1 text-2xl font-bold text-slate-950">Behavior and discipline</h1>
        <p class="mt-1 text-sm text-slate-500">Record, review, and safely scope behavior incidents using real student records.</p>
      </div>
      <button @click="load" class="btn-primary px-4 py-2 text-sm font-semibold text-white">Refresh</button>
    </header>

    <div v-if="message" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{{ message }}</div>
    <div v-if="errorMessage" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{{ errorMessage }}</div>

    <form v-if="canManage" @submit.prevent="saveIncident" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="mb-4"><h2 class="font-bold text-slate-900">Record an incident</h2><p class="text-xs text-slate-500">Teachers can select only students in their active teaching scope.</p></div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label class="text-xs font-semibold text-slate-700">Student<select v-model="form.student_id" required class="mt-1.5 block w-full rounded-md border px-3 py-2 text-sm"><option value="">Select student</option><option v-for="student in students" :key="student.student_id" :value="student.student_id">{{ student.full_name }}</option></select></label>
        <label class="text-xs font-semibold text-slate-700">Type<select v-model="form.incident_type" class="mt-1.5 block w-full rounded-md border px-3 py-2 text-sm"><option v-for="value in incidentTypes" :key="value">{{ value }}</option></select></label>
        <label class="text-xs font-semibold text-slate-700">Severity<select v-model="form.severity" class="mt-1.5 block w-full rounded-md border px-3 py-2 text-sm"><option v-for="value in severities" :key="value">{{ value }}</option></select></label>
        <label class="text-xs font-semibold text-slate-700">Incident date<input v-model="form.incident_date" type="date" required class="mt-1.5 block w-full rounded-md border px-3 py-2 text-sm" /></label>
        <label class="text-xs font-semibold text-slate-700">Automatic points<div class="mt-1.5 flex items-center justify-between rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-900" aria-live="polite"><span>{{ form.severity }} severity</span><strong>{{ calculatedPoints.toFixed(2) }}</strong></div><span class="mt-1 block text-[11px] font-normal text-slate-500">Calculated from severity; not editable.</span></label>
        <label class="text-xs font-semibold text-slate-700 sm:col-span-2 lg:col-span-3">Description<textarea v-model.trim="form.description" required maxlength="1000" rows="3" class="mt-1.5 block w-full rounded-md border px-3 py-2 text-sm"></textarea></label>
        <label class="text-xs font-semibold text-slate-700 sm:col-span-2 lg:col-span-3">Action taken<textarea v-model.trim="form.action_taken" maxlength="1000" rows="2" class="mt-1.5 block w-full rounded-md border px-3 py-2 text-sm"></textarea></label>
      </div>
      <button :disabled="saving" class="btn-primary mt-4 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{{ saving ? 'Saving…' : 'Save incident' }}</button>
    </form>

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-100 px-5 py-4"><h2 class="font-bold text-slate-900">Incident history</h2><p class="text-xs text-slate-500">{{ countLabel(incidents.length, 'record') }} within your permitted scope.</p></div>
      <table class="min-w-full text-left text-sm"><thead class="border-b text-xs uppercase text-slate-500"><tr><th class="px-4 py-3">Student</th><th class="px-4 py-3">Date</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">Severity</th><th class="px-4 py-3">Points</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Action</th></tr></thead><tbody><tr v-for="incident in incidents" :key="incident.incident_id" class="border-b last:border-0"><td class="px-4 py-3 font-semibold text-slate-900">{{ incident.student?.full_name || 'Student' }}</td><td class="px-4 py-3">{{ incident.incident_date }}</td><td class="px-4 py-3">{{ incident.incident_type }}</td><td class="px-4 py-3">{{ incident.severity }}</td><td class="px-4 py-3">{{ Number(incident.points || 0).toFixed(2) }}</td><td class="px-4 py-3"><select v-if="canManage && canEdit(incident)" :value="incident.status" @change="changeStatus(incident, $event.target.value)" class="rounded-md border px-2 py-1 text-xs"><option v-for="value in statuses" :key="value">{{ value }}</option></select><span v-else>{{ incident.status }}</span></td><td class="px-4 py-3"><button v-if="canDelete(incident)" @click="removeIncident(incident)" class="btn-danger px-3 py-1.5 text-xs font-semibold">Delete</button><span v-else class="text-xs text-slate-400">Read-only</span></td></tr><tr v-if="!incidents.length"><td colspan="7" class="px-4 py-10 text-center text-slate-500">No behavior incidents are available in your permitted scope.</td></tr></tbody></table>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { authStore } from '../store/auth'
import { createBehaviorIncident, deleteBehaviorIncident, fetchBehaviorIncidents, fetchStudents, updateBehaviorIncident } from '../api.js'
import { countLabel } from '../lib/formatters.js'

const incidents = ref([])
const students = ref([])
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const message = ref('')
const incidentTypes = ['Academic', 'Attendance', 'Conduct', 'Safety', 'Other']
const severities = ['Low', 'Medium', 'High', 'Critical']
const severityPoints = { Low: 0.25, Medium: 0.5, High: 0.75, Critical: 1 }
const statuses = ['Open', 'Under review', 'Resolved', 'Dismissed']
const form = reactive({ student_id: '', incident_type: 'Conduct', severity: 'Low', incident_date: new Date().toISOString().slice(0, 10), description: '', action_taken: '' })
const role = computed(() => authStore.userRole.value)
const canManage = computed(() => ['teacher', 'administrator'].includes(role.value))
const calculatedPoints = computed(() => severityPoints[form.severity] ?? 0)
const token = () => authStore.token.value

async function load() {
  loading.value = true; errorMessage.value = ''
  const result = await fetchBehaviorIncidents(token())
  if (!result.ok) errorMessage.value = result.error
  else incidents.value = result.data || []
  if (canManage.value) {
    const studentsResult = await fetchStudents(token())
    if (studentsResult.ok) students.value = studentsResult.data || []
  }
  loading.value = false
}

async function saveIncident() {
  errorMessage.value = ''; message.value = ''
  if (!form.description.trim()) { errorMessage.value = 'Description is required.'; return }
  saving.value = true
  const result = await createBehaviorIncident(token(), { ...form })
  if (!result.ok) errorMessage.value = result.error
  else { incidents.value.unshift(result.data); message.value = 'Behavior incident recorded.'; form.description = ''; form.action_taken = '' }
  saving.value = false
}

function canEdit(incident) { return role.value === 'administrator' || incident.reported_by === authStore.user.value?.user_id }
function canDelete(incident) { return role.value === 'administrator' || (incident.reported_by === authStore.user.value?.user_id && ['Open', 'Under review'].includes(incident.status)) }

async function changeStatus(incident, status) {
  const result = await updateBehaviorIncident(token(), incident.incident_id, { status, resolution_notes: status === 'Resolved' || status === 'Dismissed' ? (incident.resolution_notes || incident.action_taken || '') : incident.resolution_notes })
  if (!result.ok) { errorMessage.value = result.error; return }
  Object.assign(incident, result.data); message.value = 'Incident status updated.'
}

async function removeIncident(incident) {
  if (!window.confirm('Delete this behavior incident?')) return
  const result = await deleteBehaviorIncident(token(), incident.incident_id)
  if (!result.ok) errorMessage.value = result.error
  else { incidents.value = incidents.value.filter((item) => item.incident_id !== incident.incident_id); message.value = 'Incident deleted.' }
}

onMounted(load)
</script>
