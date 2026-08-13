# Chapter 8 — Security and Compliance

## Purpose

Chapter 8 hardens the School Management System’s authentication and security boundary without changing the existing role model. It introduces Argon2id password hashing, controlled migration of legacy bcrypt hashes, server-side session revocation, administrator TOTP MFA, and an append-only security audit log.

## Migration

Apply `backend/db/migrations/010_security_compliance.sql` after migrations 001–009. The backend does not apply SQL migrations automatically. The migration adds security metadata to `user_account`, creates `auth_session`, creates `security_audit_log`, enables row-level security, and installs an immutable audit-log trigger.

Before applying the migration to an existing database, back up the database and confirm that the current service-role backend credentials are available. The migration is designed to be repeatable for its additive objects, but the audit-log trigger must remain owned by the database administrator or migration role.

## Environment configuration

The backend requires a secret named `MFA_ENCRYPTION_KEY` before MFA enrollment can be used. It must represent exactly 32 bytes as either 64 hexadecimal characters or a base64-encoded 32-byte value. Generate it with a secure secret manager or an operating-system random source. Never place this value in frontend environment variables or commit it to Git.

Optional Argon2id tuning variables are `ARGON2_MEMORY_KIB`, `ARGON2_TIME_COST`, and `ARGON2_PARALLELISM`. The defaults are conservative development values and should be benchmarked against the production server before deployment.

## Password migration

New administrator-created accounts and user password changes use Argon2id. Existing bcrypt hashes remain verifiable during the migration period. After a successful login with a legacy hash, the backend replaces it with an Argon2id hash and records `password_algorithm = 'argon2id'`.

This is a controlled compatibility mechanism. It does not permit plaintext passwords, expose hashes through public response fields, or weaken the minimum password length requirement.

## Session behavior

Every issued access token contains a server-side session identifier. The corresponding token hash is stored in `auth_session`. Protected requests require a valid signature, a matching process instance, and an unrevoked, unexpired session row. Logout revokes the current session. Refresh rotates the session. Password changes revoke all active sessions for the account.

This preserves the existing requirement that sessions disappear on tab close through session storage and that backend restarts invalidate process-bound access tokens, while adding explicit server-side revocation.

## Administrator MFA

An administrator opens the profile page and selects **Set up MFA**. The backend returns a TOTP provisioning URI. The administrator adds it to an authenticator application and submits the generated code. The encrypted TOTP secret is stored only after successful verification.

When MFA is enabled, administrator login first returns a short-lived MFA challenge. The administrator must submit the authenticator code before the normal access token is issued. Disabling MFA requires a valid current TOTP code.

## Immutable audit logging

Mutation requests are recorded in `security_audit_log` with the actor, HTTP action, resource path, status code, IP address, user agent, correlation identifier, and sanitized metadata. Passwords, tokens, cookies, MFA secrets, and verification codes are excluded from audit metadata.

The database trigger rejects updates and deletes against audit rows. The application uses the backend service-role connection for insertion, while row-level security prevents direct public access.

## Acceptance tests

The following checks must be completed after applying migration 010 and restarting the backend:

| Test | Expected result |
|---|---|
| Register a new user as administrator | The stored password begins with an Argon2id marker and is not returned in the response. |
| Log in using an existing bcrypt account | Login succeeds and the password hash is upgraded to Argon2id. |
| Log out and replay the old bearer token | The protected request returns HTTP 401. |
| Change a password and reuse an older session | The older session returns HTTP 401. |
| Enroll administrator MFA | A provisioning URI is returned and no plaintext secret is stored. |
| Submit an invalid MFA code | Enrollment or login is rejected with HTTP 400/401 and no access token is issued. |
| Complete administrator MFA login | A normal access token is issued only after a valid code. |
| Submit a sensitive mutation | A corresponding audit row is created. |
| Attempt to update or delete an audit row | The database rejects the operation. |
| Access another role’s protected module | Existing RBAC denial behavior remains unchanged. |

The complete Chapter 8 gate is passed only when the existing chapter tests, the Chapter 8 crypto tests, frontend build, migration verification, and the real Supabase acceptance tests all succeed.
