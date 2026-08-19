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

export async function fetchTranslations(token, texts, targetLanguage = 'fr') {
  return requestJson('/translations', { method: 'POST', token, body: { texts, targetLanguage } })
}

export async function fetchCurrentAcademicPeriod(token) {
  return requestJson('/academic-period', { token })
}

export async function updateCurrentAcademicPeriod(token, body) {
  return requestJson('/academic-period', { method: 'PATCH', token, body })
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

export async function createGuardian(token, body) {
  return requestJson('/users/register-guardian', { method: 'POST', token, body })
}

export async function fetchUsers(token) {
  return requestJson('/users', { token })
}

export async function updateUserStatus(token, userId, body) {
  return requestJson(`/users/${userId}/status`, { method: 'PATCH', token, body })
}

export async function forceLogoutUser(token, userId, body) {
  return requestJson(`/users/${userId}/force-logout`, { method: 'POST', token, body })
}

export async function resetUserPassword(token, userId, body) {
  return requestJson(`/users/${userId}/reset-password`, { method: 'POST', token, body })
}

export async function resetUserMfa(token, userId, body) {
  return requestJson(`/users/${userId}/reset-mfa`, { method: 'POST', token, body })
}

export async function updateUserLifecycle(token, userId, body) {
  return requestJson(`/users/${userId}/lifecycle`, { method: 'PATCH', token, body })
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

export async function fetchAuditLogs(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/audit-logs${query.toString() ? `?${query.toString()}` : ''}`, { token })
}

export async function fetchAnnouncements(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/announcements${query.toString() ? `?${query.toString()}` : ''}`, { token })
}

export async function createAnnouncement(token, body) {
  return requestJson('/announcements', { method: 'POST', token, body })
}

export async function updateAnnouncement(token, announcementId, body) {
  return requestJson(`/announcements/${announcementId}`, { method: 'PATCH', token, body })
}

export async function fetchNotifications(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/notifications${query.toString() ? `?${query.toString()}` : ''}`, { token })
}

export async function fetchUnreadNotificationCount(token) {
  return requestJson('/notifications/unread-count', { token })
}

export async function markNotificationRead(token, notificationId) {
  return requestJson(`/notifications/${notificationId}/read`, { method: 'PATCH', token })
}

export async function markAllNotificationsRead(token) {
  return requestJson('/notifications/read-all', { method: 'POST', token })
}

export async function fetchCurrentUser(token) {
  return requestJson('/users/me', { token })
}

export async function fetchStaff(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/staff${query.toString() ? `?${query.toString()}` : ''}`, { token })
}

export async function fetchStaffTeacherOptions(token) {
  return requestJson('/staff/teachers', { token })
}

export async function createStaff(token, body) {
  return requestJson('/staff', { method: 'POST', token, body })
}

export async function updateStaff(token, staffId, body) {
  return requestJson(`/staff/${staffId}`, { method: 'PATCH', token, body })
}

export async function deleteStaff(token, staffId) {
  return requestJson(`/staff/${staffId}`, { method: 'DELETE', token })
}

export async function fetchStaffAttendance(token, date) {
  const query = date ? `?date=${encodeURIComponent(date)}` : ''
  return requestJson(`/staff/attendance${query}`, { token })
}

export async function saveStaffAttendance(token, body) {
  return requestJson('/staff/attendance', { method: 'POST', token, body })
}

export async function fetchStaffLeave(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/staff/leave${query.toString() ? `?${query.toString()}` : ''}`, { token })
}

export async function createStaffLeave(token, body) {
  return requestJson('/staff/leave', { method: 'POST', token, body })
}

export async function updateStaffLeave(token, leaveId, body) {
  return requestJson(`/staff/leave/${leaveId}`, { method: 'PATCH', token, body })
}

export async function updateCurrentUser(token, body) {
  return requestJson('/users/me', { method: 'PATCH', token, body })
}

export async function changePassword(token, body) {
  return requestJson('/users/me/change-password', { method: 'POST', token, body })
}

export async function fetchCourses(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/courses${query.toString() ? `?${query.toString()}` : ''}`, { token })
}

export async function fetchUniversalSearch(token, query) {
  const search = new URLSearchParams({ q: query || '' })
  return requestJson(`/search?${search.toString()}`, { token })
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

export async function fetchRegistrationEligibility(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/course-registrations/eligibility${query.toString() ? `?${query}` : ''}`, { token })
}

export async function fetchRegistrationCatalog(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/course-registrations/catalog${query.toString() ? `?${query.toString()}` : ''}`, { token })
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

export async function fetchGradingGradebook(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/grading/gradebook${query.toString() ? `?${query.toString()}` : ''}`, { token })
}

export async function saveGradingMark(token, body) {
  return requestJson('/grading/marks', { method: 'POST', token, body })
}

export async function confirmGradingAssessment(token, assessmentId) {
  return requestJson(`/grading/assessments/${assessmentId}/confirm`, { method: 'POST', token })
}

export async function fetchGradingReview(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/grading/review${query.toString() ? `?${query.toString()}` : ''}`, { token })
}

export async function publishGradingAssessment(token, assessmentId) {
  return requestJson(`/grading/assessments/${assessmentId}/publish`, { method: 'POST', token })
}

export async function unpublishGradingAssessment(token, assessmentId) {
  return requestJson(`/grading/assessments/${assessmentId}/unpublish`, { method: 'POST', token })
}

export async function fetchReportCard(token, studentId, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/grading/report-cards/${studentId}${query.toString() ? `?${query.toString()}` : ''}`, { token })
}

export async function generateReportCard(token, studentId, body) {
  return requestJson(`/grading/report-cards/${studentId}/generate`, { method: 'POST', token, body })
}

export async function publishReportCard(token, studentId, body) {
  return requestJson(`/grading/report-cards/${studentId}/publish`, { method: 'POST', token, body })
}

export async function unpublishReportCard(token, studentId, body) {
  return requestJson(`/grading/report-cards/${studentId}/unpublish`, { method: 'POST', token, body })
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

export async function fetchClassSessionResources(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/class-sessions/resources${query.toString() ? `?${query.toString()}` : ''}`, { token })
}

export async function fetchRooms(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/rooms${query.toString() ? `?${query.toString()}` : ''}`, { token })
}

export async function createRoom(token, body) {
  return requestJson('/rooms', { method: 'POST', token, body })
}

export async function updateRoom(token, roomId, body) {
  return requestJson(`/rooms/${roomId}`, { method: 'PATCH', token, body })
}

export async function deleteRoom(token, roomId) {
  return requestJson(`/rooms/${roomId}`, { method: 'DELETE', token })
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

export async function initializeCinetPayPayment(token, body) {
  return requestJson('/cinetpay/initialize', { method: 'POST', token, body })
}

export async function fetchCinetPayStatus(token, merchantTransactionId) {
  return requestJson(`/cinetpay/status/${encodeURIComponent(merchantTransactionId)}`, { token })
}

export async function fetchCourseHours(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/course-hours${query.toString() ? `?${query.toString()}` : ''}`, { token })
}
export async function createCourseHourAllocation(token, body) {
  return requestJson('/course-hours', { method: 'POST', token, body })
}
export async function updateCourseHourAllocation(token, allocationId, body) {
  return requestJson(`/course-hours/${allocationId}`, { method: 'PATCH', token, body })
}
export async function deleteCourseHourAllocation(token, allocationId) {
  return requestJson(`/course-hours/${allocationId}`, { method: 'DELETE', token })
}
export async function fetchTimetableResources(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/timetables/resources${query.toString() ? `?${query.toString()}` : ''}`, { token })
}
export async function fetchTimetables(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/timetables${query.toString() ? `?${query.toString()}` : ''}`, { token })
}
export async function fetchTimetableEntries(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/timetables/entries${query.toString() ? `?${query.toString()}` : ''}`, { token })
}
export async function createTimetableEntry(token, body) {
  return requestJson('/timetables', { method: 'POST', token, body })
}
export async function updateTimetableEntry(token, entryId, body) {
  return requestJson(`/timetables/${entryId}`, { method: 'PATCH', token, body })
}
export async function openTimetableSession(token, occurrenceId) {
  return requestJson(`/timetables/occurrences/${occurrenceId}/open-session`, { method: 'POST', token })
}
export async function completeTimetableOccurrence(token, occurrenceId) {
  return requestJson(`/timetables/occurrences/${occurrenceId}/complete`, { method: 'POST', token })
}
export async function reportTeacherAbsence(token, occurrenceId, body) {
  return requestJson(`/timetables/occurrences/${occurrenceId}/absence-report`, { method: 'POST', token, body })
}
export async function fetchTeacherAbsenceReports(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/timetables/absence-reports${query.toString() ? `?${query.toString()}` : ''}`, { token })
}
export async function reviewTeacherAbsence(token, reportId, body) {
  return requestJson(`/timetables/absence-reports/${reportId}/review`, { method: 'POST', token, body })
}
export async function createTimetableHourRequest(token, body) {
  return requestJson('/timetables/hour-requests', { method: 'POST', token, body })
}
export async function fetchTimetableHourRequests(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/timetables/hour-requests${query.toString() ? `?${query.toString()}` : ''}`, { token })
}
export async function reviewTimetableHourRequest(token, requestId, body) {
  return requestJson(`/timetables/hour-requests/${requestId}/review`, { method: 'POST', token, body })
}
export async function fetchCalendar(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/calendar${query.toString() ? `?${query.toString()}` : ''}`, { token })
}
export async function fetchSchoolEvents(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/school-events${query.toString() ? `?${query.toString()}` : ''}`, { token })
}
export async function createSchoolEvent(token, body) {
  return requestJson('/school-events', { method: 'POST', token, body })
}
export async function updateSchoolEvent(token, eventId, body) {
  return requestJson(`/school-events/${eventId}`, { method: 'PATCH', token, body })
}
export async function publishSchoolEvent(token, eventId) {
  return requestJson(`/school-events/${eventId}/publish`, { method: 'POST', token })
}
export async function cancelSchoolEvent(token, eventId, reason) {
  return requestJson(`/school-events/${eventId}/cancel`, { method: 'POST', token, body: { reason } })
}
export async function deleteSchoolEvent(token, eventId) {
  return requestJson(`/school-events/${eventId}`, { method: 'DELETE', token })
}
export async function fetchAbsenceJustifications(token, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null && value !== ''))
  return requestJson(`/absence-justifications${query.toString() ? `?${query.toString()}` : ''}`, { token })
}
export async function submitAbsenceJustification(token, attendanceId, body) {
  return requestJson(`/absence-justifications/${attendanceId}`, { method: 'POST', token, body })
}
export async function reviewAbsenceJustification(token, attendanceId, body) {
  return requestJson(`/absence-justifications/${attendanceId}/review`, { method: 'POST', token, body })
}
export async function fetchAbsencePolicy(token) {
  return requestJson('/absence-justifications/policy', { token })
}
export async function updateAbsencePolicy(token, body) {
  return requestJson('/absence-justifications/policy', { method: 'PATCH', token, body })
}
