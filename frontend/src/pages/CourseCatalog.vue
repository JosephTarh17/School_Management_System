<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Academic Course Catalog</h1>
        <p class="text-xs text-slate-500 font-geist mt-1">Courses currently available from the institutional database.</p>
      </div>
      <button v-if="canManage" @click="showForm = !showForm" class="px-4 py-2 bg-primary-container text-white text-xs font-semibold rounded-eight shadow-xs font-geist">{{ showForm ? 'Close Form' : 'Add Course' }}</button>
    </div>

    <form v-if="showForm" @submit.prevent="createNewCourse" class="bg-white rounded-xl border border-border-subtle p-6 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-3">
      <input v-model="form.course_name" required placeholder="Course name" class="px-3 py-2 border rounded-lg text-sm" />
      <input v-model="form.course_code" required placeholder="Course code" class="px-3 py-2 border rounded-lg text-sm" />
      <input v-model="form.term" placeholder="Term" class="px-3 py-2 border rounded-lg text-sm" />
      <input v-model.number="form.credit_units" type="number" min="0" placeholder="Credits" class="px-3 py-2 border rounded-lg text-sm" />
      <button :disabled="saving" class="md:col-span-4 justify-self-start px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold disabled:opacity-60">{{ saving ? 'Saving…' : 'Save Course' }}</button>
    </form>

    <p v-if="errorMessage" class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{{ errorMessage }}</p>
    <div v-if="loading" class="p-8 text-center text-slate-500">Loading courses…</div>
    <div v-else class="bg-white rounded-xl border border-border-subtle p-6 shadow-xs">
      <p v-if="!catalog.length" class="p-8 text-center text-slate-500">No courses are available.</p>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div v-for="c in catalog" :key="c.course_id" class="p-5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-primary-container font-geist px-2 py-0.5 bg-blue-50 rounded border border-blue-200">{{ c.course_code }}</span>
            <span class="text-xs font-semibold text-slate-600 font-geist">{{ c.credit_units ?? '—' }} Credits</span>
          </div>
          <h3 class="text-base font-bold text-slate-900 font-sans mb-1">{{ c.course_name }}</h3>
          <p class="text-xs text-slate-600 font-sans mb-3">Term: {{ c.term || 'Not assigned' }}</p>
          <div v-if="canDelete" class="border-t border-slate-200 pt-3"><button @click="removeCourse(c.course_id)" class="text-xs text-red-700 font-semibold">Delete course</button></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { authStore } from '../store/auth'
import { createCourse, deleteCourse, fetchCourses } from '../api.js'

const catalog = ref([])
const loading = ref(true)
const saving = ref(false)
const showForm = ref(false)
const errorMessage = ref('')
const form = reactive({ course_name: '', course_code: '', term: '', credit_units: null })
const canManage = computed(() => ['teacher', 'administrator'].includes(authStore.userRole.value))
const canDelete = computed(() => authStore.userRole.value === 'administrator')

async function loadCourses() {
  loading.value = true
  errorMessage.value = ''
  const result = await fetchCourses(authStore.token.value)
  if (!result.ok) errorMessage.value = result.error || 'Unable to load courses.'
  else catalog.value = result.data || []
  loading.value = false
}

async function createNewCourse() {
  saving.value = true
  errorMessage.value = ''
  const result = await createCourse(authStore.token.value, form)
  if (!result.ok) errorMessage.value = result.error || 'Unable to create course.'
  else {
    catalog.value.push(result.data)
    Object.assign(form, { course_name: '', course_code: '', term: '', credit_units: null })
    showForm.value = false
  }
  saving.value = false
}

async function removeCourse(courseId) {
  if (!window.confirm('Delete this course?')) return
  const result = await deleteCourse(authStore.token.value, courseId)
  if (!result.ok) errorMessage.value = result.error || 'Unable to delete course.'
  else catalog.value = catalog.value.filter((course) => course.course_id !== courseId)
}

onMounted(loadCourses)
</script>
