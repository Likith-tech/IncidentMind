# Hindsight — What It Does and Why IncidentMind Needs It

## What Hindsight Does

Hindsight is a persistent organizational memory service. It stores structured knowledge and retrieves the most relevant pieces of that knowledge on demand — ordered by semantic relevance to a given query.

For IncidentMind, Hindsight answers one question every time a new incident occurs:

> **"Has our team seen something like this before?"**

If yes, Hindsight returns what was learned — including what actually fixed it.

---

## What Gets Stored

Every time an engineer resolves an incident in IncidentMind, the following is stored as a Hindsight memory:

```
Memory type:   resolution
Service:       Payment Service
Incident:      Payment API returning 503 errors.
Root cause:    Redis connection pool exhaustion
Resolution:    Increased Redis connection pool from 20 to 50 connections.
```

This memory is structured, searchable, and permanent.

---

## When Memory Is Written

Memory is written **after incident resolution**.

The engineer provides:
1. Actual root cause (what really happened)
2. Resolution applied (what actually fixed it)

These become the verified, factual basis of the memory — not AI speculation.

```
Engineer resolves incident
         ↓
IncidentMind calls HindsightService.store_incident_resolution()
         ↓
Hindsight retains the memory permanently
         ↓
Available for all future incidents
```

---

## When Memory Is Recalled

Memory is recalled **at the start of every AI analysis**.

```
Engineer clicks "Run AI Analysis"
         ↓
Agent calls HindsightService.search_similar_incidents(query, service)
         ↓
Hindsight searches the memory bank by relevance
         ↓
Returns top matching memories with root causes and resolutions
         ↓
Agent uses these as context for its recommendation
```

---

## How Memory Influences Recommendations

Without memory:

```
Incident: Redis pool exhausted
Agent recommendation:
  1. Check service metrics and recent deploys.
  2. Check dependency health and error-rate changes.
  3. Mitigate only after engineer verification.
Confidence: 64%
```

With memory (after one previous resolution):

```
Incident: Redis pool exhausted
Agent recommendation:
  1. Past successful resolution: Increased Redis pool 20→50.  ← FROM HINDSIGHT MEMORY
  2. Check active Redis connections and pool saturation.
  3. Confirm latency and connection errors.
  4. Increase the pool only after confirming saturation.
Confidence: 87%
```

The first recommended action is the previous verified fix. The confidence increases because a matching historical resolution was found.

---

## Why This Matters

Without Hindsight, incident response AI is stateless:
- Every incident is analyzed in isolation
- No institutional knowledge is retained between incidents
- The same mistakes are investigated repeatedly
- New engineers can't benefit from what experienced engineers learned

With Hindsight, incident response is cumulative:
- Every resolved incident improves future recommendations
- The more incidents the team resolves, the smarter the agent becomes
- Rare but recurring incidents are immediately matched to historical experience
- Institutional knowledge survives team changes and late-night fatigue

---

## Integration Architecture

```
backend/app/services/hindsight_service.py
```

This is the **only file** in the codebase that calls Hindsight.

```python
# Store (called after resolve)
HindsightService.store_incident_resolution(incident, root_cause, resolution)
  └── Calls: POST /v1/default/banks/{bank_id}/memories  (cloud mode)

# Recall (called during analyze)
HindsightService.search_similar_incidents(query, service)
  └── Calls: POST /v1/default/banks/{bank_id}/memories/recall  (cloud mode)
```

In mock mode, both operations use SQLite with keyword-ranked search. The agent code never changes between mock and cloud — only the service implementation switches.

---

## Mock vs Cloud Mode

| | Mock Mode | Cloud Mode |
|---|---|---|
| Storage | SQLite (local file) | Hindsight cloud API |
| Recall | Keyword ranking | Semantic search via Hindsight |
| Setup | No configuration | `HINDSIGHT_API_URL`, `HINDSIGHT_API_KEY`, `HINDSIGHT_BANK_ID` |
| Persistence | Local — cleared on `demo/reset` | Cloud — survives restarts |
| Demo reliability | 100% reliable, no network | Requires connectivity |

The demo uses mock mode for reliability. Cloud mode demonstrates real Hindsight integration.

