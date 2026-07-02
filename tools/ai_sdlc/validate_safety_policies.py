import re
import sys
from pathlib import Path

from tools.ai_sdlc.evidence import (
    EVIDENCE_DIR,
    get_commit_sha,
    register_artifact,
    utc_now,
    write_json,
    write_text,
)

SAFETY_JSON = EVIDENCE_DIR / "safety" / "safety.json"
SAFETY_MD = EVIDENCE_DIR / "safety" / "safety.md"
PRESCRIPTIVE_TERMS = re.compile(
    r"\b(spray|chemical|pesticide|fungicide|fertilizer|dosage|dose|chlorantraniliprole|mancozeb|carbendazim|metalaxyl)\b",
    re.IGNORECASE,
)


def file_contains(path: str, *needles: str) -> bool:
    text = Path(path).read_text(encoding="utf-8")
    return all(needle in text for needle in needles)


def validate_safety() -> tuple[str, list[dict[str, str]]]:
    findings: list[dict[str, str]] = []

    dashboard = Path("ui/agui/dashboard.js")
    if dashboard.exists():
        text = dashboard.read_text(encoding="utf-8")
        prescriptive_hits = len(PRESCRIPTIVE_TERMS.findall(text))
        if prescriptive_hits and "applySafetyKernelFilter" not in text:
            findings.append(
                {
                    "status": "FAIL",
                    "control": "client-prescriptive-filter",
                    "detail": "Prescriptive terms exist in dashboard.js without applySafetyKernelFilter.",
                }
            )
        elif prescriptive_hits:
            findings.append(
                {
                    "status": "PASS",
                    "control": "client-prescriptive-filter",
                    "detail": "Dashboard prescriptive text is routed through applySafetyKernelFilter scope.",
                }
            )
    else:
        findings.append(
            {
                "status": "FAIL",
                "control": "client-prescriptive-filter",
                "detail": "ui/agui/dashboard.js is missing.",
            }
        )

    coordinator = Path("agents/coordinator/agent.py")
    if coordinator.exists() and file_contains(
        str(coordinator),
        "Agricultural Safety Kernel",
        "escalate low confidence",
        "human agronomist",
    ):
        findings.append(
            {
                "status": "PASS",
                "control": "agent-escalation-policy",
                "detail": "Coordinator instruction requires ASK limits and low-confidence escalation.",
            }
        )
    else:
        findings.append(
            {
                "status": "FAIL",
                "control": "agent-escalation-policy",
                "detail": "Coordinator lacks explicit ASK and low-confidence human escalation instructions.",
            }
        )

    if Path("ui/schemas/crop_safe_actions.json").exists():
        findings.append(
            {
                "status": "PASS",
                "control": "safe-actions-schema",
                "detail": "Crop safe actions schema exists for ASK warning presentation.",
            }
        )
    else:
        findings.append(
            {
                "status": "WARNING",
                "control": "safe-actions-schema",
                "detail": "Crop safe actions schema is missing.",
            }
        )

    if Path("app/fast_api_app.py").exists():
        api_text = Path("app/fast_api_app.py").read_text(encoding="utf-8")
        if "safety_decision" in api_text and "/api/observability/log" in api_text:
            findings.append(
                {
                    "status": "PASS",
                    "control": "safety-telemetry",
                    "detail": "Observability endpoint records safety_decision.",
                }
            )
        else:
            findings.append(
                {
                    "status": "WARNING",
                    "control": "safety-telemetry",
                    "detail": "Safety decision telemetry field was not found.",
                }
            )

    statuses = {finding["status"] for finding in findings}
    if "FAIL" in statuses:
        status = "FAIL"
    elif "WARNING" in statuses:
        status = "WARNING"
    else:
        status = "PASS"
    return status, findings


def main() -> int:
    status, findings = validate_safety()
    generated_at = utc_now()
    evidence = {
        "status": status,
        "generatedAt": generated_at,
        "commitSha": get_commit_sha(),
        "command": "python -m tools.ai_sdlc.validate_safety_policies",
        "exitCode": 0 if status in {"PASS", "WARNING"} else 1,
        "scope": [
            "agents/coordinator/agent.py",
            "ui/agui/dashboard.js",
            "ui/schemas/crop_safe_actions.json",
            "app/fast_api_app.py",
        ],
        "limitations": "Static safety validation checks configured code paths only; it is not complete agricultural assurance.",
        "findings": findings,
    }
    write_json(SAFETY_JSON, evidence)
    lines = ["# Agricultural Safety Validation", "", f"Status: **{status}**", ""]
    for finding in findings:
        lines.append(f"- **{finding['status']}** `{finding['control']}`: {finding['detail']}")
    lines.append("")
    lines.append(evidence["limitations"])
    write_text(SAFETY_MD, "\n".join(lines) + "\n")
    register_artifact(
        "safety-validation",
        "safety-validation",
        SAFETY_JSON,
        status,
        evidence["command"],
        evidence["exitCode"],
        "static-safety-validator",
        generated_at=generated_at,
    )
    print(f"Agricultural safety validation: {status}")
    return evidence["exitCode"]


if __name__ == "__main__":
    sys.exit(main())
