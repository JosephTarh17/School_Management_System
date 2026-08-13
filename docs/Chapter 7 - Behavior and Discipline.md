# Chapter 7: Behavior and Discipline

## Scope

Chapter 7 introduces a real-data behavior incident ledger. Administrators and teachers can record incidents for permitted students, track review status, document action taken, and delete records according to role scope. Students and linked guardians can read only the records they are permitted to see.

## Database application

Apply `backend/db/migrations/009_behavior_incidents.sql` after migrations 001 through 008 in the Supabase SQL Editor. The migration creates `behavior_incident`, adds indexes, enables row-level security, and adds the existing timestamp-update trigger.

## Role behavior

| Role | Access |
|---|---|
| Administrator | Institution-wide create, read, update, and delete |
| Teacher | Create for actively enrolled students in the teacher’s teaching scope; read scoped incidents; update own reported incidents; delete own open or under-review incidents |
| Student | Read own incidents only |
| Guardian | Read incidents for linked children only |

## Validation rules

Incident type is one of `Academic`, `Attendance`, `Conduct`, `Safety`, or `Other`. Severity is one of `Low`, `Medium`, `High`, or `Critical`. Status is one of `Open`, `Under review`, `Resolved`, or `Dismissed`. Points are decimal-compatible, non-negative, and capped at 100. Descriptions, actions, and resolution notes are capped at 1000 characters. Resolved or dismissed incidents require action taken or resolution notes.

## Manual acceptance test

1. Apply migration 009 in the development Supabase project.
2. Restart the backend and frontend.
3. Sign in as an administrator and open **Behavior & Discipline**.
4. Create a Conduct incident for a real student with zero or positive points.
5. Confirm the incident appears in the administrator list and can be moved to `Under review` and then `Resolved` only after action or resolution notes are present.
6. Sign in as a teacher who actively teaches the student and confirm the incident is visible.
7. Attempt to create an incident for a student outside that teacher’s scope; confirm the backend returns HTTP 403.
8. Sign in as the affected student and confirm only that student’s incidents are visible.
9. Sign in as a linked guardian and confirm the child’s incidents are visible.
10. Sign in as an unrelated guardian or student and confirm the incident is not visible.
11. Attempt a negative points value, invalid incident type, malformed student UUID, and overlong description; confirm the backend returns HTTP 400 and creates no row.
12. Verify that a teacher cannot delete a resolved incident and that an administrator can delete it.
13. Verify the role-specific sidebar and direct URL guard for `/behavior-discipline`.

## Known limitation

This chapter records and scopes behavior incidents. It does not yet implement automated disciplinary policy calculation, appeals, notification delivery, or immutable audit-event storage. Those belong in the security/compliance and institutional policy follow-up work.
