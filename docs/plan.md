# Technical Plan

## Stack
| Layer | Technology | Why |
|---|---|---|
| Frontend | React + Vite + TypeScript, Recharts | Fast to scaffold, simple charts |
| Backend | Node.js + Express + TypeScript | Same JavaScript/TypeScript ecosystem as the frontend |
| Validation | zod (in `backend/src/schemas/`) | Input validation that implements the API contract (HM-01) |
| Database | Supabase (PostgreSQL + pgvector) | Relational for traceability, vectors for RAG |
| AI | Mistral API via `@mistralai/mistralai` (chat + embeddings + function calling) | Team choice |
| Rules | `rules.yaml` parsed with `yaml`, evaluated in TypeScript | Deterministic, versioned, testable |
| Tests | vitest | One test runner for rules and API |
| Identity | Profile picker + 4-digit PIN → JWT (`jsonwebtoken`, `bcryptjs`) | 4-person team; two privacy levels, see spec "Access, privacy and roles" |

## Architecture
```
Astronaut ─► Frontend (React) ─► Backend API (Express)
                │ bundled JSON         ├─► Supabase: history, alerts, rules (service key, backend only)
                │ (emergency, guides)  ├─► Rule engine (deterministic, TS)
                │                      ├─► RAG: NASA/CSA corpus in pgvector (+ keyword fallback)
                ▼                      └─► Mistral adapter (function calling)
            Dashboard
```
- The dashboard, alerts and emergency mode **do not depend** on Mistral.
- The frontend **never** talks to Supabase directly; only the backend holds the service key (constitution #6). RLS is enabled on all tables with no public policies.
- Emergency tree and measurement guides are static JSON bundled in the frontend. There is no offline mode (F14 is out of scope).

## Identity and roles
- No accounts. The start screen is a profile picker (4 astronauts + environment). Entering a profile calls `POST /auth/login { astronaut_id, pin }`; the backend compares with `pin_hash` (bcrypt), applies the lockout (3 failures → 30 s via `failed_pin_attempts` / `locked_until`) and returns a JWT (HS256, 12 h) holding `astronaut_id` and `role`.
- Three access levels on the API: **public** (`/astronauts`, `/crew/overview`, `/sources`, `/auth/login`, emergency endpoints), **private** (valid JWT; only the token's own astronaut), **commander** (JWT with role `commander`).
- Express middleware `requireAuth` verifies the Bearer token and exposes `req.astronaut` (`id`, `role`); routes taking `:id` reject a mismatch (403). `requireCommander` guards `/crew/alerts`.
- **Emergency endpoints are public on purpose** (an emergency must not depend on a PIN). They only expose the patient's recent vitals/alerts through `GET /emergency/:id/context`. Rate limiting protects them.
- A 4-digit PIN is not real security; it makes the privacy levels meaningful for the demo. Declared as a limit.
- Coarse crew status (`/crew/overview`) is computed server-side so no private value ever reaches an unauthenticated client.

## Honest limits (must appear in README and pitch)
- Access control is a 4-digit PIN + JWT: enough to separate privacy levels in a demo, not real security. Emergency mode deliberately bypasses it.
- Mistral is a hosted API: the assistant is **not autonomous** on a real mission. Fallback: local keyword search over the corpus returns the relevant chunks with sources when Mistral is unreachable. A real deployment would need an on-board model.
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
│       └── traceability.md ← HM-xx → tasks → tests
├── frontend/src/
│   ├── pages/              ← Dashboard, CheckIn, Trends, Commander, Assistant, Emergency
│   ├── components/         ← BodyMap, StatusChip, TrendChart, AlertCard, GuideCard, ChatPanel
│   ├── services/           ← API client (follows docs/specs/api-contract.md)
│   └── content/            ← bundled JSON: emergency-tree.json, guides.json
├── backend/
│   ├── src/
│   │   ├── index.ts        ← Express app bootstrap (helmet, cors, rate limit)
│   │   ├── routes/         ← REST endpoints
│   │   ├── schemas/        ← zod schemas (validation of the API contract)
│   │   ├── db/             ← Supabase client + queries
│   │   ├── rules/          ← rules.yaml + engine.ts
│   │   ├── rag/            ← chunking, ingestion, search (vector + keyword fallback)
│   │   └── llm/            ← Mistral adapter + tools
│   ├── tests/              ← vitest: one test per rule, API tests
│   ├── database/schema.sql
│   └── data/
│       ├── seed/           ← mission simulator (4 astronauts × 180 days) + demo PINs
│       └── corpus/         ← NASA/CSA chunks with metadata
```

## Data model
See `backend/database/schema.sql`. Entities: `astronauts`, `sources`, `measurements`, `checkins`, `rules`, `alerts`, `emergency_events`, `emergency_steps`, `doc_chunks`, and `radiation_events` (stretch, F13; table already in the schema).

Design principles taken from the NASA HRP studies (Standard Measures, CIPHER):
- Every record carries indicator, unit, timestamp, method/`source` and mission phase.
- Sensor readings, functional tests and lab results are kept apart (only `manual | simulated | sensor` in the MVP; lab data is out of scope).

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
| POST | `/auth/login` | PIN → JWT (public) |
| GET | `/crew/overview` | General level for the start screen (public) |
| GET | `/crew/alerts` | Other astronauts' active alerts (commander) |
| POST | `/emergency` | Open an emergency event (public) |
| GET | `/emergency/:id/context` | Patient's recent vitals + active alerts (public, emergency only) |
| POST | `/emergency/:id/steps` | Append a timestamped step/vital (idempotent) |
| GET | `/emergency/:id/summary` | Summary for crew/ground |
| GET | `/radiation/events` | Radiation timeline (simulated) — stretch (F13) |
| GET | `/sources` | Source registry |
| POST | `/assistant/chat` | Ask the assistant |

## Assistant tools (function calling)
Read-only, validated in the backend:
- `get_latest_health_summary(astronaut_id)`
- `get_indicator_history(astronaut_id, indicator, days)`
- `search_reference_docs(query)`

Structured response: `answer`, `sources[]`, `data_used`, `caution`.
The backend computes trends and alerts; Mistral only explains, summarizes and answers questions.

## RAG pipeline
1. **Collect** the main pages and the specific pages actually used (respect terms of use). Store title, agency, URL and access date.
2. **Chunk** per coherent section (e.g. cardiovascular risk, ARCHeR, Radi-N2); never mix topics in one chunk.
3. **Metadata** per chunk: agency, title, hazard/risk, doc type, published/updated date, URL.
4. **Embed** with `mistral-embed` (1024 dims) into `doc_chunks`; search via the `match_doc_chunks` RPC.
5. **Answer** with source chips linking to the original page.
6. **Fallback:** Postgres full-text search when embeddings/Mistral are unavailable. If no chunk is relevant: "I don't have enough evidence".

## Rule engine
Rules live in `backend/src/rules/rules.yaml` (id, version, indicator, body_system, condition, level, who_acts, message, actions, `source_id`). `engine.ts` evaluates them over the history, writes to `alerts` (storing the triggering value and measurement) and de-duplicates active alerts per rule + astronaut. At least one test per rule, derived from the YAML. The `rules` table is synced from the YAML at startup (YAML is the source of truth).

Point-in-time rules (C-02, G-01) ask for a repeat measurement in their actions before escalating: a single reading is not a diagnosis.

## Conventions
- Everything in English: code, comments, docs, commits, UI copy.
- Branches: `feat/<area>-<short-name>`; merge to `main` often.
- Commits: `feat: …`, `fix: …`, `docs: …` (Conventional Commits).
- Reference requirement IDs (HM-xx) and task IDs (Txx) in PRs.
- Order of work per feature: contract in `docs/specs/api-contract.md` → rule/API tests → implementation.
