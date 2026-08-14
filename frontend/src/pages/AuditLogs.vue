<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Security & Compliance</p>
        <h1 class="mt-1 text-2xl font-bold text-slate-950">Administrator Audit Logs</h1>
        <p class="mt-1 text-sm text-slate-500">Review protected mutation activity recorded by the backend. Audit records are append-only.</p>
      </div>
      <button type="button" :disabled="loading" @click="loadLogs" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{{ loading ? 'Refreshing…' : 'Refresh logs' }}</button>
    </header>

    <p v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{{ errorMessage }}</p>

    <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><label class="w-full text-xs font-semibold text-slate-700 sm:max-w-sm">Filter by action<input v-model.trim="actionFilter" @keyup.enter="loadLogs" placeholder="Example: POST /users" class="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" /></label><span class="text-xs text-slate-500">Showing {{ logs.length }} recent record{{ logs.length === 1 ? '' : 's' }}</span></div>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div v-if="loading" class="py-10 text-center text-sm text-slate-500">Loading audit records…</div>
      <div v-else-if="!logs.length" class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">No audit records match this filter.</div>
      <div v-else class="space-y-3">
        <article v-for="log in logs" :key="log.audit_id" class="rounded-lg border border-slate-200 p-4">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><span class="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">{{ log.http_method || 'EVENT' }}</span><span class="font-semibold text-slate-900">{{ log.action }}</span><span :class="log.status_code >= 400 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'" class="rounded-full px-2 py-1 text-[11px] font-semibold">{{ log.status_code || '—' }}</span></div><p class="mt-2 break-all text-xs text-slate-500">{{ log.request_path || 'Path unavailable' }}</p></div><time class="shrink-0 text-xs text-slate-500">{{ formatDate(log.created_at) }}</time></div>
          <dl class="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3"><div><dt class="text-slate-500">Actor</dt><dd class="mt-0.5 break-all font-medium text-slate-800">{{ log.user_account?.email || 'System / unavailable' }}</dd></div><div><dt class="text-slate-500">Resource</dt><dd class="mt-0.5 break-all text-slate-800">{{ resourceLabel(log) }}</dd></div><div><dt class="text-slate-500">Correlation ID</dt><dd class="mt-0.5 break-all text-slate-800">{{ log.correlation_id || 'Not recorded' }}</dd></div></dl>
          <details v-if="hasMetadata(log.metadata)" class="mt-4 border-t border-slate-100 pt-3"><summary class="cursor-pointer text-xs font-semibold text-indigo-700">View sanitized metadata</summary><pre class="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] leading-5 text-slate-100">{{ JSON.stringify(log.metadata, null, 2) }}</pre></details>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { authStore } from '../store/auth.js'
import { fetchAuditLogs } from '../api.js'

const logs = ref([])
const actionFilter = ref('')
const loading = ref(true)
const errorMessage = ref('')
const token = () => authStore.token.value

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : 'Not recorded'
}

function resourceLabel(log) {
  return [log.resource_type, log.resource_id].filter(Boolean).join(' · ') || 'Not specified'
}

function hasMetadata(value) {
  return value && typeof value === 'object' && Object.keys(value).length > 0
}

async function loadLogs() {
  loading.value = true
  errorMessage.value = ''
  const result = await fetchAuditLogs(token(), { limit: 100, action: actionFilter.value })
  if (!result.ok) errorMessage.value = result.error || 'Unable to load audit logs.'
  else logs.value = result.data || []
  loading.value = false
}

onMounted(loadLogs)
</script>
