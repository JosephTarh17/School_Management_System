<template>
  <div class="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 relative font-sans">
    <div class="w-full max-w-md bg-white rounded-xl shadow-lg border border-border-subtle p-8 z-10">
      <div class="flex flex-col items-center mb-6">
        <div class="w-16 h-16 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-primary-container mb-3 shadow-xs">
          <span class="material-symbols-outlined text-3xl">school</span>
        </div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Institutional Sign In</h1>
        <p class="text-xs text-slate-500 font-geist mt-1">Sign in to access your portal modules.</p>
      </div>

      <!-- Quick Demo Sign In Button for Central Student Actor -->
      <div class="mb-6 p-4 rounded-eight bg-indigo-50 border border-indigo-200 text-center">
        <p class="text-xs font-bold text-indigo-950 font-geist mb-2">Central Actor Flow Test</p>
        <button
          type="button"
          @click="handleDemoStudent"
          class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-eight font-geist transition-all shadow-xs flex items-center justify-center gap-2"
        >
          <span class="material-symbols-outlined text-base">person</span>
          Sign In as Student (Julian Dabney)
        </button>
      </div>

      <div class="relative flex py-2 items-center mb-4">
        <div class="flex-grow border-t border-slate-200"></div>
        <span class="flex-shrink mx-3 text-[11px] text-slate-400 font-geist uppercase tracking-widest">Or enter credentials</span>
        <div class="flex-grow border-t border-slate-200"></div>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 font-geist mb-1">Email Address</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">mail</span>
            <input
              v-model="email"
              type="email"
              required
              class="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-eight focus:outline-none focus:ring-2 focus:ring-primary-container focus:bg-white transition-all font-sans"
              placeholder="julian.dabney@scholastic.edu"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 font-geist mb-1">Role / Persona</label>
          <select
            v-model="role"
            class="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-eight focus:outline-none focus:ring-2 focus:ring-primary-container focus:bg-white transition-all font-sans"
          >
            <option value="Student">Student (Julian Dabney)</option>
            <option value="Teacher">Teacher / Educator</option>
            <option value="Admin">Administrator</option>
          </select>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-xs font-semibold text-slate-700 font-geist">Password</label>
            <a href="#" class="text-xs text-primary-container font-semibold hover:underline">Forgot Password?</a>
          </div>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">lock</span>
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              class="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-eight focus:outline-none focus:ring-2 focus:ring-primary-container focus:bg-white transition-all font-sans"
              placeholder="••••••••"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <span class="material-symbols-outlined text-lg">{{ showPassword ? 'visibility' : 'visibility_off' }}</span>
            </button>
          </div>
        </div>

        <button
          type="submit"
          class="w-full py-3 px-4 bg-primary-container hover:bg-blue-700 text-white text-sm font-semibold rounded-eight shadow-sm transition-all hover:shadow-md font-geist"
        >
          Sign In
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
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authStore } from '../store/auth'

const router = useRouter()
const route = useRoute()

const email = ref('julian.dabney@scholastic.edu')
const password = ref('password123')
const role = ref('Student')
const showPassword = ref(false)

const handleDemoStudent = () => {
  authStore.loginAsStudent()
  const redirectPath = route.query.redirect || '/student-portal'
  router.push(redirectPath)
}

const handleLogin = () => {
  authStore.setUser({
    id: role.value === 'Student' ? '#ST-884920' : '#USER-101',
    name: role.value === 'Student' ? 'Julian Dabney' : 'System User',
    email: email.value,
    role: role.value,
    avatar: role.value === 'Student' ? 'JD' : 'SU'
  }, 'auth_token_2026')

  const redirectPath = route.query.redirect || (role.value === 'Student' ? '/student-portal' : '/dashboard')
  router.push(redirectPath)
}
</script>
