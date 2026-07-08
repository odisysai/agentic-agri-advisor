#!/usr/bin/env python3
"""
Language audit and scaffolding tool for Krishi Sampark.

Checks whether a given language code has been added to all required files,
using real JS dict parsing (via tools.ai_sdlc.parse_translations) for
translations.js and text-anchor search for all other files.

Usage:
    # Audit only — see what is present/missing:
    python tools/scaffold/add_language.py --code kn --name Kannada --check

    # Full audit with evidence output:
    python tools/scaffold/add_language.py --code kn --name Kannada --native ಕನ್ನಡ --check --evidence

Reference:
    .context/04-add-language.md  — step-by-step guide
    .context/change-maps/add-language.yaml  — machine-readable file + section list
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import NamedTuple

# ─── Project root ──────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent.parent

# Allow importing from tools/ without installing
sys.path.insert(0, str(ROOT))


# ─── Check result ─────────────────────────────────────────────────────────────
class CheckResult(NamedTuple):
    file: str
    section: str
    status: str  # "PRESENT" | "MISSING" | "FILE_NOT_FOUND"
    hint: str


# ─── File-level presence checks ───────────────────────────────────────────────

def _read(path: Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return None


def _contains(text: str, pattern: str) -> bool:
    return bool(re.search(re.escape(pattern), text))


def check_translations_js(code: str) -> list[CheckResult]:
    """
    Check translations.js using real JS dict parsing (ast.literal_eval).
    This is more reliable than text search — verifies actual dict key presence.
    """
    rel_path = "ui/agui/translations.js"
    path = ROOT / rel_path
    if not path.exists():
        return [CheckResult(rel_path, "—", "FILE_NOT_FOUND", f"File does not exist: {rel_path}")]

    results = []
    try:
        from tools.ai_sdlc.parse_translations import (
            get_schema_translations,
            get_translations,
        )
        translations = get_translations(path)
        schema_translations = get_schema_translations(path)

        # 1. TRANSLATIONS dict
        results.append(CheckResult(
            rel_path, "TRANSLATIONS",
            "PRESENT" if code in translations else "MISSING",
            f"Language block '{code}' in TRANSLATIONS dict",
        ))
        # 2. SCHEMA_TRANSLATIONS dict
        results.append(CheckResult(
            rel_path, "SCHEMA_TRANSLATIONS",
            "PRESENT" if code in schema_translations else "MISSING",
            f"Language block '{code}' in SCHEMA_TRANSLATIONS dict",
        ))
    except Exception as exc:
        # Fall back to text search if parsing fails
        text = path.read_text(encoding="utf-8")
        for dict_name in ("TRANSLATIONS", "SCHEMA_TRANSLATIONS"):
            present = _contains(text, f"'{code}':")
            results.append(CheckResult(
                rel_path, dict_name,
                "PRESENT" if present else "MISSING",
                f"(text fallback — parse error: {exc})",
            ))

    # 3. LANGUAGE_CONFIGS — text search is fine here (simpler structure)
    text = path.read_text(encoding="utf-8")
    results.append(CheckResult(
        rel_path, "LANGUAGE_CONFIGS",
        "PRESENT" if _contains(text, f"'{code}':") else "MISSING",
        f"LANGUAGE_CONFIGS entry for '{code}'",
    ))
    return results


def check_js_file(rel_path: str, code: str, sections: list[dict]) -> list[CheckResult]:
    """Check a JS file for presence of language code in each named section."""
    path = ROOT / rel_path
    text = _read(path)
    if text is None:
        return [CheckResult(rel_path, "—", "FILE_NOT_FOUND", f"File does not exist: {rel_path}")]
    results = []
    for section in sections:
        anchor = section.get("anchor", f'"{code}"')
        anchor_resolved = anchor.replace("<code>", code)
        present = _contains(text, anchor_resolved)
        results.append(CheckResult(
            rel_path,
            section["name"],
            "PRESENT" if present else "MISSING",
            section.get("description", ""),
        ))
    return results


def check_python_file(rel_path: str, code: str, sections: list[dict]) -> list[CheckResult]:
    """Check a Python file for presence of language code."""
    path = ROOT / rel_path
    text = _read(path)
    if text is None:
        return [CheckResult(rel_path, "—", "FILE_NOT_FOUND", f"File does not exist: {rel_path}")]
    results = []
    for section in sections:
        anchor = section.get("anchor", f'"{code}"')
        anchor_resolved = anchor.replace("<code>", code).replace("<lang>", code)
        present = _contains(text, anchor_resolved)
        results.append(CheckResult(
            rel_path,
            section["name"],
            "PRESENT" if present else "MISSING",
            section.get("description", ""),
        ))
    return results


def check_html_file(rel_path: str, code: str, sections: list[dict]) -> list[CheckResult]:
    """Check an HTML file for presence of language option."""
    path = ROOT / rel_path
    text = _read(path)
    if text is None:
        return [CheckResult(rel_path, "—", "FILE_NOT_FOUND", f"File does not exist: {rel_path}")]
    results = []
    for section in sections:
        present = _contains(text, f'value="{code}"')
        results.append(CheckResult(
            rel_path,
            section["name"],
            "PRESENT" if present else "MISSING",
            section.get("description", ""),
        ))
    return results


# ─── Complete audit definition ────────────────────────────────────────────────

def build_audit(code: str) -> list[tuple[str, str, list[dict]]]:
    """
    Returns list of (rel_path, file_type, sections) tuples.
    Sections are dicts with 'name', 'anchor', 'description'.
    """
    return [
        # ── Frontend JS ────────────────────────────────────────────────────────
        ("ui/agui/translations.js", "js", [
            {"name": "TRANSLATIONS", "anchor": f"'{code}':", "description": "Main UI string dictionary"},
            {"name": "SCHEMA_TRANSLATIONS", "anchor": f"'{code}':", "description": "A2UI schema translations (second occurrence)"},
            {"name": "LANGUAGE_CONFIGS", "anchor": f"'{code}':", "description": "Locale config entry"},
        ]),
        ("ui/agui/index.html", "html", [
            {"name": "language-selector", "anchor": f'value="{code}"', "description": "Language dropdown option"},
        ]),
        ("ui/agui/dashboard.js", "js", [
            {"name": "normalizeLanguageCode", "anchor": f'"{code}"', "description": "Alias map entry"},
            {"name": "langNameMap", "anchor": f'"{code}"', "description": "Code → display name map"},
            {"name": "langMap_bcp47", "anchor": f'"{code}"', "description": "BCP-47 map entries"},
            {"name": "escalationMessages", "anchor": f'"{code}"', "description": "Escalation message"},
        ]),
        ("ui/agui/voice.js", "js", [
            {"name": "langMap_stt", "anchor": f'"{code}"', "description": "STT BCP-47 map"},
            {"name": "codeToBcp47", "anchor": f'"{code}"', "description": "Code to BCP-47 map"},
        ]),
        ("ui/agui/local_db.js", "js", [
            {"name": "offline_knowledge", "anchor": f'"{code}"', "description": "Offline knowledge diagnostics"},
        ]),
        ("ui/agui/local_models.js", "js", [
            {"name": "labels", "anchor": f'"{code}"', "description": "Offline AI persona labels"},
        ]),
        ("ui/index.html", "html", [
            {"name": "language-selector", "anchor": f'value="{code}"', "description": "Landing page language option"},
        ]),
        ("ui/landing.js", "js", [
            {"name": "TRANSLATIONS", "anchor": f"TRANSLATIONS['{code}']", "description": "Landing page translation block"},
        ]),
        # ── Backend Python ─────────────────────────────────────────────────────
        ("app/fast_api_app.py", "python", [
            {"name": "VOICE_MAP", "anchor": f'"{code}"', "description": "Edge-TTS voice mapping"},
        ]),
        ("mcp_servers/translation/server.py", "python", [
            {"name": "MOCK_TRANSLATIONS", "anchor": f'"{code}"', "description": "Translation mock entries"},
        ]),
        # ── Agent instructions ─────────────────────────────────────────────────
        ("agents/coordinator/agent.py", "python", [
            {"name": "language_examples", "anchor": f"'{code}'", "description": "Language parameter examples"},
        ]),
        ("agents/crop_analyst/agent.py", "python", [
            {"name": "LANGUAGE_RULE", "anchor": f"Respond in {code}", "description": "Language rule entry"},
        ]),
        ("agents/irrigation_advisor/agent.py", "python", [
            {"name": "LANGUAGE_RULE", "anchor": f"Respond in {code}", "description": "Language rule entry"},
        ]),
        ("agents/market_advisor/agent.py", "python", [
            {"name": "LANGUAGE_RULE", "anchor": f"Respond in {code}", "description": "Language rule entry"},
        ]),
        ("agents/weather_advisor/agent.py", "python", [
            {"name": "LANGUAGE_RULE", "anchor": f"Respond in {code}", "description": "Language rule entry"},
        ]),
        ("agents/farmer_interaction/agent.py", "python", [
            {"name": "language_examples", "anchor": f"'{code}'", "description": "Language parameter examples"},
        ]),
    ]


def _check_file(rel_path: str, file_type: str, code: str, sections: list[dict]) -> list[CheckResult]:
    if rel_path == "ui/agui/translations.js":
        return check_translations_js(code)
    if file_type == "js":
        return check_js_file(rel_path, code, sections)
    if file_type == "html":
        return check_html_file(rel_path, code, sections)
    if file_type == "python":
        return check_python_file(rel_path, code, sections)
    return [CheckResult(rel_path, "—", "MISSING", f"Unknown file type: {file_type}")]


# ─── Reporting ────────────────────────────────────────────────────────────────

def run_audit(code: str, name: str) -> list[CheckResult]:
    audit = build_audit(code)
    all_results: list[CheckResult] = []
    for rel_path, file_type, sections in audit:
        all_results.extend(_check_file(rel_path, file_type, code, sections))
    return all_results


def print_report(results: list[CheckResult], code: str, name: str) -> int:
    """Print audit report. Returns exit code (0 = all present, 1 = missing items)."""
    present = [r for r in results if r.status == "PRESENT"]
    missing = [r for r in results if r.status == "MISSING"]
    not_found = [r for r in results if r.status == "FILE_NOT_FOUND"]

    print(f"\n{'='*60}")
    print(f"Language Audit: {name} ({code})")
    print(f"{'='*60}")
    print(f"  Total checks : {len(results)}")
    print(f"  PRESENT      : {len(present)}")
    print(f"  MISSING      : {len(missing)}")
    print(f"  FILE_NOT_FOUND: {len(not_found)}")
    print()

    if missing or not_found:
        print("── MISSING / FILE_NOT_FOUND ──────────────────────────────")
        for r in missing + not_found:
            print(f"  [{r.status:15s}]  {r.file}  »  {r.section}")
            if r.hint:
                print(f"                      hint: {r.hint}")
        print()
        print("── Next Steps ────────────────────────────────────────────")
        print(f"  Read: .context/04-add-language.md")
        print(f"  Guide: .context/change-maps/add-language.yaml")
        print(f"  Then re-run: python tools/scaffold/add_language.py --code {code} --name {name} --check")
        return 1

    print("  All checks PRESENT. Run final validation:")
    print()
    print("  make validate-translations")
    print("  uv run python -m tools.ai_sdlc.detect_mixed_scripts ui/agui/translations.js")
    print(f"  node -c ui/agui/translations.js && node -c ui/agui/dashboard.js")
    print("  make test")
    return 0


def write_evidence(code: str, name: str, results: list[CheckResult], exit_code: int) -> None:
    """Write an evidence artifact to .ai-sdlc/evidence/ using the evidence module."""
    try:
        from tools.ai_sdlc.evidence import get_commit_sha, get_dirty_status, utc_now, write_json
        status = "PASS" if exit_code == 0 else "FAIL"
        missing = [r for r in results if r.status != "PRESENT"]
        artifact = {
            "artifactId": f"language-audit-{code}",
            "artifactType": "language-audit",
            "language_code": code,
            "language_name": name,
            "status": status,
            "generatedAt": utc_now(),
            "commitSha": get_commit_sha(),
            "dirtyStatus": get_dirty_status(),
            "command": f"python tools/scaffold/add_language.py --code {code} --name {name} --check --evidence",
            "total_checks": len(results),
            "present": sum(1 for r in results if r.status == "PRESENT"),
            "missing": len(missing),
            "missing_items": [{"file": r.file, "section": r.section} for r in missing],
        }
        out_path = f".ai-sdlc/evidence/language-audit-{code}.json"
        write_json(out_path, artifact)
        print(f"\n  Evidence written: {out_path}")
    except Exception as exc:
        print(f"\n  WARNING: Could not write evidence artifact: {exc}")


# ─── Entry point ──────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Audit language support completeness in Krishi Sampark.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--code", required=True, help="2-letter language code (e.g. kn)")
    parser.add_argument("--name", required=True, help="English language name (e.g. Kannada)")
    parser.add_argument("--native", default="", help="Native script name (e.g. ಕನ್ನಡ) — for documentation")
    parser.add_argument("--check", action="store_true", default=True, help="Run audit and report (default)")
    parser.add_argument("--evidence", action="store_true", default=False, help="Write evidence artifact to .ai-sdlc/evidence/")

    args = parser.parse_args()

    code = args.code.strip().lower()
    if len(code) != 2:
        print(f"ERROR: --code must be a 2-letter ISO 639-1 code, got: {code!r}", file=sys.stderr)
        sys.exit(2)

    # Refuse to check existing codes
    existing = {"en", "hi", "mr", "te", "sw", "zu"}
    if code in existing:
        print(f"INFO: Language '{code}' is already a supported language.")

    print(f"Auditing language: {args.name} ({code})" + (f" / {args.native}" if args.native else ""))
    print(f"Project root: {ROOT}")

    results = run_audit(code, args.name)
    exit_code = print_report(results, code, args.name)

    if args.evidence:
        write_evidence(code, args.name, results, exit_code)

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
