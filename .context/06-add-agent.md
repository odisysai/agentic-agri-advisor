# Adding a New Specialist Agent

Context for adding a new specialist agent to the Krishi Sampark multi-agent system.

For the machine-readable file list, see: `.context/change-maps/add-agent.yaml`

---

## Step-by-step Checklist

### 1. Create the Agent Directory

```bash
mkdir agents/<name>
touch agents/<name>/__init__.py
```

### 2. Write `agents/<name>/agent.py`

```python
from google.adk.agents import Agent
from google.adk.models import Gemini

<name>_agent = Agent(
    name="<name>_agent",                        # snake_case, globally unique
    model=Gemini(model="gemini-2.5-flash"),     # NEVER change unless asked
    instruction=(
        "You are a specialist <domain> advisor for smallholder farmers in India and East Africa. "
        "Your role is <specific role>. "
        "\n\n"
        "LANGUAGE RULE: You MUST respond in the language specified by the coordinator.\n"
        "If instructed 'Respond in hi', reply in Hindi.\n"
        "If instructed 'Respond in mr', reply in Marathi.\n"
        "If instructed 'Respond in te', reply in Telugu.\n"
        "If instructed 'Respond in sw', reply in Swahili.\n"
        "If instructed 'Respond in zu', reply in Zulu.\n"
        "\n"
        "FARMER MODE: Respond concisely (under 80 words). "
        "Do not expose your agent name or the fact that you are a sub-agent. "
        "Do not use markdown formatting symbols."
    ),
    tools=[],    # add MCP tools here
)
```

**NEVER expose the agent name to the farmer in any response.**

### 3. Add to `agents/coordinator/agent.py`

```python
from agents.<name>.agent import <name>_agent

coordinator_agent = Agent(
    ...
    sub_agents=[
        ...
        <name>_agent,   # add here
    ],
)
```

Also update the coordinator's instruction to describe when to delegate to this agent.

### 4. Register in `agents/agent_registry.yaml`

```yaml
- name: <Name> Agent
  id: AGENT-<DOMAIN>-01
  path: agents/<name>/agent.py
  description: <one-line description>
```

### 5. Export from `agents/__init__.py` (if needed)

If the agent needs to be importable from the package root, add:
```python
from agents.<name>.agent import <name>_agent
```

### 6. Write Tests

Create `tests/unit/agents/test_<name>.py` with at least:
- Test that the agent definition loads without error
- Test the instruction contains the LANGUAGE RULE
- Mock tool call test

### 7. Update Documentation

- Add to `agents/AGENTS.md` in the Specialist Agents section.
- Add to root `AGENTS.md` Architecture section if relevant.

---

## Validation

```bash
# Test agent imports without error
uv run python -c "from agents.<name>.agent import <name>_agent; print('OK')"

# Test full coordinator loads with new agent
uv run python -c "from agents.coordinator.agent import coordinator_agent; print('OK')"

# Run unit tests
make test
```

---

## Common Mistakes

- Forgetting the LANGUAGE RULE in the instruction — causes the sub-agent to respond in English regardless of the farmer's language setting.
- Using `model="gemini-2.5-flash"` as a string instead of `Gemini(model="gemini-2.5-flash")`.
- Not adding the agent to `coordinator_agent.sub_agents` — it will never be called.
- Exposing internal agent name in a response string.
