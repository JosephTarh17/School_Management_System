<template>
  <div class="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
      <h1 class="text-3xl font-semibold mb-2">Sign in</h1>
      <p class="text-slate-500 mb-6">Enter your email and password to access attendance and portal features.</p>

      <form @submit.prevent="login" class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2" for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none"
            placeholder="teacher1@example.com"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2" for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none"
            placeholder="Enter password"
          />
        </div>

        <button
          type="submit"
          class="w-full rounded-2xl bg-sky-600 px-4 py-3 text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="loading"
        >
          <span v-if="loading">Signing in...</span>
          <span v-else>Sign in</span>
        </button>
      </form>

      <p v-if="error" class="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const login = async () => {
  error.value = ''
  loading.value = true

  try {
    const res = await fetch('http://localhost:4000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value }),
    })

    const data = await res.json()
    if (!res.ok) {
      error.value = data.error || 'Login failed'
      return
    }

    window.localStorage.setItem('sms_token', data.token)
    window.location.reload()
  } catch (err) {
    error.value = 'Unable to reach backend. Is the server running?'
  } finally {
    loading.value = false
  }
}
</script>
