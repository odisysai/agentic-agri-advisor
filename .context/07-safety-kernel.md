# Safety Kernel — Rules and Invariants

Context for working on or near the Agricultural Safety Kernel. Read this before touching `safety_kernel/`, agent callbacks, or any prescriptive agronomic recommendation logic.

---

## What the Safety Kernel Is

The safety kernel (`safety_kernel/kernel.py`) is the **non-negotiable safety enforcement layer** for all agricultural recommendations. It runs as ADK callbacks on the coordinator agent and intercepts every agent turn.

```
safety_kernel/
  __init__.py     # Exports: safety_before_agent, safety_after_agent, validate_recommendation,
                  #          get_pending_escalations, resolve_escalation
  kernel.py       # Implementation
```

The OKF safety data it reads:
```
okf-knowledge-graph/data/safety/   # pesticide limits, banned chemicals
```

---

## Absolute Rules — Never Violate

1. **Never remove `before_agent_callback` or `after_agent_callback`** from `coordinator_agent`.
2. **Never modify safety thresholds without documented human approval** in `.ai-sdlc/evidence/approvals/`.
3. **Never add banned chemicals to an allowed list** — `BANNED_CHEMICALS` is a blocklist, not a greylist.
4. **Escalation must fire on low confidence** — any recommendation with uncertainty or conflicting data must trigger human agronomist escalation.
5. **PHI (Pre-Harvest Interval) must be enforced** — never recommend a chemical application within the PHI window.
6. **Dosage limits are hard limits** — never exceed `max_rate` or `max_concentration` in `PesticideLimits`.

---

## Safety Callback Flow

```
Farmer query → [before_agent_callback] → Agent response → [after_agent_callback] → Farmer sees result
                    ↓                                               ↓
            Blocks banned                                  Flags dosage/PHI
            chemicals before                               violations; triggers
            the agent even                                 escalation if needed
            processes the query
```

---

## Banned Chemicals (examples — not exhaustive)

`BANNED_CHEMICALS` includes: `endosulfan`, `carbofuran`, and other globally or regionally banned agrochemicals. The full list is in `safety_kernel/kernel.py`.

If a farmer asks about a banned chemical, the callback must intercept and return a safe refusal, not route to the agent.

---

## Expert Escalation

When the safety kernel flags a case for escalation:
1. The case is stored in the escalation queue.
2. The farmer receives a message telling them a human agronomist will review.
3. The agronomist dashboard (at `/api/escalations/pending`) shows pending cases.
4. Resolution is POSTed to `/api/escalations/resolve`.

**Triggers for escalation:**
- Pesticide recommendation with confidence < threshold
- Query mentioning a banned or unrecognized chemical
- Complex multi-factor disease diagnosis
- Conflicting soil + crop + weather conditions

---

## Modifying Safety Data

Safety data lives in `okf-knowledge-graph/data/safety/`. Changes require:
1. A documented rationale in a new ADR under `.ai-sdlc/`.
2. Human approval entry in `.ai-sdlc/evidence/approvals/approvals.json`.
3. Updated tests in `tests/unit/safety_kernel/`.

Never auto-approve safety data changes. They require human sign-off.

---

## Validation Commands

```bash
# Test safety kernel loads correctly
uv run python -c "from safety_kernel import safety_before_agent, safety_after_agent; print('OK')"

# Run safety validation
make validate-safety

# Run unit tests
make test
```

---

## `validate_recommendation` API

The safety kernel exposes a REST endpoint for pre-flight validation:

```
POST /api/safety/validate
Body: {"text": "<recommendation text>", "farmer_name": "...", "query": "..."}
Response: {"status": "safe|flagged|blocked", "issues": [...], "escalation_id": null|"..."}
```

Frontend or agents can call this before showing advice to the farmer.
