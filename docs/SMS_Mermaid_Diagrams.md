# School Management System (SMS) - Mermaid Diagrams

This document contains Mermaid code representing the structure, architecture, and workflows of the School Management System (SMS) as defined in the SRS.

## 1. System Architecture
This flowchart illustrates the multi-tier architecture of the SMS, including the frontend, backend API, database, and external integrations.

```mermaid
graph TD
    subgraph Client_Layer [Client Layer]
        A[Student / Parent Portal]
        B[Teacher Portal]
        C[Administrator Dashboard]
    end

    subgraph Frontend [Presentation Layer]
        D[Responsive Web UI]
        E[Session & State Manager]
    end

    subgraph Backend [Application Layer]
        F[API Gateway / REST API]
        G[Auth Service (OAuth2/JWT)]
        H[Attendance Service]
        I[Assessment Service]
        J[Scheduling Service]
        K[Notification Service]
        L[Reporting & Analytics]
    end

    subgraph Data_Layer [Data Layer]
        M[(Relational Database)]
        N[(Audit & Log Store)]
    end

    subgraph External_Integrations [External Integrations]
        O[Email / SMS Provider]
        P[Payment / Billing Gateway]
        Q[Biometric / RFID Devices]
        R[Identity Provider]
    end

    A --> D
    B --> D
    C --> D
    D --> F
    F --> G
    F --> H
    F --> I
    F --> J
    F --> K
    F --> L
    H --> M
    I --> M
    J --> M
    L --> M
    F --> N
    K --> O
    G --> R
    H --> Q
    K --> P
```

## 2. Entity Relationship Diagram (ERD)
This diagram defines the data structure and relationships between core entities like Students, Guardians, Courses, Authentication, and Participation records.

```mermaid
erDiagram
    USER_ACCOUNT ||--o{ STUDENT : owns
    USER_ACCOUNT ||--o{ TEACHER : owns
    USER_ACCOUNT ||--o{ GUARDIAN : owns
    USER_ACCOUNT ||--o{ ADMINISTRATOR : owns
    STUDENT ||--o{ STUDENT_GUARDIAN : linked
    STUDENT ||--o{ ATTENDANCE : records
    STUDENT ||--o{ ACADEMIC_RECORD : owns
    STUDENT ||--o{ PARTICIPATION_LOG : logs
    STUDENT ||--o{ FINANCIAL_RECORD : charged
    TEACHER ||--o{ CLASS_SESSION : leads
    COURSE ||--o{ CLASS_SESSION : contains
    COURSE ||--o{ ASSESSMENT : defines
    COURSE ||--o{ FINAL_GRADE : produces
    CLASS_SESSION ||--o{ ATTENDANCE : tracks
    CLASS_SESSION ||--o{ PARTICIPATION_LOG : monitors
    ROOM ||--o{ CLASS_SESSION : assigned
    ACADEMIC_RECORD ||--|| ASSESSMENT : belongs_to
    ACADEMIC_PERIOD_SETTINGS ||--o{ TEACHER_COURSE_ASSIGNMENT : defaults
    ACADEMIC_PERIOD_SETTINGS ||--o{ CLASS_SESSION : defaults
    ACADEMIC_PERIOD_SETTINGS ||--o{ ENROLLMENT : defaults

    USER_ACCOUNT {
        string user_id PK
        string email
        string password_hash
        string role
        boolean mfa_enabled
        datetime created_at
        datetime last_login
    }

    STUDENT {
        string student_id PK
        string user_id FK
        string full_name
        date dob
        string phone
        string address
    }

    GUARDIAN {
        string guardian_id PK
        string user_id FK
        string full_name
        string email
        string phone
        string relationship
    }

    ADMINISTRATOR {
        string administrator_id PK
        string user_id FK
        string full_name
        string department
    }

    STUDENT_GUARDIAN {
        string student_guardian_id PK
        string student_id FK
        string guardian_id FK
        string primary_contact
    }

    TEACHER {
        string teacher_id PK
        string user_id FK
        string full_name
        string email
        string department
    }

    ACADEMIC_PERIOD_SETTINGS {
        int setting_id PK
        int academic_year
        string semester
        datetime updated_at
    }

    COURSE {
        string course_id PK
        string course_name
        string course_code
        int credit_units
    }

    ROOM {
        string room_id PK
        string room_name
        string location
        int capacity
    }

    TEACHER_COURSE_ASSIGNMENT {
        string assignment_id PK
        string teacher_id FK
        string course_id FK
        int academic_year
        string semester
        string status
    }

    CLASS_SESSION {
        string session_id PK
        string course_id FK
        string teacher_id FK
        int academic_year
        string semester
        string room_id FK
        string substitute_teacher_id FK
        datetime start_time
        datetime end_time
        string recurrence_pattern
    }

    ASSESSMENT {
        string assessment_id PK
        string course_id FK
        string title
        string assessment_type
        float max_score
        float weight
        date due_date
    }

    FINAL_GRADE {
        string final_grade_id PK
        string student_id FK
        string course_id FK
        float computed_score
        string letter_grade
        float gpa
    }

    ACADEMIC_RECORD {
        string record_id PK
        string student_id FK
        string assessment_id FK
        float score
        string grade
    }

    PARTICIPATION_LOG {
        string participation_id PK
        string student_id FK
        string session_id FK
        string rating
        string notes
        date recorded_at
    }

    ATTENDANCE {
        string attendance_id PK
        string student_id FK
        string session_id FK
        date session_date
        string status
    }

    FINANCIAL_RECORD {
        string invoice_id PK
        string student_id FK
        float amount_due
        float amount_paid
        string payment_status
        date due_date
    }
```

## 3. Use Case Diagram
This use case diagram represents the main activities performed by Administrators, Teachers, Students, and Parents.

```mermaid
usecaseDiagram
    actor Administrator
    actor Teacher
    actor Student
    actor Parent

    Administrator --> (Manage Users)
    Administrator --> (Configure System)
    Administrator --> (Schedule Classes)
    Administrator --> (Generate Reports)
    Administrator --> (Review Audits)

    Teacher --> (Mark Attendance)
    Teacher --> (Create Assessments)
    Teacher --> (Grade Student Work)
    Teacher --> (Manage Class Sessions)
    Teacher --> (Record Participation)
    Teacher --> (Send Announcements)

    Student --> (View Schedule)
    Student --> (Check Grades)
    Student --> (Submit Assignments)
    Student --> (Track Attendance)
    Student --> (Receive Notifications)

    Parent --> (Monitor Progress)
    Parent --> (View Attendance)
    Parent --> (Pay Fees)
    Parent --> (Receive Alerts)

    (Mark Attendance) ..> (Send Announcements)
    (Create Assessments) ..> (Grade Student Work)
    (View Schedule) ..> (Track Attendance)
    (Monitor Progress) ..> (Receive Alerts)
```

## 4. Data Flow Diagram - Context Level
This top-level DFD shows the system boundaries and external entities that interact with SMS.

```mermaid
flowchart TD
    subgraph External_Actors [External Entities]
        A[Teachers]
        B[Students]
        C[Parents]
        D[Administrators]
        E[Biometric / RFID Systems]
        F[Payment Provider]
        G[Email / SMS Provider]
    end

    subgraph System [SMS System]
        H[Student Management System]
    end

    A --> H
    B --> H
    C --> H
    D --> H
    E --> H
    F --> H
    G --> H
    H --> A
    H --> B
    H --> C
    H --> D
```

## 5. Data Flow Diagram - Level 1
This decomposed DFD breaks the core system into processes, data stores, and data flows.

```mermaid
flowchart TD
    subgraph Processes [Core Processes]
        P1[Attendance Processing]
        P2[Assessment Processing]
        P3[Class Scheduling]
        P4[Notifications & Reporting]
        P5[Participation Monitoring]
    end

    subgraph Stores [Data Stores]
        S1[(Student Records)]
        S2[(Attendance Logs)]
        S3[(Grade Records)]
        S4[(Class Schedules)]
        S5[(Financial Records)]
        S6[(Participation Logs)]
    end

    subgraph Actors [Users]
        U1[Teacher]
        U2[Student]
        U3[Parent]
        U4[Administrator]
    end

    U1 --> P1
    U1 --> P2
    U1 --> P5
    U4 --> P3
    U3 --> P4
    U2 --> P4

    P1 --> S1
    P1 --> S2
    P2 --> S1
    P2 --> S3
    P3 --> S4
    P4 --> S1
    P4 --> S2
    P4 --> S3
    P4 --> S4
    P4 --> S5
    P4 --> S6
    P5 --> S1
    P5 --> S6

    S1 --> P2
    S1 --> P5
    S2 --> P4
    S3 --> P4
    S4 --> P4
    S5 --> P4
    S6 --> P4
```

## 6. Sequence Diagram
This sequence diagram illustrates a teacher recording attendance, persisting the data, and notifying parents when a student is absent.

```mermaid
sequenceDiagram
    participant Teacher as Teacher
    participant Browser as Web App
    participant API as SMS Backend
    participant DB as Database
    participant Notify as Notification Service
    participant Parent as Parent Portal

    Teacher->>Browser: Open attendance sheet
    Browser->>API: GET /class-session/{id}/attendance
    API->>DB: Query session and student data
    DB-->>API: Return session details
    API-->>Browser: Send attendance sheet

    Teacher->>Browser: Submit attendance record
    Browser->>API: POST /attendance
    API->>DB: Save attendance entry
    DB-->>API: Confirm save
    alt student is absent
        API->>Notify: Send absence alert
        Notify->>Parent: Deliver notification
        Parent-->>Notify: Confirm receipt
    end
    API-->>Browser: Attendance saved
```

## 7. Sequence Diagram - Assessment and Final Grade Workflow
This sequence diagram shows how assessments are created, scored, and aggregated into a final course grade.

```mermaid
sequenceDiagram
    participant Teacher as Teacher
    participant Browser as Web App
    participant API as SMS Backend
    participant DB as Database
    participant Student as Student Portal

    Teacher->>Browser: Create assessment
    Browser->>API: POST /courses/{id}/assessments
    API->>DB: Store assessment schema
    DB-->>API: Confirmation
    API-->>Browser: Assessment published

    Student->>Browser: Submit assessment result
    Browser->>API: POST /assessments/{id}/scores
    API->>DB: Save score entry
    DB-->>API: Confirm save
    API->>DB: Recalculate final grade
    DB-->>API: Updated grade record
    API-->>Student: Grade updated
```

## 8. Sequence Diagram - Class Session Scheduling and Conflict Detection
This sequence diagram represents how class session requests are validated and scheduled.

```mermaid
sequenceDiagram
    participant Admin as Administrator
    participant Browser as Admin Console
    participant API as SMS Backend
    participant Scheduler as Scheduling Engine
    participant DB as Database

    Admin->>Browser: Request new session
    Browser->>API: POST /class-sessions
    API->>Scheduler: Validate room + instructor availability
    Scheduler->>DB: Query existing sessions
    DB-->>Scheduler: Return schedule conflicts
    alt conflict found
        Scheduler-->>API: Conflict error
        API-->>Browser: Show scheduling conflict
    else no conflict
        Scheduler-->>API: Approve session
        API->>DB: Save session details
        DB-->>API: Confirmation
        API-->>Browser: Session scheduled
    end
```

## 9. Sequence Diagram - Participation Logging and Reporting
This sequence diagram shows teachers logging participation and the system storing it for reporting.

```mermaid
sequenceDiagram
    participant Teacher as Teacher
    participant Browser as Web App
    participant API as SMS Backend
    participant DB as Database
    participant Reports as Reporting Service

    Teacher->>Browser: Record participation
    Browser->>API: POST /participation
    API->>DB: Save participation log
    DB-->>API: Confirmation
    API->>Reports: Update participation metrics
    Reports-->>DB: Query historical logs
    DB-->>Reports: Return participation summary
    API-->>Browser: Participation recorded
```

## 10. Component Diagram - Service Architecture
This diagram defines the core service boundaries and runtime components that support the SMS.

```mermaid
graph LR
    subgraph Client[Client Layer]
        A[Student Portal]
        B[Parent Portal]
        C[Teacher Portal]
        D[Administrator Dashboard]
    end

    subgraph Edge[Edge / API Layer]
        E[Web App / SPA]
        F[API Gateway / REST API]
    end

    subgraph Services[Backend Services]
        G[Auth Service]
        H[Attendance Service]
        I[Assessment Service]
        J[Scheduling Service]
        K[Notification Service]
        L[Reporting Service]
        M[Participation Service]
    end

    subgraph Data[Data Layer]
        N[(Primary Relational DB)]
        O[(Audit / Analytics Store)]
        P[(Cache / Read Replica)]
        Q[(Secrets / Config Store)]
    end

    subgraph External[External Systems]
        R[Email/SMS Provider]
        S[Payment Gateway]
        T[Biometric/RFID System]
        U[Identity Provider]
    end

    A --> E
    B --> E
    C --> E
    D --> E
    E --> F
    F --> G
    F --> H
    F --> I
    F --> J
    F --> K
    F --> L
    F --> M
    H --> N
    I --> N
    J --> N
    M --> N
    H --> O
    I --> O
    J --> O
    L --> O
    G --> U
    K --> R
    J --> T
    F --> Q
    L --> P
```

## 11. Sequence Diagram - Authentication and Authorization
This sequence diagram illustrates login, MFA, JWT issuance, and role validation in the SMS.

```mermaid
sequenceDiagram
    participant User as End User
    participant Browser as Web App
    participant API as SMS Backend
    participant Auth as Auth Service
    participant DB as Database
    participant IdP as Identity Provider
    participant Audit as Audit Store

    User->>Browser: Enter credentials
    Browser->>API: POST /auth/login
    API->>Auth: Validate credentials/MFA
    Auth->>DB: Query user account
    DB-->>Auth: User record
    alt MFA required
        Auth->>User: Request second factor
        User-->>Auth: Submit OTP
        Auth->>IdP: Verify MFA
        IdP-->>Auth: MFA success
    end
    Auth->>API: Issue JWT token
    API-->>Browser: Return token
    Browser->>API: Request protected resource
    API->>Auth: Validate token + RBAC
    Auth->>Audit: Log auth event
    API-->>Browser: Resource response
```

## 12. Sequence Diagram - Notification and Audit Logging
This sequence diagram shows absence notification delivery and audit tracking.

```mermaid
sequenceDiagram
    participant Teacher as Teacher
    participant Browser as Web App
    participant API as SMS Backend
    participant DB as Database
    participant Notify as Notification Service
    participant Parent as Parent Portal
    participant Audit as Audit Store

    Teacher->>Browser: Mark student absent
    Browser->>API: POST /attendance
    API->>DB: Save absence record
    DB-->>API: Confirm save
    API->>Notify: Send absence alert
    Notify->>Parent: Deliver notification
    Parent-->>Notify: Acknowledge receipt
    API->>Audit: Record audit event
    Audit-->>API: Confirmation
    API-->>Browser: Attendance and alert complete
```

## 13. Deployment Architecture Diagram
This diagram shows the production deployment topology with containers, managed data services, and external integrations.

```mermaid
graph LR
    subgraph Users[Users]
        A[Students / Parents / Teachers / Admins]
    end

    subgraph Browser[Frontend]
        B[Browser]
        C[SPA Static Assets / CDN]
    end

    subgraph Cloud[Cloud Infrastructure]
        D[Load Balancer / API Gateway]
        E[Kubernetes Cluster]
    end

    subgraph Cluster[Cluster Workloads]
        F[Web App Pods]
        G[API Pods]
        H[Auth Pods]
        I[Worker / Batch Pods]
        J[Monitoring / Logging]
        K[Secrets / Config Store]
    end

    subgraph Data[Managed Data Services]
        L[(Managed SQL Database)]
        M[(Read Replica / Reporting DB)]
        N[(Object Storage / Backups)]
    end

    subgraph Integrations[External Integrations]
        O[Email / SMS Service]
        P[Payment Gateway]
        Q[Identity Provider]
        R[Biometric / RFID Devices]
    end

    A --> B
    B --> C
    B --> D
    D --> E
    E --> F
    E --> G
    E --> H
    E --> I
    E --> J
    E --> K
    G --> L
    G --> M
    G --> N
    H --> Q
    G --> O
    G --> P
    G --> R
    K --> E
    J --> E
```

## 14. Existing Diagrams & System Overview
This file can be expanded with additional workflow diagrams, Gantt charts, or process maps as the SMS design evolves.

## 15. Technology Guidance Matrix
This section maps the current diagrams and requirements to the architectural choices you should evaluate before selecting a tech stack.

### 15.1 Frontend / Client
- Requirements: responsive portals for Students, Parents, Teachers, Administrators; secure JWT-based auth; real-time notifications.
- Recommended architecture: Single-page application (SPA) with client-side routing, component library, and mobile-responsive design.
- Decision criteria:
  - Choose a framework with strong form handling, state management, and accessible UI component support.
  - Prefer progressive enhancement and good mobile support for low-device users.
- Common options:
  - React / Next.js
  - Vue.js / Nuxt
  - Angular

### 15.2 Backend API and Services
- Requirements: REST API or GraphQL support for auth, attendance, assessments, scheduling, participation, notifications, and reporting.
- Recommended architecture: modular service layer with clearly separated domain services and API gateway.
- Decision criteria:
  - Prefer a framework that supports rapid API development, middleware for auth, and strong validation.
  - Select a language/runtime with good ecosystem support for authentication, scheduling, batch jobs, and telemetry.
- Common options:
  - Node.js (Express, NestJS)
  - Python (FastAPI, Django)
  - Java / Kotlin (Spring Boot)
  - .NET Core

### 15.3 Database / Data Layer
- Requirements: relational managed SQL database, ACID compliance, read scaling, backups, partitioning, and audit/history support.
- Recommended architecture: primary relational database plus read replica or analytics store for reporting.
- Decision criteria:
  - Use a managed cloud SQL service for reliability and scaling.
  - Support partitioning or archiving for multi-year attendance and grade history.
- Common options:
  - PostgreSQL / Amazon RDS / Azure Database for PostgreSQL
  - MySQL / Amazon Aurora / Google Cloud SQL
  - TiDB for distributed SQL workloads

### 15.4 Authentication, Authorization, and Security
- Requirements: RBAC, MFA, JWT, secure session handling, audit logging, encryption in transit and at rest.
- Recommended architecture: dedicated auth service or identity provider with federated login support.
- Decision criteria:
  - Choose a provider or library that supports MFA, JWT issuance, role validation, and token revocation.
  - Ensure all external communications use TLS and secrets are managed securely.
- Common options:
  - Auth0, Okta, Azure AD B2C
  - OIDC / OAuth2 libraries for native auth service
  - JWT token middleware and role-checking rules in the API

### 15.5 Integration and Notifications
- Requirements: external email/SMS provider, optional biometric/RFID integration, payment gateway support.
- Recommended architecture: service adapters for each external integration with retry and fallback logic.
- Decision criteria:
  - Use stable provider SDKs with webhook support for delivery status.
  - Keep integration code isolated from domain services.
- Common options:
  - Twilio, SendGrid, AWS SES
  - Stripe, PayPal, local payment gateway APIs
  - Custom REST endpoint for biometric/RFID devices

### 15.6 Containerization and Deployment
- Requirements: Docker packaging, Kubernetes orchestration, secrets/config management, CI/CD, zero-downtime deployment.
- Recommended architecture: containerized frontend and backend, managed SQL service, centralized logging/metrics.
- Decision criteria:
  - Choose a platform that supports Kubernetes-native deployments and infrastructure-as-code.
  - Use CI pipelines that build, test, scan, and deploy containers automatically.
- Common options:
  - Docker + Kubernetes / EKS / AKS / GKE
  - GitHub Actions, GitLab CI, Azure DevOps
  - Prometheus, Grafana, ELK / EFK stack

### 15.7 Observability and Maintenance
- Requirements: health checks, metrics, centralized logs, backup and recovery, performance monitoring.
- Recommended architecture: monitoring service with alerting and tracing support.
- Decision criteria:
  - Expose liveness/readiness probes for containers.
  - Collect logs and metrics centrally, and retain audit records for compliance.
- Common options:
  - Prometheus / Grafana
  - OpenTelemetry
  - Cloud provider monitoring services
