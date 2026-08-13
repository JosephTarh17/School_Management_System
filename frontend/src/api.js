export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

const jsonHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
})

async function requestJson(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: jsonHeaders(token),
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  })
  const payload = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, ...payload }
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

export async function fetchAttendance(token) {
  return requestJson('/attendance', { token })
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

export async function fetchAssessments(token) {
  return requestJson('/assessments', { token })
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

export async function fetchParticipationLogs(token) {
  return requestJson('/participation-logs', { token })
}

