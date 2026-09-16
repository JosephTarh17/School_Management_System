# SMS Backend

This backend implements the production-ready API layer for the School Management System. It is built with Express and integrates with Supabase for storage, role validation, transaction handling, and reporting workflows.

## Runtime stack

- Node.js + Express
- PostgreSQL/Supabase
- JWT-based authentication
- Argon2 password hashing and MFA support
- Audit logging and security middleware

## Main API domains

The backend exposes modules for:

- Authentication and session lifecycle
- Student, guardian, and admin account management
- Staff operations and attendance
- Course catalog, offerings, registrations, and enrollment
- Assessments and grading workflows
- Attendance, absence justification, and reporting
- Timetables, class hours, school events, and calendar
- Notifications and announcements
- Behavior incidents and disciplinary handling
- Guardian portal and engagement flows
- Finance records and CinetPay payment settlement
- Audit logging and search

## Key routes

The application wire-up in `src/app.js` registers the following route groups:

- `/auth` — login, session, refresh, logout, MFA
- `/attendance` — attendance capture and status review
- `/users` — account and profile actions
- `/students` — student record access and maintenance
- `/courses` — catalog course management
- `/class-sessions` — session and booking management
- `/assessments` — assessments and grading data
- `/participation-logs` — participation records
- `/financial-records` — finance and payment tracking
- `/dashboard` — analytics summaries
- `/enrollments` — student enrollment management
- `/course-registrations` — student request workflow
- `/academic-records` — results and academic visibility
- `/guardian-portal` — parent/guardian child views
- `/guardian-engagement` — guardian communication actions
- `/attendance-reports` — compliance and reporting
- `/behavior-incidents` — discipline records
- `/audit-logs` — security and admin logs
- `/translations` — localization support
- `/grading` — gradebook and publication flows
- `/academic-period` — current academic year/semester settings
- `/announcements` — notice publishing and audience filtering
- `/notifications` — inbox, read-state, and fanout
- `/search` — global project navigation/search
- `/rooms` — class-location resources
- `/staff` — staff directory, attendance, and leave
- `/course-hours` — allocation and validation
- `/timetables` — recurring schedule and occurrence logic
- `/calendar` — schedule and event aggregation
- `/school-events` — school event management
- `/absence-justifications` — student absence review workflow

## Environment configuration

Create a `.env` file from the example template and set the required values before running the application.

Required variables include:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `FRONTEND_URL`
- `PORT`
- Optional `CINETPAY_*` variables for payment integration

## Local development

```bash
cd backend
npm install
npm run dev
```

The API listens on the configured port and exposes a health endpoint at `/health`.

## Security and reliability notes

- Authenticated routes support both bearer tokens and HttpOnly cookies.
- JWTs validate issuer, audience, expiration, and access-token claims.
- The backend enforces route-specific RBAC checks on sensitive actions.
- Login throttling and session revocation are implemented for operational security.
- Security audit events are recorded for meaningful account and platform actions.
- The service-role Supabase client is used for privileged server-side operations.

## Verification

The backend test suite validates core access-control and auth logic:

```bash
cd backend
npm test
```
