# Account Creation Conception

## 1. Purpose

The implemented platform must allow an authorized Administrator to create the non-teaching account types required to operate the school: Student, Guardian, and Administrator. Teacher creation remains under Staff Management because a teacher account is created together with a teacher profile and a linked teaching-staff record.

The feature closes the current gap in which Account Management can manage existing accounts but cannot create Student, Guardian, or Administrator accounts from the interface.

## 2. Actors and authority

| Actor | Allowed action | Boundary |
|---|---|---|
| Administrator | Create Student, Guardian, or Administrator accounts; receive a one-time temporary password; review the result. | Must be authenticated as an Administrator. The action is audited. |
| Teacher | No account creation. | Teacher creation remains an Administrator-only Staff Management action. |
| Student | No account creation. | Students cannot self-promote or create another account. |
| Guardian | No account creation. | Guardians cannot create or link accounts from the portal. |

## 3. Account types and profile records

### Student

The workflow creates one `user_account` with role `student` and one linked `student` profile. Required fields are email and full name. Class level, date of birth, phone, and address are optional or selected from existing valid values. The initial Student has no Guardian relationship unless a separate administrator linking action is later performed.

### Guardian

The workflow creates one `user_account` with role `guardian` and one linked `guardian` profile. Required fields are email and full name. Phone and relationship are optional. The initial Guardian has no linked Student unless a separate administrator linking action is performed.

### Administrator

The workflow creates one `user_account` with role `administrator` and one linked `administrator` profile. Required fields are email and full name. Department is optional. The system must preserve the existing last-active-Administrator protection after creation.

### Teacher

Teacher creation is explicitly excluded from this workflow. The existing Staff Management flow remains the single creation path because it atomically creates the user account, teacher profile, and teaching staff record.

## 4. Credential lifecycle

The Administrator enters identity and profile information, not a permanent password. The backend generates a one-time temporary password, stores only its hash, sets `must_change_password = true`, and returns the temporary password once in the successful response. The interface displays a warning to share it securely. The password must never be written to audit metadata, documentation, logs, or source files.

## 5. Atomicity and rollback

Each account type must be created atomically. A successful operation must produce both the account and its required profile, or produce neither. A partial account without its profile is not an acceptable outcome. The safest implementation is a service-role-only role-dispatch database function with the backend passing a pre-hashed password. Creator identity is captured by the backend security-audit event rather than stored as a user-supplied database-function field.

If an email, profile uniqueness rule, or database constraint fails, the operation returns a conflict or validation error and leaves no orphan account. Existing email addresses must not be reused.

## 6. Validation rules

Email addresses must be normalized to lowercase and validated before insertion. Full names are required and trimmed. Profile-specific optional fields are trimmed and bounded. Student class level is limited to Freshman, Sophomore, or Junior. The role is selected by the server-side endpoint from the permitted account-creation options and must never be trusted from an unrestricted client request.

The creation endpoint is Administrator-only. Direct URL access, manually crafted requests, and role changes in browser tools must receive an authorization failure.

## 7. Audit and lifecycle rules

Every successful or failed creation attempt must follow the existing security-audit conventions without recording passwords. Newly created accounts are active unless the creation operation fails, require first-login password change, and participate in existing disablement, expiration, suspension, MFA, force-logout, and last-active-Administrator protections.

Creating a new Administrator must not weaken the protection that prevents the current system from losing its last active Administrator. The new account remains subject to the same lifecycle controls as every other account.

## 8. Interface design

Account Management receives a clear **Create account** action. The form begins with an account-type selector limited to Student, Guardian, and Administrator. The form then displays only the fields relevant to the selected type. Teacher creation is linked to Staff Management rather than duplicated here.

After success, the page displays the generated temporary password exactly once in a secure warning panel and refreshes the account list. The form must not display a permanent password field, and the temporary password must not remain after page refresh.

## 9. Acceptance conditions

1. An Administrator can create a Student with a linked Student profile and receives one temporary password.
2. An Administrator can create a Guardian with a linked Guardian profile and receives one temporary password.
3. An Administrator can create an Administrator with a linked Administrator profile and receives one temporary password.
4. Duplicate email creation is rejected without an orphan account or profile.
5. Invalid Student class level, missing full name, malformed email, oversized input, and invalid role requests are rejected.
6. A Student, Teacher, or Guardian cannot call the creation endpoint successfully.
7. A created account must change its password at first login.
8. The temporary password is not returned by later account-list or account-detail requests.
9. The created profile appears in the correct role-specific queries.
10. The existing teacher/staff creation workflow continues to work without duplicate records.
11. The last-active-Administrator protection remains functional.
12. No migration is applied until the SQL function and rollback behavior have been reviewed and tested in Supabase.

## 10. Deliberate exclusions

This implementation does not automatically link Guardians to Students, enroll Students in courses, assign Teachers to offerings, send email, activate CinetPay, or allow self-registration. Those are separate workflows with their own authorization and review rules.
