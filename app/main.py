"""
CodeContext AI — FastAPI application entry point.
"""

import os
from datetime import datetime, UTC

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from app import analyzer, repository
from app.models import (
    AnalysisResponse,
    CodeQuery,
    ErrorResponse,
    HealthResponse,
    HistoryResponse,
    RepositoryEntry,
)

load_dotenv()

# ─── App Setup ──────────────────────────────────────────────────────────────────

app = FastAPI(
    title="CodeContext AI",
    description=(
        "AI-powered code analysis API using Google Gemini. "
        "Submit any code snippet with a question and get a detailed analysis."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Routes ─────────────────────────────────────────────────────────────────────

@app.get(
    "/",
    summary="Root health check",
    tags=["Health"],
)
def read_root():
    """Quick liveness check — confirms the API is running."""
    return {"status": "CodeContext AI API is running", "version": "2.0.0"}


@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Detailed health check",
    tags=["Health"],
)
def health_check():
    """Returns API status and whether the Gemini API key is configured."""
    return HealthResponse(
        status="ok",
        api_key_configured=analyzer.is_api_key_configured(),
        timestamp=datetime.now(UTC),
    )


@app.post(
    "/analyze",
    response_model=AnalysisResponse,
    responses={
        400: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
    summary="Analyze a code snippet",
    tags=["Analysis"],
)
def analyze_code(query: CodeQuery):
    """
    Submit a code snippet with a question or instruction.
    Returns a structured AI analysis with summary, detailed explanation, and suggestions.
    """
    if not query.code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code field must not be empty.",
        )

    if not query.prompt.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Prompt field must not be empty.",
        )

    try:
        result, session_id = analyzer.analyze_code(
            code=query.code,
            prompt=query.prompt,
            language=query.language,
            session_id=query.session_id,
        )
    except EnvironmentError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )

    # Persist the result to disk
    entry = RepositoryEntry(
        session_id=session_id,
        language=result.detected_language,
        code_snippet=query.code[:500],  # Store first 500 chars only
        prompt=query.prompt,
        result=result,
    )
    repository.save_entry(entry)

    return AnalysisResponse(
        success=True,
        data=result,
        code_length=len(query.code),
    )


@app.get(
    "/history",
    response_model=HistoryResponse,
    summary="List past analyses",
    tags=["History"],
)
def get_history(limit: int = 20):
    """Return the most recent code analyses (default: last 20)."""
    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit must be between 1 and 100.",
        )
    entries = repository.load_all_entries(limit=limit)
    return HistoryResponse(total=len(entries), entries=entries)


@app.get(
    "/history/{session_id}",
    response_model=RepositoryEntry,
    summary="Get a specific analysis by session ID",
    tags=["History"],
)
def get_entry(session_id: str):
    """Retrieve a specific analysis by its session ID."""
    entry = repository.load_entry(session_id)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No analysis found for session ID: {session_id}",
        )
    return entry


@app.delete(
    "/history/{session_id}",
    summary="Delete an analysis by session ID",
    tags=["History"],
)
def delete_entry(session_id: str):
    """Delete a stored analysis by its session ID."""
    deleted = repository.delete_entry(session_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No analysis found for session ID: {session_id}",
        )
    return {"success": True, "message": f"Session {session_id} deleted."}