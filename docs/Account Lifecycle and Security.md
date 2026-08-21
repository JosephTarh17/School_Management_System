# Account Lifecycle and Security

This feature extends the administrator Account Management module without deleting user, academic, attendance, finance, timetable, discipline, or audit records.

## Lifecycle controls

Administrators can configure a temporary suspension end date, an account expiration date, and a mandatory reason. A temporary suspension disables access until the scheduled job re-enables the account. An account expiration disables access permanently until an administrator reviews and enables it. Manual enable/disable protections remain active: an administrator cannot disable the current account or the last active administrator.

## Activation and MFA

New accounts and administrator-generated temporary-password accounts receive a first-login password-change requirement. After the user changes the password, the requirement is cleared and all previous sessions remain revoked. Administrators may reset MFA for another administrator; the reset clears the current MFA enrollment, revokes sessions, and requires MFA setup again.

## Security monitoring

Successful and failed login activity records timestamp, role, failed-attempt count, IP address, user-agent, and audit metadata. Passwords, temporary passwords, MFA secrets, codes, cookies, and tokens are never written to audit metadata.

## Free check-on-access maintenance

The free-plan deployment does not require a separate Render Cron Job. A throttled lifecycle check runs when authentication, account management, attendance, absence-justification, or calendar APIs are accessed. It processes due suspension reactivation, account expiration, account lifecycle notifications, and student absence-justification deadline expiry at most once per minute per backend process.

The check is idempotent: status/date conditions prevent repeated state changes, and notification event keys prevent duplicate notifications. Because the free web service may be idle, processing occurs on the next relevant request rather than at an exact clock time.

## Account creation

Administrators can now use **Account Management → Create account** to create a Student, Guardian, or Administrator account with its required linked profile. Teacher creation remains under **Staff Management** because it also creates the teaching staff record.

The backend generates a one-time temporary password, stores only its Argon2id hash, marks the account as requiring a password change at first login, and displays the temporary password once after successful creation. The account and profile are created atomically by the service-role-only database function introduced in migration 031. Duplicate email addresses, invalid role requests, invalid Student class levels, malformed dates, and incomplete names are rejected without leaving an orphan account.

The creation endpoint is Administrator-only and is audited without storing passwords. Creating a new Administrator does not weaken the existing last-active-Administrator protection. Student and Guardian accounts are initially created without Guardian relationships; an Administrator must use the existing relationship workflow to link them.

## Required migration

Apply migration `029_account_lifecycle_security.sql` after migrations `001` through `028` and before deploying the updated backend. Apply migration `031_atomic_role_account_creation.sql` after migration 030 before using the Account Management creation form.
