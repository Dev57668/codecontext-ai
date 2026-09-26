"""
Repository service: orchestrates scanning, analysis and persistence.
"""
import os
import zipfile
import shutil
import uuid
import tempfile
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from backend.analyzers.repo_scanner import RepositoryScanner
from backend.analyzers.guardrail_analyzer import GuardrailAnalyzer, BUILTIN_RULES
from backend.models.db_models import Repository, ArchitectureRule, GuardrailViolation
from backend.data.demo_data import (
    DEMO_ANALYSIS_RESULT, DEMO_GUARDRAIL_VIOLATIONS, DEMO_DECISIONS,
)


def load_demo_repository(db: Session) -> Repository:
    """
    Load the built-in ShopFlow demo repository into the database.
    Returns the Repository record.
    """
    # Check if demo already exists
    existing = db.query(Repository).filter(Repository.source_type == "demo").first()
    if existing:
        return existing

    repo_id = str(uuid.uuid4())
    repo = Repository(
        id=repo_id,
        name="ShopFlow Platform (Demo)",
        path=None,
        source_type="demo",
        status="ready",
        analysis_result=DEMO_ANALYSIS_RESULT,
    )
    db.add(repo)

    # Seed architecture rules
    for rule_data in BUILTIN_RULES:
        rule = ArchitectureRule(
            repository_id=repo_id,
            rule=rule_data["rule"],
            description=rule_data["description"],
            severity=rule_data["severity"],
            category=rule_data.get("category"),
        )
        db.add(rule)

    # Seed guardrail violations
    for v_data in DEMO_GUARDRAIL_VIOLATIONS:
        violation = GuardrailViolation(
            repository_id=repo_id,
            rule=v_data["rule"],
            severity=v_data["severity"],
            file_path=v_data["file_path"],
            line_number=v_data.get("line_number"),
            explanation=v_data["explanation"],
            suggested_fix=v_data["suggested_fix"],
            status="open",
        )
        db.add(violation)

    db.commit()
    db.refresh(repo)
    return repo


def analyze_local_repository(db: Session, path: str) -> Repository:
    """Scan a local repository path and persist results."""
    if not os.path.isdir(path):
        raise ValueError(f"Path does not exist or is not a directory: {path}")

    repo_id = str(uuid.uuid4())
    repo = Repository(
        id=repo_id,
        name=Path(path).name,
        path=path,
        source_type="local",
        status="analyzing",
    )
    db.add(repo)
    db.commit()

    try:
        # Run scanner
        scanner = RepositoryScanner(path)
        analysis_result = scanner.scan()

        # Run guardrail analyzer
        guardrail_result = GuardrailAnalyzer(path).run()

        # Persist analysis
        repo.analysis_result = analysis_result
        repo.status = "ready"
        db.commit()

        # Seed architecture rules
        for rule_data in BUILTIN_RULES:
            rule = ArchitectureRule(
                repository_id=repo_id,
                rule=rule_data["rule"],
                description=rule_data["description"],
                severity=rule_data["severity"],
                category=rule_data.get("category"),
            )
            db.add(rule)

        # Persist violations
        for v_data in guardrail_result["violations"]:
            violation = GuardrailViolation(
                repository_id=repo_id,
                rule=v_data["rule"],
                severity=v_data["severity"],
                file_path=v_data["file_path"],
                line_number=v_data.get("line_number"),
                explanation=v_data.get("explanation"),
                suggested_fix=v_data.get("suggested_fix"),
                status="open",
            )
            db.add(violation)

        db.commit()
        db.refresh(repo)
        return repo

    except Exception as e:
        repo.status = "error"
        db.commit()
        raise


def analyze_zip_repository(db: Session, zip_path: str) -> Repository:
    """Extract a ZIP and analyze it as a local repository."""
    temp_dir = tempfile.mkdtemp(prefix="codecontext_")
    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(temp_dir)

        # Find the root of the extracted content
        extracted_items = os.listdir(temp_dir)
        if len(extracted_items) == 1 and os.path.isdir(os.path.join(temp_dir, extracted_items[0])):
            extract_path = os.path.join(temp_dir, extracted_items[0])
        else:
            extract_path = temp_dir

        repo = analyze_local_repository(db, extract_path)
        # Update name from ZIP filename
        repo.name = Path(zip_path).stem
        repo.source_type = "zip"
        db.commit()
        return repo
    finally:
        # Cleanup is best-effort; temp files will be cleaned by OS
        pass
