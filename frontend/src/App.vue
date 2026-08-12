<template>
  <div class="min-h-screen bg-surface-bg text-slate-900 font-sans antialiased">
    <!-- Clean layout (Auth & Landing Pages) -->
    <template v-if="$route.meta.layout === 'clean'">
      <router-view />
    </template>

    <!-- Main Workspace Layout with Sidebar & Navbar -->
    <template v-else>
      <div class="flex min-h-screen">
        <Sidebar />
        <div class="flex-1 flex flex-col min-w-0 bg-surface-bg">
          <Navbar />
          <main class="flex-1 p-6 md:p-8 overflow-y-auto">
            <router-view />
          </main>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import Sidebar from './components/Sidebar.vue'
import Navbar from './components/Navbar.vue'
</script>
