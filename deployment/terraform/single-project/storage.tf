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

resource "google_storage_bucket" "logs_data_bucket" {
  name                        = "${var.project_id}-${var.project_name}-logs"
  location                    = var.region
  project                     = var.project_id
  uniform_bucket_level_access = true

  depends_on = [resource.google_project_service.services]
}

# Bucket for PWA static assets and model files
resource "google_storage_bucket" "assets_bucket" {
  name                        = "${var.project_id}-${var.project_name}-assets"
  location                    = var.region
  project                     = var.project_id
  uniform_bucket_level_access = true

  depends_on = [resource.google_project_service.services]
}

# Bucket for farmer-owned uploads: soil reports, crop photos, expert evidence.
resource "google_storage_bucket" "user_content_bucket" {
  name                        = "${var.project_id}-${var.project_name}-user-content"
  location                    = var.region
  project                     = var.project_id
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  depends_on = [resource.google_project_service.services]
}

# Firestore database in Native mode
resource "google_firestore_database" "database" {
  name                            = "(default)"
  location_id                     = var.region == "us-east1" ? "nam5" : var.region
  type                            = "FIRESTORE_NATIVE"
  point_in_time_recovery_enablement = "POINT_IN_TIME_RECOVERY_DISABLED"
  delete_protection_state         = "DELETE_PROTECTION_DISABLED"

  depends_on = [resource.google_project_service.services]
}
