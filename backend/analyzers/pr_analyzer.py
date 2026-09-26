"""
PR diff analyzer: assesses risk and finds violations in a code diff.
"""
import re
from typing import Dict, List, Optional, Any


RISK_INDICATORS = {
    "CRITICAL": [
        (r"STRIPE_KEY\s*=\s*['\"][^'\"]+['\"]|sk_live_[A-Za-z0-9_]+|DEMO_STRIPE_KEY", "Hardcoded Stripe key in code"),
        (r"(password|secret)\s*=\s*['\"][^'\"]{8,}['\"]", "Hardcoded credential"),
        (r"DROP\s+TABLE", "Destructive SQL operation"),
        (r"eval\(", "Unsafe eval() call"),
    ],
    "HIGH": [
        (r"db\.query\(|session\.query\(|\.commit\(\)", "Direct database access"),
        (r"request\s*:\s*dict|request\.json\(\)", "Unvalidated request body"),
        (r"import\s+stripe|stripe\.api_key", "Inline Stripe integration"),
        (r"subprocess\.call|os\.system\(", "Shell command execution"),
        (r"except\s*:\s*pass", "Silent exception swallowing"),
    ],
    "MEDIUM": [
        (r"TODO|FIXME|HACK|XXX", "Code quality markers present"),
        (r"print\(", "Debug print statements in production code"),
        (r"time\.sleep\(", "Blocking sleep call"),
        (r"# noqa|type:\s*ignore", "Type/lint suppression"),
    ],
    "LOW": [
        (r"\.lower\(\)\.strip\(\)", "Minor code style"),
        (r"magic\s+number", "Magic number"),
    ],
}


def analyze_pr_diff(
    diff_content: str,
    repository_analysis: Optional[Dict] = None,
    guardrail_violations: Optional[List[Dict]] = None,
) -> Dict[str, Any]:
    """
    Analyze a code diff and return risk assessment.
    
    Args:
        diff_content: The unified diff string
        repository_analysis: Repository analysis result for context
        guardrail_violations: Existing violations for rule context
    
    Returns:
        Full PR analysis result
    """
    added_lines = _extract_added_lines(diff_content)
    changed_files = _extract_changed_files(diff_content)
    violations = _detect_violations(added_lines, diff_content)
    risk_score = _calculate_risk_score(violations, changed_files)
    risk_level = _score_to_level(risk_score)

    reviewer_questions = _generate_reviewer_questions(
        violations, changed_files, diff_content, repository_analysis
    )
    suggested_fixes = _generate_fixes(violations)
    tests_to_add = _suggest_tests(changed_files, diff_content)
    changed_components = _map_to_components(changed_files, repository_analysis)

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "changed_components": changed_components,
        "violations": violations,
        "reviewer_questions": reviewer_questions,
        "suggested_fixes": suggested_fixes,
        "tests_to_add": tests_to_add,
    }


def _extract_added_lines(diff: str) -> str:
    """Extract only the added ('+') lines from a diff."""
    lines = []
    for line in diff.splitlines():
        if line.startswith("+") and not line.startswith("+++"):
            lines.append(line[1:])
    return "\n".join(lines)


def _extract_changed_files(diff: str) -> List[str]:
    """Extract list of changed filenames from a diff."""
    files = []
    for line in diff.splitlines():
        if line.startswith("+++ b/"):
            fname = line[6:].strip()
            if fname != "/dev/null":
                files.append(fname)
    return files


def _detect_violations(added_lines: str, full_diff: str) -> List[Dict]:
    """Find rule violations in the diff's added lines."""
    violations = []
    seen = set()

    for severity, patterns in RISK_INDICATORS.items():
        for pattern, description in patterns:
            if re.search(pattern, added_lines, re.IGNORECASE):
                # Find the line number
                line_num = None
                for i, line in enumerate(full_diff.splitlines(), 1):
                    if line.startswith("+") and re.search(pattern, line, re.IGNORECASE):
                        line_num = i
                        break

                key = description
                if key not in seen:
                    seen.add(key)
                    violations.append({
                        "rule": description,
                        "severity": severity,
                        "line": line_num,
                        "description": description,
                    })

    return violations


def _calculate_risk_score(violations: List[Dict], changed_files: List[str]) -> int:
    """Calculate a risk score from 0-100."""
    score = 0

    weights = {"CRITICAL": 35, "HIGH": 20, "MEDIUM": 8, "LOW": 3}
    for v in violations:
        score += weights.get(v.get("severity", "LOW"), 3)

    # File count penalty
    file_count = len(changed_files)
    if file_count > 10:
        score += 15
    elif file_count > 5:
        score += 8
    elif file_count > 2:
        score += 4

    # Penalty for touching critical file types
    critical_files = ["auth", "payment", "security", "migration", "database"]
    for f in changed_files:
        if any(c in f.lower() for c in critical_files):
            score += 10
            break

    return min(100, score)


def _score_to_level(score: int) -> str:
    if score >= 80:
        return "CRITICAL"
    if score >= 60:
        return "HIGH"
    if score >= 35:
        return "MEDIUM"
    return "LOW"


def _generate_reviewer_questions(
    violations: List[Dict],
    files: List[str],
    diff: str,
    repo_analysis: Optional[Dict],
) -> List[str]:
    """Generate targeted questions a reviewer should ask."""
    questions = []

    if any(v["severity"] in ("CRITICAL", "HIGH") for v in violations):
        questions.append("Why does this change bypass the established service/repository layers?")

    if "sk_live" in diff or "secret" in diff.lower():
        questions.append("Has any live credential been committed? Please check git history immediately.")

    if "stripe" in diff.lower() or "payment" in diff.lower():
        questions.append("What happens if the payment succeeds but the subsequent DB write fails?")
        questions.append("Is this endpoint idempotent? What prevents duplicate charges?")

    if any("test" not in f.lower() for f in files):
        questions.append("Are there unit tests covering the new code paths in this diff?")

    if "TODO" in diff or "FIXME" in diff:
        questions.append("There are TODO/FIXME markers — should these be resolved before merging?")

    if len(files) > 5:
        questions.append(
            "This PR touches many files. Should this be split into smaller, focused changes?"
        )

    if not questions:
        questions.append("Does this change require any documentation updates?")
        questions.append("Have edge cases (empty input, network failure) been handled?")

    return questions[:8]


def _generate_fixes(violations: List[Dict]) -> List[str]:
    """Generate actionable fix suggestions per violation."""
    fixes_map = {
        "Direct database access": (
            "Move database queries to the appropriate Repository class and call via Service layer"
        ),
        "Unvalidated request body": (
            "Replace `dict` parameter with a typed Pydantic BaseModel; FastAPI handles validation automatically"
        ),
        "Inline Stripe integration": (
            "Move Stripe calls into PaymentService and inject it as a dependency"
        ),
        "Hardcoded credential": (
            "Replace hardcoded value with os.getenv('VAR_NAME'); add to .env.example"
        ),
        "Live Stripe key hardcoded in code": (
            "URGENT: Remove the live key immediately; rotate the key in Stripe dashboard; use os.getenv('STRIPE_SECRET_KEY')"
        ),
        "Silent exception swallowing": (
            "Log the exception with appropriate severity before passing or re-raising"
        ),
        "Debug print statements in production code": (
            "Replace print() with structured logging using the project's logger"
        ),
        "Shell command execution": (
            "Use subprocess.run() with shell=False and validate all inputs"
        ),
    }

    fixes = []
    for v in violations:
        fix = fixes_map.get(v.get("rule", ""), None)
        if not fix:
            fix = fixes_map.get(v.get("description", ""), None)
        if fix and fix not in fixes:
            fixes.append(fix)

    if not fixes:
        fixes.append("Review the changes against the project's architecture guidelines")
        fixes.append("Ensure all new code has corresponding unit tests")

    return fixes


def _suggest_tests(files: List[str], diff: str) -> List[str]:
    """Suggest specific tests to add."""
    tests = []

    if any("route" in f or "endpoint" in f or "api" in f for f in files):
        tests.append("test_<endpoint>_success: Happy path with valid input and mocked services")
        tests.append("test_<endpoint>_invalid_input: Verify 422 response for missing/invalid fields")
        tests.append("test_<endpoint>_unauthorized: Verify 401/403 for unauthenticated requests")

    if "payment" in diff.lower() or "stripe" in diff.lower():
        tests.append("test_payment_success: Mock payment provider and verify order creation")
        tests.append("test_payment_failure: Verify no order is created if payment fails")
        tests.append("test_payment_duplicate: Verify idempotency for duplicate payment attempts")

    if "auth" in " ".join(files).lower():
        tests.append("test_auth_valid_token: Verify successful authentication with valid JWT")
        tests.append("test_auth_expired_token: Verify 401 for expired tokens")

    if not tests:
        tests.append("test_<changed_functionality>: Unit test for the new behavior")
        tests.append("test_<changed_functionality>_edge_cases: Test boundary and error conditions")

    return tests[:8]


def _map_to_components(files: List[str], repo_analysis: Optional[Dict]) -> List[str]:
    """Map changed files to architecture component names."""
    components = set()
    for f in files:
        f_lower = f.lower()
        if "route" in f_lower or "endpoint" in f_lower or "api" in f_lower:
            components.add("API Layer")
        if "service" in f_lower:
            components.add("Services Layer")
        if "repositor" in f_lower or "repo" in f_lower:
            components.add("Repository Layer")
        if "model" in f_lower or "schema" in f_lower:
            components.add("Data Models")
        if "auth" in f_lower or "jwt" in f_lower:
            components.add("Auth Layer")
        if "payment" in f_lower or "stripe" in f_lower:
            components.add("Payment Processing")
        if "test" in f_lower or "spec" in f_lower:
            components.add("Test Suite")
        if "migration" in f_lower:
            components.add("Database Migrations")
        if "frontend" in f_lower or ".tsx" in f_lower or ".jsx" in f_lower:
            components.add("Frontend SPA")

    if not components:
        components.add("Application Core")

    return sorted(components)
