export const roleProfiles = {
  administrator: {
    label: 'Administrator',
    intro: 'You coordinate the institution, review submissions, publish official results, manage access, and protect the school record.',
    can: ['Create and configure institutional records.', 'Review, approve, publish, and audit operational decisions.', 'Manage users, staff, guardians, locations, finance, and academic periods.'],
    cannot: ['Use help to bypass backend authorization.', 'Publish or edit records without the required validation and review state.'],
    home: '/admin-dashboard',
  },
  teacher: {
    label: 'Teacher',
    intro: 'You deliver teaching, record attendance, prepare assessments, manage marks, and report operational issues for your assigned work.',
    can: ['Work with assigned courses, sessions, attendance, assessments, and gradebook records.', 'Confirm completed teaching and submit items for administrator review.', 'Review your permitted calendars, reports, announcements, and participation records.'],
    cannot: ['Create courses or publish official grades.', 'Access unrelated student records, teacher assignments, or administrator-only configuration.'],
    home: '/dashboard',
  },
  student: {
    label: 'Student',
    intro: 'You manage your academic participation, registrations, assessments, attendance explanations, published results, and school information.',
    can: ['View permitted courses, registrations, sessions, assessments, calendars, results, and announcements.', 'Submit course registrations and absence justifications within the applicable deadlines.', 'Update permitted profile information through the existing account workflow.'],
    cannot: ['Edit marks, attendance decisions, published results, invoices, or other students’ records.', 'Approve or publish institutional records.'],
    home: '/student-portal',
  },
  guardian: {
    label: 'Guardian',
    intro: 'You monitor linked students, communicate with the school, review published information, respond to notices, and submit requests for review.',
    can: ['View selected-student attendance, published results, schedules, announcements, finance records, and guardian-visible discipline notices.', 'Submit communication, appointment, absence, consent, acknowledgement, and profile-change requests.', 'Track administrator responses and request statuses.'],
    cannot: ['Edit grades, attendance, invoices, discipline records, enrollments, or timetable records.', 'View records for students who are not linked to your guardian profile.'],
    home: '/guardian-portal',
  },
}

export const localHelpPaths = new Set([
  '/guardian-engagement',
  '/gradebook',
  '/grading-review',
  '/financial-records',
  '/timetables',
  '/course-hours',
  '/teacher-attendance',
  '/absence-justifications',
  '/staff-management',
  '/account-management',
])

export const moduleCatalog = [
  { path: '/student-portal', label: 'Student Portal', category: 'Portals', roles: ['student'], purpose: 'See your academic activity, deadlines, attendance, published results, and notices in one place.', next: 'Start with the current semester, then open the task or deadline that needs attention.', steps: ['Review the current academic period.', 'Open the card or module that needs action.', 'Submit only the records you are authorized to create.'] },
  { path: '/guardian-portal', label: 'Student Overview', category: 'Portals', roles: ['guardian'], purpose: 'Monitor linked students and review their permitted academic, attendance, finance, schedule, and notification information.', next: 'Use the universal Student bar before reviewing student-specific information.', steps: ['Choose the student from the portal bar.', 'Read the current alerts and balances.', 'Open a detailed module when a request or response is required.'] },
  { path: '/dashboard', label: 'Teacher Dashboard', category: 'Portals', roles: ['teacher'], purpose: 'Start teaching work from a summary of assigned courses, sessions, tasks, and notices.', next: 'Open today’s teaching or assessment task and complete it in its dedicated module.', steps: ['Check the current period and schedule.', 'Open the task requiring attention.', 'Confirm or submit work only after checking the roster or course scope.'] },
  { path: '/admin-dashboard', label: 'Administrator Dashboard', category: 'Portals', roles: ['administrator'], purpose: 'Coordinate school operations through pending reviews, alerts, records, and administrative shortcuts.', next: 'Resolve the highest-priority pending review before making new configuration changes.', steps: ['Review alerts and pending decisions.', 'Open the owning module for the record.', 'Publish or approve only after validating the underlying information.'] },
  { path: '/course-catalog', label: 'Course Catalog', category: 'Academic', roles: ['student', 'teacher', 'administrator'], purpose: 'Browse the institution’s available courses and their academic details.', next: 'Students can continue to registration; teachers use the catalog to select available offerings rather than create courses.', steps: ['Search by course name or code.', 'Check credits and semester availability.', 'Follow the role-specific action available on the course.'] },
  { path: '/course-registration', label: 'Course Registration', category: 'Academic', roles: ['student'], purpose: 'Submit your semester course selections for the institution’s review workflow.', next: 'Your registration remains subject to the configured credit and review rules.', steps: ['Choose the current academic period.', 'Select eligible courses within the credit rule.', 'Submit and track the registration status.'] },
  { path: '/course-registration-review', label: 'Registration Review', category: 'Academic', roles: ['administrator'], purpose: 'Review student course-registration requests against the academic and credit rules.', next: 'The student sees the resulting status and can respond according to the institution’s process.', steps: ['Filter by academic period and status.', 'Check student eligibility and credit totals.', 'Approve or reject with a clear decision.'] },
  { path: '/assessments', label: 'Assessments', category: 'Academic', roles: ['student', 'teacher'], purpose: 'Manage or review assessment information for courses in scope.', next: 'Teachers continue to the gradebook; students see the assessment situation permitted for their records.', steps: ['Select the course and assessment period.', 'Check the assessment type and weight.', 'Use the next role-specific grading or review action.'] },
  { path: '/gradebook', label: 'Gradebook', category: 'Academic', roles: ['teacher'], purpose: 'Enter and confirm marks for your assigned courses and the approved assessment types.', next: 'Teacher confirmation sends the assessment to administrator review; it does not publish the marks.', steps: ['Select the course and assessment.', 'Enter valid marks for registered students.', 'Save, review, and confirm when complete.'] },
  { path: '/grading-review', label: 'Grading Review and Publication', category: 'Academic', roles: ['administrator'], purpose: 'Review teacher-confirmed assessment marks and publish official results.', next: 'Publication makes the approved result visible to students and linked guardians.', steps: ['Filter to the academic period.', 'Inspect marks, absences, and confirmation state.', 'Publish only after the administrator review is complete.'] },
  { path: '/report-card', label: 'Report Card', category: 'Academic', roles: ['student', 'guardian'], purpose: 'View administrator-published semester results, GPA, credits, and course outcomes.', next: 'Use the universal Student bar to review the correct semester record.', steps: ['Choose the student in the universal Student bar.', 'Choose the academic year and semester.', 'Read the published result and assessment details.'] },
  { path: '/announcements', label: 'Announcements', category: 'Communication', roles: ['student', 'teacher', 'administrator', 'guardian'], purpose: 'Read or manage school-wide notices according to your role.', next: 'Follow any stated deadline or open the linked operational module when the announcement requires action.', steps: ['Check priority and publication status.', 'Read the full message.', 'Follow the linked action or acknowledge when requested.'] },
  { path: '/profile', label: 'User Profile', category: 'Account', roles: ['student', 'teacher', 'administrator', 'guardian'], purpose: 'Manage permitted personal account information and security actions.', next: 'Security actions may require a password change, MFA setup, or administrator review before completion.', steps: ['Review the current profile.', 'Use the permitted security or contact action.', 'Wait for review when the change is not immediately authoritative.'] },
  { path: '/guardian-engagement', label: 'Guardian Engagement', category: 'Guardian', roles: ['guardian'], purpose: 'Submit communication, appointment, acknowledgement, consent, and profile-change requests.', next: 'An administrator reviews the request and the resulting status appears in the page history.', steps: ['Use the universal Student bar when the request is student-specific.', 'Provide a clear reason or response.', 'Track the administrator decision or proposed next step.'] },
  { path: '/guardian-management', label: 'Guardian Management', category: 'Administration', roles: ['administrator'], purpose: 'Maintain guardian profiles and the relationships that authorize student-scoped access.', next: 'Linked guardians determine what student information the guardian portal can display.', steps: ['Search for the guardian record.', 'Check the student relationship before saving changes.', 'Review the resulting access scope.'] },
  { path: '/guardian-engagement-review', label: 'Guardian Engagement Review', category: 'Administration', roles: ['administrator'], purpose: 'Review communication, appointment, document, acknowledgement, consent, and profile-change requests.', next: 'A decision or response is sent back to the guardian and remains available in the request history.', steps: ['Filter to the request type and status.', 'Read the guardian message and linked-student scope.', 'Respond, approve, reject, propose, or publish with a clear note.'] },
  { path: '/account-management', label: 'Account Management', category: 'Administration', roles: ['administrator'], purpose: 'Manage account access, lifecycle settings, recovery actions, and audit history without deleting institutional records.', next: 'The user receives the security outcome and the action remains traceable in audit history.', steps: ['Verify the target account and role.', 'Enter a clear reason.', 'Confirm the access or recovery action.'] },
  { path: '/staff-management', label: 'Staff Management', category: 'Administration', roles: ['administrator'], purpose: 'Track teaching and non-teaching staff, attendance, employment status, and leave.', next: 'Teaching assignments and account access remain separate controlled workflows.', steps: ['Search before creating a staff record.', 'Choose the correct staff type.', 'Review attendance and leave records after saving.'] },
  { path: '/class-locations', label: 'Configure Locations', category: 'Course Management', roles: ['administrator'], purpose: 'Configure rooms and locations used by courses and class sessions.', next: 'A configured location becomes available to timetable and session workflows subject to booking rules.', steps: ['Create or select a location.', 'Check capacity and status.', 'Review timetable conflicts before use.'] },
  { path: '/audit-logs', label: 'Audit Logs', category: 'Administration', roles: ['administrator'], purpose: 'Review traceable administrative, security, publication, and workflow actions.', next: 'Use the record and target-user filters to investigate a specific decision or change.', steps: ['Set a date or actor filter.', 'Inspect the action and target.', 'Use the details to support a controlled follow-up.'] },
  { path: '/student-enrollment', label: 'Student Enrollment', category: 'Administration', roles: ['administrator'], purpose: 'Maintain student records and enrollment relationships used by academic workflows.', next: 'Enrollment changes affect the students available to registration, attendance, grading, and reports.', steps: ['Verify the student identity.', 'Choose the academic scope.', 'Review downstream registration and record implications.'] },
  { path: '/teacher-attendance', label: 'Teacher Attendance and Sessions', category: 'Teaching', roles: ['teacher'], purpose: 'Create class sessions, record the actual roster, and confirm delivered teaching.', next: 'Attendance is required before a scheduled session can be treated as completed teaching.', steps: ['Check the course, date, time, and location.', 'Mark the actual roster.', 'Save attendance before confirming completion.'] },
  { path: '/attendance-reports', label: 'Attendance Reports', category: 'Operations', roles: ['teacher', 'administrator'], purpose: 'Review attendance patterns and operational alerts for permitted classes or students.', next: 'Use the finding to follow the applicable student, guardian, or administrative process.', steps: ['Set the date and role scope.', 'Review absence and late patterns.', 'Open the relevant record before taking action.'] },
  { path: '/attendance-management', label: 'Attendance Management', category: 'Teaching', roles: ['teacher'], purpose: 'Review or manage attendance records for teaching work in scope.', next: 'Attendance changes remain subject to the existing session, roster, and justification rules.', steps: ['Select the correct session.', 'Check the student roster.', 'Save only the attendance actually observed.'] },
  { path: '/class-sessions', label: 'Class Sessions', category: 'Teaching', roles: ['student', 'teacher'], purpose: 'Review or manage class-session information according to the current role.', next: 'Teachers continue to attendance and completion; students use the information to attend the lesson.', steps: ['Check the date, course, and location.', 'Read the session status.', 'Follow the next role-specific action.'] },
  { path: '/timetables', label: 'Timetables', category: 'Course Management', roles: ['student', 'teacher', 'administrator', 'guardian'], purpose: 'Review or manage semester schedule occurrences according to role and publication state.', next: 'Teachers record attendance for delivered sessions; students and guardians use published schedules.', steps: ['Filter to the relevant dates.', 'Check course, teacher, and location.', 'Follow the role-specific completion or attendance action.'] },
  { path: '/calendar', label: 'Calendar', category: 'Operations', roles: ['student', 'teacher', 'administrator', 'guardian'], purpose: 'View date-filtered lessons, meetings, events, and operational deadlines permitted for the current role.', next: 'Open the owning module when a calendar item requires a submission, review, or attendance action.', steps: ['Choose the date range.', 'Read the event audience and source.', 'Open the related module when action is required.'] },
  { path: '/course-hours', label: 'Course Hours', category: 'Course Management', roles: ['administrator'], purpose: 'Set approved teaching-hour quotas for teacher-course offerings in the current semester.', next: 'Timetables measure progress against the quota; future excess sessions may be affected by a reduction.', steps: ['Select the offering and academic period.', 'Enter the approved whole-hour quota.', 'Review progress and additional-hours requests.'] },
  { path: '/school-events', label: 'School Events', category: 'Course Management', roles: ['administrator'], purpose: 'Create and publish school events that appear in permitted calendars and announcements.', next: 'Publication controls when the intended audience can see the event.', steps: ['Enter the event details and audience.', 'Check date and location.', 'Publish after reviewing the visibility.'] },
  { path: '/absence-justifications', label: 'Absence Justifications', category: 'Attendance', roles: ['student', 'administrator'], purpose: 'Submit or review explanations for student absences within the configured deadline.', next: 'The administrator decision or expiry determines the resulting attendance and follow-up state.', steps: ['Read the displayed deadline.', 'Submit a clear explanation or review the student submission.', 'Check the resulting status.'] },
  { path: '/teacher-absence-reports', label: 'Teacher Absence Reports', category: 'Attendance', roles: ['teacher', 'administrator'], purpose: 'Submit or review reports about teacher absences before scheduled teaching.', next: 'The report supports operational follow-up and does not itself reschedule a class.', steps: ['Select the scheduled session.', 'Provide a timely and clear report.', 'Track the administrator follow-up.'] },
  { path: '/financial-records', label: 'Financial Records', category: 'Finance', roles: ['administrator'], purpose: 'Manage class fee settings, invoices, manual payments, balances, and reconciliation records in whole-number XAF values.', next: 'After saving a ledger change, verify the resulting balance and receipt history.', steps: ['Verify the student, payer, and invoice.', 'Use positive whole-number XAF inputs.', 'Review the balance after saving a manual payment.'] },
  { path: '/participation-log', label: 'Participation Log', category: 'Teaching', roles: ['teacher'], purpose: 'Record permitted participation information for assigned teaching work.', next: 'Use participation records to support the existing academic and attendance context, not to replace official grades.', steps: ['Select the correct session or student scope.', 'Record the observed participation.', 'Save and review the resulting history.'] },
  { path: '/behavior-discipline', label: 'Behavior and Discipline', category: 'Student Support', roles: ['administrator', 'teacher', 'student', 'guardian'], purpose: 'Review or manage behavior information within the role’s permitted visibility and action scope.', next: 'Administrators control publication and guardian visibility; students and guardians respond only where the workflow requests it.', steps: ['Check the student and incident scope.', 'Read the severity, action, and visibility state.', 'Follow the role-specific review or acknowledgement action.'] },
]

export function moduleHelpForRoute(path, role) {
  const module = moduleCatalog.find((item) => item.path === path)
  if (!module) return null
  if (!module.roles.includes(role)) return null
  if (localHelpPaths.has(path)) return null
  const profile = roleProfiles[role]
  return {
    ...module,
    roleLabel: profile?.label || role,
    boundary: profile?.cannot?.[0] || 'Use only the actions permitted for your role.',
  }
}

export function modulesForRole(role) {
  return moduleCatalog.filter((module) => module.roles.includes(role))
}
