# Astro Health Monitor

Health self-monitoring dashboard for astronauts on long-duration missions: track vital signs, sleep and mood, visualize trends and get explainable, rule-based alerts with an AI assistant that cites NASA/CSA sources.

**NASA Space Apps Challenge 2026** · Challenge: *Create Health Monitoring Software for Astronauts on Space Missions* · Team **Astro Coders** (Zaragoza)

> ⚠️ Prototype. All astronaut data is **synthetic**. This is a self-monitoring and decision-support tool, **not** a diagnostic system.

## Features
- Interactive body map: tap any body system to see its status and how spaceflight affects it
- Logging of key indicators (heart rate, blood pressure, blood sugar, temperature, sleep, mood, fatigue, exercise)
- Built-in guides: how to measure, why it matters, what to do if abnormal
- Deterministic, traceable alerts with actions and escalation (self / crew / ground)
- Emergency mode: step-by-step guidance (e.g. chest pain, collapse)
- Trend charts vs. each astronaut's personal baseline
- AI assistant (Mistral agentic loop) that explains and cites NASA/CSA sources, never diagnoses

## Stack
Frontend: React + Vite + TypeScript · Backend: Node.js + Express + TypeScript · ORM: Prisma 7 · DB: Supabase PostgreSQL · LLM: Mistral API

## Run locally
```bash
cd backend && cp .env.example .env  # fill in your keys (never commit .env)
cd backend && npm install && npm run prisma:generate && npm run prisma:migrate && npm run prisma:seed && npm run dev
cd frontend && npm install && npm run dev
```

Swagger UI is available at `http://localhost:3000/docs`.
The OpenAPI document is available at `http://localhost:3000/docs/openapi.json`.

The seed creates the four fictional frontend profiles:

| Profile | Role | Demo PIN |
|---|---|---|
| Ana Vega | Commander | `1111` |
| Leo Soler | Crew | `2222` |
| Inés Vidal | Crew | `3333` |
| Noa Ríos | Crew | `4444` |

These PINs are only for the synthetic demo and must not be used for real authentication.

## Methodology
Spec-Driven Development: see [`docs/`](docs/) — `constitution.md` → `spec.md` → `plan.md` → `tasks.md` → `verification.md`, plus `docs/specs/` (API contract and traceability matrix).

## NASA / CSA resources used
Only resources demonstrable in the app are listed (see `docs/spec.md` §7).
- [NASA — Human Spaceflight Hazards](https://www.nasa.gov/hrp/hazards/) — hazard context
- [NASA — Human Spaceflight Risks](https://www.nasa.gov/hrp/risks/) — risk context and rule sources
- [NASA — Ongoing HRP Research in Space](https://www.nasa.gov/hrp/ongoing-hrp-research/) — design reference
- CSA — Monitoring Radiation for Astronaut Health — *design reference* for the simulated radiation module (if built)
- CSA — Why Do We Conduct Science Experiments in Space? — justification and Earth benefits

> No NASA/CSA dataset or instrument is integrated. All data is synthetic; CANS, ARCHeR and Tempus Pro are not used, only studied as design references.

## Known limits
- Mistral is a hosted API, so the assistant is **not autonomous** on a real mission; if it is unreachable, the assistant reports that it is unavailable while the rest of the app continues working.
- Thresholds and emergency steps are illustrative, not medical guidance.
- Access: users pick one of 4 fictional astronaut profiles and enter a 4-digit PIN (roles: crew, commander). The start screen shows only general crew status; details are private per profile. A 4-digit PIN is demo-level access control, **not real security**. Emergency mode deliberately works without a PIN.
- Out of scope: gamification, offline mode and camera input. Stretch only: radiation context and flight-surgeon report. Environments: space station and spacecraft in transit only.

## AI Usage
<!-- Required by Space Apps. Keep updated during the hackathon. -->
| Tool | Used for |
|---|---|
| Mistral API | In-app assistant (explanations with sources) |
| _e.g. Copilot / Cursor / Claude_ | _code assistance in …_ |

AI-generated images/video are visibly marked. No NASA logos or mission insignia are used.

## Team
- … · … · … · …
