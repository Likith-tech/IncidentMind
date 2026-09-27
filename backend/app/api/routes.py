import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.incident import Incident
from app.models.memory import Memory
from app.schemas.incident import IncidentCreate, ResolveIncident
from app.services.agent_service import IncidentAgent
from app.services.hindsight_service import HindsightService
from app.services.hindsight_service import HindsightConfigurationError
from app.services.llm_service import LLMConfigurationError
from app.core.config import HINDSIGHT_MODE
from app.db.seed import seed

router = APIRouter(prefix="/api")
def incident_out(i):
    return {"id":i.id,"title":i.title,"service":i.service,"severity":i.severity,"environment":i.environment,"timestamp":i.timestamp,"error_logs":i.error_logs,"symptoms":i.symptoms,"context":i.context,"status":i.status,"analysis":json.loads(i.analysis) if i.analysis else None,"root_cause":i.root_cause,"resolution":i.resolution,"created_at":i.created_at,"resolved_at":i.resolved_at}
@router.get("/health")
def health(): return {"status":"ok","service":"incidentmind-api"}
@router.get("/incidents")
def list_incidents(db: Session=Depends(get_db)): return [incident_out(i) for i in db.scalars(select(Incident).order_by(Incident.created_at.desc())).all()]
@router.post("/incidents", status_code=201)
def create_incident(payload: IncidentCreate, db: Session=Depends(get_db)):
    i=Incident(**payload.model_dump(exclude={"timestamp"}), timestamp=payload.timestamp or datetime.utcnow()); db.add(i); db.commit(); db.refresh(i); return incident_out(i)
@router.get("/incidents/{incident_id}")
def get_incident(incident_id:int, db:Session=Depends(get_db)):
    i=db.get(Incident,incident_id)
    if not i: raise HTTPException(404,"Incident not found")
    return incident_out(i)
@router.post("/incidents/{incident_id}/analyze")
def analyze(incident_id:int, db:Session=Depends(get_db)):
    i=db.get(Incident,incident_id)
    if not i: raise HTTPException(404,"Incident not found")
    try:
        i.status="analyzing"; db.commit()
        analysis=IncidentAgent(db).analyze_incident(i)
        i.status="analyzed"; db.commit()
        return analysis
    except (HindsightConfigurationError, LLMConfigurationError) as exc:
        i.status="open"; db.commit(); raise HTTPException(503, str(exc))
@router.post("/incidents/{incident_id}/resolve")
def resolve(incident_id:int, payload:ResolveIncident, db:Session=Depends(get_db)):
    i=db.get(Incident,incident_id)
    if not i: raise HTTPException(404,"Incident not found")
    i.status="resolved"; i.root_cause=payload.actual_root_cause; i.resolution=payload.resolution_applied; i.resolved_at=datetime.utcnow(); db.commit()
    m=HindsightService(db).store_incident_resolution(i,payload.actual_root_cause,payload.resolution_applied,payload.notes)
    return {"incident":incident_out(i),"memory_id":m.id,"message":"Resolution stored in Hindsight mock memory."}
@router.get("/memory")
def memories(query:str="", service:str="", memory_type:str="", db:Session=Depends(get_db)):
    records=HindsightService(db).recall_memories()
    needle=query.lower().strip()
    if needle: records=[m for m in records if needle in f"{m.summary} {m.root_cause or ''} {m.resolution or ''}".lower()]
    if service: records=[m for m in records if m.service.lower()==service.lower()]
    if memory_type: records=[m for m in records if m.memory_type.lower()==memory_type.lower()]
    return [{"id":m.id,"incident_id":m.incident_id,"memory_type":m.memory_type,"service":m.service,"summary":m.summary,"root_cause":m.root_cause,"resolution":m.resolution,"created_at":m.created_at,"mode":HindsightService(db).mode} for m in records]
@router.get("/memory/stats")
def memory_stats(db:Session=Depends(get_db)): return HindsightService(db).get_memory_stats()
@router.get("/memory/{memory_id}")
def memory(memory_id:int,db:Session=Depends(get_db)):
    m=db.get(Memory,memory_id)
    if not m: raise HTTPException(404,"Memory not found")
    return {"id":m.id,"summary":m.summary,"root_cause":m.root_cause,"resolution":m.resolution}
@router.post("/memory/search")
def search(payload:dict,db:Session=Depends(get_db)): return [{"id":m.id,"summary":m.summary,"root_cause":m.root_cause,"resolution":m.resolution} for m in HindsightService(db).search_similar_incidents(payload.get("query",""),payload.get("service"))]
@router.post("/agent/analyze")
def direct_agent(payload:IncidentCreate,db:Session=Depends(get_db)):
    i=Incident(**payload.model_dump(exclude={"timestamp"}),timestamp=payload.timestamp or datetime.utcnow()); return IncidentAgent(db).analyze_incident(i)
@router.get("/dashboard/summary")
def dashboard(db:Session=Depends(get_db)):
    incidents=db.scalars(select(Incident)).all(); memories=db.scalars(select(Memory)).all()
    return {"active_incidents":sum(i.status!="resolved" for i in incidents),"resolved_incidents":sum(i.status=="resolved" for i in incidents),"critical_incidents":sum(i.severity.lower()=="critical" for i in incidents),"memory_count":len(memories),"similar_incidents_found":sum(bool(i.analysis and json.loads(i.analysis).get("memory_influenced")) for i in incidents),"avg_resolution_minutes":42,"recent_incidents":[incident_out(i) for i in sorted(incidents,key=lambda x:x.created_at,reverse=True)[:6]],"severity_distribution":{s:sum(i.severity.lower()==s for i in incidents) for s in ["critical","high","medium","low"]}}
@router.post("/demo/reset")
def demo_reset():
    if HINDSIGHT_MODE != "mock": raise HTTPException(403,"Demo reset is available only in HINDSIGHT_MODE=mock.")
    seed(reset=True)
    return {"message":"Demo state restored.","mode":"mock"}
