<template>
  <header class="h-16 bg-white border-b border-border-subtle px-6 flex items-center justify-between sticky top-0 z-10 shadow-xs">
    <!-- Search / Title -->
    <div class="flex items-center gap-4 flex-1 max-w-xl">
      <div class="relative w-full max-w-md">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
        <input
          type="text"
          placeholder="Search courses, grades, or schedules..."
          class="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-eight focus:outline-none focus:ring-2 focus:ring-primary-container focus:bg-white transition-all font-sans"
        />
      </div>
    </div>

    <!-- Actions & User Profile -->
    <div class="flex items-center gap-4">
      <!-- Role Badge -->
      <span v-if="currentUser" class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 font-geist">
        <span class="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
        {{ currentUser.role }} Portal
      </span>

      <!-- Notifications -->
      <button class="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full relative transition-colors">
        <span class="material-symbols-outlined text-xl">notifications</span>
        <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
      </button>

      <div class="h-6 w-px bg-slate-200"></div>

      <!-- Auth Controls -->
      <div v-if="currentUser" class="flex items-center gap-3">
        <span class="text-xs font-semibold text-slate-800 font-geist hidden md:inline-block">{{ currentUser.name }}</span>
        <button
          @click="handleLogout"
          class="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-eight border border-rose-200 font-geist transition-colors flex items-center gap-1"
        >
          <span class="material-symbols-outlined text-base">logout</span>
          Sign Out
        </button>
      </div>

      <div v-else class="flex items-center gap-2">
        <router-link to="/login" class="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-primary-container font-geist">
          Sign In
        </router-link>
        <router-link to="/signup" class="px-3 py-1.5 text-xs font-semibold text-white bg-primary-container hover:bg-primary-600 rounded-eight font-geist transition-colors shadow-xs">
          Register
        </router-link>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { authStore } from '../store/auth'

const router = useRouter()
const currentUser = computed(() => authStore.user.value)

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>
