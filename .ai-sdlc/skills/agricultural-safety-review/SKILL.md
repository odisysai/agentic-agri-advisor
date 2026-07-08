---
name: Agricultural Safety Review
description: Ensure recommendations, chemicals, and dosages are audited by the Safety Kernel.
---

# Reusable Skill: Agricultural Safety Review

## Input
- `recommendation_text`: string to validate
- `check_coordinator`: verify safety callbacks are wired (default: true)

## Output
- `safety_status`: `"safe"` | `"flagged"` | `"blocked"`
- `kernel_passed`: bool
- `issues`: list of violations found

## Execution Steps

```bash
# Step 1: Validate static safety policies (coordinator has escalation + safety references)
uv run python -m tools.ai_sdlc.validate_safety_policies
# Expected: "✅ Agricultural Safety Kernel compliance validated successfully."

# Step 2: Verify safety kernel imports without error
uv run python -c "from safety_kernel import safety_before_agent, safety_after_agent; print('safety kernel OK')"

# Step 3: Test the validate_recommendation endpoint (requires server running)
# Start server first: make serve
curl -s -X POST http://localhost:8000/api/safety/validate \
  -H 'Content-Type: application/json' \
  -d '{"text": "Apply endosulfan to wheat", "farmer_name": "test", "query": "test"}' | python -m json.tool
# Expected: status=blocked (endosulfan is a banned chemical)

# Step 4: Verify coordinator safety callbacks are wired
uv run python -c "
from agents.coordinator.agent import coordinator_agent
assert coordinator_agent.before_agent_callback is not None, 'before_agent_callback missing'
assert coordinator_agent.after_agent_callback is not None, 'after_agent_callback missing'
print('Safety callbacks wired correctly')
"

# Step 5: Run all safety unit tests
uv run pytest tests/ -k 'safety' -v
```

## Success Criteria
- [ ] `validate_safety_policies` passes
- [ ] Safety kernel imports cleanly
- [ ] Coordinator has both safety callbacks
- [ ] Banned chemicals are blocked by the kernel
- [ ] Low-confidence recommendations trigger escalation

## Failure Conditions
- [ ] `before_agent_callback` or `after_agent_callback` missing from coordinator
- [ ] Banned chemical (e.g. endosulfan) returns `status=safe`
- [ ] PHI window not enforced on chemical recommendations
- [ ] Safety threshold modified without human approval in `.ai-sdlc/evidence/approvals/`

## Evidence Output
`.ai-sdlc/evidence/safety/safety.json`

## Files Touched
- `safety_kernel/kernel.py` — enforcement logic
- `agents/coordinator/agent.py` — callback wiring
- `okf-knowledge-graph/data/safety/` — pesticide limits YAML
