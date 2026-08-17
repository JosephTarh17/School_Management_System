<template>
  <div class="bg-surface text-on-background min-h-screen overflow-x-hidden">
    <!-- Top Navigation -->
    <nav class="fixed top-0 z-50 flex min-h-16 w-full items-center justify-between border-b border-border-subtle bg-white/95 px-4 shadow-xs backdrop-blur-md sm:px-6 md:px-12">
      <router-link to="/" class="flex min-w-0 items-center gap-2.5 sm:gap-3" @click="mobileMenuOpen = false">
        <span class="material-symbols-outlined shrink-0 text-2xl text-primary-container sm:text-3xl">school</span>
        <span class="truncate text-base font-bold tracking-tight text-primary-container sm:text-lg">Institutional Excellence</span>
      </router-link>
      <LanguagePicker class="ml-auto mr-2 md:ml-0 md:mr-0" />
      <div class="hidden items-center gap-6 md:flex">
        <a class="text-sm font-medium text-slate-600 transition-colors hover:text-primary-container" href="#features">Features</a>
        <a class="text-sm font-medium text-slate-600 transition-colors hover:text-primary-container" href="#solutions">Solutions</a>
        <router-link class="text-sm font-medium text-primary-container transition-colors hover:text-primary-700" to="/login">Sign In</router-link>
        <router-link class="rounded-eight bg-primary-container px-4 py-2 text-sm font-semibold text-white shadow-xs transition-all hover:bg-blue-700" to="/signup">Join Now</router-link>
      </div>
      <button
        type="button"
        class="rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-100 md:hidden"
        :aria-expanded="mobileMenuOpen"
        aria-controls="landing-mobile-menu"
        aria-label="Toggle navigation menu"
        @click="mobileMenuOpen = !mobileMenuOpen"
      >
        <span class="material-symbols-outlined">{{ mobileMenuOpen ? 'close' : 'menu' }}</span>
      </button>
      <div v-if="mobileMenuOpen" id="landing-mobile-menu" class="absolute inset-x-0 top-full border-b border-slate-200 bg-white p-4 shadow-lg md:hidden">
        <div class="flex flex-col gap-1">
          <a class="rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" href="#features" @click="mobileMenuOpen = false">Features</a>
          <a class="rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" href="#solutions" @click="mobileMenuOpen = false">Solutions</a>
          <router-link class="rounded-lg px-3 py-3 text-sm font-semibold text-primary-container hover:bg-blue-50" to="/login" @click="mobileMenuOpen = false">Sign In</router-link>
          <router-link class="mt-2 rounded-eight bg-primary-container px-4 py-3 text-center text-sm font-semibold text-white shadow-xs hover:bg-blue-700" to="/signup" @click="mobileMenuOpen = false">Join Now</router-link>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="relative pt-28 pb-20 lg:pt-36 lg:pb-28 px-6 md:px-12 overflow-hidden flex items-center">
      <div class="container relative z-10 mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-12">
        <div class="max-w-2xl">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 mb-6">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span class="text-xs font-semibold text-blue-900 font-geist uppercase tracking-wider">Next-Gen Academic Portal</span>
          </div>
          <h1 class="mb-6 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl lg:text-5xl font-sans">
            Empowering <br />
            <span class="bg-gradient-to-r from-blue-700 to-teal-600 bg-clip-text text-transparent">Institutional Excellence</span>
          </h1>
          <p class="text-lg text-slate-600 mb-8 max-w-xl font-sans">
            A comprehensive, high-security school management system designed for administrators, teachers, and parents to streamline academic operations.
          </p>
          <div class="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <router-link to="/signup" class="flex w-full items-center justify-center gap-2 rounded-eight bg-primary-container px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 sm:w-auto">
              Get Started
              <span class="material-symbols-outlined text-base">arrow_forward</span>
            </router-link>
            <a href="#features" class="w-full rounded-eight border border-slate-200 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto">
              Explore Features
            </a>
          </div>
        </div>

        <div class="relative hidden lg:block">
          <div class="relative w-full aspect-[4/3] rounded-xl overflow-hidden shadow-2xl border border-slate-200 bg-white">
            <img
              class="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDfadIXU9eGIE4WzksBhqHpDVRJmaRl0UezCN7pdUDfIRG_9dqA3yhv14wU9_0tbK_k7CrfNAT89a3v8yJNoCub2J9kq9Nyr-Kky49v_TPkelfxnEz_pazqQufJNXBFEiaaa-gqiJLsgtqCDSSOdPXyfxd5CRirFJn1J1Xq6K9QXu7vzv1PamZaKOSJFhHWyDQicktka3-cWrTBMZ0Si-76d4Ayi99va6wLoM7Ys0BXfAWfLGYE5K3m"
              alt="Dashboard visualization"
            />
          </div>
          <div class="absolute -bottom-6 -left-6 bg-white p-4 rounded-lg shadow-lg border border-slate-200 flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <span class="material-symbols-outlined text-emerald-600">check_circle</span>
            </div>
            <div>
              <p class="text-xs font-semibold text-slate-900 font-geist">Attendance Saved</p>
              <p class="text-[11px] text-slate-500 font-geist">Real-time Sync Active</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Bento Grid Features -->
    <section class="border-t border-slate-200 bg-slate-50 px-4 py-16 sm:px-6 sm:py-20 md:px-12" id="features">
      <div class="container mx-auto max-w-7xl">
        <div class="text-center max-w-2xl mx-auto mb-16">
          <h2 class="text-3xl font-bold text-slate-900 mb-4 font-sans">A Foundation for Success</h2>
          <p class="text-slate-600">Core modules engineered for data integrity, regulatory compliance, and ease of use across all academic roles.</p>
        </div>

        <div class="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          <!-- Feature 1 -->
          <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md sm:p-8 md:col-span-2">
            <div class="w-12 h-12 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-6">
              <span class="material-symbols-outlined text-2xl">how_to_reg</span>
            </div>
            <h3 class="text-xl font-bold text-slate-900 mb-2">Streamlined Attendance</h3>
            <p class="text-slate-600 mb-6 max-w-md">Mark daily attendance with rapid-entry interfaces, secure biometric integrations, and instant parent notifications for absences.</p>
            <div class="flex flex-wrap gap-2">
              <span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">Present</span>
              <span class="px-2.5 py-1 bg-rose-50 text-rose-700 text-xs font-medium rounded-full border border-rose-200">Absent</span>
              <span class="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">Late</span>
            </div>
          </div>

          <!-- Feature 2 -->
          <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md sm:p-8">
            <div class="w-12 h-12 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center mb-6">
              <span class="material-symbols-outlined text-2xl">assignment</span>
            </div>
            <h3 class="text-xl font-bold text-slate-900 mb-2">Advanced Assessments</h3>
            <p class="text-slate-600">Complex gradebook matrices supporting weighted grading, rubrics, and direct SIS sync.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-slate-800 bg-slate-900 px-4 py-10 text-white sm:px-6 sm:py-12 md:px-12">
      <div class="container mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-blue-400 text-2xl">school</span>
          <span class="font-bold text-white tracking-tight">Institutional Excellence</span>
        </div>
        <p class="text-xs text-slate-400 font-geist">© 2026 Institutional Excellence. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import LanguagePicker from '../components/LanguagePicker.vue'

const mobileMenuOpen = ref(false)
</script>
