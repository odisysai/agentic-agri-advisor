import argparse
import subprocess
import sys


def run_module(module_name: str, *args: str) -> int:
    command = [sys.executable, "-m", f"tools.ai_sdlc.{module_name}", *args]
    result = subprocess.run(command, check=False)
    return result.returncode


def combine(codes: list[int]) -> int:
    return 1 if any(code != 0 for code in codes) else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Krishi Sampark AI-SDLC CLI")
    subparsers = parser.add_subparsers(dest="command")

    validate = subparsers.add_parser("validate")
    validate.add_argument("--all", action="store_true")
    validate.add_argument("--schemas", action="store_true")
    validate.add_argument("--translations", action="store_true")
    validate.add_argument("--safety", action="store_true")

    subparsers.add_parser("requirements")

    test = subparsers.add_parser("test")
    test.add_argument("--evidence", action="store_true")

    security = subparsers.add_parser("security")
    security.add_argument("--all", action="store_true")
    security.add_argument("--secrets", action="store_true")
    security.add_argument("--dependencies", action="store_true")
    security.add_argument("--sast", action="store_true")
    security.add_argument("--container", action="store_true")

    subparsers.add_parser("safety")

    evidence = subparsers.add_parser("evidence")
    evidence.add_argument("--verify", action="store_true")

    release = subparsers.add_parser("release")
    release.add_argument("--version", default="1.0.0")
    release.add_argument("--report", action="store_true")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        return 2

    try:
        if args.command == "validate":
            run_all = args.all or not (args.schemas or args.translations or args.safety)
            codes = []
            if run_all or args.schemas:
                codes.append(run_module("validate_schemas"))
            if run_all or args.translations:
                codes.append(run_module("validate_translations"))
                codes.append(run_module("detect_mixed_scripts"))
            if run_all or args.safety:
                codes.append(run_module("validate_safety_policies"))
            return combine(codes)

        if args.command == "requirements":
            return run_module("generate_traceability")

        if args.command == "test":
            if args.evidence:
                return run_module("collect_test_evidence")
            return subprocess.run([sys.executable, "-m", "pytest", "tests/", "--ignore=scratch/"], check=False).returncode

        if args.command == "security":
            run_all = args.all or not (
                args.secrets or args.dependencies or args.sast or args.container
            )
            codes = []
            if run_all or args.secrets:
                codes.append(run_module("run_secret_scan"))
            if run_all or args.dependencies:
                codes.append(run_module("run_dependency_scan"))
            if run_all or args.sast:
                codes.append(run_module("run_sast_scan"))
            if run_all or args.container:
                codes.append(run_module("run_container_scan"))
            return combine(codes)

        if args.command == "safety":
            return run_module("validate_safety_policies")

        if args.command == "evidence":
            if args.verify:
                return run_module("evidence")
            codes = [
                run_module("collect_test_evidence"),
                run_module("generate_traceability"),
                run_module("validate_safety_policies"),
            ]
            return combine(codes)

        if args.command == "release":
            scorecard = run_module("generate_quality_scorecard")
            report = run_module("generate_release_report", "--version", args.version)
            return combine([scorecard, report])

    except Exception as exc:
        print(f"AI-SDLC CLI error: {exc}", file=sys.stderr)
        return 1

    parser.print_help()
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
