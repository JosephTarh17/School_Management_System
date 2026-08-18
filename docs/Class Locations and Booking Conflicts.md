# Class Locations and Booking Conflicts

## Purpose

The school management system now treats rooms and class locations as administrator-managed resources. Teachers select an existing location when creating a class session; they do not create locations from the Teacher Attendance page.

## Administrator workflow

Open **Configure Locations** from the Administrator sidebar. The administrator can add a location name, building or area, and optional capacity. Existing locations can be renamed or edited. A location referenced by an existing class session cannot be deleted because historical class-session records must remain valid.

## Teacher workflow

When a teacher creates a class session under Teacher Attendance, the Room selector loads the administrator-managed locations. The teacher must choose one of those locations. The existing course, academic year, semester, start time, end time, and attendance flow remain unchanged.

## Conflict rule

Two class sessions cannot use the same location during overlapping time ranges. The overlap rule is equivalent to:

```text
existing.start_time < requested.end_time
AND requested.start_time < existing.end_time
```

Back-to-back sessions are allowed. For example, a session from 09:00 to 10:00 and another from 10:00 to 11:00 do not overlap.

The rule is enforced twice:

1. The backend checks for a conflict and returns an actionable HTTP 409 error before insertion or update.
2. Migration 025 adds a PostgreSQL exclusion constraint using a timestamp range, which protects against two requests arriving simultaneously and bypassing an application-level pre-check.

## Migration

Apply `backend/db/migrations/025_class_location_booking_conflicts.sql` after migration 024. The migration first checks for existing overlapping location bookings. If any are found, it stops and reports the number of conflicts so they can be corrected before the constraint is installed.

## Acceptance tests

1. The administrator creates `Computer Lab 1` and sees it in Class Locations.
2. A teacher sees `Computer Lab 1` in the class-session location selector.
3. A teacher creates a session in that location from 09:00 to 10:00.
4. A second teacher attempts to create a session in the same location from 09:30 to 10:30 and receives a conflict error.
5. A second teacher creates a session in the same location from 10:00 to 11:00 successfully.
6. An administrator edits the location name successfully.
7. An administrator cannot delete a location referenced by an existing class session.
8. Updating an existing session to an overlapping location/time is rejected, while updating it without changing its own time remains allowed.
