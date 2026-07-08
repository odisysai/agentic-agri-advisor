# mcp_servers/ — Domain Guidance

Rules and patterns for working on MCP tool servers.

For adding a new MCP tool: `.context/05-add-mcp-tool.md`

---

## Server Registry

All servers are declared in `mcp_servers/mcp_registry.json`. This is the source of truth for ADK runtime registration.

| Server | Path | Description |
|---|---|---|
| `okf` | `okf/server.py` | OKF knowledge graph — crops, diseases, pests, safety |
| `rag` | `rag/server.py` | Semantic RAG search over agronomy documents |
| `weather` | `weather/server.py` | Weather forecast, microclimate, spray-window analysis |
| `market` | `market/server.py` | Mandi/crop prices, supply charts, financial tools |
| `image_analysis` | `image_analysis/server.py` | Multimodal plant disease detection from photos |
| `tts` | `tts/server.py` | Text-to-speech for audio farmer readouts |
| `stt` | `stt/server.py` | Speech-to-text transcription from voice queries |
| `translation` | `translation/server.py` | Text translation between supported languages |

---

## Server Pattern

All servers use `FastMCP`:

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("server-name")

@mcp.tool()
def tool_function(param: str) -> dict:
    """Docstring is the tool description used by agents to decide when to call."""
    ...
    return {"status": "success", "result": ...}

if __name__ == "__main__":
    mcp.run(transport="stdio")
```

---

## Rules

1. **Docstrings are mandatory** — agents use them to decide when to call the tool.
2. **Typed signatures only** — FastMCP generates JSON schema from Python types.
3. **Return `dict` with a `status` key** — use `"success"` or `"error"`.
4. **No hardcoded secrets** — use `os.environ.get(...)`.
5. **No write access to OKF at runtime** — OKF is read-only; the `okf-write-guard` hook in `.agents/hooks.json` enforces this.
6. **Validate file paths** — the `path-traversal-guard` hook validates path arguments.

## Security Notes

Path traversal is a real risk for tools that accept file paths (e.g., `image_analysis`, `stt`). The `.agents/hooks.json` `path-traversal-guard` validates these at runtime, but server code must also:
- Reject paths containing `..` or absolute paths outside the expected directory.
- Validate file extensions before processing.

---

## Translation Server — Language Support

`mcp_servers/translation/server.py` contains `MOCK_TRANSLATIONS` keyed by language code. When a new language is added, this dict must also be updated. See `.context/change-maps/add-language.yaml`.

---

## Validation

```bash
# Test any server loads
python -c "import ast; ast.parse(open('mcp_servers/<name>/server.py').read()); print('OK')"

# Check registry is valid JSON
python -c "import json; json.load(open('mcp_servers/mcp_registry.json')); print('OK')"

# Run tests
make test
```
