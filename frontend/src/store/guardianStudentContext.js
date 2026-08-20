import { computed, ref } from 'vue'
import { fetchGuardianChildren } from '../api.js'

const students = ref([])
const selectedStudentId = ref('')
const loading = ref(false)
const error = ref('')
let loadedForUserId = null
let requestId = 0

function storageKey(userId) {
  return userId ? `scholastic.guardian.selectedStudentId.${userId}` : 'scholastic.guardian.selectedStudentId'
}

function normalizeStudent(record) {
  const student = record?.student || record || {}
  return {
    ...record,
    ...student,
    student_id: record?.student_id || student.student_id,
    full_name: student.full_name || record?.full_name || 'Student',
  }
}

function savedSelection(userId) {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(storageKey(userId)) || ''
}

function persistSelection(userId) {
  if (typeof window === 'undefined' || !userId) return
  if (selectedStudentId.value) window.localStorage.setItem(storageKey(userId), selectedStudentId.value)
  else window.localStorage.removeItem(storageKey(userId))
}

function resetContext() {
  requestId += 1
  students.value = []
  selectedStudentId.value = ''
  loading.value = false
  error.value = ''
  loadedForUserId = null
}

async function ensureLoaded(token, userId) {
  if (!token || !userId) {
    resetContext()
    return { ok: false, data: [] }
  }
  if (loadedForUserId === userId) return { ok: true, data: students.value }

  const currentRequestId = ++requestId
  loadedForUserId = userId
  loading.value = true
  error.value = ''
  const result = await fetchGuardianChildren(token)
  if (currentRequestId !== requestId) return result
  if (!result.ok) {
    loadedForUserId = null
    students.value = []
    selectedStudentId.value = ''
    error.value = result.error || 'Unable to load linked students.'
    loading.value = false
    return result
  }

  students.value = (result.data || []).map(normalizeStudent).filter((student) => student.student_id)
  const saved = savedSelection(userId)
  const validSaved = students.value.some((student) => student.student_id === saved)
  selectedStudentId.value = validSaved ? saved : students.value[0]?.student_id || ''
  persistSelection(userId)
  loading.value = false
  return { ok: true, data: students.value }
}

function selectStudent(studentId, userId) {
  const nextId = students.value.some((student) => student.student_id === studentId) ? studentId : ''
  selectedStudentId.value = nextId
  persistSelection(userId)
}

export const guardianStudentContext = {
  students,
  selectedStudentId,
  selectedStudent: computed(() => students.value.find((student) => student.student_id === selectedStudentId.value) || null),
  hasStudents: computed(() => students.value.length > 0),
  loading,
  error,
  ensureLoaded,
  selectStudent,
  reset: resetContext,
}
