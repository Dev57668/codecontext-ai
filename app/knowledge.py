"""
Knowledge module: language detection, code context building, and prompt engineering.
"""

import re
from typing import Optional


# ─── Language Detection ─────────────────────────────────────────────────────────

LANGUAGE_SIGNATURES: dict[str, list[str]] = {
    "python": [
        r"^\s*def ", r"^\s*class ", r"import ", r"from .+ import",
        r"if __name__\s*==\s*['\"]__main__['\"]", r"print\(", r"#.*python",
    ],
    "javascript": [
        r"const |let |var ", r"function\s+\w+\s*\(", r"=>\s*{",
        r"console\.log\(", r"require\(", r"module\.exports",
        r"document\.", r"window\.",
    ],
    "typescript": [
        r":\s*string", r":\s*number", r":\s*boolean", r"interface \w+",
        r"type \w+ =", r"<T>", r"as \w+",
    ],
    "java": [
        r"public class ", r"private |protected |public ", r"System\.out\.println",
        r"import java\.", r"@Override", r"throws \w+",
    ],
    "c++": [
        r"#include\s*<", r"std::", r"cout\s*<<", r"cin\s*>>",
        r"int main\(", r"namespace ",
    ],
    "c": [
        r"#include\s*<stdio\.h>", r"printf\(", r"scanf\(", r"int main\(",
        r"malloc\(", r"free\(",
    ],
    "go": [
        r"^package ", r"func \w+\(", r"fmt\.Println", r"import \(",
        r":= ", r"goroutine",
    ],
    "rust": [
        r"fn \w+\(", r"let mut ", r"println!\(", r"use std::",
        r"impl ", r"-> \w+",
    ],
    "sql": [
        r"(?i)SELECT .+FROM ", r"(?i)INSERT INTO ", r"(?i)UPDATE .+SET ",
        r"(?i)CREATE TABLE", r"(?i)DROP TABLE", r"(?i)WHERE ",
    ],
    "html": [
        r"<!DOCTYPE", r"<html", r"<head>", r"<body>", r"<div", r"</\w+>",
    ],
    "css": [
        r"{\s*[\w-]+\s*:", r"@media", r"\.[\w-]+\s*{", r"#[\w-]+\s*{",
    ],
    "bash": [
        r"#!/bin/bash", r"#!/bin/sh", r"\$\{?\w+\}?", r"echo ", r"grep ",
        r"chmod ", r"sudo ",
    ],
}

MAX_CODE_CHARS = 8000  # Safety limit before truncation


def detect_language(code: str) -> Optional[str]:
    """
    Detect the programming language of a code snippet using regex signatures.
    Returns the best match language name, or None if undetected.
    """
    scores: dict[str, int] = {}
    for lang, patterns in LANGUAGE_SIGNATURES.items():
        score = sum(1 for p in patterns if re.search(p, code, re.MULTILINE))
        if score > 0:
            scores[lang] = score

    if not scores:
        return None
    return max(scores, key=lambda k: scores[k])


def truncate_code(code: str, max_chars: int = MAX_CODE_CHARS) -> tuple[str, bool]:
    """
    Truncate code to a safe length for the API.
    Returns (truncated_code, was_truncated).
    """
    if len(code) <= max_chars:
        return code, False
    truncated = code[:max_chars]
    # Try to cut at a newline boundary
    last_newline = truncated.rfind("\n")
    if last_newline > max_chars // 2:
        truncated = truncated[:last_newline]
    return truncated + "\n\n[... code truncated for context window ...]", True


def count_lines(code: str) -> int:
    """Count the number of lines in a code snippet."""
    return code.count("\n") + 1


def build_system_prompt() -> str:
    """Return the system-level instruction for Gemini."""
    return (
        "You are CodeContext AI, an expert code analyst and software engineering assistant. "
        "Your role is to deeply analyze code submitted by developers and provide:\n"
        "1. A concise one-line summary of what the code does.\n"
        "2. A detailed analysis covering logic, patterns, and potential issues.\n"
        "3. Concrete, actionable improvement suggestions.\n\n"
        "Always be precise, technical, and helpful. "
        "Respond in structured plain text with clear sections. "
        "Do not use markdown formatting in your response."
    )


def build_user_prompt(
    code: str,
    prompt: str,
    language: Optional[str],
    was_truncated: bool = False,
) -> str:
    """
    Build the full user-facing prompt to send to Gemini.
    """
    lang_label = language.upper() if language else "UNKNOWN"
    line_count = count_lines(code)
    truncation_note = "\n[NOTE: Code was truncated due to length.]\n" if was_truncated else ""

    return (
        f"LANGUAGE: {lang_label}\n"
        f"LINES: {line_count}\n"
        f"{truncation_note}\n"
        f"CODE:\n```\n{code}\n```\n\n"
        f"DEVELOPER QUESTION / INSTRUCTION:\n{prompt}\n\n"
        f"Please respond with the following sections:\n"
        f"SUMMARY: (one sentence)\n"
        f"ANALYSIS: (detailed explanation)\n"
        f"SUGGESTIONS: (numbered list of improvements, or 'None' if the code is already good)\n"
    )


def parse_gemini_response(raw: str) -> dict:
    """
    Parse the structured Gemini response into summary, analysis, and suggestions.
    """
    summary = ""
    analysis = ""
    suggestions: list[str] = []

    # Extract SUMMARY
    summary_match = re.search(r"SUMMARY\s*:\s*(.+?)(?=ANALYSIS\s*:|$)", raw, re.DOTALL | re.IGNORECASE)
    if summary_match:
        summary = summary_match.group(1).strip()

    # Extract ANALYSIS
    analysis_match = re.search(r"ANALYSIS\s*:\s*(.+?)(?=SUGGESTIONS\s*:|$)", raw, re.DOTALL | re.IGNORECASE)
    if analysis_match:
        analysis = analysis_match.group(1).strip()

    # Extract SUGGESTIONS (numbered list)
    suggestions_match = re.search(r"SUGGESTIONS\s*:\s*(.+)$", raw, re.DOTALL | re.IGNORECASE)
    if suggestions_match:
        suggestions_raw = suggestions_match.group(1).strip()
        if suggestions_raw.lower() not in ("none", "none.", "n/a"):
            # Split on numbered list items: "1.", "2.", etc.
            items = re.split(r"\n\s*\d+[\.\)]\s+", "\n" + suggestions_raw)
            suggestions = [s.strip() for s in items if s.strip()]

    # Fallback: if parsing failed, put everything in analysis
    if not summary and not analysis:
        analysis = raw.strip()
        summary = raw.strip()[:120] + ("..." if len(raw) > 120 else "")

    return {
        "summary": summary or "Analysis complete.",
        "analysis": analysis or raw.strip(),
        "suggestions": suggestions,
    }
