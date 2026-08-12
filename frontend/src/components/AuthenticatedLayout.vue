<template>
  <div class="min-h-screen bg-slate-100 text-slate-900">
    <div class="flex min-h-screen">
      <aside class="hidden w-80 flex-col border-r border-slate-200 bg-white px-6 py-8 lg:flex">
        <div class="mb-10 flex items-center gap-3">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-white">SMS</div>
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">School Management</p>
            <h1 class="text-xl font-bold text-slate-900">Admin Portal</h1>
          </div>
        </div>

        <nav class="space-y-1 text-sm font-medium text-slate-700">
          <RouterLink to="/dashboard" custom v-slot="{ navigate, href, isActive }">
            <a :href="href" @click="navigate" :class="linkClass(isActive)">Dashboard</a>
          </RouterLink>
          <RouterLink to="/attendance" custom v-slot="{ navigate, href, isActive }">
            <a :href="href" @click="navigate" :class="linkClass(isActive)">Attendance</a>
          </RouterLink>
          <RouterLink to="/courses" custom v-slot="{ navigate, href, isActive }">
            <a :href="href" @click="navigate" :class="linkClass(isActive)">Courses</a>
          </RouterLink>
          <RouterLink to="/assessments" custom v-slot="{ navigate, href, isActive }">
            <a :href="href" @click="navigate" :class="linkClass(isActive)">Assessments</a>
          </RouterLink>
          <RouterLink to="/finance" custom v-slot="{ navigate, href, isActive }">
            <a :href="href" @click="navigate" :class="linkClass(isActive)">Financials</a>
          </RouterLink>
          <RouterLink to="/profile" custom v-slot="{ navigate, href, isActive }">
            <a :href="href" @click="navigate" :class="linkClass(isActive)">Profile</a>
          </RouterLink>
          <RouterLink to="/sessions" custom v-slot="{ navigate, href, isActive }">
            <a :href="href" @click="navigate" :class="linkClass(isActive)">Class Sessions</a>
          </RouterLink>
          <RouterLink to="/participation" custom v-slot="{ navigate, href, isActive }">
            <a :href="href" @click="navigate" :class="linkClass(isActive)">Participation</a>
          </RouterLink>
        </nav>

        <div class="mt-auto rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
          <p class="font-semibold text-slate-900">Ready to manage school operations.</p>
          <p class="mt-2 text-slate-600">Use the sidebar to navigate between dashboards, attendance, courses, finance, and more.</p>
        </div>
      </aside>

      <div class="flex-1">
        <header class="border-b border-slate-200 bg-white px-6 py-4 shadow-sm lg:px-8">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm uppercase tracking-[0.18em] text-slate-500">Welcome back</p>
              <h2 class="text-2xl font-semibold text-slate-900">Manage your school in one place.</h2>
            </div>
            <div class="flex items-center gap-3">
              <div class="hidden rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-slate-600 sm:block">
                <span class="text-sm">Search</span>
              </div>
              <button class="rounded-2xl bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800">Notifications</button>
            </div>
          </div>
        </header>

        <main class="px-4 py-6 sm:px-8">
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'

const linkClass = (isActive) => [
  'block rounded-2xl px-4 py-3 transition',
  isActive
    ? 'bg-slate-100 text-sky-700 font-semibold'
    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900',
].join(' ')
</script>
