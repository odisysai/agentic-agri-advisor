# Adding a New Language — Complete Checklist

This is the authoritative guide for adding a new language to Krishi Sampark. It replaces scattered tribal knowledge. Follow every step — partial implementation causes silent fallbacks to English.

**Current languages:** `en` (English), `hi` (Hindi), `mr` (Marathi), `te` (Telugu), `sw` (Swahili), `zu` (Zulu)

For the machine-readable file list with exact sections, see: `.context/change-maps/add-language.yaml`

---

## Automated Audit First

Before making any changes, run the audit script to see what's currently missing:

```bash
python tools/scaffold/add_language.py --code <lang_code> --name <Language> --check
# Example: python tools/scaffold/add_language.py --code kn --name Kannada --check
```

---

## Step-by-step Checklist

### 1. `ui/agui/translations.js`

Add an entry for the new code in three places:

**a) `TRANSLATIONS` dict (line ~23):**
Add a complete language block with all keys matching the structure of `en`. Mark untranslated keys with `// TODO: translate`.

**b) `SCHEMA_TRANSLATIONS` dict (line ~371):**
Add a matching entry for each schema key.

**c) `LANGUAGE_CONFIGS` dict (line ~2704):**
```js
'kn': { code: 'kn', locale: 'kn-IN', displayName: 'Kannada', srLocale: 'kn-IN', ttsLocale: 'kn-IN' },
```

**d) `applyLanguageTranslation` function:**
Add a voice status string for the new language in the switch/map inside this function.

Validate:
```bash
node -c ui/agui/translations.js
make validate-translations
```

---

### 2. `ui/agui/index.html`

Add `<option>` to `#language-selector`:
```html
<option value="kn">Kannada</option>
```

---

### 3. `ui/agui/dashboard.js`

Update ALL language maps (search for `'zu':` or `'sw':` to find each location):

- `normalizeLanguageCode` — add `"kannada": "kn"`
- `farmerDisplayNameForLanguage` — add `"kn": "ಮಾಧವ್ ಜಿ"` (or a representative farmer name)
- `langNameMap` — add `"kn": "Kannada"`
- `langMap` (2 occurrences) — add `"kn": "kn-IN"`
- `escalationMessages` — add `"kn": "..."` escalation message in Kannada
- `showEscalationPrompt` — add Kannada text
- `getPreparingAdvisoryMsg` — add Kannada preparing message
- Irrigation descriptions (search for `sw:` or `zu:` pattern) — add Kannada equivalents
- OKF reply map — add Kannada offline reply

Validate:
```bash
node -c ui/agui/dashboard.js
```

---

### 4. `ui/agui/voice.js`

Update STT/TTS maps:

- `langMap` — `"kannada": "kn-IN"` (voice name → BCP-47 for STT)
- `nameToCode` — `"Kannada": "kn"`
- `codeToCode` — `"kn": "kn"` if normalization needed
- `langNameMap` (backend TTS) — `"kn": "kn-IN"`
- `nameToBcp47` — `"Kannada": "kn-IN"`
- `codeToBcp47` — `"kn": "kn-IN"`

Validate:
```bash
node -c ui/agui/voice.js
```

---

### 5. `ui/agui/local_db.js`

Add language entries to the offline knowledge diagnostics. Search for `zu:` and add a matching `kn:` entry with symptom text and organic remedy in Kannada.

Validate:
```bash
node -c ui/agui/local_db.js
```

---

### 6. `ui/agui/local_models.js`

Add a language block to the `labels` object for the offline AI persona. Search for `zu:` and add a matching `kn:` block with the same keys.

Validate:
```bash
node -c ui/agui/local_models.js
```

---

### 7. `ui/index.html` (landing page)

Add `<option>` to `#language-selector`:
```html
<option value="kn">ಕನ್ನಡ</option>
```

---

### 8. `ui/landing.js`

Add a complete translation block and register it:
```js
const KN = {
  tagline: "ಕನ್ನಡ ಟ್ಯಾಗ್‌ಲೈನ್...",
  // all keys matching the EN block
};
TRANSLATIONS['kn'] = KN;
```
Also add to `HOW_IT_WORKS_IMAGES` if language-specific illustrations are used.

---

### 9. `app/fast_api_app.py`

**a) `VOICE_MAP` (search for `VOICE_MAP = {`):**
Add entries for both the full language name and BCP-47 code:
```python
"kannada": "kn-IN-Standard-A",  # or nearest edge-tts voice
"kn": "kn-IN-Standard-A",
"kn-IN": "kn-IN-Standard-A",
```

**b) `lang_greetings` (search nearby):**
Add a Kannada greeting: `"kn": "ನಮಸ್ಕಾರ"`.

**c) Expert system prompt greeting list:**
Add Kannada to the list of greetings in the expert system prompt string.

Validate:
```bash
python -c "import ast; ast.parse(open('app/fast_api_app.py').read()); print('OK')"
```

---

### 10. `mcp_servers/translation/server.py`

Add an entry to `MOCK_TRANSLATIONS` for the new language code:
```python
"kn": {
    "hello": "ನಮಸ್ಕಾರ",
    # ... key translations
}
```

---

### 11. `agents/coordinator/agent.py`

Update the `Language` parameter examples and 2-letter code list in the coordinator's instruction string to include `'kn'`.

---

### 12. Specialist agents (5 files)

In each of the following, add `"If 'Respond in kn', reply in Kannada."` to the LANGUAGE RULE section of the instruction:
- `agents/crop_analyst/agent.py`
- `agents/irrigation_advisor/agent.py`
- `agents/market_advisor/agent.py`
- `agents/weather_advisor/agent.py`
- `agents/farmer_interaction/agent.py`

---

### 13. `AGENTS.md` (root)

Update the supported languages list in the Coding & Translation Rules section.

---

## Final Validation

```bash
make validate-translations          # Check all keys in all languages
make validate-schemas               # Check A2UI schema keys
uv run python -m tools.ai_sdlc.detect_mixed_scripts ui/agui/translations.js
make test                           # Full unit test suite
node -c ui/agui/translations.js && node -c ui/agui/dashboard.js && node -c ui/agui/voice.js
```

## What Needs Human Translation

The scaffolding script adds placeholders. A native speaker must review and replace:
- All entries in `TRANSLATIONS` (the core UI strings)
- `SCHEMA_TRANSLATIONS` entries
- `escalationMessages` and `showEscalationPrompt` text
- Offline knowledge symptom + remedy text in `local_db.js`
- Landing page tagline and copy in `landing.js`
- Expert greeting in `fast_api_app.py`
