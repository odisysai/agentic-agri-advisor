---
name: add-mcp-tool
description: Add a new MCP tool server to Krishi Sampark, register it in the registry, and wire it to the appropriate specialist agent.
applyTo: "mcp_servers/**"
---

# Skill: Add MCP Tool

## Context Files

- `.context/05-add-mcp-tool.md` — detailed guide
- `.context/change-maps/add-mcp-tool.yaml` — file checklist
- `mcp_servers/AGENTS.md` — server rules

## Execution Steps

1. **Create the server directory and files**:
   ```bash
   mkdir mcp_servers/<name>
   touch mcp_servers/<name>/__init__.py
   ```

2. **Write `mcp_servers/<name>/server.py`** using FastMCP pattern (see `.context/05-add-mcp-tool.md`).

3. **Register in `mcp_servers/mcp_registry.json`**:
   ```json
   "<name>": {
     "type": "stdio",
     "command": "python",
     "args": ["mcp_servers/<name>/server.py"],
     "description": "..."
   }
   ```

4. **Wire to agent** — import tool in `agents/<target>/agent.py` and add to `tools=[...]`.

5. **Write tests** in `tests/unit/mcp_servers/test_<name>.py`.

6. **Update** `agents/AGENTS.md` MCP tools table.

## Validation

```bash
uv run python -c "from mcp_servers.<name>.server import <tool_fn>; print('OK')"
python -c "import json; json.load(open('mcp_servers/mcp_registry.json')); print('OK')"
make test
```
