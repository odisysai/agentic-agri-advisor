from typing import Any

from tools.ai_sdlc.evidence import (
    EVIDENCE_DIR,
    load_json,
    repo_path,
    utc_now,
    write_json,
    write_text,
)

CATEGORY_ARTIFACTS = {
    "Requirements": ["traceability-matrix"],
    "Architecture": [],
    "Code Quality": [],
    "Tests": ["test-results"],
    "Security": ["security-secrets", "security-dependencies", "security-sast"],
    "Privacy": [],
    "Agricultural Safety": ["safety-validation"],
    "Accessibility": [],
    "Localization": [],
    "Offline Reliability": [],
    "DevOps": ["security-container"],
    "Documentation": [],
}


def combine_status(records: list[dict[str, Any]]) -> str:
    if not records:
        return "NOT_EXECUTED"
    statuses = [record.get("status", "FAIL") for record in records]
    if "FAIL" in statuses:
        return "FAIL"
    if "NOT_EXECUTED" in statuses:
        return "NOT_EXECUTED"
    if "WARNING" in statuses:
        return "WARNING"
    if all(status == "NOT_APPLICABLE" for status in statuses):
        return "NOT_APPLICABLE"
    return "PASS"


def generate_scorecard() -> int:
    manifest = load_json(EVIDENCE_DIR / "evidence-manifest.json", {"artifacts": []})
    artifacts = {artifact["artifactId"]: artifact for artifact in manifest.get("artifacts", [])}
    rows = []
    for category, artifact_ids in CATEGORY_ARTIFACTS.items():
        records = [artifacts[item] for item in artifact_ids if item in artifacts]
        missing = [item for item in artifact_ids if item not in artifacts]
        status = combine_status(records)
        if missing and status == "PASS":
            status = "WARNING"
        rows.append(
            {
                "category": category,
                "status": status,
                "evidence": [record["path"] for record in records],
                "timestamps": [record["generatedAt"] for record in records],
                "details": "Missing evidence: " + ", ".join(missing) if missing else "Derived from registered evidence",
            }
        )

    output = {
        "generatedAt": utc_now(),
        "rows": rows,
        "allowedStatuses": ["PASS", "WARNING", "FAIL", "NOT_EXECUTED", "NOT_APPLICABLE"],
    }
    write_json(".ai-sdlc/reports/quality-scorecard.json", output)
    lines = [
        "# AI-SDLC Quality Scorecard",
        "",
        "| Category | Status | Evidence | Timestamp | Details |",
        "| --- | --- | --- | --- | --- |",
    ]
    for row in rows:
        lines.append(
            f"| {row['category']} | **{row['status']}** | {', '.join(row['evidence']) or 'none'} | {', '.join(row['timestamps']) or 'none'} | {row['details']} |"
        )
    write_text(repo_path(".ai-sdlc/reports/quality-scorecard.md"), "\n".join(lines) + "\n")
    print("Quality scorecard generated from evidence manifest.")
    return 1 if any(row["status"] == "FAIL" for row in rows) else 0


if __name__ == "__main__":
    raise SystemExit(generate_scorecard())
