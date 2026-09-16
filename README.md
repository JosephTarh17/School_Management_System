# School Management System

This repository contains the complete implementation of a role-based School Management System designed for administrators, teachers, students, and guardians. The project is split into a Node.js/Express backend, a Vue 3 + Vite frontend, Supabase-backed database migrations, and supporting project documentation.

## Project status

The implementation is now feature-complete for the current project scope and reflects the repository state in this workspace. The system covers:

- Authentication, session management, and MFA for administrators
- Role-based access control and audit logging
- Student, guardian, staff, and account lifecycle workflows
- Course catalog, course offerings, enrollment, and registration review
- Attendance, gradebooks, assessment reviews, and report cards
- Timetables, calendar views, class sessions, and school events
- Guardian portal access, absence justifications, and engagement workflows
- Behavior and discipline tracking
- Finance records and CinetPay payment integration
- Announcements, notifications, quick search, and dashboard analytics

## Architecture

- Backend: Node.js + Express + Supabase client
- Frontend: Vue 3 + Vite + Tailwind CSS
- Database: PostgreSQL/Supabase schema and migration scripts
- Auth: JWT-based access tokens with HttpOnly cookie support and optional TOTP MFA
- Security: Argon2 password hashing, audit trails, session revocation, and RBAC enforcement

## Repository layout

- `backend/` — API server, Supabase integration, migration SQL, and automated tests
- `frontend/` — Vue application, router, pages, shared UI, and Playwright smoke tests
- `docs/` — functional and design documentation, including the SRS and feature-specific modules
- `Infra/` — infrastructure notes and deployment-related guidance
- `scripts/` — operational validation utilities

## Core features

### Authentication and security

- User login, logout, refresh, and session validation
- Role-based route protection for `administrator`, `teacher`, `student`, and `guardian`
- Account lifecycle maintenance and password-change flow enforcement
- Argon2id password hashing and legacy hash migration support
- Administrator MFA enrollment and verification
- Security audit logging and immutable audit views

### Academic and administrative workflows

- Student and guardian profile management
- Staff management and daily staff attendance tracking
- Course catalog and teacher course offerings by academic year and semester
- Manual enrollment and student course registration requests
- Assessment creation, grade entry, review, publication, and GPA/report-card logic
- Attendance tracking, generated attendance reports, and absence justification processing

### Scheduling and campus operations

- Class session creation and management
- Timetable generation and conflict prevention
- School event publishing and calendar aggregation
- Class location catalog and booking constraints
- Teacher absence reporting and review flows
- Course-hours allocation and validation

### Guardian and student experience

- Guardian-linked child access with scoped dashboard views
- Attendance summaries and absence justification submissions
- Published academic results and report-card access
- Announcement and notification inbox with read-state tracking
- Guardian engagement and communication workflows

### Finance and compliance

- Financial records, invoice summaries, and installment tracking
- Guardian payment visibility and reconciliation flows
- CinetPay payment-attempt processing and verification routes
- Behavior incident management and disciplinary review
- Search, audit logs, and admin analytics dashboards

## Quick start

### 1) Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Required environment variables include examples such as:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `FRONTEND_URL`
- Optional CinetPay variables for payment flows

### 2) Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Set the API target with:

```bash
VITE_API_BASE_URL=http://localhost:3000
```

## Validation

The project includes automated verification for the backend and frontend:

```bash
cd backend
npm test
```

```bash
cd frontend
npm run build
```

The frontend also includes Playwright smoke coverage for login and attendance-related flows.

## Live application

- Deployed frontend: https://school-management-frontend-zrw1.onrender.com/login

## Documentation

Key project references:

- [docs/Software Requirements Specification (SRS).md](docs/Software%20Requirements%20Specification%20%28SRS%29.md)
- [backend/README.md](backend/README.md)
- [frontend/README.md](frontend/README.md)
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

## Notes

This project is designed for a Supabase-based deployment model and is structured for role-scoped institutional workflows. The implementation reflects the current codebase rather than an aspirational roadmap, so the repository contents should be treated as the authoritative working specification for the platform.
