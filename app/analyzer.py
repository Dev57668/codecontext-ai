"""
Analyzer module: orchestrates Gemini AI calls for code analysis.
"""

import os
from datetime import datetime, UTC
from typing import Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types

from app.knowledge import (
    build_system_prompt,
    build_user_prompt,
    detect_language,
    parse_gemini_response,
    truncate_code,
)
from app.models import AnalysisResult
from app import repository

# Load environment variables from .env
load_dotenv()

# ─── Gemini Client ──────────────────────────────────────────────────────────────

_client: Optional[genai.Client] = None
GEMINI_MODEL = "gemini-2.0-flash"


def _get_client() -> genai.Client:
    """Lazily initialize and return the Gemini client."""
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "GEMINI_API_KEY is not set. "
                "Please create a .env file with GEMINI_API_KEY=your_key."
            )
        _client = genai.Client(api_key=api_key)
    return _client


def is_api_key_configured() -> bool:
    """Return True if the Gemini API key is available in the environment."""
    load_dotenv()
    return bool(os.getenv("GEMINI_API_KEY"))


# ─── Core Analysis Function ─────────────────────────────────────────────────────

def analyze_code(
    code: str,
    prompt: str,
    language: Optional[str] = None,
    session_id: Optional[str] = None,
) -> AnalysisResult:
    """
    Analyze a code snippet using Gemini AI.

    Args:
        code:       Source code to analyze.
        prompt:     Developer question or instruction.
        language:   Optional programming language override.
        session_id: Optional session ID (generated if not provided).

    Returns:
        AnalysisResult with summary, analysis, and suggestions.

    Raises:
        EnvironmentError: If GEMINI_API_KEY is not configured.
        RuntimeError:     If the Gemini API call fails.
    """
    client = _get_client()

    # Generate session ID if not provided
    if not session_id:
        session_id = repository.generate_session_id()

    # Language detection
    detected_lang = language or detect_language(code)

    # Code truncation for large inputs
    safe_code, was_truncated = truncate_code(code)

    # Build prompts
    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(
        code=safe_code,
        prompt=prompt,
        language=detected_lang,
        was_truncated=was_truncated,
    )

    # Call Gemini
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.3,
                max_output_tokens=2048,
            ),
        )
        raw_text = response.text or ""
    except Exception as e:
        raise RuntimeError(f"Gemini API call failed: {e}") from e

    # Parse the structured response
    parsed = parse_gemini_response(raw_text)

    result = AnalysisResult(
        summary=parsed["summary"],
        analysis=parsed["analysis"],
        suggestions=parsed["suggestions"],
        detected_language=detected_lang,
        session_id=session_id,
        timestamp=datetime.now(UTC),
    )

    return result, session_id
