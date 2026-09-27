from datetime import datetime, timedelta
from app.db.database import Base, SessionLocal, engine
from app.models.incident import Incident
from app.models.memory import Memory
from app.services.hindsight_service import HindsightService

SEEDS=[
("Payment API 503 errors","Payment Service","critical","Redis connection pool exhausted","Increased Redis pool size from 20 to 50 and restarted payment workers."),("Checkout failing intermittently","Payment Service","high","Database connection pool saturation","Optimized slow query and raised pool threshold."),("Users rejected after login","Authentication Service","high","JWT expiration configuration mismatch","Aligned token expiry and refresh-token configuration."),("Order events delayed","Order Service","medium","Kafka consumer lag","Scaled consumer group after resolving downstream database latency."),("Notification delivery backlog","Notification Service","medium","Kafka consumer lag","Added consumers and cleared poison messages."),("Payment gateway timeouts","Payment Service","critical","API gateway timeout","Adjusted upstream timeout after validating gateway latency."),("Authentication CPU spike","Authentication Service","high","Inefficient token validation loop","Rolled back release and fixed caching."),("User profile API slow","User Service","medium","Database connection pool saturation","Added missing database index."),("Payment API 503 recurring","Payment Service","critical","Redis connection pool exhausted","Increased Redis pool size from 20 to 50 and monitored saturation."),("Order creation errors","Order Service","high","Database connection pool saturation","Tuned pool and optimized lock contention."),("Push notifications delayed","Notification Service","low","Third-party API gateway timeout","Enabled safe retry backoff."),("Login refresh failures","Authentication Service","medium","JWT expiration configuration mismatch","Updated refresh token rotation policy."),("Payment worker memory growth","Payment Service","high","Memory leak in worker batch handling","Deployed memory-safe worker release."),("User import degraded","User Service","low","High CPU usage","Rate-limited import job and scaled worker."),("Order status lag","Order Service","medium","Kafka consumer lag","Rebalanced partitions and scaled consumers."),("Redis saturation warning","Payment Service","high","Redis connection pool exhausted","Raised Redis pool from 20 to 50."),("Email queue backlog","Notification Service","medium","Kafka consumer lag","Cleared failing messages and added consumers."),("Login 401 increase","Authentication Service","high","JWT expiration configuration mismatch","Corrected issuer configuration."),("Payment checkout slow","Payment Service","medium","API gateway timeout","Validated upstream and adjusted timeout."),("User API database errors","User Service","high","Database connection pool saturation","Fixed slow query and connection leak.")]
def seed(reset=False):
 Base.metadata.create_all(bind=engine); db=SessionLocal()
 if reset:
  db.query(Memory).delete()
  db.query(Incident).delete(); db.commit()
 if db.query(Incident).count(): db.close(); return
 for n,(title,service,severity,cause,resolution) in enumerate(SEEDS):
  incident=Incident(title=title,service=service,severity=severity,environment="production",error_logs=cause,symptoms="Production degradation",status="resolved",root_cause=cause,resolution=resolution,created_at=datetime.utcnow()-timedelta(days=n+1),resolved_at=datetime.utcnow()-timedelta(days=n+1)+timedelta(minutes=42))
  db.add(incident); db.commit(); db.refresh(incident)
  if n<10: HindsightService(db).store_incident_resolution(incident,cause,resolution,"Verified by on-call engineer.")
 db.close()
if __name__=="__main__": seed()
