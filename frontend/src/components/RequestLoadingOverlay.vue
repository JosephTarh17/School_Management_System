<template>
  <Transition name="loading-fade">
    <div v-if="isVisible" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 px-6 backdrop-blur-[2px]" role="status" aria-live="polite" aria-label="Loading">
      <div class="flex min-w-[12rem] flex-col items-center gap-4 rounded-2xl border border-white/20 bg-white/95 px-8 py-7 text-center shadow-2xl">
        <div class="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" aria-hidden="true"></div>
        <div>
          <p class="text-sm font-semibold text-slate-900">Loading</p>
          <p class="mt-1 text-xs text-slate-500">Please wait while we retrieve your data.</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
import { requestLoading } from '../api.js'

const isVisible = computed(() => requestLoading.visible)
</script>
