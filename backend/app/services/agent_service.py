import json
from app.services.hindsight_service import HindsightService
from app.services.llm_service import LLMService

class IncidentAgent:
    def __init__(self, db): self.memory = HindsightService(db)
    def analyze_incident(self, incident):
        corpus = f"{incident.title} {incident.error_logs} {incident.symptoms}".lower()
        patterns = [("redis", "Redis connection pool exhaustion", ["Check active Redis connections and pool saturation.", "Confirm latency and connection errors.", "Increase the pool only after confirming saturation."]), ("jwt", "JWT expiration or token validation configuration", ["Check token expiry and clock skew.", "Validate refresh-token flow and signing key rotation."]), ("kafka", "Kafka consumer lag or unhealthy consumer group", ["Inspect consumer lag and partition assignment.", "Scale consumers after checking downstream dependencies."]), ("database", "Database connection pool saturation", ["Inspect active database connections.", "Check slow queries before increasing pool limits."]), ("timeout", "Upstream dependency or API gateway timeout", ["Inspect upstream latency and error rate.", "Validate timeout and retry settings."])]
        cause, actions = "Application dependency degradation", ["Inspect service metrics and recent deploys.", "Check dependency health and error-rate changes.", "Mitigate only after engineer verification."]
        for needle, matched, recommended in patterns:
            if needle in corpus: cause, actions = matched, recommended; break
        memories = self.memory.search_similar_incidents(corpus, incident.service)
        influenced = bool(memories)
        if memories and memories[0].resolution:
            actions.insert(0, f"Past successful resolution: {memories[0].resolution}")
        result = {"summary": f"{incident.severity.title()} incident affecting {incident.service} in {incident.environment}.", "likely_root_cause": cause, "confidence": 87 if influenced else 64, "severity_assessment": incident.severity.title(), "relevant_past_incidents": [{"memory_id": m.id, "summary": m.summary, "root_cause": m.root_cause, "resolution": m.resolution} for m in memories], "recommended_actions": actions, "relevant_runbook": "Validate production signals, mitigate safely, then document the outcome.", "why_this_recommendation": "A matching historical resolution influenced this recommendation." if influenced else "Based on the observed error pattern; no closely matching memory was found.", "potential_risks": ["Do not change production configuration without confirming the bottleneck.", "Validate rollback and capacity impact before scaling."], "next_steps": ["Engineer verifies the evidence.", "Record the actual outcome to improve future response."], "memory_influenced": influenced, "memory_count":len(memories), "memory_impact":"high" if influenced else "none", "hindsight_mode": self.memory.mode}
        result = LLMService().analyze(incident, result["relevant_past_incidents"], result)
        incident.analysis = json.dumps(result); self.memory.db.commit(); return result
