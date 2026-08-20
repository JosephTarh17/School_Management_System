# Guardian Implementation 2 Conception

## Purpose

Guardian Implementation 2 extends the Guardian Portal from monitoring into operational visibility. It gives guardians a clear read-only view of existing manual fee obligations, invoices, receipts, balances, linked-child timetables, school calendar events, and published announcements.

This release deliberately excludes CinetPay and every online-payment initiation or activation path. Guardians may see manually recorded financial truth, but they cannot start a payment, enter a payment, alter a receipt, or trigger an external payment provider from this release.

This document defines institutional behavior before implementation. It does not authorize a new payment provider, new payment migration, or unrelated guardian communication features.

---

# 1. Release scope

## Included

1. Guardian-scoped fee and payment visibility for linked children.
2. Invoice, installment, receipt, amount-paid, balance, due-date, and payment-status views based on existing manual records.
3. Linked-child timetable visibility using published schedule entries only.
4. Linked-child calendar visibility for lessons, meetings, examinations, and important school events permitted by existing calendar rules.
5. Published school announcements addressed to guardians or all users.
6. Clear links between dashboard sections and detailed views.
7. Responsive English/French presentation using the existing translation behavior.
8. Privacy tests proving that a guardian cannot view another student’s financial or schedule data.

## Explicitly excluded

| Excluded capability | Decision |
|---|---|
| CinetPay initiation | Excluded. No payment window, payment token, checkout button, or provider API call. |
| Online payment status polling | Excluded. Existing provider-specific status behavior must not be introduced into this release. |
| Guardian manual payment creation | Excluded. Administrators remain responsible for recording manual payments. |
| Receipt editing or deletion | Excluded. Existing financial history remains authoritative and protected. |
| Fee configuration | Excluded. Administrator-only finance configuration remains unchanged. |
| Guardian-to-school chat | Deferred. |
| Appointment requests | Deferred. |
| Documents and consent forms | Deferred. |

---

# 2. Institutional problem and desired outcome

Guardians can be informed about their children but still lack an operational view of what the school has billed, what has been manually paid, which receipts exist, when lessons and events occur, and which announcements matter to them. This causes repeated calls to administration and makes it harder for guardians to plan around school obligations.

The desired outcome is a guardian portal where a guardian selects a linked child and obtains one reliable view of the child’s financial status, timetable, calendar events, and school notices. The portal must display authoritative server data and must never allow a browser to create or recalculate financial truth.

---

# 3. Actors and authority

| Actor | May create | May view | May edit | May approve/publish | May delete/archive |
|---|---|---|---|---|---|
| Administrator | Fees, invoices, manual payments, announcements, timetables, events | All permitted institutional data | Controlled finance and scheduling records | Publish announcements, timetables, and events | Existing controlled archive/correction workflows |
| Teacher | Existing teacher-owned session or timetable requests | Own published schedule and permitted events | Existing teacher-owned records only | No institution-wide publication | Existing restrictions remain |
| Student | No Release 2 finance/schedule records | Own fees, receipts, published timetable, and announcements | None in this release | None | None |
| Guardian | No finance, schedule, or announcement records | Linked children’s invoices, manual payments, receipts, balances, published schedules, permitted events, and guardian announcements | Notification read state only; no institutional record edits | None | None |

**Primary workflow owner:** Administrator remains the owner of finance, scheduling, and publication truth.

**Guardian authority boundary:** Guardian is a read-only consumer of linked-child operational information. The guardian does not gain authority to create or alter financial, scheduling, academic, attendance, or announcement records.

---

# 4. Normal workflows

## 4.1 Finance visibility

1. Guardian signs in and selects a linked child.
2. Portal requests the child’s financial records through a guardian-scoped backend operation.
3. Portal displays invoice amount due, amount paid, calculated balance, status, due date, installment schedule, and manually recorded receipts.
4. Guardian selects an invoice to review its payment history and receipt references.
5. Guardian contacts the school through existing offline channels if a balance or receipt appears incorrect.

The portal does not provide a Pay button. It does not collect a payment method, create a payment transaction, open a provider window, poll a provider, or claim that a payment succeeded.

## 4.2 Timetable visibility

1. Guardian selects a linked child.
2. Portal requests published timetable entries permitted for that child’s active course registrations and current academic period.
3. Portal displays lessons by date, day, time, course, teacher where permitted, and location where permitted.
4. Draft, rejected, unpublished, cancelled, or unrelated timetable entries remain hidden according to existing timetable lifecycle rules.

## 4.3 Calendar visibility

1. Guardian opens the calendar view or selects a calendar item from the portal.
2. Backend returns only calendar events permitted for the guardian role and the selected linked child.
3. The portal allows date filtering and a clear return to the selected child.
4. Events remain read-only. Guardian cannot create, edit, approve, publish, cancel, or archive them.

## 4.4 Announcements

1. Administrator publishes an announcement for guardians or all users.
2. Existing notification generation creates scoped guardian notifications where applicable.
3. Guardian sees published, non-expired announcements and linked notifications.
4. Guardian may mark their own notifications as read.
5. Draft, archived, expired, teacher-only, student-only, and administrator-only announcements remain hidden.

---

# 5. Domain and sources of truth

| Fact | Source of truth | Guardian view |
|---|---|---|
| Guardian-to-child relationship | `student_guardian` | Child switcher |
| Amount owed | Existing `financial_record` or approved invoice obligation | Invoice summary |
| Manual money received | Existing `payment_record` | Payment history and receipt list |
| Installment allocation | Existing `fee_installment` and linked manual payment records | Installment schedule |
| Balance | Server-maintained or server-calculated finance fields | Read-only balance display |
| Receipt identity | `payment_record.receipt_number` and payment metadata | Receipt reference and date |
| Planned lesson | Published timetable entry | Child timetable |
| Actual class occurrence | Existing class-session data | Event/session context where permitted |
| Calendar event | Existing calendar/school-event source | Date-filtered event list |
| Published announcement | `announcement` | Announcement list |
| Guardian alert | `user_notification` | Notification inbox |

No client-side balance calculation may override the server’s authoritative balance. Where a display total is derived for convenience, it must be clearly a view and not an editable accounting value.

Financial input and stored manual payment amounts must obey the project’s whole-number XAF policy. Displayed calculated balances may be zero XAF.

---

# 6. Privacy and authorization

Every child-specific request must resolve the authenticated guardian’s `guardian_id`, query `student_guardian`, and verify that the requested student is linked before returning financial, timetable, calendar, or announcement context.

A guardian must not gain access by changing `student_id` in a URL or query parameter. A missing or unauthorized relationship must return a safe not-found or forbidden response without revealing whether the unrelated student exists.

Financial records are especially sensitive. Guardians may view only linked-child obligations, installments, manual payments, receipts, and balances. They must not view administrator audit metadata, other guardians’ payer details where not necessary, provider secrets, internal reconciliation notes, or unrelated student finance.

Timetable visibility must not expose institution-wide schedule data when the schedule is not linked to the selected child’s active registration or permitted cohort. Announcement visibility is role-audience and publication-state constrained.

---

# 7. API and database design

## Planned operations

| Method | Operation | Actor | Input | Output | Errors |
|---|---|---|---|---|---|
| `GET` | Guardian child finance summary | Guardian | Linked `student_id` | Invoices, installments, manual payments, receipts, balances, statuses | 401/403/404 |
| `GET` | Guardian child payment history | Guardian | Linked `student_id`, optional invoice | Read-only manual payment and receipt rows | 401/403/404 |
| `GET` | Guardian child timetable | Guardian | Linked `student_id`, optional period/date filters | Published permitted schedule entries | 401/403/404 |
| `GET` | Guardian calendar | Guardian | Optional selected child/date range | Permitted calendar events | 401/403/404 |
| `GET` | Guardian announcements | Guardian | Existing filters | Published, non-expired guardian/all announcements | Existing route errors |
| `GET` | Guardian notifications | Guardian | Existing inbox filters | Notifications owned by authenticated user | Existing route errors |
| `PATCH` | Mark own notification read | Guardian | Notification UUID | Updated notification | 401/403/404 |

## Database migration decision

**No new migration is planned.** This release should reuse the already existing finance, timetable, calendar, announcement, notification, guardian, student, enrollment, and relationship tables.

If implementation discovers that the deployed schema does not contain a table or column required by an already approved prior migration, stop and report the mismatch. Do not add an unplanned schema change under this release.

## CinetPay exclusion rule

The implementation must not add or retain a CinetPay initiation action in the Guardian Implementation 2 interface. Any pre-existing provider-specific code must be left outside the new release ZIP or removed from the Guardian Implementation 2 page if it would expose an online-payment action. Provider environment variables, payment tokens, merchant transaction identifiers, status polling, and checkout URLs must not be referenced by the new release.

---

# 8. Interface design

The Guardian Portal should use clear sections or tabs for **Overview**, **Fees and receipts**, **Timetable**, **Calendar**, and **Announcements**. The linked-child selector must remain visible and usable on mobile.

The finance section should use summary cards for amount due, amount paid, balance, and payment status, followed by invoice and receipt details. It must show an explicit notice such as “Online payment is not available in this release” only if users might otherwise expect a payment action; it must not render a disabled or misleading CinetPay button.

The timetable should use responsive cards on mobile and a compact grid/list on larger screens. The calendar should provide date filtering and readable event cards. Announcement cards should show priority, publication date, expiry where applicable, and the full published message.

All primary navigation and action controls must preserve the shared button system: purple gradient for primary actions, white/slate border for secondary actions, and no black primary buttons.

---

# 9. Notifications and audit

| Event | Recipient | Message | CinetPay involvement | Audit |
|---|---|---|---|---|
| Manual payment recorded by administrator | Linked guardian where existing policy permits | Payment/receipt recorded | None | Existing finance audit |
| Balance or due-date change | Linked guardian where existing policy permits | Finance status changed | None | Existing finance audit |
| Timetable published or materially changed | Guardian of affected linked child | Schedule change summary | None | Existing timetable audit |
| Calendar event published | Guardian audience or affected users | Event title/date | None | Existing event audit |
| Announcement published | Guardian audience or all | Announcement title/body | None | Existing announcement audit |

Notification bodies must never contain credentials, payment tokens, provider secrets, or unrelated students’ information.

---

# 10. Acceptance criteria

## Finance

1. Guardian can view only invoices belonging to a linked child.
2. Guardian can view manual payment records and receipt references for a linked child.
3. Calculated balance displays correctly, including zero XAF.
4. Guardian cannot create, edit, delete, or reverse a payment.
5. No CinetPay button, payment token, checkout URL, status poll, or provider API call appears in the release.
6. A guardian cannot access another student’s invoice by changing a URL or request body.

## Timetable and calendar

1. Guardian sees only published permitted schedule entries for a linked child.
2. Draft, unrelated, or unauthorized schedule entries are hidden.
3. Guardian can filter calendar events by date without losing child authorization.
4. Guardian cannot create or modify events or schedules.
5. Mobile layout does not require horizontal scrolling for normal event or schedule review.

## Announcements and notifications

1. Guardian sees published guardian/all announcements only.
2. Expired or unpublished announcements are hidden.
3. Guardian sees only notifications addressed to the authenticated account.
4. Guardian can mark their own notification as read.
5. Guardian cannot mark another user’s notification as read.

## Regression

Existing Guardian Implementation 1 functions—child switching, attendance, absence justification, published results, notifications, and account-security routing—remain functional. Administrator finance, timetable, calendar, event, and announcement workflows remain unchanged.

## Verification commands

```text
node --check on each changed backend JavaScript file
npm --prefix backend test -- --grep Guardian
npm --prefix frontend run build
git diff --check
credential scan for provider secrets, payment tokens, and test credentials
CinetPay reference scan over all Guardian Implementation 2 files
```

---

# 11. Change-impact classification

- **Expansion:** Broadens guardian visibility into manual finance, schedule, calendar, and announcement data.
- **Addition:** Adds a unified Release 2 presentation and guardian-scoped detail operations where existing routes are insufficient.
- **Preservation:** Preserves existing manual finance truth, timetable publication, calendar events, announcements, notifications, and Guardian Implementation 1 workflows.
- **Privacy correction:** Any route that accepts a child identifier without checking the guardian relationship must be corrected.
- **Deferral:** CinetPay, online payments, chat, appointments, documents, and consent remain deferred.

## Approval gate result

The problem, actors, authority boundaries, source-of-truth records, privacy rules, CinetPay exclusion, migration decision, acceptance tests, and change classification are defined. Implementation may proceed without adding a migration or activating online payments.
