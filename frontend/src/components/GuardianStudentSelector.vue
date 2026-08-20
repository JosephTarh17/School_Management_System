<template>
  <div v-if="isGuardian" class="relative min-w-0 max-w-[15rem] sm:max-w-[18rem]">
    <label class="sr-only" for="guardian-student-context">Selected student</label>
    <div class="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5">
      <span class="material-symbols-outlined shrink-0 text-base text-primary-container" aria-hidden="true">school</span>
      <select
        id="guardian-student-context"
        :value="selectedStudentId"
        :disabled="loading || !students.length"
        class="min-w-0 w-full bg-transparent text-xs font-semibold text-indigo-900 outline-none disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Select student context"
        @change="changeStudent"
      >
        <option v-if="loading" value="">Loading students…</option>
        <option v-else-if="!students.length" value="">No linked students</option>
        <option v-for="student in students" v-else :key="student.student_id" :value="student.student_id" data-no-translate="true" translate="no">
          {{ student.full_name }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { authStore } from '../store/auth.js'
import { guardianStudentContext } from '../store/guardianStudentContext.js'

const isGuardian = computed(() => authStore.userRole.value === 'guardian')
const students = guardianStudentContext.students
const selectedStudentId = guardianStudentContext.selectedStudentId
const loading = guardianStudentContext.loading
const userId = computed(() => authStore.user.value?.user_id || authStore.user.value?.id || '')

async function loadContext() {
  if (!isGuardian.value) {
    guardianStudentContext.reset()
    return
  }
  await guardianStudentContext.ensureLoaded(authStore.token.value, userId.value)
}

function changeStudent(event) {
  guardianStudentContext.selectStudent(event.target.value, userId.value)
}

watch(() => authStore.token.value, loadContext)
watch(() => authStore.userRole.value, loadContext)
onMounted(loadContext)
</script>
