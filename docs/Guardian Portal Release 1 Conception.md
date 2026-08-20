# Guardian Release 1 Conception

## Purpose

Guardian Release 1 adds a practical, read-and-respond portal for guardians linked to one or more students. It consolidates information that guardians already need to receive from the school—attendance, absence-justification status, published academic results, important events, and notifications—without giving guardians authority over academic, attendance, financial, or disciplinary truth.

This document is a conception artifact. It defines institutional behavior before implementation. It authorizes the first Guardian Portal release but does not authorize unrelated payment, messaging, document-management, or guardian-profile expansions.

## Release scope

Guardian Release 1 includes:

1. A guardian dashboard with linked children and summary cards.
2. A child switcher for guardians linked to multiple students.
3. Attendance history and attendance summary for linked students.
4. Absence-justification status and guardian submission before the administrator-defined deadline.
5. Published individual assessment marks and available final-grade/GPA information.
6. The guardian’s existing scoped notification inbox, including announcements, attendance events, report-card events, and significant disciplinary notifications.
7. Responsive mobile and desktop behavior, including clear empty, loading, and error states.

The release does not include manual or CinetPay payments, guardian-to-school chat, appointment scheduling, document uploads, consent forms, editing of student profiles, editing of grades or attendance, or direct exposure of full disciplinary case records.

---

# A. Institutional purpose

## Institutional problem

Guardians currently have no consolidated place to monitor the students entrusted to them. Information is separated across attendance, grading, absence-justification, announcements, and notification workflows. A guardian may therefore miss an attendance problem, fail to submit a justification before its deadline, or remain unaware that report-card marks have been published.

## Desired outcome

A guardian should be able to sign in, select a linked child, understand the child’s current academic and attendance situation, respond to an absence when permitted, and see school notifications without contacting an administrator for every routine update.

## Benefits

| Beneficiary | Benefit |
|---|---|
| Guardian | Receives one reliable view of linked children and can respond to absence records within the allowed period. |
| Student | Gains timely family awareness of attendance, published results, and important school notices. |
| Administrator | Reduces repetitive status questions while retaining authority over publication, review, and corrections. |
| Teacher | Does not receive a new grading or attendance workload; existing records and publication rules remain authoritative. |

## Current behavior without this release

A guardian account and guardian-student relationship may exist, and the system may already generate notifications, but the guardian experience is not consolidated into a dedicated portal. The release expands access and presentation without creating a second source of truth.

---

# B. Actors and authority

| Actor | May create | May view | May edit | May approve/publish | May delete/archive |
|---|---|---|---|---|---|
| Administrator | Guardian relationships, attendance, grades, announcements, review decisions | All permitted institutional records | Controlled administrative records | Absence decisions, academic publication, announcements | Only through existing controlled archive/correction workflows |
| Teacher | Attendance and grades through existing teacher workflows | Assigned students and courses | Records within existing teacher authority | Cannot publish grades or guardian notifications as administrator | Existing teacher restrictions remain |
| Student | Own absence justification | Own permitted records and published grades | Own profile/security actions only | None | None |
| Guardian | Absence justification for a linked student before the deadline | Linked children’s profiles, attendance, justification status, published marks, available final results, and own notifications | Own justification submission and notification read state | None | None |

**Primary owner of the workflow:** Administrator owns the institutional records and publication decisions. Guardian owns only the act of submitting an absence explanation for a linked child.

**Actor affected but not granted new authority:** Teachers and students remain subject to the existing attendance, grading, and publication rules. Guardians do not gain authority to alter those records.

---

# C. Workflow

## Trigger

A guardian signs in and opens the Guardian Portal, or a notification links the guardian to an attendance, published-result, or school-notice view.

## Preconditions

1. The authenticated account has role `guardian`.
2. The guardian has a valid row in `guardian`.
3. The target student is linked through `student_guardian`.
4. Published-result access is limited to records already made visible by the existing administrator publication workflow.
5. Absence submission is allowed only while the attendance record is absent and its deadline has not expired.

## Normal flow

1. The backend resolves the authenticated guardian and retrieves only linked students.
2. The portal displays linked children and selects the first child or the previously selected child when still authorized.
3. The portal retrieves dashboard summaries for that child: attendance, absence justifications, published marks/final results, and unread notifications.
4. The guardian selects a child or a dashboard section.
5. The guardian reviews attendance and opens an absent record.
6. If the record is within its deadline, the guardian submits a justification explanation.
7. The system records the submission against the attendance record and displays `Submitted`.
8. The administrator reviews the submission using the existing review workflow.
9. The guardian later sees the resulting approved, rejected, unjustified, or expired state through the portal and notification inbox.

## Alternate flow

If a guardian has multiple children, the portal shows a child switcher. Each child view is reloaded using the selected student identifier, but the backend independently verifies that the guardian-student relationship exists.

If no linked children exist, the portal shows an actionable empty state instructing the guardian to contact an administrator. It must not display institution-wide student data.

If no grades have been published, the academic section states that results are not yet available. It must not expose teacher drafts or unpublished marks.

## Failure flow

The system returns an actionable error when the selected child is not linked, when a justification deadline has expired, when the attendance record is no longer absent, or when the notification/record query fails. The frontend preserves the selected child only if the backend confirms that the child remains authorized.

## Forbidden flow

A guardian must not:

- View another student by changing a URL, query parameter, or request body.
- Submit or review a justification for an unlinked student.
- View unpublished academic records or administrator-only grade-review data.
- Edit attendance, scores, final grades, student enrollment, timetable entries, behavior incidents, or financial records.
- Mark another user’s notification as read.

## Completion condition

The guardian can see the authorized child data, submit a valid justification when permitted, and observe the resulting status without any unauthorized record exposure or mutation of institutional truth.

---

# D. Domain and data

## Institutional concepts involved

Guardian account, linked student, attendance record, absence-justification lifecycle, academic record, final grade, academic period, announcement, user notification, and notification read state.

## New records required

No new database records are required for Release 1. The portal is a role-scoped projection over existing records. A new migration is unnecessary unless implementation discovers that the deployed schema differs from the existing migration history.

## Existing records reused

| Record | Use in Guardian Release 1 |
|---|---|
| `user_account` | Authenticated identity and role. |
| `guardian` | Maps the logged-in account to a guardian profile. |
| `student_guardian` | Authoritative guardian-to-student relationship. |
| `student` | Child identity and display information. |
| `attendance` | Attendance history and absence-justification fields added by the timetable/absence migration. |
| `absence_policy_setting` | Administrator-defined justification deadline. |
| `academic_record` | Individual marks, filtered to administrator-published records. |
| `final_grade` | Computed score, letter grade, and GPA information already derived by grading workflows. |
| `assessment` and `course` | Assessment, course, academic-year, semester, and weight context. |
| `announcement` | Published school notices addressed to guardians or all users. |
| `user_notification` | Guardian-specific inbox, read state, links, and deduplication. |

## Sources of truth

| Fact | Source of truth | Derived views |
|---|---|---|
| Guardian identity | `guardian.user_id` | Portal header and profile summary |
| Linked children | `student_guardian` | Child switcher and dashboard child cards |
| Student name and basic profile | `student` | Child summary |
| Attendance state | `attendance` linked to `class_session` | Counts, percentages, and history |
| Justification deadline/status | Attendance justification columns plus `absence_policy_setting` | Submission form and status timeline |
| Published assessment mark | `academic_record.published = true` | Published results table |
| Computed course result/GPA | `final_grade`, generated by grading workflow | Academic summary cards |
| Guardian notification | `user_notification` | Notification inbox and unread count |
| Published school notice | `announcement` plus generated notification | Notice cards and notification links |

## Relationships

A guardian account maps to one `guardian` row. A guardian may link to many students through `student_guardian`. A student may have multiple guardians. Every dashboard request must begin from the authenticated guardian and traverse this relationship; accepting a raw `student_id` is never sufficient authorization.

## Historical data

No historical records are rewritten. The portal reads existing attendance, grading, announcement, and notification history. A guardian justification submission updates only the existing permitted attendance-justification fields through the established workflow.

## Deletion policy

The portal does not delete records. Notification read state may be updated through the existing notification operation. Attendance, grades, and relationships remain subject to their existing administrator-controlled correction or archive policies.

---

# E. Lifecycle and rules

## Absence-justification states

| Current state | Allowed next state | Actor | Required data | Notification? | Audit? |
|---|---|---|---|---|---|
| `PENDING` | `SUBMITTED` | Guardian or student | Non-empty explanation within deadline | Existing workflow may notify administrator | Record submission action |
| `SUBMITTED` | `APPROVED` | Administrator | Review decision | Existing notification policy | Record review decision |
| `SUBMITTED` | `UNJUSTIFIED` | Administrator | Review decision and optional note | Existing rejection/discipline notification | Record review decision |
| `PENDING` | `EXPIRED` or existing expiry outcome | Maintenance/access workflow | Deadline elapsed | Existing expiry notification policy | Record expiry action where supported |

The guardian portal does not perform administrator review and does not invent a new status that conflicts with the existing attendance justification states.

## Business rules

1. The guardian-student relationship is the mandatory authorization boundary for every child-specific request.
2. Guardians see only published assessment records. Unpublished teacher work and administrator review information remain hidden.
3. A guardian may submit a justification only for an absent attendance record that is linked to the selected child and is before the stored deadline.
4. A justification must contain a meaningful explanation and must satisfy the existing maximum length validation.
5. A guardian cannot submit a second conflicting justification after review or after the deadline.
6. The dashboard is a derived view and never becomes a source of truth for attendance, grades, or notifications.
7. Guardian notifications must be scoped to the authenticated user and must not include sensitive details in titles, URLs, or error messages.
8. The existing academic year and semester model remains unchanged.

## Validation rules

Student identifiers and attendance identifiers must be UUIDs. Text must be trimmed, non-empty, and within the established maximum. Date and period filters must use the existing validation helpers. A child selector must reject unauthorized identifiers with a safe not-found or forbidden response that does not disclose relationship details.

## Concurrency and duplicate rules

The existing attendance uniqueness rule remains authoritative. The justification update must target the specific attendance record and preserve its current status/deadline conditions. Repeated notification generation is protected by existing `event_key` uniqueness. Repeated submissions after review or expiry must fail safely rather than overwrite the decision.

## Scope boundaries

All child data is scoped to the authenticated guardian’s relationships. Academic results are additionally scoped by publication state. Notifications are scoped by `user_id`. No institution-wide search or cross-child aggregation may bypass these boundaries.

---

# F. Visibility and privacy

## Sensitive information

Student personal information, attendance history, academic results, absence explanations, disciplinary notification titles, and notification links are sensitive. The portal must not expose report-card drafts, teacher notes, administrator review metadata, internal user identifiers beyond necessary UI state, or unrelated students.

## Permitted visibility

A guardian may see only linked children, published results for those children, attendance and justification status for those children, and notifications addressed to the guardian account. A guardian may see a high-level notification about a significant disciplinary event but not the full internal case record in Release 1.

## Prohibited exposure

Student identifiers must not be treated as secrets in URLs, but they must never grant access on their own. Error messages must not reveal whether an unrelated student exists or whether another guardian is linked. Notification bodies must contain only the minimum information needed to prompt the guardian to open the permitted portal view.

## Backend access check

Every child-specific controller resolves the guardian row from `req.user.user_id`, queries `student_guardian`, and verifies the requested student is in the resulting set before querying or mutating any child record. Frontend hiding is supplementary and cannot replace this check.

---

# G. Cross-module impact

| Module | Exact dependency |
|---|---|
| Authentication and roles | Add guardian-only portal navigation and require authenticated `guardian` role on the new operations. Existing account lifecycle and security enforcement remains active. |
| Students and guardians | Reuse `guardian`, `student`, and `student_guardian` as the relationship and profile sources of truth. |
| Attendance | Read scoped attendance and expose the existing absence-justification submission workflow for linked students. |
| Assessments, grades, GPA, and report cards | Read only administrator-published assessment records and available final-grade summaries; do not alter teacher/admin publication. |
| Announcements and notifications | Reuse published guardian/all announcements and the guardian’s `user_notification` inbox. |
| Behavior and discipline | Preserve existing significant-incident notifications; do not add full incident case access in Release 1. |
| Academic periods | Preserve existing academic-year and semester filters for results and dashboard summaries. |
| Audit logs | Record guardian justification submissions and notification read operations if the existing notification implementation already audits them; do not create redundant audit tables. |
| Translation | All new labels, statuses, errors, and empty states must use the existing translation mechanism and remain available in English and French. |
| Reporting and exports | Deferred. Guardian Release 1 does not add an export function. |

---

# H. Interface design

## Pages and views

1. `GuardianPortal.vue` as the guardian landing page.
2. A responsive child switcher at the top of the portal.
3. Dashboard summary cards for attendance, pending absence actions, published results, and unread notifications.
4. Attendance section with summary and recent history.
5. Absence-justification section with status badges, deadline, explanation form, and submission confirmation.
6. Published-results section with course, assessment, score, grade, semester, and available GPA/final-grade summary.
7. Notification section using the existing notification interaction patterns.

## Interaction behavior

The selected child must remain visible on desktop and mobile. Child-specific sections should not require horizontal scrolling. Tables must collapse into stacked cards or responsive rows on narrow screens. Primary actions such as submitting a justification must use the shared purple `.btn-primary` style; secondary actions use `.btn-secondary`; destructive actions are not part of this portal.

## Empty and error states

The portal must distinguish between no linked children, no attendance records, no open justification actions, no published grades, and no notifications. Each state must explain what the guardian can do next. Network and authorization errors must be actionable without revealing restricted records.

## Translation

New UI text must use the existing translation helper or translation keys. English and French labels must preserve the same meaning for attendance statuses, justification states, grades, deadlines, notifications, and empty states.

---

# I. API and database design

## Planned operations

| Method | Path or operation | Actor | Input | Output | Errors |
|---|---|---|---|---|---|
| `GET` | `/guardian/children` | Guardian | None | Linked child summaries | 401/403; empty list if no links |
| `GET` | `/guardian/dashboard` | Guardian | Optional `student_id`, academic year, semester | Child summary, attendance summary, open justification count, published result summary, unread notification count | 401/403/404 for unauthorized child |
| `GET` | `/guardian/children/:studentId/attendance` | Guardian | Student UUID and optional date/period filters | Scoped attendance history and summary | 401/403/404; validation errors |
| `GET` | `/guardian/children/:studentId/absence-justifications` | Guardian | Student UUID and optional status | Scoped absent records and deadlines | 401/403/404 |
| `POST` | `/guardian/children/:studentId/absence-justifications/:attendanceId` | Guardian | Explanation text | Updated justification record | 400/403/404/409 |
| `GET` | `/guardian/children/:studentId/results` | Guardian | Student UUID and optional period | Published assessment records and available final-grade summaries | 401/403/404 |
| `GET` | Existing notification inbox operation | Guardian | Existing pagination/read filters | Own notifications only | Existing errors |
| `PATCH` | Existing notification read operation | Guardian | Notification UUID | Updated own notification | 401/403/404 |

The final endpoint paths may be consolidated during implementation if existing route conventions already provide an equivalent operation, but the authorization and output boundaries above are mandatory.

## Database change required

**No new migration is planned.** Existing migrations provide the necessary guardian relationship, attendance justification, grading publication, announcements, and notification records. The implementation must verify that migration 028 and the previously applied notification/grading migrations are present before deployment.

If implementation discovers that the deployed schema lacks a required existing column, stop and create a separate migration rather than silently changing the schema in application code.

## Rollback and recovery

Rollback consists of reverting the frontend route and new backend route changes. Existing records remain untouched. Any guardian justification submitted through the release remains valid under the existing attendance workflow and is not deleted by a code rollback.

---

# J. Notifications and audit

| Event | Recipients | Message summary | Link | Deduplication key | Audit action |
|---|---|---|---|---|---|
| Published guardian/all announcement | Linked guardian users in the existing audience flow | Notice title and short body | Existing announcements path | Existing announcement event key | Existing announcement audit |
| Significant disciplinary incident | Linked guardian users | High-level action recorded; no private case details | Existing permitted notification path | Existing incident event key | Existing incident audit |
| Absence justification submitted | Administrator and/or existing workflow recipients | A linked student has submitted an explanation | Existing review path | Attendance-specific event key if supported | Guardian submission action |
| Absence justification approved/rejected | Linked guardian and student when existing workflow supports it | Decision and date; include review note only when safe | Guardian portal | Attendance-specific decision key | Administrator review audit |
| Report card or published mark | Linked guardian users | Results are available for a linked student | Guardian portal results view | Student/period/result publication key | Existing grade publication audit |

Notifications must not contain passwords, MFA data, session tokens, service credentials, full sensitive disciplinary narratives, or another guardian’s information.

---

# K. Acceptance and release

## Normal acceptance tests

1. A guardian with two linked students can sign in and switch between both children.
2. The dashboard returns only the selected linked child’s summaries.
3. Attendance history and summary values match the underlying attendance records.
4. A guardian can submit a valid absence justification before the deadline.
5. The submitted state appears immediately after a successful response.
6. Published assessment marks and available final-grade/GPA results are visible.
7. Unread guardian notifications are visible and can be marked read through the existing scoped operation.
8. English and French labels render through the translation system.

## Forbidden-access tests

1. A guardian cannot view an unlinked student by changing `student_id` in the URL or query string.
2. A guardian cannot submit a justification for an unlinked student or attendance record.
3. A guardian cannot view unpublished assessment records.
4. A guardian cannot read another user’s notifications.
5. A student, teacher, or unauthenticated user cannot call guardian-only operations.

## Validation and failure tests

1. Empty or overlong justification text is rejected.
2. A justification after its deadline is rejected without changing the record.
3. A non-absent attendance record cannot receive a justification.
4. A reviewed justification cannot be overwritten by a guardian.
5. Missing guardian relationship returns a safe empty or not-found result without data leakage.

## Regression tests

Existing administrator absence review, student absence submission, teacher attendance, administrator grade publication, notification delivery, account lifecycle enforcement, and mobile navigation must remain functional.

## Verification commands

```text
node --check on each changed backend JavaScript file
npm --prefix backend test -- --grep Guardian
npm --prefix backend test -- --grep Account-status
npm --prefix frontend run build
git diff --check
```

## Intended implementation files

Expected additions or changes include a guardian scope helper or extension to the existing enrollment-scope library, a guardian route, app route registration, frontend API helpers, guardian store or page state, router role handling, sidebar navigation, `GuardianPortal.vue`, translation keys, focused backend tests, focused frontend/build verification, and this conception documentation.

## Intentionally unchanged

The release will not change payment migrations, CinetPay behavior, course creation rules, teacher-course assignment rules, timetable data, class-session ownership, grade calculation formulas, administrator publication authority, or the existing database relationship model.

---

# L. Change-impact statement

- **Expansion:** Adds a guardian-facing view over existing institutional records.
- **Addition:** Adds a consolidated portal, child switcher, and guardian-specific read APIs.
- **Preservation:** Preserves existing guardian relationships, attendance, grading, publication, notification, and audit behavior.
- **Correction:** Corrects any existing guardian route that currently accepts a child identifier without enforcing the authenticated guardian relationship.
- **Deferral:** Payments, chat, appointments, documents, consent, and detailed disciplinary case access remain deferred.

## Previous behavior

Guardians have limited or fragmented access to data and notifications and do not have a unified first-class portal.

## Requested behavior

Guardians receive a secure, responsive, bilingual portal for linked-child monitoring and absence response.

## Remaining gap after Release 1

Guardian payments and receipts, direct communication, appointments, document consent, and richer family engagement remain future releases.

## Approval gate result

The institutional problem, actors, sources of truth, authority boundaries, privacy rules, cross-module impact, migration decision, acceptance tests, and change classification are defined. Implementation may proceed within the Release 1 scope above.
