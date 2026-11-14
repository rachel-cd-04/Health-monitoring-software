# Tasks

Roles: **I1** Frontend · **I2** Backend & data · **I3** Rules, content & AI · **D** Design (UX + presentation)
Status: `[ ]` todo · `[~]` in progress · `[x]` done
Working order per feature (SDD): contract in `docs/specs/api-contract.md` → implementation.

## Saturday morning — Define (10:00–14:00)
- [ ] T01 · All · Read statement + `features.md`, lock P0 scope (1 h max)
- [ ] T02 · D · Persona + flows: body map, logging, alert, **emergency** (paper/Figma)
- [x] T03 · I2 · Supabase project, configure `.env`, run Prisma migrations and seed `sources` (specific NASA/CSA pages, `accessed_on`)
- [ ] T04 · I1 · Scaffold React + Vite + TS, routing, layout with permanent Emergency button
- [ ] T04b · I1 · Start screen: general crew overview + environment + profile cards, PIN keypad, session context, header switch (HM-10, HM-14)
- [x] T04c · I2 · Auth: `pin_hash` seed with demo PINs, `POST /auth/login` (bcrypt, 3-strike 30 s lockout, JWT 12 h), `requireAuth` / `requireCommander`, `GET /crew/overview`, `GET /crew/alerts`, `GET /emergency/:id/context` (HM-10, HM-14)
- [ ] T05 · I2 · Scaffold Express + TS (helmet, cors, rate limit), Supabase client, `/astronauts`
- [ ] T05b · I2 · API validation for measurements, checkins, alerts and emergency; keep `docs/specs/api-contract.md` as the source of truth and I1 builds against it
- [ ] T06 · I3 · Finish `rules.yaml` (all 8 rules already drafted — review thresholds and sources) + loader that syncs it to `rules`
- [ ] T07 · I3 · Content: guide cards for the 8 indicators (how / why / range / if abnormal) → `frontend/src/content/guides.json`
- [ ] T08 · I3 · Content: emergency decision tree (chest pain, collapsed/unresponsive) → `frontend/src/content/emergency-tree.json` (bundled)

## Saturday afternoon/night — P0 core
- [ ] T10 · I2 · Simulator: 4 astronauts × 180 days + scripted chest-pain story (HM-07)
- [ ] T11 · I2 · `POST /measurements`, `POST /checkins` with zod validation (HM-01)
- [ ] T12 · I3 · `engine.ts`: load and evaluate the versioned rules from `rules.yaml` (HM-04)
- [ ] T13 · I2 · `GET /status` (per body system) and `GET /history` with baseline (HM-02, HM-06)
- [ ] T13b · I2 · `POST /emergency`, `POST /emergency/:id/steps` (idempotent), `GET /emergency/:id/summary` (HM-05)
- [ ] T14 · I1 · Logging + check-in pages (HM-01)
- [ ] T15 · I1 · Body map SVG with clickable zones + system detail (HM-02)
- [ ] T16 · I1 · Alert card + guide card components (HM-03, HM-04)
- [ ] T17 · I1 · Emergency flow driven by the bundled JSON tree + emergency log (HM-05)
- [ ] T18 · D · Final screens in Figma, style guide, body figure asset for I1
- [ ] 🎯 **Night milestone:** log → body map turns amber → alert with actions → emergency flow works end to end

## Sunday morning — P0 polish + P1
- [ ] T20 · I1 · Trend charts with baseline and markers (HM-06)
- [ ] T21 · I2 · Routine/reminders endpoint + I1 routine list (HM-08)
- [ ] T22 · I3 · ~~Mistral~~ LLM adapter (MOD-02: OpenAI SDK → NVIDIA NIM) with bounded agentic loop and read-only health/source tools (HM-09)
- [ ] ~~T23 · I1 · Chat panel with source chips and "AI unavailable" state~~ _(deprecated by MOD-01, replaced by T23b)_
- [ ] T22b · I2/I3 · (MOD-01) `optionalAuth` on `/assistant/chat`, session-scoped tools (`get_crew_active_alerts`, `get_my_health_summary`, `get_my_indicator_history`; no `astronaut_id` argument) (HM-09)
- [ ] T23b · I1 · (MOD-01) Global chat drawer in the layout (every screen, incl. profile picker) with source chips, "AI unavailable" state, scope chip and history cleared on profile switch (HM-09)
- [ ] T24 · I1 · Environment selector (station / transit only) + crew view (HM-10, HM-11)
- [ ] T25 · D · Video script (author's "halfway to Mars" story) and slides; include the CSA "Why science experiments" benefits-on-Earth closing

## Sunday — Wrap-up (code freeze ~15:00)
- [ ] T30 · All · Run through `verification.md` and update `docs/specs/traceability.md`
- [ ] T31 · I3 · Fill in "AI Usage" in README
- [ ] T32 · D + 1 · Record demo and edit video
- [ ] T33 · All · Submit on Space Apps (repo link, video, description)

## Stretch (F13 and F15 only, if time allows)
- [ ] T41 · Radiation context (HM-13)
- [ ] T43 · Ground report for flight surgeons (F15)

> Removed from scope: F12 gamification, F14 offline mode, F16 camera input (tasks T40, T42, T44, T45 and T26 deleted).
