"""Provider boundary for safe, structured incident reasoning."""
import json
import httpx
from app.core.config import GROQ_API_KEY, LLM_MODE, LLM_MODEL

class LLMConfigurationError(RuntimeError): pass

class LLMService:
    def analyze(self, incident, memories, fallback):
        if LLM_MODE == "mock": return fallback
        if LLM_MODE != "groq": raise LLMConfigurationError(f"Unsupported LLM_MODE '{LLM_MODE}'. Use mock or groq.")
        if not GROQ_API_KEY or not LLM_MODEL:
            raise LLMConfigurationError("LLM_MODE=groq requires GROQ_API_KEY and LLM_MODEL.")
        payload = {"incident":{"title":incident.title,"service":incident.service,"severity":incident.severity,"environment":incident.environment,"logs":incident.error_logs,"symptoms":incident.symptoms},"historical_memories":memories,"required_fields":list(fallback)}
        response=httpx.post("https://api.groq.com/openai/v1/chat/completions",headers={"Authorization":f"Bearer {GROQ_API_KEY}"},json={"model":LLM_MODEL,"temperature":0.1,"response_format":{"type":"json_object"},"messages":[{"role":"system","content":"Return safe structured JSON incident analysis only. Recommendations require engineer verification."},{"role":"user","content":json.dumps(payload)}]},timeout=25)
        response.raise_for_status()
        parsed=json.loads(response.json()["choices"][0]["message"]["content"])
        return {**fallback,**{key:value for key,value in parsed.items() if key in fallback}}
