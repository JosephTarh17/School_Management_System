<template>
  <span :class="badgeClasses" class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold leading-5">
    <slot />
  </span>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ type: { type: String, default: 'Pending' } })

const badgeClasses = computed(() => {
  const map = {
    Present: 'bg-emerald-100 text-emerald-800',
    Absent: 'bg-rose-100 text-rose-800',
    Late: 'bg-amber-100 text-amber-800',
    Excused: 'bg-sky-100 text-sky-800',
    Active: 'bg-sky-100 text-sky-800',
    Pending: 'bg-slate-100 text-slate-700',
  }
  return map[props.type] || map.Pending
})
</script>
