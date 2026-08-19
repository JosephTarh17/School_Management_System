# Timetable, Course Hours, and School Events

## Implementation status

This feature batch implements the semester timetable foundation, administrator Course Hours CRUD, attendance-gated completion, teacher absence reporting, student absence justification workflow, role-specific calendar aggregation, School Events CRUD, and daily absence-deadline maintenance.

## Migration

Apply `backend/db/migrations/028_timetable_course_hours_events.sql` after the previously merged migrations. The migration creates course-hour allocations and revision history, timetable entries and dated occurrences, teacher absence reports, an administrator-configured absence policy, student-absence justification fields, School Events, additional-hours requests, indexes, and the timetable occurrence link on `class_session`.

The migration must be applied before using the new routes. It does not activate CinetPay and does not delete existing academic, attendance, finance, guardian, or grading records.

## Main routes

| Area | Endpoints |
|---|---|
| Course Hours | `/course-hours`, `/course-hours/:allocationId` |
| Timetable | `/timetables`, `/timetables/entries`, `/timetables/occurrences/:occurrenceId/open-session`, `/timetables/occurrences/:occurrenceId/complete` |
| Teacher absence | `/timetables/occurrences/:occurrenceId/absence-report`, `/timetables/absence-reports`, `/timetables/absence-reports/:reportId/review` |
| Additional hours | `/timetables/hour-requests`, `/timetables/hour-requests/:requestId/review` |
| Calendar | `/calendar` |
| School Events | `/school-events`, `/school-events/:eventId/publish`, `/school-events/:eventId/cancel` |
| Student justifications | `/absence-justifications`, `/absence-justifications/:attendanceId`, `/absence-justifications/:attendanceId/review` |
| Absence policy | `/absence-justifications/policy` |

## Operational rules

The timetable is managed at the semester level and can contain multiple entries for the same course offering. The administrator assigns the approved course-hour quota. The timetable is a stable plan; teachers do not reschedule it every week.

A teacher opens an actual class session from a timetable occurrence, records attendance through the existing attendance workflow, and then flags the occurrence as completed. The backend rejects completion when no attendance exists or when no student is marked present. An all-absent occurrence becomes `No Attendance` and contributes zero completed/payable hours.

A quota reduction preserves history and marks future excess occurrences as `Voided`. Additional hours require a teacher or administrator request and administrator approval; an approved request increases the allocation and creates a revision record.

Students submit their own absence justifications. The administrator configures one fixed deadline in days. The backend starts a daily maintenance process with the web service; expired pending or submitted justifications become `UNJUSTIFIED`, and idempotent notifications are sent to the student, linked guardians, and administrators. Teachers do not approve student justifications or their own absence reports.

## Calendar views

Administrators receive a day-bounded Operations Calendar. Teachers receive a month-bounded workload view. Students and guardians receive a semester-bounded view of permitted published lessons and School Events. The frontend also provides a mobile-friendly chronological list instead of relying on a wide grid only.

## School Events

Administrators can create, edit, publish, cancel, and delete eligible drafts. Events include title, description, category, dates, location or online details, audience, status, and notification flags. Published events are scoped by audience and delivered through the existing idempotent notification inbox.

## Deployment note

The daily expiry process starts with the backend service and runs once at startup and every 24 hours. Its database update is guarded by the deadline and notification fields, and notification event keys prevent duplicate fanout. If the Render deployment uses multiple backend instances in the future, retain the database guards or move the same function to a single daily job to avoid unnecessary duplicate work.
