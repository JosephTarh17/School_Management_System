<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Administration</p>
        <h1 class="mt-1 text-2xl font-bold text-slate-950">Guardian Management</h1>
        <p class="mt-1 text-sm text-slate-500">Create guardian accounts, review guardian profiles, and link them to students from Student Enrollment.</p>
      </div>
      <button type="button" :disabled="loading" @click="loadGuardians" class="btn-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{{ loading ? 'Refreshing…' : 'Refresh guardians' }}</button>
    </header>

    <p v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{{ errorMessage }}</p>
    <p v-if="successMessage" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{{ successMessage }}</p>

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <form class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" @submit.prevent="submitGuardian">
        <div><h2 class="font-bold text-slate-900">Create guardian account</h2><p class="mt-1 text-xs text-slate-500">The guardian can sign in immediately using the temporary password you provide.</p></div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <label class="text-xs font-semibold text-slate-700">Full name<input v-model.trim="form.full_name" required maxlength="160" placeholder="Guardian full name" class="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" /></label>
          <label class="text-xs font-semibold text-slate-700">Email<input v-model.trim="form.email" required type="email" maxlength="320" placeholder="guardian@example.com" class="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" /></label>
          <label class="text-xs font-semibold text-slate-700">Temporary password<input v-model="form.password" required type="password" minlength="8" maxlength="128" placeholder="At least 8 characters" class="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" /></label>
          <label class="text-xs font-semibold text-slate-700">Phone<input v-model.trim="form.phone" maxlength="40" placeholder="Optional phone number" class="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" /></label>
          <label class="text-xs font-semibold text-slate-700">Relationship<input v-model.trim="form.relationship" maxlength="80" placeholder="Parent, sponsor, etc." class="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" /></label>
        </div>
        <button type="submit" :disabled="saving" class="btn-primary w-full px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{{ saving ? 'Creating guardian…' : 'Create guardian' }}</button>
      </form>

      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="mb-4 flex items-center justify-between gap-3"><div><h2 class="font-bold text-slate-900">Guardian profiles</h2><p class="text-xs text-slate-500">{{ countLabel(guardians.length, 'guardian account') }} available</p></div><span class="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">Administrator only</span></div>
        <div v-if="loading" class="py-10 text-center text-sm text-slate-500">Loading guardian profiles…</div>
        <div v-else-if="!guardians.length" class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">No guardian profiles exist yet.</div>
        <div v-else class="space-y-3">
          <article v-for="guardian in guardians" :key="guardian.user_id" class="rounded-lg border border-slate-200 p-4">
            <div class="flex items-start justify-between gap-3"><div class="min-w-0"><h3 class="truncate font-semibold text-slate-900">{{ guardian.guardian?.full_name || 'Unnamed guardian' }}</h3><p class="mt-1 break-all text-xs text-slate-500">{{ guardian.email }}</p></div><span class="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">Guardian</span></div>
            <dl class="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2"><div><dt class="text-slate-500">Phone</dt><dd class="mt-0.5 text-slate-800">{{ guardian.guardian?.phone || 'Not provided' }}</dd></div><div><dt class="text-slate-500">Relationship</dt><dd class="mt-0.5 text-slate-800">{{ guardian.guardian?.relationship || 'Not provided' }}</dd></div><div class="sm:col-span-2"><dt class="text-slate-500">Account created</dt><dd class="mt-0.5 text-slate-800">{{ formatDate(guardian.created_at) }}</dd></div></dl>
            <router-link to="/student-enrollment" class="btn-secondary mt-4 px-3 py-2 text-xs font-semibold">Link to a student</router-link>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { authStore } from '../store/auth.js'
import { createGuardian, fetchUsers } from '../api.js'
import { countLabel } from '../lib/formatters.js'

const users = ref([])
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const form = reactive({ full_name: '', email: '', password: '', phone: '', relationship: '' })
const guardians = computed(() => users.value.filter((user) => user.role === 'guardian' && user.guardian?.guardian_id))
const token = () => authStore.token.value

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : 'Not recorded'
}

async function loadGuardians() {
  loading.value = true
  errorMessage.value = ''
  const result = await fetchUsers(token())
  if (!result.ok) errorMessage.value = result.error || 'Unable to load guardian profiles.'
  else users.value = result.data || []
  loading.value = false
}

async function submitGuardian() {
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  const result = await createGuardian(token(), { ...form })
  if (!result.ok) {
    errorMessage.value = result.error || 'Unable to create guardian account.'
  } else {
    successMessage.value = `Guardian account created for ${result.data?.guardian?.full_name || form.full_name}.`
    Object.keys(form).forEach((key) => { form[key] = '' })
    await loadGuardians()
  }
  saving.value = false
}

onMounted(loadGuardians)
</script>
