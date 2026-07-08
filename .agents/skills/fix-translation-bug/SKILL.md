---
name: fix-translation-bug
description: Diagnose and fix missing or incorrect translation keys in Krishi Sampark, including script leaks, missing keys across languages, and broken fallbacks.
applyTo: "ui/**"
---

# Skill: Fix Translation Bug

## Context Files

- `.context/02-frontend-pwa.md` — translations structure
- `ui/AGENTS.md` — frontend rules

## Diagnosing the Problem

```bash
# 1. Check which keys are missing or empty
make validate-translations
# Shows: MISSING keys per language, EMPTY values, MISMATCH counts

# 2. Check for script leaks
uv run python -m tools.ai_sdlc.detect_mixed_scripts ui/agui/translations.js
# Shows: Telugu chars in Hindi block, Devanagari in Telugu block, etc.

# 3. Check JS syntax (catch syntax errors before runtime)
node -c ui/agui/translations.js
```

## Translation File Structure

`ui/agui/translations.js`:
```
TRANSLATIONS = {
  en: { category: { key: "value", ... }, ... },
  hi: { ... },
  mr: { ... },
  te: { ... },
  sw: { ... },
  zu: { ... },
}
```

A key ending in `Key` in any A2UI schema at `ui/schemas/` must exist in all 6 language blocks.

## Common Fixes

**Missing key in one language** — find the key in `en`, add it to the missing language block:
```js
// In hi block, add:
myFeatureKey: "Hindi translation here",
```

**Script leak (Telugu in Hindi)** — find the wrong-script character and replace with the correct language script.

**A2UI schema key not found** — the schema at `ui/schemas/<name>.json` has a key ending in `Key` that isn't in `translations.js`. Add it to all 6 language blocks.

**Empty value placeholder** — a value that's just a placeholder string like `"Title"` or `"Label"`. Replace with a real translation.

## After Fixing

```bash
make validate-translations                          # must pass
uv run python -m tools.ai_sdlc.detect_mixed_scripts ui/agui/translations.js   # zero leaks
node -c ui/agui/translations.js                     # syntax OK
make test                                           # full test suite
```
