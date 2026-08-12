# School Management System Project Structure

## Overview
This repository contains a school management system implementation with separate `backend` and `frontend` applications, plus documentation and infrastructure notes.

## Root
- `.git/` - Git repository metadata
- `.gitattributes`
- `.gitignore`
- `README.md` - root repository overview
- `Tech Stack.png` - architecture or stack diagram image
- `backend/` - Node.js backend API
- `frontend/` - Vue.js frontend application
- `docs/` - project documentation
- `Infra/` - infrastructure documentation or support files

## backend/
A Node.js backend service likely using Supabase or a relational database.
- `.env` - environment variables for local development
- `.env.example` - example environment variable template
- `package.json` - backend dependencies and scripts
- `package-lock.json`
- `README.md` - backend-specific documentation
- `db/`
  - `supabase_schema.sql` - database schema definitions
- `src/`
  - `app.js` - backend app initialization
  - `index.js` - backend server entry point
  - `supabaseClient.js` - Supabase client configuration
  - `middleware/`
    - `auth.js` - authentication middleware
  - `routes/`
    - `assessments.js`
    - `attendance.js`
    - `auth.js`
    - `classSessions.js`
    - `courses.js`
    - `financialRecords.js`
    - `participationLogs.js`
    - `students.js`
    - `users.js`
- `test/`
  - `auth-attendance.test.js` - backend test coverage for auth and attendance

## frontend/
A Vue.js + Tailwind CSS frontend application.
- `package.json` - frontend dependencies and scripts
- `package-lock.json`
- `README.md` - frontend-specific documentation
- `index.html` - application entry HTML
- `vite.config.js` - Vite build config
- `postcss.config.js` - PostCSS configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `playwright.config.mjs` - end-to-end testing config with Playwright
- `dist/` - build output folder
- `node_modules/` - installed frontend packages
- `src/`
  - `api.js` - client API integration utilities
  - `App.vue` - root Vue component
  - `main.js` - frontend app bootstrap
  - `index.css` - global CSS styles
  - `components/`
    - `Badge.vue`
    - `Navbar.vue`
    - `Sidebar.vue`
    - `StatCard.vue`
  - `pages/`
    - `AdminDashboard.vue`
    - `Assessments.vue`
    - `AttendanceManagement.vue`
    - `ClassSessions.vue`
    - `CourseCatalog.vue`
    - `Dashboard.vue`
    - `FinancialRecords.vue`
    - `LandingPage.vue`
    - `LoginPage.vue`
    - `ParticipationLog.vue`
    - `SignUpPage.vue`
    - `StudentPortal.vue`
    - `TeacherAttendance.vue`
    - `UserProfile.vue`
  - `router/`
    - `index.js` - Vue Router configuration
  - `store/`
    - `auth.js` - authentication store state
- `tests/`
  - `auth-attendance.spec.js` - frontend test coverage for auth and attendance
- UI design and planning files
  - `# SMS Full UI Implementation Guide.txt`
  - `# SMS Vue.js & Tailwind Component L.txt`
  - `# SMS Vue.js Implementation Guide.txt`
  - `Admininstrator_Dashboard.txt`
  - `Assessments.txt`
  - `Attendance_Management.txt`
  - `Class_Sessions.txt`
  - `Course_Catalog.txt`
  - `Dashboard.txt`
  - `Financial_Records.txt`
  - `Participation_Log.txt`
  - `Landing_Page.txt`
  - `Login_Page.txt`
  - `SignUp_Page.txt`
  - `Student_Portal.txt`
  - `Teacher_Attendance_Participation.txt`
  - `User_Profile.txt`

## docs/
- `SMS_Mermaid_Diagrams.md` - architecture diagrams using Mermaid syntax
- `Software Requirements Specification (SRS).md` - functional and non-functional requirements

## Infra/
- `README.md` - infrastructure-related guidance and setup notes
