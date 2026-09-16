# SMS Frontend

This frontend implements the Vue-based user interface for the School Management System. It provides role-aware pages for students, teachers, guardians, and administrators and communicates with the Express backend through a centralized API layer.

## Stack

- Vue 3
- Vite
- Tailwind CSS
- Vue Router
- Playwright for smoke testing

## Main app areas

The frontend includes pages for:

- authentication and onboarding
- dashboard and analytics views
- student and guardian portals
- teacher attendance and gradebook workflows
- course catalog and enrollment
- staff management and account administration
- timetable, calendar, and school events
- announcements, behavior, finance, and audit screens

## Local development

```bash
cd frontend
npm install
npm run dev
```

## Environment variables

Create a `.env` file or configure the runtime environment with:

```bash
VITE_API_BASE_URL=http://localhost:3000
```

This value defines the target backend API used by the app for authentication and business-logic requests.

## Build and preview

```bash
npm run build
npm run preview
```

## End-to-end checks

Playwright smoke coverage is included for key frontend flows:

```bash
npm run test:e2e
```

The test flow assumes the frontend is served on `http://localhost:5173` and that the backend is reachable from the configured `VITE_API_BASE_URL`.

## Notes

This is the actual application shell for the implemented campus system rather than a starter template. The routes and page set correspond to the current repository implementation and role model.
