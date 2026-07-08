# Deployment Setup Guide

> **Status:** Active
> **Last Updated:** 2026-07-04
> **Audience:** Developers forking this repository

---

## Overview

This guide walks you through setting up Krishi Sampark from a fork to a running deployment on Google Cloud. The project uses:

- **Firestore** (Native mode) for farmer data
- **Cloud Storage** for logs and assets
- **Cloud Run** for the FastAPI backend
- **GitHub Actions** for CI/CD

## Architecture

```
GitHub Push → GitHub Actions (cd.yml)
  │
  ├── Quality Gate: agents-cli lint + tests + validations
  ├── Security Gate: secret scan + SAST + dependency scan + container scan
  └── Deploy (main push only):
      ├── Step 1: Terraform → Firestore + GCS + Cloud Run shell + IAM
      └── Step 2: agents-cli deploy → builds Docker image, pushes, updates Cloud Run
```

---

## Prerequisites

### 1. Google Cloud Project

```bash
# Create a new project (or use existing)
gcloud projects create your-project-id --name="Krishi Sampark"
gcloud config set project your-project-id

# Enable billing (required for Firestore and Cloud Run)
# Go to: https://console.cloud.google.com/billing/linkedaccount?project=your-project-id

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com \
  logging.googleapis.com \
  cloudtrace.googleapis.com \
  aiplatform.googleapis.com
```

### 2. Install Local Tools

```bash
# Python 3.12+
python --version

# uv package manager
curl -LsSf https://astral.sh/uv/install.sh | sh

# Google Cloud CLI
# Install from: https://cloud.google.com/sdk/docs/install
gcloud auth login
gcloud auth application-default login

# Terraform (for infrastructure)
# Install from: https://developer.hashicorp.com/terraform/downloads

# Java (for Firestore Emulator)
java -version

# Install Firestore Emulator component
gcloud components install cloud-firestore-emulator
```

### 3. Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create an API key (starts with `AI...`)
3. Store it in `.env`:
```bash
cp config/secrets.template.env .env
# Edit .env: GEMINI_API_KEY=AIza...
```

---

## Local Development

### Option A: Firestore Emulator (Recommended Local Path)

Local development uses the Firestore Emulator so the same Firestore data path is exercised before production.

```bash
# Clone your fork
git clone https://github.com/your-username/agentic-agri-advisor.git
cd agentic-agri-advisor

# Install dependencies
make setup

# Set Gemini API key
cp config/secrets.template.env .env
# Edit .env with your GEMINI_API_KEY

# Start Firestore Emulator in background
make firestore-start
# → Emulator runs at localhost:8081

# Start the server
make serve
# → http://localhost:8000/agui/index.html
```

### Option B: Firestore Native (GCP Project)

```bash
# Authenticate and point the app at your GCP project
gcloud auth application-default login
export FIRESTORE_PROJECT_ID=your-gcp-project
export USE_FIRESTORE=1

# Start the server with Firestore Emulator
make serve-firestore
# → http://localhost:8000/agui/index.html
# → Data stored in Firestore Emulator (in-memory, resets on restart)

# Stop the emulator when done
make firestore-stop
```

### Option C: Real GCP Firestore (Staging/Production)

```bash
# Authenticate to GCP
gcloud auth application-default login

# Start the server pointing to your GCP project
export FIRESTORE_PROJECT_ID=your-gcp-project
export USE_FIRESTORE=1
make serve
# → Data stored in your real GCP Firestore database
```

---

## GitHub Actions Configuration

### Step 1: Configure Repository Secrets

Go to your fork's **Settings → Secrets and variables → Actions → New repository secret**:

| Secret Name | Value | How to Get |
|-------------|-------|------------|
| `GCP_PROJECT_ID` | Your GCP project ID | `gcloud config get-value project` |
| `GEMINI_API_KEY` | Your Gemini API key | From [Google AI Studio](https://aistudio.google.com/apikey) |
| `GCP_SA_KEY` | Service account JSON key | See Step 2 below |

### Step 2: Create Service Account for GitHub Actions

```bash
# Set reusable variables (no hardcoded project/service-account names)
export PROJECT_ID="your-project-id"
export GITHUB_ACTIONS_SA="your-github-actions-sa"

# Create service account
gcloud iam service-accounts create "$GITHUB_ACTIONS_SA" \
  --project="$PROJECT_ID" \
  --display-name="GitHub Actions Deployer"

# Grant required roles
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${GITHUB_ACTIONS_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${GITHUB_ACTIONS_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/firestore.admin"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${GITHUB_ACTIONS_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${GITHUB_ACTIONS_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${GITHUB_ACTIONS_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.editor"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${GITHUB_ACTIONS_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.admin"

# Roles used by Terraform-managed IAM + telemetry resources
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${GITHUB_ACTIONS_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/serviceusage.serviceUsageAdmin" \
  --condition=None

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${GITHUB_ACTIONS_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/resourcemanager.projectIamAdmin" \
  --condition=None

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${GITHUB_ACTIONS_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountAdmin" \
  --condition=None

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${GITHUB_ACTIONS_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/bigquery.admin" \
  --condition=None

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${GITHUB_ACTIONS_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/logging.configWriter" \
  --condition=None

# Create and download the key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account="${GITHUB_ACTIONS_SA}@${PROJECT_ID}.iam.gserviceaccount.com"

# Copy the entire contents of github-actions-key.json
cat github-actions-key.json
# Paste this as the value of GCP_SA_KEY secret in GitHub

# IMPORTANT: Delete the key file after adding to GitHub Secrets
rm github-actions-key.json
```

### Step 3: Create Artifact Registry

```bash
# Reuse variables from Step 2
export REGION="your-region"
export ARTIFACT_REGISTRY_REPO="your-artifact-repo"

# Create Artifact Registry repository for Docker images
gcloud artifacts repositories create "$ARTIFACT_REGISTRY_REPO" \
  --repository-format=docker \
  --location="$REGION" \
  --description="Krishi Sampark Docker images"
```

### Step 4: Configure Deployment Approval Gate (Required)

The deploy stage uses a GitHub **Environment** called `pilot` to enforce manual approval before deployment. This means features are **not live** until a human approves the deployment.

**To configure:**

1. Go to **Settings → Environments → New environment**
2. Name it `pilot`
3. Check **"Required reviewers for deployment"**
4. Add your GitHub username (or team members) as reviewers
5. Save

**How it works:**

```
Push to main
    │
    ▼
Quality Gate runs ──→ Security Gate runs ──→ Deploy job starts
                                                    │
                                                    ▼
                                            ⏸️ PAUSED — waiting for approval
                                                    │
                                            GitHub Actions UI shows:
                                            "1 deployment waiting for review"
                                                    │
                                            Reviewer clicks "Approve"
                                                    │
                                                    ▼
                                            Terraform apply → agents-cli deploy
                                                    │
                                                    ▼
                                            ✅ Live on Cloud Run
```

**Without this configuration**, the deploy job will fail with an environment error. You **must** configure the `pilot` environment with at least one required reviewer.

### Step 5: Set Terraform Runtime Variables

Set Terraform variables at runtime instead of using a committed tfvars file:

```bash
export TF_VAR_project_id="your-gcp-project-id"
export TF_VAR_gemini_api_key="your-gemini-api-key"
```

Region is passed during plan/apply (`-var="region=us-east1"`) in CI. Secrets (`GEMINI_API_KEY`, `GCP_SA_KEY`) should remain in GitHub Secrets for pipeline runs.

---

## CI/CD Pipeline

The `.github/workflows/cd.yml` file defines a 3-stage pipeline:

### Stage 1: Quality Gate (runs on PR + push)

- `agents-cli lint` (ruff + ty + codespell)
- Schema validation
- Translation validation (5 languages)
- Safety kernel validation
- Test suite with evidence
- Documentation existence check

### Stage 2: Security Gate (runs on PR + push)

- Secret scanning (detect-secrets)
- Dependency vulnerability scanning (pip-audit)
- Static analysis security testing (bandit)
- Container vulnerability scanning (trivy)

### Stage 3: Deploy (runs on push to main only — REQUIRES MANUAL APPROVAL)

The deploy job uses the `pilot` GitHub Environment with required reviewers.

1. **Quality + Security gates pass** (automatic)
2. **Deploy job starts** but **pauses** — waits for human approval
3. **Reviewer approves** in GitHub Actions UI
4. **Terraform apply** — creates/updates Firestore, GCS, Cloud Run, IAM
5. **agents-cli deploy** — builds Docker image, pushes to Artifact Registry, updates Cloud Run
6. **Health check** — verifies the deployed service responds

> **Important**: Features are NOT live until the deploy is approved. This prevents unreviewed code from reaching production.

---

## Workflow Structure

```
.github/workflows/
├── cd.yml                    ← 3-stage CI/CD pipeline (quality + security + deploy)
└── release-readiness.yml     ← Release evaluation (runs on GitHub release)
```

### `cd.yml` Triggers

```yaml
on:
  push:
    branches: [ main ]     # Quality + Security + Deploy
  pull_request:
    branches: [ main ]     # Quality + Security only (no deploy)
  workflow_dispatch:        # Manual trigger (full pipeline)
```

---

## Manual Deployment (Without GitHub Actions)

If you prefer to deploy manually instead of using GitHub Actions:

### Step 1: Terraform Apply

```bash
cd deployment/terraform/single-project

# Set variables
export TF_VAR_gemini_api_key="your-gemini-api-key"

# Initialize
terraform init

# Plan (review what will be created)
terraform plan \
  -var="project_id=your-gcp-project-id" \
  -var="region=us-east1" \
  -var="gemini_api_key=your-gemini-api-key"

# Apply
terraform apply \
  -var="project_id=your-gcp-project-id" \
  -var="region=us-east1" \
  -var="gemini_api_key=your-gemini-api-key"

# Get the Cloud Run URL
terraform output cloud_run_service_url
```

### Step 2: Build and Deploy with agents-cli

```bash
# Authenticate
gcloud auth configure-docker us-east1-docker.pkg.dev

# Deploy using agents-cli
export GEMINI_API_KEY="your-gemini-api-key"
export GOOGLE_CLOUD_PROJECT="your-gcp-project-id"
export GOOGLE_CLOUD_LOCATION="us-east1"
agents-cli deploy --region=us-east1
```

### Step 3: Verify

```bash
SERVICE_URL=$(terraform -chdir=deployment/terraform/single-project output -raw cloud_run_service_url)
curl -sf "${SERVICE_URL}/api/profile/user" | python3 -m json.tool
```

---

## Environment Variables Reference

| Variable | Local (Emulator) | Local (GCP) | Cloud Run |
|----------|-------------------|-------------|-----------|
| `GEMINI_API_KEY` | `.env` file | `.env` file | GitHub Secret → Terraform env var |
| `FIRESTORE_EMULATOR_HOST` | `localhost:8081` | not set | not set |
| `FIRESTORE_PROJECT_ID` | `emulator-project` | `your-gcp-project` | set by Terraform |
| `USE_FIRESTORE` | `1` | `1` | `1` (set by Terraform) |
| `GOOGLE_CLOUD_PROJECT` | not set | `your-gcp-project` | set by Terraform |

---

## Troubleshooting

### Firestore Emulator Won't Start

```bash
# Check if Java is installed
java -version

# Check if emulator is already running
lsof -i :8081

# Kill stale emulator process
make firestore-stop

# Restart
make firestore-start
```

### Terraform Errors

```bash
# Clean terraform state
cd deployment/terraform/single-project
rm -rf .terraform .terraform.lock.hcl terraform.tfstate*

# Reinitialize
terraform init
```

### Cloud Run Won't Start

```bash
# Check Cloud Run logs
gcloud run services logs read agentic-agri-advisor --region=us-east1

# Check if env vars are set
gcloud run services describe agentic-agri-advisor --region=us-east1 --format="value(spec.template.spec.containers[0].env)"
```

### GitHub Actions Fails

1. Check that all 3 secrets are configured: `GCP_PROJECT_ID`, `GEMINI_API_KEY`, `GCP_SA_KEY`
2. Verify `GCP_SA_KEY` is the full JSON content of the service account key file
3. Check that the service account has all required IAM roles
4. Ensure Artifact Registry repository exists

---

## Cost Estimate (Pilot)

| Resource | Free Tier | Pilot Usage | Cost |
|----------|-----------|-------------|------|
| Firestore | 50K reads/day, 20K writes/day, 1GB storage | <100 reads/day | $0 |
| Cloud Run | 2M requests/month, 360K vCPU-seconds | <100 requests/day | $0 |
| Cloud Storage | 5GB standard storage | <1GB | $0 |
| Artifact Registry | 0.5GB storage | <500MB | $0 |
| Cloud Build | 120 builds/day | <10 builds/day | $0 |
| **Total (pilot)** | | | **$0/month** |

---

## Related Documents

- [Deployment Architecture Review](deployment-architecture-review.md) — Why Firestore was chosen
- [Runbook](runbook.md) — Server management and troubleshooting
- [Development Guide](../04-engineering/development-guide.md) — Local development setup
- [Known Limitations](known-limitations.md) — What's not done yet
