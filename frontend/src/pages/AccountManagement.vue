<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Administration</p>
        <h1 class="mt-1 text-2xl font-bold text-slate-950">Account Management</h1>
        <p class="mt-1 max-w-3xl text-sm text-slate-500">Manage access without deleting academic, attendance, financial, or audit history.</p>
      </div>
      <button type="button" :disabled="loading" @click="loadUsers" class="btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50">
        {{ loading ? 'Refreshing…' : 'Refresh accounts' }}
      </button>
    </header>

    <p v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{{ errorMessage }}</p>
    <p v-if="successMessage" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{{ successMessage }}</p>
    <div v-if="temporaryPassword" class="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm" role="status">
      <p class="text-xs font-semibold uppercase tracking-wide text-amber-800">One-time temporary password</p>
      <p class="mt-1 text-sm text-amber-900">Share this value securely with the user. It is not stored in the audit log, and the user should change it immediately after signing in.</p>
      <code class="mt-3 block select-all rounded-lg border border-amber-200 bg-white px-3 py-2 font-mono text-sm font-bold text-slate-900">{{ temporaryPassword }}</code>
    </div>

    <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Accounts</p><p class="mt-1 text-2xl font-bold text-slate-950">{{ users.length }}</p></div>
      <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm"><p class="text-xs font-semibold uppercase tracking-wide text-emerald-700">Enabled</p><p class="mt-1 text-2xl font-bold text-emerald-900">{{ enabledCount }}</p></div>
      <div class="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm"><p class="text-xs font-semibold uppercase tracking-wide text-rose-700">Disabled</p><p class="mt-1 text-2xl font-bold text-rose-900">{{ disabledCount }}</p></div>
      <div class="rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm"><p class="text-xs font-semibold uppercase tracking-wide text-indigo-700">Active administrators</p><p class="mt-1 text-2xl font-bold text-indigo-900">{{ activeAdministratorCount }}</p></div>
    </div>

    <div v-if="selectedAction" class="rounded-xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 class="font-bold text-indigo-950">{{ actionTitle }} for {{ displayName(selectedAction.user) }}</h2>
          <p class="mt-1 text-sm text-indigo-800">{{ actionDescription }}</p>
        </div>
        <button type="button" class="btn-ghost px-2 py-1 text-xs font-semibold" @click="closeAction">Cancel</button>
      </div>
      <form class="mt-4 space-y-3" @submit.prevent="submitAction">
        <label class="block text-xs font-semibold text-slate-700">Reason <span class="text-rose-700">*</span>
          <textarea v-model.trim="actionReason" required maxlength="500" rows="3" class="mt-1.5 block w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" placeholder="Explain why this administrative action is required."></textarea>
        </label>
        <button type="submit" :disabled="busyUserId === selectedAction.user.user_id || !actionReason" class="btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50">
          {{ busyUserId === selectedAction.user.user_id ? 'Processing…' : actionSubmitLabel }}
        </button>
      </form>
    </div>

    <div v-if="selectedHistoryUser" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 class="font-bold text-slate-900">Account history: {{ displayName(selectedHistoryUser) }}</h2>
          <p class="mt-1 text-xs text-slate-500">Recent append-only security events for this account.</p>
        </div>
        <button type="button" class="btn-ghost px-2 py-1 text-xs font-semibold" @click="selectedHistoryUser = null">Close history</button>
      </div>
      <div v-if="historyLoading" class="py-8 text-center text-sm text-slate-500">Loading account history…</div>
      <div v-else-if="!historyLogs.length" class="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">No account-specific audit events were found.</div>
      <div v-else class="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
        <div v-for="log in historyLogs" :key="log.audit_id" class="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p class="font-semibold text-slate-900">{{ displayAuditAction(log) }}</p>
            <p class="mt-1 text-xs text-slate-500">{{ formatDate(log.created_at) }} · {{ log.user_account?.email || 'System' }}</p>
            <p v-if="log.metadata?.reason" class="mt-2 text-xs text-slate-700">Reason: {{ log.metadata.reason }}</p>
          </div>
          <span :class="log.status_code >= 400 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'" class="self-start rounded-full px-2 py-1 text-[11px] font-semibold">{{ log.status_code }}</span>
        </div>
      </div>
    </div>

    <div v-if="selectedUser" class="rounded-xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 class="font-bold text-rose-950">Disable {{ displayName(selectedUser) }}?</h2>
          <p class="mt-1 text-sm text-rose-800">All active sessions will be revoked immediately. The account and its records will remain in the system.</p>
        </div>
        <button type="button" class="btn-ghost px-2 py-1 text-xs font-semibold" @click="selectedUser = null">Cancel</button>
      </div>
      <form class="mt-4 space-y-3" @submit.prevent="disableAccount">
        <label class="block text-xs font-semibold text-slate-700">Reason for disabling <span class="text-rose-700">*</span>
          <textarea v-model.trim="disableReason" required maxlength="500" rows="3" class="mt-1.5 block w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-normal focus:border-rose-500 focus:outline-none" placeholder="Explain why this account is being disabled."></textarea>
        </label>
        <button type="submit" :disabled="busyUserId === selectedUser.user_id || !disableReason" class="btn-danger px-4 py-2 text-sm font-semibold disabled:opacity-50">
          {{ busyUserId === selectedUser.user_id ? 'Disabling…' : 'Confirm disable' }}
        </button>
      </form>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-end">
        <label class="flex-1 text-xs font-semibold text-slate-700">Search accounts
          <input v-model.trim="search" type="search" placeholder="Search by name or email" class="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" />
        </label>
        <label class="text-xs font-semibold text-slate-700">Role
          <select v-model="roleFilter" class="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none">
            <option value="all">All roles</option>
            <option value="student">Students</option>
            <option value="teacher">Teachers</option>
            <option value="guardian">Guardians</option>
            <option value="administrator">Administrators</option>
          </select>
        </label>
        <label class="text-xs font-semibold text-slate-700">Status
          <select v-model="statusFilter" class="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none">
            <option value="all">All statuses</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>
      </div>

      <div v-if="loading" class="py-10 text-center text-sm text-slate-500">Loading accounts…</div>
      <div v-else-if="!filteredUsers.length" class="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">No accounts match the selected filters.</div>
      <div v-else class="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <article v-for="user in filteredUsers" :key="user.user_id" class="rounded-lg border border-slate-200 p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="truncate font-semibold text-slate-900">{{ displayName(user) }}</h2>
              <p class="mt-1 break-all text-xs text-slate-500">{{ user.email }}</p>
            </div>
            <span :class="user.disabled_at ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'" class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold">{{ user.disabled_at ? 'Disabled' : 'Enabled' }}</span>
          </div>
          <dl class="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div><dt class="text-slate-500">Role</dt><dd class="mt-0.5 capitalize text-slate-800">{{ user.role }}</dd></div>
            <div><dt class="text-slate-500">Created</dt><dd class="mt-0.5 text-slate-800">{{ formatDate(user.created_at) }}</dd></div>
            <div><dt class="text-slate-500">Last login</dt><dd class="mt-0.5 text-slate-800">{{ formatDate(user.last_login) }}</dd></div>
            <div><dt class="text-slate-500">Account ID</dt><dd class="mt-0.5 truncate text-slate-800" :title="user.user_id">{{ user.user_id.slice(0, 8) }}…</dd></div>
          </dl>
          <p v-if="user.disabled_at" class="mt-3 text-xs text-rose-700">Disabled on {{ formatDate(user.disabled_at) }}. Enable it to allow a new login.</p>
          <div class="mt-4 flex flex-wrap items-center gap-2">
            <button v-if="user.disabled_at" type="button" :disabled="busyUserId === user.user_id" class="btn-primary px-3 py-2 text-xs font-semibold disabled:opacity-50" @click="enableAccount(user)">{{ busyUserId === user.user_id ? 'Enabling…' : 'Enable account' }}</button>
            <button v-else type="button" :disabled="!canDisable(user) || busyUserId === user.user_id" class="btn-danger px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50" @click="openDisable(user)">Disable account</button>
            <button type="button" :disabled="!canManageTarget(user) || busyUserId === user.user_id" class="btn-secondary px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50" @click="openAction(user, 'logout')">Force logout</button>
            <button type="button" :disabled="!canManageTarget(user) || busyUserId === user.user_id" class="btn-secondary px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50" @click="openAction(user, 'reset')">Reset password</button>
            <button type="button" class="btn-ghost px-3 py-2 text-xs font-semibold" @click="loadHistory(user)">View history</button>
          </div>
          <p v-if="user.user_id === currentUserId" class="mt-2 text-xs text-slate-500">Your own account cannot be force-logged out or reset here.</p>
          <p v-else-if="!canDisable(user) && !user.disabled_at" class="mt-2 text-xs text-slate-500">Keep one active administrator available.</p>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { authStore } from '../store/auth.js'
import { fetchAuditLogs, fetchUsers, forceLogoutUser, resetUserPassword, updateUserStatus } from '../api.js'

const users = ref([])
const loading = ref(true)
const busyUserId = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const temporaryPassword = ref('')
const search = ref('')
const roleFilter = ref('all')
const statusFilter = ref('all')
const selectedUser = ref(null)
const disableReason = ref('')
const selectedAction = ref(null)
const actionReason = ref('')
const selectedHistoryUser = ref(null)
const historyLogs = ref([])
const historyLoading = ref(false)
const token = () => authStore.token.value
const currentUserId = computed(() => authStore.user.value?.user_id || '')

const enabledCount = computed(() => users.value.filter((user) => !user.disabled_at).length)
const disabledCount = computed(() => users.value.filter((user) => Boolean(user.disabled_at)).length)
const activeAdministratorCount = computed(() => users.value.filter((user) => user.role === 'administrator' && !user.disabled_at).length)
const filteredUsers = computed(() => {
  const query = search.value.toLowerCase()
  return users.value.filter((user) => {
    const name = displayName(user).toLowerCase()
    const matchesSearch = !query || name.includes(query) || user.email.toLowerCase().includes(query)
    const matchesRole = roleFilter.value === 'all' || user.role === roleFilter.value
    const matchesStatus = statusFilter.value === 'all' || (statusFilter.value === 'disabled' ? Boolean(user.disabled_at) : !user.disabled_at)
    return matchesSearch && matchesRole && matchesStatus
  })
})
const actionTitle = computed(() => selectedAction.value?.type === 'logout' ? 'Force logout' : 'Reset password')
const actionDescription = computed(() => selectedAction.value?.type === 'logout'
  ? 'All active sessions will be revoked, but the account will remain enabled.'
  : 'A temporary password will be generated, all active sessions will be revoked, and the user should change the password after signing in.')
const actionSubmitLabel = computed(() => selectedAction.value?.type === 'logout' ? 'Revoke all sessions' : 'Generate temporary password')

function displayName(user) {
  return user.student?.full_name || user.teacher?.full_name || user.guardian?.full_name || user.administrator?.full_name || user.email
}
function formatDate(value) { return value ? new Date(value).toLocaleString() : 'Not recorded' }
function canDisable(user) { return user.user_id !== currentUserId.value && (user.role !== 'administrator' || activeAdministratorCount.value > 1) }
function canManageTarget(user) { return user.user_id !== currentUserId.value }
function openDisable(user) { if (!canDisable(user)) return; selectedUser.value = user; disableReason.value = ''; clearMessages() }
function openAction(user, type) { if (!canManageTarget(user)) return; selectedAction.value = { user, type }; actionReason.value = ''; temporaryPassword.value = ''; clearMessages() }
function closeAction() { selectedAction.value = null; actionReason.value = '' }
function clearMessages() { errorMessage.value = ''; successMessage.value = '' }
function displayAuditAction(log) { return String(log.action || 'Event').replace(/^[A-Z]+\s+/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }

async function loadUsers() {
  loading.value = true
  errorMessage.value = ''
  const result = await fetchUsers(token())
  if (!result.ok) errorMessage.value = result.error || 'Unable to load accounts.'
  else users.value = result.data || []
  loading.value = false
}

async function saveStatus(user, body, message) {
  busyUserId.value = user.user_id
  clearMessages()
  temporaryPassword.value = ''
  const result = await updateUserStatus(token(), user.user_id, body)
  if (!result.ok) errorMessage.value = result.error || 'Unable to update account status.'
  else {
    const index = users.value.findIndex((entry) => entry.user_id === user.user_id)
    if (index >= 0) users.value[index] = { ...users.value[index], ...(result.data || {}) }
    successMessage.value = message
  }
  busyUserId.value = ''
  return result.ok
}

async function disableAccount() {
  if (!selectedUser.value || !disableReason.value) return
  const user = selectedUser.value
  const saved = await saveStatus(user, { enabled: false, reason: disableReason.value }, `${displayName(user)} has been disabled and active sessions were revoked.`)
  if (saved) { selectedUser.value = null; disableReason.value = '' }
}

async function enableAccount(user) {
  if (!window.confirm(`Enable ${displayName(user)} and allow a new login?`)) return
  await saveStatus(user, { enabled: true }, `${displayName(user)} has been enabled.`)
}

async function submitAction() {
  if (!selectedAction.value || !actionReason.value) return
  const { user, type } = selectedAction.value
  busyUserId.value = user.user_id
  clearMessages()
  temporaryPassword.value = ''
  const result = type === 'logout'
    ? await forceLogoutUser(token(), user.user_id, { reason: actionReason.value })
    : await resetUserPassword(token(), user.user_id, { reason: actionReason.value })
  if (!result.ok) {
    errorMessage.value = result.error || 'Unable to complete the administrative account action.'
  } else {
    successMessage.value = result.data?.message || 'Administrative account action completed.'
    temporaryPassword.value = result.data?.temporary_password || ''
    selectedAction.value = null
    actionReason.value = ''
  }
  busyUserId.value = ''
}

async function loadHistory(user) {
  selectedHistoryUser.value = user
  historyLogs.value = []
  historyLoading.value = true
  const result = await fetchAuditLogs(token(), { limit: 50, resource_type: 'user_account', resource_id: user.user_id })
  if (!result.ok) errorMessage.value = result.error || 'Unable to load account history.'
  else historyLogs.value = result.data || []
  historyLoading.value = false
}

onMounted(loadUsers)
</script>
