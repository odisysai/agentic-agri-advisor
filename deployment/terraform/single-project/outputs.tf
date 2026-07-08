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

output "app_service_account_email" {
  description = "Application service account email"
  value       = google_service_account.app_sa.email
}

output "logs_bucket_name" {
  description = "Logs storage bucket name"
  value       = google_storage_bucket.logs_data_bucket.name
}

output "assets_bucket_name" {
  description = "Assets storage bucket name"
  value       = google_storage_bucket.assets_bucket.name
}

output "user_content_bucket_name" {
  description = "Private bucket for farmer-owned uploads and reports"
  value       = google_storage_bucket.user_content_bucket.name
}

output "firestore_database" {
  description = "Firestore database name"
  value       = google_firestore_database.database.name
}

output "cloud_run_service_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_v2_service.app.uri
}
