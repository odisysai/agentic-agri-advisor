# ui/ — Domain Guidance

Rules and patterns for working on the Krishi Sampark frontend PWA.

For full context: `.context/02-frontend-pwa.md`
For adding a new language: `.context/04-add-language.md`

---

## File Responsibilities

| File | Purpose |
|---|---|
| `ui/index.html` | Landing page shell |
| `ui/landing.js` | Landing page logic + per-language translations |
| `ui/landing.css` | Landing page styles |
| `ui/sw.js` | Service Worker — PWA offline caching |
| `ui/manifest.webmanifest` | PWA manifest |
| `ui/agui/index.html` | Main app shell (requires auth) |
| `ui/agui/dashboard.js` | Primary app: chat, farm context, agent responses, language routing |
| `ui/agui/voice.js` | STT (browser Speech API), TTS (edge-tts), language maps |
| `ui/agui/camera.js` | Crop photo capture for image analysis |
| `ui/agui/local_db.js` | IndexedDB wrapper (`LocalDb`) — offline digital twin |
| `ui/agui/local_models.js` | LiteRT/Gemma offline AI inference |
| `ui/agui/translations.js` | ALL UI string translations (6 languages) |
| `ui/schemas/*.json` | A2UI declarative screen layouts |
| `ui/a2ui/` | A2UI 2.0 canvas engine — **DO NOT EDIT** |

---

## Critical Rules

### Translation Keys
- Every key ending in `Key` in any A2UI schema must exist in all 6 language dicts in `translations.js`.
- Run `make validate-translations` after any change to `translations.js` or `ui/schemas/`.

### Script Separation
- Hindi (`hi`) must never contain Telugu Unicode characters (U+0C00–U+0C7F).
- Telugu (`te`) must never contain Devanagari Unicode characters (U+0900–U+097F).
- Run `uv run python -m tools.ai_sdlc.detect_mixed_scripts ui/agui/translations.js` after any translation edit.

### Farmer Name Preservation
- Names like `माधव जी` (Hindi) and `మాధవ్ జీ` (Telugu) must never be altered or replaced with generic placeholders.

### A2UI Schemas
- Must have a valid `type` field.
- No inline `<script>` tags.
- No raw HTML injection in label or description fields.
- Schema names must exactly match the values the coordinator passes to `get_ui_schema`.

### Offline Invariants
- Never disable or remove Service Worker caching.
- Never remove the LocalDb sync queue — offline activity logging depends on it.
- Local model inference must remain gated on network unavailability.

---

## Language Maps Coupling

`dashboard.js` and `voice.js` contain parallel language maps. They must always stay synchronized. When a new language is added, all maps in both files must be updated together. See `.context/change-maps/add-language.yaml` for the complete list.

---

## Validation

```bash
# Translations and schema keys
make validate-translations
make validate-schemas

# Script leak detection
uv run python -m tools.ai_sdlc.detect_mixed_scripts ui/agui/translations.js

# JS syntax
node -c ui/agui/translations.js
node -c ui/agui/dashboard.js
node -c ui/agui/voice.js
node -c ui/agui/local_db.js
node -c ui/agui/local_models.js
node -c ui/landing.js

# Browser E2E test (requires server running)
make browser-test
```
