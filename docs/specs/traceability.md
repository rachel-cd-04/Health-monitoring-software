# Traceability matrix

Requirement → tasks → automated test → manual check. Keep updated (T30).

| Req | Feature | Tasks | Automated test | Manual check (`verification.md`) |
|---|---|---|---|---|
| HM-01 | Logging | T11, T14 | `tests/measurements.test.ts` (range validation) | Check-in < 30 s; out-of-range rejected |
| HM-02 | Body map | T13, T15 | `tests/status.test.ts` | Zones change color |
| HM-03 | Guides | T07, T16 | — (content check: 8 guides present) | Every indicator has a guide |
| HM-04 | Alerts | T06, T12, T16 | `tests/rules/*.test.ts` (one per rule in `rules.yaml`) | Alert shows rule, version, value, source |
| HM-05 | Emergency | T08, T13b, T17 | `tests/emergency.test.ts` (idempotent steps) | Both flows, timestamps logged |
| HM-06 | Trends | T13, T20 | `tests/history.test.ts` (baseline) | Chart with baseline + markers |
| HM-07 | Simulator | T10 | `tests/seed.test.ts` (day-90 story triggers S-01, C-01, C-02) | Story ends in emergency |
| HM-08 | Routine | T21 | — | Overdue highlighted |
| HM-09 | Assistant | T22, T23 | `tests/assistant.test.ts` (no-evidence + fallback paths) | Verification "Assistant" list |
| HM-10 | Crew view (general level + commander alerts) | T04b, T04c, T24 | `tests/crew.test.ts` (overview exposes no values; commander-only alerts) | Sorted by attention; no private data leaks |
| HM-11 | Environment (station / transit) | T24 | — | Header and delay change |
| HM-13 | Radiation (stretch) | T41 | — | Dose ≠ risk; "simulated" |
| HM-14 | Profile picker + PIN | T04b, T04c | `tests/auth.test.ts` (wrong PIN, lockout, 401/403, token expiry) | Switch profile; roles respected |

## Rules ↔ sources
| Rule | `source_id` | NASA/CSA page |
|---|---|---|
| S-01 | `nasa-risks-sleep` | Inadequate Sleep and Irregular Schedules |
| M-01 | `nasa-risks-behavioral` | Behavioral Changes and Psychiatric Disorders |
| C-01, C-02 | `nasa-risks-cardio` | Cardiovascular Adaptations |
| G-01 | `nasa-risks-nutrition` | Inadequate Food and Nutrition (indicative) |
| T-01 | `nasa-risks-immune` | Altered Immune System Responses (indicative) |
| E-01 | `nasa-risks-fitness` | Reduced Cardiorespiratory and Musculoskeletal Fitness |
| X-01 | `mission-medical-procedure` | Generic; illustrative |
