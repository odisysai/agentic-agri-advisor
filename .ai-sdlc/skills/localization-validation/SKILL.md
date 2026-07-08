---
name: Localization Validation
description: Validate translations.js dictionaries and check for raw key leaks or script mix-ups.
---

# Reusable Skill: Localization Validation

## Input
- `translations_path`: `ui/agui/translations.js` (default)
- `schema_dir`: `ui/schemas/` (default)

## Output
- `is_valid`: bool
- `untranslated_keys`: list of keys missing from any language
- `script_leaks`: list of Unicode script violations

## Execution Steps

```bash
# Step 1: Validate all translation keys exist in all 6 languages
uv run python -m tools.ai_sdlc.cli validate --translations
# Expected: "✅ All translation keys perfectly defined across 5 languages."
# On failure: shows language + missing key list

# Step 2: Detect script leaks (Telugu in Hindi, Devanagari in Telugu)
uv run python -m tools.ai_sdlc.detect_mixed_scripts
# Expected: "✅ Mixed script audit successful: Hindi and Telugu scripts strictly separated."

# Step 3: Validate A2UI schema keys exist in translations
uv run python -m tools.ai_sdlc.cli validate --schemas
# Expected: no unapproved component types, no script injections

# Step 4: Advanced per-language coverage check (uses real JS dict parsing)
uv run python -c "
from tools.ai_sdlc.parse_translations import get_translations, get_schema_translations, extract_schema_keys, check_language_coverage
t = get_translations()
st = get_schema_translations()
keys = extract_schema_keys()
report = check_language_coverage(t, st, keys)
for lang, missing in report.items():
    print(f'{lang}: {len(missing)} missing')
"
```

## Success Criteria
- [ ] `make validate-translations` exits 0
- [ ] `make validate-schemas` exits 0
- [ ] `detect_mixed_scripts` reports zero leaks
- [ ] All 6 language codes present in `LANGUAGE_CONFIGS`
- [ ] No placeholder translations (`"Title"`, `"Label"`, etc.) in production languages

## Failure Conditions
- [ ] Any key missing from `hi`, `mr`, `te`, `sw`, or `zu` blocks
- [ ] Telugu Unicode characters found in Hindi block
- [ ] Devanagari characters found in Telugu block
- [ ] Empty string values for required keys

## Evidence Output
```bash
# Write evidence artifact after passing
uv run python -m tools.ai_sdlc.cli validate --translations
# Evidence written to: .ai-sdlc/evidence/tests/
```

## Files Touched
- `ui/agui/translations.js` — primary source
- `ui/schemas/*.json` — key references
- `tools/ai_sdlc/parse_translations.py` — parsing utility
- `tests/integration/test_localization.py` — underlying tests
