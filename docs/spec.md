# Specification — Astro Health Monitor (MVP)

## 1. Problem
Long-duration missions expose astronauts to space radiation, isolation and confinement, altered gravity and a hostile closed environment, which can cause immune changes, bone loss, cardiovascular events and behavioral health problems. Far from Earth, astronauts carry much of the responsibility for spotting these changes in themselves, and **they are not doctors**.

**Challenge goal (official):** build health monitoring software that gathers health indicators and enables astronauts to **evaluate and act** on the status of their health, explaining how to measure, why it matters and what to do when a value is not normal, including emergencies.

## 2. Users
| User | Need |
|---|---|
| **Astronaut** (primary) | Log quickly, understand values, know what to do |
| **Crewmate in an emergency** | Be guided step by step while helping someone else |
| **Commander** | See the whole crew's status at a glance |

### Access, privacy and roles (profile + PIN)
- **No usernames/passwords, no Supabase Auth.** The start screen is a **profile picker**: 4 fictional astronauts plus the environment selector. Entering a profile requires its **4-digit PIN**.
- **Two privacy levels:**
  | Level | Who | What is visible |
  |---|---|---|
  | **General** (no PIN) | Anyone on the start screen | Mission day, environment, comms delay; per astronaut: name, role, avatar, one overall status light and the **number** of active alerts. Never which system, never values, never mood/sleep |
  | **Private** (own PIN) | The astronaut inside their own profile | Values, trends, check-ins, body map, detailed alerts, assistant |
- **Two roles**, stored in `astronauts.role`:
  | Role | Can do |
  |---|---|
  | `crew` | Everything in own private profile; start an emergency for anyone |
  | `commander` | Same, plus the crew alerts view (F10): for each *other* astronaut the active alerts (level + title), never raw values or mental-health data |
- **Emergency bypasses the PIN.** The red button works from any screen without logging in. The person who is helping may see the patient's recent vitals and active alerts **through the emergency flow only** (safety over privacy). `reporter_id` is optional.
- **PIN mechanics:** hashed in the DB; `POST /auth/login` returns a JWT valid 12 h (one shift); 3 wrong attempts lock that profile for 30 s. Demo PINs are fictional and listed in the README.
- **No ground/flight-surgeon user:** ground only receives the generated emergency summary.
- **Declared limit (README):** a 4-digit PIN is not real security (brute-forceable beyond the lockout); it only makes the privacy levels meaningful for the demo. A real mission would need proper access control and medical privacy rules.

## 3. Scope
**In (MVP):** 8 indicators, interactive body map, measurement guides, rule-based alerts with actions, emergency mode, trends, simulated mission data, assistant with sources, profile picker with PIN and two privacy levels, environment selector (space station / spacecraft in transit), routine reminders, crew view.
**Stretch (only if time allows):** F13 radiation context, F15 flight-surgeon report.
**Out:** F12 gamification, F14 offline mode, F16 camera input, real medical devices, trained predictive models, real diagnosis, lunar/Mars base and rover environments, production-grade authentication (accounts, passwords, Supabase Auth).

### MVP indicators
A *hazard* is an environmental condition; a *risk* is the concrete health effect NASA documents. Each indicator links to both, so every value is traceable: data → risk → explanation → action.

| Body system | Indicator | Unit | NASA hazard | NASA risk (source id) |
|---|---|---|---|---|
| Cardiovascular | Heart rate | bpm | Gravity fields | Cardiovascular Adaptations (`nasa-risks-cardio`) |
| | Blood pressure | mmHg | Gravity fields | Cardiovascular Adaptations (`nasa-risks-cardio`) |
| Metabolism & infection | Blood sugar | mg/dL | Hostile closed environment | Inadequate Food and Nutrition (`nasa-risks-nutrition`) · *indicative link* |
| | Body temperature | °C | Hostile closed environment | Altered Immune System Responses (`nasa-risks-immune`) · *indicative link* |
| Sleep & mental health | Sleep duration | h | Isolation & confinement | Inadequate Sleep and Irregular Schedules (`nasa-risks-sleep`) |
| | Mood | 1–5 | Isolation & confinement | Behavioral Changes and Psychiatric Disorders (`nasa-risks-behavioral`) |
| | Fatigue | 1–5 | Isolation & confinement | Inadequate Sleep and Irregular Schedules (`nasa-risks-sleep`) |
| Muscles & bones | Exercise | min | Gravity fields | Reduced Cardiorespiratory and Musculoskeletal Fitness (`nasa-risks-fitness`); Bone Changes (`nasa-risks-bone`) as indirect context |

> Blood sugar and temperature come from the challenge statement; NASA has no dedicated page for them, so they are linked to the closest documented risk and labeled "indicative". Exercise relates to bone health only as indirect tracking — the app never claims to measure bone density.

## 4. Features
| ID | Feature | Priority |
|---|---|---|
| F1 | Log measurements & daily check-in | P0 |
| F2 | Interactive body map dashboard | P0 |
| F3 | Measurement guides & explanations | P0 |
| F4 | Alerts with guided actions and escalation | P0 |
| F5 | Emergency mode (step-by-step) | P0 |
| F6 | Dynamic trend charts vs. baseline | P0 |
| F7 | Mission simulator (scripted story) | P0 |
| F8 | Routine & measurement reminders | P1 |
| F9 | AI assistant (Mistral + RAG) | P1 |
| F10 | Crew view (commander) | P1 |
| F11 | Environment selector (space station, spacecraft in transit only) | P1 |
| F12 | Gamification | Removed |
| F13 | Radiation context (simulated, environmental monitoring) | Stretch |
| F14 | Offline mode | Removed |
| F15 | Report for flight surgeons | Stretch |
| F16 | Camera / image input | Removed |

Screen-level detail: see `features.md`.

## 5. User stories and acceptance criteria

**HM-01 · Logging (F1)**
- [ ] Daily check-in (sleep, mood, fatigue) in < 30 s.
- [ ] Each of the 8 indicators can be logged with value, unit, timestamp and `source`.
- [ ] Out-of-range values are rejected with a clear message.

**HM-02 · Body map (F2)**
- [ ] Human figure with 4 clickable zones colored by status (green/amber/red/grey).
- [ ] Tapping a zone shows system description, spaceflight effect with source, latest values and actions.

**HM-03 · Guides (F3)**
- [ ] Every indicator has a guide: how to measure, why it matters in space, typical range, what to do if abnormal.
- [ ] Guides reachable from logging, body map and alerts.

**HM-04 · Alerts (F4)**
- [ ] Each alert shows: level, explanation, action checklist, who should act (self / crew / ground + comms delay), rule ID + version and source link.
- [ ] Rules are deterministic, versioned and tested.

**HM-05 · Emergency (F5)**
- [ ] Emergency button reachable from every screen in one tap.
- [ ] Guided decision flow, one step per screen, for at least "chest pain" and "collapsed / unresponsive".
- [ ] Every step and vital taken is timestamped and stored in an emergency log.
- [ ] Generates a summary for crew/ground.
- [ ] Shows "Follow your mission medical procedures" and labels steps as illustrative.
- [ ] Works without a PIN or profile: first screen asks "Who needs help?"; `reporter_id` is optional.
- [ ] Shows the patient's last vitals and active alerts inside the flow (no PIN needed).
- [ ] A red-level alert only **offers** "Start emergency guide?"; it never starts the flow by itself.

**HM-06 · Trends (F6)**
- [ ] Chart per indicator, 7/30/180 days, with baseline band, alert markers and mission events.

**HM-07 · Simulator (F7)**
- [ ] 4 astronauts × 180 days with a scripted incident (rising HR/BP + poor sleep → chest-pain emergency around day 90).
- [ ] All records `source = simulated`.

**HM-08 · Routine (F8)** — Daily list of due measurements with overdue highlighting.
**HM-09 · Assistant (F9)**
- [ ] Answers only with backend tools + retrieved corpus chunks; every answer lists clickable sources.
- [ ] Never diagnoses; for symptoms it points to Emergency mode and mission procedure.
- [ ] Out-of-corpus question → "I don't have enough evidence".
- [ ] If Mistral is unreachable, falls back to keyword search over the corpus and shows the matching passages with sources; the rest of the app is unaffected.
- [ ] Limit stated in README: a hosted LLM is not autonomous on a real mission.

**HM-13 · Radiation context (F13, stretch)**
- [ ] Simulated dose / dose rate by time and location (cabin, EVA, shelter) with radiation type and instrument.
- [ ] Dose is never presented as biological risk or diagnosis; every record shows its data status (simulated).
- [ ] No claim of integration with CANS or any real instrument.
**HM-10 · Crew view (F10)**
- [ ] Start screen (general level) shows one card per astronaut sorted by attention needed: overall light + number of active alerts.
- [ ] Commander additionally sees the other astronauts' active alerts (level + title); crew do not.
- [ ] Neither view exposes values, body systems or mood/sleep of other astronauts.
**HM-11 · Environment (F11)** — Choosing *space station* (short comms delay) or *spacecraft in transit* (long delay) changes the header, "who should act" delay estimates and routine. No lunar/Mars base or rover.
**HM-14 · Profile picker and PIN**
- [ ] Start screen lists the 4 astronauts; choosing one asks for a 4-digit PIN on a large numeric keypad.
- [ ] Wrong PIN → clear message; 3 failures lock that profile for 30 s.
- [ ] Correct PIN → token (12 h); private endpoints reject requests without it (401) or for another astronaut (403).
- [ ] The header lets you switch profile (new PIN required); the Emergency button stays reachable on the keypad screen.

## 6. Alert rules (illustrative, to be validated against sources)
| ID | Condition | Level | Who acts | Source |
|---|---|---|---|---|
| S-01 | Sleep < 6 h for 3 consecutive nights | Amber | Self | `nasa-risks-sleep` |
| M-01 | Mood ≤ 2 for 3 days | Amber | Self + crew | `nasa-risks-behavioral` |
| C-01 | Resting HR > baseline + 15 bpm for 3 days | Amber | Self | `nasa-risks-cardio` |
| C-02 | Systolic BP ≥ 140 or ≤ 90 mmHg | Red | Crew + ground | `nasa-risks-cardio` |
| G-01 | Blood sugar < 70 or > 180 mg/dL | Red | Self + crew | `nasa-risks-nutrition` |
| T-01 | Body temperature ≥ 38.0 °C | Amber | Self + crew | `nasa-risks-immune` |
| E-01 | Exercise < 60 min/day for 5 days | Amber | Self | `nasa-risks-fitness` |
| X-01 | Emergency triggered | Red | Crew + ground | `mission-medical-procedure` |

> **Illustrative** thresholds for the demo, labeled as such in the UI.
> `backend/src/rules/rules.yaml` is the **source of truth**; this table is a human summary. Every rule has at least one test derived from the YAML.
> A single reading is not a diagnosis: point-in-time rules (C-02, G-01) tell the user to repeat the measurement before acting.

## 7. Constraints
See `constitution.md`. 100 % synthetic data. At least one NASA resource from the challenge Resources tab used and cited (Global Awards requirement). Optionally reference NASA Open Science Data Repository (OSDR) for realistic ranges.

**Resources actually used** (cite only what is demonstrable in the app):
| Resource | Where it shows up |
|---|---|
| NASA — 5 Hazards | Hazard column of the indicator table; body map explanations |
| NASA — Risks | Risk context in alerts and guides; rule sources; RAG corpus |
| NASA — Ongoing HRP Research | Data-model design (Standard Measures, ARCHeR, CIPHER, Tempus Pro as *design references only*) |
| CSA — Monitoring Radiation | Radiation context module (F13, stretch). If F13 is not built, cite it only in the pitch as future work, not as "used" |
| CSA — Why Science Experiments | Pitch and report: justification and benefits on Earth |

**Never claim** an integration with CANS, ARCHeR, Tempus Pro or any NASA/CSA dataset. Consulting a scientific page does not make synthetic data NASA data.

## 8. Platform constraints
- Backend is Node + Express; request/response contracts are described in `docs/specs/api-contract.md` and validated in the backend with zod schemas (`backend/src/schemas/`).
- Supabase is only accessed from the backend with the service key; RLS is on with no public policies.
- Emergency tree and guides are static JSON bundled with the frontend. There is no offline mode: the app needs its backend (except in the no-backend demo, which stores data in the browser).
- Auth: PIN → JWT (`Authorization: Bearer`), signed with `JWT_SECRET` (backend `.env` only). Libraries: `bcryptjs`, `jsonwebtoken`. See "Access, privacy and roles".
