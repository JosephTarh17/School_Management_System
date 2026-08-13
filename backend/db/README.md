# Supabase database setup

The database setup is intentionally kept separate from the application credentials. Apply SQL in the Supabase SQL Editor or through your preferred migration workflow; the backend does not apply schema changes automatically.

## Application order

Run the files in this order in a development or test Supabase project:

1. `supabase_schema.sql` creates the base enums, tables, foreign keys, and initial indexes.
2. `migrations/001_harden_integrity_and_indexes.sql` adds integrity constraints, lookup indexes, timestamp automation, profile-role enforcement, and nullable columns required by the existing `ON DELETE SET NULL` foreign keys.
3. `seeds/001_development_seed.sql` inserts deterministic development users and representative records.
4. `migrations/002_student_demographics_and_enrollment.sql` through `migrations/008_nonnegative_numeric_integrity.sql` add the previously implemented vertical slices and integrity rules.
5. `migrations/009_behavior_incidents.sql` creates the behavior and discipline incident ledger.

Migration 001 also enables row-level security on every application table without adding public policies. This blocks direct anon/authenticated table access by default; the backend must continue using the Supabase service-role key, which bypasses RLS server-side. If the frontend later queries Supabase directly, add narrowly scoped policies before enabling that access.

Run each file as a complete script. Before applying the migration to an existing database, review any pre-existing rows for violations of the new checks, especially negative amounts, invalid GPAs, invalid assessment weights, and profile rows linked to accounts with mismatched roles.

## Development accounts

The seed creates these accounts, all with the temporary password `ChangeMe123!`:

| Role | Email |
|---|---|
| Administrator | `admin@example.com` |
| Teacher | `teacher@example.com` |
| Student | `student@example.com` |
| Guardian | `guardian@example.com` |

These are development-only credentials. Change or remove them before using the database for any real environment. Never commit a real password, Supabase service-role key, or JWT secret.

## Backend expectations

The application uses the service-role Supabase key only on the backend. The API expects profile IDs to match their role-specific account: student profiles must reference student accounts, teacher profiles must reference teacher accounts, and so on. Student-facing reads are further restricted in the application layer to the authenticated student's own records. Behavior incidents follow the same rule: administrators have institution-wide access, teachers are limited to active teaching/enrollment scope and their own reported mutations, students can read only their own incidents, and guardians can read only linked children’s incidents.
