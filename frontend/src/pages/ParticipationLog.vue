<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Student Participation & Behavior Log</h1>
        <p class="mt-1 text-xs text-slate-500 font-geist">Manage real classroom engagement records and instructor notes.</p>
      </div>
      <span class="text-xs text-slate-400 font-geist">Teacher and administrator access</span>
    </div>

    <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
      <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-xs"><p class="text-xs text-slate-500">Total entries</p><p class="mt-1 text-xl font-bold text-slate-900">{{ loading ? '…' : logs.length }}</p></div>
      <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-xs"><p class="text-xs text-slate-500">Active</p><p class="mt-1 text-xl font-bold text-emerald-700">{{ loading ? '…' : countRating('Active') }}</p></div>
      <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-xs"><p class="text-xs text-slate-500">Moderate</p><p class="mt-1 text-xl font-bold text-blue-700">{{ loading ? '…' : countRating('Moderate') }}</p></div>
      <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-xs"><p class="text-xs text-slate-500">Disruptive</p><p class="mt-1 text-xl font-bold text-rose-700">{{ loading ? '…' : countRating('Disruptive') }}</p></div>
    </div>

    <div v-if="errorMessage" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{{ errorMessage }}</div>
    <div v-if="successMessage" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">{{ successMessage }}</div>

    <div class="rounded-xl border border-border-subtle bg-white p-6 shadow-xs">
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 class="text-base font-bold text-slate-900 font-sans">Participation records</h2><p class="mt-1 text-xs text-slate-500">Edit ratings and notes or remove an incorrect record.</p></div><button type="button" :disabled="loading" @click="loadLogs" class="rounded-eight bg-primary-container px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{{ loading ? 'Refreshing…' : 'Refresh records' }}</button></div>
      <div v-if="loading" class="py-10 text-center text-sm text-slate-500">Loading participation records…</div>
      <div v-else-if="!logs.length" class="py-10 text-center text-sm text-slate-500">No participation records are available.</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-left text-xs font-geist">
          <thead><tr class="border-b border-slate-200 bg-slate-50 text-slate-500"><th class="px-4 py-3 font-semibold">Entry ID</th><th class="px-4 py-3 font-semibold">Student</th><th class="px-4 py-3 font-semibold">Course</th><th class="px-4 py-3 font-semibold">Rating</th><th class="px-4 py-3 font-semibold">Notes</th><th class="px-4 py-3 font-semibold">Recorded</th><th class="px-4 py-3 font-semibold">Actions</th></tr></thead>
          <tbody class="divide-y divide-slate-100 text-slate-700">
            <tr v-for="record in logs" :key="record.participation_id" class="hover:bg-slate-50/80"><td class="px-4 py-3.5 font-bold text-slate-900">{{ record.participation_id }}</td><td class="px-4 py-3.5 font-medium text-slate-900">{{ record.student?.full_name || record.student_id }}</td><td class="px-4 py-3.5">{{ record.class_session?.course?.course_name || record.session_id }}</td><td class="px-4 py-3.5"><Badge :type="badgeType(record.rating)" :text="record.rating" /></td><td class="max-w-xs px-4 py-3.5 text-slate-600">{{ record.notes || 'No note recorded' }}</td><td class="px-4 py-3.5 text-slate-500">{{ formatDate(record.recorded_at) }}</td><td class="px-4 py-3.5"><div class="flex gap-2"><button type="button" @click="openEdit(record)" class="rounded border border-blue-200 px-2.5 py-1.5 font-semibold text-blue-700 hover:bg-blue-50">Edit</button><button type="button" :disabled="deletingId === record.participation_id" @click="deleteLog(record)" class="rounded border border-rose-200 px-2.5 py-1.5 font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">{{ deletingId === record.participation_id ? 'Deleting…' : 'Delete' }}</button></div></td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="editingId" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-participation-title">
      <form class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" @submit.prevent="saveEdit"><div class="flex items-start justify-between"><div><h2 id="edit-participation-title" class="text-lg font-bold text-slate-900">Edit participation record</h2><p class="mt-1 text-xs text-slate-500">{{ editingRecord?.participation_id }}</p></div><button type="button" @click="closeEdit" class="text-slate-400 hover:text-slate-700" aria-label="Close edit form">✕</button></div>
        <label class="mt-5 block text-xs font-semibold text-slate-700">Rating<select v-model="form.rating" class="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none"><option v-for="rating in ratings" :key="rating" :value="rating">{{ rating }}</option></select></label>
        <label class="mt-4 block text-xs font-semibold text-slate-700">Instructor notes<textarea v-model="form.notes" maxlength="1000" rows="5" class="mt-1.5 block w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none" placeholder="Optional note"></textarea><span class="mt-1 block text-right text-[11px] font-normal text-slate-400">{{ form.notes.length }}/1000</span></label>
        <p v-if="formError" class="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{{ formError }}</p><div class="mt-6 flex justify-end gap-3"><button type="button" @click="closeEdit" class="rounded-eight border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button type="submit" :disabled="saving" class="rounded-eight bg-primary-container px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{{ saving ? 'Saving…' : 'Save changes' }}</button></div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import Badge from '../components/Badge.vue'
import { authStore } from '../store/auth.js'
import { deleteParticipationLog, fetchParticipationLogs, updateParticipationLog } from '../api.js'

const ratings = ['Active', 'Moderate', 'Passive', 'Disruptive']
const logs = ref([])
const loading = ref(true)
const saving = ref(false)
const deletingId = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const editingId = ref('')
const editingRecord = ref(null)
const formError = ref('')
const form = reactive({ rating: 'Active', notes: '' })

function countRating(rating) { return logs.value.filter((record) => record.rating === rating).length }
function formatDate(value) { return value ? new Date(value).toLocaleDateString() : 'Not recorded' }
function badgeType(rating) { return rating === 'Active' ? 'present' : rating === 'Disruptive' ? 'danger' : 'info' }

async function loadLogs() {
  loading.value = true
  errorMessage.value = ''
  const result = await fetchParticipationLogs(authStore.token.value)
  if (!result.ok) errorMessage.value = result.error || 'Unable to load participation records.'
  else logs.value = result.data || []
  loading.value = false
}

function openEdit(record) { editingRecord.value = record; editingId.value = record.participation_id; form.rating = record.rating || 'Active'; form.notes = record.notes || ''; formError.value = '' }
function closeEdit() { if (saving.value) return; editingId.value = ''; editingRecord.value = null; formError.value = '' }

async function saveEdit() {
  formError.value = ''
  if (!ratings.includes(form.rating)) { formError.value = 'Select a valid participation rating.'; return }
  if (form.notes.length > 1000) { formError.value = 'Notes must be 1000 characters or fewer.'; return }
  saving.value = true
  const result = await updateParticipationLog(authStore.token.value, editingId.value, { rating: form.rating, notes: form.notes.trim() || null })
  if (!result.ok) formError.value = result.error || 'Unable to update participation record.'
  else { const index = logs.value.findIndex((record) => record.participation_id === editingId.value); if (index >= 0) logs.value[index] = result.data; successMessage.value = 'Participation record updated successfully.'; closeEdit() }
  saving.value = false
}

async function deleteLog(record) {
  if (!window.confirm(`Delete the participation record for ${record.student?.full_name || record.student_id}? This cannot be undone.`)) return
  deletingId.value = record.participation_id
  errorMessage.value = ''
  const result = await deleteParticipationLog(authStore.token.value, record.participation_id)
  if (!result.ok) errorMessage.value = result.error || 'Unable to delete participation record.'
  else { logs.value = logs.value.filter((item) => item.participation_id !== record.participation_id); successMessage.value = 'Participation record deleted successfully.' }
  deletingId.value = ''
}

onMounted(loadLogs)
</script>
