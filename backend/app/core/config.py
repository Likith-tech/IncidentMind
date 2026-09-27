import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'incidentmind.db'}")
HINDSIGHT_MODE = os.getenv("HINDSIGHT_MODE", "mock").lower()
HINDSIGHT_API_URL = os.getenv("HINDSIGHT_API_URL", "")
HINDSIGHT_API_KEY = os.getenv("HINDSIGHT_API_KEY", "")
HINDSIGHT_BANK_ID = os.getenv("HINDSIGHT_BANK_ID", "")
LLM_MODE = os.getenv("LLM_MODE", "mock").lower()
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "groq").lower()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "")
APP_ENV = os.getenv("APP_ENV", "development")
