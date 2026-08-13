<template>
  <div class="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 relative font-sans">
    <div class="w-full max-w-md bg-white rounded-xl shadow-lg border border-border-subtle p-8 z-10">
      <div class="flex flex-col items-center mb-6">
        <div class="w-16 h-16 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-primary-container mb-3 shadow-xs">
          <span class="material-symbols-outlined text-3xl">school</span>
        </div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Institutional Sign In</h1>
        <p class="text-xs text-slate-500 font-geist mt-1">Use your institutional account to access your portal.</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 font-geist mb-1">Email Address</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">mail</span>
            <input v-model.trim="email" type="email" required autocomplete="username" :aria-invalid="Boolean(fieldErrors.email)" aria-describedby="email-error" class="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-eight focus:outline-none focus:ring-2 focus:ring-primary-container focus:bg-white transition-all font-sans" placeholder="you@example.edu" />
          </div>
          <p v-if="fieldErrors.email" id="email-error" class="mt-1 text-xs text-red-600">{{ fieldErrors.email }}</p>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-xs font-semibold text-slate-700 font-geist">Password</label>
            <span class="text-xs text-slate-400">Contact an administrator for help</span>
          </div>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">lock</span>
            <input v-model="password" :type="showPassword ? 'text' : 'password'" required autocomplete="current-password" :aria-invalid="Boolean(fieldErrors.password)" aria-describedby="password-error" class="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-eight focus:outline-none focus:ring-2 focus:ring-primary-container focus:bg-white transition-all font-sans" placeholder="Your password" />
            <button type="button" @click="showPassword = !showPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <span class="material-symbols-outlined text-lg">{{ showPassword ? 'visibility' : 'visibility_off' }}</span>
            </button>
          </div>
          <p v-if="fieldErrors.password" id="password-error" class="mt-1 text-xs text-red-600">{{ fieldErrors.password }}</p>
        </div>

        <p v-if="errorMessage" class="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">{{ errorMessage }}</p>

        <button type="submit" :disabled="isSubmitting" class="w-full py-3 px-4 bg-primary-container hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-eight shadow-sm transition-all hover:shadow-md font-geist">
          {{ isSubmitting ? 'Signing in…' : 'Sign In' }}
        </button>
      </form>

      <div class="mt-6 pt-4 border-t border-slate-200 text-center">
        <p class="text-xs text-slate-500 font-geist">
          Need an account?
          <router-link to="/signup" class="text-primary-container font-semibold hover:underline ml-1">Create Account</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authStore } from '../store/auth'
import { email as validateEmail, firstError, password as validatePassword, required, validate } from '../lib/validation.js'

const router = useRouter()
const route = useRoute()
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const fieldErrors = reactive({ email: '', password: '' })

const homeForRole = (role) => {
  if (role === 'student') return '/student-portal'
  if (role === 'guardian') return '/profile'
  if (role === 'administrator') return '/admin-dashboard'
  return '/dashboard'
}

const handleLogin = async () => {
  errorMessage.value = ''
  Object.assign(fieldErrors, validate({ email: email.value, password: password.value }, {
    email: [(value) => required(value, 'Email'), validateEmail],
    password: [(value) => required(value, 'Password'), validatePassword],
  }))
  if (firstError(fieldErrors)) return
  isSubmitting.value = true
  try {
    const user = await authStore.login(email.value, password.value)
    const redirectPath = route.query.redirect || homeForRole(user.role)
    router.push(redirectPath)
  } catch (error) {
    errorMessage.value = error.message || 'Unable to sign in. Check your credentials and try again.'
  } finally {
    isSubmitting.value = false
  }
}
</script>
