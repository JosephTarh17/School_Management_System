# Course Registration Requests

## Overview

The School Management System now supports a controlled university course-registration workflow. Students select courses for an academic year and semester and submit a request for administrator review. A request does not become an official enrollment until an administrator approves it.

## Lifecycle

| Status | Meaning |
|---|---|
| `pending` | Submitted by a student and awaiting review |
| `approved` | Approved and converted into active enrollment records |
| `rejected` | Declined by an administrator with optional notes |
| `cancelled` | Cancelled by the student before review |

The existing `enrollment` table remains the official record of courses taken. Registration requests are stored separately in `course_registration_request` and `course_registration_item`.

## Credit enforcement

The server derives the student identity from the authenticated session. On submission and again on approval, it verifies the requested courses, duplicate selections, existing enrollment records, academic-year and semester compatibility, and the administrator-defined `max_credits` value for the student's Freshman, Sophomore, or Junior class level. All numeric credit values are non-negative.

## Roles

Students can view the catalog, submit one pending request per academic year and semester, view request history, and cancel a pending request. Administrators can view pending requests and approve or reject them. Teachers retain course-scoped academic access but do not approve registration requests.

## Database application

Apply `backend/db/migrations/012_course_registration_requests.sql` in Supabase after migration 011. Then apply `backend/db/migrations/020_academic_year_and_semesters.sql` after migrations 017, 018, and 019. The registration migration creates the request and item tables and transactional submission and approval functions; migration 020 transforms legacy values into `academic_year` plus `semester`, preserves a backup of original values, and recreates uniqueness using the composite academic period.

## API endpoints

- `GET /course-registrations/catalog`
- `GET /course-registrations/eligibility` for students
- `GET /course-registrations` for a student's own requests or administrator review
- `POST /course-registrations` for student submissions
- `PATCH /course-registrations/:requestId/cancel` for students
- `PATCH /course-registrations/:requestId/review` for administrators

## Verification

Run the frontend build and static checks from the project root:

```powershell
npm --prefix frontend run build
git diff --check
```

Run the backend test suite only in an environment with the private Supabase variables configured:

```powershell
npm --prefix backend test
```
