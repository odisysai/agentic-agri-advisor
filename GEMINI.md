# Coding Agent Guide

## CRITICAL: Two Separate Agent Systems — Do Not Confuse Them

This repository has **two completely different agent directories**:

| Directory | What it is | Runs when |
|---|---|---|
| `agents/` | **Business AI Agents** (ADK runtime) — Krishi Bisesagya coordinator + specialist agents (Crop Analyst, Irrigation, Pest, Weather, Market, etc.) | At runtime, serving farmers |
| `.ai-sdlc/agents/` | **SDLC Governance Personas** — Developer Agent, Test Agent, Security Agent, Release Agent (declarative YAML only, not deployed) | During development, guiding the SDLC process |

When a task says "work on agents", it means `agents/` (business AI). When a task says "SDLC agent" or "governance agent", it means `.ai-sdlc/agents/`.

---

## Context Loading Protocol

Load only the context you need for the current task. The routing table below is **self-contained** — you do not need to read another index file first. The `.context/` files are deep-dive references; load them on demand.

| Task | Load |
|---|---|
| Start local dev | `.context/01-local-dev.md` |
| Frontend / UI / translations | `.context/02-frontend-pwa.md` + `ui/AGENTS.md` |
| Business AI agents (ADK) | `.context/03-agent-system.md` + `agents/AGENTS.md` |
| Add a language | `.context/04-add-language.md` |
| Add MCP tool | `.context/05-add-mcp-tool.md` + `mcp_servers/AGENTS.md` |
| Add specialist agent | `.context/06-add-agent.md` + `agents/AGENTS.md` |
| Safety kernel | `.context/07-safety-kernel.md` + `safety_kernel/AGENTS.md` |
| SDLC / evidence / release | `.context/08-ai-sdlc.md` |
| Backend API | `app/AGENTS.md` |
| Fix translation bug | `.agents/skills/fix-translation-bug/SKILL.md` |
| Run browser tests | `.agents/skills/browser-testing/SKILL.md` |

**Context tiers — load in order, stop when you have enough:**
1. **Always**: this file (`GEMINI.md`) + domain `AGENTS.md` for your task area
2. **Task-specific**: matching `.context/<topic>.md` from the table above
3. **SDLC/release only**: `.ai-sdlc/` content

---

## Prerequisites

Install the CLI (one-time):
```bash
uv tool install google-agents-cli
```

---

## Development Phases

### Phase 1: Understand Requirements
Before writing any code, read `.context/00-index.md` to orient yourself. Load only the context files relevant to your task.

### Phase 2: Build and Implement
Implement agent logic in `agents/` (business agents) or `app/` (API). Use `agents-cli playground` for interactive testing. Iterate based on user feedback.

### Phase 3: The Evaluation Loop (Main Iteration Phase)
Start with 1-2 eval cases, run `agents-cli eval generate`, then `agents-cli eval grade`, iterate by making changes and rerunning both commands until satisfied. Expect 5-10+ iterations. Once you have a baseline, reach for `agents-cli eval compare` (regression diffs), `agents-cli eval analyze` (cluster failure modes), and `agents-cli eval optimize` (auto-tune prompts). See the **Evaluation Guide** for metrics, dataset schema, LLM-as-judge config, and common gotchas.

### Phase 4: Pre-Deployment Tests
Run `uv run pytest tests/unit tests/integration`. Fix issues until all tests pass.

### Phase 5: Deploy to Dev
**Requires explicit human approval.** Run `agents-cli deploy` only after user confirms. See the **Deployment Guide** for details.

### Phase 6: Production Deployment
Ask the user: Option A (simple single-project) or Option B (full CI/CD pipeline with `agents-cli infra cicd`).

## Development Commands

| Command | Purpose |
|---------|---------|
| `make dev` | Start Firestore emulator + FastAPI server (everything) |
| `make serve` | FastAPI + frontend at http://localhost:8000 |
| `make serve-ui` | Static UI only at http://localhost:8080 |
| `make browser-test` | Playwright E2E tests (requires make serve) |
| `make test` | Unit tests |
| `make check-language LANG=kn NAME=Kannada` | Audit language support completeness |
| `agents-cli playground` | Interactive local agent testing |
| `uv run pytest tests/unit tests/integration` | Run unit and integration tests |
| `agents-cli eval dataset synthesize` | Synthesize multi-turn eval scenarios for your agent |
| `agents-cli eval generate` | Run agent on eval dataset, produce traces |
| `agents-cli eval grade` | Run agent evaluations on the traces |
| `agents-cli eval compare` | Compare two grade-results files (regression check) |
| `agents-cli eval analyze` | Cluster failure modes from grade results |
| `agents-cli eval metric list` | List built-in metrics available in the SDK |
| `agents-cli eval optimize` | Auto-tune agent prompts using eval data |
| `agents-cli lint` | Check code quality |
| `agents-cli infra single-project` | Set up project infrastructure (Terraform) |
| `agents-cli deploy` | Deploy to dev |
| `agents-cli scaffold enhance` | Add deployment target or CI/CD to project |
| `agents-cli scaffold upgrade` | Upgrade project to latest version |

---

## Operational Guidelines for Coding Agents

- **Code preservation**: Only modify code directly targeted by the user's request. Preserve all surrounding code, config values (e.g., `model`), comments, and formatting.
- **NEVER change the model** unless explicitly asked.
- **Model 404 errors**: Fix `GOOGLE_CLOUD_LOCATION` (e.g., `global` instead of `us-east1`), not the model name.
- **ADK tool imports**: Import the tool instance, not the module: `from google.adk.tools.load_web_page import load_web_page`
- **Run Python with `uv`**: `uv run python script.py`. Run `agents-cli install` first.
- **Stop on repeated errors**: If the same error appears 3+ times, fix the root cause instead of retrying.
- **Terraform conflicts** (Error 409): Use `terraform import` instead of retrying creation.
