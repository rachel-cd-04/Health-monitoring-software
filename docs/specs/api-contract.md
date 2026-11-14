# API contract

Source of truth for request/response shapes. The backend validates these shapes and persists data through Prisma ORM 7; the frontend API client follows this document.

**Conventions**
- JSON over HTTP, base path `/api`. Timestamps ISO 8601 UTC.
- `GET /health` is an operational endpoint outside the `/api` base path.
- Errors: `{ "error": { "code": string, "message": string, "details"?: object } }` with 400 (validation), 404, 500.
- `source` is always `manual | simulated | sensor`.
- Auth: `POST /auth/login` (PIN) returns a JWT sent as `Authorization: Bearer <token>`. Three access levels:
  - **public:** `/auth/login`, `/astronauts`, `/crew/overview`, `/sources`, all `/emergency*`.
  - **private:** everything else; the token's astronaut must match `astronaut_id` / `:id` → else 403 `FORBIDDEN`. No/invalid token → 401 `UNAUTHENTICATED`.
  - **commander:** `/crew/alerts` (role `commander`, else 403).
- Emergency endpoints are public on purpose and rate-limited. A 4-digit PIN is not real security (see spec "Access, privacy and roles").

## Indicators and valid ranges (HM-01)
| indicator | unit | min | max |
|---|---|---|---|
| `heart_rate` | bpm | 30 | 220 |
| `bp_systolic` | mmHg | 60 | 260 |
| `bp_diastolic` | mmHg | 30 | 160 |
| `blood_sugar` | mg/dL | 20 | 600 |
| `temperature` | °C | 30 | 43 |
| `exercise_min` | min | 0 | 600 |
| `sleep_hours` | h | 0 | 24 |
| `mood`, `fatigue` | 1–5 | 1 | 5 |

Out-of-range → 400 `VALUE_OUT_OF_RANGE`, nothing stored. (Validation ranges, not alert thresholds.)

## Endpoints

### `POST /auth/login` (public)
Body: `{ astronaut_id, pin }` (pin = 4 digits)
→ 200 `{ token, astronaut: { id, name, role, avatar }, expires_at }`
Errors: 401 `WRONG_PIN` (`details.attempts_left`), 429 `PIN_LOCKED` (`details.retry_after_s`; 3 failures → 30 s).

### `GET /health` (public, operational)
→ `{ status: "ok", database: "up", timestamp }`
Returns 503 with the same shape and `status: "degraded"` when the database is unavailable.

### `GET /astronauts` (public)
→ `[{ id, name, role, avatar, mission_day }]`

### `POST /measurements`
Body: `{ astronaut_id, indicator, value, unit, ts?, source, mission_phase? }`
→ 201 `{ measurement, alerts: Alert[] }` (new alerts raised by the rule engine)

### `POST /checkins`
Body: `{ astronaut_id, day, sleep_hours?, mood?, fatigue?, source }`
→ 201 `{ checkin, alerts: Alert[] }`. Upsert per astronaut + day.

### `GET /astronauts/:id/status`
→ `{ astronaut, mission_day, systems: [{ body_system, status: green|amber|red|grey, latest: [{indicator,value,unit,ts,source}], alerts: Alert[] }], active_alerts: Alert[] }`

### `GET /astronauts/:id/history?indicator=&days=`
`days` ∈ 7 | 30 | 180. → `{ indicator, unit, points: [{ts,value,source}], baseline: {mean, low, high}, alert_markers: [{ts, rule_id}], events: [{ts, label}] }`

### `GET /astronauts/:id/routine`
→ `[{ item, due_at, done, overdue }]`

### `PATCH /astronauts/:id/routine/:item_id`
Body: `{ done: boolean }`
→ 200 `{ item, due_at, done, overdue }`

### `GET /crew/overview` (public, general level)
→ `{ mission_day, environment, comms_delay_s, crew: [{ id, name, role, avatar, overall: green|amber|red|grey, active_alert_count }] }` sorted by attention needed. **Never** returns values, body systems or mood/sleep.

### `GET /crew/alerts` (commander)
→ `[{ astronaut_id, name, level, title, ts }]` for the *other* astronauts' active alerts. No values, no mental-health data.

### `PATCH /alerts/:id/acknowledge`
Acknowledges one of the authenticated astronaut's active alerts.
→ 200 `{ alert }`

### `POST /emergency` (public)
Body: `{ id?: uuid, patient_id?, reporter_id?, scenario, started_at? }` — `id` may be client-generated and `patient_id` may be omitted when the patient is not identified. `reporter_id` optional (no profile active). → 201 `{ event }`. Also raises rule X-01.

### `GET /emergency/:id/context` (public, emergency only)
→ `{ patient: { id, name }, mission_day, last_vitals: [{indicator,value,unit,ts,source}], active_alerts: [{level,title}] }` — shown inside the emergency flow so a helper can read it out to ground; safety over privacy.

### `POST /emergency/:id/steps`
Body: `{ id: uuid, step_id, answer?, ts, vital_indicator?, vital_value? }`. Idempotent on `id`. → 201 `{ step }`.

### `GET /emergency/:id/summary`
→ `{ event, timeline: [steps], vitals: [...], text }` — plain-text summary for crew/ground. Labeled illustrative.

### `PATCH /emergency/:id/close` (public)
Body: `{ ended_at?: timestamp }`
→ 200 `{ event }`

### `GET /radiation/events` (stretch, F13)
→ `[{ ts, dose_msv, dose_rate_usv_h, radiation_type, location, instrument, event_type, source }]`

### `GET /sources`
→ `[{ id, agency, title, url, doc_type, accessed_on }]`

### `POST /assistant/chat`
Body: `{ astronaut_id, message }`
→ `{ answer, sources: [{id,title,url}], data_used: string[], caution: string, mode: "agentic" | "unavailable" }`
The backend runs a bounded agentic loop with Mistral and read-only health/source tools. If Mistral is unreachable, return `503 AI_UNAVAILABLE`; logging, alerts, status and emergency endpoints continue to work.

## Alert shape
```
Alert { id, astronaut_id, rule_id, rule_version, indicator, value, level: amber|red,
        message, actions: string[], who_acts: ("self"|"crew"|"ground")[],
        source: { id, title, url }, ts, active, illustrative: true }
```
