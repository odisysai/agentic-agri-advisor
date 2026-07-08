"""Upload browser model assets to the Krishi Sampark Cloud Storage assets bucket."""

from __future__ import annotations

import argparse
import shutil
import subprocess
from pathlib import Path

DEFAULT_PROJECT_NAME = "agentic-agri-advisor"
GEMMA_OBJECT = "models/gemma-4-E2B-it-web.litertlm"
CLASSIFIER_OBJECT = "models/crop_disease_classifier.tflite"


def resolve_bucket(args: argparse.Namespace) -> str:
    if args.bucket:
        return args.bucket
    if args.project_id:
        return f"{args.project_id}-{args.project_name}-assets"
    raise SystemExit("Provide --bucket or --project-id.")


def upload_file(source: Path, bucket: str, object_name: str, dry_run: bool) -> None:
    if not source.exists():
        raise SystemExit(f"Missing model file: {source}")
    if not source.is_file():
        raise SystemExit(f"Model path is not a file: {source}")

    destination = f"gs://{bucket}/{object_name}"
    command = ["gcloud", "storage", "cp", str(source), destination]
    print(" ".join(command))
    if not dry_run:
        subprocess.run(command, check=True)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Upload Gemma and crop classifier model files to the assets bucket."
    )
    parser.add_argument("--project-id", help="GCP project id used by Terraform.")
    parser.add_argument(
        "--project-name",
        default=DEFAULT_PROJECT_NAME,
        help=f"Terraform project_name. Default: {DEFAULT_PROJECT_NAME}",
    )
    parser.add_argument("--bucket", help="Explicit assets bucket name.")
    parser.add_argument(
        "--gemma",
        type=Path,
        help="Path to gemma-4-E2B-it-web.litertlm.",
    )
    parser.add_argument(
        "--classifier",
        type=Path,
        help="Path to crop_disease_classifier.tflite.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print commands and URLs without uploading.",
    )
    args = parser.parse_args()

    if not args.gemma and not args.classifier:
        raise SystemExit("Provide at least one of --gemma or --classifier.")
    if not args.dry_run and not shutil.which("gcloud"):
        raise SystemExit(
            "gcloud CLI not found. Install Google Cloud SDK or use --dry-run."
        )

    bucket = resolve_bucket(args)

    if args.gemma:
        upload_file(args.gemma, bucket, GEMMA_OBJECT, args.dry_run)
    if args.classifier:
        upload_file(args.classifier, bucket, CLASSIFIER_OBJECT, args.dry_run)

    base_url = f"https://storage.googleapis.com/{bucket}/models"
    print("\nModel asset configuration:")
    print(f"MODEL_ASSETS_BASE_URL={base_url}")
    print(f"KRISHI_LOCAL_MODEL_URL={base_url}/gemma-4-E2B-it-web.litertlm")
    print(f"KRISHI_CROP_CLASSIFIER_MODEL_URL={base_url}/crop_disease_classifier.tflite")
    print("\nExpected bucket:")
    print(bucket)


if __name__ == "__main__":
    main()
