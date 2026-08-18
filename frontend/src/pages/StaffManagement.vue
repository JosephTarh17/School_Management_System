<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Administration</p>
        <h1 class="mt-1 text-2xl font-bold text-slate-950">Staff Management</h1>
        <p class="mt-1 text-sm text-slate-500">Track teaching and non-teaching staff, daily attendance, employment status, and leave.</p>
      </div>
      <button type="button" :disabled="loading" @click="loadAll" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{{ loading ? 'Refreshing…' : 'Refresh staff' }}</button>
    </header>

    <p v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{{ errorMessage }}</p>
    <p v-if="successMessage" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{{ successMessage }}</p>

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <form class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" @submit.prevent="submitStaff">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="font-bold text-slate-900">{{ editingId ? 'Edit staff record' : 'Add staff member' }}</h2>
            <p class="mt-1 text-xs text-slate-500">Existing teachers are linked to their current teacher profile; non-teaching staff receive a separate directory record.</p>
          </div>
          <button v-if="editingId" type="button" class="text-xs font-semibold text-slate-500 hover:text-slate-900" @click="resetForm">Cancel</button>
        </div>

        <label class="block text-xs font-semibold text-slate-700">Staff type
          <select v-model="form.staff_type" :disabled="Boolean(editingId)" class="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none">
            <option value="non_teaching">Non-teaching staff</option>
            <option value="teaching">Teaching staff</option>
          </select>
        </label>

        <label v-if="form.staff_type === 'teaching'" class="block text-xs font-semibold text-slate-700">Existing teacher profile
          <select v-model="form.teacher_id" :disabled="Boolean(editingId)" required class="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none">
            <option value="">Select a teacher</option>
            <option v-for="teacher in availableTeacherOptions" :key="teacher.teacher_id" :value="teacher.teacher_id">{{ teacher.full_name }}{{ teacher.department ? ` — ${teacher.department}` : '' }}</option>
          </select>
        </label>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label class="text-xs font-semibold text-slate-700">Full name
            <input v-model.trim="form.full_name" :readonly="form.staff_type === 'teaching'" required maxlength="160" placeholder="Full name" class="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal read-only:bg-slate-50 focus:border-indigo-500 focus:outline-none" />
          </label>
          <label class="text-xs font-semibold text-slate-700">Job title
            <input v-model.trim="form.job_title" required maxlength="120" :placeholder="form.staff_type === 'teaching' ? 'Teacher' : 'Security officer'" class="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" />
          </label>
          <label class="text-xs font-semibold text-slate-700">Employee number
            <input v-model.trim="form.employee_number" maxlength="40" placeholder="Optional ID" class="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" />
          </label>
          <label class="text-xs font-semibold text-slate-700">Department
            <input v-model.trim="form.department" maxlength="120" placeholder="Department or unit" class="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" />
          </label>
          <label class="text-xs font-semibold text-slate-700">Email
            <input v-model.trim="form.email" type="email" maxlength="320" placeholder="Optional email" class="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" />
          </label>
          <label class="text-xs font-semibold text-slate-700">Phone
            <input v-model.trim="form.phone" maxlength="40" placeholder="Optional phone" class="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" />
          </label>
          <label class="text-xs font-semibold text-slate-700">Date joined
            <input v-model="form.date_joined" type="date" class="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" />
          </label>
          <label class="text-xs font-semibold text-slate-700">Date left
            <input v-model="form.date_left" type="date" class="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" />
          </label>
        </div>

        <label v-if="editingId" class="block text-xs font-semibold text-slate-700">Employment status
          <select v-model="form.employment_status" class="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none">
            <option v-for="status in employmentStatuses" :key="status" :value="status">{{ status.replace('_', ' ') }}</option>
          </select>
        </label>

        <button type="submit" :disabled="saving" class="w-full rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{{ saving ? 'Saving…' : editingId ? 'Save staff changes' : 'Add staff member' }}</button>
      </form>

      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="mb-4 flex items-center justify-between gap-3"><div><h2 class="font-bold text-slate-900">Staff directory</h2><p class="text-xs text-slate-500">{{ staff.length }} staff member{{ staff.length === 1 ? '' : 's' }} tracked</p></div><span class="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">Administrator only</span></div>
        <div v-if="loading" class="py-10 text-center text-sm text-slate-500">Loading staff directory…</div>
        <div v-else-if="!staff.length" class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">No staff records exist yet.</div>
        <div v-else class="space-y-3">
          <article v-for="member in staff" :key="member.staff_id" class="rounded-lg border border-slate-200 p-4">
            <div class="flex items-start justify-between gap-3"><div class="min-w-0"><h3 class="truncate font-semibold text-slate-900">{{ member.full_name }}</h3><p class="mt-1 break-all text-xs text-slate-500">{{ member.job_title }}{{ member.department ? ` · ${member.department}` : '' }}</p></div><span class="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold" :class="member.staff_type === 'teaching' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'">{{ member.staff_type === 'teaching' ? 'Teaching' : 'Non-teaching' }}</span></div>
            <dl class="mt-3 grid grid-cols-2 gap-2 text-xs"><div><dt class="text-slate-500">Employee number</dt><dd class="mt-0.5 text-slate-800">{{ member.employee_number || 'Not provided' }}</dd></div><div><dt class="text-slate-500">Status</dt><dd class="mt-0.5 capitalize text-slate-800">{{ member.employment_status.replace('_', ' ') }}</dd></div><div><dt class="text-slate-500">Email</dt><dd class="mt-0.5 break-all text-slate-800">{{ member.email || 'Not provided' }}</dd></div><div><dt class="text-slate-500">Joined</dt><dd class="mt-0.5 text-slate-800">{{ member.date_joined || 'Not recorded' }}</dd></div></dl>
            <div class="mt-4 flex flex-wrap gap-2"><button type="button" class="rounded-lg border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50" @click="startEdit(member)">Edit</button><button type="button" class="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50" @click="removeStaff(member)">Delete</button></div>
          </article>
        </div>
      </div>
    </div>

    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 class="font-bold text-slate-900">Staff attendance</h2><p class="mt-1 text-xs text-slate-500">Record one status per staff member and date.</p></div><label class="text-xs font-semibold text-slate-700">Attendance date<input v-model="attendanceDate" type="date" class="mt-1.5 block rounded-lg border px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" /></label></div>
      <div v-if="attendanceLoading" class="py-8 text-center text-sm text-slate-500">Loading staff attendance…</div>
      <div v-else-if="!attendanceRows.length" class="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">Add staff members before recording attendance.</div>
      <div v-else class="mt-4 overflow-x-auto"><table class="min-w-full text-left text-xs"><thead class="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500"><tr><th class="px-3 py-3">Staff member</th><th class="px-3 py-3">Type</th><th class="px-3 py-3">Status</th><th class="px-3 py-3">Notes</th><th class="px-3 py-3">Action</th></tr></thead><tbody class="divide-y divide-slate-100"><tr v-for="row in attendanceRows" :key="row.staff_id"><td class="px-3 py-3 font-semibold text-slate-800">{{ row.full_name }}<span class="block font-normal text-slate-500">{{ row.job_title }}</span></td><td class="px-3 py-3 text-slate-600">{{ row.staff_type === 'teaching' ? 'Teaching' : 'Non-teaching' }}</td><td class="px-3 py-3"><select v-model="row.attendanceStatus" class="rounded-lg border px-2 py-2 text-xs focus:border-indigo-500 focus:outline-none"><option v-for="status in attendanceStatuses" :key="status" :value="status">{{ status }}</option></select></td><td class="px-3 py-3"><input v-model.trim="row.attendanceNotes" maxlength="1000" placeholder="Optional note" class="min-w-44 rounded-lg border px-2 py-2 text-xs focus:border-indigo-500 focus:outline-none" /></td><td class="px-3 py-3"><button type="button" :disabled="row.saving" class="rounded-lg bg-indigo-600 px-3 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50" @click="saveAttendance(row)">{{ row.saving ? 'Saving…' : 'Save' }}</button></td></tr></tbody></table></div>
    </section>

    <section class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <form class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" @submit.prevent="submitLeave">
        <div><h2 class="font-bold text-slate-900">Record staff leave</h2><p class="mt-1 text-xs text-slate-500">Create a leave record for administrator review.</p></div>
        <label class="block text-xs font-semibold text-slate-700">Staff member<select v-model="leaveForm.staff_id" required class="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none"><option value="">Select staff member</option><option v-for="member in staff" :key="member.staff_id" :value="member.staff_id">{{ member.full_name }} — {{ member.job_title }}</option></select></label>
        <label class="block text-xs font-semibold text-slate-700">Leave type<select v-model="leaveForm.leave_type" class="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none"><option v-for="type in leaveTypes" :key="type" :value="type">{{ type }}</option></select></label>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2"><label class="text-xs font-semibold text-slate-700">Start date<input v-model="leaveForm.start_date" required type="date" class="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" /></label><label class="text-xs font-semibold text-slate-700">End date<input v-model="leaveForm.end_date" required type="date" class="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none" /></label></div>
        <label class="block text-xs font-semibold text-slate-700">Reason<textarea v-model.trim="leaveForm.reason" required maxlength="1000" rows="3" placeholder="Reason for leave" class="mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm font-normal focus:border-indigo-500 focus:outline-none"></textarea></label>
        <button type="submit" :disabled="leaveSaving" class="w-full rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{{ leaveSaving ? 'Recording…' : 'Record leave' }}</button>
      </form>

      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div class="mb-4"><h2 class="font-bold text-slate-900">Leave records</h2><p class="mt-1 text-xs text-slate-500">Approve, reject, or cancel staff leave records.</p></div><div v-if="!leaveRecords.length" class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">No leave records exist yet.</div><div v-else class="space-y-3"><article v-for="leave in leaveRecords" :key="leave.leave_id" class="rounded-lg border border-slate-200 p-4"><div class="flex items-start justify-between gap-3"><div><h3 class="font-semibold text-slate-900">{{ leave.staff_member?.full_name || staffName(leave.staff_id) }}</h3><p class="mt-1 text-xs text-slate-500">{{ leave.leave_type }} · {{ leave.start_date }} to {{ leave.end_date }}</p></div><span class="rounded-full px-2 py-1 text-[11px] font-semibold" :class="leaveStatusClass(leave.status)">{{ leave.status }}</span></div><p class="mt-3 text-sm text-slate-700">{{ leave.reason }}</p><div v-if="leave.status === 'Pending'" class="mt-4 flex flex-wrap gap-2"><button type="button" class="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700" @click="reviewLeave(leave, 'Approved')">Approve</button><button type="button" class="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50" @click="reviewLeave(leave, 'Rejected')">Reject</button></div></article></div></div>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { authStore } from '../store/auth.js'
import {
  createStaff,
  createStaffLeave,
  deleteStaff,
  fetchStaff,
  fetchStaffAttendance,
  fetchStaffLeave,
  fetchStaffTeacherOptions,
  saveStaffAttendance,
  updateStaff,
  updateStaffLeave,
} from '../api.js'

const staff = ref([])
const teacherOptions = ref([])
const attendanceRows = ref([])
const leaveRecords = ref([])
const loading = ref(true)
const attendanceLoading = ref(true)
const saving = ref(false)
const leaveSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const editingId = ref('')
const attendanceDate = ref(new Date().toISOString().slice(0, 10))
const employmentStatuses = ['active', 'on_leave', 'inactive', 'terminated']
const attendanceStatuses = ['Present', 'Absent', 'Late', 'Excused', 'On Leave']
const leaveTypes = ['Annual', 'Sick', 'Maternity', 'Study', 'Emergency', 'Other']
const form = reactive({ staff_type: 'non_teaching', teacher_id: '', full_name: '', job_title: '', employee_number: '', email: '', phone: '', department: '', date_joined: '', date_left: '', employment_status: 'active' })
const leaveForm = reactive({ staff_id: '', leave_type: 'Annual', start_date: '', end_date: '', reason: '' })
const token = () => authStore.token.value
const availableTeacherOptions = computed(() => teacherOptions.value.filter((teacher) => !teacher.staff_id || teacher.staff_id === editingStaffTeacherId.value))
const editingStaffTeacherId = computed(() => staff.value.find((member) => member.staff_id === editingId.value)?.teacher_id || '')

function setMessage(message, success = false) {
  if (success) successMessage.value = message
  else errorMessage.value = message
}

function resetMessages() {
  errorMessage.value = ''
  successMessage.value = ''
}

function applyTeacherProfile() {
  const teacher = teacherOptions.value.find((item) => item.teacher_id === form.teacher_id)
  if (!teacher) return
  form.full_name = teacher.full_name || ''
  form.email = teacher.email || ''
  form.department = teacher.department || ''
  if (!form.job_title) form.job_title = 'Teacher'
}

function resetForm() {
  editingId.value = ''
  Object.assign(form, { staff_type: 'non_teaching', teacher_id: '', full_name: '', job_title: '', employee_number: '', email: '', phone: '', department: '', date_joined: '', date_left: '', employment_status: 'active' })
}

function startEdit(member) {
  editingId.value = member.staff_id
  Object.assign(form, { staff_type: member.staff_type, teacher_id: member.teacher_id || '', full_name: member.full_name || '', job_title: member.job_title || '', employee_number: member.employee_number || '', email: member.email || '', phone: member.phone || '', department: member.department || '', date_joined: member.date_joined || '', date_left: member.date_left || '', employment_status: member.employment_status || 'active' })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function loadStaffData() {
  const [staffResult, teacherResult, leaveResult] = await Promise.all([fetchStaff(token()), fetchStaffTeacherOptions(token()), fetchStaffLeave(token())])
  if (!staffResult.ok) throw new Error(staffResult.error || 'Unable to load staff records.')
  if (!teacherResult.ok) throw new Error(teacherResult.error || 'Unable to load teacher profiles.')
  if (!leaveResult.ok) throw new Error(leaveResult.error || 'Unable to load leave records.')
  staff.value = staffResult.data || []
  teacherOptions.value = teacherResult.data || []
  leaveRecords.value = leaveResult.data || []
}

async function loadAttendance() {
  attendanceLoading.value = true
  const result = await fetchStaffAttendance(token(), attendanceDate.value)
  if (!result.ok) {
    errorMessage.value = result.error || 'Unable to load staff attendance.'
  } else {
    attendanceRows.value = (result.data?.rows || []).map((row) => ({ ...row, attendanceStatus: row.attendance?.attendance_status || 'Present', attendanceNotes: row.attendance?.notes || '', saving: false }))
  }
  attendanceLoading.value = false
}

async function loadAll() {
  loading.value = true
  resetMessages()
  try {
    await Promise.all([loadStaffData(), loadAttendance()])
  } catch (error) {
    errorMessage.value = error.message || 'Unable to load staff management data.'
  }
  loading.value = false
}

async function submitStaff() {
  saving.value = true
  resetMessages()
  const body = { ...form }
  const result = editingId.value ? await updateStaff(token(), editingId.value, body) : await createStaff(token(), body)
  if (!result.ok) {
    setMessage(result.error || 'Unable to save staff record.')
  } else {
    setMessage(editingId.value ? 'Staff record updated.' : 'Staff member added.', true)
    resetForm()
    await loadStaffData()
    await loadAttendance()
  }
  saving.value = false
}

async function removeStaff(member) {
  if (!window.confirm(`Delete the staff record for ${member.full_name}? Historical records may require marking the person inactive instead.`)) return
  resetMessages()
  const result = await deleteStaff(token(), member.staff_id)
  if (!result.ok) setMessage(result.error || 'Unable to delete staff record.')
  else {
    setMessage('Staff record deleted.', true)
    await loadStaffData()
    await loadAttendance()
  }
}

async function saveAttendance(row) {
  row.saving = true
  resetMessages()
  const result = await saveStaffAttendance(token(), { staff_id: row.staff_id, attendance_date: attendanceDate.value, attendance_status: row.attendanceStatus, notes: row.attendanceNotes })
  if (!result.ok) setMessage(result.error || 'Unable to save staff attendance.')
  else setMessage(`Attendance saved for ${row.full_name}.`, true)
  row.saving = false
}

async function submitLeave() {
  leaveSaving.value = true
  resetMessages()
  const result = await createStaffLeave(token(), { ...leaveForm })
  if (!result.ok) setMessage(result.error || 'Unable to record staff leave.')
  else {
    setMessage('Staff leave recorded.', true)
    Object.assign(leaveForm, { staff_id: '', leave_type: 'Annual', start_date: '', end_date: '', reason: '' })
    const refreshed = await fetchStaffLeave(token())
    if (refreshed.ok) leaveRecords.value = refreshed.data || []
  }
  leaveSaving.value = false
}

async function reviewLeave(leave, status) {
  resetMessages()
  const result = await updateStaffLeave(token(), leave.leave_id, { status })
  if (!result.ok) setMessage(result.error || 'Unable to update leave record.')
  else {
    setMessage(`Leave record ${status.toLowerCase()}.`, true)
    const refreshed = await fetchStaffLeave(token())
    if (refreshed.ok) leaveRecords.value = refreshed.data || []
  }
}

function staffName(staffId) {
  return staff.value.find((member) => member.staff_id === staffId)?.full_name || 'Unknown staff member'
}

function leaveStatusClass(status) {
  if (status === 'Approved') return 'bg-emerald-50 text-emerald-700'
  if (status === 'Rejected') return 'bg-red-50 text-red-700'
  if (status === 'Cancelled') return 'bg-slate-100 text-slate-600'
  return 'bg-amber-50 text-amber-700'
}

watch(() => form.teacher_id, applyTeacherProfile)
watch(attendanceDate, loadAttendance)
onMounted(loadAll)
</script>
