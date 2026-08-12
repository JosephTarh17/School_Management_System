# SMS Frontend

Vue 3 + Vite + Tailwind CSS starter scaffold for the School Management System frontend.

## Running locally

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start dev server:
   ```bash
   npm run dev
   ```

## Environment

Create a `.env` file in `frontend` or copy `.env.example`:

```bash
cp .env.example .env
```

`VITE_API_BASE_URL` controls the backend API base URL used by the login and attendance requests.

## Build

```bash
npm run build
```

## Preview

```bash
npm run preview
```

## End-to-end test

The frontend includes a Playwright smoke test for the login and attendance flow.

```bash
npm run test:e2e
```

> The test assumes the frontend runs at `http://localhost:5173` and the backend API is available at the configured `VITE_API_BASE_URL`.
