"""
Test suite for IBM BOB 2.0 / CodeContext AI.

Covers:
  - models.py     — Pydantic validation
  - knowledge.py  — language detection, prompt building, response parsing
  - repository.py — disk persistence (temp dir)
  - main.py       — FastAPI endpoints (mocked Gemini calls)
"""

import json
import uuid
from datetime import datetime, UTC
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


# ────────────────────────────────────────────────────────────────────────────────
# Fixtures
# ────────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def client(tmp_path, monkeypatch):
    """FastAPI test client with mocked analyzer and temp data dir."""
    monkeypatch.setenv("GEMINI_API_KEY", "test-key-123")

    # Redirect repository DATA_DIR to a temporary directory
    import app.repository as repo_module
    monkeypatch.setattr(repo_module, "DATA_DIR", tmp_path)

    from app.main import app
    return TestClient(app)


@pytest.fixture
def sample_code():
    return "def add(a, b):\n    return a + b\n"


@pytest.fixture
def sample_result():
    from app.models import AnalysisResult
    return AnalysisResult(
        summary="A function that adds two numbers.",
        analysis="This is a simple addition function.",
        suggestions=["Add type hints.", "Add docstring."],
        detected_language="python",
        session_id=str(uuid.uuid4()),
        timestamp=datetime.utcnow(),
    )


# ────────────────────────────────────────────────────────────────────────────────
# 1. Models Tests
# ────────────────────────────────────────────────────────────────────────────────

class TestModels:
    def test_code_query_valid(self):
        from app.models import CodeQuery
        q = CodeQuery(code="print('hi')", prompt="What does this do?")
        assert q.code == "print('hi')"
        assert q.prompt == "What does this do?"
        assert q.language is None
        assert q.session_id is None

    def test_code_query_with_language(self):
        from app.models import CodeQuery
        q = CodeQuery(code="console.log('hi')", prompt="Explain.", language="javascript")
        assert q.language == "javascript"

    def test_analysis_result_defaults(self, sample_result):
        assert isinstance(sample_result.timestamp, datetime)
        assert isinstance(sample_result.suggestions, list)

    def test_analysis_response_structure(self, sample_result):
        from app.models import AnalysisResponse
        resp = AnalysisResponse(data=sample_result, code_length=42)
        assert resp.success is True
        assert resp.code_length == 42

    def test_health_response(self):
        from app.models import HealthResponse
        h = HealthResponse(status="ok", api_key_configured=True)
        assert h.version == "2.0.0"
        assert h.api_key_configured is True

    def test_repository_entry(self, sample_result):
        from app.models import RepositoryEntry
        entry = RepositoryEntry(
            session_id=sample_result.session_id,
            language="python",
            code_snippet="def add(a, b): return a + b",
            prompt="Explain this.",
            result=sample_result,
        )
        assert entry.session_id == sample_result.session_id

    def test_history_response(self, sample_result):
        from app.models import HistoryResponse, RepositoryEntry
        entry = RepositoryEntry(
            session_id=sample_result.session_id,
            language="python",
            code_snippet="x = 1",
            prompt="Explain.",
            result=sample_result,
        )
        hist = HistoryResponse(total=1, entries=[entry])
        assert hist.total == 1
        assert len(hist.entries) == 1


# ────────────────────────────────────────────────────────────────────────────────
# 2. Knowledge Tests
# ────────────────────────────────────────────────────────────────────────────────

class TestKnowledge:
    def test_detect_python(self):
        from app.knowledge import detect_language
        code = "def foo():\n    return 42\n\nimport os"
        assert detect_language(code) == "python"

    def test_detect_javascript(self):
        from app.knowledge import detect_language
        code = "const x = 5;\nfunction greet() { console.log('hi'); }"
        assert detect_language(code) == "javascript"

    def test_detect_sql(self):
        from app.knowledge import detect_language
        code = "SELECT id, name FROM users WHERE active = 1;"
        assert detect_language(code) == "sql"

    def test_detect_unknown(self):
        from app.knowledge import detect_language
        assert detect_language("hello world") is None

    def test_truncate_no_truncation(self):
        from app.knowledge import truncate_code
        code = "x = 1\n" * 10
        result, truncated = truncate_code(code, max_chars=9999)
        assert not truncated
        assert result == code

    def test_truncate_applies(self):
        from app.knowledge import truncate_code
        code = "x = 1\n" * 5000
        result, truncated = truncate_code(code, max_chars=100)
        assert truncated
        assert len(result) < len(code)
        assert "truncated" in result

    def test_count_lines(self):
        from app.knowledge import count_lines
        assert count_lines("a\nb\nc") == 3
        assert count_lines("single line") == 1

    def test_build_system_prompt(self):
        from app.knowledge import build_system_prompt
        sp = build_system_prompt()
        assert "CodeContext AI" in sp
        assert len(sp) > 50

    def test_build_user_prompt_contains_code(self, sample_code):
        from app.knowledge import build_user_prompt
        prompt = build_user_prompt(sample_code, "Explain this.", "python")
        assert sample_code in prompt
        assert "LANGUAGE: PYTHON" in prompt
        assert "SUMMARY:" in prompt

    def test_parse_gemini_response_structured(self):
        from app.knowledge import parse_gemini_response
        raw = (
            "SUMMARY: Adds two numbers.\n"
            "ANALYSIS: This function takes a and b and returns their sum.\n"
            "SUGGESTIONS:\n1. Add type hints.\n2. Add a docstring."
        )
        parsed = parse_gemini_response(raw)
        assert "Adds two numbers" in parsed["summary"]
        assert "sum" in parsed["analysis"]
        assert len(parsed["suggestions"]) == 2

    def test_parse_gemini_response_fallback(self):
        from app.knowledge import parse_gemini_response
        raw = "This code does stuff."
        parsed = parse_gemini_response(raw)
        assert parsed["analysis"] == raw
        assert isinstance(parsed["suggestions"], list)

    def test_parse_gemini_no_suggestions(self):
        from app.knowledge import parse_gemini_response
        raw = "SUMMARY: Foo.\nANALYSIS: Bar.\nSUGGESTIONS: None"
        parsed = parse_gemini_response(raw)
        assert parsed["suggestions"] == []


# ────────────────────────────────────────────────────────────────────────────────
# 3. Repository Tests
# ────────────────────────────────────────────────────────────────────────────────

class TestRepository:
    def test_generate_session_id(self):
        from app.repository import generate_session_id
        sid1 = generate_session_id()
        sid2 = generate_session_id()
        assert sid1 != sid2
        assert len(sid1) == 36  # UUID4 format

    def test_save_and_load_entry(self, tmp_path, monkeypatch, sample_result):
        import app.repository as repo
        monkeypatch.setattr(repo, "DATA_DIR", tmp_path)

        from app.models import RepositoryEntry
        entry = RepositoryEntry(
            session_id=sample_result.session_id,
            language="python",
            code_snippet="def add(a, b): return a + b",
            prompt="Explain this.",
            result=sample_result,
        )
        assert repo.save_entry(entry) is True

        loaded = repo.load_entry(sample_result.session_id)
        assert loaded is not None
        assert loaded.session_id == sample_result.session_id
        assert loaded.language == "python"

    def test_load_nonexistent_entry(self, tmp_path, monkeypatch):
        import app.repository as repo
        monkeypatch.setattr(repo, "DATA_DIR", tmp_path)
        assert repo.load_entry("nonexistent-id") is None

    def test_entry_exists(self, tmp_path, monkeypatch, sample_result):
        import app.repository as repo
        monkeypatch.setattr(repo, "DATA_DIR", tmp_path)

        from app.models import RepositoryEntry
        entry = RepositoryEntry(
            session_id=sample_result.session_id,
            language="python",
            code_snippet="x = 1",
            prompt="Explain.",
            result=sample_result,
        )
        assert not repo.entry_exists(sample_result.session_id)
        repo.save_entry(entry)
        assert repo.entry_exists(sample_result.session_id)

    def test_delete_entry(self, tmp_path, monkeypatch, sample_result):
        import app.repository as repo
        monkeypatch.setattr(repo, "DATA_DIR", tmp_path)

        from app.models import RepositoryEntry
        entry = RepositoryEntry(
            session_id=sample_result.session_id,
            language="python",
            code_snippet="x = 1",
            prompt="Explain.",
            result=sample_result,
        )
        repo.save_entry(entry)
        assert repo.delete_entry(sample_result.session_id) is True
        assert repo.load_entry(sample_result.session_id) is None

    def test_delete_nonexistent(self, tmp_path, monkeypatch):
        import app.repository as repo
        monkeypatch.setattr(repo, "DATA_DIR", tmp_path)
        assert repo.delete_entry("ghost-id") is False

    def test_load_all_entries(self, tmp_path, monkeypatch, sample_result):
        import app.repository as repo
        monkeypatch.setattr(repo, "DATA_DIR", tmp_path)

        from app.models import AnalysisResult, RepositoryEntry
        for i in range(3):
            r = AnalysisResult(
                summary=f"Summary {i}",
                analysis=f"Analysis {i}",
                suggestions=[],
                detected_language="python",
                session_id=str(uuid.uuid4()),
                timestamp=datetime.utcnow(),
            )
            entry = RepositoryEntry(
                session_id=r.session_id,
                language="python",
                code_snippet="x = 1",
                prompt="Explain.",
                result=r,
            )
            repo.save_entry(entry)

        all_entries = repo.load_all_entries()
        assert len(all_entries) == 3


# ────────────────────────────────────────────────────────────────────────────────
# 4. API Endpoint Tests
# ────────────────────────────────────────────────────────────────────────────────

class TestAPI:
    def test_root_endpoint(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        assert resp.json()["status"] == "CodeContext AI API is running"

    def test_health_endpoint_with_key(self, client, monkeypatch):
        monkeypatch.setenv("GEMINI_API_KEY", "test-key")
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "api_key_configured" in data

    def test_analyze_mocked_success(self, client, monkeypatch, sample_code, sample_result, tmp_path):
        """Analyze endpoint with Gemini mocked out."""
        import app.repository as repo
        monkeypatch.setattr(repo, "DATA_DIR", tmp_path)

        mock_return = (sample_result, sample_result.session_id)
        with patch("app.main.analyzer.analyze_code", return_value=mock_return):
            resp = client.post(
                "/analyze",
                json={"code": sample_code, "prompt": "Explain this function."},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "data" in data
        assert data["data"]["summary"] == sample_result.summary
        assert data["code_length"] == len(sample_code)

    def test_analyze_empty_code(self, client):
        resp = client.post("/analyze", json={"code": "  ", "prompt": "Explain."})
        assert resp.status_code == 400

    def test_analyze_empty_prompt(self, client):
        resp = client.post("/analyze", json={"code": "x = 1", "prompt": "   "})
        assert resp.status_code == 400

    def test_analyze_missing_api_key(self, client, monkeypatch):
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        with patch("app.main.analyzer.analyze_code", side_effect=EnvironmentError("No API key")):
            resp = client.post("/analyze", json={"code": "x = 1", "prompt": "Explain."})
        assert resp.status_code == 503

    def test_history_empty(self, client):
        resp = client.get("/history")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["entries"] == []

    def test_history_with_entry(self, client, monkeypatch, sample_result, tmp_path):
        import app.repository as repo
        monkeypatch.setattr(repo, "DATA_DIR", tmp_path)

        from app.models import RepositoryEntry
        entry = RepositoryEntry(
            session_id=sample_result.session_id,
            language="python",
            code_snippet="def add(a, b): return a + b",
            prompt="Explain.",
            result=sample_result,
        )
        repo.save_entry(entry)

        resp = client.get("/history")
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

    def test_get_entry_not_found(self, client):
        resp = client.get("/history/nonexistent-id")
        assert resp.status_code == 404

    def test_get_entry_found(self, client, monkeypatch, sample_result, tmp_path):
        import app.repository as repo
        monkeypatch.setattr(repo, "DATA_DIR", tmp_path)

        from app.models import RepositoryEntry
        entry = RepositoryEntry(
            session_id=sample_result.session_id,
            language="python",
            code_snippet="def add(a, b): return a + b",
            prompt="Explain.",
            result=sample_result,
        )
        repo.save_entry(entry)

        resp = client.get(f"/history/{sample_result.session_id}")
        assert resp.status_code == 200
        assert resp.json()["session_id"] == sample_result.session_id

    def test_delete_entry_not_found(self, client):
        resp = client.delete("/history/ghost-id")
        assert resp.status_code == 404

    def test_delete_entry_success(self, client, monkeypatch, sample_result, tmp_path):
        import app.repository as repo
        monkeypatch.setattr(repo, "DATA_DIR", tmp_path)

        from app.models import RepositoryEntry
        entry = RepositoryEntry(
            session_id=sample_result.session_id,
            language="python",
            code_snippet="x = 1",
            prompt="Explain.",
            result=sample_result,
        )
        repo.save_entry(entry)

        resp = client.delete(f"/history/{sample_result.session_id}")
        assert resp.status_code == 200
        assert resp.json()["success"] is True

    def test_history_limit_validation(self, client):
        resp = client.get("/history?limit=0")
        assert resp.status_code == 400
        resp2 = client.get("/history?limit=200")
        assert resp2.status_code == 400
