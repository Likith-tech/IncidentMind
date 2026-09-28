import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.incident import Incident
from app.models.memory import Memory
from app.schemas.incident import IncidentCreate, ResolveIncident
from app.services.agent_service import IncidentAgent
from app.services.hindsight_service import HindsightService
from app.services.hindsight_service import HindsightConfigurationError, HindsightUnavailableError
from app.services.llm_service import LLMConfigurationError
from app.core.config import HINDSIGHT_MODE, LLM_MODE, APP_ENV
from app.db.seed import seed

router = APIRouter(prefix="/api")

def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)

def incident_out(i):
    return {
        "id": i.id,
        "title": i.title,
        "service": i.service,
        "severity": i.severity,
        "environment": i.environment,
        "timestamp": i.timestamp,
        "error_logs": i.error_logs,
        "symptoms": i.symptoms,
        "context": i.context,
        "status": i.status,
        "analysis": json.loads(i.analysis) if i.analysis else None,
        "root_cause": i.root_cause,
        "resolution": i.resolution,
        "created_at": i.created_at,
        "resolved_at": i.resolved_at,
    }

@router.get("/health")
def health(db: Session = Depends(get_db)):
    # Check DB
    try:
        db.execute(select(func.count()).select_from(Incident))
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {e}"

    return {
        "status": "ok",
        "service": "incidentmind-api",
        "version": "1.0.0",
        "environment": APP_ENV,
        "hindsight_mode": HINDSIGHT_MODE,
        "llm_mode": LLM_MODE,
        "database": db_status,
    }

@router.get("/incidents")
def list_incidents(
    status: str = Query(default=""),
    severity: str = Query(default=""),
    service: str = Query(default=""),
    db: Session = Depends(get_db),
):
    q = select(Incident).order_by(Incident.created_at.desc())
    incidents = db.scalars(q).all()
    if status:
        incidents = [i for i in incidents if i.status.lower() == status.lower()]
    if severity:
        incidents = [i for i in incidents if i.severity.lower() == severity.lower()]
    if service:
        incidents = [i for i in incidents if service.lower() in i.service.lower()]
    return [incident_out(i) for i in incidents]

@router.post("/incidents", status_code=201)
def create_incident(payload: IncidentCreate, db: Session = Depends(get_db)):
    i = Incident(
        **payload.model_dump(exclude={"timestamp"}),
        timestamp=payload.timestamp or utcnow(),
    )
    db.add(i)
    db.commit()
    db.refresh(i)
    return incident_out(i)

@router.get("/incidents/{incident_id}")
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    i = db.get(Incident, incident_id)
    if not i:
        raise HTTPException(404, "Incident not found")
    return incident_out(i)

@router.post("/incidents/{incident_id}/analyze")
def analyze(incident_id: int, db: Session = Depends(get_db)):
    i = db.get(Incident, incident_id)
    if not i:
        raise HTTPException(404, "Incident not found")
    try:
        i.status = "analyzing"
        db.commit()
        analysis = IncidentAgent(db).analyze_incident(i)
        i.status = "analyzed"
        db.commit()
        return analysis
    except (HindsightConfigurationError, HindsightUnavailableError, LLMConfigurationError) as exc:
        i.status = "open"
        db.commit()
        raise HTTPException(503, str(exc))
    except Exception as exc:
        i.status = "open"
        db.commit()
        raise HTTPException(500, f"Analysis failed: {exc}")

@router.post("/incidents/{incident_id}/resolve")
def resolve(incident_id: int, payload: ResolveIncident, db: Session = Depends(get_db)):
    i = db.get(Incident, incident_id)
    if not i:
        raise HTTPException(404, "Incident not found")
    i.status = "resolved"
    i.root_cause = payload.actual_root_cause
    i.resolution = payload.resolution_applied
    i.resolved_at = utcnow()
    db.commit()
    try:
        m = HindsightService(db).store_incident_resolution(
            i, payload.actual_root_cause, payload.resolution_applied, payload.notes
        )
    except (HindsightConfigurationError, HindsightUnavailableError) as exc:
        # Incident is already resolved locally; warn but don't fail
        return {
            "incident": incident_out(i),
            "memory_id": None,
            "message": f"Incident resolved, but memory storage failed: {exc}",
            "warning": str(exc),
        }
    return {
        "incident": incident_out(i),
        "memory_id": m.id,
        "message": "Resolution stored in Hindsight memory.",
    }

@router.get("/memory")
def memories(
    query: str = Query(default=""),
    service: str = Query(default=""),
    memory_type: str = Query(default=""),
    db: Session = Depends(get_db),
):
    svc = HindsightService(db)
    records = svc.recall_memories()
    needle = query.lower().strip()
    if needle:
        records = [
            m for m in records
            if needle in f"{m.summary} {m.root_cause or ''} {m.resolution or ''}".lower()
        ]
    if service:
        records = [m for m in records if m.service.lower() == service.lower()]
    if memory_type:
        records = [m for m in records if m.memory_type.lower() == memory_type.lower()]
    return [
        {
            "id": m.id,
            "incident_id": m.incident_id,
            "memory_type": m.memory_type,
            "service": m.service,
            "summary": m.summary,
            "root_cause": m.root_cause,
            "resolution": m.resolution,
            "created_at": m.created_at,
            "mode": svc.mode,
        }
        for m in records
    ]

@router.get("/memory/stats")
def memory_stats(db: Session = Depends(get_db)):
    return HindsightService(db).get_memory_stats()

@router.get("/memory/{memory_id}")
def memory(memory_id: int, db: Session = Depends(get_db)):
    m = db.get(Memory, memory_id)
    if not m:
        raise HTTPException(404, "Memory not found")
    return {
        "id": m.id,
        "incident_id": m.incident_id,
        "memory_type": m.memory_type,
        "service": m.service,
        "summary": m.summary,
        "root_cause": m.root_cause,
        "resolution": m.resolution,
        "created_at": m.created_at,
    }

@router.post("/memory/search")
def search(payload: dict, db: Session = Depends(get_db)):
    results = HindsightService(db).search_similar_incidents(
        payload.get("query", ""), payload.get("service")
    )
    return [
        {
            "id": m.id,
            "summary": m.summary,
            "root_cause": m.root_cause,
            "resolution": m.resolution,
            "service": m.service,
            "memory_type": m.memory_type,
        }
        for m in results
    ]

@router.post("/agent/analyze")
def direct_agent(payload: IncidentCreate, db: Session = Depends(get_db)):
    i = Incident(
        **payload.model_dump(exclude={"timestamp"}),
        timestamp=payload.timestamp or utcnow(),
    )
    return IncidentAgent(db).analyze_incident(i)

@router.get("/dashboard/summary")
def dashboard(db: Session = Depends(get_db)):
    incidents = db.scalars(select(Incident)).all()
    memories = db.scalars(select(Memory)).all()

    resolved = [i for i in incidents if i.status == "resolved"]
    active = [i for i in incidents if i.status != "resolved"]
    critical = [i for i in incidents if i.severity.lower() == "critical"]
    memory_influenced = [
        i for i in incidents
        if i.analysis and json.loads(i.analysis).get("memory_influenced")
    ]

    # Avg resolution minutes for resolved incidents with timestamps
    resolution_times = []
    for i in resolved:
        if i.resolved_at and i.created_at:
            delta = (i.resolved_at - i.created_at).total_seconds() / 60
            if 0 < delta < 10000:
                resolution_times.append(delta)
    avg_resolution = round(sum(resolution_times) / len(resolution_times)) if resolution_times else 0

    services = {}
    for i in incidents:
        svc = i.service
        if svc not in services:
            services[svc] = {"total": 0, "resolved": 0, "critical": 0}
        services[svc]["total"] += 1
        if i.status == "resolved":
            services[svc]["resolved"] += 1
        if i.severity.lower() == "critical":
            services[svc]["critical"] += 1

    return {
        "active_incidents": len(active),
        "resolved_incidents": len(resolved),
        "critical_incidents": len(critical),
        "memory_count": len(memories),
        "memory_influenced_count": len(memory_influenced),
        "similar_incidents_found": len(memory_influenced),
        "avg_resolution_minutes": avg_resolution,
        "recent_incidents": [incident_out(i) for i in sorted(incidents, key=lambda x: x.created_at, reverse=True)[:6]],
        "severity_distribution": {
            s: sum(i.severity.lower() == s for i in incidents)
            for s in ["critical", "high", "medium", "low"]
        },
        "service_health": services,
        "hindsight_mode": HINDSIGHT_MODE,
        "llm_mode": LLM_MODE,
    }

@router.post("/demo/reset")
def demo_reset(db: Session = Depends(get_db)):
    if HINDSIGHT_MODE != "mock":
        raise HTTPException(403, "Demo reset is available only in HINDSIGHT_MODE=mock.")
    seed(reset=True)
    return {"message": "Demo state restored.", "mode": "mock"}
