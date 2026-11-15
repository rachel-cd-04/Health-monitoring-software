# Technical Plan

## Stack
| Layer | Technology | Why |
|---|---|---|
| Frontend | React + Vite + JavaScript (JSX), Recharts | Fast to scaffold, simple charts |
| Backend | Node.js + Express + TypeScript | Same JavaScript/TypeScript ecosystem as the frontend |
| API documentation | Swagger UI + OpenAPI 3 | Interactive endpoint documentation at `/docs` |
| Validation | zod at the API boundary | Input validation that implements the API contract (HM-01) |
| Database | Supabase PostgreSQL via Prisma ORM 7 | Typed relational access and migrations |
| ~~AI~~ | ~~Mistral API via `@mistralai/mistralai`~~ | ~~Bounded agentic loop with read-only backend tools~~ _(deprecated by MOD-02)_ |
| ~~AI (MOD-02)~~ | ~~OpenAI SDK (`openai`) → NVIDIA NIM, model `deepseek-ai/deepseek-v4.1-flash` (env-configurable)~~ | ~~Free hosted inference for evaluation; the model is built for tool-using agents and is fast (8–16B active params), which suits several tool rounds per question. OpenAI-compatible, so the provider can change via `.env`~~ _(deprecated by MOD-03)_ |
| AI (MOD-03) | OpenAI SDK (`openai`) → NVIDIA NIM, model `nvidia/nemotron-3.5-super-vl-120b-a12b` (env-configurable) | Free hosted inference for evaluation; the model gave the best tool-calling results in the team's tests. OpenAI-compatible, so the provider can change via `.env` |
| Rules | `rules.yaml` parsed with `yaml`, evaluated in TypeScript | Deterministic and versioned |
| Identity | Profile picker + 4-digit PIN → JWT (`jsonwebtoken`, `bcryptjs`) | 4-person team; two privacy levels, see spec "Access, privacy and roles" |

## Architecture
```
Astronaut ─► Frontend (React) ─► Backend API (Express)
                │ bundled JSON         ├─► Supabase PostgreSQL via Prisma (backend only)
                │ (emergency, guides)  ├─► Rule engine (deterministic, TS)
                │                      └─► LLM agentic loop (OpenAI SDK → NVIDIA NIM, MOD-02; read-only backend tools)
                ▼
            Dashboard
```
- The dashboard, alerts and emergency mode **do not depend** on ~~Mistral~~ the LLM provider (MOD-02).
- The frontend **never** talks to Supabase directly; only the backend holds the database connection string (constitution #6). RLS is enabled on all tables with no public policies.
- Runtime queries use the IPv4 transaction pooler through `DATABASE_URL`; Prisma migrations use the session pooler through `DIRECT_URL`.
- Emergency tree and measurement guides are static JSON bundled in the frontend. There is no offline mode (F14 is out of scope).

The implemented MVC-adapted backend and current frontend feature structure are documented in [`architecture.md`](architecture.md). That document describes the code as it exists today; this plan remains the target/design reference where the two differ.

## Identity and roles
- No accounts. The start screen is a profile picker (4 astronauts + environment). Entering a profile calls `POST /auth/login { astronaut_id, pin }`; the backend compares with `pin_hash` (bcrypt), applies the lockout (3 failures → 30 s via `failed_pin_attempts` / `locked_until`) and returns a JWT (HS256, 12 h) holding `astronaut_id` and `role`.
- Three access levels on the API: **public** (`/astronauts`, `/crew/overview`, `/sources`, `/auth/login`, emergency endpoints, and `/assistant/chat` with optional auth — MOD-01), **private** (valid JWT; only the token's own astronaut), **commander** (JWT with role `commander`).
- Express middleware `requireAuth` verifies the Bearer token and exposes `req.astronaut` (`id`, `role`); routes taking `:id` reject a mismatch (403). `requireCommander` guards `/crew/alerts`.
- **(MOD-01)** `POST /assistant/chat` uses `optionalAuth`: with a valid token it sets `req.astronaut`; with no token it continues anonymously; an invalid or expired token → 401, so a stale session is never silently downgraded. Assistant tools receive the session's `astronaut_id` from the server, never from the request body or the model's arguments.
- **Emergency endpoints are public on purpose** (an emergency must not depend on a PIN). They only expose the patient's recent vitals/alerts through `GET /emergency/:id/context`. Rate limiting protects them.
- A 4-digit PIN is not real security; it makes the privacy levels meaningful for the demo. Declared as a limit.
- Coarse crew status (`/crew/overview`) is computed server-side so no private value ever reaches an unauthenticated client.

## Honest limits (must appear in README and pitch)
- Access control is a 4-digit PIN + JWT: enough to separate privacy levels in a demo, not real security. Emergency mode deliberately bypasses it.
- ~~Mistral is a hosted API: the assistant is **not autonomous** on a real mission. The agentic loop is bounded and only has read-only backend tools. A real deployment would need an on-board model.~~ _(deprecated by MOD-02)_
- **(MOD-02)** NVIDIA NIM is a hosted API: the assistant is **not autonomous** on a real mission. The agentic loop is bounded and only has read-only backend tools. A real deployment would need an on-board model (any OpenAI-compatible server works via `LLM_BASE_URL`). The NIM free tier is for **evaluation only**, has shared, unguaranteed rate limits (~40 requests/min) and its data-retention terms are unclear, so it only ever receives synthetic data.
- Radiation values are **simulated**. CANS, ARCHeR, Tempus Pro, etc. are used as **design references only**; we do not claim any integration.
- Thresholds and emergency steps are **illustrative**.

## Repository layout
```
astro-health-monitor/
├── README.md               ← includes "AI Usage"
├── .env.example
├── docs/                   ← SDD
│   ├── constitution.md
│   ├── spec.md
│   ├── features.md         ← screen-level detail for design
│   ├── plan.md
│   ├── tasks.md
│   ├── verification.md
│   └── specs/
│       ├── api-contract.md ← endpoints, request/response, errors
│       └── traceability.md ← HM-xx → tasks → manual checks
├── frontend/src/
│   ├── app/                ← application shell, navigation, providers and app controller
│   ├── features/           ← feature-owned components, hooks, models, pages and services
│   └── shared/             ← cross-feature API client, shared components and utilities
├── backend/
│   ├── src/
│   │   ├── index.ts        ← Express app bootstrap (helmet, cors, rate limit)
│   │   ├── routes/         ← REST endpoints
│   │   ├── rules/          ← rules.yaml + engine.ts
│   │   └── llm/            ← LLM adapter (OpenAI SDK → NVIDIA NIM, MOD-02) + tools + agentic loop
│   ├── prisma/schema.prisma ← Prisma ORM 7 data model and migrations
│   └── rules/              ← rules.yaml + deterministic engine
```

## Data model
See `backend/prisma/schema.prisma`. Entities: `astronauts`, `sources`, `measurements`, `checkins`, `rules`, `alerts`, `routine_items`, `emergency_events`, `emergency_steps`, and `radiation_events` (stretch, F13).

Design principles taken from the NASA HRP studies (Standard Measures, CIPHER):
- Every record carries indicator, unit, timestamp, method/`source` and mission phase.
- Sensor readings, measurements and lab results are kept apart (only `manual | simulated | sensor` in the MVP; lab data is out of scope).

## API
Full contract in `docs/specs/api-contract.md`. Summary:

| Method | Path | Description |
|---|---|---|
| GET | `/astronauts` | List crew |
| POST | `/checkins` | Log check-in (triggers rule evaluation) |
| POST | `/measurements` | Log a vital sign (triggers rule evaluation) |
| GET | `/astronauts/:id/status` | Traffic light per body system + active alerts |
| GET | `/astronauts/:id/history?indicator=&days=` | Time series + baseline |
| GET | `/astronauts/:id/routine` | Due/overdue measurements |
| PATCH | `/astronauts/:id/routine/:item_id` | Mark routine item done/undone |
| POST | `/auth/login` | PIN → JWT (public) |
| GET | `/crew/overview` | General level for the start screen (public) |
| GET | `/crew/alerts` | Other astronauts' active alerts (commander) |
| PATCH | `/alerts/:id/acknowledge` | Acknowledge own active alert |
| POST | `/emergency` | Open an emergency event (public) |
| GET | `/emergency/:id/context` | Patient's recent vitals + active alerts (public, emergency only) |
| POST | `/emergency/:id/steps` | Append a timestamped step/vital (idempotent) |
| GET | `/emergency/:id/summary` | Summary for crew/ground |
| PATCH | `/emergency/:id/close` | Close an emergency event |
| GET | `/radiation/events` | Radiation timeline (simulated) — stretch (F13) |
| GET | `/sources` | Source registry |
| POST | `/assistant/chat` | Ask the assistant — ~~private~~ _(deprecated by MOD-01)_ → public with optional auth (MOD-01) |

## Assistant agentic loop
Read-only, validated in the backend:
- ~~`get_latest_health_summary(astronaut_id)`~~ _(deprecated by MOD-01)_
- ~~`get_indicator_history(astronaut_id, indicator, days)`~~ _(deprecated by MOD-01)_
- `get_reference_sources(source_ids)`

**MOD-01: tools and privacy.** The assistant is global. Which tools the model is offered depends on the session:
| Tool | Anonymous | Logged in |
|---|---|---|
| `get_reference_sources(source_ids?)`: source registry (all sources if no IDs) | ✓ | ✓ |
| `get_crew_active_alerts()` → each astronaut's active alerts (level + title), the only public data | ✓ | ✓ |
| `get_my_health_summary()` → latest values, recent check-ins and detailed alerts of the **logged-in** astronaut | — | ✓ |
| `get_my_indicator_history(indicator, days)` → history + backend-computed stats of the **logged-in** astronaut | — | ✓ |

- No private tool takes an `astronaut_id` argument: the backend injects the JWT's astronaut. A prompt like "show me Leo's blood pressure" cannot reach Leo's data.
- Private tools are not offered to the model in an anonymous session; if called anyway, the backend refuses them. Arguments are validated strictly, so an injected `astronaut_id` is rejected, not ignored.
- The system prompt states who is logged in (or that nobody is) and that everything except active alerts is private for other astronauts.

The loop has a fixed maximum number of tool calls, waits at least 1 s between consecutive LLM requests (MOD-03, `LLM_COOLDOWN_MS`), cannot write health data, and returns `answer`, `sources[]`, `data_used`, `caution` and `mode`. The backend computes trends and alerts; ~~Mistral~~ the LLM (MOD-02) only explains and summarizes.

## Rule engine
Rules live in `backend/src/rules/rules.yaml` (id, version, indicator, body_system, condition, level, who_acts, message, actions, `source_id`). `engine.ts` evaluates them over the history, writes to `alerts` (storing the triggering value and measurement) and de-duplicates active alerts per rule + astronaut. The `rules` table is synced from the YAML at startup (YAML is the source of truth).

Point-in-time rules (C-02, G-01) ask for a repeat measurement in their actions before escalating: a single reading is not a diagnosis.

## Conventions
- Everything in English: code, comments, docs, commits, UI copy.
- Branches: `feat/<area>-<short-name>`; merge to `main` often.
- Commits: `feat: …`, `fix: …`, `docs: …` (Conventional Commits).
- Reference requirement IDs (HM-xx) and task IDs (Txx) in PRs.
- Order of work per feature: contract in `docs/specs/api-contract.md` → implementation.
