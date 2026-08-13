import { reactive } from 'vue'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

const REQUEST_SHOW_DELAY = 120
const REQUEST_MIN_VISIBLE = 280

export const requestLoading = reactive({
  pending: 0,
  visible: false,
})

let showTimer = null
let visibleSince = 0
let hideTimer = null

function beginRequest() {
  requestLoading.pending += 1
  if (requestLoading.pending !== 1 || requestLoading.visible || showTimer) return

  showTimer = window.setTimeout(() => {
    showTimer = null
    if (requestLoading.pending > 0) {
      requestLoading.visible = true
      visibleSince = Date.now()
    }
  }, REQUEST_SHOW_DELAY)
}

function endRequest() {
  requestLoading.pending = Math.max(0, requestLoading.pending - 1)
  if (requestLoading.pending > 0) return

  if (showTimer) {
    window.clearTimeout(showTimer)
    showTimer = null
  }

  if (!requestLoading.visible) return

  const remaining = Math.max(0, REQUEST_MIN_VISIBLE - (Date.now() - visibleSince))
  if (hideTimer) window.clearTimeout(hideTimer)
  hideTimer = window.setTimeout(() => {
    requestLoading.visible = false
    hideTimer = null
  }, remaining)
}

const jsonHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
})

async function requestJson(path, { method = 'GET', token, body } = {}) {
  beginRequest()
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
  } finally {
    endRequest()
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

export async function fetchRegistrationEligibility(token) {
  return requestJson('/course-registrations/eligibility', { token })
}

export async function fetchRegistrationCatalog(token, term) {
  const query = term ? `?term=${encodeURIComponent(term)}` : ''
  return requestJson(`/course-registrations/catalog${query}`, { token })
}

export async function fetchCourseRegistrationRequests(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/course-registrations${query.toString() ? `?${query.toString()}` : ''}`, { token })
}

export async function submitCourseRegistration(token, body) {
  return requestJson('/course-registrations', { method: 'POST', token, body })
}

export async function cancelCourseRegistration(token, requestId) {
  return requestJson(`/course-registrations/${requestId}/cancel`, { method: 'PATCH', token })
}

export async function reviewCourseRegistration(token, requestId, body) {
  return requestJson(`/course-registrations/${requestId}/review`, { method: 'PATCH', token, body })
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

export async function fetchGuardianChildren(token) {
  return requestJson('/guardian-portal/children', { token })
}

export async function fetchGuardianChildSummary(token, studentId) {
  return requestJson(`/guardian-portal/children/${studentId}`, { token })
}

export async function fetchAttendanceReports(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/attendance-reports/reports${query.toString() ? `?${query.toString()}` : ''}`, { token })
}

export async function fetchAttendanceSettings(token) {
  return requestJson('/attendance-reports/settings', { token })
}

export async function updateAttendanceSettings(token, body) {
  return requestJson('/attendance-reports/settings', { method: 'PATCH', token, body })
}

export async function fetchAttendanceAlerts(token) {
  return requestJson('/attendance-reports/alerts', { token })
}

export async function acknowledgeAttendanceAlert(token, alertId) {
  return requestJson(`/attendance-reports/alerts/${alertId}/acknowledge`, { method: 'PATCH', token })
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

export async function fetchClassFeeSettings(token) {
  return requestJson('/financial-records/class-fees', { token })
}

export async function updateClassFeeSetting(token, classLevel, body) {
  return requestJson(`/financial-records/class-fees/${encodeURIComponent(classLevel)}`, { method: 'PATCH', token, body })
}

export async function updateFinancialRecord(token, invoiceId, body) {
  return requestJson(`/financial-records/${invoiceId}`, { method: 'PATCH', token, body })
}

export async function fetchPaymentRecords(token, invoiceId) {
  return requestJson(`/financial-records/${invoiceId}/payments`, { token })
}

export async function recordManualPayment(token, invoiceId, body) {
  return requestJson(`/financial-records/${invoiceId}/payments`, { method: 'POST', token, body })
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

export async function fetchBehaviorIncidents(token) {
  return requestJson('/behavior-incidents', { token })
}

export async function createBehaviorIncident(token, body) {
  return requestJson('/behavior-incidents', { method: 'POST', token, body })
}

export async function updateBehaviorIncident(token, incidentId, body) {
  return requestJson(`/behavior-incidents/${incidentId}`, { method: 'PATCH', token, body })
}

export async function deleteBehaviorIncident(token, incidentId) {
  return requestJson(`/behavior-incidents/${incidentId}`, { method: 'DELETE', token })
}

export async function verifyMfaChallenge(challengeToken, code) {
  return requestJson('/auth/mfa/verify', { method: 'POST', body: { challenge_token: challengeToken, code } })
}

export async function enrollMfa(token) {
  return requestJson('/auth/mfa/enroll', { method: 'POST', token })
}

export async function verifyMfaEnrollment(token, code) {
  return requestJson('/auth/mfa/verify-enrollment', { method: 'POST', token, body: { code } })
}

export async function disableMfa(token, code) {
  return requestJson('/auth/mfa/disable', { method: 'POST', token, body: { code } })
}

export async function fetchInstallments(token, invoiceId) {
  return requestJson(`/financial-records/${invoiceId}/installments`, { token })
}

export async function createInstallmentSchedule(token, invoiceId, installments) {
  return requestJson(`/financial-records/${invoiceId}/installments`, { method: 'POST', token, body: { installments } })
}

export async function recordInstallmentPayment(token, invoiceId, installmentId, body) {
  return requestJson(`/financial-records/${invoiceId}/installments/${installmentId}/payments`, { method: 'POST', token, body })
}
