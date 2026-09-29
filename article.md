# We Isolated Hindsight Behind One Python Service Boundary

## Hook

The first useful recommendation in an incident is often not a new diagnosis; it is a reminder of the fix that worked the last time. I built IncidentMind around that observation, and it made the weakness of a stateless incident-analysis agent concrete: it could inspect current symptoms, but it could not carry a verified operational outcome into the next analysis.

## What I Built

IncidentMind is a local incident-response application for recording incidents, analyzing them, resolving them, and retaining verified outcomes as organizational memory. It is designed for an engineer handling an incident who needs a structured recommendation and, when available, evidence from related incidents that were already resolved.

The repository is split into a React 18, TypeScript, and Vite frontend and a Python FastAPI backend. The frontend provides dashboard, incident, incident-detail, memory, agent, and demo pages, and its typed fetch wrapper calls the REST API. The backend uses SQLAlchemy with SQLite by default; `DATABASE_URL` can point to another SQLAlchemy-compatible database. It persists `Incident` rows and local `Memory` rows. It also includes `LLMService`: mock mode returns deterministic pattern-based analysis, while optional Groq mode requests structured JSON through Groq's OpenAI-compatible endpoint.

`POST /api/incidents/{incident_id}/analyze` invokes `IncidentAgent`, which builds a corpus from the title, logs, and symptoms; recalls memories; produces analysis; and stores it on the incident. `POST /api/incidents/{incident_id}/resolve` records the engineer-supplied root cause and resolution, then retains a memory. The UI renders both the recommendation and recalled references.

Hindsight is the persistent-memory integration behind that loop. I used it as a dedicated boundary rather than letting route handlers or agent code call a provider API directly. The project builds on the ideas described in the [Hindsight GitHub repository](https://github.com/vectorize-io/hindsight), the [Hindsight documentation](https://hindsight.vectorize.io/), and Vectorize's explanation of [agent memory](https://vectorize.io/what-is-agent-memory). In this codebase, those concepts are represented by a small, auditable service rather than a general retrieval layer spread across the application.

## Why Stateless Agents Were Not Enough

The mock agent recognizes a handful of error patterns. If the corpus contains `redis`, it produces `Redis connection pool exhaustion` and recommends checking active connections and saturation. That is a safe starting point, but not experience: it cannot tell an engineer what their team changed previously, nor should a pattern match be treated as a confirmed root cause.

The project treats the resolution workflow as the point where a fact becomes reusable. On resolution, the engineer supplies `actual_root_cause` and `resolution_applied`. Those values, rather than the agent's earlier suggestion, become memory. This matters because the agent's analysis is intentionally provisional: the frontend warns that AI-generated recommendations require engineer verification before applying them.

Without recall, a new analysis is bounded by the current incident text and the rules or provider response available during that request. With recall, the agent can add a previous verified resolution to the recommendation. It still asks the engineer to validate production signals before changing configuration. Persistent memory changes the available context, not the safety bar.

## How Hindsight Fits Into the Architecture

All integration lives in `backend/app/services/hindsight_service.py`. `HindsightService` is the only component that knows whether memory is in `mock` or `cloud` mode. Configuration comes from `backend/app/core/config.py`: `HINDSIGHT_MODE`, `HINDSIGHT_API_URL`, `HINDSIGHT_API_KEY`, and `HINDSIGHT_BANK_ID`. Missing cloud configuration raises `HindsightConfigurationError` instead of silently falling back.

Retain happens after the resolution route has persisted the incident's status, root cause, resolution, and timestamp. `store_incident_resolution()` builds a memory from the incident title, optional notes, service, root cause, and resolution. In cloud mode, `store_memory()` submits one structured text item to `POST /v1/default/banks/{bank_id}/memories`. It then writes a local `Memory` row as well. In mock mode, only that local persistence path is used.

Recall happens at the start of `IncidentAgent.analyze_incident()`, before its final result is assembled. In cloud mode, `search_similar_incidents()` posts the query to `/memories/recall`, accepts up to the requested limit, and parses `Service:`, `Root cause:`, and `Resolution:` lines from returned content into transient `Memory` objects. In mock mode, it reads recent local memories, prefers an exact service match when one exists, scores a memory by keyword overlap over its summary, root cause, and resolution, and returns up to three positive-score matches.

The recalled data is copied into `relevant_past_incidents`, shown by the incident-detail UI, and used directly by the agent: if the first recalled memory has a resolution, it becomes the first recommended action. The result also records `memory_influenced`, `memory_count`, `memory_impact`, and the active Hindsight mode.

## The Core Engineering Problem

The strongest decision here was isolating the memory provider without pretending the two implementations are identical. Mock mode is SQLite keyword ranking; cloud mode calls Hindsight's recall API. They share a service interface and a `Memory`-shaped result, but they do not make the same retrieval-quality claim.

The app remains usable locally without credentials or network access: Docker Compose starts the backend with `HINDSIGHT_MODE=mock`, and seed data creates resolution memories for a subset of resolved incidents. Changing provider details does not alter `IncidentAgent` or route contracts; the agent receives records with a summary, root cause, and resolution.

The cloud path has explicit failure behavior. A failed Hindsight request during analysis becomes a 503 and restores the incident status to `open`. During resolution, the incident is already resolved locally; a retention failure returns a warning rather than undoing it.

There is a limitation worth stating plainly. Cloud mode parses fields from the text it wrote to Hindsight; it does not persist a cloud memory identifier or synchronize cloud memories into SQLite. Mock ranking is substring keyword overlap, not semantic retrieval.

## Code Walkthrough

In `backend/app/services/agent_service.py`, recall precedes recommendation assembly:

```python
memories = self.memory.search_similar_incidents(corpus, incident.service)
influenced = bool(memories)
if memories and memories[0].resolution:
    actions.insert(0, f"Past successful resolution: {memories[0].resolution}")
```

This is the behavioral hinge: the agent promotes the top recalled resolution into its action list, while retaining the full set of recalled entries for the UI.

In `backend/app/services/hindsight_service.py`, local mock retrieval filters and scores memories in a small amount of code:

```python
if service:
    service_filtered = [
        m for m in candidates if m.service.lower() == service.lower()
    ]
    candidates = service_filtered or candidates

def score(m: Memory) -> int:
    corpus = f"{m.summary} {m.root_cause or ''} {m.resolution or ''}".lower()
    return sum(t in corpus for t in terms)
```

This gives the local path predictable behavior while retaining a fallback: if no service-specific set exists, the search considers other services. It is not semantic recall.

In `backend/app/api/routes.py`, resolution is persisted before retain is attempted:

```python
i.status = "resolved"
i.root_cause = payload.actual_root_cause
i.resolution = payload.resolution_applied
i.resolved_at = utcnow()
db.commit()
try:
    m = HindsightService(db).store_incident_resolution(
        i, payload.actual_root_cause, payload.resolution_applied, payload.notes
    )
```

That order protects the system of record: a later storage failure returns a warning, but the incident remains resolved.

In `backend/app/services/hindsight_service.py`, cloud configuration is a hard precondition:

```python
if not all([HINDSIGHT_API_URL, HINDSIGHT_API_KEY, HINDSIGHT_BANK_ID]):
    raise HindsightConfigurationError(
        "HINDSIGHT_MODE=cloud requires HINDSIGHT_API_URL, "
        "HINDSIGHT_API_KEY, and HINDSIGHT_BANK_ID."
    )
```

I prefer this to an implicit local fallback because a deployment configured for cloud memory should fail visibly when cloud memory is incomplete.

## Before vs After

This is an architectural example based on the repository's mock-agent behavior, not a measured comparison. Before any matching memory is recalled, a Redis-pattern incident receives the standard actions: check active Redis connections and pool saturation, confirm latency and connection errors, and increase the pool only after confirming saturation. The mock analysis reports 64% confidence when no memory influences it.

After a matching resolution is retained, the same analysis path inserts the stored resolution first. The seeded Payment Service examples include resolutions such as increasing the Redis pool size from 20 to 50 and monitoring saturation. With at least one recalled memory, the mock agent reports 87% confidence and explains that a matching historical resolution influenced the recommendation. The change is deterministic: it is driven by whether recall returned memories, not by a calibrated model-confidence estimate.

## What I Learned

- I retain outcomes after engineer verification, not model speculation. Memory quality starts with write-time discipline.
- I keep provider calls behind one service. It limits configuration, error handling, and response parsing to one place.
- I expose recalled evidence to the user. A memory-influenced recommendation is easier to evaluate when the root cause and resolution that influenced it are visible.
- I treat local fallback behavior honestly. Keyword ranking is useful for offline development, but it is not semantic recall.
- I separate incident persistence from memory availability. A failed retain operation should be visible without invalidating an engineer-recorded resolution.

## Conclusion

In IncidentMind, Hindsight is not a background feature bolted onto an agent. It is the boundary between an analysis based only on current symptoms and one that can surface a verified prior resolution. Keeping that boundary explicit made the retain/recall loop easier to test, operate, and explain.

