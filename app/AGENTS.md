# app/ — Domain Guidance

Rules and patterns for working on the FastAPI backend.

---

## Key Files

| File | Purpose |
|---|---|
| `app/fast_api_app.py` | Main FastAPI application — ALL routes, middleware, auth, safety endpoints |
| `app/__init__.py` | Package init |
| `app/agent.py` | ADK agent runner integration |
| `app/app_utils/telemetry.py` | OpenTelemetry setup |
| `app/app_utils/typing.py` | Pydantic models (Feedback, etc.) |
| `app/app_utils/user_content_storage.py` | GCS file upload helper |

---

## Architecture Notes

The FastAPI app is created by ADK's `get_fast_api_app()`:

```python
app = get_fast_api_app(
    agents_dir=AGENT_DIR,
    web=True,
    artifact_service_uri=...,
    allow_origins=...,
    session_service_uri=...,
    otel_to_cloud=...,
)
```

This mounts the ADK runner at `/run` and `/apps/`. The static UI files are mounted **after** all routes at `/` via:

```python
app.mount("/", StaticFiles(directory=ui_dir, html=True), name="ui")
```

**Order matters:** all API routes must be registered BEFORE the static files mount.

---

## Route Map

| Prefix | Purpose |
|---|---|
| `GET /` | Landing page (`ui/index.html`) |
| `GET /app/home` | Main PWA (requires auth) |
| `POST /api/auth/google` | Google OIDC login |
| `POST /api/auth/guest` | Guest login |
| `GET /api/auth/me` | Current user profile |
| `POST /api/auth/logout` | Logout |
| `GET /api/health` | Health check |
| `GET /api/profile/{farmer_id}` | Farmer profile |
| `POST /api/profile/{farmer_id}` | Save farmer profile |
| `POST /api/safety/validate` | Pre-flight safety check |
| `GET /api/escalations/pending` | Pending expert escalations |
| `POST /api/escalations/resolve` | Resolve an escalation |
| `GET /api/okf/sync` | OKF knowledge cache for PWA |
| `POST /api/soil/save` | Save soil test report |
| `POST /api/soil/extract` | Extract soil values from image |
| `POST /api/uploads/user-content` | Upload farmer content |
| `GET /api/model-config` | Browser model asset URLs |
| `GET /agui/model_config.js` | Runtime model config JS |

---

## Language Maps in `fast_api_app.py`

Three language-related data structures must be updated when adding a new language:

1. **`VOICE_MAP`** — maps full language name + BCP-47 code to edge-tts voice name.
2. **`lang_greetings`** — maps 2-letter code to greeting text.
3. **Expert system prompt** — the expert chat system prompt lists supported greeting words.

See `.context/change-maps/add-language.yaml` for exact anchors.

---

## Security Rules

- All session cookies use HMAC-SHA256 signing (`_sign_payload` / `_read_session_cookie`).
- Never use `==` for signature comparison — use `hmac.compare_digest`.
- Rate limiting on expert endpoints: `EXPERT_RATE_LIMIT` / `EXPERT_RATE_WINDOW` env vars.
- `APP_SESSION_SECRET` must be set to a strong random value in production.
- `SESSION_COOKIE_SECURE` must be `1` in production (HTTPS only).
- All user-provided file names are not trusted for path construction.

---

## Coding Rules

- All API routes must be registered BEFORE `app.mount("/", StaticFiles(...))`.
- Use `_resolve_farmer_id(request, fallback)` to get the farmer ID from the session cookie.
- Never trust raw `farmer_id` from request body without session validation.
- Pydantic models must have `Field(...)` with `min_length` for required string inputs.

---

## Validation

```bash
# Syntax check
python -c "import ast; ast.parse(open('app/fast_api_app.py').read()); print('OK')"

# Start server and check health
make serve  # then in another terminal:
curl http://localhost:8000/api/health

# Full tests
make test
```
