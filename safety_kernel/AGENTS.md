# safety_kernel/ — Domain Guidance

**READ THIS BEFORE TOUCHING ANYTHING IN THIS DIRECTORY.**

Safety kernel rules and invariants. No exceptions.

For full safety context: `.context/07-safety-kernel.md`

---

## What Lives Here

```
safety_kernel/
  __init__.py    # Exports: safety_before_agent, safety_after_agent,
                 #          validate_recommendation, get_pending_escalations,
                 #          resolve_escalation
  kernel.py      # ADK callback implementations + safety enforcement logic
```

Safety data (OKF safety YAML files): `okf-knowledge-graph/data/safety/`

---

## Absolute Invariants — NEVER Violate

| Rule | Why |
|---|---|
| Never remove `before_agent_callback` from coordinator | Blocks banned chemicals before the agent processes the query |
| Never remove `after_agent_callback` from coordinator | Catches dosage violations and PHI issues in responses |
| Never add to `BANNED_CHEMICALS` allowlist | Globally banned chemicals must stay banned |
| Never raise safety thresholds without human approval | Dosage limits protect farmer health |
| Never skip PHI window enforcement | Recommending a banned chemical within harvest window is a food safety issue |
| Always escalate on low confidence | Uncertainty in disease diagnosis must go to a human agronomist |

---

## Exported Functions

| Function | Called by | Purpose |
|---|---|---|
| `safety_before_agent` | ADK `before_agent_callback` | Intercepts query before agent; blocks banned chemical requests |
| `safety_after_agent` | ADK `after_agent_callback` | Intercepts response; flags dosage/PHI violations |
| `validate_recommendation` | `POST /api/safety/validate` | Pre-flight safety check for any text |
| `get_pending_escalations` | `GET /api/escalations/pending` | List cases awaiting agronomist review |
| `resolve_escalation` | `POST /api/escalations/resolve` | Mark a case resolved with expert advice |

---

## Modifying Safety Rules

If you need to update safety thresholds, banned chemicals, or PHI windows:

1. Create an ADR in `.ai-sdlc/` documenting the rationale.
2. Update the OKF safety YAML in `okf-knowledge-graph/data/safety/`.
3. Update kernel logic if needed.
4. Write tests for the new rule.
5. Get human approval entry in `.ai-sdlc/evidence/approvals/approvals.json` before merging.

**Automation may not write the approval entry. A human must do it.**

---

## Testing

```bash
# Verify imports work
uv run python -c "from safety_kernel import safety_before_agent, safety_after_agent; print('OK')"

# Run safety validation
make validate-safety

# Unit tests
make test
```
