# Krishi Sampark: Agentic Agriculture Advisor

[![CD](https://github.com/girinalin/agentic-agri-advisor/actions/workflows/cd.yml/badge.svg)](https://github.com/girinalin/agentic-agri-advisor/actions/workflows/cd.yml)
[![Python](https://img.shields.io/badge/python-3.11%2B-blue.svg)](pyproject.toml)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Stars](https://img.shields.io/github/stars/girinalin/agentic-agri-advisor?style=social)](https://github.com/girinalin/agentic-agri-advisor/stargazers)

Krishi Sampark is an offline-first, voice-first, multi-agent agriculture advisor built with Google ADK + FastAPI + A2UI/AGUI. It supports farmer guidance, safety validation, expert escalation, telemetry, and hybrid local/cloud AI execution.

## Why This Project

- Multi-agent agronomy orchestration (crop, irrigation, market, weather, diagnostics)
- Farmer-friendly web UI with multilingual support
- Offline-capable local data twin and sync workflow
- Evidence-driven AI-SDLC validation and release checks

## Live Demo

- Cloud Run URL: configure and publish from your deployment output
- Local dashboard: `http://localhost:8000/agui/index.html`

## Quick Start

```bash
make setup
uv run agents-cli playground
uv run python -m app.fast_api_app
```

Then open:

- `http://localhost:8000/agui/index.html` (recommended)
- `http://localhost:8000/a2ui/index.html`

## Repository Layout

```text
agents/              Python ADK agents
app/                 FastAPI backend and APIs
ui/agui/             Farmer web dashboard
ui/a2ui/             Declarative canvas renderer
mcp_servers/         MCP tool servers (weather, rag, market, stt, tts, etc.)
okf/                 Agricultural ontology and knowledge files
rag_pipeline/        Retrieval pipeline assets
safety_kernel/       Safety validation rules
docs/                Architecture, operations, and plans
.ai-sdlc/            Governance evidence and release artifacts
```

## Key Commands

```bash
make lint
make typecheck
make test
make ai-sdlc-check
make release-check
```

## Documentation

- [AGENTS.md](AGENTS.md)
- [Technical Architecture](docs/TECHNICAL_ARCHITECTURE.md)
- [Hybrid Intelligence Strategy](docs/HYBRID_INTELLIGENCE_STRATEGY.md)
- [PWA LLM Plan](docs/PWA_LLM_IMPLEMENTATION_PLAN.md)
- [Operations Docs](docs/07-operations)

## Security and Responsible Use

- Use [SECURITY.md](SECURITY.md) for vulnerability reporting
- All agronomic recommendations should pass through the safety kernel
- Treat this as decision-support, not a replacement for certified local agronomists

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening pull requests.

