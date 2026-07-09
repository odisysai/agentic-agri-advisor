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

variable "project_name" {
  type        = string
  description = "Project name used as a base for resource naming"
  default     = "agentic-agri-advisor"
}

variable "project_id" {
  type        = string
  description = "Google Cloud Project ID for resource deployment."
}

variable "region" {
  type        = string
  description = "Google Cloud region for resource deployment."
  default     = "us-east1"
}

variable "gemini_api_key" {
  type        = string
  description = "Gemini API key for agent LLM access"
  sensitive   = true
  default     = ""
}

variable "google_oidc_client_id" {
  type        = string
  description = "Google OAuth Web client ID used for frontend OIDC login"
  default     = ""
}

variable "expert_model_name" {
  type        = string
  description = "Primary Gemini model for the Ask Expert cloud chat endpoint."
  default     = "gemini-2.5-flash"
}

variable "expert_model_fallback" {
  type        = string
  description = "Fallback Gemini model used when the primary returns NOT_FOUND (e.g. during a Google model rollout). Uses a different generation to avoid same-rollout outages."
  default     = "gemini-3.1-flash-lite"
}

variable "model_asset_cors_origins" {
  type        = list(string)
  description = "Origins allowed to download public model assets from the assets bucket."
  default     = ["*"]
}

variable "telemetry_logs_filter" {
  type        = string
  description = "Log Sink filter for capturing telemetry data. Captures logs with the `traceloop.association.properties.log_type` attribute set to `tracing`."
  default     = "labels.service_name=\"agentic-agri-advisor\" labels.type=\"agent_telemetry\""
}

variable "feedback_logs_filter" {
  type        = string
  description = "Log Sink filter for capturing feedback data. Captures logs where the `log_type` field is `feedback`."
  default     = "jsonPayload.log_type=\"feedback\" jsonPayload.service_name=\"agentic-agri-advisor\""
}

variable "app_sa_roles" {
  description = "List of roles to assign to the application service account"
  type        = list(string)
  default = [

    "roles/aiplatform.user",
    "roles/logging.logWriter",
    "roles/cloudtrace.agent",
    "roles/storage.admin",
    "roles/datastore.user",
    "roles/serviceusage.serviceUsageConsumer",
  ]
}
