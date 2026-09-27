# Architecture

The React client calls FastAPI REST endpoints. SQLAlchemy persists incidents and mock memory records in SQLite. `HindsightService` is the only memory boundary: its mock adapter is used when `HINDSIGHT_MODE=mock`; cloud mode validates credentials and uses the official Hindsight retain and recall endpoints when configured. `IncidentAgent` retrieves memories before generating a structured response and writes verified resolution outcomes through the same service.

`LLMService` is the corresponding reasoning boundary. `LLM_MODE=mock` returns deterministic, evidence-based analysis for demos. `LLM_MODE=groq` uses the OpenAI-compatible Groq chat-completions API only when both `GROQ_API_KEY` and `LLM_MODEL` are configured.
