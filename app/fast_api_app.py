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
import os
import tempfile

import google.auth
from fastapi import FastAPI, Body, Query, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel
from google.adk.cli.fast_api import get_fast_api_app
from google.cloud import logging as google_cloud_logging

from app.app_utils.telemetry import setup_telemetry
from app.app_utils.typing import Feedback
from data import db_manager
import edge_tts

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
    print("Warning: Google Cloud default credentials not found. Local offline execution active.")

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


@app.get("/v1/models")
@app.get("/v1/models/")
def get_v1_models():
    """Dummy endpoint to suppress local model scanners and stop uvicorn console bloating."""
    return {"data": []}


@app.get("/api/profile/{farmer_id}")
def get_profile(farmer_id: str):
    return db_manager.get_profile_data(farmer_id)


@app.post("/api/profile/{farmer_id}")
def save_profile(farmer_id: str, payload: dict = Body(...)):
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
        crop_type=crop_type
    )
    return {"status": "success", "field": res}


@app.post("/api/profile/{farmer_id}/language")
def save_language(farmer_id: str, payload: dict = Body(...)):
    language = payload.get("language") or "English"
    conn = db_manager.get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE farmers SET language = ? WHERE farmer_id = ?", (language, farmer_id))
        conn.commit()
    finally:
        conn.close()
    return {"status": "success"}


@app.post("/api/telemetry/{planting_id}")
def update_telemetry(planting_id: str, payload: dict = Body(...)):
    moisture = payload.get("moisture_pct", 50.0)
    health = payload.get("health_pct", 100.0)
    nitrogen = payload.get("nitrogen_ppm", 45.0)
    db_manager.update_planting_telemetry(planting_id, moisture, health, nitrogen)
    return {"status": "success"}


@app.post("/feedback")
def collect_feedback(feedback: Feedback) -> dict[str, str]:
    """Collect and log feedback.

    Args:
        feedback: The feedback data to log

    Returns:
        Success message
    """
    logger.log_struct(feedback.model_dump(), severity="INFO")


# Edge Neural Text-To-Speech Endpoint
VOICE_MAP = {
    "English": "en-US-GuyNeural",
    "Hindi": "hi-IN-MadhurNeural",
    "Marathi": "mr-IN-ManoharNeural",
    "Telugu": "te-IN-MohanNeural",
    "Swahili": "sw-KE-RafikiNeural"
}

class TTSRequest(BaseModel):
    text: str
    lang: str = "English"

@app.post("/api/tts")
async def text_to_speech_endpoint(req: TTSRequest):
    voice = VOICE_MAP.get(req.lang, "en-US-GuyNeural")
    clean_text = req.text.replace("**", "").replace("*", "").replace("#", "").strip()
    
    # Save synthesized speech to a temp file
    temp_dir = tempfile.gettempdir()
    output_path = os.path.join(temp_dir, f"edge_tts_{abs(hash(clean_text))}.mp3")
    
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
# Mount static files under "/" to serve agui and a2ui frontends
from fastapi.staticfiles import StaticFiles
ui_dir = os.path.join(AGENT_DIR, "ui")
app.mount("/", StaticFiles(directory=ui_dir, html=True), name="ui")

# Main execution
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
