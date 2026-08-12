<template>
  <div class="bg-white rounded-eight p-5 border border-border-subtle shadow-sm hover:shadow-md transition-shadow">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider font-geist">{{ title }}</p>
        <h3 class="text-2xl font-bold text-slate-900 mt-1 font-sans">{{ value }}</h3>
        <p v-if="change" :class="['text-xs font-medium mt-1 font-geist', changeIsPositive ? 'text-emerald-600' : 'text-rose-600']">
          {{ changeIsPositive ? '↑' : '↓' }} {{ change }}
        </p>
      </div>
      <div v-if="icon" :class="['p-3 rounded-xl flex items-center justify-center', iconBgClass]">
        <span class="material-symbols-outlined text-2xl" :class="iconColorClass">{{ icon }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  value: { type: [String, Number], required: true },
  change: { type: String, default: '' },
  changeIsPositive: { type: Boolean, default: true },
  icon: { type: String, default: '' },
  variant: { type: String, default: 'primary' }
})

const iconBgClass = computed(() => {
  switch (props.variant) {
    case 'primary': return 'bg-blue-50'
    case 'secondary': return 'bg-teal-50'
    case 'tertiary': return 'bg-indigo-50'
    case 'amber': return 'bg-amber-50'
    case 'emerald': return 'bg-emerald-50'
    default: return 'bg-slate-100'
  }
})

const iconColorClass = computed(() => {
  switch (props.variant) {
    case 'primary': return 'text-primary-container'
    case 'secondary': return 'text-secondary-container'
    case 'tertiary': return 'text-tertiary-container'
    case 'amber': return 'text-amber-600'
    case 'emerald': return 'text-emerald-600'
    default: return 'text-slate-600'
  }
})
</script>
