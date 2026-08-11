# School Management System

This repository contains the frontend and backend scaffold for the School Management System (SMS).

## Tech stack
- Frontend: Vue 3 + Vite + Tailwind CSS
- Backend: Node.js + Express
- Database: Supabase (PostgreSQL)
- Deployment: Railway

## Workspace structure
- `/frontend` — Vue application for portals and UI
- `/backend` — Express API server and Supabase integration
- `/infra` — deployment guidance for Railway
- `/docs` — design diagrams and requirements

## First steps
1. Install dependencies for frontend and backend.
2. Create `backend/.env` from `backend/.env.example` and configure Supabase credentials.
3. Start the backend and frontend locally.

## Protecting local secrets
- Never commit `.env` files to git.
- Use `backend/.env.example` as the committed template for required settings.
- `backend/.env` is already ignored by `.gitignore` and should stay local only.
- If you ever need to share configuration, send only the example file or copy values manually off-line.

## Useful commands
```bash
cd frontend && npm install
npm run dev
```

```bash
cd backend && npm install
npm run dev
```
