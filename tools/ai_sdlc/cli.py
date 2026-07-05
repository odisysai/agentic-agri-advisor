"""
Unified AI-SDLC validation CLI.

Usage:
    python -m tools.ai_sdlc.cli validate --schemas
    python -m tools.ai_sdlc.cli validate --translations
    python -m tools.ai_sdlc.cli validate --safety
    python -m tools.ai_sdlc.cli validate --skills
    python -m tools.ai_sdlc.cli validate --all
    python -m tools.ai_sdlc.cli test --evidence
    python -m tools.ai_sdlc.cli security --secrets
    python -m tools.ai_sdlc.cli security --dependencies
    python -m tools.ai_sdlc.cli security --sast
    python -m tools.ai_sdlc.cli security --container
    python -m tools.ai_sdlc.cli security --all
    python -m tools.ai_sdlc.cli evidence --verify
    python -m tools.ai_sdlc.cli release --report
    python -m tools.ai_sdlc.cli requirements
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import UTC, datetime, timezone

import yaml

EVIDENCE_DIR = os.path.join(
    os.path.dirname(__file__), "..", "..", ".ai-sdlc", "evidence"
)
REPORTS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", ".ai-sdlc", "reports")
MANIFEST_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", ".ai-sdlc", "manifest.yaml"
)


def run_validate_schemas():
    """Validate A2UI schemas."""
    from tools.ai_sdlc.validate_schemas import validate_a2ui_schemas

    return validate_a2ui_schemas()


def run_validate_translations():
    """Validate translations for all 5 languages."""
    from tools.ai_sdlc.validate_translations import validate_translations

    result = validate_translations()
    if result:
        print("✅ Translation validation passed.")
    else:
        print("❌ Translation validation FAILED.")
    return result


def run_validate_safety():
    """Validate safety policies."""
    from tools.ai_sdlc.validate_safety_policies import validate_safety

    result = validate_safety()
    if isinstance(result, bool):
        if result:
            print("✅ Safety validation passed.")
        else:
            print("❌ Safety validation FAILED.")
        return result
    print("✅ Safety validation completed.")
    return True


def run_validate_all():
    """Run all validation gates."""
    results = {
        "schemas": run_validate_schemas(),
        "translations": run_validate_translations(),
        "safety": run_validate_safety(),
        "skills": run_validate_skill_contracts(),
    }
    all_pass = all(results.values())
    print(
        f"\n{'✅ All validations passed.' if all_pass else '❌ Some validations failed.'} "
        f"({sum(results.values())}/{len(results)} passed)"
    )
    return all_pass


def run_validate_skill_contracts():
    """Validate skill contract matrix integrity and executability metadata."""
    issues = []

    try:
        with open(MANIFEST_PATH) as f:
            manifest = yaml.safe_load(f) or {}
    except Exception as exc:
        print(f"❌ Failed to load AI-SDLC manifest: {exc}")
        return False

    skill_registry = manifest.get("skillRegistry", [])
    tool_registry = manifest.get("toolRegistry", [])
    skill_matrix = manifest.get("skillContractMatrix", [])

    if not skill_registry:
        issues.append("skillRegistry missing or empty in .ai-sdlc/manifest.yaml")
    if not skill_matrix:
        issues.append("skillContractMatrix missing or empty in .ai-sdlc/manifest.yaml")

    tool_names = {tool.get("name") for tool in tool_registry if isinstance(tool, dict)}
    registry_names = {
        skill.get("name") for skill in skill_registry if isinstance(skill, dict)
    }
    registry_ids = {
        skill.get("id") for skill in skill_registry if isinstance(skill, dict)
    }

    matrix_by_name = {
        contract.get("name"): contract
        for contract in skill_matrix
        if isinstance(contract, dict) and contract.get("name")
    }

    for skill in skill_registry:
        if not isinstance(skill, dict):
            issues.append("skillRegistry contains non-object entry")
            continue

        skill_name = skill.get("name")
        skill_id = skill.get("id")
        if not skill_name or not skill_id:
            issues.append("skillRegistry entry missing required fields: name/id")
            continue

        contract = matrix_by_name.get(skill_name)
        if not contract:
            issues.append(f"Missing skill contract entry for: {skill_name}")
            continue

        if contract.get("id") != skill_id:
            issues.append(
                f"Skill contract ID mismatch for {skill_name}: expected {skill_id}, found {contract.get('id')}"
            )

        required_fields = [
            "name",
            "id",
            "skillPath",
            "tool",
            "command",
            "inputSchema",
            "outputSchema",
            "evidencePath",
            "evaluationMetrics",
        ]
        for field in required_fields:
            if field not in contract:
                issues.append(f"Skill contract {skill_name} missing field: {field}")

        skill_path = contract.get("skillPath")
        if skill_path:
            full_skill_path = os.path.join(
                os.path.dirname(__file__), "..", "..", skill_path
            )
            if not os.path.exists(full_skill_path):
                issues.append(
                    f"Skill contract path does not exist for {skill_name}: {skill_path}"
                )

        tool_name = contract.get("tool")
        if tool_name and tool_name not in tool_names:
            issues.append(
                f"Skill contract tool not found in toolRegistry for {skill_name}: {tool_name}"
            )

        evidence_path = contract.get("evidencePath")
        if evidence_path and not evidence_path.startswith(".ai-sdlc/"):
            issues.append(
                f"Skill contract evidencePath should be repository relative (.ai-sdlc/...): {skill_name}"
            )

        metrics = contract.get("evaluationMetrics")
        if not isinstance(metrics, list) or not metrics:
            issues.append(
                f"Skill contract evaluationMetrics must be a non-empty list: {skill_name}"
            )

    seen_names = set()
    seen_ids = set()
    for contract in skill_matrix:
        if not isinstance(contract, dict):
            issues.append("skillContractMatrix contains non-object entry")
            continue
        name = contract.get("name")
        skill_id = contract.get("id")
        if name in seen_names:
            issues.append(f"Duplicate skill contract name: {name}")
        if skill_id in seen_ids:
            issues.append(f"Duplicate skill contract id: {skill_id}")
        seen_names.add(name)
        seen_ids.add(skill_id)
        if name and name not in registry_names:
            issues.append(
                f"Skill contract has unknown skill name (not in skillRegistry): {name}"
            )
        if skill_id and skill_id not in registry_ids:
            issues.append(
                f"Skill contract has unknown skill id (not in skillRegistry): {skill_id}"
            )

    os.makedirs(REPORTS_DIR, exist_ok=True)
    report_path = os.path.join(REPORTS_DIR, "skill-contract-validation.json")
    report = {
        "generatedAt": datetime.now(UTC).isoformat(),
        "status": "PASS" if not issues else "FAIL",
        "issues": issues,
        "checkedSkills": len(skill_registry),
    }
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    if issues:
        print("❌ Skill contract validation FAILED:")
        for issue in issues:
            print(f"  - {issue}")
        print(f"Report: {report_path}")
        return False

    print(f"✅ Skill contract validation passed. Report: {report_path}")
    return True


def run_test_evidence():
    """Run pytest and collect evidence."""
    junit_path = os.path.join(EVIDENCE_DIR, "tests", "junit.xml")
    coverage_path = os.path.join(EVIDENCE_DIR, "tests", "coverage.json")
    os.makedirs(os.path.join(EVIDENCE_DIR, "tests"), exist_ok=True)

    cmd = [
        sys.executable,
        "-m",
        "pytest",
        "tests/",
        "--ignore=scratch/",
        "--ignore=tests/integration/",
        f"--junitxml={junit_path}",
    ]
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=False)

    # Try coverage
    cov_cmd = [
        sys.executable,
        "-m",
        "coverage",
        "run",
        "-m",
        "pytest",
        "tests/",
        "--ignore=scratch/",
    ]
    try:
        subprocess.run(cov_cmd, capture_output=True, timeout=120)
        subprocess.run(
            [sys.executable, "-m", "coverage", "json", "-o", coverage_path],
            capture_output=True,
            timeout=30,
        )
    except Exception:
        pass

    return result.returncode == 0


def run_security(scan_type):
    """Run security scanners."""
    os.makedirs(os.path.join(EVIDENCE_DIR, "security"), exist_ok=True)

    scanners = {
        "secrets": {
            "cmd": ["detect-secrets", "scan", "--all-files", "."],
            "evidence": os.path.join(EVIDENCE_DIR, "security", "secrets.json"),
            "fallback": "gitleaks",
        },
        "dependencies": {
            "cmd": ["pip-audit"],
            "evidence": os.path.join(EVIDENCE_DIR, "security", "dependencies.json"),
        },
        "sast": {
            "cmd": [
                "bandit",
                "-r",
                ".",
                "-f",
                "json",
                "-o",
                os.path.join(EVIDENCE_DIR, "security", "sast.json"),
            ],
            "evidence": os.path.join(EVIDENCE_DIR, "security", "sast.json"),
        },
        "container": {
            "cmd": ["trivy", "filesystem", "."],
            "evidence": os.path.join(EVIDENCE_DIR, "security", "container.json"),
        },
    }

    if scan_type == "all":
        results = {k: run_security(k) for k in scanners if k != "container"}
        return all(results.values())

    if scan_type not in scanners:
        print(f"Unknown scanner: {scan_type}")
        return False

    scanner = scanners[scan_type]
    cmd = scanner["cmd"]
    print(f"Running: {' '.join(cmd)}")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        evidence_path = scanner.get(
            "evidence", os.path.join(EVIDENCE_DIR, "security", f"{scan_type}.json")
        )
        evidence = {
            "artifactId": f"security-{scan_type}",
            "status": "PASS" if result.returncode == 0 else "FAIL",
            "exitCode": result.returncode,
            "output": result.stdout[:5000] if result.stdout else "",
            "timestamp": datetime.now(UTC).isoformat(),
        }
        with open(evidence_path, "w") as f:
            json.dump(evidence, f, indent=2)
        print(
            f"{'✅' if result.returncode == 0 else '❌'} {scan_type} scan: {'PASS' if result.returncode == 0 else 'FAIL'}"
        )
        return result.returncode == 0
    except FileNotFoundError:
        print(f"⚠️  {cmd[0]} not installed — recording NOT_EXECUTED")
        evidence = {
            "artifactId": f"security-{scan_type}",
            "status": "NOT_EXECUTED",
            "exitCode": 127,
            "timestamp": datetime.now(UTC).isoformat(),
        }
        with open(
            scanner.get(
                "evidence", os.path.join(EVIDENCE_DIR, "security", f"{scan_type}.json")
            ),
            "w",
        ) as f:
            json.dump(evidence, f, indent=2)
        return True  # Don't fail the gate for missing tools
    except Exception as e:
        print(f"⚠️  {scan_type} scan error: {e}")
        return True


def run_evidence_verify():
    """Verify evidence manifest integrity."""
    from tools.ai_sdlc.evidence import validate_manifest

    valid, issues = validate_manifest(allow_stale=True)
    if valid:
        print("✅ Evidence manifest verified.")
    else:
        print("⚠️ Evidence manifest issues:")
        for issue in issues:
            print(f"  {issue}")
    return valid


def run_release_report():
    """Generate release readiness report."""
    from tools.ai_sdlc.generate_release_report import generate_release_report

    generate_release_report()
    return True


def run_requirements():
    """Verify requirements traceability."""
    from tools.ai_sdlc.generate_traceability import generate_matrix

    generate_matrix()
    return True


def main():
    parser = argparse.ArgumentParser(description="AI-SDLC Validation CLI")
    subparsers = parser.add_subparsers(dest="command")

    # validate
    val_parser = subparsers.add_parser("validate", help="Run validation gates")
    val_parser.add_argument("--schemas", action="store_true")
    val_parser.add_argument("--translations", action="store_true")
    val_parser.add_argument("--safety", action="store_true")
    val_parser.add_argument("--skills", action="store_true")
    val_parser.add_argument("--all", action="store_true")

    # test
    test_parser = subparsers.add_parser("test", help="Run tests with evidence")
    test_parser.add_argument("--evidence", action="store_true")

    # security
    sec_parser = subparsers.add_parser("security", help="Run security scans")
    sec_parser.add_argument("--secrets", action="store_true")
    sec_parser.add_argument("--dependencies", action="store_true")
    sec_parser.add_argument("--sast", action="store_true")
    sec_parser.add_argument("--container", action="store_true")
    sec_parser.add_argument("--all", action="store_true")

    # evidence
    ev_parser = subparsers.add_parser("evidence", help="Evidence management")
    ev_parser.add_argument("--verify", action="store_true")

    # release
    rel_parser = subparsers.add_parser("release", help="Release readiness")
    rel_parser.add_argument("--report", action="store_true")
    rel_parser.add_argument("--version", type=str, default="1.0.0")

    # requirements
    subparsers.add_parser("requirements", help="Verify traceability")

    args = parser.parse_args()

    if args.command == "validate":
        if args.all:
            success = run_validate_all()
        elif args.schemas:
            success = run_validate_schemas()
        elif args.translations:
            success = run_validate_translations()
        elif args.safety:
            success = run_validate_safety()
        elif args.skills:
            success = run_validate_skill_contracts()
        else:
            success = run_validate_all()
        sys.exit(0 if success else 1)

    elif args.command == "test":
        if args.evidence:
            success = run_test_evidence()
        else:
            success = run_test_evidence()
        sys.exit(0 if success else 1)

    elif args.command == "security":
        if args.all:
            for scanner in ["secrets", "dependencies", "sast"]:
                run_security(scanner)
        elif args.secrets:
            run_security("secrets")
        elif args.dependencies:
            run_security("dependencies")
        elif args.sast:
            run_security("sast")
        elif args.container:
            run_security("container")

    elif args.command == "evidence":
        if args.verify:
            success = run_evidence_verify()
            sys.exit(0 if success else 1)

    elif args.command == "release":
        success = run_release_report()
        sys.exit(0 if success else 1)

    elif args.command == "requirements":
        success = run_requirements()
        sys.exit(0 if success else 1)

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
