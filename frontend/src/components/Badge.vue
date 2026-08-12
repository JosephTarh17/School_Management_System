<template>
  <span
    :class="[
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-geist tracking-wide',
      badgeClass
    ]"
  >
    <span v-if="icon" class="material-symbols-outlined text-[14px] mr-1.5">{{ icon }}</span>
    <slot>{{ text }}</slot>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'present'
  },
  text: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  }
})

const badgeClass = computed(() => {
  switch (props.type.toLowerCase()) {
    case 'present':
    case 'active':
    case 'success':
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
    case 'absent':
    case 'disruptive':
    case 'danger':
    case 'error':
      return 'bg-rose-100 text-rose-800 border border-rose-200'
    case 'late':
    case 'warning':
      return 'bg-amber-100 text-amber-800 border border-amber-200'
    case 'excused':
    case 'info':
      return 'bg-indigo-100 text-indigo-800 border border-indigo-200'
    default:
      return 'bg-slate-100 text-slate-800 border border-slate-200'
  }
})
</script>
