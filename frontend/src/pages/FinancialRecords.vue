<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Financial Records & Billing Ledgers</h1>
        <p class="mt-1 text-xs text-slate-500 font-geist">Manage database-backed invoices and payment statuses.</p>
      </div>
      <span class="text-xs text-slate-400 font-geist">Administrator access only</span>
    </div>

    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Amount Paid" :value="loading ? '…' : formatCurrency(totalPaid)" change="All loaded records" :changeIsPositive="true" icon="attach_money" variant="primary" />
      <StatCard title="Outstanding Balance" :value="loading ? '…' : formatCurrency(outstanding)" change="Amount still due" :changeIsPositive="outstanding === 0" icon="account_balance_wallet" variant="amber" />
      <StatCard title="Records With Payments" :value="loading ? '…' : String(processedPayments)" change="Amount paid greater than zero" :changeIsPositive="true" icon="credit_card" variant="emerald" />
      <StatCard title="Active Invoices" :value="loading ? '…' : String(transactions.length)" change="Database count" :changeIsPositive="true" icon="receipt_long" variant="tertiary" />
    </div>

    <div v-if="errorMessage" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{{ errorMessage }}</div>
    <div v-if="successMessage" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">{{ successMessage }}</div>

    <div class="rounded-xl border border-border-subtle bg-white p-6 shadow-xs">
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-base font-bold text-slate-900 font-sans">Billing records</h2>
          <p class="mt-1 text-xs text-slate-500">Edit balances or remove an invoice after confirming the action.</p>
        </div>
        <button type="button" :disabled="loading" @click="loadRecords" class="rounded-eight bg-primary-container px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
          {{ loading ? 'Refreshing…' : 'Refresh records' }}
        </button>
      </div>

      <div v-if="loading" class="py-10 text-center text-sm text-slate-500">Loading financial records…</div>
      <div v-else-if="!transactions.length" class="py-10 text-center text-sm text-slate-500">No financial records are available.</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[860px] text-left text-xs font-geist">
          <thead><tr class="border-b border-slate-200 bg-slate-50 text-slate-500"><th class="px-4 py-3 font-semibold">Invoice</th><th class="px-4 py-3 font-semibold">Student</th><th class="px-4 py-3 font-semibold">Amount due</th><th class="px-4 py-3 font-semibold">Amount paid</th><th class="px-4 py-3 font-semibold">Due date</th><th class="px-4 py-3 font-semibold">Status</th><th class="px-4 py-3 font-semibold">Actions</th></tr></thead>
          <tbody class="divide-y divide-slate-100 text-slate-700">
            <tr v-for="record in transactions" :key="record.invoice_id" class="hover:bg-slate-50/80">
              <td class="px-4 py-3.5 font-bold text-slate-900">{{ record.invoice_id }}</td>
              <td class="px-4 py-3.5 font-medium text-slate-900">{{ record.student?.full_name || record.student_id }}</td>
              <td class="px-4 py-3.5 font-semibold text-slate-900">{{ formatCurrency(record.amount_due) }}</td>
              <td class="px-4 py-3.5">{{ formatCurrency(record.amount_paid) }}</td>
              <td class="px-4 py-3.5 text-slate-500">{{ record.due_date || 'Not scheduled' }}</td>
              <td class="px-4 py-3.5"><Badge :type="record.payment_status === 'Paid' ? 'present' : 'warning'" :text="record.payment_status" /></td>
              <td class="px-4 py-3.5"><div class="flex gap-2"><button type="button" @click="openEdit(record)" class="rounded border border-blue-200 px-2.5 py-1.5 font-semibold text-blue-700 hover:bg-blue-50">Edit</button><button type="button" :disabled="deletingId === record.invoice_id" @click="deleteRecord(record)" class="rounded border border-rose-200 px-2.5 py-1.5 font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">{{ deletingId === record.invoice_id ? 'Deleting…' : 'Delete' }}</button></div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="editingId" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-financial-title">
      <form class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" @submit.prevent="saveEdit">
        <div class="flex items-start justify-between"><div><h2 id="edit-financial-title" class="text-lg font-bold text-slate-900">Edit financial record</h2><p class="mt-1 text-xs text-slate-500">{{ editingRecord?.invoice_id }}</p></div><button type="button" @click="closeEdit" class="text-slate-400 hover:text-slate-700" aria-label="Close edit form">✕</button></div>
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <label class="text-xs font-semibold text-slate-700">Amount due<input v-model="form.amount_due" type="number" min="0" step="0.01" class="mt-1.5 block w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none" :aria-invalid="Boolean(formErrors.amount_due)" /></label>
          <label class="text-xs font-semibold text-slate-700">Amount paid<input v-model="form.amount_paid" type="number" min="0" step="0.01" class="mt-1.5 block w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none" :aria-invalid="Boolean(formErrors.amount_paid)" /></label>
          <label class="text-xs font-semibold text-slate-700">Payment status<select v-model="form.payment_status" class="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none"><option v-for="status in paymentStatuses" :key="status" :value="status">{{ status }}</option></select></label>
          <label class="text-xs font-semibold text-slate-700">Due date<input v-model="form.due_date" type="date" class="mt-1.5 block w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none" /></label>
        </div>
        <p v-if="formError" class="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{{ formError }}</p>
        <div class="mt-6 flex justify-end gap-3"><button type="button" @click="closeEdit" class="rounded-eight border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button type="submit" :disabled="saving" class="rounded-eight bg-primary-container px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{{ saving ? 'Saving…' : 'Save changes' }}</button></div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import StatCard from '../components/StatCard.vue'
import Badge from '../components/Badge.vue'
import { authStore } from '../store/auth.js'
import { deleteFinancialRecord, fetchFinancialRecords, updateFinancialRecord } from '../api.js'
import { numberRange } from '../lib/validation.js'

const paymentStatuses = ['Pending', 'Partial', 'Paid', 'Overdue', 'Waived']
const transactions = ref([])
const loading = ref(true)
const saving = ref(false)
const deletingId = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const editingId = ref('')
const editingRecord = ref(null)
const formError = ref('')
const formErrors = reactive({ amount_due: '', amount_paid: '' })
const form = reactive({ amount_due: '', amount_paid: '', payment_status: 'Pending', due_date: '' })

const totalPaid = computed(() => transactions.value.reduce((sum, record) => sum + Number(record.amount_paid || 0), 0))
const outstanding = computed(() => transactions.value.reduce((sum, record) => sum + Math.max(Number(record.amount_due || 0) - Number(record.amount_paid || 0), 0), 0))
const processedPayments = computed(() => transactions.value.filter((record) => Number(record.amount_paid || 0) > 0).length)

function formatCurrency(value) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(value) || 0)
}

async function loadRecords() {
  loading.value = true
  errorMessage.value = ''
  const result = await fetchFinancialRecords(authStore.token.value)
  if (!result.ok) errorMessage.value = result.error || 'Unable to load financial records.'
  else transactions.value = result.data || []
  loading.value = false
}

function openEdit(record) {
  editingRecord.value = record
  editingId.value = record.invoice_id
  form.amount_due = String(record.amount_due ?? '')
  form.amount_paid = String(record.amount_paid ?? '')
  form.payment_status = record.payment_status || 'Pending'
  form.due_date = record.due_date || ''
  formError.value = ''
  formErrors.amount_due = ''
  formErrors.amount_paid = ''
}

function closeEdit() {
  if (saving.value) return
  editingId.value = ''
  editingRecord.value = null
  formError.value = ''
}

async function saveEdit() {
  formError.value = ''
  formErrors.amount_due = numberRange(form.amount_due, 'Amount due', { min: 0, max: 999999999 })
  formErrors.amount_paid = numberRange(form.amount_paid, 'Amount paid', { min: 0, max: 999999999 })
  if (formErrors.amount_due || formErrors.amount_paid) { formError.value = formErrors.amount_due || formErrors.amount_paid; return }
  if (Number(form.amount_paid) > Number(form.amount_due)) { formError.value = 'Amount paid cannot exceed amount due.'; return }
  saving.value = true
  const result = await updateFinancialRecord(authStore.token.value, editingId.value, { amount_due: Number(form.amount_due), amount_paid: Number(form.amount_paid), payment_status: form.payment_status, due_date: form.due_date || null })
  if (!result.ok) formError.value = result.error || 'Unable to update financial record.'
  else { const index = transactions.value.findIndex((record) => record.invoice_id === editingId.value); if (index >= 0) transactions.value[index] = result.data; successMessage.value = 'Financial record updated successfully.'; closeEdit() }
  saving.value = false
}

async function deleteRecord(record) {
  if (!window.confirm(`Delete the financial record for ${record.student?.full_name || record.student_id}? This cannot be undone.`)) return
  deletingId.value = record.invoice_id
  errorMessage.value = ''
  const result = await deleteFinancialRecord(authStore.token.value, record.invoice_id)
  if (!result.ok) errorMessage.value = result.error || 'Unable to delete financial record.'
  else { transactions.value = transactions.value.filter((item) => item.invoice_id !== record.invoice_id); successMessage.value = 'Financial record deleted successfully.' }
  deletingId.value = ''
}

onMounted(loadRecords)
</script>
