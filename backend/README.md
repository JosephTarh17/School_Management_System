# SMS Backend

Node.js + Express backend scaffold for the School Management System.

## Running locally

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Create `.env` from `.env.example` and set Supabase credentials and the JWT secret.
3. Start the backend:
   ```bash
   npm run dev
   ```

## Environment variables

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — must be a Supabase service role key, not the anon/public key
- `JWT_SECRET`
- `PORT`

## Endpoints

- `POST /auth/login` — authenticate a user and receive a JWT
- `GET /attendance` — list attendance for the authenticated user
- `POST /attendance` — create a new attendance record

## Notes

- The backend uses `supabaseClient.js` to connect to Supabase with the service role key.
- `auth/login` expects `email` and `password`.
- The attendance routes require a valid `Authorization: Bearer <token>` header.

## Debug notes

- A login failure was caused by using the anon/public Supabase key instead of the service role key.
- The current environment now uses a valid `SUPABASE_SERVICE_ROLE_KEY` and login/token access was verified.
- Temporary test scripts used during debugging have been removed.
