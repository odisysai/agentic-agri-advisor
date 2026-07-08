# Development Guide

> **Status:** Active
> **Last Updated:** 2026-07-04
> **Owner:** Engineering

---

## Prerequisites

- Python 3.12+
- `uv` (universal package manager)
- `google-agents-cli` (optional, for playground)
- Node.js (optional, for ui_agents TypeScript)

## Setup

```bash
# Clone and setup
cd agentic-agri-advisor
make setup                    # uv sync --all-extras --dev

# Set up environment
cp config/secrets.template.env .env
# Edit .env: set GEMINI_API_KEY

# Start Firestore Emulator, then run the app
make firestore-start

# Run servers
make serve                                         # FastAPI (UI + APIs)
uv run python -m app.agent                           # ADK playground (port 8080)
```

## Key Files

| File | Purpose |
|------|---------|
| `app/fast_api_app.py` | Main FastAPI server: UI serving, profile/telemetry/OKF/safety/soil/TTS APIs |
| `app/agent.py` | ADK root agent entry point |
| `agents/coordinator/agent.py` | Krishi Sastri coordinator agent (routes to 9 specialists) |
| `agents/agent_registry.yaml` | Agent registry (10 agents) |
| `ui/agui/dashboard.js` | Core UI logic: advisor selection, routing, telemetry, soil test |
| `ui/agui/translations.js` | 5-language translation dictionary |
| `ui/agui/voice.js` | STT/TTS integration |
| `ui/agui/crop_classifier.js` | TFLite disease classifier + color heuristic fallback |
| `safety_kernel/kernel.py` | Agricultural Safety Kernel |
| `data/db_manager.py` | Firestore database manager facade |
| `config/dev.yaml` / `prod.yaml` | Environment configuration |

## Common Commands

```bash
# Development
make setup           # Install dependencies
make lint            # Ruff linting
make typecheck       # Type checking
make test            # Run all tests
make test-integration # Run integration tests only

# AI-SDLC gates
make validate-schemas       # Validate A2UI schemas
make validate-translations  # Validate 5-language translations
make validate-safety        # Validate safety policies
make coverage               # Run tests with evidence
make secret-scan            # Secret scanning
make dependency-scan        # Dependency vulnerability check
make sast                   # Static analysis
make ai-sdlc-check          # Run all gates

# Evaluation
set -a && source .env && set +a
uv run python tests/eval/run_local_eval.py --dataset tests/eval/datasets/agri-dataset.json --output-dir artifacts

# Build
make build          # Docker build
```

## Server Architecture

| Server | Port | Purpose |
|--------|------|---------|
| FastAPI | 8000 | UI serving, REST APIs (profile, telemetry, OKF, safety, soil, TTS) |
| ADK Playground | 8080 | Agent chat via `/run_sse` endpoint |

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `GEMINI_API_KEY` | Gemini API access (format: AI...) | ✅ Yes |
| `GOOGLE_CLOUD_PROJECT` | GCP project ID (for agents-cli) | Optional |
| `GOOGLE_CLOUD_LOCATION` | GCP region (default: global) | Optional |
| `PORT` | FastAPI port (default: 8000) | Optional |

## Coding Standards

1. **No bypassing tests** — Do not skip linter errors or suppress test failures
2. **No binary weights or credentials** — Do not commit model files or API keys
3. **No disabling PWA caching** — Offline-first is a core requirement
4. **Definition of Done** — Code changes are reviewable, Makefile checks pass, tests executed, evidence archived
5. **Translation keys** — Any new UI string must be added to all 5 languages in `translations.js`
6. **Safety kernel** — All prescriptive recommendations must pass through `safety_kernel/kernel.py`

## Related Documents

- [ADK Implementation Guide](adk-implementation-guide.md)
- [Local LLM & Device Capabilities](local-llm-and-device-capabilities.md)
- [PWA Offline Implementation](pwa-offline-implementation.md)
- [Soil Report Workflow](soil-report-workflow.md)
- [GEMINI.md](../../GEMINI.md) — ADK development commands
- [AGENTS.md](../../AGENTS.md) — Coding agent governance rules
