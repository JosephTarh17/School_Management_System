<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Course Hours</h1>
        <p class="mt-1 text-xs text-slate-500">Set the approved teaching-hour quota for each course offering in the current semester.</p>
      </div>
      <button type="button" class="btn-primary px-3 py-2 text-xs font-semibold" :disabled="loading" @click="loadData">Refresh</button>
    </div>
    <div v-if="errorMessage" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{{ errorMessage }}</div>
    <div v-if="successMessage" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">{{ successMessage }}</div>

    <form class="rounded-xl border border-blue-200 bg-blue-50/60 p-5 shadow-xs" @submit.prevent="saveAllocation">
      <h2 class="text-base font-bold text-slate-900">{{ editingId ? 'Update course-hour allocation' : 'Assign course hours' }}</h2>
      <p class="mt-1 text-xs text-slate-600">Quota changes are audited. Future sessions beyond a reduced quota become voided or unfunded.</p>
      <div class="mt-4 grid gap-4 md:grid-cols-3">
        <label class="block text-xs font-semibold text-slate-700 md:col-span-2">Teacher-course offering
          <select v-model="form.assignment_id" :disabled="Boolean(editingId)" required class="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800">
            <option value="">Select an offering</option>
            <option v-for="assignment in assignments" :key="assignment.assignment_id" :value="assignment.assignment_id">{{ assignment.course?.course_code }} — {{ assignment.course?.course_name }} · {{ assignment.teacher?.full_name || 'Teacher' }} ({{ assignment.academic_year }} / {{ assignment.semester }})</option>
          </select>
        </label>
        <label class="block text-xs font-semibold text-slate-700">Approved hours
          <input v-model.number="form.approved_hours" type="number" min="0" max="10000" step="0.25" required class="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800" placeholder="30" />
        </label>
        <label class="block text-xs font-semibold text-slate-700 md:col-span-3">Reason
          <textarea v-model.trim="form.reason" required maxlength="1000" rows="2" class="mt-1.5 block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800" placeholder="Approved semester teaching workload"></textarea>
        </label>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        <button type="submit" class="btn-primary px-4 py-2 text-xs font-semibold" :disabled="saving">{{ saving ? 'Saving…' : editingId ? 'Save allocation' : 'Create allocation' }}</button>
        <button v-if="editingId" type="button" class="btn-secondary px-4 py-2 text-xs font-semibold" @click="resetForm">Cancel</button>
      </div>
    </form>

    <section class="rounded-xl border border-border-subtle bg-white p-4 shadow-xs sm:p-6">
      <div class="mb-4"><h2 class="text-base font-bold text-slate-900">Allocation progress</h2><p class="mt-1 text-xs text-slate-500">Completed hours are calculated from attendance-supported timetable sessions.</p></div>
      <div v-if="loading" class="py-10 text-center text-sm text-slate-500">Loading course-hour allocations…</div>
      <div v-else-if="!allocations.length" class="py-10 text-center text-sm text-slate-500">No course-hour allocations have been created.</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[1050px] text-left text-xs">
          <thead><tr class="border-b border-slate-200 bg-slate-50 text-slate-500"><th class="px-4 py-3 font-semibold">Course</th><th class="px-4 py-3 font-semibold">Teacher / period</th><th class="px-4 py-3 font-semibold">Approved</th><th class="px-4 py-3 font-semibold">Scheduled</th><th class="px-4 py-3 font-semibold">Completed</th><th class="px-4 py-3 font-semibold">Remaining</th><th class="px-4 py-3 font-semibold">Voided</th><th class="px-4 py-3 font-semibold">Status</th><th class="px-4 py-3 text-right font-semibold">Actions</th></tr></thead>
          <tbody class="divide-y divide-slate-100"><tr v-for="allocation in allocations" :key="allocation.allocation_id" class="text-slate-700"><td class="px-4 py-3.5"><p class="font-semibold text-slate-900">{{ allocation.course?.course_code }}</p><p class="text-[11px] text-slate-500">{{ allocation.course?.course_name }}</p></td><td class="px-4 py-3.5">{{ allocation.teacher?.full_name }}<p class="text-[11px] text-slate-500">{{ allocation.academic_year }} · {{ allocation.semester }}</p></td><td class="px-4 py-3.5 font-semibold">{{ allocation.approved_hours }} h</td><td class="px-4 py-3.5">{{ allocation.scheduled_hours }} h</td><td class="px-4 py-3.5 text-emerald-700">{{ allocation.completed_hours }} h</td><td class="px-4 py-3.5">{{ allocation.remaining_hours }} h</td><td class="px-4 py-3.5 text-rose-700">{{ allocation.voided_hours }} h</td><td class="px-4 py-3.5"><span :class="allocation.excess_hours > 0 ? 'text-rose-700' : 'text-slate-700'">{{ allocation.excess_hours > 0 ? `Excess ${allocation.excess_hours} h` : allocation.status }}</span></td><td class="px-4 py-3.5 text-right"><div class="inline-flex gap-2"><button type="button" class="btn-secondary px-2.5 py-1.5 text-xs font-semibold" @click="startEdit(allocation)">Edit</button><button type="button" class="btn-danger px-2.5 py-1.5 text-xs font-semibold" @click="removeAllocation(allocation)">Delete</button></div></td></tr></tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { authStore } from '../store/auth.js'
import { createCourseHourAllocation, deleteCourseHourAllocation, fetchCourseHours, fetchTimetableResources, updateCourseHourAllocation } from '../api.js'

const assignments = ref([])
const allocations = ref([])
const loading = ref(true)
const saving = ref(false)
const editingId = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const form = reactive({ assignment_id: '', approved_hours: 0, reason: '' })

function resetForm() { editingId.value = ''; form.assignment_id = ''; form.approved_hours = 0; form.reason = '' }
function startEdit(row) { editingId.value = row.allocation_id; form.assignment_id = row.assignment_id; form.approved_hours = row.approved_hours; form.reason = ''; errorMessage.value = ''; successMessage.value = '' }
async function loadData() {
  loading.value = true; errorMessage.value = ''
  const [resources, result] = await Promise.all([fetchTimetableResources(authStore.token.value), fetchCourseHours(authStore.token.value)])
  if (!resources.ok) errorMessage.value = resources.error || 'Unable to load course offerings.'
  else assignments.value = resources.data?.assignments || resources.assignments || []
  if (!result.ok) errorMessage.value = result.error || 'Unable to load course-hour allocations.'
  else allocations.value = result.data || []
  loading.value = false
}
async function saveAllocation() {
  saving.value = true; errorMessage.value = ''; successMessage.value = ''
  const result = editingId.value ? await updateCourseHourAllocation(authStore.token.value, editingId.value, { approved_hours: form.approved_hours, reason: form.reason }) : await createCourseHourAllocation(authStore.token.value, { assignment_id: form.assignment_id, approved_hours: form.approved_hours, reason: form.reason })
  if (!result.ok) errorMessage.value = result.error || 'Unable to save the course-hour allocation.'
  else { successMessage.value = editingId.value ? 'Course-hour allocation updated.' : 'Course-hour allocation created.'; resetForm(); await loadData() }
  saving.value = false
}
async function removeAllocation(row) {
  if (!window.confirm(`Delete the course-hour allocation for ${row.course?.course_code}? Allocations with timetable history cannot be deleted.`)) return
  const result = await deleteCourseHourAllocation(authStore.token.value, row.allocation_id)
  if (!result.ok) errorMessage.value = result.error || 'Unable to delete the allocation.'
  else { successMessage.value = 'Course-hour allocation deleted.'; await loadData() }
}
onMounted(loadData)
</script>
