# IncidentMind

> AI-powered incident response that learns from every resolved incident through persistent organizational memory.

---

## Problem

Production engineering teams repeatedly investigate the same classes of incidents from scratch. When an on-call engineer joins a 3am page, the knowledge of every similar incident the team has handled before exists only in Slack threads, runbooks that are out of date, or in the memory of whoever happened to be on-call last time. There is no systematic recall.

## Solution

IncidentMind gives your incident-response workflow a persistent memory. Every time an incident is resolved, the root cause and the verified fix are stored as structured organizational memory. The next time a similar incident occurs, the AI agent searches that memory first — and references the previous successful resolution in its recommendation.

**The engineer doesn't need to remember. IncidentMind does.**

---

## Why Hindsight

Hindsight provides the persistent memory layer. Instead of a generic RAG vector store, Hindsight gives us a dedicated memory bank purpose-built for retaining and recalling structured knowledge — in this case, incident resolutions.

```
Resolution → Hindsight retain → Persistent memory bank
                                        ↓
New incident → Hindsight recall → Previous resolution retrieved
                                        ↓
                             Recommendation improved
```

The Hindsight integration is isolated to a single file: `backend/app/services/hindsight_service.py`. Nothing else in the codebase calls Hindsight directly.

---

## How Memory Works

```
┌─────────────────────────────────────────────────────────────┐
│                     THE LEARNING LOOP                       │
│                                                             │
│  1. Incident occurs                                         │
│  2. Agent searches Hindsight memory (recall)                │
│  3. Relevant past resolutions retrieved                     │
│  4. AI generates recommendation informed by history         │
│  5. Engineer resolves incident                              │
│  6. Root cause + resolution stored to Hindsight (retain)    │
│  7. Next similar incident — memory already exists           │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
┌─────────────────────────────────┐
│         React Frontend          │
│  (TypeScript · Vite · Recharts) │
└──────────────┬──────────────────┘
               │ REST API
               ▼
┌─────────────────────────────────┐
│        FastAPI Backend          │
│     (Python · SQLAlchemy)       │
└──────┬───────────────┬──────────┘
       │               │
       ▼               ▼
┌─────────────┐  ┌──────────────┐
│  Incident   │  │   SQLite DB  │
│    Agent    │  │  (Incidents, │
│             │  │   Memories)  │
└──────┬──────┘  └──────────────┘
       │
┌──────┴──────────────────┐
│                         │
▼                         ▼
┌───────────────┐  ┌────────────────┐
│   Hindsight   │  │   LLM Service  │
│    Service    │  │ (mock / Groq)  │
│ (mock/cloud)  │  └────────────────┘
└───────────────┘
```

### Learning Loop

```
Incident → Recall → Reason → Recommend → Resolve → Retain → Future Incident
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Recharts, react-router-dom |
| Backend | Python 3.12+, FastAPI, SQLAlchemy 2, Pydantic v2 |
| Database | SQLite (local), configurable via `DATABASE_URL` |
| Memory | Hindsight (mock: SQLite keyword ranking; cloud: Hindsight retain/recall API) |
| AI | Mock (deterministic rule-based) or Groq (structured JSON via OpenAI-compatible API) |

---

## Features

- **Incident register** — Create, track, and filter incidents by severity, status, and service
- **AI analysis** — Root cause diagnosis with confidence scoring
- **Hindsight memory recall** — Automatically searches for similar past incidents before generating a recommendation
- **Memory-influenced recommendations** — Previous successful resolutions appear as the first recommended action
- **Resolution capture** — Store root cause and resolution as organizational memory
- **Memory explorer** — Browse all stored memories, filter by service and type
- **Dashboard** — Real-time KPIs: active incidents, memory count, avg resolution time, memory-assisted analyses
- **Demo Mode** — Guided 7-step judge-facing flow with pre-filled incidents and reset
- **Mock mode** — Fully functional offline with no external dependencies

---

## Demo Flow

```
Step 1 — Create the Payment API 503 incident (pre-filled in Demo Mode)
Step 2 — Run AI Analysis → no memory found on first run → generic recommendation
Step 3 — Resolve with root cause: "Redis pool exhaustion", fix: "Increase pool 20→50"
Step 4 — Memory stored automatically
Step 5 — Create a similar incident (Redis/Payment errors)
Step 6 — Run AI Analysis again → Hindsight memory recalled
Step 7 — Recommendation now references the previous verified fix
```

---

## Project Structure

```
incidentmind/
├── backend/
│   ├── app/
│   │   ├── api/routes.py           # All REST endpoints
│   │   ├── core/config.py          # Environment configuration
│   │   ├── db/database.py          # SQLAlchemy engine + session
│   │   ├── db/seed.py              # Demo data seeder
│   │   ├── models/                 # SQLAlchemy models (Incident, Memory)
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   └── services/
│   │       ├── hindsight_service.py  ← SINGLE Hindsight integration boundary
│   │       ├── agent_service.py      # Incident analysis agent
│   │       └── llm_service.py        # LLM abstraction (mock/Groq)
│   ├── tests/test_api.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/client.ts           # Typed fetch wrapper
│   │   ├── components/             # Shell, Badges, Toast
│   │   ├── pages/                  # Dashboard, Incidents, Detail, Memory, Agent, Demo
│   │   ├── types.ts                # TypeScript interfaces
│   │   └── styles.css              # Design system (CSS variables)
│   ├── .env.example
│   └── package.json
├── docs/
│   ├── api.md
│   ├── architecture.md
│   ├── demo-script.md
│   ├── hindsight-explanation.md
│   ├── demo-flow.md
│   ├── submission-copy.md
│   └── development-log.md
└── README.md
```

---

## Local Setup

```bash
# 1. Clone / download
cd "incidentmind"

# 2. Backend
cd backend
py -3 -m pip install -r requirements.txt
py -3 -m app.db.seed                          # seed demo data
py -3 -m uvicorn app.main:app --host 127.0.0.1 --port 8010

# 3. Frontend (new terminal)
cd frontend
npm install
cp .env.example .env                          # sets API URL to 8010
npm run dev
```

Open **http://localhost:5173**

---

## Environment Variables

### Backend (`backend/.env`)

Copy `backend/.env.example` and fill in as needed.

| Variable | Default | Required | Description |
|---|---|---|---|
| `APP_ENV` | `development` | No | `development` / `production` |
| `DATABASE_URL` | SQLite local | No | Any SQLAlchemy-compatible URL |
| `HINDSIGHT_MODE` | `mock` | No | `mock` or `cloud` |
| `HINDSIGHT_API_URL` | — | cloud only | Hindsight API base URL |
| `HINDSIGHT_API_KEY` | — | cloud only | Hindsight API key |
| `HINDSIGHT_BANK_ID` | — | cloud only | Hindsight memory bank ID |
| `LLM_MODE` | `mock` | No | `mock` or `groq` |
| `GROQ_API_KEY` | — | groq only | Groq API key |
| `LLM_MODEL` | — | groq only | e.g. `llama3-8b-8192` |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://127.0.0.1:8010` | Backend URL |

---

## Mock Mode (Default)

No external services required. Everything runs locally.

```env
HINDSIGHT_MODE=mock   # SQLite keyword-ranked memory
LLM_MODE=mock         # Deterministic rule-based analysis
```

The mock Hindsight adapter ranks memories by keyword overlap against the incident description.
The mock LLM uses pattern matching on common error types (Redis, JWT, Kafka, database, timeout).

---

## Real Hindsight Mode

```env
HINDSIGHT_MODE=cloud
HINDSIGHT_API_URL=https://your-hindsight-instance/
HINDSIGHT_API_KEY=your-api-key
HINDSIGHT_BANK_ID=your-bank-id
```

In cloud mode, `store_memory` calls `POST /v1/default/banks/{bank_id}/memories` and `search_similar_incidents` calls `POST /v1/default/banks/{bank_id}/memories/recall`.

All Hindsight API calls are isolated to `backend/app/services/hindsight_service.py`.

---

## Real LLM Mode (Groq)

```env
LLM_MODE=groq
GROQ_API_KEY=your-groq-api-key
LLM_MODEL=llama3-8b-8192
```

The LLM receives the current incident and any retrieved historical memories, and returns structured JSON with root cause, confidence, recommended actions, risks, and next steps.

---

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Application health (DB, Hindsight, LLM status) |
| GET | `/api/dashboard/summary` | Dashboard KPIs |
| GET | `/api/incidents` | List incidents (filterable) |
| POST | `/api/incidents` | Create incident |
| GET | `/api/incidents/{id}` | Get incident |
| POST | `/api/incidents/{id}/analyze` | Run AI analysis |
| POST | `/api/incidents/{id}/resolve` | Resolve + store memory |
| GET | `/api/memory` | List memories (filterable) |
| POST | `/api/memory/search` | Search memories |
| GET | `/api/memory/stats` | Memory statistics |
| POST | `/api/demo/reset` | Reset to seed state (mock only) |

Full API reference: [docs/api.md](docs/api.md)

---

## Testing

```bash
# Backend
cd backend
py -3 -m pytest -v

# Frontend
cd frontend
npm run build     # 0 TypeScript errors required
```

---

## Screenshots

| Screen | What to capture |
|---|---|
| Dashboard | KPI row, severity chart, Hindsight memory panel |
| Incident Detail — no analysis | Empty state with "Ready to use Hindsight" |
| Incident Detail — analysis | AI analysis panel + purple Hindsight Memory section |
| Memory Explorer | Memory card grid |
| Demo Mode | 7-step progress bar + demo cards |

---

## Hackathon Notes

- The Hindsight learning loop is the **core product differentiator**
- Memory persistence is **real** (SQLite in mock mode, Hindsight cloud in cloud mode)
- The agent is **not a chatbot** — it is a structured incident analysis pipeline
- All recommendations include a safety note: engineer verification required before applying
- No fake metrics — all numbers are derived from actual application data

---

## Future Roadmap

- Multi-tenant memory banks (per team/service)
- Automatic incident detection via webhook (PagerDuty, alertmanager)
- Memory decay and confidence scoring over time
- Runbook integration (auto-attach relevant runbooks)
- Slack/Teams notification with AI summary
- Export resolved incidents to Confluence/Notion
