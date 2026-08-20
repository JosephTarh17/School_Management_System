<template>
  <ContextHelp
    v-if="moduleHelp"
    :title="moduleHelp.label"
    :summary="moduleHelp.purpose"
    :next="moduleHelp.next"
    :steps="moduleHelp.steps"
  >
    <template #boundary>
      <p class="mt-3 border-t border-indigo-100 pt-3 text-xs font-medium text-indigo-900">
        <strong>Role boundary:</strong> {{ moduleHelp.boundary }}
      </p>
    </template>
  </ContextHelp>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { authStore } from '../store/auth.js'
import ContextHelp from './ContextHelp.vue'
import { moduleHelpForRoute } from '../lib/moduleHelp.js'

const route = useRoute()
const role = computed(() => authStore.userRole.value)
const moduleHelp = computed(() => moduleHelpForRoute(route.path, role.value))
</script>
