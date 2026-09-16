# Software Requirements Specification (Current Implementation)
## School Management System (SMS)

**Status:** Implemented and validated in the current repository
**Updated:** 2026-09-16

---

## 1. Purpose and Scope

This document describes the School Management System as it is currently implemented in this repository. It reflects the working product rather than a projection or design-only baseline. The system is a web-based academic and administrative platform built for schools that need role-based portals for administrators, teachers, students, and guardians.

The platform supports operational datasets and workflows across:

- identity and authentication
- academic records and grading
- attendance and absence management
- registration and enrollment
- timetables and class scheduling
- school events and calendar visibility
- announcements and notifications
- staff management
- finance and payment handling
- guardian access and engagement
- audit, search, and system governance

---

## 2. System Overview

The School Management System is a multi-tier application using a Node.js/Express backend, a Vue 3 frontend, and a Supabase/PostgreSQL data layer. The backend enforces access control and business logic on the server side. The frontend consumes the API with role-aware navigation and page-level protections.

The implementation includes both domain logic and operational controls needed for a functioning school system. It is not limited to a single feature set; it addresses the complete institution workflow represented in the existing routes, migrations, pages, and automated tests.

---

## 3. Architectural Model

### 3.1 Application layers

- Presentation layer: Vue 3 single-page app in `frontend/src`
- API layer: Express routes in `backend/src/routes`
- Business logic layer: services and helpers in `backend/src/lib`
- Data layer: Supabase/PostgreSQL via `backend/src/supabaseClient.js`
- Security layer: JWT auth, RBAC middleware, MFA, audit logging, and session controls

### 3.2 Deployment model

The codebase is oriented toward a Supabase-backed application with environment-driven configuration and role-specific access boundaries. The frontend is delivered through Vite, while the backend exposes the REST API and security rules in a Node.js runtime.

---

## 4. User Roles and Authority

| Role | Primary responsibilities | Typical access |
| --- | --- | --- |
| Administrator | System configuration, user lifecycle, review, finance, school operations | full administrative management |
| Teacher | Attendance, grade entry, teaching schedules, course delivery | assigned academic workflows |
| Student | Academic records, registration, personal attendance, profiles | own records and permitted views |
| Guardian | Linked-child oversight, notifications, absence justifications, financial visibility | linked child scope only |

The system enforces server-side authority boundaries. Users cannot access data outside the scope assigned to their role or linked records.

---

## 5. Functional Requirements

### 5.1 Authentication and Account Lifecycle

The system shall provide:

- secure login with email and password validation
- JWT issuance with role, subject, issuer, audience, and token metadata
- HttpOnly cookie-based session handling
- refresh and logout flows
- login throttling and failed-attempt control
- optional MFA for administrator accounts
- support for password migration from legacy hashes
- account status handling for disabled, suspended, or expired accounts

Implemented routes include `/auth/login`, `/auth/logout`, `/auth/session`, `/auth/refresh`, `/auth/mfa/enroll`, and `/auth/mfa/verify`.

### 5.2 User, Student, and Guardian Management

The system supports:

- user account creation and profile linkage
- student record management
- guardian linkage to students
- account status changes and audit visibility
- administrator-controlled account provisioning

The system explicitly separates operational creation from direct user self-service and maintains audit records for changes.

### 5.3 Staff Management

The platform includes staff directory, attendance, and leave workflows:

- staff record creation and search
- employee and department-backed metadata
- staff attendance logging
- leave status review and approval flow
- role access restrictions to administrator-only staff administration

This module is implemented in the backend route group for staff operations and the corresponding frontend pages.

### 5.4 Course Catalog, Offerings, and Registration

The system provides:

- catalog course definitions
- teacher offerings by academic year and semester
- enrollment and student registration request workflows
- review and approval processes for registrations
- academic-period-aware course visibility

The platform distinguishes between current offerings and historical data while preserving period-specific records.

### 5.5 Attendance and Absence Justification

The system supports:

- daily and session-based attendance capture
- allowed attendance statuses for tracked classroom events
- teacher-controlled attendance updates
- absence justification workflows for students and guardians
- attendance threshold and reporting logic
- attendance alerts and notification triggers

The attendance APIs and related reports are implemented across the attendance, absence-justification, dashboard, and notification modules.

### 5.6 Assessment and Gradebook

The implementation covers:

- assessment definition and retrieval
- grade entry by teachers
- administrator review and publication flows
- final result generation and report-card publication
- gradebook access for authorized roles
- role-scoped academic views for students and guardians

This is one of the largest implemented modules in the codebase and is reflected in the grading, academic-record, and report-card routes.

### 5.7 Timetabling, Calendar, and School Events

The project includes:

- recurring timetable entries
- occurrence generation and conflict detection
- room and class-location constraints
- calendar aggregation by academic and personal scope
- school events publication and visibility
- teacher absence reporting and schedule review
- course-hours and allocation validation

These features are represented by the timetable, calendar, school events, room, course-hours, and teacher-absence routes.

### 5.8 Guardian Portal and Family Access

The system provides guardian-specific access to:

- linked child dashboard summaries
- attendance history and absence justification status
- published results and report-card visibility
- announcements and notifications
- school calendar and timetable views
- engagement and communication workflows

This is protected by relationship-scoped authorization so guardians only view permitted child data.

### 5.9 Announcements, Notifications, and Search

The platform includes:

- announcement publication by audience
- in-app notification inbox with read-state logic
- notification fanout for attendance, registration, grading, and other events
- role-based quick search and record navigation
- landing-page and dashboard search capability

This module supports both operational communications and institutional visibility.

### 5.10 Finance and CinetPay

The system includes:

- financial records and related summary logic
- payment-tracking and reconciliation flows
- installment-aware finance display
- CinetPay payment-attempt and verification services
- secure server-side payment handling

This implementation reflects a real finance integration rather than a placeholder or demo-only flow.

### 5.11 Behavior, Compliance, and Governance

The system supports:

- behavior incident recording and classification
- disciplinary reviews and tracking
- security audit logs
- admin visibility over actions affecting sensitive records
- role-scoped error handling and security-event documentation

This is a core governance feature and is enforced in the backend middleware and audit route design.

---

## 6. Non-Functional Requirements

### 6.1 Security

The implemented system is designed around strong backend security assumptions:

- credentials are protected through hashing and migration support
- permission checks occur on the server side
- JWTs are validated for authenticity and expiry
- sessions can be revoked
- sensitive actions are recorded in an audit trail
- administrators may enable MFA

### 6.2 Data integrity

The project assumes a relational database with transaction-safe operations. The schema and migration set include integrity constraints, indexes, and validation logic for required domain rules such as attendance, grades, and schedule conflicts.

### 6.3 Availability and operability

The repository supports a practical operational model with:

- a health endpoint for backend readiness checks
- environment-based configuration
- separation of frontend and backend runtime concerns
- modular route configuration for maintainability
- dedicated unit tests covering security and access-control behavior

### 6.4 Accessibility and usability

The frontend is designed for role-specific navigation and responsive institutional use. Pages are organized to reflect the responsibilities of administrators, teachers, students, and guardians rather than exposing all features to every user.

---

## 7. Interface Requirements

### 7.1 Backend API interface

The backend exposes a REST-style API with JSON requests and responses. Most routes require authentication and role validation. This interface is the system boundary between the frontend and the institutional data layer.

### 7.2 Frontend interface

The Vue frontend organizes the product into role-aware pages such as:

- Login and signup flows
- Student portal and enrollment pages
- Teacher attendance and gradebook pages
- Admin dashboard and account management
- Guardian portal and engagement pages
- Timetable and calendar pages
- Financial and reporting screens

### 7.3 External integrations

The system integrates with:

- Supabase for persistence and data access
- CinetPay for payment-attempt processing
- environment configuration for secure deployment settings
- optional localization and reporting data flows

---

## 8. Current Release Status

The repository reflects an implemented institutional system and should be treated as the current working specification for the project. The following areas are included in the code and documentation set:

- authentication and RBAC
- student and guardian workflows
- academic features
- scheduling and events
- behavior and governance
- finance and payment integration
- reporting, notifications, and search

This release is not a conceptual prototype. It is a functional application foundation with production-oriented backend logic, database migrations, UI pages, and automated validation.

---

## 9. Acceptance Summary

The project is considered complete for the current scope when:

1. the backend starts with valid Supabase and JWT configuration;
2. the frontend builds successfully against the configured API base URL;
3. automated backend tests pass;
4. users can authenticate and access role-appropriate pages;
5. operational workflows for attendance, academics, registration, and guardian access function as implemented.

This specification therefore serves as the actual project baseline for ongoing maintenance, feature work, and production readiness review.

### 8.2 Preliminary Budget Estimate
The estimated total project budget is **$120,000 USD**, broken down across major cost centers:

| Cost Category | Allocation (%) | Estimated Cost (USD) | Description |
| :--- | :--- | :--- | :--- |
| **Software Engineering** | 55% | $66,000 | Full-stack development, API integration, database design. |
| **UI/UX Design & Frontend** | 15% | $18,000 | Responsive interface design, accessibility compliance, user journey mapping. |
| **Quality Assurance & Testing** | 15% | $18,000 | Automated testing, security penetration testing, bug fixing. |
| **Project Management & DevOps** | 10% | $12,000 | Scrum management, CI/CD pipeline setup, cloud infrastructure provisioning. |
| **Contingency Reserve** | 5% | $6,000 | Unforeseen technical hurdles and scope adjustments. |
| **Total** | **100%** | **$120,000** | **Complete turnkey delivery of the School Management System.** |

---

## 9. Appendices

### 9.1 References
1. IEEE Std 830-1998, *IEEE Recommended Practice for Software Requirements Specifications*. Institute of Electrical and Electronics Engineers.
2. Pressman, R. S., *Software Engineering: A Practitioner's Approach*, 8th Edition, McGraw-Hill.
3. Family Educational Rights and Privacy Act (FERPA), U.S. Department of Education compliance guidelines.

### 9.2 Acronyms and Abbreviations
* **ACID:** Atomicity, Consistency, Isolation, Durability
* **API:** Application Programming Interface
* **FERPA:** Family Educational Rights and Privacy Act
* **GDPR:** General Data Protection Regulation
* **GPA:** Grade Point Average
* **HTTP/HTTPS:** Hypertext Transfer Protocol / Secure
* **JWT:** JSON Web Token
* **RBAC:** Role-Based Access Control
* **SMS:** School Management System
* **SMTP:** Simple Mail Transfer Protocol
* **SRS:** Software Requirements Specification
* **TLS:** Transport Layer Security
* **UAT:** User Acceptance Testing
* **UI/UX:** User Interface / User Experience

---

## 10. Conclusion

The Software Requirements Specification (SRS) for the School Management System provides a rigorous, structured roadmap for developing a robust digital platform tailored to modern educational needs. By defining clear functional specifications for attendance tracking, assessment management, class scheduling, and student participation monitoring—alongside stringent non-functional and performance constraints—this document aligns all project stakeholders. Adherence to this specification ensures the delivery of a secure, scalable, and high-quality software product within the allocated schedule and budget, ultimately empowering educational institutions to optimize their academic operations.
