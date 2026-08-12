<template>
  <div class="min-h-screen bg-slate-100 py-16">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div class="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <div>
          <p class="text-sm uppercase tracking-[0.3em] text-sky-600">School Management System</p>
          <h1 class="mt-6 text-5xl font-semibold tracking-tight text-slate-900">Manage attendance, grades, and finances in one place.</h1>
          <p class="mt-6 max-w-xl text-lg leading-8 text-slate-600">A powerful dashboard for administrators, teachers, and students to stay connected, track progress, and keep school operations running smoothly.</p>
          <div class="mt-10 flex flex-wrap gap-4">
            <button class="rounded-2xl bg-sky-600 px-6 py-4 text-sm font-semibold text-white transition hover:bg-sky-700">Get Started</button>
            <button class="rounded-2xl border border-slate-300 bg-white px-6 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Learn more</button>
          </div>
        </div>

        <div class="space-y-6">
          <div class="rounded-[32px] bg-white p-8 shadow-xl">
            <div class="flex items-center gap-3">
              <span class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">1</span>
              <div>
                <p class="text-sm uppercase tracking-[0.2em] text-slate-500">Attendance</p>
                <p class="mt-2 text-slate-700">Track student attendance with ease and generate reports instantly.</p>
              </div>
            </div>
          </div>
          <div class="rounded-[32px] bg-white p-8 shadow-xl">
            <div class="flex items-center gap-3">
              <span class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">2</span>
              <div>
                <p class="text-sm uppercase tracking-[0.2em] text-slate-500">Assessments</p>
                <p class="mt-2 text-slate-700">Create quizzes, assignments, and exams with structured grading workflows.</p>
              </div>
            </div>
          </div>
          <div class="rounded-[32px] bg-white p-8 shadow-xl">
            <div class="flex items-center gap-3">
              <span class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">3</span>
              <div>
                <p class="text-sm uppercase tracking-[0.2em] text-slate-500">Finance</p>
                <p class="mt-2 text-slate-700">Monitor invoices, payments, and overdue balances in one dashboard.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
