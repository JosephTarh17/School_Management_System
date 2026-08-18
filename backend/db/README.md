# Supabase database setup

The database setup is intentionally kept separate from the application credentials. Apply SQL in the Supabase SQL Editor or through your preferred migration workflow; the backend does not apply schema changes automatically.

## Application order

Run the files in this order in a development or test Supabase project:

1. `supabase_schema.sql` creates the base enums, tables, foreign keys, and initial indexes.
2. `migrations/001_harden_integrity_and_indexes.sql` adds integrity constraints, lookup indexes, timestamp automation, profile-role enforcement, and nullable columns required by the existing `ON DELETE SET NULL` foreign keys.
3. `seeds/001_development_seed.sql` inserts deterministic development users and representative records.
4. `migrations/002_student_demographics_and_enrollment.sql` through `migrations/008_nonnegative_numeric_integrity.sql` add the previously implemented vertical slices and integrity rules.
5. `migrations/009_behavior_incidents.sql` creates the behavior and discipline incident ledger.
6. `migrations/010_security_compliance.sql` adds Argon2id metadata, revocable sessions, encrypted MFA metadata, and the immutable security audit log.
7. `migrations/011_guardian_installments.sql` through `migrations/014_finance_reconciliation_integrity.sql` add the later guardian, registration, and finance integrity features.
8. `migrations/016_xaf_whole_numbers_and_behavior_points.sql` enforces whole-number XAF values and severity-derived behavior points. Migration 015 was skipped in the deployed sequence.
9. `migrations/017_translation_cache.sql` creates the backend-only persistent translation cache.
10. `migrations/018_cinetpay_payments.sql` adds CinetPay payment-attempt and webhook structures.
11. `migrations/019_report_cards_and_grading.sql` adds assessment workflow and report-card structures.
12. `migrations/020_academic_year_and_semesters.sql` replaces legacy free-text academic periods with `academic_year` plus `semester`, where semester is exactly `Semester 1` or `Semester 2`. It maps legacy values such as `2026 Term 1` and `2` for assessments, registration requests, report cards, and class sessions, preserves original values in `academic_period_legacy_term_backup`, recreates registration/report-card uniqueness rules, and removes the obsolete term columns. Catalog courses become period-neutral because their academic period is selected when a teacher takes the course.
13. `migrations/021_teacher_course_offerings_and_retakes.sql` creates active teacher course offerings. It allows only one active teacher for a course in a given academic year and semester, makes Teacher Attendance session creation assignment-aware, adds period fields to enrollments and final grades, and permits the same student to retake the same course in a later academic period.
14. `migrations/022_current_academic_period.sql` creates the singleton administrator-controlled current academic period, initially `2026` plus `Semester 1`. All active workflows use this setting as their default, while explicit historical periods remain available for retake and reporting workflows.
15. `migrations/023_announcements_and_notifications.sql` creates administrator-authored announcements and the authenticated user notification inbox. It supports role audiences, priorities, drafts, publication, archiving, optional expiry, unread state, and idempotent event keys.
16. `migrations/024_normalize_catalog_course_periods.sql` preserves any legacy course academic-year and semester values in a backup table, makes the compatibility columns nullable, and clears them so catalog courses remain period-neutral. Teacher-course assignments remain the source of truth for the teacher, year, and semester offering.
17. `migrations/025_class_location_booking_conflicts.sql` enables `btree_gist`, checks for existing overlapping class-session bookings, and adds a PostgreSQL exclusion constraint preventing overlapping time ranges in the same room or class location. Back-to-back sessions are allowed because the time range uses `[)` semantics.
18. `migrations/026_staff_tracking.sql` creates administrator-managed teaching and non-teaching staff records, backfills existing teacher profiles without creating duplicate accounts, adds one-record-per-day staff attendance, and adds leave requests with administrator review status.
19. `migrations/027_atomic_teacher_staff_creation.sql` creates a service-role-only database function that atomically creates a new teacher user account, teacher profile, and linked teaching staff record from administrator-provided details.

Migration 023 should be applied after migration 022. Migration 024 should be applied after migration 023 and before testing new catalog-course creation. Migration 025 should be applied after migration 024; if it stops because existing overlapping sessions are found, resolve those duplicate bookings first and rerun the complete migration. Migration 026 should be applied after migration 025; it backfills existing teachers into `staff_member` and does not create new user accounts. Migration 027 should be applied after migration 026 before creating new teaching staff through the Staff Management page. Staff attendance, leave, and new teaching-account creation mutations are administrator-only. Announcement publication, event notification fanout, and staff operations are handled by the backend service-role connection; the frontend never queries Supabase directly.

Migration 001 also enables row-level security on every application table without adding public policies. This blocks direct anon/authenticated table access by default; the backend must continue using the Supabase service-role key, which bypasses RLS server-side. If the frontend later queries Supabase directly, add narrowly scoped policies before enabling that access.

Run each file as a complete script. Before applying the migration to an existing database, review any pre-existing rows for violations of the new checks, especially invalid academic-period values, negative amounts, invalid GPAs, invalid assessment weights, and profile rows linked to accounts with mismatched roles. Migration 020 changes both structure and existing academic-period records in one transaction; do not apply the earlier failed 020 script. Migration 021 must then be applied after migration 020 because it backfills enrollment and final-grade periods and creates the teacher-offering table. Apply migration 022 after migration 021, then use the Administrator Dashboard to change the current academic year and semester instead of editing period values across individual screens.

## Development accounts

Development seed accounts, if used, must be configured and rotated outside the repository. This README intentionally contains no usernames, passwords, API keys, service-role keys, or JWT secrets. Never commit credentials to source control.

## Backend expectations

The application uses the service-role Supabase key only on the backend. The API expects profile IDs to match their role-specific account: student profiles must reference student accounts, teacher profiles must reference teacher accounts, and so on. Student-facing reads are further restricted in the application layer to the authenticated student's own records. Behavior incidents follow the same rule: administrators have institution-wide access, teachers are limited to active teaching/enrollment scope and their own reported mutations, students can read only their own incidents, and guardians can read only linked children’s incidents.

Chapter 8 requires `MFA_ENCRYPTION_KEY` in the backend environment. It must be a 32-byte hex or base64 value and must never be exposed to the frontend. New passwords use Argon2id; legacy bcrypt hashes are rehashed after successful login. Authentication now requires a matching, unrevoked `auth_session` record, and security mutations are written to the append-only `security_audit_log`.
