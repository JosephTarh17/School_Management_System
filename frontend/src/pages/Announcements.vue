<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-primary-container">School information</p>
        <h1 class="mt-1 text-2xl font-bold tracking-tight text-slate-900">Announcements</h1>
        <p class="mt-1 text-sm text-slate-500">School notices and important updates for the right audience.</p>
      </div>
      <button type="button" class="btn-primary px-3 py-2 text-xs font-semibold" @click="loadAnnouncements">Refresh</button>
    </div>

    <div v-if="errorMessage" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
      {{ errorMessage }}
    </div>
    <div v-if="successMessage" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">
      {{ successMessage }}
    </div>

    <section v-if="isAdministrator" class="rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
      <div class="mb-4">
        <h2 class="text-base font-bold text-slate-900">Create an announcement</h2>
        <p class="mt-1 text-xs text-slate-500">Publish a notice to everyone or to one user group.</p>
      </div>
      <form class="space-y-4" @submit.prevent="saveAnnouncement">
        <div class="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <label class="lg:col-span-2 text-xs font-semibold text-slate-700">
            Title
            <input v-model.trim="announcementForm.title" required maxlength="200" class="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none" placeholder="e.g. Registration deadline" />
          </label>
          <label class="text-xs font-semibold text-slate-700">
            Audience
            <select v-model="announcementForm.audience" class="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none">
              <option v-for="option in audienceOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
          <label class="text-xs font-semibold text-slate-700">
            Priority
            <select v-model="announcementForm.priority" class="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none">
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
        </div>
        <label class="block text-xs font-semibold text-slate-700">
          Message
          <textarea v-model.trim="announcementForm.body" required maxlength="5000" rows="4" class="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none" placeholder="Write the notice for the selected audience."></textarea>
        </label>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label class="text-xs font-semibold text-slate-700">
            Optional expiry date
            <input v-model="announcementForm.expires_at" type="date" class="mt-1.5 block rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none" />
          </label>
          <div class="flex flex-col gap-2 sm:flex-row">
            <button type="button" :disabled="saving" class="btn-secondary px-4 py-2 text-xs font-semibold" @click="saveAnnouncement('draft')">Save draft</button>
            <button type="button" :disabled="saving" class="btn-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50" @click="saveAnnouncement('published')">{{ saving ? 'Saving…' : 'Publish announcement' }}</button>
          </div>
        </div>
      </form>
    </section>

    <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
      <div class="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-bold text-slate-900">{{ isAdministrator ? 'Announcement library' : 'School notices' }}</h2>
          <p class="mt-1 text-xs text-slate-500">{{ isAdministrator ? 'Drafts and published notices are visible to administrators.' : 'Published notices for your account are shown here.' }}</p>
        </div>
        <span class="text-xs text-slate-400">{{ announcements.length }} {{ announcements.length === 1 ? 'announcement' : 'announcements' }}</span>
      </div>

      <div v-if="loading" class="py-10 text-center text-sm text-slate-500">Loading announcements…</div>
      <div v-else-if="!announcements.length" class="border-t border-slate-100 py-10 text-center text-sm text-slate-500">There are no announcements to display.</div>
      <div v-else class="divide-y divide-slate-100">
        <article v-for="announcement in announcements" :key="announcement.announcement_id" class="py-4 first:pt-0 last:pb-0">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-sm font-semibold text-slate-900">{{ announcement.title }}</h3>
                <span :class="priorityClass(announcement.priority)" class="rounded-full px-2 py-0.5 text-[11px] font-semibold">{{ announcement.priority }}</span>
                <span v-if="isAdministrator" class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{{ announcement.status }}</span>
              </div>
              <p class="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{{ announcement.body }}</p>
              <p class="mt-2 text-xs text-slate-400">{{ formatDate(announcement.published_at || announcement.created_at) }} · {{ audienceLabel(announcement.audience) }}<span v-if="announcement.expires_at"> · Until {{ formatDate(announcement.expires_at) }}</span></p>
            </div>
            <div v-if="isAdministrator" class="flex shrink-0 gap-2">
              <button v-if="announcement.status === 'draft'" type="button" class="btn-primary px-3 py-1.5 text-xs font-semibold" @click="changeStatus(announcement, 'published')">Publish</button>
              <button v-if="announcement.status === 'published'" type="button" class="btn-secondary px-3 py-1.5 text-xs font-semibold" @click="changeStatus(announcement, 'archived')">Archive</button>
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { createAnnouncement, fetchAnnouncements, updateAnnouncement } from '../api.js'
import { authStore } from '../store/auth.js'

const announcements = ref([])
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const isAdministrator = computed(() => authStore.userRole.value === 'administrator')
const audienceOptions = [
  { value: 'all', label: 'Everyone' },
  { value: 'students', label: 'Students' },
  { value: 'teachers', label: 'Teachers' },
  { value: 'guardians', label: 'Guardians' },
  { value: 'administrators', label: 'Administrators' },
]
const announcementForm = reactive({ title: '', body: '', audience: 'all', priority: 'normal', expires_at: '' })

function formatDate(value) {
  if (!value) return 'Date unavailable'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

function audienceLabel(value) {
  return audienceOptions.find((option) => option.value === value)?.label || value
}

function priorityClass(priority) {
  if (priority === 'urgent') return 'bg-rose-100 text-rose-700'
  if (priority === 'important') return 'bg-amber-100 text-amber-700'
  return 'bg-slate-100 text-slate-600'
}

async function loadAnnouncements() {
  loading.value = true
  errorMessage.value = ''
  const result = await fetchAnnouncements(authStore.token.value)
  if (!result.ok) errorMessage.value = result.error || 'Unable to load announcements.'
  else announcements.value = result.data || []
  loading.value = false
}

async function saveAnnouncement(status) {
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  const result = await createAnnouncement(authStore.token.value, { ...announcementForm, status })
  if (!result.ok) errorMessage.value = result.error || 'Unable to save the announcement.'
  else {
    successMessage.value = status === 'published' ? 'Announcement published.' : 'Announcement saved as a draft.'
    Object.assign(announcementForm, { title: '', body: '', audience: 'all', priority: 'normal', expires_at: '' })
    await loadAnnouncements()
  }
  saving.value = false
}

async function changeStatus(announcement, status) {
  errorMessage.value = ''
  successMessage.value = ''
  const result = await updateAnnouncement(authStore.token.value, announcement.announcement_id, { status })
  if (!result.ok) errorMessage.value = result.error || 'Unable to update the announcement.'
  else {
    successMessage.value = status === 'published' ? 'Announcement published.' : 'Announcement archived.'
    await loadAnnouncements()
  }
}

onMounted(loadAnnouncements)
</script>
