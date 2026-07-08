---
name: add-language
description: Add a new human language to the Krishi Sampark platform, including all UI translations, voice maps, agent language rules, and backend voice configurations.
applyTo: "**/*"
---

# Skill: Add New Language

Use this skill whenever a user asks to add a new language to Krishi Sampark.

## Context Files to Read First

1. `.context/04-add-language.md` — detailed step-by-step guide
2. `.context/change-maps/add-language.yaml` — machine-readable file list with anchors
3. `ui/AGENTS.md` — frontend rules

## Audit Before Starting

Always run the audit first to see what's missing:

```bash
python tools/scaffold/add_language.py --code <lang_code> --name <Language> --check
```

This reports PRESENT/MISSING for every file in the change map.

## Execution Steps

1. **Read the change map**: `.context/change-maps/add-language.yaml` — lists every file and the anchor to find.

2. **Apply changes** — work through each file in the change map order. The scaffolding script can bootstrap placeholders:
   ```bash
   python tools/scaffold/add_language.py --code <lang_code> --name <Language> --native <NativeName>
   ```

3. **Replace placeholder translations** — the scaffold inserts `"# TODO: translate"` markers. A native speaker must provide real translations for:
   - `ui/agui/translations.js` — all UI strings
   - `ui/agui/local_db.js` — offline knowledge text
   - `ui/landing.js` — landing page copy
   - `app/fast_api_app.py` — expert greeting

4. **Validate all changes**:
   ```bash
   make validate-translations
   uv run python -m tools.ai_sdlc.detect_mixed_scripts ui/agui/translations.js
   node -c ui/agui/translations.js
   node -c ui/agui/dashboard.js
   node -c ui/agui/voice.js
   node -c ui/agui/local_db.js
   node -c ui/agui/local_models.js
   node -c ui/landing.js
   make test
   ```

5. **Final audit**:
   ```bash
   python tools/scaffold/add_language.py --code <lang_code> --name <Language> --check
   ```
   All items must show `PRESENT`.

## Success Criteria

- [ ] All 14+ files in change map updated
- [ ] `make validate-translations` passes
- [ ] No script leaks detected
- [ ] All JS files pass syntax check
- [ ] `make test` passes
- [ ] Audit script shows all PRESENT

## Common Mistakes

- Forgetting `voice.js` BCP-47 maps — causes STT to silently fall back to English.
- Forgetting specialist agent LANGUAGE RULE updates — causes sub-agents to respond in English.
- Adding language to `LANGUAGE_CONFIGS` but not `TRANSLATIONS` — causes UI crashes.
