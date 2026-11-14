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
- AI assistant (Mistral + RAG) that explains and cites NASA/CSA sources, never diagnoses

## Stack
Frontend: React + Vite + TypeScript · Backend: Node.js + Express + TypeScript · Validation: zod · DB: Supabase (PostgreSQL + pgvector) · LLM: Mistral API

## Run locally
```bash
cp .env.example .env          # fill in your keys (never commit .env)
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

## Methodology
Spec-Driven Development: see [`docs/`](docs/) — `constitution.md` → `spec.md` → `plan.md` → `tasks.md` → `verification.md`, plus `docs/specs/` (API contract and traceability matrix).

## NASA / CSA resources used
Only resources demonstrable in the app are listed (see `docs/spec.md` §7).
<!-- TODO: add the official URLs from the challenge Resources tab (copy them, don't guess) -->
- NASA — 5 Hazards of Human Spaceflight — hazard categories
- NASA — Risks of Human Spaceflight — risk context, rule sources, RAG corpus
- NASA — Ongoing HRP Research in Space — *design reference* for the data model (Standard Measures, ARCHeR, CIPHER)
- CSA — Monitoring Radiation for Astronaut Health — *design reference* for the simulated radiation module (if built)
- CSA — Why Do We Conduct Science Experiments in Space? — justification and Earth benefits

> No NASA/CSA dataset or instrument is integrated. All data is synthetic; CANS, ARCHeR and Tempus Pro are not used, only studied as design references.

## Known limits
- Mistral is a hosted API, so the assistant is **not autonomous** on a real mission; the app falls back to local keyword search over the corpus when it is unreachable.- Thresholds and emergency steps are illustrative, not medical guidance.
- Access: users pick one of 4 fictional astronaut profiles and enter a 4-digit PIN (roles: crew, commander). The start screen shows only general crew status; details are private per profile. A 4-digit PIN is demo-level access control, **not real security**. Emergency mode deliberately works without a PIN. Demo PINs (fictional): see `backend/data/seed/`.
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
