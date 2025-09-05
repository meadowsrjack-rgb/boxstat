
# UYP Family Accounts & Billing (Replit-ready)

Monorepo with:
- `apps/api` – Express + SQLite + magic link auth + family link/claim codes + Stripe webhooks
- `apps/web` – Vite + React onboarding screens & minimal UI to exercise the API

## Quick start (local)
1. `npm install`
2. Copy `.env.example` to `.env` and set secrets (or keep dev defaults).
3. `npm run dev` – runs API and Web together (API on :8787, Web on :5173).

## On Replit
1. Import this zip as a new Repl (Node.js).
2. Set env vars in Replit secrets (see `.env.example`).
3. `npm install && npm run dev`

Open the Web app at the URL Replit shows for the Vite server.
