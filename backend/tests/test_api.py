import os
os.environ["DATABASE_URL"]="sqlite:///./test_incidentmind.db"
from fastapi.testclient import TestClient
from app.main import app
client=TestClient(app)
def test_health(): assert client.get('/api/health').json()['status']=='ok'
def test_incident_lifecycle():
 payload={"title":"Payment API returns 503","service":"Payment Service","severity":"critical","error_logs":"Redis connection pool exhausted"}
 created=client.post('/api/incidents',json=payload); assert created.status_code==201
 incident_id=created.json()['id']
 assert client.get(f'/api/incidents/{incident_id}').status_code==200
 analysis=client.post(f'/api/incidents/{incident_id}/analyze'); assert analysis.status_code==200 and 'likely_root_cause' in analysis.json()
 resolved=client.post(f'/api/incidents/{incident_id}/resolve',json={"actual_root_cause":"Redis connection pool exhaustion","resolution_applied":"Increased pool 20 to 50"}); assert resolved.status_code==200
 assert client.get('/api/memory').status_code==200
def test_memory_search_stats_and_demo_reset():
 assert client.get('/api/memory/stats').status_code==200
 assert client.post('/api/memory/search',json={"query":"Redis connection pool"}).status_code==200
 reset=client.post('/api/demo/reset')
 assert reset.status_code==200 and reset.json()['mode']=='mock'
