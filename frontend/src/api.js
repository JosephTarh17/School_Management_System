export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

const jsonHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
})

async function requestJson(path, { method = 'GET', token, body } = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: jsonHeaders(token),
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    })
    const payload = await response.json().catch(() => ({}))
    return { ok: response.ok, status: response.status, ...payload, error: response.ok ? payload.error : (payload.error || `Request failed (${response.status}).`) }
  } catch {
    return { ok: false, status: 0, error: 'Unable to reach the server. Check that the backend is running and try again.' }
  }
}

export function authHeaders(token) {
  return jsonHeaders(token)
}

export async function login(email, password) {
  return requestJson('/auth/login', { method: 'POST', body: { email, password } })
}

export async function logout(token) {
  return requestJson('/auth/logout', { method: 'POST', token })
}

export async function refreshSession(token) {
  return requestJson('/auth/refresh', { method: 'POST', token })
}

export async function fetchAttendance(token) {
  return requestJson('/attendance', { token })
}

export async function saveAttendanceBatch(token, body) {
  return requestJson('/attendance/batch', { method: 'POST', token, body })
}

export async function fetchStudents(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/students${query.toString() ? `?${query.toString()}` : ''}`, { token })
}

export async function createUser(token, body) {
  return requestJson('/users/register', { method: 'POST', token, body })
}

export async function fetchUsers(token) {
  return requestJson('/users', { token })
}

export async function createStudent(token, body) {
  return requestJson('/students', { method: 'POST', token, body })
}

export async function updateStudent(token, studentId, body) {
  return requestJson(`/students/${studentId}`, { method: 'PATCH', token, body })
}

export async function linkStudentGuardian(token, studentId, body) {
  return requestJson(`/students/${studentId}/guardians`, { method: 'POST', token, body })
}

export async function unlinkStudentGuardian(token, studentId, guardianId) {
  return requestJson(`/students/${studentId}/guardians/${guardianId}`, { method: 'DELETE', token })
}

export async function fetchDashboardMetrics(token) {
  return requestJson('/dashboard/metrics', { token })
}

export async function fetchCurrentUser(token) {
  return requestJson('/users/me', { token })
}

export async function updateCurrentUser(token, body) {
  return requestJson('/users/me', { method: 'PATCH', token, body })
}

export async function fetchCourses(token) {
  return requestJson('/courses', { token })
}

export async function fetchEnrollments(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/enrollments${query.toString() ? `?${query.toString()}` : ''}`, { token })
}

export async function createEnrollment(token, body) {
  return requestJson('/enrollments', { method: 'POST', token, body })
}

export async function updateEnrollment(token, enrollmentId, body) {
  return requestJson(`/enrollments/${enrollmentId}`, { method: 'PATCH', token, body })
}

export async function deleteEnrollment(token, enrollmentId) {
  return requestJson(`/enrollments/${enrollmentId}`, { method: 'DELETE', token })
}

export async function fetchAssessments(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/assessments${query.toString() ? `?${query.toString()}` : ''}`, { token })
}

export async function fetchAcademicRecords(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/academic-records${query.toString() ? `?${query.toString()}` : ''}`, { token })
}

export async function fetchFinalGrades(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/academic-records/final-grades${query.toString() ? `?${query.toString()}` : ''}`, { token })
}

export async function saveAcademicRecord(token, body) {
  return requestJson('/academic-records', { method: 'POST', token, body })
}

export async function updateAcademicRecord(token, recordId, body) {
  return requestJson(`/academic-records/${recordId}`, { method: 'PATCH', token, body })
}

export async function createCourse(token, body) {
  return requestJson('/courses', { method: 'POST', token, body })
}

export async function deleteCourse(token, courseId) {
  return requestJson(`/courses/${courseId}`, { method: 'DELETE', token })
}

export async function createAssessment(token, body) {
  return requestJson('/assessments', { method: 'POST', token, body })
}

export async function deleteAssessment(token, assessmentId) {
  return requestJson(`/assessments/${assessmentId}`, { method: 'DELETE', token })
}

export async function fetchClassSessions(token) {
  return requestJson('/class-sessions', { token })
}

export async function createClassSession(token, body) {
  return requestJson('/class-sessions', { method: 'POST', token, body })
}

export async function deleteClassSession(token, sessionId) {
  return requestJson(`/class-sessions/${sessionId}`, { method: 'DELETE', token })
}

export async function fetchFinancialRecords(token) {
  return requestJson('/financial-records', { token })
}

export async function updateFinancialRecord(token, invoiceId, body) {
  return requestJson(`/financial-records/${invoiceId}`, { method: 'PATCH', token, body })
}

export async function deleteFinancialRecord(token, invoiceId) {
  return requestJson(`/financial-records/${invoiceId}`, { method: 'DELETE', token })
}

export async function fetchParticipationLogs(token) {
  return requestJson('/participation-logs', { token })
}

export async function updateParticipationLog(token, participationId, body) {
  return requestJson(`/participation-logs/${participationId}`, { method: 'PATCH', token, body })
}

export async function deleteParticipationLog(token, participationId) {
  return requestJson(`/participation-logs/${participationId}`, { method: 'DELETE', token })
}

