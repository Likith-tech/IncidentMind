from datetime import datetime
from pydantic import BaseModel, Field

class IncidentCreate(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    service: str
    severity: str = "medium"
    environment: str = "production"
    timestamp: datetime | None = None
    error_logs: str = ""
    symptoms: str = ""
    context: str = ""
class ResolveIncident(BaseModel):
    actual_root_cause: str
    resolution_applied: str
    actions_taken: str = ""
    recommendation_correct: bool = False
    notes: str = ""
