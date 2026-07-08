---
name: Codebase Understanding
description: Analyze structure, dependencies, and layout of components. Entry point for any new developer or agent starting work on Krishi Sampark.
---

# Reusable Skill: Codebase Understanding

## Start Here

Read `.context/00-index.md` first — it routes you to the right context block for your task.

## Input
- `target_dir`: directory to analyze (default: project root)

## Output
- `components`: list of major components with paths
- `dependency_tree`: import relationships

## Quick Orientation

```bash
# Verify the full project loads without import errors
uv run python -c "from agents.coordinator.agent import coordinator_agent; print('Agents OK')"
uv run python -c "from app.fast_api_app import app; print('FastAPI OK')"
uv run python -c "from safety_kernel import safety_before_agent; print('Safety kernel OK')"

# Check all MCP servers are registered
python -c "import json; reg = json.load(open('mcp_servers/mcp_registry.json')); print('MCP servers:', list(reg['mcp_servers'].keys()))"

# Validate environment is ready for local dev
uv run python -m tools.ai_sdlc.validate_environment

# See all components
cat .context/00-index.md
```

## Component Map

| Layer | Path | Guide |
|---|---|---|
| Backend API | `app/fast_api_app.py` | `app/AGENTS.md` |
| Agent coordinator | `agents/coordinator/agent.py` | `agents/AGENTS.md` |
| Specialist agents | `agents/<name>/agent.py` | `agents/AGENTS.md` |
| Frontend PWA | `ui/agui/` | `ui/AGENTS.md` |
| MCP tools | `mcp_servers/<name>/server.py` | `mcp_servers/AGENTS.md` |
| Safety kernel | `safety_kernel/kernel.py` | `safety_kernel/AGENTS.md` |
| OKF knowledge | `okf/` + `okf-knowledge-graph/` | — |
| SDLC governance | `.ai-sdlc/` | `.context/08-ai-sdlc.md` |

## Success Criteria
- [ ] All module imports succeed
- [ ] `validate_environment` passes
- [ ] MCP registry is valid JSON
- [ ] `.context/00-index.md` read and routing understood

## Failure Conditions
- [ ] Import errors in coordinator or safety kernel
- [ ] `mcp_registry.json` is malformed
- [ ] Missing `.env` with required API keys
