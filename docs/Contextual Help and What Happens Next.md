# Contextual Help and What Happens Next — Feature Conception

## A. Institutional purpose

**Feature name:** Contextual Help and What Happens Next UX Patch.

**Institutional problem:** The platform contains many completed workflows, but users may not understand the consequence of an action, the next actor in the process, or why a record is currently unavailable. This creates hesitation, repeated submissions, avoidable support requests, and incorrect use of otherwise valid features.

**Desired outcome:** Add concise, location-specific guidance at the point where a user is about to create, submit, approve, publish, acknowledge, or review a record. The guidance shall explain what the action does, what happens next, and where the user can see the resulting status.

**Who benefits and how?** Administrators receive clearer workflow consequences, teachers understand confirmation and review transitions, students understand registration and absence deadlines, and guardians understand communication, appointments, acknowledgements, consent, and profile-review transitions.

**What happens today without the system?** Users infer workflow consequences from labels, occasional status messages, or prior experience. The underlying workflow remains valid, but its meaning is not consistently explained before action.

## B. Actors and authority

| Actor | May create | May view | May edit | May approve/publish | May delete/archive |
|---|---|---|---|---|---|
| Administrator | Help text is displayed to the administrator; no new record authority is created. | All contextual guidance for authorized pages. | No help content from the user interface. | No change to existing approval authority. | No change to existing deletion or archive authority. |
| Teacher | Help text is displayed on teaching workflows. | Guidance for assigned workflows. | No help content from the user interface. | No change to grading or attendance authority. | No change to existing deletion authority. |
| Student | Help text is displayed on student workflows. | Guidance for the student's authorized workflows. | No help content from the user interface. | No change to publication authority. | No change to existing deletion authority. |
| Guardian | Help text is displayed on guardian workflows. | Guidance for linked-child and guardian-account workflows. | No help content from the user interface. | No change to review or approval authority. | No change to existing deletion authority. |

**Primary owner of the workflow:** The product interface and documentation maintainers.

**Actor who is affected but must not gain new authority:** Every application role. Contextual help explains existing authority; it does not grant authority.

## C. Workflow

**Trigger:** A user opens a page containing a complex workflow or reaches a form action that creates, submits, confirms, publishes, acknowledges, or requests administrator review.

**Preconditions:** The user is already authorized to view the page. Existing role, relationship, validation, and lifecycle rules remain authoritative.

**Normal flow:**

1. The page displays a short explanation of the purpose of the workflow.
2. A contextual help panel explains what the current action does and what happens next.
3. The user completes the existing form or action without a new confirmation step unless the original workflow already required one.
4. The existing success state shows the resulting status and the next location where the record can be reviewed.

**Alternate flow:** A user may dismiss or collapse the guidance if the page supports that interaction. Dismissing guidance does not change the workflow or record state.

**Failure flow:** Existing validation and error handling remains in place. Contextual help may explain how to recover, but it shall not hide or replace the actionable error.

**Forbidden flow:** Help text shall not imply that a guardian can approve a document, that a teacher can publish grades, that a student can bypass registration review, or that any user can change data merely because guidance is visible.

**Completion condition:** The user understands the effect of the action and the next workflow state without requiring a support request or opening a separate manual.

## D. Domain and data

**Institutional concepts involved:** Workflow status, actor authority, review, publication, acknowledgement, submission, approval, rejection, expiry, and recovery.

**New records required:** None.

**Existing records reused:** Existing forms, statuses, notifications, audit messages, page routes, and success/error states.

**Source of truth for each important fact:**

| Fact | Source of truth | Derived views |
|---|---|---|
| Who may perform an action | Existing backend role and relationship authorization | Page visibility and contextual explanation |
| What happens after submission | Existing route lifecycle and record status | “What happens next?” panel |
| Whether a record is pending, approved, rejected, published, or expired | Existing database record and API response | Status text and help explanation |
| Where a record can be reviewed | Existing frontend route and navigation | Contextual link or next-step text |

**Relationships:** No new relationships are created or changed.

**Historical data affected:** None.

**Can records be deleted? If not, what replaces deletion?** No new records exist. Existing deletion, archival, withdrawal, and cancellation rules remain unchanged.

## E. Lifecycle and rules

**Record states:** The patch explains existing states but does not create or transition them.

| Current state | Allowed next state | Actor | Required data | Notification? | Audit? |
|---|---|---|---|---|---|
| Draft or form open | Submitted or saved | Existing authorized actor | Existing form fields | Existing rules | Existing rules |
| Submitted | In Review, Approved, Rejected, Published, or Closed | Existing responsible actor | Existing workflow data | Existing rules | Existing rules |
| Published | Viewed or acknowledged | Existing authorized recipient | Existing publication or consent data | Existing rules | Existing rules |
| Pending | Approved, Rejected, Withdrawn, Expired, or Cancelled | Existing responsible actor | Existing decision or deadline data | Existing rules | Existing rules |

**Business rules:**

1. Contextual help shall explain existing rules and shall never replace backend validation.
2. Guidance shall identify the next responsible actor when a workflow leaves the current user's control.
3. Guidance shall distinguish viewing, submitting, confirming, approving, publishing, acknowledging, and withdrawing.
4. The patch shall remain reversible by reverting only the explicitly changed frontend files.

**Validation rules:** Existing validation rules remain authoritative. Help text shall not promise that invalid or unauthorized input will be accepted.

**Concurrency or duplicate rules:** None are introduced. Existing duplicate and idempotency rules remain unchanged.

**Period, ownership, or relationship scope:** Existing academic period, guardian-child, teacher-course, and role scopes remain unchanged.

## F. Visibility and privacy

**Sensitive information:** No new sensitive information is displayed. Help text shall use generic workflow descriptions and shall not contain student names, grades, balances, incident details, passwords, tokens, or personal contact information.

**Who may see the record?** Any user who can already view the page may see its contextual guidance. The help component shall not reveal the existence of records the user cannot access.

**What must never appear in notifications, search results, URLs, or error messages?** Contextual help shall not introduce sensitive data into notifications, search results, URLs, or errors.

**How is access checked by the backend?** No backend changes are required. Existing backend authorization remains the source of truth.

## G. Cross-module impact

- [ ] Authentication and role permissions. No dependency; existing route guards remain unchanged.
- [ ] Students and guardians. Guidance is added to student and guardian workflows without changing authority.
- [ ] Staff and teacher assignments. Guidance may explain teacher review and confirmation transitions.
- [ ] Academic periods and course offerings. Guidance may mention the selected academic period without changing period logic.
- [ ] Registration and enrollment. Registration submission and administrator review consequences are explained.
- [ ] Class sessions and locations. Session and location-conflict recovery guidance may be displayed.
- [ ] Attendance and participation. Attendance completion and absence-deadline guidance may be displayed.
- [ ] Assessments, grades, GPA, and report cards. Teacher confirmation and administrator publication consequences are explained.
- [ ] Behavior and discipline. Guardian acknowledgement consequences are explained without exposing incident details.
- [ ] Finance and payments. Manual finance record guidance may explain review and reconciliation status; CinetPay is not added.
- [x] Announcements and notifications. Guidance may direct users to existing notification or review locations.
- [ ] Search. No search behavior changes.
- [ ] Audit logs. No audit behavior changes.
- [x] Translation. New visible guidance strings must pass through the existing translation behavior where supported.
- [ ] Reporting and exports. No reporting behavior changes.

## H. Interface design

**Pages or views needed:** The patch shall use a reusable contextual-help component and place it on the highest-friction workflows: Guardian Engagement, Gradebook, Grading Review, Financial Records, Timetables, Course Hours, Teacher Attendance/Class Sessions, Absence Justifications, Staff Management, and Account Management.

**Forms and fields:** No fields are added. Help appears near existing form headings, action groups, or status panels.

**Tables, filters, and search behavior:** Unchanged.

**Empty states:** Existing empty states remain. Where appropriate, one sentence may explain what action populates the empty state.

**Success messages:** Existing success messages remain and may be followed by a concise next-step sentence.

**Actionable error messages:** Existing errors remain visible. Guidance may explain the recovery action without masking the error.

**Mobile behavior:** Help panels shall be one-column, readable on small screens, collapsible where space is limited, and shall not push primary actions below an excessive amount of text.

**Translation behavior:** Guidance strings shall be compatible with the existing English/French translation strategy. No new translation provider or database migration is required.

## I. API and database design

**API endpoints or operations:** None.

| Method | Path or operation | Actor | Input | Output | Errors |
|---|---|---|---|---|---|
| None | Frontend-only contextual guidance | Existing authorized user | None | Help text and next-step explanation | Existing page errors remain unchanged |

**Database change required?** No.

**Why is a migration necessary or unnecessary?** The patch only adds presentation guidance around existing workflow states and does not create, alter, or backfill records.

**Migration order:** None.

**Pre-application checks:** Not applicable.

**Backfill or data transformation:** None.

**Rollback or recovery plan:** Revert the named frontend files from the patch. No database rollback is required.

**Database constraints needed:** None.

## J. Notifications and audit

| Event | Recipients | Message summary | Link | Deduplication key | Audit action |
|---|---|---|---|---|---|
| None | None | Contextual help does not create notifications. | None | None | No new audit action. |

**Actions that require before/after audit data:** None. Existing business actions remain audited by existing middleware and route logic.

## K. Acceptance and release

**Normal acceptance test:** Open each selected workflow and confirm that the contextual explanation identifies the purpose, the next actor or state, and the location where the result can be reviewed.

**Forbidden-access test:** Confirm that the patch does not introduce a route, API call, action button, or permission change.

**Validation-failure test:** Submit existing invalid data and confirm that the original validation error remains visible and actionable.

**Concurrency or duplicate test:** Confirm that no new request or record is created by displaying or dismissing help.

**Historical-data test:** Confirm that existing records and statuses are unchanged.

**Mobile test:** Test the guidance panels on a narrow mobile viewport and confirm that primary actions remain reachable without horizontal overflow.

**Regression tests:** Run the existing frontend build and focused backend tests. Confirm no API helper, route, migration, or authentication behavior changes.

**Backend syntax/build/test commands:**

```text
npm --prefix frontend run build
npm --prefix backend test -- --grep "Guardian|Account-status|Release 1"
git diff --check
```

**Files intentionally changed:** A reusable contextual-help component and the explicitly selected frontend pages, plus this conception document if included in the patch documentation.

**Files intentionally not changed:** Backend routes, database migrations, Supabase schema, API helpers, authentication, authorization, notification logic, audit logic, and payment integrations.

**Deployment status:** Prepared for evaluation only; not merged, committed, pushed, or deployed until user approval.

## L. Change-impact statement

- [x] Addition: new contextual guidance without removing an existing capability.
- [x] Expansion: broader explanation of existing workflows.
- [ ] Correction: fixes behavior that contradicts an existing requirement.
- [ ] Replacement: new workflow replaces an old workflow by decision.
- [ ] Removal: existing behavior is intentionally eliminated.
- [x] Preservation: existing business behavior and authority must remain unchanged.
- [ ] Deferral: related capability is consciously postponed.

**Previous behavior:** Users completed existing workflows with limited point-of-action explanation.

**Requested behavior:** Users shall see concise explanations of what an action does and what happens next.

**Added behavior:** Reusable contextual help and next-step guidance in selected high-friction pages.

**Preserved behavior:** All business rules, APIs, database structures, permissions, statuses, notifications, audit behavior, and payment boundaries.

**Replaced or removed behavior:** None.

**Remaining gap:** A later usability release may add role-specific dashboards, universal grouped search, guided multi-step workflows, and a full accessibility review.

## Approval gate

1. The institutional problem is clear: users need workflow explanations.
2. The primary owner is clear: the product interface and documentation maintainers.
3. The source of truth is clear: existing backend workflows and record statuses.
4. Lifecycle and authority are preserved rather than changed.
5. Privacy boundaries are clear: no new sensitive information is exposed.
6. Cross-module effects are listed and limited to presentation and translation.
7. No migration is required because no database state changes.
8. Normal, forbidden, failure, concurrency, historical, mobile, and regression tests are defined.
9. The change is classified as an addition, expansion, and preservation.
10. The feature can be explained to an administrator as guidance that clarifies existing workflows without changing authority.
