"""Single integration boundary for Hindsight Cloud and the local SQLite adapter.

Architecture:
  Agent
   └── HindsightService        ← this file is the ONLY integration boundary
         ├── mock mode  (SQLite keyword-ranked recall)
         └── cloud mode (Hindsight retain / recall API)

Never call Hindsight endpoints from anywhere else in the codebase.
"""
import logging
import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.config import (
    HINDSIGHT_MODE,
    HINDSIGHT_API_URL,
    HINDSIGHT_API_KEY,
    HINDSIGHT_BANK_ID,
)
from app.models.memory import Memory

logger = logging.getLogger(__name__)


class HindsightConfigurationError(RuntimeError):
    """Raised when required cloud configuration is missing."""


class HindsightUnavailableError(RuntimeError):
    """Raised when the Hindsight cloud service is reachable but returns an error."""


class HindsightService:
    """Abstraction layer for both mock (local SQLite) and cloud Hindsight memory."""

    def __init__(self, db: Session) -> None:
        self.db = db

    # ── Mode ──────────────────────────────────────────────────────────────
    @property
    def mode(self) -> str:
        return HINDSIGHT_MODE

    @property
    def is_cloud(self) -> bool:
        return HINDSIGHT_MODE == "cloud"

    # ── Cloud helpers ──────────────────────────────────────────────────────
    def _cloud_base(self) -> str | None:
        """Return the cloud base URL or None if in mock mode."""
        if HINDSIGHT_MODE != "cloud":
            return None
        if not all([HINDSIGHT_API_URL, HINDSIGHT_API_KEY, HINDSIGHT_BANK_ID]):
            raise HindsightConfigurationError(
                "HINDSIGHT_MODE=cloud requires HINDSIGHT_API_URL, "
                "HINDSIGHT_API_KEY, and HINDSIGHT_BANK_ID."
            )
        return f"{HINDSIGHT_API_URL.rstrip('/')}/v1/default/banks/{HINDSIGHT_BANK_ID}"

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {HINDSIGHT_API_KEY}",
            "Content-Type": "application/json",
        }

    # ── Store ──────────────────────────────────────────────────────────────
    def store_memory(
        self,
        *,
        incident_id: int | None = None,
        memory_type: str = "resolution",
        service: str,
        summary: str,
        root_cause: str | None = None,
        resolution: str | None = None,
    ) -> Memory:
        """Persist a memory both locally (always) and to Hindsight cloud (if configured)."""
        base = self._cloud_base()
        if base:
            content = (
                f"Memory type: {memory_type}\n"
                f"Service: {service}\n"
                f"Incident: {summary}\n"
                f"Root cause: {root_cause or 'Unknown'}\n"
                f"Resolution: {resolution or 'Not recorded'}"
            )
            try:
                response = httpx.post(
                    f"{base}/memories",
                    headers=self._headers(),
                    json={
                        "items": [
                            {
                                "content": content,
                                "context": "IncidentMind verified incident outcome",
                            }
                        ]
                    },
                    timeout=20,
                )
                response.raise_for_status()
                logger.info(
                    "Stored memory to Hindsight cloud for incident_id=%s", incident_id
                )
            except httpx.HTTPStatusError as exc:
                logger.error("Hindsight cloud store failed: %s", exc)
                raise HindsightUnavailableError(
                    f"Hindsight cloud returned {exc.response.status_code}: {exc.response.text}"
                ) from exc
            except httpx.RequestError as exc:
                logger.error("Hindsight cloud unreachable: %s", exc)
                raise HindsightUnavailableError(
                    f"Hindsight cloud unreachable: {exc}"
                ) from exc

        # Always persist locally (resilience + powers mock mode)
        memory = Memory(
            incident_id=incident_id,
            memory_type=memory_type,
            service=service,
            summary=summary,
            root_cause=root_cause,
            resolution=resolution,
        )
        self.db.add(memory)
        self.db.commit()
        self.db.refresh(memory)
        return memory

    # ── Recall ─────────────────────────────────────────────────────────────
    def recall_memories(self, limit: int = 50) -> list[Memory]:
        """Return the most recent memories from the local store."""
        return list(
            self.db.scalars(
                select(Memory).order_by(Memory.created_at.desc()).limit(limit)
            ).all()
        )

    def search_similar_incidents(
        self, query: str, service: str | None = None, limit: int = 3
    ) -> list[Memory]:
        """Search for similar incidents via cloud recall or local keyword ranking."""
        base = self._cloud_base()
        if base:
            try:
                response = httpx.post(
                    f"{base}/memories/recall",
                    headers=self._headers(),
                    json={"query": query},
                    timeout=20,
                )
                response.raise_for_status()
                results = response.json().get("results", [])[:limit]
                cloud_memories: list[Memory] = []
                for index, item in enumerate(results):
                    # Parse structured fields from the stored content
                    text = item.get("text") or item.get("content") or ""
                    parsed_cause: str | None = None
                    parsed_resolution: str | None = None
                    parsed_service: str = service or "Cloud memory"
                    for line in text.splitlines():
                        lower = line.lower()
                        if lower.startswith("root cause:"):
                            parsed_cause = line.split(":", 1)[1].strip()
                        elif lower.startswith("resolution:"):
                            parsed_resolution = line.split(":", 1)[1].strip()
                        elif lower.startswith("service:"):
                            parsed_service = line.split(":", 1)[1].strip()
                    cloud_memories.append(
                        Memory(
                            id=-(index + 1),
                            service=parsed_service,
                            summary=text[:200] if text else "Hindsight memory",
                            root_cause=parsed_cause,
                            resolution=parsed_resolution,
                            memory_type="cloud",
                        )
                    )
                logger.info(
                    "Hindsight cloud recall returned %d results for query=%r",
                    len(cloud_memories),
                    query[:60],
                )
                return cloud_memories
            except httpx.HTTPStatusError as exc:
                logger.error("Hindsight cloud recall failed: %s", exc)
                raise HindsightUnavailableError(
                    f"Hindsight cloud recall returned {exc.response.status_code}"
                ) from exc
            except httpx.RequestError as exc:
                logger.error("Hindsight cloud recall unreachable: %s", exc)
                raise HindsightUnavailableError(
                    f"Hindsight cloud unreachable: {exc}"
                ) from exc

        # Mock mode: keyword-ranked local search
        terms = [
            x.lower()
            for x in query.replace("\n", " ").split()
            if len(x) > 3
        ]
        candidates = self.recall_memories(200)
        if service:
            service_filtered = [
                m for m in candidates if m.service.lower() == service.lower()
            ]
            candidates = service_filtered or candidates

        def score(m: Memory) -> int:
            corpus = (
                f"{m.summary} {m.root_cause or ''} {m.resolution or ''}".lower()
            )
            return sum(t in corpus for t in terms)

        ranked = sorted(candidates, key=score, reverse=True)
        return [m for m in ranked if score(m) > 0][:limit]

    # ── Helpers ────────────────────────────────────────────────────────────
    def store_incident_resolution(
        self,
        incident,
        root_cause: str,
        resolution: str,
        notes: str = "",
    ) -> Memory:
        summary = f"{incident.title}. {notes}".strip(". ")
        return self.store_memory(
            incident_id=incident.id,
            service=incident.service,
            summary=summary,
            root_cause=root_cause,
            resolution=resolution,
        )

    def get_incident_history(self, incident_id: int) -> list[Memory]:
        return list(
            self.db.scalars(
                select(Memory).where(Memory.incident_id == incident_id)
            ).all()
        )

    def get_memory_stats(self) -> dict:
        all_memories = self.recall_memories(1000)
        services = {m.service for m in all_memories}
        resolution_count = sum(1 for m in all_memories if m.memory_type == "resolution")
        return {
            "mode": self.mode,
            "count": len(all_memories),
            "resolution_count": resolution_count,
            "services_covered": len(services),
        }
