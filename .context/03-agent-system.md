# Agent System Context — Business AI Agents

Context for working on the ADK agent orchestration layer: coordinator, specialist agents, MCP tool wiring.

> **Scope: `agents/` only.** These are the RUNTIME business AI agents that serve farmers.
> SDLC governance agent personas are in `.ai-sdlc/agents/` — see `.context/08-ai-sdlc.md`.

---

## Architecture Overview

```
agents/
  agent.py            ← ADK CLI entry point ONLY — re-exports coordinator_agent as root_agent
                        DO NOT EDIT when adding specialist agents
  coordinator/
    agent.py          ← coordinator_agent definition (real business logic lives here)
  crop_analyst/agent.py
  irrigation_advisor/agent.py
  ...
  agent_registry.yaml ← registry of all agents
```

**`agents/agent.py` vs `agents/coordinator/agent.py`:**
- `agents/agent.py` — shim file. One line: `from agents.coordinator.agent import coordinator_agent as root_agent`. Required by `agents-cli` for discovery. Never touch it.
- `agents/coordinator/agent.py` — the actual coordinator with the full system prompt, sub_agents list, and safety callbacks. Edit this when changing routing logic or adding a new specialist to the sub_agents list.

---

## ADK Agent Pattern

Every specialist agent follows this pattern:

```python
from google.adk.agents import Agent
from google.adk.models import Gemini

my_agent = Agent(
    name="my_agent",                          # snake_case, unique
    model=Gemini(model="gemini-2.5-flash"),   # NEVER change model unless asked
    instruction="...",                         # system prompt
    tools=[my_tool_1, my_tool_2],             # MCP tools or Python functions
)
```

**Import the tool instance, not the module:**
```python
# CORRECT
from google.adk.tools.load_web_page import load_web_page

# WRONG — causes runtime errors
import google.adk.tools.load_web_page
```

---

## Coordinator Agent Rules

The coordinator (`agents/coordinator/agent.py`) is the single entry point.

**Immutable rules in the coordinator:**
1. **Language is the highest priority** — the `Language:` field in the context header determines the response language, ignoring the farmer's input language.
2. **Safety callbacks always fire** — `before_agent_callback=safety_before_agent` and `after_agent_callback=safety_after_agent` must never be removed.
3. **Farmer Mode JSON format** — all standard chat responses must be valid JSON matching the `{language, title, summary, recommendation, reasons, question, actions}` schema.
4. **No internal names exposed** — never reveal "coordinator", "crop analyst", "pathologist", or model names to the farmer.
5. **UI schema delegation** — when the farmer asks to "show", "open", or "display" a dashboard, the coordinator must call `get_ui_schema` with the exact schema name.

---

## Adding a New Specialist Agent

See `.context/06-add-agent.md` and `.context/change-maps/add-agent.yaml` for the full checklist.

Short summary:
1. Create `agents/<name>/` directory with `__init__.py` and `agent.py`.
2. Define the agent using `google.adk.agents.Agent`.
3. Include a LANGUAGE RULE in the instruction: `"If 'Respond in [code]', reply in [Language]."` for all 6 codes.
4. Import and add to `coordinator_agent.sub_agents` in `agents/coordinator/agent.py`.
5. Register in `agents/agent_registry.yaml`.
6. Add tests in `tests/unit/agents/`.

---

## Language Rule (all specialist agents)

Every specialist agent instruction must include this block:

```
LANGUAGE RULE: You MUST respond in the language specified by the coordinator.
If instructed 'Respond in hi', reply in Hindi.
If instructed 'Respond in mr', reply in Marathi.
If instructed 'Respond in te', reply in Telugu.
If instructed 'Respond in sw', reply in Swahili.
If instructed 'Respond in zu', reply in Zulu.
```

When adding a new language code, this block must be updated in ALL specialist agents.

---

## MCP Tool Integration

Agents receive MCP tools via the ADK runtime. The tool registry is at `mcp_servers/mcp_registry.json`.

Tools are Python functions (not MCP servers) in `agents/<name>/tools.py` or as direct imports from MCP server modules. The coordinator uses `get_ui_schema` from `agents/dashboard_agent/tools.py`.

To add a new tool: → see `.context/05-add-mcp-tool.md`

---

## Safety Kernel Integration

The coordinator has two ADK lifecycle callbacks:

```python
from safety_kernel import safety_after_agent, safety_before_agent

coordinator_agent = Agent(
    ...
    before_agent_callback=safety_before_agent,   # blocks banned chemicals
    after_agent_callback=safety_after_agent,     # flags dosage violations
)
```

These callbacks intercept every agent turn. They read OKF safety YAML files at module load time. Never remove them. Never disable them. See `safety_kernel/AGENTS.md` for safety rules.

---

## Running and Testing Agents

```bash
# Interactive playground (no frontend needed)
agents-cli playground

# Unit tests for agents
make test

# Eval dataset generation and grading (ADK eval loop)
agents-cli eval dataset synthesize
agents-cli eval generate
agents-cli eval grade
agents-cli eval compare    # regression diff
agents-cli eval analyze    # failure mode clusters
```

---

## Agent Registry

`agents/agent_registry.yaml` is the source of truth for registered agents. Keep it in sync when adding or removing agents.

## Validation

```bash
make validate-skills          # Validates .ai-sdlc/skills/ schemas
make test                     # Runs pytest including agent unit tests
uv run python -c "from agents.coordinator.agent import coordinator_agent; print('OK')"
```
