# Implemented architecture

This document describes the code currently in the repository. The SDD requirements and endpoint contracts remain in [`spec.md`](spec.md) and [`specs/api-contract.md`](specs/api-contract.md); this page explains how the implementation is organized and where coverage is partial.

## Backend: MVC adapted to a REST API

The backend follows an MVC-inspired, layered REST architecture. It does not render HTML views: the React frontend is the client-facing view, and JSON is the backend's response format.

```text
HTTP request
  → Express app and middleware (src/index.ts)
  → route + authentication/authorization middleware (src/routes, src/middleware)
  → controller (src/controllers)
  → Prisma client (src/db/client.ts)
  → PostgreSQL schema/models (prisma/schema.prisma)
  → JSON response
```

- **Routes / controller boundary:** `src/routes/` maps HTTP methods and paths to handlers in `src/controllers/`. Authentication and role checks are applied at the route boundary.
- **Controllers:** parse and validate request data, apply endpoint behavior, query or update data, and serialize responses. Zod schemas are defined alongside the relevant controllers; shared validation and rule helpers are in `controllers/common.ts`.
- **Models / persistence:** Prisma models and relations are defined in `prisma/schema.prisma`; generated Prisma Client is the persistence API. There is no separate hand-written `models/` directory.
- **Domain rules:** deterministic rule configuration is in `src/rules/rules.yaml`; rule evaluation and alert creation are shared backend logic. Assistant integration is isolated under `src/llm/` and uses read-only tools.
- **Application setup:** `src/index.ts` configures middleware, OpenAPI/Swagger, readiness behavior, route registration and error handling. `src/routes/index.ts` mounts health at `/health` and feature routers under `/api`.

This is MVC adapted to an API, rather than strict MVC: controllers currently contain some business and persistence logic and use Prisma directly. A service/repository layer could reduce that coupling as a later refactor; it is not required to describe the current implementation as MVC-inspired.

## Frontend: application shell and feature modules

`frontend/src/main.jsx` mounts the React app. `app/` owns application composition, global providers, navigation and cross-feature coordination. `features/` groups UI and logic by product area; `shared/` holds reusable infrastructure and components.

```text
src/
├── app/                  # App, navigation, providers, query client, app controller
├── features/
│   ├── alerts/           # alert presentation, acknowledgement and alert models
│   ├── assistant/        # assistant UI, hook and API adapter
│   ├── auth/             # session and access UI
│   ├── checkins/         # check-in flow, persistence and UI
│   ├── crew/             # crew bootstrap, health profiles and commander alerts
│   ├── emergency/        # emergency flow, context and API actions
│   ├── environment/      # radiation events and environment screen
│   ├── health/           # body systems, indicators and health presentation
│   ├── history/          # history view and charts
│   ├── reports/          # report composition and local report state
│   ├── routine/          # routine checklist and API integration
│   └── sources/          # source registry integration
└── shared/               # API client, shared components and utilities
```

Feature-to-feature and shared imports target module files directly; feature `index.js` barrel files are not used. This makes export ownership and dependency paths explicit. CSS is currently organized in `src/` stylesheets rather than colocated with each feature.

## API endpoint and frontend coverage

Backend routes are mounted in `src/routes/index.ts`. Except for `GET /health`, paths have the `/api` prefix. The frontend's API calls use these matching paths.

| Backend endpoint group | Frontend use | Coverage notes |
|---|---|---|
| Health, login, crew list/overview | Startup readiness, profile selection and crew overview | Used to bootstrap the app and establish a session. |
| Astronaut status, history, check-ins, measurements | Crew health views, history, check-in submission and session hydration | The history endpoint returns server baseline, alert markers and events; the current history screen primarily derives chart/alert data from mapped measurement records instead of using all those returned fields. |
| Routine and alert acknowledgement | Routine checklist and own-alert actions | Read/update flows are wired to the API. |
| Commander alerts | Commander view | Requested only for a commander session. |
| Emergency open/context/steps/summary/close | Emergency flow | The emergency workflow uses the public emergency endpoints. |
| Radiation events | Environment page | Persisted API events appear in an event list; some displayed environment charts remain locally generated/simulated. |
| Sources | Support/source registry | API registry is loaded; static reference content also appears in the UI. |
| Assistant chat | Global assistant | Sends optional session auth and displays backend responses. |

The backend also has `GET /crew/alerts`, used only by commander accounts. The radiation endpoint is read-only. There is no backend endpoint for flight-surgeon reports or ground-message delivery: those report/message interactions currently remain transient frontend state and simulated status. Therefore the frontend calls the implemented endpoint set, but it does not use every field returned by every endpoint and not every UI interaction is persisted by the backend.

## SDD feature implementation snapshot

This is a code-level inventory, not acceptance-test sign-off. The boxes in `tasks.md` and `verification.md` are still unchecked, so behavior and UX criteria have not been confirmed end to end.

| SDD feature | Code-level status | Evidence / remaining gap |
|---|---|---|
| F1 Logging and check-in | Implemented in part | Check-in and measurement APIs and UI exist; speed, all indicator paths and validation behavior still need manual verification. |
| F2 Body map | Present | Dashboard, body visualization and per-system views are in the crew/health features; acceptance criteria remain unverified. |
| F3 Measurement guides | Present in part | Indicator/risk explanations and support content exist; verify a guide is reachable for every indicator from all required entry points. |
| F4 Alerts | Present | YAML rules, backend evaluation, alert views and acknowledgement exist; verify rule version, source, actions and escalation are all shown. |
| F5 Emergency | Present | Public backend lifecycle endpoints, context and UI flow exist; manual scenario, timestamps and privacy checks remain. |
| F6 Trends | Present in part | History charts and backend history endpoint exist; current UI derives parts of baseline/alerts locally instead of consuming all backend fields. |
| F7 Mission simulator | Not implemented | The specified 4-person, 180-day dataset and scripted day-90 incident are not present; task T10 is open. |
| F8 Routine | Present | Private read/update endpoints and a checklist are wired; reminder timing/environment acceptance remains unverified. |
| F9 Assistant | Present | Optional-auth chat and frontend adapter exist; source quality, privacy boundaries and failure behavior need the manual checks in `verification.md`. |
| F10 Crew view | Present | Public overview and commander-only alerts are implemented and called by the UI; confirm privacy/ordering manually. |
| F11 Environment | Present in part | Station/transit selection and environment screen exist; parts of environmental/radiation visualization are synthetic frontend data. |
| F13 Radiation context (stretch) | Present in part | Backend lists radiation events and frontend displays them; the charts also use generated frontend data and values are not written through an API. |
| F15 Flight-surgeon report (stretch) | Frontend-only | Report composition exists, but report/message state is transient and no backend persistence endpoint exists. |
| F12, F14, F16 | Out of scope | Removed from the current specification. |

“Present” means there is corresponding code, not that every acceptance condition has passed. Use `verification.md` to record manual results before declaring compliance.

## Contract consistency

`docs/specs/api-contract.md` is the human-readable request/response contract, and `src/openapi.ts` publishes it through Swagger. The OpenAPI paths must remain siblings at the `paths` level, and response property names must match the JSON sent by controllers (including snake_case radiation fields). The frontend API client is in `frontend/src/shared/api/apiClient.js`.
