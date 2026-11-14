# Traceability matrix

Requirement → tasks → manual check.

| Req | Feature | Tasks | Manual check (`verification.md`) |
|---|---|---|---|
| HM-01 | Logging | T11, T14 | Check-in < 30 s; out-of-range rejected |
| HM-02 | Body map | T13, T15 | Zones change color |
| HM-03 | Guides | T07, T16 | Every indicator has a guide |
| HM-04 | Alerts | T06, T12, T16 | Alert shows rule, version, value, source |
| HM-05 | Emergency | T08, T13b, T17 | Both flows, timestamps logged |
| HM-06 | Trends | T13, T20 | Chart with baseline + markers |
| HM-07 | Simulator | T10 | Story ends in emergency |
| HM-08 | Routine | T21 | Overdue highlighted |
| HM-09 | Assistant | T22, ~~T23~~ → T22b, T23b (MOD-01) | Verification "Assistant" list (incl. MOD-01 privacy checks) |
| HM-10 | Crew view (general level + commander alerts) | T04b, T04c, T24 | Sorted by attention; no private data leaks |
| HM-11 | Environment (station / transit) | T24 | Header and delay change |
| HM-13 | Radiation (stretch) | T41 | Dose ≠ risk; "simulated" |
| HM-14 | Profile picker + PIN | T04b, T04c | Switch profile; roles respected |

## Rules ↔ sources
| Rule | `source_id` | NASA/CSA page |
|---|---|---|
| S-01 | `nasa-risk-sleep` | Inadequate Sleep and Irregular Schedules |
| M-01 | `nasa-risk-behavioral` | Behavioral Conditions and Psychiatric Disorders |
| C-01, C-02 | `nasa-risk-cardio` | Cardiovascular Adaptations |
| G-01 | `nasa-risk-nutrition` | Inadequate Food and Nutrition (indicative) |
| T-01 | `nasa-risk-immune` | Altered Immune System Responses (indicative) |
| E-01 | `nasa-risk-fitness` | Reduced Cardiorespiratory and Musculoskeletal Fitness |
| X-01 | `nasa-hazards` | NASA Human Spaceflight Hazards |
