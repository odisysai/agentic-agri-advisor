# Krishi Sampark - AI Development Guidance (AGENTS.md)

Welcome, coding agent/assistant. This file defines the repository architecture, coding standards, safety rules, and validation checks you MUST follow.

---

## 1. Project & Architecture Overview

Krishi Sampark is an offline-first, voice-first agricultural advisor platform.

- **Frontend**: Single Page Application served statically, utilizing vanilla JS, HTML, and CSS.
- **Backend API**: FastAPI serving dynamic RAG coordination, agronomic calculations, and telemetry sync.
- **Agent Orchestrator**: Google ADK coordinating multi-agent loops (Crop Analyst, Irrigation Planner, etc.).
- **User Interface**: Rendered declaratively using **A2UI 2.0 Canvas** loaded from dynamic JSON schemas.
- **Client Offline Twin**: Local IndexedDB cache (handled by `LocalDb`) synchronizing with SQLite via sync queues.
- **Offline Gemma/TFLite**: In-browser client-side ML models running in local sandboxes when network is dead.

---

## 2. Directory Map

- `app/`: FastAPI server endpoints and routers.
- `agents/`: ADK agent definition and prompt configuration.
- `ui/agui/`: Frontend PWA shell and script files (dashboard, voice, camera, local_db).
- `ui/schemas/`: A2UI declarative screen JSON layouts.
- `ui/a2ui/`: A2UI 2.0 canvas components rendering library.
- `tools/ai_sdlc/`: Verification CLI and diagnostic scripts.
- `.ai-sdlc/`: SDLC manifests, agent definitions, workflows, reports, command-backed evidence, and human approval records.

---

## 3. Commands Reference

### Local Setup
```bash
make setup
```

### Formatting and Linting
```bash
make lint
make typecheck
```

### Testing
```bash
make test              # Runs complete unit and integration tests
make test-integration  # Runs only integration tests
```

### AI-SDLC Local Validation Gates
```bash
make ai-sdlc-check     # Run translation, schema, safety, and codebase audits
make coverage          # Run pytest with JUnit and optional coverage evidence
make security          # Run configured security scanners and record evidence
make release-check     # Evaluate release readiness from evidence and approvals
```

---

## 4. Coding & Translation Rules

1. **Schema Modifications**: Any new screens or layouts added under `ui/schemas/` must have a valid `type` and avoid inline `<script>` tags or arbitrary HTML.
2. **Translation Key Consistency**: Any key ending in `Key` in a schema configuration MUST be defined in all 5 supported languages in `ui/agui/translations.js`:
   - `en` (English)
   - `hi` (Hindi)
   - `mr` (Marathi)
   - `te` (Telugu)
   - `sw` (Swahili)
   - `zu` (Zulu)
3. **No Script Leakages**: Hindi mode must contain zero Telugu script characters, and Telugu mode must contain zero Devanagari script characters.
4. **Preservation of Names**: Farmer names (e.g. `माधव जी`, `మాధవ్ జీ`) and regional locations must remain unchanged in greetings.

---

## 5. Agricultural Safety Kernel & Farmer UX Invariants

1. **Safety Auditing**: All prescriptive agronomic recommendations (dosages, chemical sprays, moisture critical values) must navigate through the backend Agricultural Safety Kernel.
2. ** Triage & Escalation**: Unresolved diagnoses, crop disease alerts, or critical warnings require immediate agronomist escalation. Low confidence ratings must trigger human consultation.
3. **Farmer Mode Persona**: Responses in Farmer Mode must match the warm village scholar persona ("Krishi Sastri"), remain under 80 words, avoid markdown symbols, use bullet lists for reasons (max 4), and hide internal agent names (e.g. "pathologist", "irrigation planner").

---

## 6. Prohibited Changes & Definition of Done

- Do NOT bypass failing tests or suppress linter errors.
- Do NOT commit binary weights or credentials.
- Do NOT disable PWA caching or local database twin fallback.
- **Definition of Done**: A task is complete only when code changes are reviewable, Makefile validation checks pass where required, tests are executed, and evidence JSON/Markdown files are archived. Do not claim signed evidence unless cryptographic signing is added.

## 7. Evidence and Release Honesty

- PASS requires a successful command-backed evidence artifact.
- Missing tools or skipped checks must be reported as NOT_EXECUTED, not PASS.
- Production release requires a human approval entry in `.ai-sdlc/evidence/approvals/approvals.json` that matches the current commit.
- Release readiness must remain NOT_READY when mandatory evidence, approvals, or rollback references are missing.
