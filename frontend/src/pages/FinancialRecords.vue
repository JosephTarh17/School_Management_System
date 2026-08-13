<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Financial Records & Billing Ledgers</h1>
      <p class="text-xs text-slate-500 font-geist mt-1">Tuition fee structures, payment transaction logs, and bursar balance auditing.</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <StatCard title="Total Revenue (Term)" value="$0" change="Awaiting database records" :changeIsPositive="true" icon="attach_money" variant="primary" />
      <StatCard title="Outstanding Balances" value="$0" change="Awaiting database records" :changeIsPositive="true" icon="account_balance_wallet" variant="amber" />
      <StatCard title="Processed Payments" value="0" change="Awaiting database records" :changeIsPositive="true" icon="credit_card" variant="emerald" />
      <StatCard title="Financial Aid Issued" value="$0" change="Awaiting database records" :changeIsPositive="true" icon="card_membership" variant="tertiary" />
    </div>

    <div class="bg-white rounded-xl border border-border-subtle p-6 shadow-xs">
      <h2 class="text-base font-bold text-slate-900 mb-4 font-sans">Recent Billing Transactions</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs font-geist">
          <thead>
            <tr class="bg-slate-50 text-slate-500 border-b border-slate-200">
              <th class="py-3 px-4 font-semibold">Transaction ID</th>
              <th class="py-3 px-4 font-semibold">Student Name</th>
              <th class="py-3 px-4 font-semibold">Description</th>
              <th class="py-3 px-4 font-semibold">Amount</th>
              <th class="py-3 px-4 font-semibold">Date</th>
              <th class="py-3 px-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-700">
            <tr v-if="!transactions.length"><td colspan="6" class="py-8 px-4 text-center text-slate-500">No financial records are available.</td></tr>
            <tr v-for="t in transactions" :key="t.id" class="hover:bg-slate-50/80">
              <td class="py-3.5 px-4 font-bold text-slate-900">{{ t.id }}</td>
              <td class="py-3.5 px-4 font-medium">{{ t.student }}</td>
              <td class="py-3.5 px-4">{{ t.desc }}</td>
              <td class="py-3.5 px-4 font-bold text-slate-900">${{ t.amount }}</td>
              <td class="py-3.5 px-4 text-slate-500">{{ t.date }}</td>
              <td class="py-3.5 px-4">
                <Badge :type="t.status === 'Completed' ? 'present' : 'warning'" :text="t.status" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import StatCard from '../components/StatCard.vue'
import Badge from '../components/Badge.vue'

const transactions = []
</script>
