---
name: local-dev-setup
description: Start the Krishi Sampark local development environment including the FastAPI server, Firestore emulator, and frontend. Covers first-time setup and common troubleshooting.
applyTo: "**/*"
---

# Skill: Local Development Setup

## Context File

Read `.context/01-local-dev.md` for the complete runbook.

## Quick Start (most common)

```bash
# Terminal 1: Start Firestore emulator
make firestore-start

# Terminal 2: Start FastAPI + frontend
make serve
# App is at http://localhost:8000
```

Or in one command:
```bash
make dev
```

## First-Time Setup

```bash
make setup               # Install all Python dependencies
cp config/secrets.template.env .env
# Edit .env: set GEMINI_API_KEY
```

## Key URLs

| URL | Purpose |
|---|---|
| `http://localhost:8000` | Landing page |
| `http://localhost:8000/app/home` | Main PWA (after login) |
| `http://localhost:8000/api/health` | Health check |
| `http://localhost:8000/docs` | Swagger API docs |

## Troubleshooting

**`No module named 'google.adk'`** → run `make setup`

**`FIRESTORE_EMULATOR_HOST not set`** → run `make firestore-start` before `make serve`

**`Model 404`** → set `GOOGLE_CLOUD_LOCATION=global` in `.env`

**Port 8000 in use** → `lsof -i :8000 | grep LISTEN` then `kill <PID>`

**Playwright not found** → `uv run playwright install chromium`
