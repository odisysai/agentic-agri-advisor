# Release Readiness Report - Version 1.0.0

**Decision**: **NOT_READY**

| Gate | Required | Status | Evidence | Command | Timestamp | Commit | Reason | Remediation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tests | True | **FAIL** | .ai-sdlc/evidence/tests/tests.json | `/Users/nalin.giri/workspaces/agentic-agri-advisor/.venv/bin/pytest tests/ --ignore=scratch/ --junitxml=/var/folders/ry/45cn9mzj5vz9hlf9n2v08r_00000gp/T/ai-sdlc-pytest-xzwm7qb7/junit.xml` | 2026-07-02T19:05:57+00:00 | `361502aaa96ca38138a369e3df26b0e61611198a` | Evidence registered | Regenerate the evidence on this commit. |
| Secret Scan | True | **NOT_EXECUTED** | .ai-sdlc/evidence/security/secrets.json | `gitleaks or detect-secrets` | 2026-07-02T19:06:46+00:00 | `361502aaa96ca38138a369e3df26b0e61611198a` | Evidence registered | Regenerate the evidence on this commit. |
| Dependency Scan | True | **NOT_EXECUTED** | .ai-sdlc/evidence/security/dependencies.json | `pip-audit` | 2026-07-02T19:06:46+00:00 | `361502aaa96ca38138a369e3df26b0e61611198a` | Evidence registered | Regenerate the evidence on this commit. |
| SAST Scan | True | **NOT_EXECUTED** | .ai-sdlc/evidence/security/sast.json | `bandit` | 2026-07-02T19:06:46+00:00 | `361502aaa96ca38138a369e3df26b0e61611198a` | Evidence registered | Regenerate the evidence on this commit. |
| Traceability | True | **WARNING** | .ai-sdlc/reports/traceability-matrix.json | `python -m tools.ai_sdlc.generate_traceability` | 2026-07-02T18:32:45+00:00 | `361502aaa96ca38138a369e3df26b0e61611198a` | Evidence registered | Regenerate the evidence on this commit. |
| Safety | True | **PASS** | .ai-sdlc/evidence/safety/safety.json | `python -m tools.ai_sdlc.validate_safety_policies` | 2026-07-02T19:04:12+00:00 | `361502aaa96ca38138a369e3df26b0e61611198a` | Evidence registered |  |
| Evidence Manifest Integrity | True | **PASS** |  | `` |  | `` | Manifest hashes and commit links verified |  |
| Human Production Approval | True | **FAIL** |  | `` |  | `` | Approval status is pending | An authorized human must record an approved release approval for this commit. |
| Rollback Plan | True | **PASS** | .ai-sdlc/workflows/release.yaml | `` |  | `` | Rollback reference exists | Add or update a rollback plan before release. |

A production release is not ready unless every mandatory gate is PASS, evidence is current, a rollback plan exists, and a human approval matches the current commit.
