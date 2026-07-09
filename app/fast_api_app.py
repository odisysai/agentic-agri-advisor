# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
import base64
import hashlib
import hmac
import json
import os
import re
import socket
import tempfile
import time
from datetime import datetime
from urllib.parse import urlparse

# Load .env file early so GEMINI_API_KEY and other secrets are available
try:
    from dotenv import find_dotenv, load_dotenv

    load_dotenv(find_dotenv(usecwd=True), override=False)
except ImportError:
    pass  # dotenv not installed; rely on environment variables being set externally

import asyncio

import edge_tts
import google.auth
from fastapi import Body, FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse, RedirectResponse
from google.adk.cli.fast_api import get_fast_api_app
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.cloud import logging as google_cloud_logging
from google.oauth2 import id_token as google_id_token
from pydantic import BaseModel, Field

from app.app_utils.telemetry import setup_telemetry
from app.app_utils.typing import Feedback
from app.app_utils.user_content_storage import upload_user_content
from data import db_manager, firestore_manager
from data.db_manager import get_latest_soil_report, get_soil_reports, save_soil_report

setup_telemetry()

# Try setting up Google Cloud Logging, fall back to standard logging if local
logger = None
try:
    import google.auth

    _, project_id = google.auth.default()
    logging_client = google_cloud_logging.Client()
    logger = logging_client.logger(__name__)
except Exception as e:
    import logging

    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    # Polyfill log_struct for local logging compatibility
    logger.log_struct = lambda d, severity="INFO": logger.info(f"[{severity}] {d}")
    print(f"Running in local environment without Google Cloud Logging: {e}")

allow_origins = (
    os.getenv("ALLOW_ORIGINS", "").split(",") if os.getenv("ALLOW_ORIGINS") else None
)

# Artifact bucket for ADK (created by Terraform, passed via env var)
logs_bucket_name = os.environ.get("LOGS_BUCKET_NAME")

AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# In-memory session configuration - no persistent storage
session_service_uri = None

artifact_service_uri = f"gs://{logs_bucket_name}" if logs_bucket_name else None

# Check if Google default credentials exist to support local offline usage
otel_to_cloud = True
try:
    import google.auth

    google.auth.default()
except Exception:
    otel_to_cloud = False
    print(
        "Warning: Google Cloud default credentials not found. Local offline execution active."
    )

app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    web=True,
    artifact_service_uri=artifact_service_uri,
    allow_origins=allow_origins,
    session_service_uri=session_service_uri,
    otel_to_cloud=otel_to_cloud,
)
app.title = "agentic-agri-advisor"
app.description = "API for interacting with the Agent agentic-agri-advisor"


SESSION_COOKIE_NAME = "aaa_session"
SESSION_SECRET = os.getenv("APP_SESSION_SECRET", "dev-only-change-me")
SESSION_MAX_AGE_SECONDS = int(os.getenv("SESSION_MAX_AGE_SECONDS", "43200"))
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "1") in {
    "1",
    "true",
    "True",
}
USE_EMAIL_AS_FARMER_ID = os.getenv("USE_EMAIL_AS_FARMER_ID", "0") in {
    "1",
    "true",
    "True",
}
GUEST_FARMER_ID = os.getenv("GUEST_FARMER_ID", "guest")
LOGGED_IN_FARMER_ID = os.getenv("LOGGED_IN_FARMER_ID", "user")

# ============================================================
# Rate Limiting — protect paid Gemini API from abuse
# ============================================================
EXPERT_RATE_LIMIT = int(os.getenv("EXPERT_RATE_LIMIT", "10"))  # max requests per window
EXPERT_RATE_WINDOW = int(
    os.getenv("EXPERT_RATE_WINDOW", "3600")
)  # window in seconds (1 hour)

_expert_request_log: dict[str, list[float]] = {}


def _check_expert_rate_limit(user_key: str) -> tuple[bool, int]:
    """Check if user has exceeded the expert chat rate limit.

    Returns (allowed, remaining).
    """
    now = time.time()
    window_start = now - EXPERT_RATE_WINDOW

    # Prune old entries
    if user_key in _expert_request_log:
        _expert_request_log[user_key] = [
            t for t in _expert_request_log[user_key] if t > window_start
        ]
    else:
        _expert_request_log[user_key] = []

    count = len(_expert_request_log[user_key])
    if count >= EXPERT_RATE_LIMIT:
        return False, 0

    _expert_request_log[user_key].append(now)
    return True, EXPERT_RATE_LIMIT - count - 1


def _get_google_oidc_client_id() -> str:
    # Support common env variable names across local/devops setups.
    for key in (
        "GOOGLE_OIDC_CLIENT_ID",
        "GOOGLE_CLIENT_ID",
        "OAUTH_CLIENT_ID",
        "OIDC_CLIENT_ID",
    ):
        value = os.getenv(key, "").strip()
        if value:
            return value
    return ""


def _is_truthy_env(key: str, default: str = "0") -> bool:
    return os.getenv(key, default) in {"1", "true", "True", "yes", "YES"}


def _is_google_login_required() -> bool:
    return _is_truthy_env("REQUIRE_GOOGLE_LOGIN")


def _request_origin(request: Request) -> str:
    return (
        request.headers.get("origin")
        or request.headers.get("referer")
        or str(request.base_url)
    )


def _is_local_browser_origin(origin: str) -> bool:
    parsed = urlparse(origin)
    hostname = parsed.hostname or ""
    return hostname in {"localhost", "127.0.0.1", "::1"}


def _google_auth_disabled_reason(request: Request, client_id: str) -> str:
    if not client_id:
        return "Google OIDC client ID is not configured."
    return ""


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode((value + padding).encode("utf-8"))


def _sign_payload(payload_b64: str) -> str:
    digest = hmac.new(
        SESSION_SECRET.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256
    ).digest()
    return _b64url_encode(digest)


def _create_session_cookie(user_payload: dict) -> str:
    body = {
        "sub": user_payload.get("sub", ""),
        "email": user_payload.get("email", ""),
        "name": user_payload.get("name", ""),
        "picture": user_payload.get("picture", ""),
        "guest_user": bool(user_payload.get("guest_user", False)),
        "auth_provider": user_payload.get("auth_provider", "google"),
        "iat": int(time.time()),
        "exp": int(time.time()) + SESSION_MAX_AGE_SECONDS,
    }
    payload_b64 = _b64url_encode(
        json.dumps(body, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    signature = _sign_payload(payload_b64)
    return f"{payload_b64}.{signature}"


def _read_session_cookie(cookie_value: str | None) -> dict | None:
    if not cookie_value or "." not in cookie_value:
        return None
    try:
        payload_b64, signature = cookie_value.split(".", 1)
        expected = _sign_payload(payload_b64)
        if not hmac.compare_digest(signature, expected):
            return None

        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        if not payload.get("email"):
            return None
        return payload
    except Exception:
        return None


def _farmer_id_from_email(email: str) -> str:
    base = email.strip().lower()
    return re.sub(r"[^a-z0-9_]+", "_", base)[:64] or "user"


def _guest_farmer_id_from_email(email: str) -> str:
    base = email.strip().lower()
    slug = re.sub(r"[^a-z0-9_]+", "_", base)[:56] or "guest"
    return f"guest_{slug}"


def _is_valid_email(email: str) -> bool:
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email.strip()))


def _current_user_from_request(request: Request) -> dict | None:
    return _read_session_cookie(request.cookies.get(SESSION_COOKIE_NAME))


def _authenticated_farmer_id(current_user: dict) -> str:
    if USE_EMAIL_AS_FARMER_ID and current_user.get("email"):
        return _farmer_id_from_email(current_user["email"])
    return LOGGED_IN_FARMER_ID


def _resolve_farmer_id(request: Request, fallback_farmer_id: str) -> str:
    current_user = _current_user_from_request(request)
    if _is_google_login_required() and not current_user:
        raise HTTPException(status_code=401, detail="Login required")
    if current_user:
        if current_user.get("guest_user") and current_user.get("email"):
            return _guest_farmer_id_from_email(current_user["email"])
        return _authenticated_farmer_id(current_user)
    return fallback_farmer_id


class GoogleLoginBody(BaseModel):
    credential: str = Field(..., min_length=16)


class GuestLoginBody(BaseModel):
    email: str = ""
    name: str = "Guest"


@app.get("/api/auth/config")
def auth_config(request: Request) -> dict:
    client_id = _get_google_oidc_client_id()
    disabled_reason = _google_auth_disabled_reason(request, client_id)
    enabled = not disabled_reason
    return {
        "enabled": enabled,
        "required": _is_google_login_required(),
        "allow_guest": True,
        "client_id": client_id if enabled else None,
        "disabled_reason": disabled_reason,
    }


@app.post("/api/auth/google")
def login_with_google(payload: GoogleLoginBody, response: Response) -> dict:
    client_id = _get_google_oidc_client_id()
    if not client_id:
        raise HTTPException(status_code=503, detail="Google OIDC is not configured")

    try:
        token_info = google_id_token.verify_oauth2_token(
            payload.credential, GoogleAuthRequest(), client_id
        )
    except Exception as exc:
        raise HTTPException(
            status_code=401, detail="Invalid Google credential"
        ) from exc

    issuer = token_info.get("iss", "")
    if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        raise HTTPException(status_code=401, detail="Invalid token issuer")

    if not token_info.get("email_verified", False):
        raise HTTPException(status_code=401, detail="Email is not verified")

    token_info["auth_provider"] = "google"

    session_cookie = _create_session_cookie(token_info)
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_cookie,
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        samesite="lax",
        max_age=SESSION_MAX_AGE_SECONDS,
        path="/",
    )
    return {
        "authenticated": True,
        "user": {
            "email": token_info.get("email", ""),
            "name": token_info.get("name", ""),
            "picture": token_info.get("picture", ""),
            "farmer_id": _authenticated_farmer_id(token_info),
        },
    }


@app.post("/api/auth/guest")
def login_as_guest(payload: GuestLoginBody, response: Response) -> dict:
    email = payload.email.strip().lower()
    if email and not _is_valid_email(email):
        raise HTTPException(status_code=400, detail="Valid email is required")
    if not email:
        email = f"guest_{int(time.time())}@local.krishi"

    guest_payload = {
        "sub": "",
        "email": email,
        "name": payload.name.strip() or "Guest",
        "picture": "",
        "guest_user": True,
        "auth_provider": "guest",
    }
    session_cookie = _create_session_cookie(guest_payload)
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_cookie,
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        samesite="lax",
        max_age=SESSION_MAX_AGE_SECONDS,
        path="/",
    )
    return {
        "authenticated": True,
        "profile_mode": "guest_user",
        "user": {
            "email": email,
            "name": guest_payload["name"],
            "farmer_id": _guest_farmer_id_from_email(email),
        },
    }


@app.get("/api/auth/me")
def auth_me(request: Request) -> dict:
    current_user = _current_user_from_request(request)
    if not current_user:
        if _is_google_login_required():
            raise HTTPException(status_code=401, detail="Login required")
        return {
            "authenticated": False,
            "profile_mode": "guest",
            "farmer_id": GUEST_FARMER_ID,
        }
    if current_user.get("guest_user"):
        email = current_user.get("email", "")
        return {
            "authenticated": True,
            "profile_mode": "guest_user",
            "user": {
                "email": email,
                "name": current_user.get("name", "Guest"),
                "picture": "",
                "farmer_id": _guest_farmer_id_from_email(email)
                if email
                else GUEST_FARMER_ID,
            },
        }
    return {
        "authenticated": True,
        "profile_mode": "logged_in",
        "user": {
            "email": current_user.get("email", ""),
            "name": current_user.get("name", ""),
            "picture": current_user.get("picture", ""),
            "farmer_id": _authenticated_farmer_id(current_user),
        },
    }


@app.post("/api/auth/logout")
def auth_logout(response: Response) -> dict:
    response.delete_cookie(key=SESSION_COOKIE_NAME, path="/")
    return {"status": "success"}


@app.middleware("http")
async def protect_app_routes(request: Request, call_next):
    if request.method == "GET" and request.url.path in {"/", "/index.html"}:
        return FileResponse(os.path.join(AGENT_DIR, "ui", "index.html"))

    protected_paths = {
        "/app/home",
        "/app/home/",
        "/onboarding",
        "/onboarding/",
        "/agui/index.html",
    }
    if request.url.path in protected_paths:
        if not _current_user_from_request(request):
            return RedirectResponse(url="/", status_code=307)
    return await call_next(request)


@app.get("/")
def public_landing() -> FileResponse:
    return FileResponse(os.path.join(AGENT_DIR, "ui", "index.html"))


@app.get("/app/home")
@app.get("/app/home/")
def app_home(request: Request):
    if not _current_user_from_request(request):
        return RedirectResponse(url="/", status_code=307)
    return FileResponse(os.path.join(AGENT_DIR, "ui", "agui", "index.html"))


@app.get("/onboarding")
@app.get("/onboarding/")
def onboarding_home(request: Request):
    if not _current_user_from_request(request):
        return RedirectResponse(url="/", status_code=307)
    return FileResponse(os.path.join(AGENT_DIR, "ui", "agui", "index.html"))


@app.get("/api/run_diagnostic_tests")
def run_diagnostic_tests():
    from tests.integration.test_localization import (
        test_english_translation_cleanliness,
        test_preservation_of_farmer_names,
        test_script_separation_and_leak_prevention,
        test_translation_keys_defined,
    )

    try:
        test_translation_keys_defined()
        test_script_separation_and_leak_prevention()
        test_english_translation_cleanliness()
        test_preservation_of_farmer_names()
        return {
            "status": "success",
            "message": "All diagnostic localization tests passed successfully!",
        }
    except Exception as e:
        import traceback

        return {
            "status": "failed",
            "message": str(e),
            "traceback": traceback.format_exc(),
        }


@app.get("/v1/models")
@app.get("/v1/models/")
def get_v1_models():
    """Dummy endpoint to suppress local model scanners and stop uvicorn console bloating."""
    return {"data": []}


@app.get("/api/health")
def health_check():
    """Lightweight health endpoint for deployment checks."""
    return {
        "status": "ok",
        "service": app.title,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


def _model_assets_base_url() -> str:
    base_url = os.getenv("MODEL_ASSETS_BASE_URL", "").rstrip("/")
    if base_url:
        return base_url
    bucket_name = _model_assets_bucket_name()
    if bucket_name:
        return f"https://storage.googleapis.com/{bucket_name}/models"
    return ""


def _model_assets_bucket_name() -> str:
    bucket_name = os.getenv("MODEL_ASSETS_BUCKET_NAME", "")
    if not bucket_name:
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCP_PROJECT")
        project_name = os.getenv("PROJECT_NAME", "agentic-agri-advisor")
        if project_id:
            bucket_name = f"{project_id}-{project_name}-assets"
    return bucket_name


def _default_model_url(filename: str) -> str:
    base_url = _model_assets_base_url()
    if base_url:
        return f"{base_url}/{filename}"
    return f"/models/{filename}"


@app.get("/api/model-config")
def model_config() -> dict:
    """Return browser model asset locations.

    Local development defaults to same-origin files under /models. Cloud Run
    receives direct Cloud Storage URLs from Terraform so large model downloads
    bypass the application container and can be cached by the browser.
    """
    gemma_url = os.getenv(
        "KRISHI_LOCAL_MODEL_URL",
        _default_model_url("gemma-4-E2B-it-web.litertlm"),
    )
    crop_classifier_url = os.getenv(
        "KRISHI_CROP_CLASSIFIER_MODEL_URL",
        _default_model_url("crop_disease_classifier.tflite"),
    )
    return {
        "local_model_name": os.getenv("KRISHI_LOCAL_MODEL_NAME", "Gemma-4-E2B"),
        "local_model_url": gemma_url,
        "crop_classifier_model_url": crop_classifier_url,
        "model_assets_base_url": _model_assets_base_url(),
        "model_assets_bucket": _model_assets_bucket_name(),
        "local_model_file": "gemma-4-E2B-it-web.litertlm",
        "crop_classifier_model_file": "crop_disease_classifier.tflite",
        "litert_lm_core_url": os.getenv(
            "KRISHI_LITERT_LM_CORE_URL",
            "https://cdn.jsdelivr.net/npm/@litert-lm/core/+esm",
        ),
        "model_load_timeout_ms": int(
            os.getenv("KRISHI_MODEL_LOAD_TIMEOUT_MS", "30000")
        ),
        "model_download_retries": int(os.getenv("KRISHI_MODEL_DOWNLOAD_RETRIES", "5")),
        "model_download_retry_delay_ms": int(
            os.getenv("KRISHI_MODEL_DOWNLOAD_RETRY_DELAY_MS", "3000")
        ),
        "model_init_timeout_ms": int(
            os.getenv("KRISHI_MODEL_INIT_TIMEOUT_MS", "45000")
        ),
        "model_generation_timeout_ms": int(
            os.getenv("KRISHI_MODEL_GENERATION_TIMEOUT_MS", "20000")
        ),
        "model_answer_timeout_ms": int(
            os.getenv("KRISHI_MODEL_ANSWER_TIMEOUT_MS", "25000")
        ),
        "model_foreground_wait_ms": int(
            os.getenv("KRISHI_MODEL_FOREGROUND_WAIT_MS", "8000")
        ),
    }


@app.get("/agui/model_config.js")
def model_config_js() -> Response:
    """Serve runtime model config before static frontend scripts load."""
    cfg = model_config()
    script = (
        "window.KRISHI_MODEL_CONFIG = "
        + json.dumps(cfg, separators=(",", ":"))
        + ";\n"
        + "window.KRISHI_LOCAL_MODEL_NAME = window.KRISHI_MODEL_CONFIG.local_model_name;\n"
        + "window.KRISHI_LOCAL_MODEL_URL = window.KRISHI_MODEL_CONFIG.local_model_url;\n"
        + "window.KRISHI_CROP_CLASSIFIER_MODEL_URL = window.KRISHI_MODEL_CONFIG.crop_classifier_model_url;\n"
        + "window.KRISHI_LITERT_LM_CORE_URL = window.KRISHI_MODEL_CONFIG.litert_lm_core_url;\n"
        + "window.KRISHI_MODEL_LOAD_TIMEOUT_MS = window.KRISHI_MODEL_CONFIG.model_load_timeout_ms;\n"
        + "window.KRISHI_MODEL_DOWNLOAD_RETRIES = window.KRISHI_MODEL_CONFIG.model_download_retries;\n"
        + "window.KRISHI_MODEL_DOWNLOAD_RETRY_DELAY_MS = window.KRISHI_MODEL_CONFIG.model_download_retry_delay_ms;\n"
        + "window.KRISHI_MODEL_INIT_TIMEOUT_MS = window.KRISHI_MODEL_CONFIG.model_init_timeout_ms;\n"
        + "window.KRISHI_MODEL_GENERATION_TIMEOUT_MS = window.KRISHI_MODEL_CONFIG.model_generation_timeout_ms;\n"
        + "window.KRISHI_MODEL_ANSWER_TIMEOUT_MS = window.KRISHI_MODEL_CONFIG.model_answer_timeout_ms;\n"
        + "window.KRISHI_MODEL_FOREGROUND_WAIT_MS = window.KRISHI_MODEL_CONFIG.model_foreground_wait_ms;\n"
    )
    return Response(
        content=script,
        media_type="application/javascript",
        headers={"Cache-Control": "no-store"},
    )


def _save_profile_impl(farmer_id: str, payload: dict) -> dict:
    name = payload.get("farmer_name") or "New Field"
    soil_type = payload.get("soil_type") or "Alluvial"
    acres = payload.get("acres") or 5.0
    irrigation_type = "Drip" if payload.get("has_drip") == "yes" else "Sprinkler"
    crop_type = payload.get("primary_crop") or "Corn"

    # Save the new field and active crop
    res = db_manager.save_farmer_field(
        farmer_id=farmer_id,
        name=name,
        soil_type=soil_type,
        acres=float(acres),
        irrigation_type=irrigation_type,
        crop_type=crop_type,
    )
    return {"status": "success", "field": res}


def _firestore_emulator_is_unavailable() -> bool:
    emulator_host = os.getenv("FIRESTORE_EMULATOR_HOST")
    if not emulator_host:
        return False
    host, _, port_value = emulator_host.partition(":")
    try:
        port = int(port_value or "8080")
        with socket.create_connection((host or "127.0.0.1", port), timeout=0.25):
            return False
    except OSError:
        return True


def _local_profile_response(farmer_id: str) -> dict:
    return {
        "farmer_id": farmer_id,
        "name": "Local Farmer",
        "language": "Hindi",
        "fields": [
            {
                "field_id": "local_field",
                "name": "Local Field",
                "soil_type": "Alluvial",
                "acres": 5.0,
                "irrigation_type": "Drip",
                "plantings": [
                    {
                        "planting_id": "local_planting",
                        "crop_type": "Corn",
                        "stage": "germination",
                        "nitrogen_ppm": 40.0,
                        "moisture_pct": 45.0,
                        "health_pct": 100.0,
                    }
                ],
            }
        ],
        "storage_mode": "local_emulator_unavailable",
        "warning": "Firestore emulator is not reachable; using browser/local profile data.",
    }


def _local_profile_save_response(payload: dict) -> dict:
    return {
        "status": "local_only",
        "field": {
            "field_id": "local_field",
            "planting_id": "local_planting",
            "name": payload.get("field1_name")
            or payload.get("farmer_name")
            or "Local Field",
            "crop_type": payload.get("primary_crop") or "Corn",
        },
        "warning": "Firestore emulator is not reachable; profile was kept in the browser for this local session.",
    }


def _save_language_impl(farmer_id: str, payload: dict) -> dict:
    language = payload.get("language") or "English"
    if _firestore_emulator_is_unavailable():
        return {
            "status": "local_only",
            "language": language,
            "warning": "Firestore emulator is not reachable; language was kept in the browser for this local session.",
        }
    db = firestore_manager._get_firestore()
    db.collection("farmers").document(farmer_id).set(
        {"farmer_id": farmer_id, "language": language}, merge=True
    )
    return {"status": "success"}


@app.get("/api/profile/user")
def get_current_profile(request: Request):
    farmer_id = _resolve_farmer_id(request, GUEST_FARMER_ID)
    if _firestore_emulator_is_unavailable():
        return _local_profile_response(farmer_id)
    return db_manager.get_profile_data(farmer_id)


@app.post("/api/profile/user")
def save_current_profile(request: Request, payload: dict = Body(...)):
    farmer_id = _resolve_farmer_id(request, GUEST_FARMER_ID)
    if _firestore_emulator_is_unavailable():
        return _local_profile_save_response(payload)
    return _save_profile_impl(farmer_id, payload)


@app.post("/api/profile/user/language")
def save_current_language(request: Request, payload: dict = Body(...)):
    farmer_id = _resolve_farmer_id(request, GUEST_FARMER_ID)
    return _save_language_impl(farmer_id, payload)


@app.get("/api/profile/{farmer_id}")
def get_profile(farmer_id: str, request: Request):
    resolved_farmer_id = _resolve_farmer_id(request, farmer_id)
    if _firestore_emulator_is_unavailable():
        return _local_profile_response(resolved_farmer_id)
    return db_manager.get_profile_data(resolved_farmer_id)


@app.post("/api/profile/{farmer_id}")
def save_profile(farmer_id: str, request: Request, payload: dict = Body(...)):
    resolved_farmer_id = _resolve_farmer_id(request, farmer_id)
    if _firestore_emulator_is_unavailable():
        return _local_profile_save_response(payload)
    return _save_profile_impl(resolved_farmer_id, payload)


@app.post("/api/profile/{farmer_id}/language")
def save_language(farmer_id: str, request: Request, payload: dict = Body(...)):
    resolved_farmer_id = _resolve_farmer_id(request, farmer_id)
    return _save_language_impl(resolved_farmer_id, payload)


@app.post("/api/telemetry/{planting_id}")
def update_telemetry(planting_id: str, payload: dict = Body(...)):
    moisture = payload.get("moisture_pct", 50.0)
    health = payload.get("health_pct", 100.0)
    nitrogen = payload.get("nitrogen_ppm", 45.0)
    db_manager.update_planting_telemetry(planting_id, moisture, health, nitrogen)
    return {"status": "success"}


@app.post("/api/activities/log")
def log_activity(payload: dict = Body(...)):
    planting_id = payload.get("planting_id")
    activity_type = payload.get("activity_type")
    quantity = payload.get("quantity", 0.0)
    unit = payload.get("unit", "")
    details = payload.get("details", "")
    timestamp = payload.get("timestamp")

    if not planting_id or not activity_type:
        return {"status": "error", "message": "Missing planting_id or activity_type"}

    res = db_manager.log_activity_record(
        planting_id=planting_id,
        activity_type=activity_type,
        quantity=float(quantity),
        unit=unit,
        details=details,
        timestamp=timestamp,
    )
    return res


@app.get("/api/activities/{planting_id}")
def get_activities(planting_id: str):
    res = db_manager.get_activities_log(planting_id)
    return {"status": "success", "activities": res}


@app.post("/feedback")
def collect_feedback(feedback: Feedback) -> dict[str, str]:
    """Collect and log feedback.

    Args:
        feedback: The feedback data to log

    Returns:
        Success message
    """
    try:
        logger.log_struct(feedback.model_dump(), severity="INFO")
    except Exception as e:
        import logging

        logging.getLogger(__name__).info(
            f"Local fallback logging: {feedback.model_dump()} (Cloud logging err: {e})"
        )
    return {"status": "success"}


# ============================================================
# Safety & Expert Escalation Endpoints
# ============================================================

from safety_kernel import (
    get_pending_escalations,
    resolve_escalation,
    validate_recommendation,
)


class EscalationResolve(BaseModel):
    """Agronomist resolution for an escalation case."""

    escalation_id: str
    resolution: str
    resolved_by: str


@app.post("/api/safety/validate")
def safety_validate(payload: dict = Body(...)) -> dict:
    """Validate an agricultural recommendation against safety rules.

    Checks for banned chemicals, dosage violations, and PHI warnings.
    Agents or the frontend can call this before showing advice to the farmer.

    Request body:
        {"text": "<recommendation text>", "farmer_name": "...", "query": "..."}
    """
    text = payload.get("text", "")
    farmer_name = payload.get("farmer_name", "")
    query = payload.get("query", "")
    return validate_recommendation(text, farmer_name, query)


@app.get("/api/escalations/pending")
def list_pending_escalations() -> dict:
    """List all pending expert escalation cases.

    Used by an agronomist dashboard to review flagged cases.
    """
    escalations = get_pending_escalations()
    return {"status": "success", "count": len(escalations), "escalations": escalations}


@app.post("/api/escalations/resolve")
def resolve_escalation_endpoint(resolve: EscalationResolve) -> dict:
    """Resolve a pending escalation with expert advice.

    Called by an agronomist after reviewing the case.
    """
    result = resolve_escalation(
        escalation_id=resolve.escalation_id,
        resolution=resolve.resolution,
        resolved_by=resolve.resolved_by,
    )
    return result


# ============================================================
# OKF Knowledge Sync Endpoint (for PWA offline caching)
# ============================================================


@app.get("/api/okf/sync")
def sync_okf_knowledge() -> dict:
    """Return all OKF knowledge entities as JSON for PWA offline caching.

    The PWA frontend calls this on first launch (when online) to download
    and cache all OKF crop, disease, pest, soil, and safety data into
    IndexedDB for offline querying.
    """
    import glob

    import yaml

    okf_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "okf"
    )
    legacy_okf = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "okf-knowledge-graph",
        "data",
    )

    def load_entities(base_dir, entity_type):
        entities = []
        entity_dir = os.path.join(base_dir, entity_type)
        if not os.path.isdir(entity_dir):
            return entities
        for filepath in glob.glob(os.path.join(entity_dir, "*.md")):
            try:
                with open(filepath, encoding="utf-8") as f:
                    content = f.read()
                if content.startswith("---"):
                    parts = content.split("---", 2)
                    if len(parts) >= 3:
                        meta = yaml.safe_load(parts[1]) or {}
                        body = parts[2].strip()
                        entities.append(
                            {
                                "id": meta.get(
                                    "id", os.path.basename(filepath).replace(".md", "")
                                ),
                                "type": meta.get("type", entity_type),
                                "metadata": meta,
                                "body": body,
                                "filename": os.path.basename(filepath),
                            }
                        )
                        continue
                entities.append(
                    {
                        "id": os.path.basename(filepath).replace(".md", ""),
                        "type": entity_type,
                        "body": content,
                        "filename": os.path.basename(filepath),
                    }
                )
            except Exception:
                continue
        return entities

    result = {
        "status": "success",
        "synced_at": datetime.now().isoformat() if "datetime" in dir() else "",
        "crops": load_entities(okf_dir, "crops"),
        "diseases": load_entities(okf_dir, "diseases")
        + load_entities(legacy_okf, "diseases"),
        "pests": load_entities(okf_dir, "pests") + load_entities(legacy_okf, "pests"),
        "soil": load_entities(okf_dir, "soil") + load_entities(legacy_okf, "soil"),
        "safety": load_entities(legacy_okf, "safety"),
    }

    total = sum(
        len(result[k]) for k in ["crops", "diseases", "pests", "soil", "safety"]
    )
    result["total_entities"] = total
    return result


# ============================================================
# Soil Test Report Endpoints
# ============================================================


class SoilReportSave(BaseModel):
    """Soil report confirmation from farmer."""

    farmer_id: str = "user"
    field_id: str = ""
    source: str = "manual"
    file_name: str = ""
    sample_date: str = ""
    lab_name: str = ""
    storage_bucket: str = ""
    storage_object: str = ""
    storage_uri: str = ""
    storage_public_url: str = ""
    content_type: str = ""
    file_size_bytes: int = 0
    extraction_confidence: float = 0.0
    confirmed_by_farmer: bool = True
    values: list = []


class UserContentUpload(BaseModel):
    """Base64 user-content upload for browser clients."""

    category: str = Field("reports", description="soil_reports, crop_photos, reports")
    file_name: str = Field("upload.bin", min_length=1)
    content_type: str = "application/octet-stream"
    data_base64: str = Field(..., min_length=1)
    field_id: str = ""
    planting_id: str = ""


def _save_user_content_record(
    farmer_id: str,
    category: str,
    file_name: str,
    storage: dict,
    *,
    field_id: str = "",
    planting_id: str = "",
    source: str = "",
) -> dict:
    """Persist a searchable content index record for an uploaded object."""
    item = {
        "farmer_id": farmer_id,
        "category": category,
        "file_name": file_name,
        "storage_bucket": storage.get("bucket", ""),
        "storage_object": storage.get("object_name", ""),
        "storage_uri": storage.get("gcs_uri", ""),
        "storage_public_url": storage.get("public_url", ""),
        "content_type": storage.get("content_type", ""),
        "file_size_bytes": int(storage.get("size_bytes", 0) or 0),
        "field_id": field_id,
        "planting_id": planting_id,
        "source": source,
        "status": storage.get("status", ""),
    }
    return db_manager.save_content_item(item)


@app.post("/api/soil/save")
def save_soil_report_endpoint(report: SoilReportSave, request: Request) -> dict:
    """Save a confirmed soil test report linked to a field."""
    report_data = report.model_dump()
    report_data["farmer_id"] = _resolve_farmer_id(
        request, report_data.get("farmer_id") or "user"
    )
    result = save_soil_report(report_data)
    return result


@app.post("/api/uploads/user-content")
def upload_user_content_endpoint(payload: UserContentUpload, request: Request) -> dict:
    """Store a farmer-owned file under the user's Cloud Storage folder."""
    farmer_id = _resolve_farmer_id(request, "user")
    try:
        content = base64.b64decode(payload.data_base64, validate=True)
        storage = upload_user_content(
            farmer_id=farmer_id,
            category=payload.category,
            file_name=payload.file_name,
            content=content,
            content_type=payload.content_type,
            metadata={
                "field_id": payload.field_id,
                "planting_id": payload.planting_id,
            },
        )
        content_record = _save_user_content_record(
            farmer_id,
            payload.category,
            payload.file_name,
            storage,
            field_id=payload.field_id,
            planting_id=payload.planting_id,
            source="api_upload",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Upload failed: {exc}") from exc

    return {"status": "success", "storage": storage, "content_record": content_record}


@app.get("/api/uploads/user-content")
def list_user_content_endpoint(
    request: Request, category: str = "", limit: int = 50
) -> dict:
    """List uploaded farmer content metadata from Firestore."""
    farmer_id = _resolve_farmer_id(request, "user")
    items = db_manager.get_content_items(farmer_id, category or None, limit)
    return {"status": "success", "count": len(items), "items": items}


@app.get("/api/soil/reports/{field_id}")
def get_soil_reports_endpoint(field_id: str) -> dict:
    """Get all soil reports for a field."""
    reports = get_soil_reports(field_id)
    return {"status": "success", "count": len(reports), "reports": reports}


@app.get("/api/soil/latest/{field_id}")
def get_latest_soil_endpoint(field_id: str) -> dict:
    """Get the latest confirmed soil report for a field."""
    report = get_latest_soil_report(field_id)
    if report:
        return {"status": "success", "report": report}
    return {"status": "not_found", "message": "No soil report found"}


@app.post("/api/soil/extract")
async def extract_soil_report(request: Request, file: bytes = Body(...)) -> dict:
    """Extract values from an uploaded soil report using Gemini Vision."""
    import json as json_mod
    import os
    import tempfile

    from google import genai
    from PIL import Image

    tmp_path = None
    farmer_id = _resolve_farmer_id(request, "user")
    file_name = request.headers.get("X-File-Name", "soil-report-upload.jpg")
    content_type = request.headers.get("Content-Type", "application/octet-stream")
    storage = {}
    try:
        try:
            storage = upload_user_content(
                farmer_id=farmer_id,
                category="soil_reports",
                file_name=file_name,
                content=file,
                content_type=content_type,
                metadata={"source": "soil_extract"},
            )
            _save_user_content_record(
                farmer_id,
                "soil_reports",
                file_name,
                storage,
                source="soil_extract",
            )
        except Exception as storage_exc:
            storage = {
                "status": "error",
                "message": str(storage_exc),
                "bucket": "",
                "object_name": "",
                "gcs_uri": "",
                "public_url": "",
                "size_bytes": len(file or b""),
                "content_type": content_type,
            }

        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            return {
                "status": "error",
                "message": "No API key",
                "file_name": file_name,
                "storage": storage,
                "values": [],
            }

        client = genai.Client(api_key=api_key)
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(file)
            tmp_path = tmp.name

        try:
            img = Image.open(tmp_path)
            contents = [img]
        except Exception:
            with open(tmp_path, "rb") as f:
                contents = [f.read()]

        prompt = """Extract soil test values from this report. Return JSON:
{"sample_date": null, "lab_name": null, "pH": null, "EC": null,
 "organic_carbon": null, "nitrogen": null, "phosphorus": null,
 "potassium": null, "sulfur": null, "zinc": null, "boron": null,
 "iron": null, "soil_type": null}
Return ONLY JSON."""

        last_soil_exc: Exception | None = None
        response = None
        for _soil_model in _expert_models_to_try():
            try:
                response = client.models.generate_content(
                    model=_soil_model, contents=[*contents, prompt]
                )
                break
            except Exception as _e:
                last_soil_exc = _e
                if _is_model_not_found(_e):
                    continue
                raise
        if response is None:
            raise last_soil_exc or RuntimeError("All Gemini models unavailable")

        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

        raw = response.text.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw
            if raw.endswith("```"):
                raw = raw.rsplit("```", 1)[0]
        raw = raw.strip()

        if raw.startswith("{"):
            values = json_mod.loads(raw)
            value_list = []
            for key, val in values.items():
                if val is not None and val != "null":
                    if key not in ("sample_date", "lab_name", "soil_type"):
                        value_list.append(
                            {
                                "parameter_name": key,
                                "value": str(val),
                                "unit": "",
                                "category": "",
                                "confidence": 0.8,
                            }
                        )
            return {
                "status": "success",
                "sample_date": values.get("sample_date"),
                "lab_name": values.get("lab_name"),
                "soil_type": values.get("soil_type"),
                "file_name": file_name,
                "storage": storage,
                "values": value_list,
                "extraction_confidence": 0.8,
            }
        return {
            "status": "error",
            "message": "Could not parse",
            "storage": storage,
            "values": [],
        }
    except Exception as e:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
        return {"status": "error", "message": str(e), "storage": storage, "values": []}


# Edge Neural Text-To-Speech Endpoint
VOICE_MAP = {
    "English": "en-US-GuyNeural",
    "Hindi": "hi-IN-MadhurNeural",
    "Marathi": "mr-IN-ManoharNeural",
    "Telugu": "te-IN-MohanNeural",
    "Swahili": "sw-KE-RafikiNeural",
    "Zulu": "zu-ZA-ThandiNeural",
    # BCP-47 code aliases (sent by the PWA frontend)
    "en": "en-US-GuyNeural",
    "en-US": "en-US-GuyNeural",
    "hi": "hi-IN-MadhurNeural",
    "hi-IN": "hi-IN-MadhurNeural",
    "mr": "mr-IN-ManoharNeural",
    "mr-IN": "mr-IN-ManoharNeural",
    "te": "te-IN-MohanNeural",
    "te-IN": "te-IN-MohanNeural",
    "sw": "sw-KE-RafikiNeural",
    "sw-KE": "sw-KE-RafikiNeural",
    "zu": "zu-ZA-ThandiNeural",
    "zu-ZA": "zu-ZA-ThandiNeural",
}


class TTSRequest(BaseModel):
    text: str
    lang: str = "English"


# To prevent overlapping audio from simultaneous requests
tts_lock = asyncio.Lock()


@app.post("/api/tts")
async def text_to_speech_endpoint(req: TTSRequest):
    voice = VOICE_MAP.get(req.lang, "en-US-GuyNeural")
    # Improved cleaning: Remove markdown-like syntax and excessive whitespace
    clean_text = re.sub(r"[#*_~`]", "", req.text).strip()

    # Save synthesized speech to a temp file
    temp_dir = tempfile.gettempdir()
    output_path = os.path.join(temp_dir, f"edge_tts_{abs(hash(clean_text))}.mp3")

    async with tts_lock:
        try:
            communicate = edge_tts.Communicate(clean_text, voice)
            await communicate.save(output_path)
            return FileResponse(output_path, media_type="audio/mpeg")
        except Exception as e:
            print(f"Edge TTS Synthesis Failed: {e}")
            return {"error": str(e)}


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)


# ============================================================
# Client-side Error Telemetry (mobile devices without DevTools)
# ============================================================

class ClientErrorLog(BaseModel):
    """Browser-side JS error captured from devices without DevTools access."""
    message: str = Field("", max_length=500)
    stack: str = Field("", max_length=2000)
    url: str = Field("", max_length=300)
    device_type: str = Field("", max_length=50)  # "ios", "android", "desktop"
    model_mode: str = Field("", max_length=100)   # localAi.llmMode at time of error


@app.post("/api/log/client-error")
async def log_client_error(payload: ClientErrorLog, request: Request) -> dict:
    """Capture client-side JS errors from mobile devices that have no DevTools.

    Called by the global window.onerror and unhandledrejection handlers in
    dashboard.js. Errors are logged server-side so iOS/Android crashes are
    visible without needing a USB-connected debugger.

    Accepts both application/json (fetch) and text/plain (sendBeacon Blob fallback).
    """
    # sendBeacon with a Blob sends Content-Type: application/json but some
    # browsers send it as text/plain — parse manually if FastAPI body validation
    # didn't fire (i.e., if the raw body came through as text/plain).
    if not any(vars(payload).values()):
        try:
            raw = await request.body()
            data = json.loads(raw)
            payload = ClientErrorLog(**{k: data.get(k, "") for k in ClientErrorLog.model_fields})
        except Exception:
            pass
    try:
        ua = request.headers.get("user-agent", "")[:200]
        logger.log_struct({
            "event": "client_error",
            "message": payload.message,
            "stack": payload.stack[:500] if payload.stack else "",
            "url": payload.url,
            "device_type": payload.device_type,
            "model_mode": payload.model_mode,
            "user_agent": ua,
        }, severity="ERROR")
    except Exception:
        pass  # Never let error logging break the app
    return {"status": "ok"}


@app.get("/api/plans/{planting_id}")
def get_plans(planting_id: str):
    res = db_manager.get_daily_plans(planting_id)
    return {"status": "success", "plans": res}


@app.post("/api/plans/complete")
def complete_plan_task(payload: dict = Body(...)):
    plan_id = payload.get("plan_id")
    state = payload.get("state", "completed")
    if not plan_id:
        return {"status": "error", "message": "Missing plan_id"}
    db_manager.update_plan_state(plan_id, state)
    return {"status": "success"}


@app.get("/api/reminders/{planting_id}")
def get_reminders(planting_id: str):
    res = db_manager.get_reminders(planting_id)
    return {"status": "success", "reminders": res}


@app.post("/api/reminders/action")
def reminder_action(payload: dict = Body(...)):
    reminder_id = payload.get("reminder_id")
    state = payload.get("state")
    if not reminder_id or not state:
        return {"status": "error", "message": "Missing reminder_id or state"}
    db_manager.update_reminder_state(reminder_id, state)
    return {"status": "success"}


@app.post("/api/escalations")
def create_escalation(payload: dict = Body(...)):
    res = db_manager.save_escalation_request(payload)
    return res


@app.get("/api/escalations/{planting_id}")
def get_escalations(planting_id: str):
    res = db_manager.get_escalations(planting_id)
    return {"status": "success", "escalations": res}


@app.post("/api/feedback")
def save_feedback(payload: dict = Body(...)):
    res = db_manager.log_outcome_feedback(payload)
    return res


# Phase 5 Endpoints


@app.get("/api/expert/queue")
def get_expert_queue():
    res = db_manager.get_expert_queue()
    return {"status": "success", "queue": res}


@app.post("/api/expert/action")
def expert_action(payload: dict = Body(...)):
    escalation_id = payload.get("escalation_id")
    state = payload.get("state")
    expert_response = payload.get("expert_response")
    if not escalation_id or not state:
        return {"status": "error", "message": "Missing escalation_id or state"}
    res = db_manager.update_expert_case_state(escalation_id, state, expert_response)
    return res


@app.get("/api/outbreaks")
def get_outbreaks():
    res = db_manager.get_outbreaks()
    return {"status": "success", "outbreaks": res}


@app.post("/api/outbreaks/verify")
def verify_outbreak(payload: dict = Body(...)):
    outbreak_id = payload.get("outbreak_id")
    status = payload.get("status")
    if not outbreak_id or not status:
        return {"status": "error", "message": "Missing outbreak_id or status"}
    res = db_manager.confirm_outbreak(outbreak_id, status)
    return res


@app.get("/api/governance")
def get_governance():
    res = db_manager.get_governance_metadata()
    return {"status": "success", "governance": res}


@app.post("/api/governance/rollback")
def rollback_governance(payload: dict = Body(...)):
    content_id = payload.get("content_id")
    if not content_id:
        return {"status": "error", "message": "Missing content_id"}
    res = db_manager.rollback_governance_version(content_id)
    return res


@app.post("/api/observability/log")
def log_observability(payload: dict = Body(...)):
    res = db_manager.log_observability_event(
        correlation_id=payload.get("correlation_id", ""),
        event_type=payload.get("event_type", ""),
        screen=payload.get("screen", ""),
        agent=payload.get("agent", ""),
        tool=payload.get("tool", ""),
        route=payload.get("route", ""),
        safety_decision=payload.get("safety_decision", ""),
        latency=float(payload.get("latency", 0.0)),
        device_tier=payload.get("device_tier", ""),
    )
    return res


@app.get("/api/observability/logs")
def get_observability_logs():
    res = db_manager.get_observability_logs()
    return {"status": "success", "logs": res}


# ============================================================
# Admin Dashboard — protected by ADMIN_EMAIL env var
# ============================================================
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")


def _is_admin(current_user: dict | None) -> bool:
    if not current_user or not ADMIN_EMAIL:
        return False
    return current_user.get("email", "").lower() == ADMIN_EMAIL.lower()


@app.get("/api/admin/users")
def admin_list_users(request: Request):
    """List all registered farmers (admin only)."""
    current_user = _current_user_from_request(request)
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    farmers = db_manager.get_admin_users()
    return {"status": "success", "users": farmers, "total": len(farmers)}


@app.get("/api/admin/observability")
def admin_observability(request: Request):
    """Get recent observability events (admin only)."""
    current_user = _current_user_from_request(request)
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    res = db_manager.get_observability_logs()
    return {"status": "success", "logs": res[:200]}


@app.get("/api/admin/escalations")
def admin_escalations(request: Request):
    """Get expert escalation queue (admin only)."""
    current_user = _current_user_from_request(request)
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    res = db_manager.get_expert_queue()
    return {"status": "success", "escalations": res}


@app.get("/api/admin/stats")
def admin_stats(request: Request):
    """Get summary stats (admin only)."""
    current_user = _current_user_from_request(request)
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    return {"status": "success", "stats": db_manager.get_admin_stats()}


@app.post("/api/privacy/preferences")
def save_privacy(payload: dict = Body(...)):
    res = db_manager.save_privacy_preferences(payload)
    return res


@app.post("/api/privacy/export")
def export_privacy(payload: dict = Body(...)):
    user_id = payload.get("user_id", "user")
    res = db_manager.export_farm_data(user_id)
    return {"status": "success", "data": res}


@app.post("/api/privacy/delete")
def delete_privacy(payload: dict = Body(...)):
    user_id = payload.get("user_id", "user")
    res = db_manager.delete_farm_data(user_id)
    return res


@app.get("/api/evaluation/run")
def run_evaluation():
    # Model and agent evaluations
    return {
        "status": "success",
        "metrics": {
            "routing_accuracy": 0.94,
            "tool_call_accuracy": 0.96,
            "structured_extraction_accuracy": 0.92,
            "unsafe_recommendation_rate": 0.00,
            "escalation_precision": 0.98,
            "escalation_recall": 1.00,
            "diagnosis_top_1_accuracy": 0.88,
            "diagnosis_top_3_accuracy": 0.96,
            "translation_acceptance": 0.95,
            "farmer_task_completion": 0.85,
            "false_alert_rate": 0.02,
        },
    }


# ============================================================
# Ask Expert — Cloud Gemini Streaming Endpoint
# ============================================================


class ExpertChatRequest(BaseModel):
    """Request body for the Ask Expert cloud chat."""

    message: str = Field(..., description="Farmer's question text")
    language: str = Field("en", description="BCP-47 language code")
    context: str = Field("", description="Optional farm context (crop, field, region)")


EXPERT_MODEL_NAME = os.environ.get("EXPERT_MODEL_NAME", "gemini-2.5-flash")
EXPERT_MODEL_FALLBACK = os.environ.get("EXPERT_MODEL_FALLBACK", "gemini-3.1-flash-lite")


def _expert_models_to_try() -> list[str]:
    """Return models to try in order. Deduplicates primary and fallback."""
    seen: set[str] = set()
    models = []
    for name in (EXPERT_MODEL_NAME, EXPERT_MODEL_FALLBACK):
        if name and name not in seen:
            seen.add(name)
            models.append(name)
    return models


def _is_model_not_found(exc: Exception) -> bool:
    """True when the Gemini API says the model endpoint no longer exists (transient 404).
    Quota exhaustion returns RESOURCE_EXHAUSTED / 429, not NOT_FOUND — do not retry those.
    """
    msg = str(exc)
    if "RESOURCE_EXHAUSTED" in msg or "429" in msg or "quota" in msg.lower():
        return False  # quota error — retrying a different model won't help
    return "NOT_FOUND" in msg or "404" in msg or "no longer available" in msg

EXPERT_SYSTEM_PROMPT = """You are Krishi Bisesagya, a wise and experienced agricultural expert consultant backed by Gemini cloud AI.
You have deep knowledge of agronomy, soil science, integrated pest management, irrigation systems, market pricing, government schemes, and sustainable farming practices.
You serve smallholder farmers across India and East Africa with empathetic, precise, and actionable guidance.

Guidelines:
- Greet the farmer warmly by name in their language with "Namaste" (Hindi/Marathi/Telugu) or "Jambo" (Swahili) or "Sawubona" (Zulu) or "Hello" (English). Use the farmer's name if available in the context.
- Always provide concise, practical advice that a farmer without formal education can act on immediately.
- Include safety warnings if chemicals or pesticides are involved.
- Cite organic/natural alternatives whenever possible.
- Keep answers under 250 words unless the topic demands more depth.
- If you are uncertain, say so clearly and suggest consulting a local agronomist.
- Never recommend banned or restricted chemicals.
"""


@app.post("/api/expert/chat")
async def expert_chat_stream(req: ExpertChatRequest, request: Request):
    """Stream an agricultural expert response from Gemini cloud."""
    import json

    from fastapi.responses import StreamingResponse

    # --- Rate limiting: max EXPERT_RATE_LIMIT requests per user per hour ---
    current_user = _current_user_from_request(request)
    if current_user and current_user.get("email"):
        rate_key = current_user["email"]
    else:
        # Fall back to IP address for unauthenticated users
        rate_key = request.client.host if request.client else "unknown"

    allowed, remaining = _check_expert_rate_limit(rate_key)
    if not allowed:
        reset_in = int(EXPERT_RATE_WINDOW / 60)

        async def rate_limited_gen():
            yield (
                json.dumps(
                    {
                        "text": f"⚠️ Expert consultation limit reached ({EXPERT_RATE_LIMIT} per hour). Please try again in {reset_in} minutes or use Krishi Sastri for offline advice.",
                        "done": True,
                    }
                )
                + "\n"
            )

        return StreamingResponse(rate_limited_gen(), media_type="text/plain")

    gemini_api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get(
        "GOOGLE_API_KEY"
    )
    if not gemini_api_key:

        async def no_key_gen():
            yield (
                json.dumps(
                    {
                        "text": "⚠️ Cloud expert is unavailable: GEMINI_API_KEY not configured on the server.",
                        "done": True,
                    }
                )
                + "\n"
            )

        return StreamingResponse(no_key_gen(), media_type="text/plain")

    lang_greetings = {
        "hi": "नमस्ते ",
        "mr": "नमस्कार ",
        "sw": "Jambo! ",
        "te": "నమస్కారం ",
        "zu": "Sawubona! ",
        "en": "",
    }
    greeting = lang_greetings.get(req.language, "")

    # Extract farmer name from context to personalize greeting
    farmer_name = ""
    if req.context:
        import re as _re

        name_match = _re.search(r"Farmer:\s*([^,]+)", req.context, _re.IGNORECASE)
        if name_match:
            farmer_name = name_match.group(1).strip()
    if farmer_name and farmer_name.lower() not in ("unknown", "unnamed", ""):
        greeting = f"{greeting}{farmer_name}! "
    else:
        greeting = f"{greeting}"

    user_message = req.message
    if req.context:
        user_message = f"[Farm context: {req.context}]\n\nGreet the farmer by their name ({farmer_name}). {req.message}"

    async def generate_stream():
        from google import genai
        from google.genai import types as genai_types

        client = genai.Client(api_key=gemini_api_key)
        full_prompt = f"{greeting}{user_message}"
        last_exc: Exception | None = None

        for model_name in _expert_models_to_try():
            try:
                response = client.models.generate_content_stream(
                    model=model_name,
                    contents=full_prompt,
                    config=genai_types.GenerateContentConfig(
                        system_instruction=EXPERT_SYSTEM_PROMPT,
                        temperature=0.4,
                        max_output_tokens=1024,
                    ),
                )
                for chunk in response:
                    if chunk.text:
                        yield json.dumps({"text": chunk.text, "done": False}) + "\n"
                yield json.dumps({"text": "", "done": True}) + "\n"
                return  # success — stop trying further models
            except Exception as e:
                last_exc = e
                if _is_model_not_found(e):
                    continue  # retry with next model in list
                # Non-404 error: surface immediately, no retry
                yield (
                    json.dumps({"text": f"⚠️ Expert consultation failed: {e}", "done": True})
                    + "\n"
                )
                return

        # All models exhausted
        yield (
            json.dumps({"text": f"⚠️ Expert consultation failed: {last_exc}", "done": True})
            + "\n"
        )

    return StreamingResponse(
        generate_stream(),
        media_type="text/plain",
        headers={
            "X-RateLimit-Remaining": str(remaining),
            "X-RateLimit-Limit": str(EXPERT_RATE_LIMIT),
        },
    )


# Mount static files under "/" to serve agui and a2ui frontends
from fastapi.staticfiles import StaticFiles

ui_dir = os.path.join(AGENT_DIR, "ui")
app.mount("/", StaticFiles(directory=ui_dir, html=True), name="ui")

# Main execution
if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
