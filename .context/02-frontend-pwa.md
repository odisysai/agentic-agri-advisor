# Frontend PWA Context

Context for working on the Krishi Sampark frontend: PWA shell, A2UI canvas, translations, offline support.

---

## Directory Layout

```
ui/
  index.html          # Landing page (login / guest entry)
  landing.js          # Landing page logic + translations
  landing.css         # Landing page styles
  sw.js               # Service Worker (PWA offline caching)
  manifest.webmanifest
  agui/
    index.html        # Main app shell (requires auth)
    dashboard.js      # Primary app logic — farmer chat, farm context, routing
    voice.js          # Voice recording, STT, TTS, language maps
    camera.js         # Crop photo capture for image analysis
    local_db.js       # IndexedDB wrapper (LocalDb class) — offline twin
    local_models.js   # LiteRT/Gemma offline AI inference
    translations.js   # ALL UI string translations (6 languages)
  schemas/            # A2UI declarative screen JSON schemas
  a2ui/               # A2UI 2.0 canvas rendering engine (do NOT edit)
```

---

## Language Support

Supported codes: `en`, `hi`, `mr`, `te`, `sw`, `zu`

The language code is stored in `LANGUAGE_CONFIGS` in `translations.js`. All UI strings are keyed by language code. The active language is set via `applyLanguageTranslation(code)` in `translations.js`.

To add a new language: → see `.context/04-add-language.md`

---

## A2UI Canvas Screens

The coordinator agent returns a JSON schema name. The A2UI canvas renders the matching schema from `ui/schemas/<name>.json`.

Available schemas:

| Schema name | Purpose |
|---|---|
| `crop_dashboard` | Main crop status dashboard |
| `irrigation_planner` | Irrigation scheduling UI |
| `pest_alert` | Pest/disease alert card |
| `market_insights` | Mandi price insights |
| `simulation` | Crop growth simulation |
| `farmer_profile` | Farmer profile editor |
| `farmer_onboarding` | New farmer setup wizard |
| `activity_confirm` | Farm activity confirmation card |
| `today_farm_plan` | Daily farm plan |
| `expert_request_review` | Expert escalation request |
| `expert_request_status` | Expert escalation status |
| `expert_response` | Expert answer display |
| `reminder_engine` | Reminder scheduler |
| `farm_activity_timeline` | Activity history timeline |
| `recommendation_feedback` | Farmer feedback form |

**Rules for A2UI schemas:**
- Must have a valid `type` field.
- No inline `<script>` tags.
- No arbitrary HTML injection.
- Keys ending in `Key` must exist in all 6 language dictionaries in `translations.js`.

To add a new screen: → see `.agents/skills/add-ui-screen/SKILL.md`

---

## Translations Structure

`ui/agui/translations.js` has three top-level dictionaries:

| Variable | Purpose |
|---|---|
| `TRANSLATIONS` | All UI strings keyed by `language_code.category.key` |
| `SCHEMA_TRANSLATIONS` | A2UI schema label translations |
| `LANGUAGE_CONFIGS` | Locale config: code, locale, displayName, BCP-47 |

**Critical rules:**
- Every key ending in `Key` in any schema must exist in all 6 language dicts.
- Hindi (`hi`) must never contain Telugu Unicode (U+0C00–U+0C7F).
- Telugu (`te`) must never contain Devanagari Unicode (U+0900–U+097F).
- Farmer names like `माधव जी` and `మాధవ్ జీ` must never be altered.

---

## Offline-First Architecture

The PWA has three offline layers:

1. **Service Worker** (`ui/sw.js`) — caches static assets and API responses.
2. **LocalDb** (`ui/agui/local_db.js`) — IndexedDB wrapper storing:
   - Offline knowledge (crop symptoms, remedies per language)
   - Farmer profile data
   - Sync queue for activities when offline
3. **Local AI** (`ui/agui/local_models.js`) — LiteRT/Gemma-4-E2B running in-browser for offline agent fallback.

**Rules:**
- Never disable PWA caching or the LocalDb sync queue.
- Local model inference runs only when the network is unavailable.
- The offline knowledge dictionary must have entries for all 6 languages.

---

## Dashboard and Voice Language Maps

`dashboard.js` contains multiple language maps that must all stay in sync:
- `normalizeLanguageCode` — alias map (e.g. `"hindi" → "hi"`)
- `farmerDisplayNameForLanguage` — display names for farmers
- `langNameMap` — 2-letter code → full name
- `langMap` — 2-letter code → BCP-47 (two occurrences)
- `escalationMessages` — escalation text per language
- `showEscalationPrompt` — farmer-facing escalation text

`voice.js` maps for STT/TTS:
- `langMap` — language name → BCP-47 for STT
- `nameToCode` — voice name → 2-letter code
- `codeToCode` — code normalization
- `nameToBcp47` and `codeToBcp47` — BCP-47 for browser Speech API

If these maps fall out of sync with a newly added language, the voice and STT features silently fall back to English.

---

## Validation Commands

```bash
# Check all translation keys exist in all 6 languages
make validate-translations

# Check for script leaks and mixed Unicode
uv run python -m tools.ai_sdlc.detect_mixed_scripts ui/agui/translations.js

# Syntax check JS files
node -c ui/agui/translations.js
node -c ui/agui/dashboard.js
node -c ui/agui/voice.js
node -c ui/agui/local_db.js
node -c ui/agui/local_models.js

# Validate A2UI schemas
make validate-schemas
```
