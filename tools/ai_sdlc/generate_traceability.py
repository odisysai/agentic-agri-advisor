import os
from pathlib import Path

from tools.ai_sdlc.evidence import (
    get_commit_sha,
    register_artifact,
    repo_path,
    utc_now,
    write_json,
    write_text,
)

REQUIREMENTS = [
    {
        "id": "REQ-AAA-001",
        "title": "Multilingual UI",
        "adr": "docs/adr/ADR-AAA-001.md",
        "source_files": ["ui/agui/translations.js", "ui/agui/index.html"],
        "tests": ["tests/integration/test_localization.py"],
        "security_controls": [],
        "safety_controls": [],
    },
    {
        "id": "REQ-AAA-002",
        "title": "Offline-First Operation & Storage",
        "adr": "docs/adr/ADR-AAA-002.md",
        "source_files": ["ui/sw.js", "ui/agui/local_db.js"],
        "tests": ["tests/integration/test_phase4.py"],
        "security_controls": [],
        "safety_controls": [],
    },
    {
        "id": "REQ-AAA-005",
        "title": "Agricultural Safety Kernel Advice Audit",
        "adr": "docs/adr/ADR-AAA-005.md",
        "source_files": ["app/fast_api_app.py", "ui/agui/dashboard.js"],
        "tests": ["tests/integration/test_server_e2e.py"],
        "security_controls": [],
        "safety_controls": ["safety-validation"],
    },
]


def path_status(path: str) -> str:
    return "OK" if repo_path(path).exists() else "GAP"


def validate_duplicate_ids(requirements: list[dict]) -> list[str]:
    seen: set[str] = set()
    duplicates: list[str] = []
    for req in requirements:
        req_id = req["id"]
        if req_id in seen:
            duplicates.append(req_id)
        seen.add(req_id)
    return duplicates


def generate_matrix() -> int:
    generated_at = utc_now()
    duplicates = validate_duplicate_ids(REQUIREMENTS)
    rows = []
    has_gap = bool(duplicates)
    for req in REQUIREMENTS:
        source_status = {path: path_status(path) for path in req["source_files"]}
        test_status = {path: path_status(path) for path in req["tests"]}
        adr_status = path_status(req["adr"])
        gaps = []
        if adr_status == "GAP":
            gaps.append(f"missing ADR {req['adr']}")
        gaps.extend(f"missing source {path}" for path, status in source_status.items() if status == "GAP")
        gaps.extend(f"missing test {path}" for path, status in test_status.items() if status == "GAP")
        if gaps:
            has_gap = True
        rows.append(
            {
                **req,
                "adr_status": adr_status,
                "source_status": source_status,
                "test_status": test_status,
                "status": "GAP" if gaps else "OK",
                "gaps": gaps,
            }
        )

    status = "FAIL" if has_gap and os.getenv("AI_SDLC_TRACEABILITY_STRICT") == "1" else ("WARNING" if has_gap else "PASS")
    output = {
        "status": status,
        "generatedAt": generated_at,
        "commitSha": get_commit_sha(),
        "duplicateIds": duplicates,
        "requirements": rows,
    }
    json_path = repo_path(".ai-sdlc/reports/traceability-matrix.json")
    md_path = repo_path(".ai-sdlc/reports/traceability-matrix.md")
    write_json(json_path, output)

    lines = [
        "# Requirements Traceability Matrix",
        "",
        f"Status: **{status}**",
        "",
        "| Req ID | Title | ADR | Sources | Tests | Safety Controls | Status | Gaps |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for row in rows:
        lines.append(
            f"| {row['id']} | {row['title']} | {row['adr']} ({row['adr_status']}) | "
            f"{', '.join(f'{p} ({s})' for p, s in row['source_status'].items())} | "
            f"{', '.join(f'{p} ({s})' for p, s in row['test_status'].items())} | "
            f"{', '.join(row['safety_controls']) or 'none'} | {row['status']} | {', '.join(row['gaps']) or 'none'} |"
        )
    write_text(md_path, "\n".join(lines) + "\n")
    register_artifact(
        "traceability-matrix",
        "traceability",
        json_path,
        "FAIL" if status == "FAIL" else ("WARNING" if status == "WARNING" else "PASS"),
        "python -m tools.ai_sdlc.generate_traceability",
        1 if status == "FAIL" else 0,
        "traceability-validator",
        generated_at=generated_at,
        metadata={"markdown": str(md_path.relative_to(repo_path(".")))},
    )
    print(f"Traceability matrix generated with status: {status}")
    return 1 if status == "FAIL" else 0


if __name__ == "__main__":
    raise SystemExit(generate_matrix())
