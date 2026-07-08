---
name: add-ui-screen
description: Add a new A2UI screen/schema to Krishi Sampark, register it in the coordinator, and add required translation keys.
applyTo: "ui/schemas/**"
---

# Skill: Add UI Screen

## Context Files

- `.context/02-frontend-pwa.md` — A2UI schema rules
- `ui/AGENTS.md` — frontend rules

## Execution Steps

1. **Create the schema** at `ui/schemas/<schema_name>.json`:
   ```json
   {
     "type": "<schema_name>",
     "title": "...",
     "components": [...]
   }
   ```
   Rules: must have `type`, no inline `<script>`, no raw HTML in labels.

2. **Add translation keys** — for every key ending in `Key` in the schema, add entries in all 6 languages in `ui/agui/translations.js`:
   ```js
   // In SCHEMA_TRANSLATIONS, for each language block:
   myNewKey: "translation here",
   ```

3. **Register in coordinator** (`agents/coordinator/agent.py`) — add the schema name to the instruction's list of valid schema names for `get_ui_schema`.

4. **Add UI trigger** in `agents/dashboard_agent/tools.py` or the coordinator instruction — define when this schema should be returned.

## Validation

```bash
make validate-schemas           # validates all schemas in ui/schemas/
make validate-translations      # confirms all Key entries exist in all 6 languages
node -c ui/agui/translations.js # JS syntax check
```
