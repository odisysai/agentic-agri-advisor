import json
import shutil
import sys
from pathlib import Path
from typing import Any

from tools.ai_sdlc.evidence import (
    EVIDENCE_DIR,
    get_commit_sha,
    register_artifact,
    run_command,
    utc_now,
    write_json,
    write_text,
)

SECURITY_DIR = EVIDENCE_DIR / "security"
SUMMARY_MD = SECURITY_DIR / "security-summary.md"


def find_tool(name: str) -> str | None:
    path = shutil.which(name)
    if path:
        return path
    venv_path = Path(".venv") / "bin" / name
    return str(venv_path) if venv_path.exists() else None


def severity_status(severities: list[str]) -> str:
    normalized = {severity.upper() for severity in severities}
    if normalized & {"CRITICAL", "HIGH"}:
        return "FAIL"
    if "MEDIUM" in normalized:
        return "WARNING"
    return "PASS"


def markdown_summary(title: str, evidence: dict[str, Any]) -> str:
    findings = evidence.get("findingCount", 0)
    return "\n".join(
        [
            f"# {title}",
            "",
            f"- Status: **{evidence['status']}**",
            f"- Scanner: `{evidence['sourceTool']}`",
            f"- Command: `{evidence.get('command', 'NOT_EXECUTED')}`",
            f"- Exit code: `{evidence.get('exitCode')}`",
            f"- Generated: {evidence['generatedAt']}",
            f"- Commit: `{evidence['commitSha']}`",
            f"- Findings: {findings}",
            f"- Reason: {evidence.get('reason', '')}",
            "",
        ]
    )


def register_security_artifact(
    artifact_id: str,
    artifact_type: str,
    path: Path,
    evidence: dict[str, Any],
) -> None:
    register_artifact(
        artifact_id,
        artifact_type,
        path,
        evidence["status"],
        evidence.get("command", evidence["sourceTool"]),
        evidence.get("exitCode"),
        evidence["sourceTool"],
        generated_at=evidence["generatedAt"],
        metadata={"findingCount": evidence.get("findingCount", 0)},
    )


def unavailable(scanner: str, artifact_id: str, artifact_type: str, path: Path) -> int:
    evidence = {
        "status": "NOT_EXECUTED",
        "sourceTool": scanner,
        "generatedAt": utc_now(),
        "commitSha": get_commit_sha(),
        "reason": f"{scanner} executable was not found",
        "findingCount": 0,
        "exitCode": 127,
    }
    write_json(path, evidence)
    register_security_artifact(artifact_id, artifact_type, path, evidence)
    return 2


def run_secret_scan() -> int:
    SECURITY_DIR.mkdir(parents=True, exist_ok=True)
    path = SECURITY_DIR / "secrets.json"
    gitleaks = find_tool("gitleaks")
    detect_secrets = find_tool("detect-secrets")
    generated_at = utc_now()
    if gitleaks:
        raw_path = SECURITY_DIR / "gitleaks-report.json"
        result = run_command(
            [
                gitleaks,
                "detect",
                "--source",
                ".",
                "--report-format",
                "json",
                "--report-path",
                str(raw_path),
                "--no-banner",
                "--redact",
            ]
        )
        findings = []
        if raw_path.exists() and raw_path.stat().st_size:
            findings = json.loads(raw_path.read_text(encoding="utf-8"))
        status = "FAIL" if findings or result["exitCode"] == 1 else ("PASS" if result["exitCode"] == 0 else "FAIL")
        evidence = {
            **result,
            "status": status,
            "sourceTool": "gitleaks",
            "generatedAt": generated_at,
            "commitSha": get_commit_sha(),
            "findingCount": len(findings),
            "rawReportPath": raw_path.relative_to(Path.cwd()).as_posix(),
            "reason": "secret findings detected" if findings else "",
        }
    elif detect_secrets:
        result = run_command([detect_secrets, "scan", "--all-files"])
        data = json.loads(result["stdoutSummary"] or "{}") if result["stdoutSummary"].strip() else {}
        finding_count = sum(len(v) for v in data.get("results", {}).values())
        status = "FAIL" if finding_count else ("PASS" if result["exitCode"] == 0 else "FAIL")
        evidence = {
            **result,
            "status": status,
            "sourceTool": "detect-secrets",
            "generatedAt": generated_at,
            "commitSha": get_commit_sha(),
            "findingCount": finding_count,
            "reason": "secret findings detected" if finding_count else "",
        }
    else:
        return unavailable("gitleaks or detect-secrets", "security-secrets", "security-secrets", path)
    write_json(path, evidence)
    write_text(SECURITY_DIR / "secrets.md", markdown_summary("Secret Scan", evidence))
    register_security_artifact("security-secrets", "security-secrets", path, evidence)
    return 0 if evidence["status"] == "PASS" else 1


def run_dependency_scan() -> int:
    path = SECURITY_DIR / "dependencies.json"
    scanner = find_tool("pip-audit")
    if not scanner:
        return unavailable("pip-audit", "security-dependencies", "security-dependencies", path)
    raw_path = SECURITY_DIR / "pip-audit-report.json"
    result = run_command([scanner, "-f", "json", "-o", str(raw_path)])
    data: dict[str, Any] = {}
    if raw_path.exists() and raw_path.stat().st_size:
        data = json.loads(raw_path.read_text(encoding="utf-8"))
    vulnerabilities = []
    for dependency in data.get("dependencies", []):
        vulnerabilities.extend(dependency.get("vulns", []))
    status = "FAIL" if vulnerabilities else ("PASS" if result["exitCode"] == 0 else "FAIL")
    evidence = {
        **result,
        "status": status,
        "sourceTool": "pip-audit",
        "generatedAt": result["completedAt"],
        "commitSha": get_commit_sha(),
        "findingCount": len(vulnerabilities),
        "rawReportPath": raw_path.relative_to(Path.cwd()).as_posix(),
        "reason": "dependency vulnerabilities detected" if vulnerabilities else "",
    }
    write_json(path, evidence)
    write_text(SECURITY_DIR / "dependencies.md", markdown_summary("Dependency Scan", evidence))
    register_security_artifact("security-dependencies", "security-dependencies", path, evidence)
    return 0 if evidence["status"] == "PASS" else 1


def run_sast_scan() -> int:
    path = SECURITY_DIR / "sast.json"
    scanner = find_tool("bandit")
    if not scanner:
        return unavailable("bandit", "security-sast", "security-sast", path)
    raw_path = SECURITY_DIR / "bandit-report.json"
    result = run_command(
        [
            scanner,
            "-r",
            "app",
            "agents",
            "tools",
            "-f",
            "json",
            "-o",
            str(raw_path),
        ]
    )
    data: dict[str, Any] = {}
    if raw_path.exists() and raw_path.stat().st_size:
        data = json.loads(raw_path.read_text(encoding="utf-8"))
    results = data.get("results", [])
    status = severity_status([finding.get("issue_severity", "LOW") for finding in results])
    if result["exitCode"] not in (0, 1):
        status = "FAIL"
    evidence = {
        **result,
        "status": status,
        "sourceTool": "bandit",
        "generatedAt": result["completedAt"],
        "commitSha": get_commit_sha(),
        "findingCount": len(results),
        "rawReportPath": raw_path.relative_to(Path.cwd()).as_posix(),
        "reason": "high or critical SAST findings detected" if status == "FAIL" else "",
    }
    write_json(path, evidence)
    write_text(SECURITY_DIR / "sast.md", markdown_summary("SAST Scan", evidence))
    register_security_artifact("security-sast", "security-sast", path, evidence)
    return 0 if evidence["status"] in {"PASS", "WARNING"} else 1


def run_container_scan() -> int:
    path = SECURITY_DIR / "container.json"
    dockerfile = Path("Dockerfile")
    if not dockerfile.exists():
        evidence = {
            "status": "NOT_APPLICABLE",
            "sourceTool": "trivy",
            "generatedAt": utc_now(),
            "commitSha": get_commit_sha(),
            "reason": "No Dockerfile exists in the repository root",
            "findingCount": 0,
            "exitCode": None,
        }
        write_json(path, evidence)
        register_security_artifact("security-container", "security-container", path, evidence)
        return 0
    scanner = find_tool("trivy")
    if not scanner:
        return unavailable("trivy", "security-container", "security-container", path)
    raw_path = SECURITY_DIR / "trivy-image-report.json"
    image = "krishi-sampark:ai-sdlc"
    build = run_command(["docker", "build", "-t", image, "."])
    if build["exitCode"] != 0:
        evidence = {
            **build,
            "status": "FAIL",
            "sourceTool": "docker",
            "generatedAt": build["completedAt"],
            "commitSha": get_commit_sha(),
            "findingCount": 0,
            "reason": "container build failed before scan",
        }
        write_json(path, evidence)
        register_security_artifact("security-container", "security-container", path, evidence)
        return 1
    scan = run_command(
        [
            scanner,
            "image",
            "--format",
            "json",
            "--severity",
            "HIGH,CRITICAL",
            "--exit-code",
            "1",
            "--output",
            str(raw_path),
            image,
        ]
    )
    data: dict[str, Any] = {}
    if raw_path.exists() and raw_path.stat().st_size:
        data = json.loads(raw_path.read_text(encoding="utf-8"))
    findings = []
    for result in data.get("Results", []):
        findings.extend(result.get("Vulnerabilities", []) or [])
    evidence = {
        **scan,
        "status": "FAIL" if findings or scan["exitCode"] else "PASS",
        "sourceTool": "trivy",
        "generatedAt": scan["completedAt"],
        "commitSha": get_commit_sha(),
        "findingCount": len(findings),
        "rawReportPath": raw_path.relative_to(Path.cwd()).as_posix(),
        "reason": "high or critical container vulnerabilities detected" if findings else "",
    }
    write_json(path, evidence)
    write_text(SECURITY_DIR / "container.md", markdown_summary("Container Scan", evidence))
    register_security_artifact("security-container", "security-container", path, evidence)
    return 0 if evidence["status"] == "PASS" else 1


def write_security_summary() -> None:
    parts = ["# Security Evidence Summary", ""]
    for name in ["secrets", "dependencies", "sast", "container"]:
        path = SECURITY_DIR / f"{name}.json"
        if not path.exists():
            parts.append(f"- {name}: **NOT_EXECUTED** (missing evidence)")
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        parts.append(
            f"- {name}: **{data.get('status')}** via `{data.get('sourceTool')}` "
            f"({data.get('findingCount', 0)} findings)"
        )
    write_text(SUMMARY_MD, "\n".join(parts) + "\n")


def main(kind: str) -> int:
    runners = {
        "secrets": run_secret_scan,
        "dependencies": run_dependency_scan,
        "sast": run_sast_scan,
        "container": run_container_scan,
    }
    code = runners[kind]()
    write_security_summary()
    return code


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1]))
