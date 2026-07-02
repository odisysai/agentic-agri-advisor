import json
import shutil
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

from tools.ai_sdlc.evidence import (
    EVIDENCE_DIR,
    get_commit_sha,
    get_dirty_status,
    register_artifact,
    repo_path,
    run_command,
    utc_now,
    write_json,
    write_text,
)

TEST_DIR = EVIDENCE_DIR / "tests"
TEST_JSON = TEST_DIR / "tests.json"
TEST_MD = TEST_DIR / "tests.md"
COVERAGE_JSON = TEST_DIR / "coverage.json"
COVERAGE_XML = TEST_DIR / "coverage.xml"
JUNIT_XML = TEST_DIR / "junit.xml"


def parse_junit(path: Path) -> dict[str, int]:
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError as exc:
        raise ValueError(f"Malformed JUnit XML: {exc}") from exc

    suites = root.findall("testsuite") if root.tag == "testsuites" else [root]
    total = failures = errors = skipped = 0
    for suite in suites:
        total += int(suite.attrib.get("tests", 0))
        failures += int(suite.attrib.get("failures", 0))
        errors += int(suite.attrib.get("errors", 0))
        skipped += int(suite.attrib.get("skipped", 0))
    failed = failures + errors
    return {
        "total": total,
        "passed": max(total - failed - skipped, 0),
        "failed": failed,
        "skipped": skipped,
    }


def read_coverage_percent(path: Path) -> float | None:
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    percent = data.get("totals", {}).get("percent_covered")
    return round(float(percent), 2) if percent is not None else None


def status_from_exit(exit_code: int) -> str:
    return "PASS" if exit_code == 0 else "FAIL"


def write_not_executed(tool: str, reason: str) -> int:
    generated_at = utc_now()
    evidence = {
        "status": "NOT_EXECUTED",
        "reason": reason,
        "generatedAt": generated_at,
        "commitSha": get_commit_sha(),
        "dirtyWorkingTree": get_dirty_status(),
        "sourceTool": tool,
    }
    write_json(TEST_JSON, evidence)
    write_text(TEST_MD, f"# Test Evidence\n\nStatus: **NOT_EXECUTED**\n\nReason: {reason}\n")
    register_artifact(
        "test-results",
        "test-results",
        TEST_JSON,
        "NOT_EXECUTED",
        tool,
        127,
        tool,
        generated_at=generated_at,
    )
    return 1


def run_pytest_with_optional_coverage(test_args: list[str] | None = None) -> dict[str, Any]:
    TEST_DIR.mkdir(parents=True, exist_ok=True)
    test_args = test_args or ["tests/", "--ignore=scratch/"]
    pytest_path = shutil.which("pytest") or str(repo_path(".venv/bin/pytest"))
    if not Path(pytest_path).exists():
        pytest_path = None
    coverage_path = shutil.which("coverage")
    if not coverage_path and repo_path(".venv/bin/coverage").exists():
        coverage_path = str(repo_path(".venv/bin/coverage"))
    if not pytest_path:
        return {"exit": write_not_executed("pytest", "pytest executable was not found")}

    with tempfile.TemporaryDirectory(prefix="ai-sdlc-pytest-") as tmp:
        tmp_junit = Path(tmp) / "junit.xml"
        if coverage_path:
            command = [
                coverage_path,
                "run",
                "-m",
                "pytest",
                *test_args,
                f"--junitxml={tmp_junit}",
            ]
            source_tool = "coverage"
        else:
            command = [pytest_path, *test_args, f"--junitxml={tmp_junit}"]
            source_tool = "pytest"

        result = run_command(command)
        generated_at = result["completedAt"]
        stats: dict[str, int] = {"total": 0, "passed": 0, "failed": 0, "skipped": 0}
        parse_error = None
        if tmp_junit.exists():
            tmp_junit.replace(JUNIT_XML)
            try:
                stats = parse_junit(JUNIT_XML)
            except ValueError as exc:
                parse_error = str(exc)
                result["exitCode"] = result["exitCode"] or 1
        else:
            parse_error = "pytest did not produce JUnit XML"
            result["exitCode"] = result["exitCode"] or 1

    coverage_percent = None
    coverage_status = "NOT_EXECUTED"
    coverage_result: dict[str, Any] | None = None
    if coverage_path:
        coverage_xml_result = run_command([coverage_path, "xml", "-o", str(COVERAGE_XML)])
        coverage_json_result = run_command([coverage_path, "json", "-o", str(COVERAGE_JSON)])
        coverage_result = {
            "xml": coverage_xml_result,
            "json": coverage_json_result,
        }
        if coverage_json_result["exitCode"] == 0 and COVERAGE_JSON.exists():
            coverage_percent = read_coverage_percent(COVERAGE_JSON)
            coverage_status = "PASS"
        else:
            coverage_status = "FAIL"
            write_json(
                COVERAGE_JSON,
                {
                    "status": "FAIL",
                    "reason": "coverage json generation failed",
                    "command": coverage_json_result["command"],
                    "exitCode": coverage_json_result["exitCode"],
                },
            )
    else:
        write_json(
            COVERAGE_JSON,
            {
                "status": "NOT_EXECUTED",
                "reason": "coverage executable was not found",
                "generatedAt": utc_now(),
                "commitSha": get_commit_sha(),
            },
        )

    status = status_from_exit(result["exitCode"])
    if parse_error:
        status = "FAIL"
    evidence = {
        "status": status,
        "generatedAt": generated_at,
        "commitSha": get_commit_sha(),
        "dirtyWorkingTree": get_dirty_status(),
        "command": result["command"],
        "startedAt": result["startedAt"],
        "completedAt": result["completedAt"],
        "durationSeconds": result["durationSeconds"],
        "exitCode": result["exitCode"],
        "stdoutSummary": result["stdoutSummary"],
        "stderrSummary": result["stderrSummary"],
        "totalTests": stats["total"],
        "passed": stats["passed"],
        "failed": stats["failed"],
        "skipped": stats["skipped"],
        "coveragePercent": coverage_percent,
        "coverageStatus": coverage_status,
        "parseError": parse_error,
        "coverageCommand": coverage_result,
    }
    write_json(TEST_JSON, evidence)
    write_text(
        TEST_MD,
        "\n".join(
            [
                "# Test Evidence",
                "",
                f"- Status: **{status}**",
                f"- Command: `{result['command']}`",
                f"- Exit code: `{result['exitCode']}`",
                f"- Started: {result['startedAt']}",
                f"- Completed: {result['completedAt']}",
                f"- Commit: `{evidence['commitSha']}`",
                f"- Dirty working tree: {evidence['dirtyWorkingTree']}",
                f"- Total tests: {stats['total']}",
                f"- Passed: {stats['passed']}",
                f"- Failed: {stats['failed']}",
                f"- Skipped: {stats['skipped']}",
                f"- Coverage: {coverage_percent if coverage_percent is not None else 'NOT_EXECUTED'}",
                "",
            ]
        ),
    )
    register_artifact(
        "test-results",
        "test-results",
        TEST_JSON,
        status,
        result["command"],
        result["exitCode"],
        source_tool,
        generated_at=generated_at,
        metadata={"markdown": repo_path(TEST_MD).relative_to(repo_path('.')).as_posix()},
    )
    register_artifact(
        "test-report",
        "test-report",
        TEST_MD,
        status,
        result["command"],
        result["exitCode"],
        source_tool,
        generated_at=generated_at,
    )
    register_artifact(
        "coverage-results",
        "coverage-results",
        COVERAGE_JSON,
        coverage_status,
        "coverage json",
        0 if coverage_status == "PASS" else None,
        "coverage",
        generated_at=generated_at,
        metadata={"coverageXml": repo_path(COVERAGE_XML).relative_to(repo_path('.')).as_posix() if COVERAGE_XML.exists() else None},
    )
    return {"exit": result["exitCode"], "evidence": evidence}


def main() -> int:
    result = run_pytest_with_optional_coverage()
    return int(result["exit"])


if __name__ == "__main__":
    sys.exit(main())
