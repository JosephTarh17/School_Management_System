# SMS Backend

Node.js + Express backend scaffold for the School Management System.

## Running locally

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Create `.env` from `.env.example` and set Supabase credentials and a random JWT secret of at least 32 characters.
3. Start the backend:
   ```bash
   npm run dev
   ```

## Environment variables

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — must be a Supabase service role key, not the anon/public key
- `JWT_SECRET` — random secret with at least 32 characters
- `JWT_ISSUER` — defaults to `school-management-system`
- `JWT_AUDIENCE` — defaults to `school-management-client`
- `ACCESS_TOKEN_COOKIE` — defaults to `sms_access_token`
- `NODE_ENV`
- `PORT`

## Endpoints

- `POST /auth/login` — authenticate a user, receive a JWT, and set an HttpOnly session cookie
- `POST /auth/logout` — clear the HttpOnly session cookie
- `GET /auth/session` — return the authenticated session identity and expiry
- `GET /attendance` — list attendance for the authenticated user
- `POST /attendance` — create a new attendance record
- `GET /users/me` — fetch the authenticated user's profile
- `POST /users/register` — create a new user account (admin-only)
- `GET /students` — list student profiles
- `POST /students` — create a student profile (admin-only)
- `GET /courses` — list courses
- `POST /courses` — create a course (teacher/admin)
- `GET /class-sessions` — list class sessions
- `POST /class-sessions` — create a class session (teacher/admin)
- `GET /assessments` — list assessments
- `POST /assessments` — create an assessment (teacher/admin)
- `GET /participation-logs` — list participation entries
- `POST /participation-logs` — create participation logs (teacher/admin)
- `GET /financial-records` — list financial records
- `POST /financial-records` — create financial records (administrator-only)

## Notes

- The backend uses `supabaseClient.js` to connect to Supabase with the service role key.
- `auth/login` expects `email` and `password`.
- Protected routes accept either `Authorization: Bearer <token>` or the HttpOnly `sms_access_token` cookie.
- JWTs use HS256 with issuer and audience validation, an access-token type claim, a unique token ID, and an eight-hour default expiry.
- `requireRole('administrator')`, `requireRole('teacher')`, and `requireRole('student')` enforce server-side RBAC. Data routes additionally enforce student ownership where applicable.
- Login attempts are limited to five failures per IP/email key within 15 minutes in each backend process. Use a shared gateway or distributed limiter for multi-instance production deployments.

## Debug notes

- A login failure was caused by using the anon/public Supabase key instead of the service role key.
- The current environment now uses a valid `SUPABASE_SERVICE_ROLE_KEY` and login/token access was verified.
- Temporary test scripts used during debugging have been removed.
