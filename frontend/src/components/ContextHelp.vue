<template>
  <aside v-if="helpVisible" class="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 shadow-sm" :aria-label="title">
    <div class="flex items-start gap-3">
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
        <span class="material-symbols-outlined text-lg" aria-hidden="true">help</span>
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">How this works</p>
            <h2 class="mt-1 text-sm font-bold text-indigo-950">{{ title }}</h2>
          </div>
          <button type="button" class="btn-ghost shrink-0 px-2 py-1 text-[11px] font-semibold text-indigo-700" :aria-expanded="expanded" @click="expanded = !expanded">
            {{ expanded ? 'Hide guidance' : 'Show guidance' }}
          </button>
        </div>
        <p class="mt-1 text-sm leading-6 text-indigo-900/80">{{ summary }}</p>
        <div v-if="expanded" class="mt-3 grid grid-cols-1 gap-3 border-t border-indigo-200/70 pt-3 sm:grid-cols-2">
          <div class="rounded-lg bg-white/70 p-3">
            <p class="text-[10px] font-bold uppercase tracking-wide text-indigo-600">What happens next?</p>
            <p class="mt-1 text-xs leading-5 text-slate-700">{{ next }}</p>
          </div>
          <div v-if="steps.length" class="rounded-lg bg-white/70 p-3">
            <p class="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Before you continue</p>
            <ol class="mt-1 list-decimal space-y-1 pl-4 text-xs leading-5 text-slate-700">
              <li v-for="step in steps" :key="step">{{ step }}</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'
import { helpPreference } from '../store/helpPreference.js'

defineProps({
  title: { type: String, required: true },
  summary: { type: String, required: true },
  next: { type: String, required: true },
  steps: { type: Array, default: () => [] },
})

const expanded = ref(true)
const helpVisible = computed(() => helpPreference.enabled.value)
</script>
