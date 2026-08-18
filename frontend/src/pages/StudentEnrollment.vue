<template>
  <section class="space-y-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Student records</p>
        <h1 class="mt-1 text-2xl font-bold text-slate-950">Student demographics & enrollment</h1>
        <p class="mt-1 text-sm text-slate-500">Register complete student profiles, link guardians, and manage course enrollment.</p>
      </div>
      <button @click="load" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Refresh data</button>
    </header>

    <p v-if="message" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{{ message }}</p>
    <p v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{{ errorMessage }}</p>

    <div class="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <form @submit.prevent="registerStudent" class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div><h2 class="font-bold text-slate-900">Register student profile</h2><p class="mt-1 text-xs text-slate-500">A student account is created with a class-derived fixed XAF invoice. Configure class fees first in Financial Records.</p></div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input v-model="studentForm.email" type="email" required placeholder="Student email" class="rounded-lg border px-3 py-2 text-sm" />
          <input v-model="studentForm.password" type="password" required minlength="8" placeholder="Temporary password" class="rounded-lg border px-3 py-2 text-sm" />
          <input v-model="studentForm.full_name" required placeholder="Full name" class="rounded-lg border px-3 py-2 text-sm" />
          <select v-model="studentForm.class_level" required class="rounded-lg border px-3 py-2 text-sm"><option value="">Select university class</option><option value="Freshman">Freshman</option><option value="Sophomore">Sophomore</option><option value="Junior">Junior</option></select>
          <input v-model="studentForm.dob" type="date" placeholder="Date of birth" class="rounded-lg border px-3 py-2 text-sm" />
          <input v-model="studentForm.phone" placeholder="Phone" class="rounded-lg border px-3 py-2 text-sm" />
          <input v-model="studentForm.address" placeholder="Residential address" class="rounded-lg border px-3 py-2 text-sm" />
          <input v-model="studentForm.emergency_contact_name" placeholder="Emergency contact name" class="rounded-lg border px-3 py-2 text-sm" />
          <input v-model="studentForm.emergency_contact_phone" placeholder="Emergency contact phone" class="rounded-lg border px-3 py-2 text-sm" />
        </div>
        <textarea v-model="studentForm.medical_information" rows="2" placeholder="Medical information (restricted)" class="w-full rounded-lg border px-3 py-2 text-sm"></textarea>
        <textarea v-model="studentForm.disability_accommodations" rows="2" placeholder="Disability accommodations (restricted)" class="w-full rounded-lg border px-3 py-2 text-sm"></textarea>
        <label class="block text-sm text-slate-700">Guardian relationship
          <select v-model="studentForm.guardian_id" class="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"><option value="">No guardian link yet</option><option v-for="guardian in guardians" :key="guardian.guardian_id" :value="guardian.guardian_id">{{ guardian.full_name }} — {{ guardian.email }}</option></select>
        </label>
        <button :disabled="saving" class="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{{ saving ? 'Registering…' : 'Register student' }}</button>
      </form>

      <form @submit.prevent="enrollStudent" class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div><h2 class="font-bold text-slate-900">Manual enrollment</h2><p class="mt-1 text-xs text-slate-500">Use this registrar workflow to place a student directly into an approved course. Student self-registration requests are reviewed separately.</p></div>
        <label class="block text-sm text-slate-700">Student
          <select v-model="enrollmentForm.student_id" required class="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"><option value="">Select student</option><option v-for="student in students" :key="student.student_id" :value="student.student_id">{{ student.full_name }} — {{ student.user_account?.email }}</option></select>
        </label>
        <label class="block text-sm text-slate-700">Course offering
          <select v-model="enrollmentForm.course_id" required class="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"><option value="">Select offered course</option><option v-for="course in courses" :key="`${course.course_id}-${course.academic_year}-${course.semester}`" :value="course.course_id">{{ course.course_code }} — {{ course.course_name }} · {{ course.academic_year }} · {{ course.semester }}</option></select>
        </label>
        <label class="block text-sm text-slate-700">Status
          <select v-model="enrollmentForm.status" class="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"><option value="active">Active</option><option value="completed">Completed</option><option value="dropped">Dropped</option></select>
        </label>
        <button :disabled="saving" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{{ saving ? 'Saving…' : 'Create manual enrollment' }}</button>
      </form>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="mb-4 flex items-center justify-between"><div><h2 class="font-bold text-slate-900">Current students</h2><p class="text-xs text-slate-500">{{ students.length }} active profile(s)</p></div></div>
      <div v-if="loading" class="py-8 text-center text-sm text-slate-500">Loading student records…</div>
      <div v-else class="overflow-x-auto"><table class="min-w-full text-left text-sm"><thead class="border-b text-xs uppercase text-slate-500"><tr><th class="px-3 py-2">Student</th><th class="px-3 py-2">Contact</th><th class="px-3 py-2">Emergency contact</th><th class="px-3 py-2">Guardian</th></tr></thead><tbody><tr v-for="student in students" :key="student.student_id" class="border-b last:border-0"><td class="px-3 py-3">        <div class="font-semibold text-slate-900">{{ student.full_name }}</div><div class="text-xs text-slate-500">{{ student.class_level || 'Class not set' }} · {{ student.user_account?.email }}</div></td><td class="px-3 py-3 text-slate-600">{{ student.phone || '—' }}<br>{{ student.address || '—' }}</td><td class="px-3 py-3 text-slate-600">{{ student.emergency_contact_name || '—' }}<br>{{ student.emergency_contact_phone || '' }}</td><td class="px-3 py-3 text-slate-600">{{ guardianName(student.student_id) }}</td></tr></tbody></table></div>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="mb-4"><h2 class="font-bold text-slate-900">Enrollment history</h2><p class="text-xs text-slate-500">Change status or remove an enrollment record.</p></div>
      <div v-if="!enrollments.length" class="py-6 text-center text-sm text-slate-500">No enrollment records found.</div>
      <div v-else class="space-y-3"><div v-for="enrollment in enrollments" :key="enrollment.enrollment_id" class="flex flex-col gap-3 rounded-lg border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between"><div><div class="font-semibold text-slate-900">{{ enrollment.student?.full_name || enrollment.student_id }}</div><div class="text-xs text-slate-500">{{ enrollment.course?.course_code }} — {{ enrollment.course?.course_name }}</div></div><div class="flex items-center gap-2"><select :value="enrollment.status" @change="changeStatus(enrollment, $event.target.value)" class="rounded-lg border px-2 py-1 text-xs"><option value="active">Active</option><option value="completed">Completed</option><option value="dropped">Dropped</option></select><button @click="removeEnrollment(enrollment.enrollment_id)" class="rounded-lg px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50">Remove</button></div></div></div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { authStore } from '../store/auth'
import { createEnrollment, createStudent, createUser, deleteEnrollment, fetchEnrollments, fetchRegistrationCatalog, fetchStudents, fetchUsers, linkStudentGuardian, updateEnrollment } from '../api.js'

const loading = ref(true)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')
const students = ref([])
const courses = ref([])
const guardians = ref([])
const enrollments = ref([])
const guardianLinks = ref({})
const studentForm = reactive({ email: '', password: '', full_name: '', class_level: '', dob: '', phone: '', address: '', emergency_contact_name: '', emergency_contact_phone: '', medical_information: '', disability_accommodations: '', guardian_id: '' })
const enrollmentForm = reactive({ student_id: '', course_id: '', status: 'active' })
const token = () => authStore.token.value

function resetNotice() { message.value = ''; errorMessage.value = '' }
async function load() {
  resetNotice(); loading.value = true
  const [studentsResult, coursesResult, enrollmentsResult, usersResult] = await Promise.all([fetchStudents(token()), fetchRegistrationCatalog(token()), fetchEnrollments(token()), fetchUsers(token())])
  if (!studentsResult.ok) errorMessage.value = studentsResult.error
  else students.value = studentsResult.data || []
  if (coursesResult.ok) courses.value = coursesResult.data || []
  if (enrollmentsResult.ok) enrollments.value = enrollmentsResult.data || []
  if (usersResult.ok) guardians.value = (usersResult.data || []).filter((user) => user.role === 'guardian').map((user) => ({ guardian_id: user.guardian?.guardian_id, full_name: user.guardian?.full_name || user.email, email: user.email })).filter((guardian) => guardian.guardian_id)
  loading.value = false
}
async function registerStudent() {
  resetNotice(); saving.value = true
  try {
    const account = await createUser(token(), { email: studentForm.email, password: studentForm.password, role: 'student' })
    if (!account.ok) throw new Error(account.error)
    const created = await createStudent(token(), { user_id: account.data.user_id, full_name: studentForm.full_name, class_level: studentForm.class_level, dob: studentForm.dob || undefined, phone: studentForm.phone || undefined, address: studentForm.address || undefined, emergency_contact_name: studentForm.emergency_contact_name || undefined, emergency_contact_phone: studentForm.emergency_contact_phone || undefined, medical_information: studentForm.medical_information || undefined, disability_accommodations: studentForm.disability_accommodations || undefined })
    if (!created.ok) throw new Error(created.error)
    if (studentForm.guardian_id) {
      const linked = await linkStudentGuardian(token(), created.data.student_id, { guardian_id: studentForm.guardian_id, primary_contact: true })
      if (!linked.ok) throw new Error(linked.error)
    }
    message.value = `Student profile created. Initial ${studentForm.class_level} invoice: ${created.data.initial_invoice?.amount_due || 0} XAF.`
    Object.keys(studentForm).forEach((key) => { studentForm[key] = key === 'password' || key === 'email' ? '' : '' })
    await load()
  } catch (error) { errorMessage.value = error.message || 'Unable to register student.' }
  finally { saving.value = false }
}
async function enrollStudent() {
  resetNotice(); saving.value = true
  const result = await createEnrollment(token(), enrollmentForm)
  if (!result.ok) errorMessage.value = result.error
  else { message.value = 'Enrollment created.'; enrollments.value.unshift(result.data); enrollmentForm.student_id = ''; enrollmentForm.course_id = '' }
  saving.value = false
}
async function changeStatus(enrollment, status) {
  const result = await updateEnrollment(token(), enrollment.enrollment_id, { status })
  if (!result.ok) errorMessage.value = result.error
  else enrollment.status = status
}
async function removeEnrollment(id) {
  if (!window.confirm('Remove this enrollment?')) return
  const result = await deleteEnrollment(token(), id)
  if (!result.ok) errorMessage.value = result.error
  else enrollments.value = enrollments.value.filter((entry) => entry.enrollment_id !== id)
}
function guardianName(studentId) { return guardianLinks.value[studentId] || 'Linked through profile' }
onMounted(load)
</script>
