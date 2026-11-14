# Project Constitution

**Non-negotiable** principles. Every spec, task and piece of code (human- or AI-written) must comply.

1. **Not a medical device.** The app does not diagnose, prescribe or replace the flight surgeon. It is a self-monitoring and decision-support tool.
2. **Rules decide, AI explains.** Statuses and alerts come from a deterministic and versioned rule engine. The LLM never computes risk or invents thresholds.
3. **Full traceability.** Every alert stores: indicator, value, rule (id + version), timestamp and the NASA/CSA source backing it.
4. **Honest data.** Every data point has `source` = `manual | simulated | sensor`. Synthetic data is labeled on screen. Demo thresholds are labeled "illustrative".
5. **Works without AI.** Logging, alerts and viewing the latest status must work even if ~~Mistral~~ the LLM provider (MOD-02) fails. (Offline mode is out of scope.)
6. **Secrets stay out of the repo.** Keys only in the backend `.env`. Never in the frontend or in Git.
7. **Design for a tired astronaut.** Check-in in < 30 s, status readable at a glance, units always visible, high contrast.
8. **Hackathon simplicity.** One finished feature beats three half-done ones. `main` always works.
9. **No overclaiming.** Never state that a NASA/CSA dataset, instrument or study (CANS, ARCHeR, Tempus Pro…) is integrated if it was only used as a design reference. Dose is never presented as biological risk.
10. **English everywhere.** Code, comments, specs, commits and UI copy are written in English.
