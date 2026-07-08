"""Per-user content storage helpers.

Cloud Storage does not create real directories, so user folders are represented
with stable object prefixes:
users/{farmer_id}/{category}/{YYYY}/{MM}/{uuid}_{filename}
"""

from __future__ import annotations

import os
import re
import uuid
from datetime import UTC, datetime

MAX_UPLOAD_BYTES = int(os.getenv("USER_CONTENT_MAX_UPLOAD_BYTES", "20971520"))
DEFAULT_BUCKET_ENV_KEYS = (
    "USER_CONTENT_BUCKET_NAME",
    "CONTENT_BUCKET_NAME",
)
ALLOWED_CATEGORIES = {
    "soil_reports",
    "crop_photos",
    "expert_uploads",
    "reports",
    "profile_documents",
}


def sanitize_path_part(value: str, fallback: str = "unknown") -> str:
    """Return a safe path component for GCS object names."""
    cleaned = re.sub(r"[^A-Za-z0-9_.-]+", "_", (value or "").strip())
    cleaned = cleaned.strip("._-")
    return cleaned[:96] or fallback


def resolve_content_bucket_name() -> str:
    """Resolve the configured user-content bucket name."""
    for key in DEFAULT_BUCKET_ENV_KEYS:
        value = os.getenv(key, "").strip()
        if value:
            return value
    return ""


def build_user_content_object_name(
    farmer_id: str,
    category: str,
    file_name: str,
    now: datetime | None = None,
) -> str:
    """Build the canonical object path for a farmer-owned content file."""
    if category not in ALLOWED_CATEGORIES:
        raise ValueError(f"Unsupported content category: {category}")

    timestamp = now or datetime.now(UTC)
    safe_farmer_id = sanitize_path_part(farmer_id, "user")
    safe_file_name = sanitize_path_part(file_name, "upload.bin")
    unique_prefix = uuid.uuid4().hex[:12]
    return (
        f"users/{safe_farmer_id}/{category}/"
        f"{timestamp:%Y}/{timestamp:%m}/{unique_prefix}_{safe_file_name}"
    )


def upload_user_content(
    *,
    farmer_id: str,
    category: str,
    file_name: str,
    content: bytes,
    content_type: str = "application/octet-stream",
    metadata: dict | None = None,
) -> dict:
    """Upload a farmer content object to Cloud Storage.

    If no content bucket is configured, returns a NOT_CONFIGURED result instead
    of failing the farmer workflow.
    """
    bucket_name = resolve_content_bucket_name()
    object_name = build_user_content_object_name(farmer_id, category, file_name)
    size_bytes = len(content or b"")

    base_result = {
        "status": "not_configured",
        "bucket": bucket_name,
        "object_name": object_name,
        "gcs_uri": f"gs://{bucket_name}/{object_name}" if bucket_name else "",
        "public_url": "",
        "size_bytes": size_bytes,
        "content_type": content_type,
    }

    if size_bytes > MAX_UPLOAD_BYTES:
        raise ValueError(
            f"Upload exceeds max size of {MAX_UPLOAD_BYTES} bytes: {size_bytes}"
        )

    if not bucket_name:
        return base_result

    from google.cloud import storage

    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(object_name)
    blob.metadata = {
        "farmer_id": sanitize_path_part(farmer_id, "user"),
        "category": category,
        **(metadata or {}),
    }
    blob.upload_from_string(content, content_type=content_type)

    return {
        **base_result,
        "status": "uploaded",
        "public_url": "",
    }
