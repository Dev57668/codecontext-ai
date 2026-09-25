"""
CodeContext AI - Main FastAPI Application
IBM BOB 2.0 Hackathon Project

An intelligent codebase intelligence platform for distributed software teams.
"""
import os
import sys

# Add the project root to sys.path so imports work correctly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.database.connection import init_db
from backend.api.repository import router as repository_router
from backend.api.architecture import router as architecture_router
from backend.api.guardrails import router as guardrails_router
from backend.api.pr_intelligence import router as pr_router
from backend.api.decisions import router as decisions_router
from backend.api.onboarding import router as onboarding_router
from backend.api.health import router as health_router

# ─── App Initialization ──────────────────────────────────────────────────────

import sys
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    init_db()
    print("[OK] CodeContext AI backend started")
    print("[Docs] API Docs: http://localhost:8000/api/docs")
    yield

app = FastAPI(
    title="CodeContext AI",
    description=(
        "Intelligent codebase intelligence platform for distributed software teams. "
        "Analyzes repositories to create persistent engineering context."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ─── CORS ────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────

app.include_router(repository_router)
app.include_router(architecture_router)
app.include_router(guardrails_router)
app.include_router(pr_router, prefix="/api/pr")
app.include_router(pr_router, prefix="/api/pr-intelligence")
app.include_router(decisions_router)
app.include_router(onboarding_router)
app.include_router(health_router)


# ─── Root ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "name": "CodeContext AI",
        "version": "1.0.0",
        "status": "running",
        "docs": "/api/docs",
        "description": "Codebase intelligence platform for distributed software teams",
    }


@app.get("/api/ping")
@app.get("/api/status")
def ping():
    """Health check endpoint."""
    return {"status": "ok", "service": "CodeContext AI"}


# ─── Error Handlers ──────────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
    )


# ─── Entry Point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
