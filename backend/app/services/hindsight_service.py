"""Single integration boundary for Hindsight Cloud and the local demo adapter."""
import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.config import HINDSIGHT_MODE, HINDSIGHT_API_URL, HINDSIGHT_API_KEY, HINDSIGHT_BANK_ID
from app.models.memory import Memory

class HindsightConfigurationError(RuntimeError): pass

class HindsightService:
    def __init__(self, db: Session): self.db = db
    @property
    def mode(self): return HINDSIGHT_MODE
    def _cloud_base(self):
        if HINDSIGHT_MODE != "cloud": return None
        if not all([HINDSIGHT_API_URL, HINDSIGHT_API_KEY, HINDSIGHT_BANK_ID]):
            raise HindsightConfigurationError("HINDSIGHT_MODE=cloud requires HINDSIGHT_API_URL, HINDSIGHT_API_KEY, and HINDSIGHT_BANK_ID.")
        return f"{HINDSIGHT_API_URL.rstrip('/')}/v1/default/banks/{HINDSIGHT_BANK_ID}"
    def _headers(self): return {"Authorization":f"Bearer {HINDSIGHT_API_KEY}","Content-Type":"application/json"}
    def store_memory(self, *, incident_id=None, memory_type="resolution", service, summary, root_cause=None, resolution=None):
        base=self._cloud_base()
        if base:
            content=f"Memory type: {memory_type}\nService: {service}\nIncident: {summary}\nRoot cause: {root_cause or 'Unknown'}\nResolution: {resolution or 'Not recorded'}"
            response=httpx.post(f"{base}/memories",headers=self._headers(),json={"items":[{"content":content,"context":"IncidentMind verified incident outcome"}]},timeout=20)
            response.raise_for_status()
        memory = Memory(incident_id=incident_id, memory_type=memory_type, service=service, summary=summary, root_cause=root_cause, resolution=resolution)
        self.db.add(memory); self.db.commit(); self.db.refresh(memory); return memory
    def recall_memories(self, limit=50):
        return self.db.scalars(select(Memory).order_by(Memory.created_at.desc()).limit(limit)).all()
    def search_similar_incidents(self, query: str, service: str | None = None, limit=3):
        base=self._cloud_base()
        if base:
            response=httpx.post(f"{base}/memories/recall",headers=self._headers(),json={"query":query},timeout=20)
            response.raise_for_status()
            return [Memory(id=-(index+1),service=service or "Cloud memory",summary=item.get("text") or item.get("content") or "Hindsight memory",root_cause=None,resolution=None,memory_type="cloud") for index,item in enumerate(response.json().get("results",[])[:limit])]
        terms = [x.lower() for x in query.replace("\n", " ").split() if len(x) > 3]
        candidates = self.recall_memories(200)
        if service: candidates = [m for m in candidates if m.service.lower() == service.lower()] or candidates
        ranked = sorted(candidates, key=lambda m: sum(t in f"{m.summary} {m.root_cause or ''} {m.resolution or ''}".lower() for t in terms), reverse=True)
        return [m for m in ranked if any(t in f"{m.summary} {m.root_cause or ''} {m.resolution or ''}".lower() for t in terms)][:limit]
    def store_incident_resolution(self, incident, root_cause, resolution, notes=""):
        return self.store_memory(incident_id=incident.id, service=incident.service, summary=f"{incident.title}. {notes}", root_cause=root_cause, resolution=resolution)
    def get_incident_history(self, incident_id):
        return self.db.scalars(select(Memory).where(Memory.incident_id == incident_id)).all()
    def get_memory_stats(self): return {"mode":self.mode,"count":len(self.recall_memories(1000))}
