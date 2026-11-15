# End-to-end testing

The browser suite uses Cypress. It has two modes:

- `core-flows.cy.js` stubs the HTTP API and checks frontend interactions without writing to a database.
- `supabase.cy.js` talks to the running backend and its configured database. Run it only against a dedicated Supabase test project.

## View the browser tests

Terminal 1, from `frontend/`:

```bash
npm run dev:e2e
```

This reserves port `5173` so Cypress always opens the same app instance. Stop any other Vite server first if that port is occupied.

Terminal 2, also from `frontend/`:

```bash
npm run cypress:open
```

Choose **E2E Testing**, a browser, and a spec. The interactive runner shows Cypress commands and the page as they execute. Tests do not add artificial delays. For a headless run of the API-stubbed flows:

```bash
npm run cypress:run
```

## Connect to an isolated Supabase project

The integration spec writes health and emergency records. Do not point it at a production, shared, or personal working database. Create a separate Supabase project for tests and keep its credentials in an ignored local file.

1. Copy `backend/.env.e2e.example` to `backend/.env.e2e` and set `DATABASE_URL`, `DIRECT_URL` and a test-only `JWT_SECRET` using the dedicated test project's connection strings. Never commit `.env.e2e`.
2. In a terminal from `backend/`, deploy migrations and seed the fictional profiles:

   ```bash
   npm run prisma:deploy:e2e
   npm run prisma:seed:e2e
   npm run dev:e2e
   ```

3. In a second terminal from `frontend/`, start Vite with the E2E API URL:

   ```bash
   npm run dev:e2e
   ```

4. In another `frontend/` terminal, open Cypress directly on the Supabase integration spec:

   ```bash
   npm run cypress:open:supabase
   ```

   Or run that spec headlessly with `npm run cypress:run:supabase`.

The seed creates the fictional crew profiles, their local test PINs, and seven days of simulated check-ins and measurements for the history charts. Those credentials and records must only exist in the isolated test project; see `backend/prisma/seed.ts` for the seed data.

## Repeatability and idempotency

The integration suite intentionally replays requests with the same logical identity:

- Check-ins use the database unique key `(astronaut_id, day)`; a replay updates that day's check-in and synchronized measurements instead of adding another check-in.
- Emergency creation supplies a fixed UUID; the backend uses an upsert for that ID.
- An emergency step uses a fixed UUID; replaying it returns the existing step. The summary must contain that step once.
- Closing the same event twice with the same timestamp leaves the same final state.

The fixed check-in date is the current UTC date, and the emergency and step UUIDs are reserved for this suite. Keep this spec isolated from real crew data. The suite does not delete or reset project tables.

## GitHub Actions and frontend deployment

`.github/workflows/frontend-deploy.yml` runs frontend lint, formatting and build on pull requests to `main`. On a push to `main`, it deploys the frontend to Vercel after those checks pass. Cypress remains available for local runs described above; it is not currently run by this workflow.

Configure these GitHub Actions secrets:

| Secret | Purpose |
|---|---|
| `SUPABASE_E2E_DATABASE_URL` | Runtime connection string for a dedicated test project. |
| `SUPABASE_E2E_DIRECT_URL` | Session/direct connection string for Prisma migrations in that test project. |
| `SUPABASE_E2E_JWT_SECRET` | Test-only signing secret for the E2E backend. |
| `VERCEL_TOKEN` | Vercel CLI authentication. |
| `VERCEL_ORG_ID` | Vercel team/account ID, shared by its projects. |
| `VERCEL_FRONTEND_PROJECT_ID` | The separate Vercel project ID for the frontend. |

The backend workflow keeps its own `VERCEL_PROJECT_ID`; do not replace it with the frontend ID. Create a separate frontend Vercel project with root directory `frontend`, then save its ID as `VERCEL_FRONTEND_PROJECT_ID`. Each deployment workflow explicitly selects the `vercel.json` inside its own project directory so the root monorepo configuration does not turn a single-project deployment into a multi-service build. The frontend Vercel project's production environment must define `VITE_API_URL` as the public URL of the deployed backend API. This is a public API address, not a Supabase credential. The frontend must never receive Supabase database credentials or a Supabase service-role key.

The frontend workflow requires `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_FRONTEND_PROJECT_ID` on pushes to `main`. The backend workflow uses its separate Vercel project ID and database secrets for migrations and deployment.

## Coverage boundary

These tests verify the UI and API behavior against seeded test data; they do not test concurrent retries, real medical-device input, or the hosted LLM provider. The core browser suite uses intercepted API responses and does not require Supabase. Cypress run videos are written under `frontend/cypress/videos/` and are ignored by Git.
