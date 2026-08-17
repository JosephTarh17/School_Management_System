# Grading and Report Cards

## Scope

This feature adds academic-year and semester-aware grading for actively registered students, an Excel-like teacher gradebook, administrator review and publication for every individual assessment, credit-weighted GPA calculation, and published report-card views for students and linked guardians. The administrator-selected current academic period supplies the default year and semester for active grading workflows.

## Grading rules

Each registered course academic period uses three assessments of type `Test` at 20 percent each and one `Final` examination at 40 percent. The existing letter scale remains: A from 90 to 100, B from 80 to 89, C from 70 to 79, D from 60 to 69, and F below 60.

A student is graded only for courses with an active enrollment. An unjustified absence receives a score of zero and is included in the weighted calculation. A justified absence requires a reason and is excluded from the calculation. A course is incomplete if any required assessment has no mark or absence decision. A course passes at a weighted average of at least 60 percent, equivalent to at least 2.4 on the four-point GPA scale.

The overall GPA is credit-weighted:

```text
GPA = sum(course GPA × course credits) / sum(course credits)
```

## Workflow

1. A teacher selects an administrator-created course offering in **Gradebook**. The current academic year and semester are loaded by default from the Administrator Dashboard.
2. The teacher selects Test 1, Test 2, Test 3, or Final.
3. The teacher enters a mark for every actively registered student or records an absence decision.
4. The gradebook displays live assessment and course metrics.
5. The teacher saves and confirms the assessment.
6. An administrator reviews every mark and publishes the assessment.
7. After all required assessments are published, the administrator generates and publishes the final report card.
8. Students and linked guardians see only administrator-published assessment marks and report cards.

## Migration

Apply `backend/db/migrations/019_report_cards_and_grading.sql` manually in Supabase SQL Editor after the existing migrations, followed by `backend/db/migrations/020_academic_year_and_semesters.sql`, `021_teacher_course_offerings_and_retakes.sql`, and `022_current_academic_period.sql`. The migrations are not executed automatically by the application. Migration 019 adds the grading workflow and `report_card` table; migration 020 transforms legacy academic-period values into `academic_year` plus `semester`; migration 021 creates one-teacher-per-course-period offerings and retake-safe enrollment and final-grade keys; migration 022 supplies the administrator-controlled current period used as the active default.

The migration preserves existing academic records. Existing records with a null score are classified as `PENDING`; existing scored records remain `GRADED`.

## Main endpoints

| Endpoint | Access | Purpose |
|---|---|---|
| `GET /grading/gradebook` | Teacher/administrator | Load a course, selected assessment, active students, marks, and live calculations. |
| `POST /grading/marks` | Teacher | Save a score, unjustified absence, or justified absence. |
| `POST /grading/assessments/:assessmentId/confirm` | Teacher | Confirm all marks for an assessment for administrator review. |
| `GET /grading/review` | Administrator | Review assessment submissions and individual marks. |
| `POST /grading/assessments/:assessmentId/publish` | Administrator | Publish every teacher-confirmed mark for one assessment. |
| `GET /grading/report-cards/:studentId` | Authorized role | Retrieve a report card; students and guardians receive published results only. |
| `POST /grading/report-cards/:studentId/generate` | Administrator | Generate an academic-year and semester report card for review. |
| `POST /grading/report-cards/:studentId/publish` | Administrator | Publish the final report card after all assessments are published. |

## Verification

Run the deterministic grading tests from the backend directory:

```powershell
Set-Location "$project\backend"
npx mocha --no-config test/grading.test.js --exit
```

Build the frontend before committing:

```powershell
npm --prefix "$project\frontend" run build
```

The test suite covers scale boundaries, 20/20/20/40 weighting, justified absence exclusion, unjustified absence zero scoring, incomplete-course prevention, and credit-weighted GPA.

## Security boundaries

Teachers cannot publish marks through the legacy academic-record endpoint. They can only save and confirm marks for administrator review. Administrator publication is required before student or guardian visibility. Student enrollment and guardian-child relationships are checked server-side. No credentials are stored in source files or frontend environment variables.
