<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Administration</p>
        <h1 class="mt-1 text-2xl font-bold text-slate-950">Account Management</h1>
        <p class="mt-1 max-w-3xl text-sm text-slate-500">Manage access without deleting academic, attendance, financial, or audit history.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn-primary px-4 py-2 text-sm font-semibold" @click="showCreateForm = !showCreateForm">
          {{ showCreateForm ? 'Close create form' : 'Create account' }}
        </button>
        <button type="button" :disabled="loading" @click="loadUsers" class="btn-secondary px-4 py-2 text-sm font-semibold disabled:opacity-50">
          {{ loading ? 'Refreshing…' : 'Refresh accounts' }}
        </button>
      </div>
    </header>

    <div v-if="showCreateForm" class="rounded-xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 class="font-bold text-indigo-950">Create a non-teaching account</h2>
          <p class="mt-1 max-w-3xl text-sm text-indigo-800">Create a Student, Guardian, or Administrator profile with a one-time temporary password. Teacher accounts remain under Staff Management.</p>
        </div>
        <span class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-700">Administrator only</span>
      </div>
      <form class="mt-4 space-y-4" @submit.prevent="createAccount">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label class="text-xs font-semibold text-slate-700">Account type
            <select v-model="accountRole" class="mt-1.5 block w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none">
              <option value="student">Student</option>
              <option value="guardian">Guardian</option>
              <option value="administrator">Administrator</option>
            </select>
          </label>
          <label class="text-xs font-semibold text-slate-700">Email <span class="text-rose-700">*</span>
            <input v-model.trim="accountForm.email" type="email" required maxlength="320" autocomplete="off" class="mt-1.5 block w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" />
          </label>
          <label class="text-xs font-semibold text-slate-700">Full name <span class="text-rose-700">*</span>
            <input v-model.trim="accountForm.full_name" type="text" required maxlength="160" autocomplete="off" class="mt-1.5 block w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" />
          </label>
        </div>
        <div v-if="accountRole === 'student'" class="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <label class="text-xs font-semibold text-slate-700">Class level
            <select v-model="accountForm.class_level" class="mt-1.5 block w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none"><option value="">Not set</option><option value="Freshman">Freshman</option><option value="Sophomore">Sophomore</option><option value="Junior">Junior</option></select>
          </label>
          <label class="text-xs font-semibold text-slate-700">Date of birth
            <input v-model="accountForm.dob" type="date" class="mt-1.5 block w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" />
          </label>
          <label class="text-xs font-semibold text-slate-700">Phone
            <input v-model.trim="accountForm.phone" type="tel" maxlength="40" class="mt-1.5 block w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" />
          </label>
          <label class="text-xs font-semibold text-slate-700">Address
            <input v-model.trim="accountForm.address" type="text" maxlength="240" class="mt-1.5 block w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" />
          </label>
        </div>
        <div v-else-if="accountRole === 'guardian'" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label class="text-xs font-semibold text-slate-700">Phone
            <input v-model.trim="accountForm.phone" type="tel" maxlength="40" class="mt-1.5 block w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" />
          </label>
          <label class="text-xs font-semibold text-slate-700">Relationship
            <input v-model.trim="accountForm.relationship" type="text" maxlength="80" placeholder="Optional" class="mt-1.5 block w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" />
          </label>
        </div>
        <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label class="text-xs font-semibold text-slate-700">Department
            <input v-model.trim="accountForm.department" type="text" maxlength="120" placeholder="Optional" class="mt-1.5 block w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" />
          </label>
          <p class="self-end rounded-lg bg-white px-3 py-2 text-xs text-slate-600">The new Administrator is active and must change the temporary password at first login.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button type="submit" :disabled="creatingAccount" class="btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50">{{ creatingAccount ? 'Creating…' : 'Create account' }}</button>
          <button type="button" class="btn-ghost px-4 py-2 text-sm font-semibold" @click="resetCreateForm">Clear form</button>
        </div>
      </form>
    </div>

    <ContextHelp title="Change access without deleting history" summary="Enable, disable, reset, or suspend an account only after checking the target user and reason. These actions affect access and sessions, but preserve academic, attendance, finance, and audit history." next="The user receives the existing security outcome, and the action is recorded in audit history. Lifecycle settings may take effect immediately or when the account lifecycle check runs." :steps="['Review the target account and role before acting.', 'Enter a clear reason for security and audit history.', 'Tell the user what they must do next after a reset or suspension.']" />

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

    <div v-if="selectedLifecycleUser" class="rounded-xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 class="font-bold text-indigo-950">Lifecycle settings: {{ displayName(selectedLifecycleUser) }}</h2>
          <p class="mt-1 text-sm text-indigo-800">Set a temporary suspension end date or an account expiration date. Leave a date empty to clear that lifecycle rule.</p>
        </div>
        <button type="button" class="btn-ghost px-2 py-1 text-xs font-semibold" @click="selectedLifecycleUser = null">Cancel</button>
      </div>
      <form class="mt-4 space-y-3" @submit.prevent="saveLifecycle">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label class="text-xs font-semibold text-slate-700">Suspension ends
            <input v-model="suspensionUntil" type="datetime-local" class="mt-1.5 block w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" />
          </label>
          <label class="text-xs font-semibold text-slate-700">Account expires
            <input v-model="accountExpiresAt" type="datetime-local" class="mt-1.5 block w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" />
          </label>
        </div>
        <label class="block text-xs font-semibold text-slate-700">Reason <span class="text-rose-700">*</span>
          <textarea v-model.trim="lifecycleReason" required maxlength="500" rows="3" class="mt-1.5 block w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" placeholder="Explain the lifecycle decision."></textarea>
        </label>
        <button type="submit" :disabled="busyUserId === selectedLifecycleUser.user_id || !lifecycleReason" class="btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50">{{ busyUserId === selectedLifecycleUser.user_id ? 'Saving…' : 'Save lifecycle settings' }}</button>
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
        <label class="text-xs font-semibold text-slate-700">Review
          <select v-model="reviewFilter" class="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none">
            <option value="all">All accounts</option>
            <option value="never_logged_in">Never logged in</option>
            <option value="failed_logins">Failed logins</option>
            <option value="temporary">Temporary lifecycle</option>
            <option value="activation">Activation required</option>
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
          <dl class="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-xs sm:grid-cols-4">
            <div><dt class="text-slate-500">Failed logins</dt><dd class="mt-0.5 font-semibold text-slate-800">{{ user.failed_login_count || 0 }}</dd></div>
            <div><dt class="text-slate-500">Last failed</dt><dd class="mt-0.5 text-slate-800">{{ formatDate(user.last_failed_login) }}</dd></div>
            <div><dt class="text-slate-500">Last IP</dt><dd class="mt-0.5 truncate text-slate-800" :title="user.last_login_ip || ''">{{ user.last_login_ip || 'Not recorded' }}</dd></div>
            <div><dt class="text-slate-500">Activation</dt><dd class="mt-0.5 text-slate-800">{{ user.must_change_password || user.mfa_reset_required ? 'Required' : 'Complete' }}</dd></div>
          </dl>
          <p v-if="user.suspension_until" class="mt-3 text-xs text-indigo-700">Temporary suspension ends {{ formatDate(user.suspension_until) }}.</p>
          <p v-if="user.account_expires_at" class="mt-1 text-xs text-amber-700">Account expiration: {{ formatDate(user.account_expires_at) }}.</p>
          <div class="mt-4 flex flex-wrap items-center gap-2">
            <button v-if="user.disabled_at" type="button" :disabled="busyUserId === user.user_id" class="btn-primary px-3 py-2 text-xs font-semibold disabled:opacity-50" @click="enableAccount(user)">{{ busyUserId === user.user_id ? 'Enabling…' : 'Enable account' }}</button>
            <button v-else type="button" :disabled="!canDisable(user) || busyUserId === user.user_id" class="btn-danger px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50" @click="openDisable(user)">Disable account</button>
            <button type="button" :disabled="!canManageTarget(user) || busyUserId === user.user_id" class="btn-secondary px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50" @click="openAction(user, 'logout')">Force logout</button>
            <button type="button" :disabled="!canManageTarget(user) || busyUserId === user.user_id" class="btn-secondary px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50" @click="openAction(user, 'reset')">Reset password</button>
            <button v-if="user.role === 'administrator'" type="button" :disabled="!canManageTarget(user) || busyUserId === user.user_id" class="btn-secondary px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50" @click="openAction(user, 'mfa')">Reset MFA</button>
            <button type="button" :disabled="!canManageTarget(user) || !canDisable(user) || busyUserId === user.user_id" class="btn-secondary px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50" @click="openLifecycle(user)">Lifecycle settings</button>
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
import { createRoleAccount, fetchAuditLogs, fetchUsers, forceLogoutUser, resetUserMfa, resetUserPassword, updateUserLifecycle, updateUserStatus } from '../api.js'

const users = ref([])
const loading = ref(true)
const busyUserId = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const temporaryPassword = ref('')
const search = ref('')
const roleFilter = ref('all')
const statusFilter = ref('all')
const reviewFilter = ref('all')
const selectedUser = ref(null)
const disableReason = ref('')
const selectedAction = ref(null)
const actionReason = ref('')
const selectedLifecycleUser = ref(null)
const lifecycleReason = ref('')
const suspensionUntil = ref('')
const accountExpiresAt = ref('')
const selectedHistoryUser = ref(null)
const historyLogs = ref([])
const historyLoading = ref(false)
const showCreateForm = ref(false)
const creatingAccount = ref(false)
const accountRole = ref('student')
const accountForm = ref({ email: '', full_name: '', class_level: '', dob: '', phone: '', address: '', relationship: '', department: '' })
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
    const matchesReview = reviewFilter.value === 'all'
      || (reviewFilter.value === 'never_logged_in' && !user.last_login)
      || (reviewFilter.value === 'failed_logins' && Number(user.failed_login_count || 0) > 0)
      || (reviewFilter.value === 'temporary' && Boolean(user.suspension_until || user.account_expires_at))
      || (reviewFilter.value === 'activation' && Boolean(user.must_change_password || user.mfa_reset_required))
    return matchesSearch && matchesRole && matchesStatus && matchesReview
  })
})
const actionTitle = computed(() => ({ logout: 'Force logout', reset: 'Reset password', mfa: 'Reset MFA' }[selectedAction.value?.type] || 'Administrative action'))
const actionDescription = computed(() => ({
  logout: 'All active sessions will be revoked, but the account will remain enabled.',
  reset: 'A temporary password will be generated, all active sessions will be revoked, and the user should change the password after signing in.',
  mfa: 'The current MFA enrollment will be cleared, all active sessions will be revoked, and the user will be required to set up MFA again.',
}[selectedAction.value?.type] || 'This action will be recorded in the security audit log.'))
const actionSubmitLabel = computed(() => ({ logout: 'Revoke all sessions', reset: 'Generate temporary password', mfa: 'Reset MFA enrollment' }[selectedAction.value?.type] || 'Continue'))

function displayName(user) {
  return user.student?.full_name || user.teacher?.full_name || user.guardian?.full_name || user.administrator?.full_name || user.email
}
function formatDate(value) { return value ? new Date(value).toLocaleString() : 'Not recorded' }
function canDisable(user) { return user.user_id !== currentUserId.value && (user.role !== 'administrator' || activeAdministratorCount.value > 1) }
function canManageTarget(user) { return user.user_id !== currentUserId.value }
function openDisable(user) { if (!canDisable(user)) return; selectedUser.value = user; disableReason.value = ''; clearMessages() }
function openAction(user, type) { if (!canManageTarget(user)) return; selectedAction.value = { user, type }; actionReason.value = ''; temporaryPassword.value = ''; clearMessages() }
function openLifecycle(user) { if (!canManageTarget(user) || !canDisable(user)) return; selectedLifecycleUser.value = user; lifecycleReason.value = ''; suspensionUntil.value = user.suspension_until ? toLocalInput(user.suspension_until) : ''; accountExpiresAt.value = user.account_expires_at ? toLocalInput(user.account_expires_at) : ''; clearMessages() }
function toLocalInput(value) { return value ? new Date(value).toISOString().slice(0, 16) : '' }
function closeAction() { selectedAction.value = null; actionReason.value = '' }
function clearMessages() { errorMessage.value = ''; successMessage.value = '' }
function resetCreateForm() {
  accountForm.value = { email: '', full_name: '', class_level: '', dob: '', phone: '', address: '', relationship: '', department: '' }
}
function accountRoleLabel(role) { return ({ student: 'Student', guardian: 'Guardian', administrator: 'Administrator' }[role] || role) }
function displayAuditAction(log) { return String(log.action || 'Event').replace(/^[A-Z]+\s+/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }

async function createAccount() {
  if (creatingAccount.value) return
  creatingAccount.value = true
  clearMessages()
  temporaryPassword.value = ''
  const form = accountForm.value
  const body = { role: accountRole.value, email: form.email, full_name: form.full_name }
  if (accountRole.value === 'student') Object.assign(body, { class_level: form.class_level, dob: form.dob, phone: form.phone, address: form.address })
  if (accountRole.value === 'guardian') Object.assign(body, { phone: form.phone, relationship: form.relationship })
  if (accountRole.value === 'administrator') Object.assign(body, { department: form.department })
  const result = await createRoleAccount(token(), body)
  if (!result.ok) {
    errorMessage.value = result.error || 'Unable to create the account.'
  } else {
    temporaryPassword.value = result.data?.temporary_password || ''
    successMessage.value = `${accountRoleLabel(accountRole.value)} account created. Share the temporary password securely and require a change at first login.`
    resetCreateForm()
    await loadUsers()
  }
  creatingAccount.value = false
}

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
    : type === 'mfa'
      ? await resetUserMfa(token(), user.user_id, { reason: actionReason.value })
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

async function saveLifecycle() {
  if (!selectedLifecycleUser.value || !lifecycleReason.value) return
  const user = selectedLifecycleUser.value
  busyUserId.value = user.user_id
  clearMessages()
  const result = await updateUserLifecycle(token(), user.user_id, {
    reason: lifecycleReason.value,
    suspension_until: suspensionUntil.value ? new Date(suspensionUntil.value).toISOString() : null,
    account_expires_at: accountExpiresAt.value ? new Date(accountExpiresAt.value).toISOString() : null,
  })
  if (!result.ok) errorMessage.value = result.error || 'Unable to update lifecycle settings.'
  else {
    const index = users.value.findIndex((entry) => entry.user_id === user.user_id)
    if (index >= 0) users.value[index] = { ...users.value[index], ...(result.data || {}) }
    successMessage.value = `${displayName(user)} lifecycle settings were updated.`
    selectedLifecycleUser.value = null
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
