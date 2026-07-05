# Deployment Architecture Review

> **Status:** Decision Made — Implementation in Progress
> **Last Updated:** 2026-07-04
> **Owner:** Lead AI Solutions Architect
> **Decision:** Firestore (NoSQL) + Cloud Storage + Cloud Run (us-east1, pilot)

---

## Decision Made

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Database** | Firestore (Native mode) | Serverless, $0 free tier for pilot, auto-scales, no connection pool |
| **Object Storage** | GCS (logs + assets) | Already in Terraform, needed for TFLite model hosting |
| **Compute** | Cloud Run (us-east1, 0-3 instances) | Stateless, scales to zero, no infrastructure management |
| **Offline sync** | IndexedDB → Firestore | PWA sync queue writes to Firestore API endpoints |

---

## Implementation — Completed

### Files Modified

| File | Change | Status |
|------|--------|--------|
| `data/firestore_manager.py` | New Firestore implementation (all db_manager functions) | ✅ Created |
| `data/sqlite_manager.py` | Copy of old db_manager.py (local dev fallback) | ✅ Created |
| `data/db_manager.py` | Thin dispatcher: Firestore when env var set, SQLite otherwise | ✅ Updated |
| `pyproject.toml` | Added `google-cloud-firestore` and `python-dotenv` deps | ✅ Updated |
| `Dockerfile` | Added COPY for all directories, `--workers 1` | ✅ Updated |
| `deployment/terraform/single-project/apis.tf` | Added `firestore.googleapis.com` API | ✅ Updated |
| `deployment/terraform/single-project/storage.tf` | Added Firestore database + assets bucket | ✅ Updated |
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

### Local Development (No Changes Needed)

The dispatcher automatically uses SQLite when `FIRESTORE_PROJECT_ID` and `USE_FIRESTORE` env vars are not set:

```bash
# Local dev — SQLite automatically (no env vars needed)
uv run uvicorn app.fast_api_app:app --port 8000

# Cloud Run — Firestore (env vars set by Terraform)
# USE_FIRESTORE=1, FIRESTORE_PROJECT_ID=your-project
```

---

## Historical Analysis (Why Not SQLite?)

Cloud Run is **stateless**. Each container instance has ephemeral filesystem. SQLite in Cloud Run is fundamentally broken for multi-instance deployments:

```
Container Instance 1 (with farm_twin.db) ──→ Scale down ──→ 💥 Database lost
Container Instance 2 ──→ No farm_twin.db ──→ Fresh/empty database
Container Instance 3 ──→ Different farm_twin.db ──→ Data divergence
```

### Options Considered

| Option | Engine | Verdict |
|--------|--------|---------|
| A: SQLite + Filestore | SQLite on NFS volume | Good for pilot but SQLite has single-writer limitation |
| B: Cloud SQL PostgreSQL | Managed PostgreSQL | Best for production but more migration effort |
| **C: Firestore (chosen)** | Serverless NoSQL | **$0 free tier, auto-scales, no connection pool, native offline sync** |

**How:** Mount a persistent volume (GCP Filestore or NFS) to the Cloud Run container and store `farm_twin.db` there.

```
Cloud Run Instance 1 ──→ ┌──────────────────┐
                          │  Filestore (NFS)  │
Cloud Run Instance 2 ──→ │  farm_twin.db     │
                          └──────────────────┘
```

| Pros | Cons |
|------|------|
| Zero code changes — keep `sqlite3.connect()` | Filestore adds ~$50-200/month |
| Fast for single-instance | SQLite doesn't handle concurrent writes well across NFS |
| Works for pilot/demo | Not horizontally scalable — SQLite has single-writer limitation |
| No migration needed | Filestore has cold-start latency for first access |

**Verdict:** Good for a **pilot or demo** with <50 concurrent farmers. Not production-ready.

---

### Option B: Cloud SQL PostgreSQL (Recommended for Production)

**How:** Replace SQLite with Google Cloud SQL (PostgreSQL) for farmer profiles, fields, plantings, soil reports, and activities. Keep OKF as markdown files (read-only) and RAG as GCS-hosted embeddings.

```
Cloud Run Instance 1 ──→ ┌──────────────────────────┐
                          │  Cloud SQL (PostgreSQL)  │
Cloud Run Instance 2 ──→ │  farmers, fields,        │
                          │  plantings, soil_reports, │
Cloud Run Instance 3 ──→ │  activities, farm_plans   │
                          └──────────────────────────┘
```

| Pros | Cons |
|------|------|
| True horizontal scaling (10+ Cloud Run instances) | Requires code changes in `data/db_manager.py` |
| Connection pooling (via Cloud SQL Proxy) | Migration script needed (SQLite → PostgreSQL) |
| ACID transactions, concurrent writes | Adds ~$50-100/month for db-custom-1-3840 |
| Managed backups, point-in-time recovery | Slightly higher latency than local SQLite |
| Standard SQL — easy to query and analyze | New infrastructure to manage |
| Grows to millions of farmers | Requires VPC connector setup |

**Code changes needed:**

| File | Change |
|------|--------|
| `data/db_manager.py` | Replace `sqlite3` with `psycopg2` or `asyncpg` |
| `data/init_db.py` | Update DDL to PostgreSQL syntax |
| `app/fast_api_app.py` | Add Cloud SQL connection string from env var |
| `Dockerfile` | Add `psycopg2-binary` dependency |
| `deployment/terraform/single-project/` | Add Cloud SQL instance + database + user resources |
| `config/prod.yaml` | Add `database_url` config |

**Migration approach:**
1. Create Cloud SQL PostgreSQL instance via Terraform
2. Write migration script (`data/migrate_sqlite_to_postgres.py`) to copy existing data
3. Update `db_manager.py` to use PostgreSQL connection (env var `DATABASE_URL`)
4. Test locally with a local PostgreSQL instance
5. Deploy to Cloud Run with Cloud SQL connection

**Verdict:** **Best for production.** Horizontally scalable, managed, ACID-compliant. Worth the effort.

---

### Option C: Firestore (Serverless, No-SQL)

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

**Verdict:** Good for **future scale** but more disruptive to rewrite. Consider for v2.

---

## Recommendation

### Phased Approach

| Phase | Database | When | Why |
|-------|----------|------|-----|
| **Phase 1: Pilot/Demo** | SQLite with persistent volume | Now | Zero code changes, works for <50 farmers, good for Kaggle demo |
| **Phase 2: Production** | Cloud SQL PostgreSQL | After pilot validation | Horizontal scaling, ACID, managed backups, standard SQL |
| **Phase 3: Global Scale** | Firestore (or PostgreSQL sharding) | 10,000+ farmers | Serverless auto-scaling, regional replication |

### My Recommendation: Start with Phase 1, then move to Phase 2

**Phase 1 (Pilot):** Deploy to Cloud Run now with SQLite on a persistent volume. This gets us deployed quickly for demo/pilot testing with zero code changes. The data model is small (6 tables, single farmer) and SQLite handles this fine.

**Phase 2 (Production):** After the pilot validates the concept and we have >50 farmers, migrate to Cloud SQL PostgreSQL. The code changes in `db_manager.py` are straightforward — the schema maps directly to PostgreSQL with minor syntax changes.

### What I'd Need You to Decide

1. **Are we deploying for a pilot/demo (Phase 1) or production (Phase 2)?**
   - If pilot → I'll add a persistent volume to the Terraform and deploy
   - If production → I'll write the PostgreSQL migration first, then deploy

2. **Do we want to keep the IndexedDB offline sync architecture?**
   - Yes → The server database needs to accept sync writes from the PWA (works with either approach)
   - No → Simplifies things but removes offline-first capability

3. **What region?** (affects Cloud SQL and Cloud Run latency)
   - `us-east1` → Low latency for US/Canada
   - `asia-south1` → Low latency for India (Mumbai)
   - `europe-west1` → Low latency for Europe

---

## Current Terraform Gap

The existing `deployment/terraform/single-project/service.tf` has:
- ✅ Cloud Run service (configured)
- ✅ GCS logs bucket
- ✅ Service account with IAM
- ✅ Scaling (min 1, max 10)
- ❌ **No database** (no Cloud SQL, no Filestore)
- ❌ **No VPC connector** (needed for Cloud SQL)
- ❌ **No secrets manager** (for database credentials)

These need to be added regardless of which option we choose.

## Related Documents

- [Architecture Overview](../02-architecture/architecture-overview.md)
- [Data & Farm Twin Architecture](../02-architecture/data-and-farm-twin-architecture.md)
- [Known Limitations](../07-operations/known-limitations.md)
- [Future Roadmap](../08-roadmap/future-roadmap.md)