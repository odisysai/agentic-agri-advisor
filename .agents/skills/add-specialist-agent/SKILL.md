---
name: add-specialist-agent
description: Create a new specialist ADK agent for Krishi Sampark and wire it to the coordinator agent.
applyTo: "agents/**"
---

# Skill: Add Specialist Agent

## Context Files

- `.context/06-add-agent.md` — detailed guide
- `.context/change-maps/add-agent.yaml` — file checklist
- `agents/AGENTS.md` — agent coding rules

## Execution Steps

1. **Create directory**:
   ```bash
   mkdir agents/<name>
   touch agents/<name>/__init__.py
   ```

2. **Write `agents/<name>/agent.py`** with ADK Agent definition.
   - Use `Gemini(model="gemini-2.5-flash")` — never change the model.
   - Include LANGUAGE RULE for all 6 language codes.
   - Never expose the agent name to the farmer.

3. **Add to coordinator** (`agents/coordinator/agent.py`):
   - Import the agent.
   - Add to `sub_agents=[...]`.
   - Update coordinator instruction with delegation guidance.

4. **Register in `agents/agent_registry.yaml`**.

5. **Write tests** in `tests/unit/agents/test_<name>.py`.

6. **Update `agents/AGENTS.md`** specialist agents table.

## Validation

```bash
uv run python -c "from agents.<name>.agent import <name>_agent; print('OK')"
uv run python -c "from agents.coordinator.agent import coordinator_agent; print('OK')"
make test
```
