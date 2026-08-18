<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 font-sans">Configure Locations</h1>
        <p class="mt-1 text-xs text-slate-500 font-geist">Manage rooms and locations used when teachers create class sessions.</p>
      </div>
      <button v-if="editingId" type="button" class="rounded-eight border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50" @click="resetForm">Cancel editing</button>
    </div>

    <div v-if="errorMessage" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{{ errorMessage }}</div>
    <div v-if="successMessage" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">{{ successMessage }}</div>

    <form class="rounded-xl border border-blue-200 bg-blue-50/60 p-5 shadow-xs" @submit.prevent="saveRoom">
      <div class="mb-4">
        <h2 class="text-base font-bold text-slate-900 font-sans">{{ editingId ? 'Edit class location' : 'Add class location' }}</h2>
        <p class="mt-1 text-xs text-slate-600">A location already used by a class session cannot be deleted, preserving historical records.</p>
      </div>
      <div class="grid gap-4 md:grid-cols-3">
        <label class="block text-xs font-semibold text-slate-700">
          Location name
          <input v-model.trim="form.room_name" required maxlength="120" placeholder="Computer Lab 1" class="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
        </label>
        <label class="block text-xs font-semibold text-slate-700">
          Building or area
          <input v-model.trim="form.location" maxlength="160" placeholder="Science Block" class="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
        </label>
        <label class="block text-xs font-semibold text-slate-700">
          Capacity
          <input v-model.number="form.capacity" type="number" min="1" max="100000" placeholder="30" class="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
        </label>
      </div>
      <button type="submit" :disabled="saving" class="mt-4 rounded-eight bg-primary-container px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
        {{ saving ? 'Saving…' : editingId ? 'Save location' : 'Add location' }}
      </button>
    </form>

    <section class="rounded-xl border border-border-subtle bg-white p-4 shadow-xs sm:p-6">
      <div class="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-bold text-slate-900 font-sans">Configured locations</h2>
          <p class="mt-1 text-xs text-slate-500">{{ rooms.length }} location{{ rooms.length === 1 ? '' : 's' }} available for class sessions.</p>
        </div>
        <button type="button" :disabled="loading" class="rounded-eight border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50" @click="loadRooms">Refresh</button>
      </div>

      <div v-if="loading" class="py-10 text-center text-sm text-slate-500">Loading class locations…</div>
      <div v-else-if="!rooms.length" class="py-10 text-center text-sm text-slate-500">No class locations have been configured yet.</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[620px] text-left text-xs font-geist">
          <thead><tr class="border-b border-slate-200 bg-slate-50 text-slate-500"><th class="px-4 py-3 font-semibold">Location</th><th class="px-4 py-3 font-semibold">Building or area</th><th class="px-4 py-3 font-semibold">Capacity</th><th class="px-4 py-3 text-right font-semibold">Actions</th></tr></thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="room in rooms" :key="room.room_id" class="text-slate-700">
              <td class="px-4 py-3.5 font-semibold text-slate-900">{{ room.room_name }}</td>
              <td class="px-4 py-3.5">{{ room.location || 'Not specified' }}</td>
              <td class="px-4 py-3.5">{{ room.capacity || 'Not specified' }}</td>
              <td class="px-4 py-3.5 text-right"><div class="inline-flex gap-2"><button type="button" class="rounded-md border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-50" @click="startEdit(room)">Edit</button><button type="button" class="rounded-md border border-rose-200 px-2.5 py-1.5 font-semibold text-rose-700 hover:bg-rose-50" @click="removeRoom(room)">Delete</button></div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { authStore } from '../store/auth.js'
import { createRoom, deleteRoom, fetchRooms, updateRoom } from '../api.js'

const rooms = ref([])
const loading = ref(true)
const saving = ref(false)
const editingId = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const form = reactive({ room_name: '', location: '', capacity: null })

function resetForm() {
  editingId.value = ''
  form.room_name = ''
  form.location = ''
  form.capacity = null
}

function startEdit(room) {
  editingId.value = room.room_id
  form.room_name = room.room_name || ''
  form.location = room.location || ''
  form.capacity = room.capacity || null
  errorMessage.value = ''
  successMessage.value = ''
}

async function loadRooms() {
  loading.value = true
  errorMessage.value = ''
  const result = await fetchRooms(authStore.token.value)
  if (!result.ok) errorMessage.value = result.error || 'Unable to load class locations.'
  else rooms.value = result.data || []
  loading.value = false
}

async function saveRoom() {
  errorMessage.value = ''
  successMessage.value = ''
  saving.value = true
  const body = { room_name: form.room_name, location: form.location || null, capacity: form.capacity || null }
  const result = editingId.value
    ? await updateRoom(authStore.token.value, editingId.value, body)
    : await createRoom(authStore.token.value, body)
  if (!result.ok) {
    errorMessage.value = result.error || 'Unable to save the class location.'
  } else {
    successMessage.value = editingId.value ? 'Class location updated.' : 'Class location added.'
    resetForm()
    await loadRooms()
  }
  saving.value = false
}

async function removeRoom(room) {
  if (!window.confirm(`Delete ${room.room_name}? Locations used by existing sessions cannot be deleted.`)) return
  errorMessage.value = ''
  successMessage.value = ''
  const result = await deleteRoom(authStore.token.value, room.room_id)
  if (!result.ok) errorMessage.value = result.error || 'Unable to delete the class location.'
  else {
    successMessage.value = 'Class location deleted.'
    await loadRooms()
  }
}

onMounted(loadRooms)
</script>
