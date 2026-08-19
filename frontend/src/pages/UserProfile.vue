<template>
  <div class="space-y-6 max-w-4xl">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Institutional Account & Profile</h1>
      <p class="text-xs text-slate-500 font-geist mt-1">Manage personal info, security preferences, and active portal settings.</p>
    </div>

    <div class="bg-white rounded-xl border border-border-subtle p-6 shadow-xs space-y-6" v-if="currentUser">
      <div class="flex items-center gap-5 border-b border-slate-100 pb-6">
        <div :class="[
          'w-20 h-20 rounded-full font-bold text-3xl flex items-center justify-center shadow-md text-white font-geist',
          currentUser.role === 'student' ? 'bg-indigo-600' : 'bg-blue-600'
        ]">
          {{ currentUser.avatar || 'U' }}
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-bold text-slate-900 font-sans">{{ currentUser.name }}</h2>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 font-geist">
              {{ currentUser.role }}
            </span>
          </div>
          <p class="text-xs text-slate-500 font-geist mt-1">ID: {{ currentUser.id }} • {{ currentUser.department || 'Academic Department' }}</p>
          <div class="flex items-center gap-2 mt-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 font-geist">Active Session</span>
            <span v-if="currentUser.gpa" class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 font-geist">Cumulative GPA: {{ currentUser.gpa }}</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-geist">
        <div>
          <label class="block font-bold text-slate-700 mb-1">Full Name</label>
          <input type="text" :value="currentUser.name" disabled class="w-full px-3 py-2 border border-slate-200 rounded-eight bg-slate-100 font-sans text-sm text-slate-500" />
        </div>
        <div>
          <label class="block font-bold text-slate-700 mb-1">Email Address</label>
          <input v-model="email" type="email" class="w-full px-3 py-2 border border-slate-200 rounded-eight bg-slate-50 font-sans text-sm" />
        </div>
        <div>
          <label class="block font-bold text-slate-700 mb-1">Department / Specialization</label>
          <input type="text" :value="currentUser.profile?.department || 'Not provided'" disabled class="w-full px-3 py-2 border border-slate-100 rounded-eight bg-slate-100 font-sans text-sm text-slate-500" />
        </div>
        <div>
          <label class="block font-bold text-slate-700 mb-1">Institutional Status</label>
          <input type="text" :value="currentUser.role" disabled class="w-full px-3 py-2 border border-slate-200 rounded-eight bg-slate-100 font-sans text-sm text-slate-500" />
        </div>
      </div>

      <p v-if="message" class="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">{{ message }}</p>
      <p v-if="errorMessage" class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{{ errorMessage }}</p>
      <div class="pt-4 border-t border-slate-100 flex justify-end gap-3">
        <button @click="saveProfile" :disabled="saving" class="btn-primary px-4 py-2 text-white text-xs font-semibold font-geist disabled:opacity-60">
          {{ saving ? 'Saving…' : 'Save Profile Updates' }}
        </button>
      </div>
    </div>

    <div v-if="currentUser?.must_change_password || currentUser?.mfa_reset_required" class="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm" role="alert">
      <h2 class="font-bold text-amber-950">Security action required</h2>
      <p v-if="currentUser?.must_change_password" class="mt-1 text-sm text-amber-900">Change the temporary password before using the rest of the system.</p>
      <p v-if="currentUser?.mfa_reset_required" class="mt-1 text-sm text-amber-900">An administrator reset your MFA enrollment. Set up MFA again below before continuing.</p>
    </div>

    <div v-if="currentUser" class="bg-white rounded-xl border border-border-subtle p-6 shadow-xs space-y-4">
      <div>
        <h2 class="text-lg font-bold text-slate-900">Change Password</h2>
        <p class="text-xs text-slate-500 mt-1">Enter your current password before choosing a new password. All active sessions will be signed out after a successful change.</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-geist">
        <div>
          <label class="block font-bold text-slate-700 mb-1" for="current-password">Current Password</label>
          <input id="current-password" v-model="currentPassword" type="password" autocomplete="current-password" required class="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-sans text-sm" />
        </div>
        <div>
          <label class="block font-bold text-slate-700 mb-1" for="new-password">New Password</label>
          <input id="new-password" v-model="newPassword" type="password" autocomplete="new-password" minlength="8" required class="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-sans text-sm" />
        </div>
        <div>
          <label class="block font-bold text-slate-700 mb-1" for="confirm-password">Confirm New Password</label>
          <input id="confirm-password" v-model="confirmPassword" type="password" autocomplete="new-password" minlength="8" required class="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-sans text-sm" />
        </div>
      </div>
      <p v-if="passwordMessage" class="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">{{ passwordMessage }}</p>
      <p v-if="passwordError" class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{{ passwordError }}</p>
      <div class="flex justify-end">
        <button @click="changeCurrentPassword" :disabled="passwordBusy" class="btn-primary px-4 py-2 text-white text-xs font-semibold font-geist disabled:opacity-60">
          {{ passwordBusy ? 'Changing…' : 'Change Password' }}
        </button>
      </div>
    </div>

    <div v-if="currentUser?.role === 'administrator'" class="bg-white rounded-xl border border-border-subtle p-6 shadow-xs space-y-4">
      <div>
        <h2 class="text-lg font-bold text-slate-900">Administrator MFA</h2>
        <p class="text-xs text-slate-500 mt-1">Protect administrator sign-in with an authenticator application.</p>
      </div>
      <p class="text-sm" :class="mfaEnabled ? 'text-emerald-700' : 'text-amber-700'">{{ mfaEnabled ? 'MFA is enabled for this account.' : 'MFA is not enabled.' }}</p>
      <button v-if="!mfaEnabled && !provisioningUri" @click="startMfaEnrollment" :disabled="mfaBusy" class="btn-primary px-4 py-2 text-white text-xs font-semibold disabled:opacity-60">{{ mfaBusy ? 'Preparing…' : 'Set up MFA' }}</button>
      <div v-if="provisioningUri" class="space-y-3">
        <p class="text-xs text-slate-600">Add this provisioning URI to your authenticator application, then enter the generated code.</p>
        <textarea readonly :value="provisioningUri" class="w-full min-h-24 p-3 text-xs bg-slate-50 border border-slate-200 rounded-lg"></textarea>
        <div class="flex gap-2">
          <input v-model.trim="mfaCode" inputmode="numeric" maxlength="8" placeholder="Authenticator code" class="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg" />
          <button @click="confirmMfaEnrollment" :disabled="mfaBusy" class="btn-primary px-4 py-2 text-white text-xs font-semibold disabled:opacity-60">Verify</button>
        </div>
      </div>
      <div v-if="mfaEnabled" class="flex gap-2">
        <input v-model.trim="disableCode" inputmode="numeric" maxlength="8" placeholder="Current MFA code" class="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg" />
        <button @click="turnOffMfa" :disabled="mfaBusy" class="btn-danger px-4 py-2 text-xs font-semibold">Disable MFA</button>
      </div>
      <p v-if="securityMessage" class="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">{{ securityMessage }}</p>
      <p v-if="securityError" class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{{ securityError }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { changePassword, disableMfa, enrollMfa, updateCurrentUser, verifyMfaEnrollment } from '../api.js'
import { authStore } from '../store/auth'

const currentUser = computed(() => authStore.user.value)
const email = ref(currentUser.value?.email || '')
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')
const provisioningUri = ref('')
const mfaCode = ref('')
const disableCode = ref('')
const mfaEnabled = ref(Boolean(currentUser.value?.mfa_enabled))
const mfaBusy = ref(false)
const securityMessage = ref('')
const securityError = ref('')
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordBusy = ref(false)
const passwordMessage = ref('')
const passwordError = ref('')
watch(currentUser, (user) => { email.value = user?.email || ''; mfaEnabled.value = Boolean(user?.mfa_enabled) })

async function changeCurrentPassword() {
  passwordBusy.value = true
  passwordMessage.value = ''
  passwordError.value = ''
  if (newPassword.value.length < 8) passwordError.value = 'The new password must be at least 8 characters.'
  else if (newPassword.value !== confirmPassword.value) passwordError.value = 'The new password and confirmation do not match.'
  else {
    const result = await changePassword(authStore.token.value, { current_password: currentPassword.value, new_password: newPassword.value })
    if (!result.ok) passwordError.value = result.error || 'Unable to change password.'
    else {
      currentPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
      passwordMessage.value = 'Password changed successfully. You will be signed out and must sign in again.'
      window.setTimeout(() => authStore.clear(), 1200)
    }
  }
  passwordBusy.value = false
}

async function startMfaEnrollment() {
  mfaBusy.value = true
  securityMessage.value = ''
  securityError.value = ''
  const result = await enrollMfa(authStore.token.value)
  if (!result.ok) securityError.value = result.error || 'Unable to start MFA enrollment.'
  else provisioningUri.value = result.data?.provisioning_uri || ''
  mfaBusy.value = false
}

async function confirmMfaEnrollment() {
  mfaBusy.value = true
  securityMessage.value = ''
  securityError.value = ''
  const result = await verifyMfaEnrollment(authStore.token.value, mfaCode.value)
  if (!result.ok) securityError.value = result.error || 'Unable to verify MFA enrollment.'
  else {
    mfaEnabled.value = true
    provisioningUri.value = ''
    mfaCode.value = ''
    authStore.setUser({ ...currentUser.value, mfa_enabled: true, mfa_reset_required: false }, authStore.token.value)
    securityMessage.value = 'MFA has been enabled.'
  }
  mfaBusy.value = false
}

async function turnOffMfa() {
  mfaBusy.value = true
  securityMessage.value = ''
  securityError.value = ''
  const result = await disableMfa(authStore.token.value, disableCode.value)
  if (!result.ok) securityError.value = result.error || 'Unable to disable MFA.'
  else { mfaEnabled.value = false; disableCode.value = ''; securityMessage.value = 'MFA has been disabled.' }
  mfaBusy.value = false
}

async function saveProfile() {
  saving.value = true
  message.value = ''
  errorMessage.value = ''
  const result = await updateCurrentUser(authStore.token.value, { email: email.value })
  if (!result.ok) errorMessage.value = result.error || 'Unable to update profile.'
  else {
    authStore.setUser({ ...currentUser.value, ...result.data, email: result.data.email }, authStore.token.value)
    message.value = 'Profile updated successfully.'
  }
  saving.value = false
}
</script>
