import datetime as dt
import hashlib
import json
import os
import subprocess
import time
from pathlib import Path
from typing import Any

VALID_STATUSES = {"PASS", "WARNING", "FAIL", "NOT_EXECUTED", "NOT_APPLICABLE"}
REPO_ROOT = Path(__file__).resolve().parents[2]
EVIDENCE_DIR = REPO_ROOT / ".ai-sdlc" / "evidence"
MANIFEST_PATH = EVIDENCE_DIR / "evidence-manifest.json"


def utc_now() -> str:
    return dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat()


def repo_path(path: str | Path) -> Path:
    path = Path(path)
    return path if path.is_absolute() else REPO_ROOT / path


def rel_path(path: str | Path) -> str:
    path = repo_path(path)
    return path.relative_to(REPO_ROOT).as_posix()


def get_commit_sha() -> str:
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    return result.stdout.strip() if result.returncode == 0 else "UNKNOWN"


def get_dirty_status() -> str:
    result = subprocess.run(
        ["git", "status", "--short"],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        return "UNKNOWN"
    return "DIRTY" if result.stdout.strip() else "CLEAN"


def sha256_file(path: str | Path) -> str:
    digest = hashlib.sha256()
    with repo_path(path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_json(path: str | Path, default: Any) -> Any:
    full_path = repo_path(path)
    if not full_path.exists():
        return default
    with full_path.open(encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: str | Path, data: Any) -> None:
    full_path = repo_path(path)
    full_path.parent.mkdir(parents=True, exist_ok=True)
    with full_path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, ensure_ascii=False)
        handle.write("\n")


def write_text(path: str | Path, text: str) -> None:
    full_path = repo_path(path)
    full_path.parent.mkdir(parents=True, exist_ok=True)
    with full_path.open("w", encoding="utf-8") as handle:
        handle.write(text)


def summarize_stream(text: str, max_lines: int = 80) -> str:
    lines = text.splitlines()
    if len(lines) <= max_lines:
        return text
    head = lines[: max_lines // 2]
    tail = lines[-max_lines // 2 :]
    return "\n".join([*head, "... output truncated ...", *tail])


def redact_text(text: str) -> str:
    replacements = [
        ("api_key", "api_key"),
        ("password", "password"),
        ("secret", "secret"),
        ("token", "token"),
    ]
    redacted = text
    for key, label in replacements:
        redacted = redacted.replace(f"{key}=", f"{label}=[REDACTED]")
        redacted = redacted.replace(f"{key}:", f"{label}:[REDACTED]")
    return redacted


def run_command(command: list[str], timeout: int | None = None) -> dict[str, Any]:
    started = utc_now()
    start = time.monotonic()
    try:
        result = subprocess.run(
            command,
            cwd=REPO_ROOT,
            text=True,
            capture_output=True,
            timeout=timeout,
            check=False,
        )
        exit_code = result.returncode
        stdout = redact_text(result.stdout)
        stderr = redact_text(result.stderr)
    except FileNotFoundError as exc:
        exit_code = 127
        stdout = ""
        stderr = str(exc)
    except subprocess.TimeoutExpired as exc:
        exit_code = 124
        stdout = redact_text(exc.stdout or "")
        stderr = redact_text(exc.stderr or "command timed out")
    completed = utc_now()
    return {
        "command": " ".join(command),
        "startedAt": started,
        "completedAt": completed,
        "durationSeconds": round(time.monotonic() - start, 3),
        "exitCode": exit_code,
        "stdoutSummary": summarize_stream(stdout),
        "stderrSummary": summarize_stream(stderr),
    }


def load_manifest() -> dict[str, Any]:
    return load_json(MANIFEST_PATH, {"artifacts": []})


def save_manifest(manifest: dict[str, Any]) -> None:
    write_json(MANIFEST_PATH, manifest)


def register_artifact(
    artifact_id: str,
    artifact_type: str,
    path: str | Path,
    status: str,
    command: str,
    exit_code: int | None,
    source_tool: str,
    generated_at: str | None = None,
    commit_sha: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if status not in VALID_STATUSES:
        raise ValueError(f"Unsupported evidence status: {status}")
    if status == "PASS" and exit_code != 0:
        raise ValueError("PASS evidence requires a successful source command")

    full_path = repo_path(path)
    if not full_path.exists():
        raise FileNotFoundError(f"Evidence artifact does not exist: {path}")

    manifest = load_manifest()
    artifacts = [a for a in manifest.get("artifacts", []) if a.get("artifactId") != artifact_id]
    record = {
        "artifactId": artifact_id,
        "artifactType": artifact_type,
        "path": rel_path(full_path),
        "status": status,
        "generatedAt": generated_at or utc_now(),
        "commitSha": commit_sha or get_commit_sha(),
        "command": command,
        "exitCode": exit_code,
        "sha256": sha256_file(full_path),
        "sourceTool": source_tool,
    }
    if metadata:
        record["metadata"] = metadata
    artifacts.append(record)
    manifest["artifacts"] = sorted(artifacts, key=lambda item: item["artifactId"])
    save_manifest(manifest)
    return record


def validate_manifest(allow_stale: bool = False) -> tuple[bool, list[str]]:
    manifest = load_manifest()
    current_commit = get_commit_sha()
    errors: list[str] = []
    seen: set[str] = set()
    for artifact in manifest.get("artifacts", []):
        artifact_id = artifact.get("artifactId", "")
        if artifact_id in seen:
            errors.append(f"duplicate artifact ID: {artifact_id}")
        seen.add(artifact_id)

        path = artifact.get("path")
        if not path or not repo_path(path).exists():
            errors.append(f"missing artifact path for {artifact_id}: {path}")
            continue
        if artifact.get("sha256") != sha256_file(path):
            errors.append(f"sha256 mismatch for {artifact_id}")
        if not allow_stale and artifact.get("commitSha") != current_commit:
            errors.append(f"stale artifact for {artifact_id}: {artifact.get('commitSha')}")
        if artifact.get("status") == "PASS" and artifact.get("exitCode") != 0:
            errors.append(f"invalid PASS artifact without zero exit: {artifact_id}")
    return not errors, errors


def main() -> int:
    ok, errors = validate_manifest(allow_stale=os.getenv("AI_SDLC_ALLOW_STALE") == "1")
    if ok:
        print("Evidence manifest verified.")
        return 0
    for error in errors:
        print(f"Evidence manifest error: {error}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
