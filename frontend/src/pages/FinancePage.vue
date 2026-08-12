<template>
  <AuthenticatedLayout>
    <section class="space-y-8">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-sm uppercase tracking-[0.18em] text-slate-500">Financial Records</p>
          <h1 class="text-3xl font-semibold text-slate-900">Finance</h1>
        </div>
        <button class="inline-flex items-center rounded-2xl bg-sky-600 px-5 py-3 text-white transition hover:bg-sky-700">
          New Transaction
        </button>
      </div>

      <div class="grid gap-5 lg:grid-cols-3">
        <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p class="text-sm text-slate-500">Total Collected</p>
          <p class="mt-4 text-3xl font-semibold text-slate-900">$85,420</p>
        </div>
        <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p class="text-sm text-slate-500">Pending Receivables</p>
          <p class="mt-4 text-3xl font-semibold text-slate-900">$12,300</p>
        </div>
        <div class="rounded-3xl border border-slate-200 bg-rose-50 p-6 shadow-sm">
          <p class="text-sm text-rose-700">Overdue</p>
          <p class="mt-4 text-3xl font-semibold text-rose-800">$3,750</p>
        </div>
      </div>

      <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 class="text-xl font-semibold text-slate-900">Recent Transactions</h2>
          <button class="rounded-2xl border border-slate-200 px-4 py-3 text-slate-700 hover:bg-slate-50">Filter</button>
        </div>

        <div class="mt-6 overflow-hidden rounded-3xl border border-slate-200">
          <table class="min-w-full text-left text-sm">
            <thead class="bg-slate-50 text-slate-600">
              <tr>
                <th class="px-5 py-4 font-semibold">Invoice</th>
                <th class="px-5 py-4 font-semibold">Student</th>
                <th class="px-5 py-4 font-semibold">Category</th>
                <th class="px-5 py-4 font-semibold">Amount</th>
                <th class="px-5 py-4 font-semibold">Status</th>
                <th class="px-5 py-4 font-semibold">Due</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in records" :key="record.id" class="border-t border-slate-200">
                <td class="px-5 py-4 text-slate-800">{{ record.invoice }}</td>
                <td class="px-5 py-4 text-slate-600">{{ record.student }}</td>
                <td class="px-5 py-4 text-slate-600">{{ record.category }}</td>
                <td class="px-5 py-4 font-semibold text-slate-900">${{ record.amount }}</td>
                <td class="px-5 py-4 text-slate-600">{{ record.status }}</td>
                <td class="px-5 py-4 text-slate-600">{{ record.dueDate }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </AuthenticatedLayout>
</template>

<script setup>
import AuthenticatedLayout from '../components/AuthenticatedLayout.vue'

const records = [
  { id: 1, invoice: 'INV-0012', student: 'Amina Carter', category: 'Tuition', amount: 1250, status: 'Paid', dueDate: '2026-09-12' },
  { id: 2, invoice: 'INV-0013', student: 'Noah Patel', category: 'Books', amount: 240, status: 'Pending', dueDate: '2026-09-18' },
  { id: 3, invoice: 'INV-0014', student: 'Mia Johnson', category: 'Activity Fee', amount: 110, status: 'Overdue', dueDate: '2026-09-05' },
]
</script>
