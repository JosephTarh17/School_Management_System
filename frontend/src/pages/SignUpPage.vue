<template>
  <div class="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 relative font-sans">
    <div class="w-full max-w-md bg-white rounded-xl shadow-lg border border-border-subtle p-8 z-10">
      <div class="flex flex-col items-center mb-6">
        <div class="w-16 h-16 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-secondary-container mb-3 shadow-xs">
          <span class="material-symbols-outlined text-3xl">person_add</span>
        </div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Create Account</h1>
        <p class="text-xs text-slate-500 font-geist mt-1">Register for the institutional portal.</p>
      </div>

      <form @submit.prevent="handleRegister" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 font-geist mb-1">Full Name</label>
          <input
            v-model="name"
            type="text"
            required
            class="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-eight focus:outline-none focus:ring-2 focus:ring-secondary-container focus:bg-white transition-all font-sans"
            placeholder="Dr. Eleanor Vance"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 font-geist mb-1">Email Address</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-eight focus:outline-none focus:ring-2 focus:ring-secondary-container focus:bg-white transition-all font-sans"
            placeholder="vance@scholastic.edu"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 font-geist mb-1">Role / Persona</label>
          <select
            v-model="role"
            class="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-eight focus:outline-none focus:ring-2 focus:ring-secondary-container focus:bg-white transition-all font-sans"
          >
            <option value="Administrator">Administrator</option>
            <option value="Teacher">Teacher / Educator</option>
            <option value="Student">Student</option>
            <option value="Parent">Parent / Guardian</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 font-geist mb-1">Password</label>
          <input
            v-model="password"
            type="password"
            required
            class="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-eight focus:outline-none focus:ring-2 focus:ring-secondary-container focus:bg-white transition-all font-sans"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          class="w-full py-3 px-4 bg-secondary-container hover:bg-teal-700 text-white text-sm font-semibold rounded-eight shadow-sm transition-all hover:shadow-md mt-2 font-geist"
        >
          Complete Registration
        </button>
      </form>

      <div class="mt-6 pt-4 border-t border-slate-200 text-center">
        <p class="text-xs text-slate-500 font-geist">
          Already registered?
          <router-link to="/login" class="text-secondary-container font-semibold hover:underline ml-1">Sign In</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const name = ref('')
const email = ref('')
const role = ref('Teacher')
const password = ref('')

const handleRegister = () => {
  router.push('/dashboard')
}
</script>
