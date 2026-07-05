"""
Security scanner wrappers for AI-SDLC evidence collection.

Wraps external security tools (detect-secrets, pip-audit, bandit, trivy)
and records NOT_EXECUTED when a tool is not installed.
"""

import json
import os
import subprocess
from datetime import UTC, datetime, timezone
from pathlib import Path

EVIDENCE_DIR = (
    Path(__file__).resolve().parents[2] / ".ai-sdlc" / "evidence" / "security"
)


def unavailable(
    tool_name: str,
    artifact_id: str,
    artifact_type: str,
    output_path: Path,
) -> int:
    """Write a NOT_EXECUTED evidence record for a missing security tool.

    Args:
        tool_name: Name of the security scanner tool.
        artifact_id: Unique identifier for this evidence record.
        artifact_type: Category of the scanner (e.g., 'security-secrets').
        output_path: Where to write the NOT_EXECUTED evidence JSON.

    Returns:
        Exit code 2 (NOT_EXECUTED).
    """
    record = {
        "artifactId": artifact_id,
        "artifactType": artifact_type,
        "path": str(output_path),
        "status": "NOT_EXECUTED",
        "generatedAt": datetime.now(UTC).isoformat(),
        "command": tool_name,
        "exitCode": 2,
        "sourceTool": tool_name,
        "metadata": {"findingCount": 0},
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(record, f, indent=2)

    return 2


def run_scanner(tool_name: str, command: list[str], evidence_file: str = None) -> dict:
    """Run a security scanner and record evidence."""
    evidence_file = evidence_file or f"{tool_name}.json"
    evidence_path = EVIDENCE_DIR / evidence_file
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=120,
            cwd=Path(__file__).resolve().parents[2],
        )
        evidence = {
            "artifactId": f"security-{tool_name}",
            "status": "PASS" if result.returncode == 0 else "FAIL",
            "exitCode": result.returncode,
            "output": result.stdout[:5000],
            "command": " ".join(command),
            "timestamp": datetime.now(UTC).isoformat(),
        }
    except FileNotFoundError:
        evidence = unavailable(
            tool_name,
            f"security-{tool_name}",
            f"security-{tool_name}",
            EVIDENCE_DIR / f"{tool_name}.json",
        )
        evidence["command"] = " ".join(command)
    except subprocess.TimeoutExpired:
        evidence = {
            "artifactId": f"security-{tool_name}",
            "status": "FAIL",
            "exitCode": -1,
            "error": "Timeout after 120s",
            "command": " ".join(command),
            "timestamp": datetime.now(UTC).isoformat(),
        }

    with open(evidence_path, "w") as f:
        json.dump(evidence, f, indent=2)

    return evidence


def scan_secrets():
    """Run secret scanning (detect-secrets or gitleaks)."""
    return run_scanner("secrets", ["detect-secrets", "scan", "--all-files", "."])


def scan_dependencies():
    """Run dependency vulnerability scanning (pip-audit)."""
    return run_scanner("dependencies", ["pip-audit"])


def scan_sast():
    """Run static analysis security testing (bandit)."""
    sast_path = EVIDENCE_DIR / "sast.json"
    return run_scanner(
        "sast", ["bandit", "-r", ".", "-f", "json", "-o", str(sast_path)]
    )


def scan_container():
    """Run container scanning (trivy)."""
    return run_scanner("container", ["trivy", "filesystem", "."])


if __name__ == "__main__":
    print("Security scanners available:")
    print("  scan_secrets()    - detect-secrets / gitleaks")
    print("  scan_dependencies() - pip-audit")
    print("  scan_sast()       - bandit")
    print("  scan_container()  - trivy")
