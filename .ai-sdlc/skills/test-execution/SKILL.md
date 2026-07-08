---
name: Test Execution
description: Run pytest suite and gather test execution logs and code coverage.
---

# Reusable Skill: Test Execution

## Input
- `test_path`: path to test directory or file (default: `tests/`)
- `evidence`: whether to write evidence artifact (default: false)

## Output
- `total_tests`: int
- `passed_tests`: int
- `failed_tests`: int
- `coverage_percentage`: float (if coverage enabled)

## Execution Steps

```bash
# Step 1: Run unit tests (fast, no external dependencies)
make test
# Equivalent to: uv run pytest tests/ --ignore=tests/integration/ --ignore=scratch/
# Expected: all tests pass, exit code 0

# Step 2: Run integration tests (requires Firestore emulator)
make test-integration
# Equivalent to: uv run pytest tests/integration/
# Start emulator first: make firestore-start

# Step 3: Run with coverage and write evidence artifact
make coverage
# Equivalent to: uv run python -m tools.ai_sdlc.cli test --evidence
# Evidence written to: .ai-sdlc/evidence/tests/

# Step 4: Run a specific test file
uv run pytest tests/unit/test_safety_kernel.py -v

# Step 5: Run tests matching a keyword
uv run pytest tests/ -k 'translation' -v
```

## Success Criteria
- [ ] All unit tests pass (`make test` exits 0)
- [ ] No tests skip unexpectedly
- [ ] Coverage evidence written to `.ai-sdlc/evidence/tests/`

## Failure Conditions
- [ ] Any test marked FAIL (not skipped)
- [ ] Import errors in test collection
- [ ] Test modifies production data (integration tests must use emulator)

## Evidence Output
`.ai-sdlc/evidence/tests/coverage.json` and `.ai-sdlc/evidence/tests.json`

## Files Touched
- `tests/unit/` — unit tests
- `tests/integration/` — integration tests (require emulator)
- `tools/ai_sdlc/collect_test_evidence.py` — evidence writer
