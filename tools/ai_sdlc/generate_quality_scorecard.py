"""
Quality scorecard generator — derives status from evidence artifacts.

IMPORTANT: Statuses are derived from actual evidence artifacts in
.ai-sdlc/evidence/evidence-manifest.json. Hard-coded PASS values are
a violation of the AI-SDLC evidence honesty rules (see .context/08-ai-sdlc.md).
"""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = ROOT / ".ai-sdlc" / "evidence" / "evidence-manifest.json"

# Map evidence artifactType → scorecard category
ARTIFACT_TO_CATEGORY: dict[str, str] = {
    "coverage-results": "Test Coverage",
    "safety-validation": "Agricultural Safety",
    "security-sast": "Code Quality",
    "security-secrets": "Code Quality",
    "security-dependencies": "Code Quality",
    "security-container": "Security",
    "localization-validation": "Localization",
    "translation-validation": "Localization",
    "schema-validation": "Offline Reliability",
    "release-readiness": "Requirements",
}

# Categories not covered by any evidence artifact → NOT_EXECUTED (honest)
ALL_CATEGORIES = [
    "Requirements",
    "Architecture",
    "Code Quality",
    "Test Coverage",
    "Security",
    "Privacy",
    "Agricultural Safety",
    "Accessibility",
    "Localization",
    "Offline Reliability",
    "DevOps",
    "Documentation",
]


def _load_evidence_statuses() -> dict[str, str]:
    """Read evidence manifest and derive per-category status."""
    if not MANIFEST_PATH.exists():
        return {}

    with MANIFEST_PATH.open(encoding="utf-8") as f:
        manifest = json.load(f)

    category_status: dict[str, str] = {}
    for artifact in manifest.get("artifacts", []):
        artifact_type = artifact.get("artifactType", "")
        category = ARTIFACT_TO_CATEGORY.get(artifact_type)
        if not category:
            continue

        status = artifact.get("status", "NOT_EXECUTED")
        existing = category_status.get(category, "NOT_EXECUTED")

        # Worst-case wins: FAIL > WARNING > NOT_EXECUTED > PASS
        priority = {"FAIL": 0, "WARNING": 1, "NOT_APPLICABLE": 2, "NOT_EXECUTED": 3, "PASS": 4}
        if priority.get(status, 3) < priority.get(existing, 3):
            category_status[category] = status
        elif existing == "NOT_EXECUTED":
            category_status[category] = status

    return category_status


def _status_icon(status: str) -> str:
    return {"PASS": "✅", "WARNING": "⚠️", "FAIL": "❌", "NOT_EXECUTED": "⏳", "NOT_APPLICABLE": "—"}.get(status, "❓")


def generate_scorecard() -> bool:
    evidence_statuses = _load_evidence_statuses()

    scorecard: dict[str, str] = {}
    for cat in ALL_CATEGORIES:
        scorecard[cat] = evidence_statuses.get(cat, "NOT_EXECUTED")

    md = "# AI-SDLC Quality Scorecard\n\n"
    md += "_Statuses derived from evidence artifacts in `.ai-sdlc/evidence/`. "
    md += "`NOT_EXECUTED` means no evidence was recorded — the check has not been run._\n\n"
    md += "| Category | Status | Evidence |\n"
    md += "| --- | --- | --- |\n"
    for cat, status in scorecard.items():
        icon = _status_icon(status)
        evidence_note = "Evidence present" if status in ("PASS", "WARNING") else "No evidence recorded"
        md += f"| {cat} | {icon} **{status}** | {evidence_note} |\n"

    all_pass = all(s in ("PASS", "NOT_APPLICABLE") for s in scorecard.values())
    any_fail = any(s == "FAIL" for s in scorecard.values())

    md += "\n"
    if all_pass:
        md += "_All categories with evidence: PASS._\n"
    elif any_fail:
        md += "_⚠️ One or more categories FAILED. Release is NOT_READY._\n"
    else:
        md += "_Some categories have no evidence yet. Run `make ai-sdlc-check` to populate._\n"

    os.makedirs(ROOT / ".ai-sdlc" / "reports", exist_ok=True)
    out_path = ROOT / ".ai-sdlc" / "reports" / "quality-scorecard.md"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(md)

    if all_pass:
        print("✅ Quality scorecard generated — all evidenced categories PASS.")
    else:
        print(f"⚠️  Quality scorecard generated — some categories are NOT_EXECUTED or FAIL. See {out_path}")
    return all_pass


if __name__ == "__main__":
    generate_scorecard()
