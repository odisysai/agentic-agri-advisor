# Adding a New MCP Tool / Server

Context for adding a new MCP-style tool server to Krishi Sampark.

For the machine-readable file list, see: `.context/change-maps/add-mcp-tool.yaml`

---

## MCP Server Architecture

Each MCP tool is a standalone Python stdio server in `mcp_servers/<name>/`. It exposes typed tools that ADK agents call at runtime.

```
mcp_servers/
  <name>/
    __init__.py
    server.py       # MCP tool definitions + FastMCP app
  mcp_registry.json # Registry of all servers (start commands)
```

---

## Step-by-step Checklist

### 1. Create the Server Directory

```bash
mkdir mcp_servers/<name>
touch mcp_servers/<name>/__init__.py
```

### 2. Write `mcp_servers/<name>/server.py`

Use the FastMCP pattern:

```python
"""<Tool name> MCP Server — <description>."""
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("<tool-name>")

@mcp.tool()
def my_tool(param1: str, param2: float) -> dict:
    """<Docstring becomes the tool description for the agent.>
    
    Args:
        param1: Description of param1.
        param2: Description of param2.
    
    Returns:
        A dict with results.
    """
    # Implementation
    return {"result": "..."}

if __name__ == "__main__":
    mcp.run(transport="stdio")
```

**Rules:**
- All tools must have complete docstrings (the agent uses them to decide when to call).
- Use typed function signatures — FastMCP generates the JSON schema.
- Return `dict` with a consistent `status` key (`"success"` / `"error"`).
- Never hardcode secrets — use `os.environ.get(...)`.

### 3. Register in `mcp_servers/mcp_registry.json`

```json
"<name>": {
  "type": "stdio",
  "command": "python",
  "args": ["mcp_servers/<name>/server.py"],
  "description": "<one-line description for agents>"
}
```

### 4. Add Tool Import to the Target Agent

In `agents/<target_agent>/tools.py` or `agent.py`:

```python
from mcp_servers.<name>.server import my_tool

my_agent = Agent(
    ...
    tools=[my_tool],   # add here
)
```

Or register via MCP runtime if using stdio transport (see existing `mcp_servers/weather/` for reference).

### 5. Update Agent Instruction

The agent that will use this tool needs to know when to call it. Add to the agent's instruction:

```
Use the <tool_name> tool when the farmer asks about <topic>.
```

### 6. Write Tests

Create `tests/unit/mcp_servers/test_<name>.py` with at least:
- Happy path test for each tool
- Error handling test (invalid input)

### 7. Update Documentation

Add the tool to `agents/AGENTS.md` in the MCP Tools section.

---

## Validation

```bash
# Syntax check the new server
python -c "import ast; ast.parse(open('mcp_servers/<name>/server.py').read()); print('OK')"

# Test import works
uv run python -c "from mcp_servers.<name>.server import my_tool; print('OK')"

# Run tests
make test

# Validate skills
make validate-skills
```

---

## Existing MCP Tools for Reference

| Tool | Path | What it does |
|---|---|---|
| `okf` | `mcp_servers/okf/server.py` | Query OKF knowledge graph (crops, diseases, pests) |
| `rag` | `mcp_servers/rag/server.py` | Semantic RAG search over agronomy docs |
| `weather` | `mcp_servers/weather/server.py` | Weather forecast and microclimate |
| `market` | `mcp_servers/market/server.py` | Mandi/crop prices |
| `image_analysis` | `mcp_servers/image_analysis/server.py` | Crop photo disease detection |
| `tts` | `mcp_servers/tts/server.py` | Text-to-speech audio |
| `stt` | `mcp_servers/stt/server.py` | Speech-to-text transcription |
| `translation` | `mcp_servers/translation/server.py` | Text translation between languages |
