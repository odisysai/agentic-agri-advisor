---
name: debug-and-fix
description: Diagnose and fix any bug in Krishi Sampark. Given a bug description or error message, identifies the target area, loads the right files, reproduces the issue, and makes a minimal fix. Use when asked to fix a bug, resolve an issue, debug a failure, or investigate unexpected behaviour.
applyTo: "**/*"
---

# Skill: Debug and Fix

## Step 1 — Identify the area

Read `.context/09-bug-triage.md`. Match the symptom to the nearest row in the table.  
Then load the listed **domain `AGENTS.md`** for that area — it has the full file map.

## Step 2 — Reproduce before touching code

Run the reproduction command from the triage table. If no test covers this bug, write one that fails first.

## Step 3 — Minimal fix

Read only the files the domain AGENTS.md points to. Change only the lines that are wrong. Do not refactor.  
Flag for human review if the fix touches: safety kernel, auth session logic, HMAC comparisons, or dosage thresholds.

## Step 4 — Verify

```bash
# Same command that reproduced the bug — must now pass
make test   # full suite
```

## Success Criteria
- [ ] Reproduction command passes
- [ ] `make test` exits 0
- [ ] No unrelated files changed
