<template>
  <div class="min-h-screen overflow-x-hidden bg-surface-bg text-slate-900 font-sans antialiased">
    <RequestLoadingOverlay />

    <template v-if="$route.meta.layout === 'clean'">
      <router-view v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </template>

    <template v-else>
      <div class="flex min-h-screen overflow-x-hidden">
        <div
          v-if="mobileMenuOpen"
          class="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
          aria-hidden="true"
          @click="mobileMenuOpen = false"
        ></div>
        <Sidebar :mobile-open="mobileMenuOpen" @close="mobileMenuOpen = false" />
        <div class="flex min-w-0 flex-1 flex-col bg-surface-bg">
          <Navbar @toggle-menu="mobileMenuOpen = !mobileMenuOpen" />
          <main class="min-w-0 flex-1 overflow-y-auto p-3 sm:p-5 md:p-8">
            <router-view v-slot="{ Component }">
              <Transition name="page" mode="out-in">
                <component :is="Component" />
              </Transition>
            </router-view>
          </main>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import Sidebar from './components/Sidebar.vue'
import Navbar from './components/Navbar.vue'
import RequestLoadingOverlay from './components/RequestLoadingOverlay.vue'
import { installLanguageTranslation, refreshLanguageTranslation } from './store/language.js'
import { useRoute } from 'vue-router'

const mobileMenuOpen = ref(false)
const route = useRoute()
installLanguageTranslation()
onMounted(() => refreshLanguageTranslation())
watch(() => route.fullPath, () => nextTick(() => refreshLanguageTranslation()))
</script>
