# Operations Runbook

> **Status:** Active
> **Last Updated:** 2026-07-04
> **Owner:** DevOps / Operations

---

## Server Management

### Starting Servers

```bash
# FastAPI (UI + REST APIs) — port 8000
uv run uvicorn app.fast_api_app:app --port 8000

# ADK Playground (agent chat) — port 8080
uv run python -m app.agent
```

### Health Checks

```bash
# FastAPI health
curl -s http://localhost:8000/api/profile/user | python3 -m json.tool

# ADK playground health
curl -s http://localhost:8080/ | head -5

# Weather API
curl -s "http://localhost:8000/api/weather?lat=21.15&lon=79.09" | python3 -m json.tool

# Market API
curl -s http://localhost:8000/api/market/price/corn | python3 -m json.tool
```

### Stopping Servers

```bash
# Find and kill processes
lsof -i :8000 | grep LISTEN | awk '{print $2}' | xargs kill
lsof -i :8080 | grep LISTEN | awk '{print $2}' | xargs kill
```

## Database Operations

### Start Local Database

```bash
make firestore-start
make serve
```

### Inspect Database

```bash
# Firestore Emulator listens on localhost:8081.
# Use the app APIs to inspect records:
curl -s http://localhost:8000/api/profile/user | python3 -m json.tool
curl -s "http://localhost:8000/api/uploads/user-content?category=crop_photos" | python3 -m json.tool
```

### Reset Database (Development Only)

```bash
make firestore-stop
make firestore-start
```

## Common Issues

### Port Already in Use

```bash
# Find process on port
lsof -i :8000
lsof -i :8080

# Kill process
kill -9 <PID>
```

### Gemini API Key Invalid

- Check `.env` file has `GEMINI_API_KEY=AI...`
- Key format starts with `AI` (not GCP service account)
- Verify: `set -a && source .env && set +a && env | grep GEMINI`

### Browser Shows Old JavaScript

- Clear browser cache or use hard reload (Cmd+Shift+R)
- Use cache-busting URL: `http://localhost:8000/agui/index.html?cb={timestamp}`
- Bump `?v=N` in `index.html` script tags

### Agent Not Responding

1. Check ADK playground is running (port 8080)
2. Check GEMINI_API_KEY is set
3. Check agent imports: `uv run python -c "from agents.coordinator.agent import coordinator_agent; print('OK')"`
4. Check MCP servers: `uv run python -c "from mcp_servers.weather.server import *; print('OK')"`

### Translation Keys Showing as Raw Text

1. Run `make validate-translations` to check completeness
2. Check that all 5 languages have the key in `translations.js`
3. Bump `translations.js?v=N` in `index.html`

### Safety Kernel Not Blocking

1. Run `uv run pytest tests/unit/test_safety_kernel.py -v`
2. Check `safety_kernel/kernel.py` imports are correct
3. Verify safety data files exist in `okf-knowledge-graph/data/safety/`
4. Run `make validate-safety`

## Deployment

### Docker Build

```bash
make build  # docker build -t krishi-sampark:latest .
```

### Cloud Run (Planned)

```bash
agents-cli deploy
```

## Rollback

**File:** `.ai-sdlc/workflows/release.yaml`

Rollback plan exists. Production rollback requires:
1. Revert to previous commit SHA
2. Redeploy
3. Verify health checks
4. Update approval record

## Related Documents

- [Known Limitations](known-limitations.md)
- [Observability Guide](observability-guide.md)
- [Development Guide](../04-engineering/development-guide.md)
