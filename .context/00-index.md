# Krishi Sampark — Context Router

This is the **first file an agent or developer should read**. It routes you to the right context block for your task. Load only what you need — do not load all context files.

## Context Loading Protocol

| Your task | Load these files (in order) |
|---|---|
| Start local server / emulator | `.context/01-local-dev.md` |
| Work on frontend UI / PWA / A2UI canvas | `.context/02-frontend-pwa.md` + `ui/AGENTS.md` |
| Work on ADK agents / coordinator / specialist | `.context/03-agent-system.md` + `agents/AGENTS.md` |
| Add a new language | `.context/04-add-language.md` + `.context/change-maps/add-language.yaml` |
| Add a new MCP tool/server | `.context/05-add-mcp-tool.md` + `.context/change-maps/add-mcp-tool.yaml` + `mcp_servers/AGENTS.md` |
| Add a new specialist agent | `.context/06-add-agent.md` + `.context/change-maps/add-agent.yaml` + `agents/AGENTS.md` |
| Touch safety kernel / agronomic rules | `.context/07-safety-kernel.md` + `safety_kernel/AGENTS.md` |
| SDLC governance / evidence / release | `.context/08-ai-sdlc.md` + `.ai-sdlc/README.md` |
| Backend API / FastAPI routes | `app/AGENTS.md` |
| Fix a translation key bug | `.agents/skills/fix-translation-bug/SKILL.md` |
| Run browser / E2E tests | `.agents/skills/browser-testing/SKILL.md` |
| General setup (first time) | `.context/01-local-dev.md` |

## Absolute Rules (always apply — no exceptions)

1. **Safety kernel is read-only at runtime** — never bypass `before_agent_callback` / `after_agent_callback` in the coordinator.
2. **Translation keys must exist in all 6 languages** — `en`, `hi`, `mr`, `te`, `sw`, `zu`.
3. **No script leakage** — Hindi mode must never contain Telugu Unicode; Telugu mode must never contain Devanagari.
4. **No hardcoded secrets** — env vars only; `.env` is gitignored.
5. **Never commit binary model weights** — models are served from GCS bucket, not committed.
6. **Farmer-mode persona** — all final responses < 80 words, no markdown symbols, no internal agent names exposed.
7. **AGENTS.md files are law** — root AGENTS.md + domain-level AGENTS.md override any agent's default behavior.

## Project Tech Stack (quick reference)

| Layer | Technology |
|---|---|
| Backend API | FastAPI + Google ADK (`get_fast_api_app`) |
| Agent orchestration | Google ADK — `google.adk.agents.Agent` |
| Frontend shell | Vanilla JS/HTML/CSS PWA at `ui/agui/` |
| UI rendering | A2UI 2.0 Canvas — JSON schemas at `ui/schemas/` |
| Offline storage | IndexedDB via `LocalDb` class in `ui/agui/local_db.js` |
| Local AI (offline) | LiteRT / Gemma-4-E2B via `ui/agui/local_models.js` |
| Knowledge graph | OKF YAML files at `okf/` + `okf-knowledge-graph/` |
| MCP tools | stdio-mode Python servers at `mcp_servers/` |
| Safety | `safety_kernel/kernel.py` — ADK callbacks |

## File Ownership Map (who owns what)

| Component | Primary files | Domain guide |
|---|---|---|
| Coordinator agent | `agents/coordinator/agent.py` | `agents/AGENTS.md` |
| Specialist agents | `agents/<name>/agent.py` | `agents/AGENTS.md` |
| FastAPI server | `app/fast_api_app.py` | `app/AGENTS.md` |
| PWA shell | `ui/agui/` | `ui/AGENTS.md` |
| A2UI schemas | `ui/schemas/` | `ui/AGENTS.md` |
| MCP tools | `mcp_servers/<name>/server.py` | `mcp_servers/AGENTS.md` |
| Safety kernel | `safety_kernel/kernel.py` | `safety_kernel/AGENTS.md` |
| SDLC governance | `.ai-sdlc/` | `.context/08-ai-sdlc.md` |
