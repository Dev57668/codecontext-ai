"""
Pydantic models for CodeContext AI request/response schemas.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, UTC


# ─── Request Models ────────────────────────────────────────────────────────────

class CodeQuery(BaseModel):
    """Incoming request to analyze a code snippet."""
    code: str = Field(..., description="The source code to analyze", min_length=1)
    prompt: str = Field(..., description="The question or instruction for the AI", min_length=1)
    language: Optional[str] = Field(None, description="Programming language (auto-detected if omitted)")
    session_id: Optional[str] = Field(None, description="Optional session ID for conversation continuity")

    model_config = {
        "json_schema_extra": {
            "example": {
                "code": "def add(a, b):\n    return a + b",
                "prompt": "Explain this function and suggest improvements.",
                "language": "python",
                "session_id": None,
            }
        }
    }


# ─── Response Models ────────────────────────────────────────────────────────────

class AnalysisResult(BaseModel):
    """Structured result from a code analysis."""
    summary: str = Field(..., description="One-line summary of what the code does")
    analysis: str = Field(..., description="Detailed analysis from Gemini AI")
    suggestions: list[str] = Field(default_factory=list, description="Improvement suggestions")
    detected_language: Optional[str] = Field(None, description="Detected or confirmed programming language")
    session_id: str = Field(..., description="Session ID for this analysis")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC), description="UTC timestamp of analysis")


class AnalysisResponse(BaseModel):
    """Top-level API response envelope."""
    success: bool = True
    data: AnalysisResult
    code_length: int = Field(..., description="Character count of the submitted code")


class ErrorResponse(BaseModel):
    """Error response envelope."""
    success: bool = False
    error: str
    detail: Optional[str] = None


# ─── Repository Models ──────────────────────────────────────────────────────────

class RepositoryEntry(BaseModel):
    """A persisted analysis record stored in data/."""
    session_id: str
    language: Optional[str]
    code_snippet: str
    prompt: str
    result: AnalysisResult
    saved_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class HistoryResponse(BaseModel):
    """Response for listing past analyses."""
    success: bool = True
    total: int
    entries: list[RepositoryEntry]


# ─── Health Models ──────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    api_key_configured: bool
    version: str = "2.0.0"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
