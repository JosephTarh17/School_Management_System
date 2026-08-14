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

    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div v-if="loading" class="py-12 text-center text-sm text-slate-500">Loading audit records…</div>
      <div v-else-if="!logs.length" class="bg-slate-50 py-12 text-center text-sm text-slate-500">No audit records match this filter.</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th class="px-5 py-3">Timestamp</th>
              <th class="px-5 py-3">Action & Path</th>
              <th class="px-5 py-3">Actor</th>
              <th class="px-5 py-3">Status</th>
              <th class="px-5 py-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <template v-for="log in logs" :key="log.audit_id">
              <tr class="group hover:bg-slate-50/50">
                <td class="whitespace-nowrap px-5 py-4 text-slate-500">{{ formatDate(log.created_at) }}</td>
                <td class="px-5 py-4">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-900">{{ log.action }}</span>
                  </div>
                  <div class="mt-1 font-mono text-[10px] text-slate-400">{{ log.request_path }}</div>
                </td>
                <td class="px-5 py-4">
                  <div class="font-medium text-slate-700">{{ log.user_account?.email || 'System' }}</div>
                  <div class="mt-0.5 text-[10px] text-slate-400 uppercase tracking-tight">{{ log.user_account?.role || 'Internal' }}</div>
                </td>
                <td class="px-5 py-4">
                  <span :class="log.status_code >= 400 ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'" class="inline-flex items-center rounded border px-1.5 py-0.5 font-bold">
                    {{ log.status_code }}
                  </span>
                </td>
                <td class="px-5 py-4 text-right">
                  <button v-if="hasMetadata(log.metadata)" @click="log.expanded = !log.expanded" class="text-indigo-600 hover:text-indigo-800 font-semibold">
                    {{ log.expanded ? 'Hide' : 'View' }}
                  </button>
                  <span v-else class="text-slate-300">—</span>
                </td>
              </tr>
              <tr v-if="log.expanded" class="bg-slate-50/80">
                <td colspan="5" class="px-5 py-4">
                  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Resource</p>
                      <p class="mt-1 font-medium text-slate-700">{{ resourceLabel(log) }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Correlation ID</p>
                      <p class="mt-1 font-mono text-slate-600">{{ log.correlation_id }}</p>
                    </div>
                    <div class="sm:col-span-2">
                      <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sanitized Metadata</p>
                      <pre class="mt-2 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white p-3 font-mono text-[11px] leading-relaxed text-slate-800">{{ JSON.stringify(log.metadata, null, 2) }}</pre>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
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
  else logs.value = (result.data || []).map((log) => ({ ...log, expanded: false }))
  loading.value = false
}

onMounted(loadLogs)
</script>
