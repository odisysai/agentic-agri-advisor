# Krishi Sampark — Agent & Coding Guidance

> **Start here.** This file is the root routing document. Read it fully, then follow the links to load only the context you need for your task.

---

## CRITICAL: Two Separate Agent Systems — Do Not Confuse Them

This project has **two completely different sets of agents** with no overlap:

| | Directory | Purpose | Runs when |
|---|---|---|---|
| **Business AI Agents** | `agents/` | Serve farmers: crop advice, irrigation, pest detection, market prices | At **runtime** — farmer is using the app |
| **SDLC Governance Agents** | `.ai-sdlc/agents/` | Guide the **development process**: Developer Agent, Test Agent, Security Agent, Release Agent | During **development** — coding, testing, releasing |

**`agents/` contains Google ADK runtime agents** — Krishi Bisesagya (coordinator), Crop Analyst, Irrigation Advisor, Weather Advisor, Market Advisor, Pest Detector, Knowledge Retriever, Dashboard Agent, Farmer Interaction, Simulation Agent.

**`.ai-sdlc/agents/` contains SDLC governance personas** — declarative YAML files describing Developer Agent, Test Agent, Security Agent, Safety Review Agent, Release Agent, Documentation Agent, etc. These are not deployed; they define responsibilities and permitted tools for each SDLC role.

---

## Context Router — Read the Right File for Your Task

**Read `.context/00-index.md` for the full routing table.**

| Task | Read |
|---|---|
| Start local server / emulator / browser tests | `.context/01-local-dev.md` |
| Work on frontend PWA / UI / translations | `.context/02-frontend-pwa.md` + `ui/AGENTS.md` |
| Work on business AI agents (coordinator / specialist) | `.context/03-agent-system.md` + `agents/AGENTS.md` |
| Add a new language | `.context/04-add-language.md` |
| Add a new MCP tool | `.context/05-add-mcp-tool.md` + `mcp_servers/AGENTS.md` |
| Add a new specialist agent | `.context/06-add-agent.md` + `agents/AGENTS.md` |
| Touch the safety kernel | `.context/07-safety-kernel.md` + `safety_kernel/AGENTS.md` |
| SDLC governance / evidence / release | `.context/08-ai-sdlc.md` |
| Backend API / FastAPI | `app/AGENTS.md` |

---

## Directory Map

```
agents/           ← BUSINESS AI AGENTS (ADK runtime — serve farmers)
  coordinator/    ← Krishi Bisesagya — routes queries, enforces language + safety
  crop_analyst/   ← Crop health, NPK, growth stage
  irrigation_advisor/
  pest_detector/
  weather_advisor/
  market_advisor/
  knowledge_retriever/
  simulation_agent/
  dashboard_agent/
  farmer_interaction/

.ai-sdlc/agents/  ← SDLC GOVERNANCE PERSONAS (development process only)
  developer_agent.yaml
  test_agent.yaml
  security_agent.yaml
  safety_review_agent.yaml
  release_agent.yaml
  ...

app/              ← FastAPI backend (serves API + static frontend)
ui/               ← Frontend PWA shell + A2UI canvas + translations
mcp_servers/      ← MCP stdio tool servers (weather, market, RAG, OKF, TTS, STT, translation, image)
safety_kernel/    ← Agricultural safety enforcement (ADK callbacks)
tools/ai_sdlc/    ← Validation CLI + evidence writers (wired to `make` targets)
.context/         ← Modular context index (read this, not the whole repo)
```

---

## Commands Reference

```bash
make setup            # Install all Python dependencies
make dev              # Start Firestore emulator + FastAPI server (everything)
make serve            # FastAPI + frontend at http://localhost:8000
make serve-ui         # Static UI only at http://localhost:8080 (no backend)
make browser-test     # Playwright E2E tests (requires make serve running)
make test             # Unit tests
make test-integration # Integration tests
make lint             # ruff linting
make typecheck        # ty type checking
make ai-sdlc-check    # All validation gates
make check-language LANG=kn NAME=Kannada   # Audit language support
```

---

## Absolute Rules (apply everywhere, no exceptions)

### Translation
1. Every key ending in `Key` in any `ui/schemas/` file must exist in **all 6** language dicts in `translations.js`: `en`, `hi`, `mr`, `te`, `sw`, `zu`.
2. Hindi (`hi`) must contain zero Telugu Unicode (U+0C00–U+0C7F).
3. Telugu (`te`) must contain zero Devanagari Unicode (U+0900–U+097F).
4. Farmer names (`माधव जी`, `మాధవ్ జీ`) must never be altered.

### Business Agent Safety
5. `before_agent_callback` and `after_agent_callback` on `coordinator_agent` must never be removed.
6. All prescriptive recommendations (dosages, chemicals, sprays) must pass through the Agricultural Safety Kernel.
7. Never recommend banned chemicals. Never exceed PHI window. Always escalate low-confidence diagnoses.
8. Farmer Mode responses must be < 80 words, no markdown symbols, no internal agent names exposed.

### Security & Secrets
9. No hardcoded secrets, tokens, or API keys anywhere. Use env vars only.
10. Never commit binary model weights.
11. `hmac.compare_digest` for all signature comparisons — never `==`.

### Evidence Honesty
12. PASS status requires command-backed evidence. Missing tools = `NOT_EXECUTED`, not PASS.
13. Human approval in `.ai-sdlc/evidence/approvals/approvals.json` must be written by a human, never by automation.

---

## Definition of Done

A task is complete only when:
- Code changes are reviewable
- `make test` passes
- `make validate-translations` + `make validate-schemas` pass (for UI changes)
- Evidence artifacts are written (for SDLC gates)
- No linter suppressions added without documented justification

---

## 6. Prohibited Changes & Definition of Done

- Do NOT bypass failing tests or suppress linter errors.
- Do NOT commit binary weights or credentials.
- Do NOT disable PWA caching or local database twin fallback.
- **Definition of Done**: A task is complete only when code changes are reviewable, Makefile validation checks pass where required, tests are executed, and evidence JSON/Markdown files are archived. Do not claim signed evidence unless cryptographic signing is added.

## 7. Evidence and Release Honesty

- PASS requires a successful command-backed evidence artifact.
- Missing tools or skipped checks must be reported as NOT_EXECUTED, not PASS.
- Production release requires a human approval entry in `.ai-sdlc/evidence/approvals/approvals.json` that matches the current commit.
- Release readiness must remain NOT_READY when mandatory evidence, approvals, or rollback references are missing.
