<template>
  <section class="space-y-6">
    <header class="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-5 shadow-sm sm:p-7">
      <p class="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">About this portal</p>
      <div class="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Know your role and your next step</h1>
          <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">This page explains what the Scholastic Management System is designed to help you do, which modules are available to you, and which decisions remain under another role’s authority.</p>
        </div>
        <span class="w-fit rounded-full bg-primary-container px-3 py-1.5 text-xs font-bold text-white">{{ profile.label }} Portal</span>
      </div>
    </header>

    <div class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <section class="rounded-xl border border-emerald-100 bg-emerald-50/60 p-5 shadow-sm sm:p-6">
        <div class="flex items-start gap-3">
          <span class="material-symbols-outlined rounded-lg bg-emerald-600 p-2 text-white" aria-hidden="true">task_alt</span>
          <div>
            <h2 class="font-bold text-emerald-950">What you can do</h2>
            <p class="mt-1 text-sm leading-6 text-emerald-900/80">{{ profile.intro }}</p>
          </div>
        </div>
        <ul class="mt-4 space-y-2 text-sm leading-6 text-emerald-950">
          <li v-for="item in profile.can" :key="item" class="flex gap-2"><span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600"></span><span>{{ item }}</span></li>
        </ul>
      </section>

      <section class="rounded-xl border border-amber-100 bg-amber-50/60 p-5 shadow-sm sm:p-6">
        <div class="flex items-start gap-3">
          <span class="material-symbols-outlined rounded-lg bg-amber-500 p-2 text-white" aria-hidden="true">gavel</span>
          <div>
            <h2 class="font-bold text-amber-950">Authority boundaries</h2>
            <p class="mt-1 text-sm leading-6 text-amber-900/80">Some actions require review, confirmation, or publication by another role.</p>
          </div>
        </div>
        <ul class="mt-4 space-y-2 text-sm leading-6 text-amber-950">
          <li v-for="item in profile.cannot" :key="item" class="flex gap-2"><span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600"></span><span>{{ item }}</span></li>
        </ul>
      </section>
    </div>

    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Your module directory</p>
          <h2 class="mt-1 text-xl font-bold text-slate-950">Available workflows for {{ profile.label.toLowerCase() }}s</h2>
          <p class="mt-1 text-sm text-slate-500">Select a module to open it. The global question-mark icon controls the contextual guidance shown inside the module.</p>
        </div>
        <RouterLink :to="profile.home" class="btn-primary w-fit px-4 py-2 text-xs font-semibold text-white">Open my portal</RouterLink>
      </div>

      <div class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <RouterLink v-for="module in modules" :key="module.path" :to="module.path" class="group rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/60 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-container focus:ring-offset-2">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{{ module.category }}</p>
              <h3 class="mt-1 font-bold text-slate-900 group-hover:text-indigo-800">{{ module.label }}</h3>
            </div>
            <span class="material-symbols-outlined text-indigo-600" aria-hidden="true">arrow_outward</span>
          </div>
          <p class="mt-2 text-xs leading-5 text-slate-600">{{ module.purpose }}</p>
          <p class="mt-3 text-xs font-semibold text-indigo-700">What happens next: <span class="font-normal text-slate-600">{{ module.next }}</span></p>
        </RouterLink>
      </div>
    </section>

    <section class="rounded-xl border border-indigo-100 bg-indigo-50/60 p-5 shadow-sm sm:p-6">
      <div class="flex items-start gap-3">
        <span class="material-symbols-outlined rounded-lg bg-indigo-600 p-2 text-white" aria-hidden="true">help_outline</span>
        <div>
          <h2 class="font-bold text-indigo-950">How to use help</h2>
          <p class="mt-1 text-sm leading-6 text-indigo-900/80">The question-mark icon beside the language selector shows or hides contextual guidance across the platform. Each module may also let you collapse its own guidance panel. Hiding help changes only your display preference; it never changes your access or the school record.</p>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { authStore } from '../store/auth.js'
import { modulesForRole, roleProfiles } from '../lib/moduleHelp.js'

const role = computed(() => authStore.userRole.value || 'student')
const profile = computed(() => roleProfiles[role.value] || roleProfiles.student)
const modules = computed(() => modulesForRole(role.value))
</script>
