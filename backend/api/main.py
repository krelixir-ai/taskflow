"""
TaskFlow - FastAPI Application Entrypoint
"""
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from api.tasks import router as tasks_router

app = FastAPI(
    title="TaskFlow API",
    description="A modern task management API built with FastAPI and Firestore",
    version="1.0.6",  # BUMPED VERSION to reflect removal of authentication
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(tasks_router)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "taskflow-api",
        "project": settings.PROJECT_ID,
    }

# API Version Endpoint
@app.get("/api/version")
async def api_version():
    """Returns the current API version."""
    return {"version": app.version}

# Admin Redeploy Endpoint
@app.post("/api/admin/redeploy", status_code=status.HTTP_202_ACCEPTED)
async def redeploy_application():
    """
    Triggers a simulated application redeployment.
    In a real-world scenario, this would interact with a deployment system (e.g., Cloud Run Admin API, CI/CD).
    For this exercise, it's a placeholder to demonstrate the API and UI integration.
    """
    print("ADMIN: Redeployment request received (simulated).")
    return {"message": "Application redeployment initiated (simulated)."}
