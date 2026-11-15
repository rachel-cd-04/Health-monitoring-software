# SOMA · Astronaut Health Monitor

Health monitoring and decision-support prototype for long-duration space missions. Built for the NASA Space Apps Challenge 2026 challenge **Create Health Monitoring Software for Astronauts on Space Missions**.

<p align="center">
  <img src="https://img.shields.io/badge/React-19.3.1-61DAFB?logo=react&logoColor=white" alt="React 19.3.1" />
  <img src="https://img.shields.io/badge/Vite-6.4.6-646CFF?logo=vite&logoColor=white" alt="Vite 6.4.6" />
  <img src="https://img.shields.io/badge/Node.js-22.x-339933?logo=nodedotjs&logoColor=white" alt="Node.js 22" />
  <img src="https://img.shields.io/badge/Express-5.3.0-000000?logo=express&logoColor=white" alt="Express 5.3.0" />
  <img src="https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5.9.3" />
  <img src="https://img.shields.io/badge/Prisma-7.10.1-2D3748?logo=prisma&logoColor=white" alt="Prisma 7.10.1" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white" alt="Supabase PostgreSQL" />
</p>

| Live application | Backend API and OpenAPI docs |
|---|---|
| [soma-crew.vercel.app](https://soma-crew.vercel.app/) | [API docs](https://backend-sandy-pi-25.vercel.app/docs/) · [Health](https://backend-sandy-pi-25.vercel.app/health) |

## Features

Every feature below has a reserved screenshot location. Add the image at the listed path when ready.

### Crew dashboard and body map
View crew status, open an astronaut profile and navigate health systems through an interactive body map.

**Screenshot:** `docs/screenshots/crew-dashboard.png`

### Measurements and daily check-in
Record heart rate, blood pressure, blood sugar, temperature, sleep, mood, fatigue and exercise individually or as a daily check-in.

**Screenshot:** `docs/screenshots/measurements-checkin.png`

### Measurement guides
Read practical measurement instructions, context, illustrative ranges and suggested next steps for each indicator.

**Screenshot:** `docs/screenshots/measurement-guides.png`

### Health alerts
See rule-based alerts with the reason, who should act, source references and suggested actions. Alerts are acknowledged in the app and are not diagnoses.

**Screenshot:** `docs/screenshots/health-alerts.png`

### Health history and trends
Review saved measurements over time and compare readings with a personal baseline.

**Screenshot:** `docs/screenshots/health-history.png`

### Mission routine and reminders
See daily check-in, exercise and sleep/recovery tasks. Their due times adapt to station or transit environment, and completing a related measurement updates the routine.

**Screenshot:** `docs/screenshots/routine-reminders.png`

### Notifications
Review due check-ins, routine tasks and recent resolved alerts from the notification center.

**Screenshot:** `docs/screenshots/notifications.png`

### Emergency mode
Follow a step-by-step guide for emergency scenarios and record a simulated onboard report. SOMA does not contact a real medical team.

**Screenshot:** `docs/screenshots/emergency-mode.png`

### Mission environment and radiation context
Switch between station and transit context, and inspect cabin-environment and radiation views. Radiation readings are simulated; no dosimeter is connected.

**Screenshot:** `docs/screenshots/environment-radiation.png`

### Crew and commander view
Review crew-wide status. Commander access can open additional crew health and alert information.

**Screenshot:** `docs/screenshots/crew-commander.png`

### Assistant and reference library
Ask questions about saved records and health topics; review the NASA/CSA references used by the prototype. The hosted AI provider is optional and the assistant does not diagnose.

**Screenshot:** `docs/screenshots/assistant-sources.png`

### Settings and accessibility
Adjust the app's appearance and supported accessibility preferences.

**Screenshot:** `docs/screenshots/settings.png`

## Data and limitations

- Crew profiles and seed measurements are fictional. Seeded readings are labeled `simulated`.
- Radiation and cabin-environment values are synthetic. SOMA does not integrate a NASA/CSA dataset or instrument, including CANS.
- Alert thresholds and suggested emergency actions are illustrative prototype rules, not clinically validated flight-medicine limits.
- The profile PIN is demo-level access control, not production authentication. Do not use real personal health data.
- Ground-support/report delivery is simulated; no real flight surgeon or medical service is contacted.

## Sources

- [NASA Human Spaceflight Hazards](https://www.nasa.gov/hrp/hazards/) — spaceflight hazard context.
- [NASA Human Spaceflight Risks](https://www.nasa.gov/hrp/risks/) — health-risk context for alerts and guides.
- [NASA Ongoing HRP Research in Space](https://www.nasa.gov/hrp/ongoing-hrp-research/) — research and measurement-design context.
- [CSA: Monitoring radiation for astronaut health](https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp) — neutron-radiation and instrument context for the simulated radiation view.
- [CSA: Why conduct science experiments in space?](https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp) — context for the value of space research.

The application presents these as references. No NASA/CSA dataset or instrument is integrated.

## Run locally

### Requirements

- Node.js 22.x and npm.
- A Supabase PostgreSQL project, or another PostgreSQL database compatible with Prisma.
- Git.

### 1. Configure and start the backend

From the repository root:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with the database connection strings and a unique `JWT_SECRET`. Get the Supabase connection strings from the project's **Connect** panel; use the session/direct connection for `DIRECT_URL` (migrations) and a runtime-compatible connection for `DATABASE_URL`. Percent-encode reserved characters in the database password.

Then run:

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

The API listens on `http://localhost:3000`. Swagger UI is at [`http://localhost:3000/docs/`](http://localhost:3000/docs/) and the OpenAPI document at [`http://localhost:3000/docs/openapi.json`](http://localhost:3000/docs/openapi.json).

The normal seed is additive and creates fictional crew, check-ins, measurements, sources and routines when missing. `npm run prisma:seed:reset` overwrites seeded demo data; do not use it against a database containing data you want to keep.

### 2. Configure and start the frontend

In a second terminal, from the repository root:

```bash
cp frontend/.env.example frontend/.env.local
cd frontend
npm install
npm run dev
```

Open [`http://localhost:5173`](http://localhost:5173). `VITE_API_URL` must point to the backend. Vite exposes `VITE_*` values in the browser bundle, so never put database passwords, JWT secrets or AI-provider keys there.

### Demo profiles

| Profile | Role | Demo PIN |
|---|---|---|
| Ana Vega | Commander | `1111` |
| Leo Soler | Crew | `2222` |
| Inés Vidal | Crew | `3333` |
| Noa Ríos | Crew | `4444` |

These fictional profiles and PINs are for local demonstration only.

## Environment variables

Use separate files for frontend and backend. The repository provides [`frontend/.env.example`](frontend/.env.example) and [`backend/.env.example`](backend/.env.example). Keep `.env` and `.env.local` files out of Git.

### Backend (`backend/.env`)

| Variable | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | Yes | PostgreSQL connection used by the API at runtime. |
| `DIRECT_URL` | Yes for Prisma CLI | Direct or session-pooler connection used for migrations. |
| `JWT_SECRET` | Yes | Signs backend session tokens; set a long random value. |
| `PORT` | No | Local API port; defaults to `3000`. |
| `LLM_API_KEY` | No | Enables the optional hosted assistant. Keep it backend-only. |
| `LLM_BASE_URL` | No | OpenAI-compatible provider URL; defaults to NVIDIA NIM. |
| `LLM_MODEL` | No | Provider model name. |
| `LLM_TIMEOUT_MS` | No | Optional assistant request timeout. |
| `LLM_COOLDOWN_MS` | No | Optional minimum pause between assistant requests. |

### Frontend (`frontend/.env.local`)

| Variable | Required | Purpose |
|---|---:|---|
| `VITE_API_URL` | Yes | Public base URL of the backend API, without a trailing slash. |

## Deployments

The production deployments are hosted on Vercel:

- Frontend: [https://soma-crew.vercel.app/](https://soma-crew.vercel.app/)
- Backend: [https://backend-sandy-pi-25.vercel.app/](https://backend-sandy-pi-25.vercel.app/)

Frontend and backend are deployed as separate Vercel projects. GitHub Actions builds and deploys the relevant app when changes are pushed to `main`. Configure the Vercel and application environment variables in GitHub Actions and in the matching Vercel project. `npm install` followed by `npm run dev` runs the app locally; it does not deploy to production.

## Tests

### REST Client

1. Start the backend locally and make sure the database is migrated and seeded:

   ```bash
   cd backend
   npm run dev
   ```

2. Open [`backend/rest-client/api.http`](backend/rest-client/api.http) in VS Code with the **REST Client** extension installed.
3. Send the requests in order, starting with the health check and commander login. Keep the requests pointed at a local or dedicated test database, not production.

### Frontend Cypress E2E

1. Start the frontend in a terminal:

   ```bash
   cd frontend
   npm run dev:e2e
   ```

2. From another terminal in `frontend/`, open Cypress:

   ```bash
   npm run cypress:open
   ```

   Or run the browser flow headlessly:

   ```bash
   npm run cypress:run
   ```

The current frontend GitHub Actions workflow does not run Cypress.
