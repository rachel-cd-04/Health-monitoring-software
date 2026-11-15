# API contract

Source of truth for request/response shapes. The backend validates these shapes and persists data through Prisma ORM 7; the frontend API client follows this document.

**Conventions**
- JSON over HTTP, base path `/api`. Timestamps ISO 8601 UTC.
- `GET /health` is an operational endpoint outside the `/api` base path.
- Errors: `{ "error": { "code": string, "message": string, "details"?: object } }` with 400 (validation), 404, 500.
- `source` is always `manual | simulated | sensor`.
- Auth: `POST /auth/login` (PIN) returns a JWT sent as `Authorization: Bearer <token>`. Three access levels:
  - **public:** `/auth/login`, `/astronauts`, `/crew/overview`, `/sources`, all `/emergency*`.
  - **public with optional auth (MOD-01):** `/assistant/chat`. The token is optional; if present it must be valid (else 401 `UNAUTHENTICATED`) and it unlocks that astronaut's own private data.
  - **private:** everything else; the token's astronaut must match `astronaut_id` / `:id` → else 403 `FORBIDDEN`. No/invalid token → 401 `UNAUTHENTICATED`.
  - **commander:** `/crew/alerts` (role `commander`, else 403).
  - **(MOD-05) commander reads any astronaut:** `GET /astronauts/:id/status|history|checkins|routine` also accept a commander token for any `:id`. Writes (`POST /measurements`, `POST /checkins`, `PATCH .../routine/...`) stay self-only. In `/assistant/chat`, a commander session (role read from the database) is also offered `get_crew_member_health_summary` and `get_crew_member_indicator_history` (`astronaut_id` argument) and may be told any crew member's private data.
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
Body: `{ astronaut_id, day, heart_rate?, bp_systolic?, bp_diastolic?, blood_sugar?, temperature?, sleep_hours?, mood?, fatigue?, exercise_min?, source }`
→ 201 `{ checkin, alerts: Alert[] }`. Upsert per astronaut + day.
Provided check-in indicators are also synchronized to the measurements history for that UTC day. Repeating the same check-in updates that day's measurements instead of adding duplicate readings.

### `GET /astronauts/:id/checkins?days=30`
Authenticated self-only endpoint. `days` ∈ 1..180. Returns the persisted check-ins for rebuilding private client state after a reload.

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
Returns privacy-safe crew status, active alert counts, and `checkin_done_today`. It does not expose medical measurements or private check-in values.
→ `{ mission_day, environment, comms_delay_s, checkin_done_today, crew: [{ id, name, role, avatar, overall: green|amber|red|grey, active_alert_count }] }` sorted by attention needed. **Never** returns values, body systems or mood/sleep.

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

### `POST /assistant/chat` (public, optional auth — MOD-01)
~~Body: `{ astronaut_id, message }`~~ _(deprecated by MOD-01: private endpoint with `astronaut_id` in the body)_
~~→ `{ answer, sources: [{id,title,url}], data_used: string[], caution: string, mode: "agentic" | "unavailable" }`~~ _(deprecated by MOD-01)_
The backend runs a bounded agentic loop with ~~Mistral~~ the LLM provider (MOD-02: OpenAI SDK → NVIDIA NIM) and read-only health/source tools. If ~~Mistral~~ the LLM provider is unreachable, return `503 AI_UNAVAILABLE`; logging, alerts, status and emergency endpoints continue to work.

**MOD-01:**
Body: `{ message }` (1–2000 chars). There is no `astronaut_id`: the session astronaut comes from the optional Bearer token. A body with extra fields (e.g. `astronaut_id`) → 400 `VALIDATION_ERROR`.
→ 200 `{ answer, sources: [{id,title,url}], data_used: string[], caution: string, mode: "agentic", scope: "public" | "private" }`
- `scope: "public"` (no token): source registry + every astronaut's active alerts (`level`, `title`, `ts`). No values, trends, check-ins, mood or sleep.
- `scope: "private"` (valid token): the same plus the token astronaut's own private data. Other astronauts stay at public scope.
- `data_used` lists the tools that were run successfully.
- (MOD-03) The loop waits ≥ 1 s between LLM requests, so a question that uses tools takes a few seconds; clients should show a "thinking" state and use a generous timeout (≥ 60 s).
- (MOD-04) Optional `emergency` object in the body: `{ situation, scenario?, step?: { kind, title, items? }, assessment?: { responsive?, breathing?, onset? }, vitals?: [{ label, value, unit }], minutes_elapsed?, history?: [{ role, text }] (≤ 6) }`. It carries what the emergency guide is showing (no private stored data) and switches the assistant to short answers bound to the current step (max 1 tool round, no "press the Emergency button" note). The emergency guide itself never depends on it: if the call fails, the UI shows an offline answer built from the current step.
- Errors: 401 `UNAUTHENTICATED` (invalid/expired token), 429 (rate limit, 20 requests/min), 503 `AI_UNAVAILABLE` (no ~~`MISTRAL_API_KEY`~~ `LLM_API_KEY` (MOD-02), or the provider is unreachable after 2 automatic retries).

## Alert shape
```
Alert { id, astronaut_id, rule_id, rule_version, indicator, value, level: amber|red,
        message, actions: string[], who_acts: ("self"|"crew"|"ground")[],
        source: { id, title, url }, ts, active, illustrative: true }
```
