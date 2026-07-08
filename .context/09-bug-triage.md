# Bug Triage Map

Match the symptom, run the reproduction command, fix minimally, verify.  
For which files to read: load the matching domain `AGENTS.md` — it has the full file map.

---

## Symptom → Area → Reproduce

| Symptom | Domain context | Reproduce |
|---|---|---|
| Wrong language / English fallback | `agents/AGENTS.md` | `make check-language LANG=<code> NAME=<Name>` |
| Raw key shown / wrong translation / script leak | `ui/AGENTS.md` | `make validate-translations` + `uv run python -m tools.ai_sdlc.detect_mixed_scripts` |
| Banned chemical / unsafe advice / no escalation | `safety_kernel/AGENTS.md` | `make validate-safety` + `curl POST /api/safety/validate` (expect `blocked`) |
| Server won't start / import error | `app/AGENTS.md` | `uv run python -m tools.ai_sdlc.validate_environment` |
| Blank A2UI card / schema error | `ui/AGENTS.md` | `make validate-schemas` |
| App broken offline / data lost | `ui/AGENTS.md` | Chrome DevTools → Network: Offline → reload |
| Voice / STT / TTS silent | `ui/AGENTS.md` + `mcp_servers/AGENTS.md` | `node -c ui/agui/voice.js` + import-check the stt/tts server |
| MCP tool wrong/empty data | `mcp_servers/AGENTS.md` | `uv run python -c "from mcp_servers.<name>.server import <fn>; print(<fn>('test'))"` |
| Profile / activity not saving | `app/AGENTS.md` | `curl GET /api/profile/guest` + check `db_manager.get_profile_data('guest')` |
| Login fails / session loops | `app/AGENTS.md` | `curl GET /api/auth/me` — check cookie signing + `SESSION_SECRET` in `.env` |

---

## Invariants — never violate during a fix

- **Safety callbacks** — `before_agent_callback` / `after_agent_callback` on coordinator must never be removed. Lowering a dosage threshold requires human approval in `.ai-sdlc/evidence/approvals/`.
- **HMAC comparisons** — always `hmac.compare_digest`, never `==`.
- **Session secret** — `APP_SESSION_SECRET` must not be the default `dev-only-change-me` in production.
- **No fake PASSes** — if the reproduction command still fails after a fix, the bug is not resolved.

---

## Rules

1. Reproduce first — confirm the failure before touching code.
2. Minimum change — do not refactor surrounding code.
3. Verify — run the same reproduction command + `make test` after the fix.
4. Safety/auth/security path → flag for human review before merging.
