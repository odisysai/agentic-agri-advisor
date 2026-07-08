---
name: run-agent-eval
description: Run the full agents-cli quality flywheel for Krishi Sampark — lint, test, eval generate, eval grade, eval compare. Use when asked to evaluate agent quality, run the eval loop, check agent performance, or run the full agent development cycle.
applyTo: "agents/**"
---

# Skill: Run Agent Eval (Quality Flywheel)

## Full Cycle — Run in Order

```bash
# 1. Lint
agents-cli lint

# 2. Unit tests
make test

# 3. Run agent against eval dataset
agents-cli eval generate

# 4. Grade with LLM-as-judge
agents-cli eval grade

# 5. Compare against previous baseline (if one exists)
agents-cli eval compare

# 6. Cluster failure modes
agents-cli eval analyze
```

## First Time (no dataset yet)

```bash
# Synthesize a starter dataset from the agent definition
agents-cli eval dataset synthesize
# Then run steps 3-6 above
```

## Iterating on Failures

1. Read `artifacts/grade_results/` to see which test cases failed
2. Identify the failure pattern with `agents-cli eval analyze`
3. Update the agent instruction or tools in `agents/coordinator/agent.py` or the relevant specialist
4. Re-run `agents-cli eval generate` + `agents-cli eval grade`
5. Use `agents-cli eval compare` to confirm improvement
6. Repeat until grade scores are stable

## Auto-tuning Prompts

```bash
agents-cli eval optimize
# Rewrites agent instructions based on eval failures — review the diff before committing
```

## Success Criteria
- [ ] `agents-cli lint` exits 0
- [ ] `make test` exits 0
- [ ] `agents-cli eval grade` shows no regression vs previous baseline
- [ ] Farmer Mode JSON format passes all eval cases
- [ ] Language routing tests pass for all 6 language codes
