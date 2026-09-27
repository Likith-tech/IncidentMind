# Development log

## Phase 1 Verification — 2026-09-27

| Area | Result | Evidence |
|---|---|---|
| Backend | PASS | FastAPI serves `/api/health`. |
| Database | PASS | SQLite persisted seeded incidents, a created incident, and a new resolution memory. |
| Seed data | PASS | 20 resolved incidents and 10 initial resolution memories were available. |
| API | PASS | Health, dashboard, incidents, memory, analysis, and resolution endpoints were exercised against a running server. |
| Frontend install | PASS | `npm install` completed; Vite, TypeScript, and `.bin` are present. |
| Frontend build | PASS | `npm run build` completed successfully. |
| End-to-end workflow | PASS | Payment Service 503 recalled three historical matches, produced a 87% Redis-pool diagnosis, and stored resolution memory ID 11. |

### Fixes applied

- Added missing React, React DOM, and Node TypeScript type packages.
- Moved build tooling to `devDependencies`, enabled ESM package mode, and aligned TypeScript settings with Vite.
- Corrected the incident-detail effect so it does not return a Promise to React.
- Added `pytest.ini` to restrict discovery to the test suite and ignore inaccessible transient pytest folders.

### Known issues

- The FastAPI test client emits a third-party Starlette deprecation warning; it does not affect current behavior.
- `HINDSIGHT_MODE=mock` is intentional: retrieval ranks persisted SQLite resolution records. No cloud Hindsight or external LLM is claimed or configured.

### Next phase

Add a cloud implementation only inside `HindsightService`, then introduce a provider-configured LLM abstraction with integration tests.

## Hackathon completion phases

| Phase | What was built | Tests/result |
|---|---|---|
| 1 — Foundation | FastAPI, SQLite, React dashboard, incident and resolution flow | PASS |
| 2 — Hindsight | Mock adapter plus official Cloud retain/recall boundary and configuration errors | Mock PASS; Cloud not verified without credentials |
| 3 — LLM | Mock deterministic reasoning and optional Groq JSON provider | Mock PASS; Groq not verified without credentials |
| 4 — Learning loop | Analysis captures memory influence; resolution retains a memory | PASS |
| 5 — UI | Dark responsive dashboard, detail analysis, memory page, safety copy | Frontend build PASS |
| 6 — Demo | Guided `/demo` route and mock-only reset endpoint | Backend reset test PASS |
| 7 — Verification | API, tests, and production build | 3 backend tests + Vite build PASS |
