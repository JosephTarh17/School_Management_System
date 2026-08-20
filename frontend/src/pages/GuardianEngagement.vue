<template>
  <section class="space-y-6">
    <header>
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Guardian Engagement</p>
      <h1 class="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">Requests and required actions</h1>
      <p class="mt-1 max-w-3xl text-sm text-slate-500">Contact the school, request an appointment, acknowledge important notices, respond to documents, and submit profile corrections for review.</p>
    </header>

    <ContextHelp title="Understand each request before you submit" summary="These actions create requests for the school; they do not immediately change academic, discipline, finance, or profile records." next="The appropriate administrator reviews the request, and the resulting status or response appears in this page's history." :steps="['Use the universal Student bar to set the student context.', 'Use the guardian-account option only when the request is not about a specific student.', 'Read the status and administrator response after submitting.']" />

    <p v-if="errorMessage" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{{ errorMessage }}</p>
    <p v-if="successMessage" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{{ successMessage }}</p>
    <div v-if="selectedStudent" class="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-900">Student context: <strong data-no-translate="true" translate="no">{{ selectedStudent.full_name }}</strong>. Student-specific requests and notices use the selection in the portal bar.</div>

    <div class="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <section class="rounded-xl border border-indigo-200 bg-white p-5 shadow-sm sm:p-6">
        <div class="mb-4"><h2 class="font-bold text-slate-900">Contact the school</h2><p class="mt-1 text-xs text-slate-500">Requests are reviewed and answered by an administrator.</p></div>
        <form class="space-y-3" @submit.prevent="submitCommunication">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2"><div class="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-900"><span class="font-semibold">Student context:</span> {{ selectedStudent?.full_name || 'No student selected' }}<label class="mt-2 flex items-center gap-2 font-normal text-indigo-800"><input type="checkbox" :checked="communicationAccountWide" @change="setCommunicationScope($event.target.checked)" /> Guardian-account request</label></div><label class="text-xs font-semibold text-slate-700">Category <select v-model="communicationForm.category" class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"><option v-for="category in communicationCategories" :key="category" :value="category">{{ category }}</option></select></label></div>
          <input v-model.trim="communicationForm.subject" required maxlength="200" placeholder="Subject" class="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <textarea v-model.trim="communicationForm.message" required maxlength="4000" rows="4" placeholder="Write your message" class="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"></textarea>
          <button type="submit" class="btn-primary px-4 py-2 text-xs font-semibold" :disabled="busyKey === 'communication'">{{ busyKey === 'communication' ? 'Submitting…' : 'Submit request' }}</button>
        </form>
        <div class="mt-5 space-y-2"><p class="text-xs font-bold uppercase tracking-wide text-slate-500">Recent requests</p><article v-for="item in communications.slice(0, 5)" :key="item.request_id" class="rounded-lg border border-slate-200 bg-slate-50 p-3"><div class="flex flex-wrap items-center justify-between gap-2"><p class="font-semibold text-slate-900">{{ item.subject }}</p><span class="rounded-full bg-indigo-100 px-2 py-1 text-[10px] font-semibold text-indigo-700">{{ item.status }}</span></div><p class="mt-1 text-xs text-slate-500">{{ item.category }} · {{ item.student?.full_name || 'Account' }} · {{ formatDate(item.created_at) }}</p><p v-if="item.administrator_response" class="mt-2 rounded-md bg-white p-2 text-sm text-slate-700">{{ item.administrator_response }}</p><button v-if="['Submitted', 'In Review', 'Responded'].includes(item.status)" type="button" class="btn-ghost mt-2 px-2 py-1 text-[11px] font-semibold" @click="closeCommunication(item)">Close request</button></article><p v-if="!communications.length" class="text-sm text-slate-500">No communication requests yet.</p></div>
      </section>

      <section class="rounded-xl border border-cyan-200 bg-white p-5 shadow-sm sm:p-6">
        <div class="mb-4"><h2 class="font-bold text-slate-900">Request an appointment</h2><p class="mt-1 text-xs text-slate-500">An administrator must propose and confirm the final time.</p></div>
        <form class="space-y-3" @submit.prevent="submitAppointment"><div class="rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs text-cyan-900"><span class="font-semibold">Student:</span> {{ selectedStudent?.full_name || 'Select a student from the universal Student bar before requesting an appointment.' }}</div><textarea v-model.trim="appointmentForm.purpose" required maxlength="2000" rows="3" placeholder="Purpose of the appointment" class="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"></textarea><div class="grid grid-cols-1 gap-3 sm:grid-cols-2"><label class="text-xs font-semibold text-slate-700">Preferred start<input v-model="appointmentForm.preferred_start_at" required type="datetime-local" class="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-2 text-xs font-normal" /></label><label class="text-xs font-semibold text-slate-700">Preferred end<input v-model="appointmentForm.preferred_end_at" required type="datetime-local" class="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-2 text-xs font-normal" /></label></div><button type="submit" class="btn-primary px-4 py-2 text-xs font-semibold" :disabled="busyKey === 'appointment'">{{ busyKey === 'appointment' ? 'Submitting…' : 'Request appointment' }}</button></form>
        <div class="mt-5 space-y-2"><p class="text-xs font-bold uppercase tracking-wide text-slate-500">Appointment requests</p><article v-for="item in appointments.slice(0, 5)" :key="item.appointment_id" class="rounded-lg border border-slate-200 bg-slate-50 p-3"><div class="flex flex-wrap items-center justify-between gap-2"><p class="font-semibold text-slate-900">{{ item.student?.full_name || 'School meeting' }}</p><span class="rounded-full bg-cyan-100 px-2 py-1 text-[10px] font-semibold text-cyan-700">{{ item.status }}</span></div><p class="mt-1 text-xs text-slate-500">{{ item.purpose }}</p><p class="mt-1 text-xs text-slate-500">Preferred: {{ formatDateTime(item.preferred_start_at) }}–{{ formatTime(item.preferred_end_at) }}</p><p v-if="item.proposed_start_at" class="mt-1 text-xs font-semibold text-indigo-700">Proposed: {{ formatDateTime(item.proposed_start_at) }}–{{ formatTime(item.proposed_end_at) }}</p><p v-if="item.administrator_note" class="mt-2 text-xs text-slate-600">Note: {{ item.administrator_note }}</p><button v-if="['Requested', 'Proposed', 'Reschedule Requested'].includes(item.status)" type="button" class="btn-danger mt-2 px-2 py-1 text-[11px] font-semibold" @click="cancelAppointment(item)">Cancel request</button></article><p v-if="!appointments.length" class="text-sm text-slate-500">No appointment requests yet.</p></div>
      </section>

      <section class="rounded-xl border border-rose-200 bg-white p-5 shadow-sm sm:p-6">
        <div class="mb-4"><h2 class="font-bold text-slate-900">Disciplinary notices</h2><p class="mt-1 text-xs text-slate-500">Only notices explicitly made visible to guardians are shown.</p></div>
        <div class="space-y-3"><article v-for="notice in disciplineNotices" :key="notice.incident_id" class="rounded-lg border border-slate-200 bg-slate-50 p-4"><div class="flex flex-wrap items-center justify-between gap-2"><p class="font-semibold text-slate-900">{{ notice.student?.full_name }} · {{ notice.severity }}</p><span class="text-xs text-slate-500">{{ formatDate(notice.incident_date) }}</span></div><p class="mt-2 text-sm text-slate-700">{{ notice.description }}</p><p v-if="notice.action_taken" class="mt-2 text-xs text-slate-500">School action: {{ notice.action_taken }}</p><div v-if="notice.acknowledgement?.status === 'Pending'" class="mt-3 space-y-2"><textarea v-model="disciplineDrafts[notice.incident_id]" maxlength="2000" rows="2" placeholder="Optional response note" class="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"></textarea><button type="button" class="btn-primary px-3 py-2 text-xs font-semibold" :disabled="busyKey === notice.incident_id" @click="acknowledgeNotice(notice)">{{ busyKey === notice.incident_id ? 'Saving…' : 'Acknowledge notice' }}</button></div><p v-else class="mt-3 text-xs font-semibold text-emerald-700">{{ notice.acknowledgement?.status || 'Not required' }}{{ notice.acknowledgement?.acknowledged_at ? ` · ${formatDate(notice.acknowledgement.acknowledged_at)}` : '' }}</p></article><p v-if="!disciplineNotices.length" class="text-sm text-slate-500">No guardian-visible disciplinary notices are available.</p></div>
      </section>

      <section class="rounded-xl border border-violet-200 bg-white p-5 shadow-sm sm:p-6">
        <div class="mb-4"><h2 class="font-bold text-slate-900">Documents and consent</h2><p class="mt-1 text-xs text-slate-500">Review published documents and respond when consent is required.</p></div>
        <div class="space-y-3"><article v-for="document in documents" :key="document.document_id" class="rounded-lg border border-slate-200 bg-slate-50 p-4"><div class="flex flex-wrap items-start justify-between gap-2"><div><p class="font-semibold text-slate-900">{{ document.title }}</p><p class="mt-1 text-xs text-slate-500">Version {{ document.version }}{{ document.student?.full_name ? ` · ${document.student.full_name}` : ' · School-wide' }}</p></div><span :class="document.response ? 'bg-emerald-100 text-emerald-700' : document.consent_required ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'" class="rounded-full px-2 py-1 text-[10px] font-semibold">{{ document.response?.decision || (document.consent_required ? 'Response required' : 'Read only') }}</span></div><p v-if="document.description" class="mt-2 text-sm text-slate-600">{{ document.description }}</p><a :href="document.document_url" target="_blank" rel="noopener noreferrer" class="mt-3 inline-block text-xs font-semibold text-indigo-700 underline">Open document</a><div v-if="document.consent_required" class="mt-3 space-y-2"><textarea v-model="documentDrafts[document.document_id]" maxlength="2000" rows="2" placeholder="Optional response note" class="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"></textarea><div class="flex flex-wrap gap-2"><button v-for="decision in documentDecisions" :key="decision" type="button" class="btn-secondary px-3 py-2 text-[11px] font-semibold" :disabled="busyKey === document.document_id" @click="respondToDocument(document, decision)">{{ decision }}</button></div></div></article><p v-if="!documents.length" class="text-sm text-slate-500">No published documents are available.</p></div>
      </section>

      <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
        <div class="mb-4"><h2 class="font-bold text-slate-900">Guardian profile change request</h2><p class="mt-1 text-xs text-slate-500">Contact changes are reviewed by an administrator before becoming authoritative.</p></div>
        <div class="grid grid-cols-1 gap-5 lg:grid-cols-2"><div><div v-if="profile" class="grid grid-cols-1 gap-3 sm:grid-cols-2"><div class="rounded-lg bg-slate-50 p-3"><p class="text-[11px] text-slate-500">Name</p><p class="mt-1 text-sm font-semibold text-slate-900">{{ profile.full_name }}</p></div><div class="rounded-lg bg-slate-50 p-3"><p class="text-[11px] text-slate-500">Email</p><p class="mt-1 break-all text-sm font-semibold text-slate-900">{{ profile.email }}</p></div><div class="rounded-lg bg-slate-50 p-3"><p class="text-[11px] text-slate-500">Phone</p><p class="mt-1 text-sm font-semibold text-slate-900">{{ profile.phone || 'Not provided' }}</p></div><div class="rounded-lg bg-slate-50 p-3"><p class="text-[11px] text-slate-500">Address</p><p class="mt-1 text-sm font-semibold text-slate-900">{{ profile.address || 'Not provided' }}</p></div></div></div><form class="space-y-3" @submit.prevent="submitProfileChange"><div class="grid grid-cols-1 gap-3 sm:grid-cols-2"><input v-model.trim="profileForm.proposed_full_name" maxlength="160" placeholder="New full name" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" /><input v-model.trim="profileForm.proposed_email" type="email" maxlength="320" placeholder="New email" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" /><input v-model.trim="profileForm.proposed_phone" maxlength="40" placeholder="New phone" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" /><input v-model.trim="profileForm.proposed_relationship" maxlength="80" placeholder="Relationship" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div><input v-model.trim="profileForm.proposed_address" maxlength="300" placeholder="New address" class="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /><textarea v-model.trim="profileForm.reason" required maxlength="1000" rows="2" placeholder="Why should the profile be changed?" class="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"></textarea><button type="submit" class="btn-primary px-4 py-2 text-xs font-semibold" :disabled="busyKey === 'profile'">{{ busyKey === 'profile' ? 'Submitting…' : 'Submit profile change' }}</button></form></div><div class="mt-5 space-y-2 lg:col-span-2"><p class="text-xs font-bold uppercase tracking-wide text-slate-500">Request history</p><article v-for="request in profileRequests" :key="request.request_id" class="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-sm font-semibold text-slate-900">{{ request.status }} · submitted {{ formatDate(request.created_at) }}</p><p class="text-xs text-slate-500">{{ request.reason }}</p><p v-if="request.decision_note" class="text-xs text-slate-600">Decision: {{ request.decision_note }}</p></div><button v-if="request.status === 'Pending'" type="button" class="btn-danger px-2 py-1 text-[11px] font-semibold" @click="withdrawProfileChange(request)">Withdraw</button></article><p v-if="!profileRequests.length" class="text-sm text-slate-500">No profile change requests yet.</p></div></section>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { authStore } from '../store/auth'
import { acknowledgeGuardianDiscipline, cancelGuardianAppointment, createGuardianAppointment, createGuardianCommunication, createGuardianProfileChangeRequest, fetchGuardianAppointments, fetchGuardianCommunications, fetchGuardianDisciplineNotices, fetchGuardianDocuments, fetchGuardianProfile, fetchGuardianProfileChangeRequests, respondToGuardianDocument, updateGuardianCommunication, withdrawGuardianProfileChangeRequest } from '../api.js'
import { guardianStudentContext } from '../store/guardianStudentContext.js'

const token = () => authStore.token.value
const selectedStudentId = guardianStudentContext.selectedStudentId
const selectedStudent = guardianStudentContext.selectedStudent
const communications = ref([])
const appointments = ref([])
const disciplineNotices = ref([])
const documents = ref([])
const profile = ref(null)
const profileRequests = ref([])
const errorMessage = ref('')
const successMessage = ref('')
const busyKey = ref('')
const communicationCategories = ['Academic', 'Attendance', 'Behavior', 'Finance', 'Appointment', 'General']
const documentDecisions = ['Accepted', 'Declined', 'Needs Clarification']
const disciplineDrafts = reactive({})
const documentDrafts = reactive({})
const communicationForm = reactive({ student_id: '', category: 'General', subject: '', message: '' })
const communicationAccountWide = ref(false)
const appointmentForm = reactive({ student_id: '', purpose: '', preferred_start_at: '', preferred_end_at: '' })
const profileForm = reactive({ proposed_full_name: '', proposed_email: '', proposed_phone: '', proposed_address: '', proposed_relationship: '', reason: '' })

function formatDate(value) { return value ? new Date(value).toLocaleDateString() : 'Not recorded' }
function formatDateTime(value) { return value ? new Date(value).toLocaleString() : 'Not recorded' }
function formatTime(value) { return value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Time unavailable' }
function clearMessages() { errorMessage.value = ''; successMessage.value = '' }
function setCommunicationScope(accountWide) {
  communicationAccountWide.value = accountWide
  communicationForm.student_id = accountWide ? '' : selectedStudentId.value
}
function showError(result, fallback) { if (!result.ok) errorMessage.value = result.error || fallback; return result.ok }

async function loadAll() {
  const studentParams = selectedStudentId.value ? { student_id: selectedStudentId.value } : {}
  const results = await Promise.all([fetchGuardianCommunications(token(), studentParams), fetchGuardianAppointments(token(), studentParams), fetchGuardianDisciplineNotices(token(), studentParams), fetchGuardianDocuments(token(), studentParams), fetchGuardianProfile(token()), fetchGuardianProfileChangeRequests(token())])
  if (results[0].ok) communications.value = results[0].data || []
  if (results[1].ok) appointments.value = results[1].data || []
  if (results[2].ok) disciplineNotices.value = results[2].data || []
  if (results[3].ok) documents.value = results[3].data || []
  if (results[4].ok) profile.value = results[4].data
  if (results[5].ok) profileRequests.value = results[5].data || []
  const failed = results.find((result) => !result.ok)
  if (failed) errorMessage.value = failed.error || 'Unable to load guardian engagement data.'
}

async function submitCommunication() { clearMessages(); busyKey.value = 'communication'; const result = await createGuardianCommunication(token(), communicationForm); if (showError(result, 'Unable to submit communication request.')) { successMessage.value = 'Communication request submitted.'; communicationForm.subject = ''; communicationForm.message = ''; await loadAll() } busyKey.value = '' }
async function closeCommunication(item) { clearMessages(); busyKey.value = item.request_id; const result = await updateGuardianCommunication(token(), item.request_id, { status: 'Closed' }); if (showError(result, 'Unable to close communication request.')) await loadAll(); busyKey.value = '' }
async function submitAppointment() { clearMessages(); if (!selectedStudentId.value) { errorMessage.value = 'Select a student from the universal Student bar before requesting an appointment.'; return } appointmentForm.student_id = selectedStudentId.value; busyKey.value = 'appointment'; const result = await createGuardianAppointment(token(), appointmentForm); if (showError(result, 'Unable to submit appointment request.')) { successMessage.value = 'Appointment request submitted.'; appointmentForm.purpose = ''; appointmentForm.preferred_start_at = ''; appointmentForm.preferred_end_at = ''; await loadAll() } busyKey.value = '' }
async function cancelAppointment(item) { clearMessages(); busyKey.value = item.appointment_id; const result = await cancelGuardianAppointment(token(), item.appointment_id); if (showError(result, 'Unable to cancel appointment request.')) await loadAll(); busyKey.value = '' }
async function acknowledgeNotice(notice) { clearMessages(); busyKey.value = notice.incident_id; const result = await acknowledgeGuardianDiscipline(token(), notice.incident_id, { response_note: disciplineDrafts[notice.incident_id] || '' }); if (showError(result, 'Unable to acknowledge disciplinary notice.')) { successMessage.value = 'Disciplinary notice acknowledged.'; await loadAll() } busyKey.value = '' }
async function respondToDocument(document, decision) { clearMessages(); busyKey.value = document.document_id; const result = await respondToGuardianDocument(token(), document.document_id, { decision, response_note: documentDrafts[document.document_id] || '', student_id: document.student_id || undefined }); if (showError(result, 'Unable to save document response.')) { successMessage.value = 'Document response recorded.'; await loadAll() } busyKey.value = '' }
async function submitProfileChange() { clearMessages(); busyKey.value = 'profile'; const body = Object.fromEntries(Object.entries(profileForm).filter(([, value]) => value !== '')); const result = await createGuardianProfileChangeRequest(token(), body); if (showError(result, 'Unable to submit profile change.')) { successMessage.value = 'Profile change submitted for administrator review.'; Object.keys(profileForm).forEach((key) => { profileForm[key] = '' }); await loadAll() } busyKey.value = '' }
async function withdrawProfileChange(item) { clearMessages(); busyKey.value = item.request_id; const result = await withdrawGuardianProfileChangeRequest(token(), item.request_id); if (showError(result, 'Unable to withdraw profile change.')) await loadAll(); busyKey.value = '' }

onMounted(async () => {
  const contextResult = await guardianStudentContext.ensureLoaded(token(), authStore.user.value?.user_id || authStore.user.value?.id)
  if (!contextResult.ok) errorMessage.value = contextResult.error || 'Unable to load linked students.'
  communicationForm.student_id = selectedStudentId.value
  appointmentForm.student_id = selectedStudentId.value
  await loadAll()
})
watch(selectedStudentId, (studentId) => {
  if (!communicationAccountWide.value) communicationForm.student_id = studentId
  appointmentForm.student_id = studentId
  loadAll()
})
</script>
