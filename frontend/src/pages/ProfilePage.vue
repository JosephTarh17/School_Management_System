<template>
  <AuthenticatedLayout>
    <section class="space-y-8">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-sm uppercase tracking-[0.18em] text-slate-500">User Profile</p>
          <h1 class="text-3xl font-semibold text-slate-900">My Account</h1>
        </div>
        <button class="inline-flex items-center rounded-2xl bg-sky-600 px-5 py-3 text-white transition hover:bg-sky-700">
          Save changes
        </button>
      </div>

      <div class="grid gap-6 lg:grid-cols-3">
        <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="flex items-center gap-4">
            <div class="flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-600 text-white text-xl font-semibold">A</div>
            <div>
              <p class="text-sm text-slate-500">Administrator</p>
              <h2 class="text-xl font-semibold text-slate-900">Aisha Gomez</h2>
            </div>
          </div>
          <div class="mt-6 space-y-3 text-sm text-slate-600">
            <p>Email: aisha.gomez@example.com</p>
            <p>Department: Student Services</p>
            <p>Role: Admin</p>
          </div>
        </div>

        <div class="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 class="text-xl font-semibold text-slate-900">Account details</h2>
          <div class="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-slate-700">Full name</label>
              <input class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900" value="Aisha Gomez" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700">Email address</label>
              <input class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900" value="aisha.gomez@example.com" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700">Phone number</label>
              <input class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900" value="(555) 123-4567" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700">Department</label>
              <input class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900" value="Student Services" />
            </div>
          </div>
        </div>
      </div>
    </section>
  </AuthenticatedLayout>
</template>

<script setup>
import AuthenticatedLayout from '../components/AuthenticatedLayout.vue'
</script>
