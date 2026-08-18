# Staff Management

## Scope

The Staff Management module tracks both teaching and non-teaching staff from the administrator portal. It does not create a second user account for an existing teacher. Existing teacher profiles are linked to a staff record through the teacher profile and user account already present in the system.

## Staff directory

Administrators open **Staff Management** from the Administration section. A staff record contains staff type, employee number, full name, email, phone, department, job title, employment status, date joined, and optional date left.

New teaching staff are added directly by entering their name, email, contact details, department, job title, and a temporary password. The backend creates the teacher login account, teacher profile, and linked staff record atomically. Non-teaching staff receive a directory record without a teacher profile because they do not teach courses or own teacher-course assignments.

The staff directory includes a search field for finding a staff member by name, email, employee number, department, or job title before editing. Existing teacher-profile linkage is reserved for controlled correction or conversion workflows, not normal creation.

Employment status values are **active**, **on leave**, **inactive**, and **terminated**. Historical staff records should be marked inactive or terminated instead of deleted whenever attendance, leave, teaching, or other operational history exists.

## Staff attendance

Administrators select an attendance date and record one status per staff member: **Present**, **Absent**, **Late**, **Excused**, or **On Leave**. The database enforces one record per staff member and date. Saving a status for the same staff member and date updates the existing record instead of creating a duplicate.

## Staff leave

Administrators can record a leave type, date range, reason, and review status. Leave types are Annual, Sick, Maternity, Study, Emergency, and Other. Leave records begin as Pending and can be Approved or Rejected by the administrator. A Cancelled status is also available for administrative correction.

## API and security

The staff API is mounted under `/staff` and is administrator-only. The `/staff/teachers` endpoint lists existing teacher profiles available for linkage. Staff directory, attendance, and leave mutations are protected by the existing custom JWT authentication and administrator role middleware. The frontend does not query Supabase directly.

## Migrations

Apply `backend/db/migrations/026_staff_tracking.sql` after migration 025. Migration 026 creates `staff_member`, `staff_attendance`, and `staff_leave_request`, backfills existing teachers into teaching staff records, adds indexes and integrity checks, and enables row-level security for the new tables. Existing user accounts and teacher profiles are not duplicated.

Apply `backend/db/migrations/027_atomic_teacher_staff_creation.sql` after migration 026. Migration 027 creates a service-role-only database function that atomically creates a new teacher user account, teacher profile, and linked teaching staff record. The administrator supplies a temporary password, which is hashed by the backend before the function is called.

## Acceptance scenarios

1. Administrator opens Staff Management and searches the staff directory by name, email, employee number, department, or job title.
2. Administrator creates a new teaching staff member with a name, email, job title, department, and temporary password; one user account, teacher profile, and staff record are created.
3. Administrator creates a non-teaching staff record with a job title and department without creating a login account.
4. Administrator edits employment status, contact details, job title, or dates.
5. Administrator records Present, Absent, Late, Excused, or On Leave for a staff member on a selected date.
6. Saving attendance twice for the same staff member and date updates one record rather than creating duplicates.
7. Administrator records a Pending leave request with a valid date range and reason.
8. Administrator approves or rejects the leave request.
9. Invalid date ranges, invalid statuses, and invalid staff identifiers are rejected.
10. A non-administrator cannot access the staff API or Staff Management page.
11. A staff record referenced by attendance, leave, or teaching history cannot be hard-deleted; the administrator is instructed to mark it inactive or terminated.
