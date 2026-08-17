<template>
  <div class="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 relative font-sans">
    <LanguagePicker class="absolute right-4 top-4 sm:right-6 sm:top-6" />
    <div class="w-full max-w-md bg-white rounded-xl shadow-lg border border-border-subtle p-8 z-10 text-center">
      <div class="flex flex-col items-center mb-6">
        <div class="w-16 h-16 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-secondary-container mb-3 shadow-xs">
          <span class="material-symbols-outlined text-3xl">person_add</span>
        </div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Account Provisioning</h1>
        <p class="text-xs text-slate-500 font-geist mt-1">Institutional accounts are created by an administrator.</p>
      </div>

      <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left">
        <p class="text-sm font-semibold text-slate-800">Need access?</p>
        <p class="text-xs text-slate-600 mt-2 leading-relaxed">Ask your school administrator to create your account and assign the correct role. This keeps account creation, roles, and credentials under institutional control.</p>
      </div>

      <router-link to="/login" class="mt-6 inline-flex w-full justify-center py-3 px-4 bg-secondary-container hover:bg-teal-700 text-white text-sm font-semibold rounded-eight shadow-sm transition-all hover:shadow-md font-geist">Return to Sign In</router-link>
    </div>
  </div>
</template>

<script setup>
import LanguagePicker from '../components/LanguagePicker.vue'
</script>
