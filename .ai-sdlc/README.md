# AI-Enabled Software Development Life Cycle (AI-SDLC)

This folder houses the metadata, guidelines, personas, skills, workflows, evidence logs, and scorecards governing the AI-assisted development of **Krishi Sampark**. Agent and skill files are declarative; executable gates live under `tools/ai_sdlc/`.

## Directory Layout

- `manifest.yaml`: Core project parameters, quality/security gates, and human approval boundaries.
- `agents/`: Declarative definitions of AI agent personas assisting the SDLC stages.
- `skills/`: Reusable, schema-validated execution directories for AI tasks.
- `workflows/`: YAML definitions of development loops (feature delivery, bug fixing, reviews).
- `evidence/`: Command-backed evidence from test runs, code scans, safety reviews, and human approvals. Evidence may be PASS, WARNING, FAIL, NOT_EXECUTED, or NOT_APPLICABLE.
- `reports/`: Generated quality scorecards and release-readiness reports derived from registered evidence.

## AI-SDLC Validation CLI

A unified Python CLI is available at the root to validate all development gates:

```bash
# Verify schemas, translations, and safety rules
python -m tools.ai_sdlc.cli validate --all

# Run all test suites and export evidence
python -m tools.ai_sdlc.cli test --evidence

# Generate a release-readiness report
python -m tools.ai_sdlc.cli release --version 1.0.0
```

Release readiness is conservative. Missing scanner tools, stale evidence, missing rollback plans, or missing production approvals produce NOT_READY rather than a fabricated PASS.

## Human Approvals

Production release approval is recorded in `.ai-sdlc/evidence/approvals/approvals.json`. The default record is pending. An authorized human must set `status` to `approved`, provide `approvedBy`, `approvedAt`, and the exact `commitSha`. Automation must not auto-approve this file. In GitHub Actions, production release jobs use the `production` environment; required reviewers must be configured in repository settings.

## Current Limitations

- Evidence is hashed and commit-linked, but it is not cryptographically signed.
- Security assurance is limited to scanners that are installed and executed.
- Safety validation is static and scoped; it does not prove complete agricultural safety.
- Declarative agents and skills describe process responsibilities but are not enforcement mechanisms by themselves.

Refer to `AGENTS.md` at the root for overall rules on how coding LLMs and assistants must operate within this repository.
