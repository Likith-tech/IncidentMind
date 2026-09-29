# IncidentMind — Hackathon Submission

---

## Project Name

**IncidentMind**

---

## One-Line Pitch

AI incident response that learns from every incident through persistent organizational memory powered by Hindsight.

---

## Problem

Production engineering teams repeatedly investigate the same classes of incidents from scratch. Institutional knowledge — what broke, why, and what fixed it — lives in Slack threads, stale runbooks, and individual engineers' memories. It is not systematically reused.

When a new incident occurs at 3am:
- The on-call engineer doesn't know if this has happened before
- Previous successful fixes are not surfaced automatically
- Time is wasted re-investigating known problems
- Junior engineers cannot benefit from senior engineers' past experience

---

## Solution

IncidentMind is an AI incident-response agent with persistent organizational memory.

Every resolved incident becomes a structured memory. The next time a similar incident occurs, the agent recalls relevant past experiences before generating its recommendation — surfacing the previous verified fix as the first recommended action.

**The system gets smarter with every resolved incident.**

---

## Core User Journey

```
Engineer creates incident
         ↓
AI analyzes — searches Hindsight memory first
         ↓
If memory exists: recommendation cites previous successful resolution
If no memory: recommendation based on observed pattern
         ↓
Engineer resolves with actual root cause + fix
         ↓
Resolution stored permanently in Hindsight memory bank
         ↓
Next similar incident → memory retrieved → better recommendation
```

---

## The Role of Hindsight

Hindsight provides the persistent memory layer that makes IncidentMind's learning loop possible.

Without Hindsight, every incident analysis starts from zero. With Hindsight:

- **retain** — successful resolutions are stored as structured memories after each incident
- **recall** — when a new incident is analyzed, Hindsight retrieves the most semantically relevant past memories

The Hindsight integration is isolated to a single file (`backend/app/services/hindsight_service.py`) so the rest of the application is not coupled to Hindsight implementation details.

---

## Demo Story

1. **Create** the Payment API 503 incident — Redis pool exhausted
2. **Analyze** — no memory found, generic recommendation (64% confidence)
3. **Resolve** — root cause: Redis pool exhaustion; fix: increase pool 20→50
4. **Memory stored** — Hindsight retains the resolution
5. **Create similar incident** — different title, same error pattern
6. **Analyze again** — Hindsight recalls the previous memory
7. **Result** — first recommendation is the previous verified fix, 87% confidence

The memory influence is visually explicit in the UI — the Hindsight Memory section (purple) shows the retrieved experience and explains why it influenced the recommendation.

---

## Technology

| Component | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Recharts |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2 |
| Memory | Hindsight (mock: SQLite; cloud: Hindsight API) |
| AI | Mock (deterministic) or Groq (LLM JSON) |
| Database | SQLite |

---

## What Makes This Different

| Capability | IncidentMind | Generic AI chatbot |
|---|---|---|
| Searches past incidents before answering | ✅ | ❌ |
| Surfaces previous verified fixes | ✅ | ❌ |
| Stores resolutions for future recall | ✅ | ❌ |
| Gets smarter with every resolved incident | ✅ | ❌ |
| Human-in-the-loop verification required | ✅ | ❌ |
| No fake metrics or hallucinated memory | ✅ | ❌ |

---

## Constraints and Honesty

- All metrics are calculated from real application data — no fake percentages
- Memory is only shown in the UI when it actually exists — no fabricated matches
- AI recommendations always include an engineer-verification note
- Mock mode is clearly labeled as mock throughout the UI
- Hindsight cloud mode is architecture-ready; mock mode is fully functional for demo

---

## Current Status

- ✅ Complete incident lifecycle (create, analyze, resolve)
- ✅ Hindsight memory recall and retain (mock + cloud architecture)
- ✅ Memory-influenced AI recommendations
- ✅ Dashboard with real KPIs
- ✅ Memory explorer with search and filters
- ✅ 7-step guided demo mode for judges
- ✅ Backend: 3/3 tests pass
- ✅ Frontend: 0 TypeScript errors, 0 build errors
- ✅ No secrets committed, .gitignore complete

---

## Contact / Repository

> [See README for full setup, API reference, and architecture details]

