# Features for Design — Astro Health Monitor

Working document for **design**. Describes each feature from the user's point of view: screens, elements, states and open design questions. Complements `spec.md` (requirements) and `tasks.md` (assignments).

Priority: **P0** required for the demo · **P1** highly desirable · **Stretch** only if time allows (F13 and F15) · **Removed** out of scope (F12, F14, F16)

---

## 0. What the challenge actually asks for

From the official statement and the challenge author's video (Brazilian Space Agency):

| The challenge says | What it means for us |
|---|---|
| "Gather health indicators and enable astronauts to **evaluate and act**" | Logging is not enough: every value needs an interpretation and a next step |
| "**Astronauts are not doctors.** Explain how to take each measurement, why it matters, and what to do when a value does not look normal" | Built-in measurement guides + plain-language explanations (F3) |
| "Halfway to Mars, a crewmate feels **sharp chest pain and collapses**… what should you do?" | An **emergency mode** with step-by-step guidance (F5). This is the author's own scenario: use it in the demo |
| "Provide **guidance on treatments and health improvements**" | Every alert and status comes with concrete actions (F4) |
| "**A human figure where each part of the body is clickable**" | Interactive body map as the main dashboard (F2) |
| "**Prompt astronauts to take measurements** as part of the mission routine" | Reminders and daily routine (F8) |
| "**Different environments**: spacecraft, station, rover, lunar/planetary base" | Environment selector that adapts context (F11) |
| "**Gamification**, **dynamic charts**, **color coding**" | F6 and color + icon status everywhere. Gamification (F12) is out of scope |
| "When might a result warrant attention from the **crew or from flight surgeons on the ground**?" | Every alert says who should act: self, crew or ground (F4) |
| "Use **NASA's Open Science Data Repository** for inspiration" | Realistic ranges in the simulator; cite it (F7) |
| "Could inspire **healthcare tools on Earth** for remote communities" | Closing slide of the pitch |

Example indicators named in the statement: **blood pressure, heart rate, blood sugar (mg/dL), body temperature, daily sleep hours, mood**. Inputs can be keyboard, clicks or even camera images.

---

## 1. User context (applies to every screen)

**Astronaut on a long mission (e.g. day 92, halfway to Mars).**
- Not a doctor: every number needs a plain explanation.
- Little time, often tired; may be floating or wearing gloves → large targets, few taps.
- Messages to Earth take up to ~20 min each way → the app must guide action on board.
- In an emergency they are stressed → one instruction at a time, huge buttons, no reading walls of text.

**Crewmate / Commander:** may use the app *on someone else* (emergency) and wants the whole crew at a glance.

---

## 2. Screen map

```
[Profile picker: 4 astronauts (no login) + environment]
        │
        ▼
[Body map dashboard] ──► [Body system detail] ──► [Measurement guide]
   │   │   │   │                    │
   │   │   │   │                    └──► [Trends]
   │   │   │   └──► [Alert detail → actions → who to contact]
   │   │   └──────► [Check-in / Log measurement]
   │   └──────────► [Routine & reminders]
   ├──────────────► [AI Assistant]
   ├──────────────► [Crew view] (commander)
   └── 🔴 [EMERGENCY] — always visible, one tap
```

Suggested navigation: bottom/side bar **Body · Log · Routine · Trends · Assistant · Crew**, plus a permanent red **Emergency** button.

---

## F1 · Log measurements & daily check-in — P0

**Goal:** record indicators fast, with help on how to measure.

**Indicators (MVP):**
| Indicator | Unit | Input |
|---|---|---|
| Heart rate | bpm | number |
| Blood pressure | mmHg (sys/dia) | two numbers |
| Blood sugar | mg/dL | number |
| Body temperature | °C | number |
| Sleep | hours | slider |
| Mood | 1–5 | faces |
| Fatigue | 1–5 | scale |
| Exercise | min | number |

**Elements:**
- Daily check-in (sleep, mood, fatigue) completable in < 30 s
- "Log a measurement" with indicator picker
- **"How do I measure this?"** link next to every field → F3
- Instant feedback after saving: "Normal for you" / "Higher than usual — see why"

**States:** empty · already logged today · out-of-range input error · saved (with or without alert)

**Design questions:** faces or numbers for mood? One long form or one indicator per card?

---

## F2 · Interactive body map dashboard — P0 ⭐ (suggested by the challenge)

**Goal:** see your health at a glance on a human figure; tap any part to learn more.

**Elements:**
- Human silhouette (front view) with clickable zones, each colored by status:
  | Zone | Body system | Indicators |
  |---|---|---|
  | Heart / chest | Cardiovascular | HR, BP |
  | Head / brain | Sleep & mental health | Sleep, mood, fatigue |
  | Whole body / skin | Metabolism & infection | Blood sugar, temperature |
  | Legs / bones | Muscles & bones | Exercise (bone/muscle loss risk) |
- Header: name, **mission day**, environment (e.g. "Day 92 · Transit to Mars · Comms delay 12 min")
- Overall status summary + active alerts (max 3)
- "Today's routine: 2 of 4 done" (link to F8)
- Visible **"Simulated data"** tag

**Tap a zone → Body system detail:**
- What this system does (1–2 sentences)
- How spaceflight affects it (from NASA HRP hazards/risks) with source link
- Latest values with status + mini trend
- Buttons: "Log measurement", "How to measure", "See trends"

**States per zone:** green (OK) · amber (watch) · red (act) · grey (no recent data)

**Design questions:**
- Realistic or stylized/iconic figure? Front only or front/back?
- Subtle animation (pulsing heart, glow on alert zones)?
- Fallback layout if the figure is too slow to build: 4 status cards.

---

## F3 · Measurement guides & explanations — P0 (explicit in the video)

**Goal:** "Astronauts are not doctors" — teach *how* to measure, *why* it matters and *what's normal*.

**One guide card per indicator:**
1. **How to measure** — 3–5 illustrated steps (e.g. BP: sit, rest 5 min, cuff on upper arm at heart level…)
2. **Why it matters in space** — link to the hazard (e.g. fluid shift in microgravity affects the cardiovascular system)
3. **Typical range** — with "illustrative, for demo" tag
4. **If it looks abnormal** — what to do / when to repeat / when to call crew or ground

**Design questions:** illustrations or icons for steps? Accessible from everywhere as a "?" icon?

---

## F4 · Alerts with guided actions — P0

**Goal:** when something is off, tell the astronaut *what it means, what to do and who to involve*.

**Alert card:**
- Level (amber / red) with icon + color + text
- Short title ("Blood pressure higher than usual")
- One-sentence explanation in plain language
- **Actions** (checklist): "Rest 5 min and measure again", "Drink water", …
- **Who should act:** 🧑‍🚀 Self · 👥 Crew · 🌍 Flight surgeon on ground — with estimated comms delay
- **Why:** rule applied (e.g. C-02) + NASA/CSA source link
- Notice: "Illustrative threshold · Not a diagnosis"
- Buttons: "Ask the assistant", "Done / Got it"

**Tone:** calm, clear, action-first. No "ERROR", "DANGER" or all caps (except in Emergency mode).

---

## F5 · Emergency mode — P0 ⭐ (the challenge author's scenario)

**Goal:** "Your crewmate feels a sharp chest pain and collapses. What should you do?" Guide a stressed, non-medical crewmate step by step.

**Entry:** permanent red **EMERGENCY** button (also triggered by red-level rules).

**Flow:**
1. **What's happening?** big buttons: Chest pain · Unconscious / collapsed · Breathing problem · Bleeding/injury · Other
2. **One step per screen**, large text and buttons:
   - "Is the person responsive?" → Yes / No
   - "Is the person breathing normally?" → Yes / No
   - Each answer branches to the next instruction (e.g. alert crew, position, use onboard medical kit/AED per mission procedure, take HR/BP if possible)
3. **Auto-log:** timestamps every step and any measurement taken
4. **Alert crew + prepare ground message** with a summary of what happened and vitals
5. Timer visible on screen

**Must show:** "Follow your mission medical procedures. This guide does not replace the flight surgeon."

**Design questions:**
- Full-screen red/high-contrast theme?
- Voice/large-touch friendly? Can it be used by someone other than the patient (select crew member)?

> Content of the protocol steps is **generic first-aid level and illustrative** for the demo; it must be labeled as such.

---

## F6 · Dynamic trend charts — P0

**Goal:** see how each indicator changes over the mission vs. the person's normal.

**Elements:**
- Indicator selector + range 7 / 30 / 180 days
- Line chart with daily points, **personal baseline** band, alert markers, and mission events (e.g. EVA, solar storm)
- Current value + unit + change vs. baseline ("+12 bpm vs. your average")
- Tap a point → exact value, date, source (manual/simulated)

**States:** not enough data · normal · with alerts

---

## F7 · Mission simulator (demo data) — P0

Not a user screen, but it drives the demo:
- 4 fictional astronauts × 180 days, ranges inspired by NASA OSDR / HRP literature
- **Scripted story** matching the author's video: day ~90 halfway to Mars → one crewmate shows rising HR/BP and poor sleep for several days → chest pain event → Emergency mode
- All data tagged `source = simulated`
- Start screen: pick environment + crew member (4 cards with name, role, avatar)

**Design questions:** names, avatars and mission name (fictional, no real people, no NASA logos).

---

## F8 · Routine & measurement reminders — P1

**Goal:** "Prompt astronauts to take measurements as part of the mission routine."

**Elements:**
- Today's routine list: morning check-in, BP + HR, blood sugar (if scheduled), exercise
- Reminder banners/notifications in the app
- Overdue items highlighted
- Schedule adapts to environment (space station vs. spacecraft in transit)

---

## F9 · AI Assistant — P1

**Goal:** ask in natural language; get explanations grounded in NASA/CSA sources.

**Elements:**
- Chat with suggested questions ("Why is my BP higher in space?", "How do I measure blood sugar?", "How did I sleep this week?")
- Answers with clickable **source chips**
- Label "AI-generated · Not medical advice"
- "Ask about this" entry points from alerts and body map

**States:** empty with suggestions · thinking · answer · AI unavailable (rest of app keeps working)

**Rule:** the assistant explains and summarizes; it never diagnoses or overrides the rule engine / emergency protocol.

---

## F10 · Crew view (commander) — P1

- One card per astronaut: avatar, mini body map or status dots, active alerts, routine completion
- Sorted by "needs attention first"
- Tap → that astronaut's dashboard; quick "Start emergency for…" action

---

## F11 · Environment selector — P1

**Goal:** adapt the tool to a space station or a spacecraft in transit. (Pressurized rover and lunar/Mars base are **out of scope**.)

| Environment | What changes |
|---|---|
| Space station (LEO) | Short comms delay; ground support available quickly |
| Spacecraft in transit to Mars | Long comms delay (minutes); more autonomy |

Shown in the header; affects "who should act" estimates and the routine. Chosen on the profile picker screen.

---

## F12 · Gamification — Removed from scope

Not planned. (Original idea: streaks, a crew readiness score and badges.) Reopen only if the team decides to.

---

## F13 · Radiation context — Stretch
- Cumulative mission dose (mSv, simulated), dose rate and event timeline (e.g. solar particle event)
- Per record: radiation type, location (cabin / EVA / shelter), instrument, and a visible "simulated" status
- Shown as mission context in the header/body map, not as a body indicator
- Never presents dose as biological risk; no claim of real instrument integration (CANS etc.)

## F14 · Offline mode — Removed from scope

Not planned: no offline mode, sync queue, "no link" state or pending reports. The simulated communication delay (short on a station, long in transit) stays: it only changes the "who should act" estimates and the header.

## F15 · Report for flight surgeons — Stretch
- "Send to ground" summary: last 7 days, alerts and emergency log, ready to transmit

## F16 · Camera / image input — Removed from scope

Not planned. (The challenge statement allows image inputs, but the team will use keyboard and click input only.)

---

## Shared design system

| Element | To define |
|---|---|
| Palette | Background, text, accent; accessible green / amber / red / grey; dedicated emergency theme |
| Typography | Heading font + highly legible numeric font |
| Icons | Heart, brain/moon, thermometer, drop (sugar), bone/muscle, radiation, chat, emergency |
| Components | Body map, status chip, alert card, guide card, step card (emergency), chart, source chip, "simulated" tag |
| Fixed labels | "Simulated data", "Illustrative threshold", "Not a diagnosis", "AI-generated", "Follow mission medical procedures" |
