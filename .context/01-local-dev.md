# Local Development Runbook

Complete guide to starting, testing, and debugging Krishi Sampark locally.

---

## Prerequisites

```bash
# 1. Install uv (Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh

# 2. Install Google Cloud CLI (needed for Firestore emulator)
# macOS: brew install --cask google-cloud-sdk
# Then authenticate:
gcloud auth application-default login

# 3. Install project dependencies
make setup
# Equivalent to: uv sync --all-extras --dev

# 4. Copy and configure environment variables
cp config/secrets.template.env .env
# Edit .env: set GEMINI_API_KEY at minimum for local testing
```

---

## Starting the Full Stack (most common — use this)

```bash
# Step 1: Start Firestore Emulator in a separate terminal
make firestore-start
# Starts gcloud emulator on localhost:8081
# You will see: "Firestore Emulator running at http://localhost:8081"

# Step 2: Start FastAPI server (serves both API + frontend)
make serve
# Starts uvicorn on http://localhost:8000 with --reload (hot reload)
# Frontend is at: http://localhost:8000
# ADK API is at: http://localhost:8000/api/
```

Or start everything in one command:

```bash
make dev
# Starts Firestore emulator + FastAPI server together
```

---

## URL Map

| URL | What it is |
|---|---|
| `http://localhost:8000` | Landing page (farmer login / guest entry) |
| `http://localhost:8000/app/home` | Main PWA dashboard (requires login) |
| `http://localhost:8000/onboarding` | Farmer onboarding flow |
| `http://localhost:8000/api/health` | Health check (returns `{"status":"ok"}`) |
| `http://localhost:8000/api/auth/config` | Auth config (shows if Google OIDC is active) |
| `http://localhost:8000/docs` | FastAPI Swagger UI |
| `http://localhost:8000/api/okf/sync` | OKF knowledge cache for offline PWA |

---

## Running Browser / E2E Tests

```bash
# Install Playwright browsers (one-time)
uv run playwright install chromium

# Run the full browser test
make browser-test
# Runs test_real_browser.py with Playwright (visible browser, headless=False)
```

If the server is not running, `make browser-test` will fail. Start `make serve` first.

---

## Running Unit + Integration Tests

```bash
make test                # All unit tests (no integration)
make test-integration    # Integration tests only
make lint                # ruff linting
make typecheck           # ty type checking
```

---

## Environment Variables Reference

Minimum required to run locally:

| Variable | Purpose | Default |
|---|---|---|
| `GEMINI_API_KEY` | Cloud Gemini API calls | Required for agent queries |
| `FIRESTORE_EMULATOR_HOST` | Points to local emulator | Set by `make serve` automatically |
| `FIRESTORE_PROJECT_ID` | Emulator project name | `emulator-project` |
| `USE_FIRESTORE` | Enable Firestore backend | `1` (enabled) |
| `APP_SESSION_SECRET` | Cookie signing key | `dev-only-change-me` (change in prod) |

Optional but useful:

| Variable | Purpose |
|---|---|
| `GOOGLE_OIDC_CLIENT_ID` | Enable Google Sign-In |
| `GOOGLE_OIDC_ALLOW_LOCALHOST` | Allow Google login from localhost (set `1`) |
| `REQUIRE_GOOGLE_LOGIN` | Force login (default off for local dev) |
| `ALLOW_ORIGINS` | CORS origins (comma-separated) |

---

## Common Issues and Fixes

**`ModuleNotFoundError: No module named 'google.adk'`**
```bash
make setup   # re-run dependency install
```

**`FIRESTORE_EMULATOR_HOST is not set`**
```bash
make firestore-start   # start emulator first, then make serve
```

**`Model 404 error from ADK`**
- Fix `GOOGLE_CLOUD_LOCATION` env var — set to `global` instead of a region like `us-east1`.
- Do NOT change the model name.

**`Playwright: browser not found`**
```bash
uv run playwright install chromium
```

**`Port 8000 already in use`**
```bash
lsof -i :8000 | grep LISTEN   # find the PID
kill <PID>
```

**`gcloud: command not found`**
- Install Google Cloud SDK: `brew install --cask google-cloud-sdk`

---

## ADK Playground (interactive testing without the full UI)

```bash
agents-cli playground
# Opens interactive console to test agents directly
```

---

## Static Frontend Development Only (no backend)

If you only need to work on the frontend HTML/CSS/JS and want to skip the backend:

```bash
make serve-ui
# Serves ui/ as static files on http://localhost:8080
# NOTE: API calls will fail — agent chat won't work
```

---

## Stopping Everything

```bash
make firestore-stop   # Stop Firestore emulator
# Ctrl+C in the uvicorn terminal to stop FastAPI
```
