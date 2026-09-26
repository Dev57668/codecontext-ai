"""
Repository module: persist and retrieve code analysis results from disk (data/).
"""

import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.models import RepositoryEntry, AnalysisResult


DATA_DIR = Path(__file__).parent.parent / "data"


def _ensure_data_dir() -> None:
    """Create the data/ directory if it doesn't exist."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def _entry_path(session_id: str) -> Path:
    """Return the file path for a given session."""
    return DATA_DIR / f"{session_id}.json"


def generate_session_id() -> str:
    """Generate a unique session ID."""
    return str(uuid.uuid4())


def save_entry(entry: RepositoryEntry) -> bool:
    """
    Persist an analysis entry to disk as a JSON file.
    Returns True on success, False on failure.
    """
    _ensure_data_dir()
    try:
        path = _entry_path(entry.session_id)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(entry.model_dump(mode="json"), f, indent=2, default=str)
        return True
    except Exception as e:
        print(f"[Repository] Failed to save entry {entry.session_id}: {e}")
        return False


def load_entry(session_id: str) -> Optional[RepositoryEntry]:
    """
    Load a persisted analysis entry by session ID.
    Returns None if not found.
    """
    path = _entry_path(session_id)
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return RepositoryEntry(**data)
    except Exception as e:
        print(f"[Repository] Failed to load entry {session_id}: {e}")
        return None


def load_all_entries(limit: int = 50) -> list[RepositoryEntry]:
    """
    Load all persisted analysis entries, sorted by most recent first.
    Capped at `limit` entries.
    """
    _ensure_data_dir()
    entries: list[RepositoryEntry] = []

    json_files = sorted(
        DATA_DIR.glob("*.json"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )[:limit]

    for path in json_files:
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            entries.append(RepositoryEntry(**data))
        except Exception as e:
            print(f"[Repository] Skipping corrupt file {path.name}: {e}")

    return entries


def delete_entry(session_id: str) -> bool:
    """Delete a persisted entry. Returns True if deleted, False if not found."""
    path = _entry_path(session_id)
    if not path.exists():
        return False
    try:
        os.remove(path)
        return True
    except Exception as e:
        print(f"[Repository] Failed to delete entry {session_id}: {e}")
        return False


def entry_exists(session_id: str) -> bool:
    """Check if a session entry exists on disk."""
    return _entry_path(session_id).exists()
