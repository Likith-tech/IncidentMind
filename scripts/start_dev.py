"""Run `uvicorn app.main:app --reload` from backend and `npm run dev` from frontend in separate terminals."""
print("Backend: cd backend; py -3 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8010\nFrontend: copy .env.example .env; npm install; npm run dev")
