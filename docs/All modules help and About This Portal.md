# Feature Conception: All-Modules Help and Role-Aware About This Portal

## A. Institutional purpose

**Feature name:** All-Modules Contextual Help and Role-Aware About This Portal.

**Institutional problem:** The platform now contains many workflows for administrators, teachers, students, and guardians. Users can reach a module but may not understand what an action does, what happens next, which role owns the next step, or which actions are unavailable to them. Help coverage is also inconsistent because only selected high-friction pages currently show contextual guidance.

**Desired outcome:** Every role-relevant module should provide concise point-of-action help controlled by the existing global question-mark toggle. Every authenticated user should also have access to a small About This Portal page that explains the purpose of the current portal, the user’s available modules, their responsibilities, their authority limits, and the normal next steps in the main workflows.

**Who benefits and how?** Administrators receive clearer explanations of approval and publication consequences. Teachers understand the sequence for attendance, grading, sessions, and course assignments. Students understand registration, assessment, attendance, results, and justification deadlines. Guardians understand child-scoped requests, notices, documents, consent, fees, and appointments.

**What happens today without the system?** Users infer workflow rules from labels, existing page descriptions, or administrator explanations. This creates inconsistent understanding and increases the risk of submitting incomplete requests or expecting an action to take effect immediately when it actually requires review or publication.

## B. Actors and authority

| Actor | May create | May view | May edit | May approve/publish | May delete/archive |
|---|---|---|---|---|---|
| Administrator | None through help; may use existing module capabilities | All help and own role guidance | Help preference only | None through help | None through help |
| Teacher | None through help; may use existing teacher capabilities | Help for teacher-visible modules and own About page | Help preference only | None through help | None through help |
| Student | None through help; may use existing student capabilities | Help for student-visible modules and own About page | Help preference only | None through help | None through help |
| Guardian | None through help; may use existing guardian capabilities | Help for guardian-visible modules and own About page | Help preference only | None through help | None through help |
| Other actor | None | Only if a future role is explicitly supported | Help preference only | None | None |

**Primary owner of the workflow:** The product and school administration own the accuracy of the role descriptions and workflow explanations.

**Actor who is affected but must not gain new authority:** Every user benefits from guidance, but help must never imply or grant permissions that the backend does not already enforce.

## C. Workflow

**Trigger:** An authenticated user opens any role-permitted module, uses the global help icon, or opens About This Portal.

**Preconditions:** The user has a valid session and role. The frontend knows the current role and the routes/modules available to that role.

**Normal flow:**

1. The user opens a module and sees the global question-mark help state and any module-specific guidance.
2. The user toggles help globally or collapses an individual guidance panel when desired.
3. The user opens About This Portal to review role capabilities, boundaries, and recommended workflows.
4. The user returns to the module and performs the existing business action.

**Alternate flow:** A user with help disabled may enable it from the global icon at any time. A user may review the About page without enabling contextual panels.

**Failure flow:** If local storage is unavailable, the help toggle remains usable for the current session and defaults safely to enabled. If a module has no authored guidance yet, the About page still explains the module at a role level and the global help control remains available.

**Forbidden flow:** Help must not expose another role’s private data, reveal hidden records, bypass route guards, change permissions, or imply that a guidance panel itself performs a business operation.

**Completion condition:** The user can understand the current module, the next workflow actor, and the authority boundary without changing any business record.

## D. Domain and data

**Institutional concepts involved:** Roles, portal modules, workflow responsibilities, permission boundaries, contextual guidance, user preferences, and navigation.

**New records required:** None.

**Existing records reused:** Current authenticated user and role, existing router metadata, sidebar navigation, module pages, existing global help preference, and existing contextual-help component.

**Source of truth for each important fact:**

| Fact | Source of truth | Derived views |
|---|---|---|
| User role | Authenticated account/session | About page role section and role-filtered navigation |
| Backend authority | Existing route middleware and business rules | About page permission boundaries and guidance wording |
| Available module | Existing Vue router and sidebar role conditions | About page module cards and contextual coverage |
| Help preference | Browser local storage | Global question-mark icon state and panel visibility |

**Relationships:** The About page is associated with the authenticated role, not with a new database relationship. Contextual help is associated with the current route/module and the global browser preference.

**Historical data affected:** None.

**Can records be deleted? If not, what replaces deletion?** No feature records are created. Users may reset their local help preference through the global toggle or browser site-data controls.

## E. Lifecycle and rules

**Record states:** No persisted business records are introduced. The local help preference has two UI states.

| Current state | Allowed next state | Actor | Required data | Notification? | Audit? |
|---|---|---|---|---|---|
| Help enabled | Help disabled | Current user | Click global icon | No | No |
| Help disabled | Help enabled | Current user | Click global icon | No | No |

**Business rules:**

1. Help is enabled by default for a new browser unless the user has previously disabled it.
2. The global help toggle controls visibility of contextual panels only; it cannot change business data or permissions.
3. About This Portal describes existing authority and must not promise actions unavailable to the current role.
4. Module guidance must identify the next responsible actor when an action requires review, confirmation, or publication.
5. Guidance must be authored for all role-visible modules or provide a clear neutral module explanation until a more specific explanation is available.

**Validation rules:** Role content must be selected from the authenticated role, help labels must have accessible names, and guidance text must remain concise and readable on mobile screens.

**Concurrency or duplicate rules:** None.

**Period, ownership, or relationship scope:** Guidance follows the current role and route. Child-specific data remains governed by existing guardian-to-student authorization.

## F. Visibility and privacy

**Sensitive information:** No sensitive business data is introduced. The About page must not display student records, grades, balances, disciplinary details, or private guardian information.

**Who may see the record?** Every authenticated user may see their own role-aware About page and help for modules they may access. Public unauthenticated users may see neither authenticated portal guidance nor role-specific permissions.

**What must never appear in notifications, search results, URLs, or error messages?** Help preference values, hidden role modules, private data, credentials, tokens, and internal authorization details.

**How is access checked by the backend?** Existing backend authorization remains the source of truth. This feature adds no backend bypass and does not replace route guards with frontend visibility checks.

## G. Cross-module impact

- [x] Authentication and role permissions. The current authenticated role selects About page content; permissions remain backend-enforced.
- [x] Students and guardians. Their portal modules receive guidance and role-specific descriptions without exposing linked-child data.
- [x] Staff and teacher assignments. Teacher and staff workflows receive guidance about existing assignment and review responsibilities.
- [x] Academic periods and course offerings. Guidance explains period-dependent operations without changing period data.
- [x] Registration and enrollment. Guidance explains submission and review states.
- [x] Class sessions and locations. Guidance explains creation, attendance, completion, and conflict consequences.
- [x] Attendance and participation. Guidance explains roster, justification, deadline, and completion steps.
- [x] Assessments, grades, GPA, and report cards. Guidance explains draft, confirmation, review, and publication states.
- [x] Behavior and discipline. Guidance explains visibility and acknowledgement boundaries.
- [x] Finance and payments. Guidance explains manual finance workflows and keeps online payment boundaries explicit.
- [x] Announcements and notifications. Guidance explains publication and notification meaning without creating notifications.
- [x] Search. No search behavior changes; help must not expose hidden routes or records.
- [x] Audit logs. No new audit event is created for toggling help or viewing About.
- [x] Translation. Help and About strings must follow the existing English/French interface strategy.
- [x] Reporting and exports. No report data or export behavior changes.

## H. Interface design

**Pages or views needed:** Extend the global help coverage to all role-visible modules and add `/about-portal` with role-aware sections for portal purpose, available modules, responsibilities, boundaries, and common next steps. Keep the existing purple/indigo question-mark icon beside the language selector.

**Forms and fields:** No business forms. The global toggle is a button with `aria-pressed`; About has no editable form.

**Tables, filters, and search behavior:** About may group modules by responsibility, but it does not add search or filtering unless the module list becomes too long for mobile.

**Empty states:** If a role has no module-specific guidance, display a clear explanation that guidance is being expanded while still showing the role’s available capabilities.

**Success messages:** Toggling help may update an accessible status such as “Contextual help shown” or “Contextual help hidden.” About is read-only and requires no save message.

**Actionable error messages:** If role metadata cannot be read, show a safe generic explanation and preserve the existing navigation and authorization behavior.

**Mobile behavior:** The help icon remains visible beside the language control or in the compact mobile header. About cards become one column with readable spacing and no horizontal overflow.

**Translation behavior:** Role descriptions, module names, guidance, tooltips, and About content must be compatible with the existing English/French translation strategy.

## I. API and database design

**API endpoints or operations:** None required.

| Method | Path or operation | Actor | Input | Output | Errors |
|---|---|---|---|---|---|
| None | Existing router and role state | Authenticated user | Current role and route | Help/About content | Existing auth fallback |
| None | Browser local storage | Current user | Help enabled/disabled | Persisted UI preference | Defaults to enabled if storage unavailable |

**Database change required?** No.

**Why is a migration necessary or unnecessary?** Help content and About role descriptions are frontend presentation data, and the preference is non-critical browser-local UI state. No institutional record or authorization rule changes.

**Migration order:** None.

**Pre-application checks:** Confirm existing route guards, role labels, and current help component behavior.

**Backfill or data transformation:** None.

**Rollback or recovery plan:** Revert the frontend files and remove the About route/navigation entry. Existing business data remains unchanged.

**Database constraints needed:** None.

## J. Notifications and audit

| Event | Recipients | Message summary | Link | Deduplication key | Audit action |
|---|---|---|---|---|---|
| Help toggled | None | Local UI preference changed | None | None | None |
| About page viewed | None | No notification | `/about-portal` | None | None |

**Actions that require before/after audit data:** None.

## K. Acceptance and release

**Normal acceptance test:** Log in as each supported role, open About This Portal, confirm that the role’s module list and boundaries are accurate, visit every role-visible module, and confirm that contextual guidance appears when help is enabled.

**Forbidden-access test:** Confirm that About content does not expose another role’s private records or grant access to a guarded route. Confirm that hiding help does not bypass route authorization.

**Validation-failure test:** Disable browser local storage or simulate storage failure and confirm that the icon remains usable and help defaults to enabled for the session.

**Concurrency or duplicate test:** Open multiple tabs, toggle help in one tab, and confirm the current-tab behavior remains consistent without duplicate controls or broken panels.

**Historical-data test:** Confirm that viewing About or toggling help does not alter academic, attendance, finance, discipline, notification, or audit records.

**Mobile test:** Check the header icon and About page at narrow phone width; confirm keyboard focus, accessible label, no horizontal overflow, and readable module cards.

**Regression tests:** Existing login, role routing, global help toggle, Guardian Engagement, Report Card child selector, academic, attendance, finance, timetable, and administrator review flows must continue to work.

**Backend syntax/build/test commands:**

```bash
node --check backend/src/main.js 2>/dev/null || true
npm --prefix frontend run build
git diff --check
```

**Files intentionally changed:** Existing contextual-help component and selected pages, shared Navbar/help preference, a new role-aware About page, router and sidebar registration, and this conception document.

**Files intentionally not changed:** Backend routes, database migrations, Supabase schema, business APIs, authentication, authorization middleware, payment integrations, and audit behavior.

**Deployment status:** Prepared for evaluation only until the user approves the complete all-modules coverage.

## L. Change-impact statement

- [x] Addition: new role-aware About page and expanded guidance coverage.
- [x] Expansion: broader contextual-help coverage across all modules and actors.
- [ ] Correction.
- [ ] Replacement.
- [ ] Removal.
- [x] Preservation: existing business behavior and permissions remain unchanged.
- [ ] Deferral.

**Previous behavior:** Help was present only on selected high-friction pages, and users had no single role-aware explanation of platform responsibilities and boundaries.

**Requested behavior:** Every role-visible module should provide guidance, and every authenticated user should have an About This Portal reference page.

**Added behavior:** All-modules contextual-help coverage and a read-only role-aware About page.

**Preserved behavior:** Existing routes, APIs, permissions, records, workflows, notifications, audits, and payment boundaries.

**Replaced or removed behavior:** None.

**Remaining gap:** Guidance content must be reviewed by the school administrator for wording accuracy in every module and translated consistently into French.

## Approval gate

The proposal is approved for implementation as a frontend-only UX expansion, subject to role-boundary verification and user evaluation before commit or deployment.
