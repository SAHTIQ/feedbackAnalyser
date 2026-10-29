from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.init_db import init_db

# API Routers
from app.api.auth import router as auth_router
from app.api.branches import router as branches_router
from app.api.staff import router as staff_router
from app.api.feedback import router as feedback_router
from app.api.tasks import router as tasks_router
from app.api.notifications import router as notifications_router
from app.api.audit_logs import router as audit_logs_router
from app.api.metrics import router as metrics_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize and seed database tables on startup
    init_db()
    yield


app = FastAPI(
    title="FeedbackIQ API",
    description="Enterprise AI Feedback Analysis and Closed-Loop Corrective Action Platform",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router)
app.include_router(branches_router)
app.include_router(staff_router)
app.include_router(feedback_router)
app.include_router(tasks_router)
app.include_router(notifications_router)
app.include_router(audit_logs_router)
app.include_router(metrics_router)


@app.get("/api/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "env": settings.APP_ENV,
        "llm_provider": settings.LLM_PROVIDER,
        "llm_model": settings.LLM_MODEL,
        "database": "sqlite_connected" if "sqlite" in settings.DATABASE_URL else "postgres_connected",
        "version": "2.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
