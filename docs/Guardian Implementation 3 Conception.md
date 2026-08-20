# Guardian Implementation 3 Conception

## Purpose

Guardian Implementation 3 adds controlled two-way engagement between guardians and the school. It introduces communication requests, appointment requests, acknowledgement of significant disciplinary notices, administrator-published documents with consent responses, and guardian contact/profile change requests.

The release preserves the existing Guardian Implementations 1 and 2: linked-child authorization, attendance and absence justification, published academic results, manual finance visibility, timetable/calendar visibility, announcements, and notification read state. CinetPay and all online-payment behavior remain excluded.

This is a conception artifact. It defines institutional workflows before code and migration work begins.

---

# 1. Scope and release principles

## Included capabilities

1. Guardian-to-school communication requests with administrator review and response.
2. Guardian appointment requests with administrator proposal, confirmation, decline, cancellation, and completion states.
3. Guardian-visible significant disciplinary notices with acknowledgement and optional guardian response.
4. Administrator-published documents with guardian-specific visibility and consent/decline responses where required.
5. Guardian contact/profile change requests that require administrator approval before changing authoritative profile data.
6. Scoped notifications and audit records for all material transitions.
7. Responsive English/French guardian and administrator interfaces.

## Excluded capabilities

| Capability | Decision |
|---|---|
| CinetPay or online payments | Explicitly excluded. No provider API, checkout, token, payment button, or status polling. |
| Unmoderated guardian chat | Excluded. Communication is request-based and administrator-reviewed. |
| Automatic appointment confirmation | Excluded. Only an administrator may confirm an appointment. |
| Guardian editing of disciplinary truth | Excluded. Guardian can acknowledge and respond, not alter incident data. |
| Guardian publishing documents | Excluded. Only administrators publish documents and consent requests. |
| Direct guardian email-address change | Excluded from automatic update. Email changes require administrator approval and existing account-security rules. |
| Binary document upload by guardians | Deferred unless existing storage infrastructure is explicitly approved. Release 3 uses administrator-provided document references or existing stored files. |

## Release principles

1. **Relationship scope first:** Every child-specific operation starts from the authenticated guardian and an authoritative `student_guardian` relationship.
2. **Administrator approval for institutional truth:** Guardians submit requests; administrators approve, respond, confirm, publish, or reject.
3. **No destructive history edits:** Requests, decisions, acknowledgements, and profile changes remain historically traceable.
4. **Minimal sensitive disclosure:** Guardian notifications contain only the information necessary to act.
5. **No provider expansion:** CinetPay remains outside this release and must not appear in the implementation code or UI.

---

# 2. Institutional problem and outcome

Guardians can now monitor information but still have no controlled way to ask the school for help, request a meeting, acknowledge a serious disciplinary notice, complete a required consent action, or request correction of their contact information. Without a structured workflow, communication is lost in informal channels, appointments are difficult to track, and the school cannot prove that a guardian received an important notice.

After this release, a guardian can submit a traceable request, see its status, receive an administrator response, request or confirm the need for an appointment, acknowledge significant disciplinary notices, respond to consent requests, and submit profile corrections. The school retains final authority and a complete audit trail.

---

# 3. Actors and authority

| Actor | May create | May view | May edit | May approve/publish | May delete/archive |
|---|---|---|---|---|---|
| Administrator | Communication responses, appointment decisions, documents, consent requests, profile decisions | All permitted requests and linked records | Controlled request/document/profile records | Confirm appointments, publish documents, approve profile changes | Archive rather than destructively delete |
| Teacher | No new guardian requests by default | Relevant communication or appointment information only when assigned or explicitly shared | Existing teacher-owned academic/attendance records only | None in this release | Existing restrictions remain |
| Student | Existing student workflows remain | Own permitted requests and notices where supported | No guardian records | None | None |
| Guardian | Communication requests, appointment requests, acknowledgements, consent responses, profile-change requests | Own requests, linked-child notices, published documents, appointment decisions, and own profile requests | Own draft/request response before terminal decision; own notification read state | None | Cancel own open request when policy permits; no destructive delete |

**Primary workflow owner:** Administrator owns institutional decisions and published documents. Guardian owns request submission and acknowledgement/consent response.

**Actor affected but not granted new authority:** Teachers may be notified or included as operational participants but do not receive administrator approval rights by implication.

---

# 4. Workflows and lifecycle states

## 4.1 Communication request

### Normal flow

1. Guardian selects a linked child or chooses a general guardian-account subject.
2. Guardian selects a category, enters a subject and message, and submits the request.
3. System validates the guardian relationship and creates a `Submitted` request.
4. Administrators receive a deduplicated notification.
5. Administrator moves the request to `In Review`, writes a response, and marks it `Responded`.
6. Guardian sees the response and may close the request or request follow-up.
7. The system records every status transition and response timestamp.

### States

`Draft → Submitted → In Review → Responded → Closed`.

Alternative states are `Rejected`, `Cancelled`, and `Archived`.

Guardian may cancel only an open request before an administrator has responded. Administrators may reject or archive with a reason.

## 4.2 Appointment request

### Normal flow

1. Guardian selects a linked child, explains the purpose, and submits preferred date/time windows.
2. System creates a `Requested` appointment and notifies administrators.
3. Administrator reviews availability and either proposes a time, declines the request with a reason, or confirms an agreed time.
4. Guardian sees the proposal or confirmation and may accept, request another time, or cancel before the appointment.
5. A confirmed appointment may be marked `Completed` after the meeting or `No Show` according to administrative policy.
6. Material transitions create notifications and audit records.

### States

`Requested → Proposed → Confirmed → Completed`.

Alternative states are `Declined`, `Cancelled`, `Reschedule Requested`, and `No Show`.

Only administrators may confirm the final appointment time. The system must not place a confirmed appointment on the official calendar until the administrator has confirmed it.

## 4.3 Significant disciplinary acknowledgement

### Normal flow

1. An administrator records or approves a significant incident under the existing behavior workflow.
2. Administrator marks the incident as guardian-visible and optionally requires acknowledgement.
3. Linked guardians receive a minimal notification.
4. Guardian opens the permitted notice, acknowledges receipt, and may submit a response note.
5. The acknowledgement and response are stored without altering the incident’s severity, points, status, action, or resolution.
6. Administrator can view acknowledgement state and response through the review interface.

### States

Incident truth remains in the existing behavior lifecycle. The guardian acknowledgement sub-state is:

`Not Required → Pending → Acknowledged`.

A response may be attached to `Pending` or `Acknowledged`; it does not change the behavior incident state.

## 4.4 Documents and consent

### Normal flow

1. Administrator creates a document metadata record with title, description, document reference, audience, visibility, and optional linked student scope.
2. Administrator publishes it and marks whether guardian consent is required.
3. Linked guardians receive a notification and see the document in their portal.
4. Guardian opens the document reference and submits `Accepted`, `Declined`, or `Needs Clarification` when consent is required.
5. Administrator reviews responses and may request clarification or archive the document after its effective period.
6. Each response retains the guardian, child, document version, decision, timestamp, and optional note.

### States

Document: `Draft → Published → Archived`.

Consent response: `Pending → Accepted`, `Pending → Declined`, or `Pending → Needs Clarification → Accepted/Declined`.

A new document version must not overwrite prior consent evidence. If the content changes materially, the administrator publishes a new version and obtains a new response.

## 4.5 Guardian profile/contact change

### Normal flow

1. Guardian opens their profile and submits a proposed phone, address, relationship, or emergency-contact change.
2. System creates a `Pending` profile-change request containing before/after values and a reason.
3. Administrator reviews the request.
4. Administrator approves, causing the authoritative guardian profile to update, or rejects it with a reason.
5. Guardian receives the decision notification.
6. Email or login-identity changes require the existing account-security and duplicate-email safeguards and are not silently changed by this workflow.

### States

`Pending → Approved` or `Pending → Rejected`.

A guardian may withdraw a pending request if it has not been reviewed. Approved history remains immutable.

---

# 5. Domain model and proposed database changes

## New records required

Guardian Implementation 3 requires new durable records and therefore a new migration, proposed as **migration 030** after migration 029.

| Record | Purpose |
|---|---|
| `guardian_communication_request` | Traceable guardian-to-school request, administrator response, status, and audit timestamps. |
| `guardian_appointment_request` | Requested/proposed/confirmed meeting time and lifecycle. |
| `guardian_document` | Administrator-published document metadata, reference, audience, version, and consent requirement. |
| `guardian_document_response` | Guardian/child-specific consent or acknowledgement response tied to a document version. |
| `guardian_profile_change_request` | Before/after contact changes awaiting administrator approval. |

## Existing records extended

The existing `behavior_incident` record should gain guardian-visibility and acknowledgement fields only if the current schema has no separate guardian-notice table. Preferred fields are:

- `guardian_visible` boolean, default false.
- `guardian_acknowledgement_required` boolean, default false.
- `guardian_acknowledged_at` timestamptz.
- `guardian_acknowledged_by` uuid referencing `user_account`.
- `guardian_response_note` text with a controlled maximum length.

If a separate notice table is chosen during system inspection, it must reference the incident and preserve the same privacy and history rules. Do not duplicate the incident’s severity, points, or resolution as independent truth.

## Source of truth

| Fact | Source of truth | Derived view |
|---|---|---|
| Guardian identity | `guardian` and `user_account` | Profile and request owner |
| Linked child | `student_guardian` | Request selector and authorization |
| Communication status | `guardian_communication_request` | Guardian/admin request list |
| Appointment decision | `guardian_appointment_request` | Appointment cards and notifications |
| Disciplinary incident | Existing `behavior_incident` | Guardian-visible notice projection |
| Guardian acknowledgement | Incident acknowledgement fields or notice table | Administrator review state |
| Document publication | `guardian_document` | Published document list |
| Consent decision | `guardian_document_response` | Consent dashboard and admin review |
| Authoritative contact profile | `guardian` | Approved profile view |
| Proposed contact change | `guardian_profile_change_request` | Pending request review |

---

# 6. Privacy and access control

A guardian may access only:

1. Communication and appointment requests created by that guardian.
2. Documents published for guardians or for a linked child.
3. Disciplinary notices explicitly marked guardian-visible for a linked child.
4. Consent tasks for a linked child or guardian-wide document.
5. Their own profile and profile-change requests.

A guardian must not access another guardian’s requests, another student’s disciplinary notice, an administrator’s internal response notes before publication, document drafts, hidden incident data, or profile changes submitted by another user.

All child-specific routes must perform the relationship check on the backend. The browser’s selected child is a UI convenience and is never an authorization credential.

Disciplinary notice bodies must use minimum necessary information. Full internal descriptions, staff notes, witnesses, evidence, security details, and other students’ identities are not exposed automatically.

Document references must be access-controlled. If the document is hosted externally, the stored reference must not be a privileged unprotected administrative URL. If existing project storage is used later, use authenticated or time-limited access rather than public secrets embedded in the frontend.

---

# 7. API and database design

| Method | Operation | Actor | Input | Output | Errors |
|---|---|---|---|---|---|
| `GET` | Guardian communication requests | Guardian | Optional status/child filters | Own requests and responses | 401/403 |
| `POST` | Create communication request | Guardian | Child, category, subject, message | `Submitted` request | 400/403 |
| `PATCH` | Cancel or close communication request | Guardian | Request ID, action | Updated request | 403/404/409 |
| `GET` | Administrator communication review | Administrator | Status/search filters | All permitted requests | 401/403 |
| `POST` | Administrator communication response | Administrator | Request ID, response, next status | Updated request | 400/403/409 |
| `GET` | Guardian appointment requests | Guardian | Optional status/child filters | Own appointment requests | 401/403 |
| `POST` | Create appointment request | Guardian | Child, purpose, preferred windows | `Requested` appointment | 400/403 |
| `POST` | Administrator appointment decision | Administrator | Proposed time/status/note | Updated appointment | 400/403/409 |
| `GET` | Guardian disciplinary notices | Guardian | Linked child filter | Guardian-visible incident projections | 401/403 |
| `POST` | Acknowledge disciplinary notice | Guardian | Incident ID, optional response note | Acknowledgement state | 400/403/404/409 |
| `GET` | Guardian documents and consent tasks | Guardian | Optional child/status filters | Published documents and own responses | 401/403 |
| `POST` | Submit document consent | Guardian | Document/version ID, child, decision, note | Response record | 400/403/409 |
| `GET` | Administrator consent review | Administrator | Document/status/child filters | Response summaries | 401/403 |
| `GET` | Own guardian profile | Guardian | None | Current authoritative profile | 401/403 |
| `POST` | Submit profile change request | Guardian | Proposed fields and reason | `Pending` request | 400/409 |
| `GET` | Administrator profile-change review | Administrator | Status/search filters | Pending/history requests | 401/403 |
| `POST` | Approve/reject profile change | Administrator | Request ID, decision, reason | Updated request and profile if approved | 400/403/409 |

## Migration 030 requirements

The migration must include foreign keys, controlled status checks, bounded text fields, timestamps, immutable decision evidence, indexes for guardian/status and administrator review, and uniqueness where required for one response per guardian/child/document version.

The migration must not alter payment-provider configuration or add CinetPay fields.

## Rollback and recovery

Application rollback must leave submitted requests, acknowledgements, consent responses, and profile-change history intact. If migration 030 is rolled back, dependent code must be rolled back first. Destructive down-migrations should not remove acknowledged or approved history without an explicit backup and recovery procedure.

---

# 8. Interface design

## Guardian views

1. **Engagement dashboard:** pending requests, appointments, acknowledgements, consent tasks, and profile-change status.
2. **Communication requests:** create request, filter status, read administrator responses, cancel or close permitted requests.
3. **Appointments:** submit preferred time windows, view proposals and decisions, cancel or request reschedule according to policy.
4. **Disciplinary notices:** view minimum necessary notice, acknowledge, and submit a response note.
5. **Documents and consent:** view published documents, open references, and submit a response.
6. **Profile requests:** view current profile and submit contact changes for approval.

## Administrator views

1. Communication review queue with status, category, child, guardian, response, and audit history.
2. Appointment review queue with proposed time, conflict review, decision, and notification action.
3. Guardian-visible discipline acknowledgement status within the existing behavior review page.
4. Document publication and consent-response management.
5. Guardian profile-change review queue with before/after comparison and approval reason.

## Interface rules

Primary actions use the existing purple gradient `.btn-primary`. Secondary actions use `.btn-secondary`; rejection or cancellation uses `.btn-danger` only when appropriate. No CinetPay or online-payment actions appear.

All views need loading, empty, validation-error, authorization-error, and success states. Guardian pages must remain usable on narrow mobile screens without horizontal scrolling. Status labels and dates must use the established translation and formatting behavior.

---

# 9. Notifications and audit

| Event | Recipient | Notification summary | Audit |
|---|---|---|---|
| Communication submitted | Administrators | New guardian request received | Submission action |
| Communication answered | Guardian | Administrator responded to request | Response action |
| Appointment requested | Administrators | New appointment request received | Submission action |
| Appointment proposed/confirmed/declined | Guardian | Appointment decision and next action | Decision action |
| Disciplinary notice published | Linked guardian | Significant school notice requires attention | Publication action |
| Disciplinary notice acknowledged | Administrators | Guardian acknowledged notice | Acknowledgement action |
| Document published | Linked guardian/audience | New document or consent task available | Publication action |
| Consent submitted | Administrators | Guardian response recorded | Response action |
| Profile change submitted | Administrators | Contact change awaits review | Submission action |
| Profile change approved/rejected | Guardian | Profile request decision | Decision action |

Notifications must be deduplicated with event keys. Bodies must not contain passwords, MFA data, tokens, provider secrets, full private disciplinary narratives, or unrelated students’ information.

---

# 10. Acceptance criteria

## Communication

1. Guardian can submit a request for a linked child.
2. Administrator sees the request in a review queue and can respond.
3. Guardian sees the response and request status.
4. Unrelated guardians cannot read or change the request.
5. Status transitions and responses are audited.

## Appointments

1. Guardian can submit preferred time windows for a linked child.
2. Administrator can propose, confirm, decline, or cancel according to the lifecycle.
3. Guardian can see the decision and receive a notification.
4. A guardian cannot confirm an appointment unilaterally.
5. Appointment history is preserved.

## Disciplinary acknowledgement

1. Only guardian-visible significant notices are returned.
2. Guardian can acknowledge an authorized notice once.
3. Guardian response does not change incident severity, points, action, or resolution.
4. Administrator can see acknowledgement and response state.
5. A guardian cannot read another child’s incident.

## Documents and consent

1. Administrator can publish a document for guardians or a linked child.
2. Guardian sees only published permitted documents.
3. Guardian can submit one response per document version and child.
4. Repeated or conflicting responses are rejected safely.
5. A new version requires a new response without deleting the previous evidence.

## Profile changes

1. Guardian can view their own current profile.
2. Guardian can submit a bounded contact change request.
3. Administrator can approve or reject with a reason.
4. Approval updates the authoritative profile exactly once.
5. Email/account-identity changes remain subject to duplicate-email and security safeguards.

## Regression and exclusion

1. Guardian Implementations 1 and 2 remain functional.
2. Student, teacher, and administrator role boundaries remain unchanged.
3. No CinetPay reference, payment token, checkout action, or provider API call appears in Implementation 3 files.
4. No credentials appear in source, tests, documents, ZIP archives, or Git instructions.
5. The frontend build and focused backend tests pass.

---

# 11. Change-impact classification

- **Addition:** Adds controlled guardian engagement workflows and administrator review queues.
- **Expansion:** Extends existing notifications, behavior, profile, and audit capabilities.
- **Correction:** Corrects any existing guardian-facing route that exposes records without relationship checks.
- **Preservation:** Existing attendance, grading, finance, timetable, calendar, announcement, and account-security behavior remains authoritative.
- **Deferral:** CinetPay, binary guardian uploads, unmoderated chat, and automatic appointments remain deferred.

## Approval gate result

The institutional problem, actor authority, lifecycle states, privacy boundaries, data sources, migration requirement, notifications, acceptance tests, and CinetPay exclusion are defined. Implementation may proceed within this scope.
