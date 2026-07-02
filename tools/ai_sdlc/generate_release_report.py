import argparse
import json
import os
from pathlib import Path
from typing import Any

from tools.ai_sdlc.evidence import (
    EVIDENCE_DIR,
    get_commit_sha,
    load_json,
    repo_path,
    utc_now,
    validate_manifest,
    write_json,
    write_text,
)

REPORT_PATH = repo_path(".ai-sdlc/reports/release-readiness.md")
REPORT_JSON = repo_path(".ai-sdlc/reports/release-readiness.json")
APPROVALS_PATH = EVIDENCE_DIR / "approvals" / "approvals.json"
ROLLBACK_PATHS = [
    repo_path(".ai-sdlc/rollback-plan.md"),
    repo_path("docs/rollback-plan.md"),
    repo_path(".ai-sdlc/workflows/release.yaml"),
]

MANDATORY_ARTIFACTS = {
    "Tests": "test-results",
    "Secret Scan": "security-secrets",
    "Dependency Scan": "security-dependencies",
    "SAST Scan": "security-sast",
    "Traceability": "traceability-matrix",
    "Safety": "safety-validation",
}


def artifact_by_id() -> dict[str, dict[str, Any]]:
    manifest = load_json(EVIDENCE_DIR / "evidence-manifest.json", {"artifacts": []})
    return {artifact["artifactId"]: artifact for artifact in manifest.get("artifacts", [])}


def approval_status(environment: str, current_commit: str) -> tuple[str, str]:
    if not APPROVALS_PATH.exists():
        return "FAIL", "Approval file is missing"
    data = load_json(APPROVALS_PATH, {"approvals": []})
    approvals = data.get("approvals", [])
    matching = [
        approval
        for approval in approvals
        if approval.get("approvalType") == "release"
        and approval.get("environment") == environment
    ]
    if not matching:
        return "FAIL", f"No release approval found for {environment}"
    approval = matching[-1]
    if approval.get("status") != "approved":
        return "FAIL", f"Approval status is {approval.get('status', 'missing')}"
    if approval.get("commitSha") != current_commit:
        return "FAIL", "Approval commit does not match current commit"
    if not approval.get("approvedBy") or not approval.get("approvedAt"):
        return "FAIL", "Approval is missing approver or timestamp"
    return "PASS", f"Approved by {approval['approvedBy']}"


def rollback_status() -> tuple[str, str, str]:
    for path in ROLLBACK_PATHS:
        if path.exists():
            return "PASS", path.relative_to(repo_path(".")).as_posix(), "Rollback reference exists"
    return "FAIL", "", "Rollback plan is missing"


def gate_row(
    gate: str,
    required: bool,
    status: str,
    artifact: dict[str, Any] | None,
    reason: str,
    remediation: str,
) -> dict[str, Any]:
    return {
        "gate": gate,
        "required": required,
        "status": status,
        "evidencePath": artifact.get("path", "") if artifact else "",
        "command": artifact.get("command", "") if artifact else "",
        "timestamp": artifact.get("generatedAt", "") if artifact else "",
        "commitSha": artifact.get("commitSha", "") if artifact else "",
        "reason": reason,
        "remediation": remediation,
    }


def evaluate_release(version: str, environment: str = "production") -> tuple[str, list[dict[str, Any]]]:
    current_commit = get_commit_sha()
    manifest_ok, manifest_errors = validate_manifest(
        allow_stale=os.getenv("AI_SDLC_ALLOW_STALE") == "1"
    )
    artifacts = artifact_by_id()
    rows: list[dict[str, Any]] = []

    for gate, artifact_id in MANDATORY_ARTIFACTS.items():
        artifact = artifacts.get(artifact_id)
        if not artifact:
            rows.append(
                gate_row(
                    gate,
                    True,
                    "NOT_EXECUTED",
                    None,
                    f"Missing evidence artifact {artifact_id}",
                    "Run the matching AI-SDLC command and register evidence.",
                )
            )
            continue
        status = artifact.get("status", "FAIL")
        reason = "Evidence registered"
        if artifact.get("commitSha") != current_commit:
            status = "FAIL"
            reason = "Evidence commit does not match current commit"
        rows.append(
            gate_row(
                gate,
                True,
                status,
                artifact,
                reason,
                "Regenerate the evidence on this commit." if status != "PASS" else "",
            )
        )

    if not manifest_ok:
        rows.append(
            gate_row(
                "Evidence Manifest Integrity",
                True,
                "FAIL",
                None,
                "; ".join(manifest_errors),
                "Regenerate or repair evidence artifacts.",
            )
        )
    else:
        rows.append(
            gate_row(
                "Evidence Manifest Integrity",
                True,
                "PASS",
                None,
                "Manifest hashes and commit links verified",
                "",
            )
        )

    approval_gate, approval_reason = approval_status(environment, current_commit)
    rows.append(
        gate_row(
            "Human Production Approval",
            True,
            approval_gate,
            None,
            approval_reason,
            "An authorized human must record an approved release approval for this commit.",
        )
    )

    rollback_gate, rollback_path, rollback_reason = rollback_status()
    rows.append(
        gate_row(
            "Rollback Plan",
            True,
            rollback_gate,
            {"path": rollback_path} if rollback_path else None,
            rollback_reason,
            "Add or update a rollback plan before release.",
        )
    )

    required_statuses = [row["status"] for row in rows if row["required"]]
    if any(status == "FAIL" for status in required_statuses) or any(
        status == "NOT_EXECUTED" for status in required_statuses
    ):
        decision = "NOT_READY"
    elif any(status == "WARNING" for status in required_statuses):
        decision = "READY_WITH_CONDITIONS"
    else:
        decision = "READY"

    report_json = {
        "version": version,
        "environment": environment,
        "decision": decision,
        "generatedAt": utc_now(),
        "commitSha": current_commit,
        "gates": rows,
    }
    write_json(REPORT_JSON, report_json)
    write_report_md(version, decision, rows)
    return decision, rows


def write_report_md(version: str, decision: str, rows: list[dict[str, Any]]) -> None:
    lines = [
        f"# Release Readiness Report - Version {version}",
        "",
        f"**Decision**: **{decision}**",
        "",
        "| Gate | Required | Status | Evidence | Command | Timestamp | Commit | Reason | Remediation |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for row in rows:
        lines.append(
            "| {gate} | {required} | **{status}** | {evidencePath} | `{command}` | {timestamp} | `{commitSha}` | {reason} | {remediation} |".format(
                **row
            )
        )
    lines.extend(
        [
            "",
            "A production release is not ready unless every mandatory gate is PASS, evidence is current, a rollback plan exists, and a human approval matches the current commit.",
            "",
        ]
    )
    write_text(REPORT_PATH, "\n".join(lines))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", default="1.0.0")
    parser.add_argument("--environment", default="production")
    args = parser.parse_args()
    decision, _rows = evaluate_release(args.version, args.environment)
    print(f"Release decision: {decision}")
    return 0 if decision == "READY" else 1


if __name__ == "__main__":
    raise SystemExit(main())
