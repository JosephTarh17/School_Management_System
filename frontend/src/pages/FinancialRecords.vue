<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 class="text-2xl font-bold tracking-tight text-slate-900">Financial Records & Billing Ledgers</h1><p class="mt-1 text-xs text-slate-500 font-geist">Manage database-backed invoices, manual payments, and XAF balances.</p></div>
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
    <div class="rounded-xl border border-border-subtle bg-white p-6 shadow-xs"><div class="mb-4"><h2 class="text-base font-bold text-slate-900">University class fee settings</h2><p class="mt-1 text-xs text-slate-500">Set one fixed XAF fee and maximum credits for each class. Course registration billing is intentionally deferred.</p></div><div class="grid gap-4 md:grid-cols-3"><div v-for="setting in feeSettings" :key="setting.class_level" class="rounded-lg border border-slate-200 p-4"><h3 class="font-bold text-slate-900">{{ setting.class_level }}</h3><label class="mt-3 block text-xs font-semibold text-slate-700">Fixed fee (XAF)<input v-model="setting.fee_xaf" type="number" min="0" step="0.01" class="mt-1.5 block w-full rounded-md border px-3 py-2 text-sm" /></label><label class="mt-3 block text-xs font-semibold text-slate-700">Maximum credits<input v-model="setting.max_credits" type="number" min="0" step="1" class="mt-1.5 block w-full rounded-md border px-3 py-2 text-sm" /></label><button type="button" @click="saveFeeSetting(setting)" :disabled="feeSaving === setting.class_level" class="mt-3 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{{ feeSaving === setting.class_level ? 'Saving…' : 'Save class settings' }}</button></div></div></div>
    <div class="rounded-xl border border-border-subtle bg-white p-6 shadow-xs">
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 class="text-base font-bold text-slate-900 font-sans">Billing records</h2><p class="mt-1 text-xs text-slate-500">Edit balances, record offline payments, or remove an invoice after confirming the action.</p></div><button type="button" :disabled="loading" @click="loadRecords" class="rounded-eight bg-primary-container px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{{ loading ? 'Refreshing…' : 'Refresh records' }}</button></div>
      <div v-if="loading" class="py-10 text-center text-sm text-slate-500">Loading financial records…</div>
      <div v-else-if="!transactions.length" class="py-10 text-center text-sm text-slate-500">No financial records are available.</div>
      <div v-else class="overflow-x-auto"><table class="w-full min-w-[980px] text-left text-xs font-geist"><thead><tr class="border-b border-slate-200 bg-slate-50 text-slate-500"><th class="px-4 py-3 font-semibold">Invoice</th><th class="px-4 py-3 font-semibold">Student</th><th class="px-4 py-3 font-semibold">Amount due (XAF)</th><th class="px-4 py-3 font-semibold">Paid (XAF)</th><th class="px-4 py-3 font-semibold">Balance (XAF)</th><th class="px-4 py-3 font-semibold">Status</th><th class="px-4 py-3 font-semibold">Actions</th></tr></thead><tbody class="divide-y divide-slate-100 text-slate-700"><tr v-for="record in transactions" :key="record.invoice_id" class="hover:bg-slate-50/80"><td class="px-4 py-3.5 font-bold text-slate-900">{{ record.invoice_id }}</td><td class="px-4 py-3.5 font-medium text-slate-900">{{ record.student?.full_name || record.student_id }}</td><td class="px-4 py-3.5 font-semibold text-slate-900">{{ formatCurrency(record.amount_due) }}</td><td class="px-4 py-3.5">{{ formatCurrency(record.amount_paid) }}</td><td class="px-4 py-3.5">{{ formatCurrency(record.balance_due ?? Math.max(Number(record.amount_due || 0) - Number(record.amount_paid || 0), 0)) }}</td><td class="px-4 py-3.5"><Badge :type="record.payment_status === 'Paid' ? 'present' : 'warning'" :text="record.payment_status" /></td><td class="px-4 py-3.5"><div class="flex flex-wrap gap-2"><button type="button" @click="openPayment(record)" class="rounded border border-emerald-200 px-2.5 py-1.5 font-semibold text-emerald-700 hover:bg-emerald-50">Record payment</button><button type="button" @click="openEdit(record)" class="rounded border border-blue-200 px-2.5 py-1.5 font-semibold text-blue-700 hover:bg-blue-50">Edit</button><button type="button" :disabled="deletingId === record.invoice_id" @click="deleteRecord(record)" class="rounded border border-rose-200 px-2.5 py-1.5 font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">{{ deletingId === record.invoice_id ? 'Deleting…' : 'Delete' }}</button></div></td></tr></tbody></table></div>
    </div>
    <div v-if="editingId" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-financial-title"><form class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" @submit.prevent="saveEdit"><div class="flex items-start justify-between"><div><h2 id="edit-financial-title" class="text-lg font-bold text-slate-900">Edit financial record</h2><p class="mt-1 text-xs text-slate-500">{{ editingRecord?.invoice_id }}</p></div><button type="button" @click="closeEdit" class="text-slate-400 hover:text-slate-700" aria-label="Close edit form">✕</button></div><div class="mt-5 grid gap-4 sm:grid-cols-2"><label class="text-xs font-semibold text-slate-700">Amount due (XAF)<input v-model="form.amount_due" type="number" min="0" step="0.01" class="mt-1.5 block w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none" :aria-invalid="Boolean(formErrors.amount_due)" /></label><label class="text-xs font-semibold text-slate-700">Amount paid (XAF)<input v-model="form.amount_paid" type="number" min="0" step="0.01" class="mt-1.5 block w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-normal focus:border-blue-500 focus:outline-none" :aria-invalid="Boolean(formErrors.amount_paid)" /></label><label class="text-xs font-semibold text-slate-700">Payment status<select v-model="form.payment_status" class="mt-1.5 block w-full rounded-md border px-3 py-2 text-sm"><option v-for="status in paymentStatuses" :key="status" :value="status">{{ status }}</option></select></label><label class="text-xs font-semibold text-slate-700">Due date<input v-model="form.due_date" type="date" class="mt-1.5 block w-full rounded-md border px-3 py-2 text-sm" /></label></div><p v-if="formError" class="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{{ formError }}</p><div class="mt-6 flex justify-end gap-3"><button type="button" @click="closeEdit" class="rounded-eight border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700">Cancel</button><button type="submit" :disabled="saving" class="rounded-eight bg-primary-container px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{{ saving ? 'Saving…' : 'Save changes' }}</button></div></form></div>
    <div v-if="paymentInvoice" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="manual-payment-title"><form class="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl" @submit.prevent="saveManualPayment"><div class="flex items-start justify-between"><div><h2 id="manual-payment-title" class="text-lg font-bold text-slate-900">Record manual payment</h2><p class="mt-1 text-xs text-slate-500">{{ paymentInvoice.invoice_id }} · Balance {{ formatCurrency(paymentBalance) }}</p></div><button type="button" @click="closePayment" class="text-slate-400 hover:text-slate-700" aria-label="Close payment form">✕</button></div><div class="mt-5 grid gap-4 sm:grid-cols-2"><label class="text-xs font-semibold text-slate-700">Amount (XAF)<input v-model="paymentForm.amount" type="number" min="0.01" :max="paymentBalance" step="0.01" required class="mt-1.5 block w-full rounded-md border px-3 py-2 text-sm" /></label><label class="text-xs font-semibold text-slate-700">Payment method<select v-model="paymentForm.payment_method" class="mt-1.5 block w-full rounded-md border bg-white px-3 py-2 text-sm"><option v-for="method in paymentMethods" :key="method" :value="method">{{ method }}</option></select></label><label class="text-xs font-semibold text-slate-700">Receipt number<input v-model.trim="paymentForm.receipt_number" required maxlength="80" placeholder="RCT-2026-0001" class="mt-1.5 block w-full rounded-md border px-3 py-2 text-sm" /></label><label class="text-xs font-semibold text-slate-700">Payment reference<input v-model.trim="paymentForm.payment_reference" maxlength="120" placeholder="Optional bank or manual reference" class="mt-1.5 block w-full rounded-md border px-3 py-2 text-sm" /></label><label class="text-xs font-semibold text-slate-700 sm:col-span-2">Paid at<input v-model="paymentForm.paid_at" type="datetime-local" required class="mt-1.5 block w-full rounded-md border px-3 py-2 text-sm" /></label><label class="text-xs font-semibold text-slate-700 sm:col-span-2">Notes<textarea v-model.trim="paymentForm.notes" maxlength="500" rows="2" class="mt-1.5 block w-full rounded-md border px-3 py-2 text-sm"></textarea></label></div><div v-if="paymentHistory.length" class="mt-5 rounded-lg bg-slate-50 p-3"><h3 class="text-xs font-bold uppercase tracking-wide text-slate-600">Payment history</h3><div v-for="payment in paymentHistory" :key="payment.payment_id" class="flex items-center justify-between border-b py-2 text-xs last:border-0"><span>{{ payment.receipt_number }} · {{ payment.payment_method }}</span><strong>{{ formatCurrency(payment.amount) }}</strong></div></div><p v-if="paymentError" class="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ paymentError }}</p><div class="mt-6 flex justify-end gap-3"><button type="button" @click="closePayment" class="rounded-eight border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700">Cancel</button><button type="submit" :disabled="paymentSaving || paymentBalance <= 0" class="rounded-eight bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{{ paymentSaving ? 'Saving…' : 'Save manual payment' }}</button></div></form></div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import StatCard from '../components/StatCard.vue'
import Badge from '../components/Badge.vue'
import { authStore } from '../store/auth.js'
import { deleteFinancialRecord, fetchClassFeeSettings, fetchFinancialRecords, fetchPaymentRecords, recordManualPayment, updateClassFeeSetting, updateFinancialRecord } from '../api.js'
import { numberRange } from '../lib/validation.js'
import { formatXaf } from '../lib/formatters.js'

const paymentStatuses = ['Pending', 'Partial', 'Paid', 'Overdue', 'Waived']
const paymentMethods = ['Cash', 'Bank transfer', 'Mobile money - manual', 'Other']
const transactions = ref([])
const feeSettings = ref([])
const feeSaving = ref('')
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
const paymentInvoice = ref(null)
const paymentHistory = ref([])
const paymentSaving = ref(false)
const paymentError = ref('')
const paymentForm = reactive({ amount: '', payment_method: 'Cash', receipt_number: '', payment_reference: '', paid_at: new Date().toISOString().slice(0, 16), notes: '' })

const totalPaid = computed(() => transactions.value.reduce((sum, record) => sum + Number(record.amount_paid || 0), 0))
const outstanding = computed(() => transactions.value.reduce((sum, record) => sum + Math.max(Number(record.amount_due || 0) - Number(record.amount_paid || 0), 0), 0))
const processedPayments = computed(() => transactions.value.filter((record) => Number(record.amount_paid || 0) > 0).length)
const paymentBalance = computed(() => paymentInvoice.value ? Math.max(Number(paymentInvoice.value.amount_due || 0) - Number(paymentInvoice.value.amount_paid || 0), 0) : 0)

function formatCurrency(value) { return formatXaf(value) }

async function loadRecords() {
  loading.value = true; errorMessage.value = ''
  const [result, settingsResult] = await Promise.all([fetchFinancialRecords(authStore.token.value), fetchClassFeeSettings(authStore.token.value)])
  if (!result.ok) errorMessage.value = result.error || 'Unable to load financial records.'
  else transactions.value = result.data || []
  if (settingsResult.ok) feeSettings.value = settingsResult.data || []
  loading.value = false
}

async function saveFeeSetting(setting) {
  const fee = Number(setting.fee_xaf)
  const credits = Number(setting.max_credits)
  if (!Number.isFinite(fee) || fee < 0 || !Number.isInteger(credits) || credits < 0) { errorMessage.value = 'Fee must be a non-negative XAF amount and credits must be a non-negative whole number.'; return }
  feeSaving.value = setting.class_level
  const result = await updateClassFeeSetting(authStore.token.value, setting.class_level, { fee_xaf: fee, max_credits: credits })
  if (!result.ok) errorMessage.value = result.error || 'Unable to save class settings.'
  else { Object.assign(setting, result.data); successMessage.value = `${setting.class_level} fee settings updated.` }
  feeSaving.value = ''
}

function openEdit(record) { editingRecord.value = record; editingId.value = record.invoice_id; form.amount_due = String(record.amount_due ?? ''); form.amount_paid = String(record.amount_paid ?? ''); form.payment_status = record.payment_status || 'Pending'; form.due_date = record.due_date || ''; formError.value = ''; formErrors.amount_due = ''; formErrors.amount_paid = '' }
function closeEdit() { if (saving.value) return; editingId.value = ''; editingRecord.value = null; formError.value = '' }

async function saveEdit() {
  formError.value = ''; formErrors.amount_due = numberRange(form.amount_due, 'Amount due', { min: 0, max: 999999999 }); formErrors.amount_paid = numberRange(form.amount_paid, 'Amount paid', { min: 0, max: 999999999 })
  if (formErrors.amount_due || formErrors.amount_paid) { formError.value = formErrors.amount_due || formErrors.amount_paid; return }
  if (Number(form.amount_paid) > Number(form.amount_due)) { formError.value = 'Amount paid cannot exceed amount due.'; return }
  saving.value = true
  const result = await updateFinancialRecord(authStore.token.value, editingId.value, { amount_due: Number(form.amount_due), amount_paid: Number(form.amount_paid), payment_status: form.payment_status, due_date: form.due_date || null })
  if (!result.ok) formError.value = result.error || 'Unable to update financial record.'
  else { const index = transactions.value.findIndex((record) => record.invoice_id === editingId.value); if (index >= 0) transactions.value[index] = result.data; successMessage.value = 'Financial record updated successfully.'; closeEdit() }
  saving.value = false
}

async function openPayment(record) {
  paymentInvoice.value = record; paymentError.value = ''; paymentHistory.value = []
  const result = await fetchPaymentRecords(authStore.token.value, record.invoice_id)
  if (result.ok) paymentHistory.value = result.data || []
  else paymentError.value = result.error || 'Unable to load payment history.'
}
function closePayment() { if (paymentSaving.value) return; paymentInvoice.value = null; paymentHistory.value = []; paymentError.value = '' }

async function saveManualPayment() {
  paymentError.value = ''
  const amount = Number(paymentForm.amount)
  if (!Number.isFinite(amount) || amount <= 0 || amount > paymentBalance.value) { paymentError.value = 'Enter an amount greater than zero that does not exceed the outstanding XAF balance.'; return }
  if (!paymentForm.receipt_number) { paymentError.value = 'Receipt number is required.'; return }
  paymentSaving.value = true
  const result = await recordManualPayment(authStore.token.value, paymentInvoice.value.invoice_id, { ...paymentForm, amount })
  if (!result.ok) paymentError.value = result.error || 'Unable to record manual payment.'
  else { const index = transactions.value.findIndex((record) => record.invoice_id === paymentInvoice.value.invoice_id); if (index >= 0) transactions.value[index] = result.invoice; paymentHistory.value = [result.payment, ...paymentHistory.value]; successMessage.value = 'Manual XAF payment recorded with receipt.'; paymentForm.amount = ''; paymentForm.receipt_number = ''; paymentForm.payment_reference = ''; paymentForm.notes = ''; paymentInvoice.value = result.invoice }
  paymentSaving.value = false
}

async function deleteRecord(record) {
  if (!window.confirm(`Delete the financial record for ${record.student?.full_name || record.student_id}? This cannot be undone.`)) return
  deletingId.value = record.invoice_id; errorMessage.value = ''
  const result = await deleteFinancialRecord(authStore.token.value, record.invoice_id)
  if (!result.ok) errorMessage.value = result.error || 'Unable to delete financial record.'
  else { transactions.value = transactions.value.filter((item) => item.invoice_id !== record.invoice_id); successMessage.value = 'Financial record deleted successfully.' }
  deletingId.value = ''
}

onMounted(loadRecords)
</script>
