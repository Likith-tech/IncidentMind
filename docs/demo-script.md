# IncidentMind — Demo Script

## Overview

**Duration:** 60–90 seconds  
**Audience:** Hackathon judges  
**Key message:** IncidentMind doesn't just analyze incidents — it remembers what your team learned and uses that experience the next time something goes wrong.

---

## Setup Before Demo

1. Open Demo Mode page (`/demo`) — reset to clean state
2. Have the app open at Dashboard in a browser
3. Know in advance: first incident gets no memory match, second incident gets the match

---

## Script

### 0–10 seconds — Introduction

> "IncidentMind is an AI incident-response agent powered by Hindsight — persistent organizational memory.
>
> The problem it solves: every time a new incident happens, engineers start from scratch. They don't have easy access to what their team learned the last time the same thing broke.
>
> IncidentMind fixes that. Every resolved incident becomes memory. And memory changes what the AI recommends next time."

*[Point to the Dashboard — show KPIs and the Hindsight Memory panel on the right]*

---

### 10–25 seconds — Create First Incident

> "Let me create an incident."

*[Click Demo Mode → 'Create This Incident' — form is pre-filled]*

> "Payment API is returning 503 errors, Redis connection pool is exhausted. Critical severity, production."

*[Click Create Incident — navigate to incident detail page]*

> "Incident created. Now let's run AI analysis."

*[Click 'Run AI Analysis' — watch the loading overlay cycle through steps]*

> "The agent is searching Hindsight memory for similar past incidents. This is the first time we've seen this — so no memory is found."

*[Point to the Hindsight Memory section — purple panel, shows 'No historical memory found']*

> "We get a generic recommendation. 64% confidence."

---

### 25–40 seconds — Resolve and Store Memory

> "The engineer investigates and finds the fix. Let's resolve the incident."

*[Click 'Resolve Incident' — fill in the modal]*

> "Root cause: Redis connection pool exhaustion. Resolution: increased the pool from 20 to 50 connections."

*[Click 'Store Resolution Memory' — toast appears]*

> "IncidentMind just stored this as organizational memory. Let me show you — "

*[Navigate to Memory page]*

> "That resolution is now in the Hindsight memory bank. Available for any future incident."

---

### 40–60 seconds — Similar Incident Recalls Memory

> "Now let's create a similar incident. Different title, same symptoms."

*[Go back to Demo Mode → 'Create Similar Incident (Step 5)']*

*[Create the incident, then run AI analysis]*

> "Watch what happens this time."

*[Point to the Hindsight Memory section — it now shows the previous memory]*

> "Hindsight recalled the memory from the incident we just resolved. The root cause, the resolution — it's all here. And look at the first recommended action..."

*[Point to 'Past successful resolution: Increased Redis pool from 20 to 50']*

> "The previous verified fix is now the first recommendation. Confidence is 87%."

---

### 60–75 seconds — Close

> "That's the learning loop. First incident: no memory, generic recommendation. Resolve it, store it. Second similar incident: memory recalled, specific recommendation, higher confidence, faster resolution.
>
> IncidentMind doesn't just analyze incidents — it remembers what your team learned, and uses that experience the next time something goes wrong.
>
> The Hindsight memory bank grows with every resolved incident. The more your team uses it, the smarter it gets."

---

## Key Moments to Emphasize

| Moment | What to say |
|---|---|
| First analysis — no memory | "No memory found — this is the first time we've seen this" |
| Memory stored after resolve | "That resolution is now permanently in the Hindsight memory bank" |
| Second analysis — memory recalled | "Hindsight recalled the memory from the previous incident" |
| First recommended action | "The previous verified fix is now the top recommendation" |
| Confidence increase | "87% confidence vs 64% — because we have historical evidence" |

---

## If Demo Reset Is Needed

1. Go to Demo Mode page
2. Click "Reset Demo Data"
3. Confirm in the modal
4. Start from Step 1 again

The reset restores the exact seed data — 20 resolved incidents and 10 memories from different services.

---

## Talking Points for Q&A

**Q: Does it work with real Hindsight?**
> Yes — switching `HINDSIGHT_MODE=cloud` with credentials activates the real Hindsight retain and recall API. The agent code doesn't change at all.

**Q: What if there's no matching memory?**
> The agent still generates a recommendation based on pattern matching. The Hindsight Memory section shows "No historical memory found" — it never fabricates a memory match.

**Q: How does memory search work?**
> In mock mode, keyword-ranked search over local SQLite. In cloud mode, Hindsight's semantic recall API — which provides much better matching across different phrasings of the same problem.

**Q: Is the memory permanent?**
> In mock mode, it persists between restarts but can be reset via the Demo Reset button. In cloud mode, it's permanently stored in the Hindsight memory bank.

