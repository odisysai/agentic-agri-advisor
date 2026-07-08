# Deployment Architecture Review

> **Status:** Decision Made — Implementation in Progress
> **Last Updated:** 2026-07-07
> **Owner:** Lead AI Solutions Architect
> **Decision:** Firestore (NoSQL) + Cloud Storage + Cloud Run (us-east1, pilot)

---

## Decision Made

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Database** | Firestore (Native mode) | Serverless, $0 free tier for pilot, auto-scales, no connection pool |
| **Object Storage** | GCS (logs + assets + user content) | Needed for model hosting and private farmer uploads |
| **Compute** | Cloud Run (us-east1, 0-3 instances) | Stateless, scales to zero, no infrastructure management |
| **Offline sync** | IndexedDB → Firestore | PWA sync queue writes to Firestore API endpoints |

---

## Implementation — Completed

### Files Modified

| File | Change | Status |
|------|--------|--------|
| `data/firestore_manager.py` | Firestore implementation for persistence APIs | ✅ Created |
| `data/db_manager.py` | Firestore-only facade used by the app | ✅ Updated |
| `pyproject.toml` | Added `google-cloud-firestore` and `python-dotenv` deps | ✅ Updated |
| `Dockerfile` | Added COPY for all directories, `--workers 1` | ✅ Updated |
| `deployment/terraform/single-project/apis.tf` | Added `firestore.googleapis.com` API | ✅ Updated |
| `deployment/terraform/single-project/storage.tf` | Added Firestore database, assets bucket, and user content bucket | ✅ Updated |
| `deployment/terraform/single-project/service.tf` | Added env vars (USE_FIRESTORE, FIRESTORE_PROJECT_ID, GEMINI_API_KEY), max 3 instances | ✅ Updated |
| `deployment/terraform/single-project/variables.tf` | Added `gemini_api_key` variable + Firestore IAM roles | ✅ Updated |
| `deployment/terraform/single-project/iam.tf` | Added `roles/datastore.user` + `roles/firestore.user` | ✅ Updated |
| `deployment/terraform/single-project/outputs.tf` | Added assets bucket, Firestore DB, Cloud Run URL outputs | ✅ Updated |

### Firestore Collection Structure

```
/farmers/{farmer_id}
  ├── name, language
  └── /fields/{field_id}
        ├── name, soil_type, acres, irrigation_type
        └── /plantings/{planting_id}
              ├── crop_type, variety, planting_date, stage, nitrogen_ppm, moisture_pct, health_pct
              ├── /activities/{activity_id}
              ├── /farm_plans/{plan_id}
              ├── /reminders/{reminder_id}
              ├── /escalations/{escalation_id}
              └── /feedbacks/{feedback_id}
  └── /soil_reports/{report_id}
        ├── field_id, sample_date, lab_name, created_at
        └── /soil_test_values/{value_id}

/regional_outbreaks/{outbreak_id}
/okf_governance/{content_id}
/observability_logs/{log_id}
/privacy_preferences/{user_id}
```

### Terraform Resources

| Resource | Purpose | File |
|----------|---------|------|
| `google_firestore_database.database` | Firestore in Native mode (nam5 multi-region) | `storage.tf` |
| `google_storage_bucket.assets_bucket` | GCS for PWA assets + model files | `storage.tf` |
| `google_cloud_run_v2_service.app` | Cloud Run (0-3 instances, 4GiB, env vars) | `service.tf` |
| `google_project_iam_member.app_sa_roles` | Added `roles/datastore.user` + `roles/firestore.user` | `variables.tf` |

### Deployment Steps

```bash
# 1. Set your GCP project ID
export GCP_PROJECT_ID="your-project-id"

# 2. Set Terraform runtime variables
export TF_VAR_project_id="$GCP_PROJECT_ID"
export TF_VAR_gemini_api_key="your-gemini-api-key"

# 3. Initialize Terraform
cd deployment/terraform/single-project
terraform init

# 4. Plan
terraform plan -var="region=us-east1"

# 5. Apply (creates Firestore, GCS, Cloud Run)
terraform apply -var="region=us-east1"

# 6. Build Docker image
docker build -t us-east1-docker.pkg.dev/$GCP_PROJECT_ID/agentic-agri-advisor/krishi-sampark:latest .

# 7. Push to Artifact Registry
gcloud auth configure-docker us-east1-docker.pkg.dev
docker push us-east1-docker.pkg.dev/$GCP_PROJECT_ID/agentic-agri-advisor/krishi-sampark:latest

# 8. Update Cloud Run to use the new image
gcloud run services update agentic-agri-advisor \
  --image=us-east1-docker.pkg.dev/$GCP_PROJECT_ID/agentic-agri-advisor/krishi-sampark:latest \
  --region=us-east1

# 9. Get the URL
terraform output cloud_run_service_url
```

### Local Development

Local development uses the Firestore Emulator through the same persistence facade used in production:

```bash
make firestore-start
make serve
```

`make serve` exports `FIRESTORE_EMULATOR_HOST=localhost:8081`, `FIRESTORE_PROJECT_ID=emulator-project`, and `USE_FIRESTORE=1` before starting FastAPI.

---

## Firestore Runtime Design

**How:** Use Google Firestore for farmer profiles and data. Each farmer is a document, fields are subcollections.

```
Cloud Run Instance 1 ──→ ┌──────────────────────────┐
                          │  Firestore (NoSQL)       │
Cloud Run Instance 2 ──→ │  /farmers/{farmer_id}    │
                          │  /farmers/{id}/fields/   │
Cloud Run Instance 3 ──→ │  /farmers/{id}/soil/     │
                          └──────────────────────────┘
```

| Pros | Cons |
|------|------|
| Serverless — no instance to manage | No SQL — complex queries are harder |
| Auto-scales to millions of documents | No relational integrity (no JOINs) |
| $0 cost for low traffic (free tier) | Soil report queries need restructuring |
| Native offline sync (Firestore SDK) | Code changes are more extensive |
| Real-time listeners for live updates | Less familiar to developers used to SQL |

**Verdict:** Chosen for local and cloud persistence. The local emulator keeps browser, unit, and integration behavior close to production.

---

## Recommendation

Keep Firestore as the only backend persistence path. Use:

- Firestore Emulator for local development and browser testing.
- Firestore Native for Cloud Run.
- IndexedDB as the client offline twin.
- Cloud Storage for farmer-uploaded content, with Firestore metadata entries for search, listing, and audit.

---

## Current Terraform State

The existing `deployment/terraform/single-project/service.tf` has:
- ✅ Cloud Run service (configured)
- ✅ GCS logs bucket
- ✅ GCS assets bucket
- ✅ GCS user content bucket
- ✅ Firestore database
- ✅ Service account with IAM
- ✅ Scaling (min 1, max 10)

Remaining production hardening work is around IAM scoping, lifecycle policies, backup/export strategy, and secret management.

## Related Documents

- [Architecture Overview](../02-architecture/architecture-overview.md)
- [Data & Farm Twin Architecture](../02-architecture/data-and-farm-twin-architecture.md)
- [Known Limitations](../07-operations/known-limitations.md)
- [Future Roadmap](../08-roadmap/future-roadmap.md)
