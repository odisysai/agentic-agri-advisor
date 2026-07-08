# AI-SDLC Governance Context

Context for working with the AI-SDLC governance layer: evidence, skills, workflows, release gates.

> **Scope: `.ai-sdlc/agents/` only.** These are SDLC governance personas — they guide the development process.
> The runtime business AI agents that serve farmers live in `agents/` — see `.context/03-agent-system.md`.\n\n---\n\n## What AI-SDLC Is

The AI-SDLC (`.ai-sdlc/`) is a **real governance layer**, not just documentation. It enforces:
- Evidence-backed releases (no fake PASSes)
- Human approval gates before production
- Declarative agent personas for each SDLC role
- Reusable skills for repeatable tasks
- Workflow definitions for feature delivery, bug fixes, releases

---

## Directory Layout

```
.ai-sdlc/
  manifest.yaml              # Project config, quality gates, component registry
  README.md                  # SDLC overview and CLI reference
  agents/                    # Declarative SDLC agent personas
    developer_agent.yaml
    test_agent.yaml
    security_agent.yaml
    safety_review_agent.yaml
    release_agent.yaml
    ...
  skills/                    # Reusable, executable skill runbooks
    localization-validation/
    agricultural-safety-review/
    test-execution/
    codebase-understanding/
    ... (28 total)
  workflows/                 # YAML workflow definitions
    feature-delivery.yaml    # Full feature pipeline
    bug-fix.yaml
    pull-request-review.yaml
    release.yaml
  evidence/                  # Command-backed evidence artifacts
    approvals/
      approvals.json         # Human approval records (NEVER auto-approve)
    ...
  reports/                   # Generated quality scorecards
```

---

## Evidence Honesty Rules

These rules are ABSOLUTE — violations constitute release fraud:

1. **PASS requires successful command-backed evidence** — if the tool wasn't run, the status is `NOT_EXECUTED`.
2. **Missing tools = NOT_EXECUTED**, not PASS.
3. **Stale evidence** (from a different commit) counts as NOT_EXECUTED for release readiness.
4. **`approvals.json` must be signed by a human** — automation must not write `"status": "approved"`.
5. **Release is NOT_READY** when any mandatory evidence is missing, stale, or from a different commit.

---

## Running the AI-SDLC CLI

```bash
# Run all validation gates
make ai-sdlc-check

# Individual checks
make validate-schemas           # A2UI schema validation
make validate-translations      # Translation key coverage
make validate-safety            # Safety kernel policies
make validate-skills            # Skill schema validation
make coverage                   # pytest + coverage evidence
make security                   # Security scans (SAST, secrets, deps, container)
make secret-scan                # Secrets only
make dependency-scan            # Dependency vulnerabilities only
make sast                       # SAST only
make evidence                   # Verify existing evidence artifacts
make release-check              # Release readiness report
```

---

## SDLC Agent Personas

Each SDLC agent has declared responsibilities and prohibited actions:

| Agent | Purpose |
|---|---|
| Developer Agent | Implement features per ADRs; no security bypass |
| Test Agent | Write and run tests; report failures honestly |
| Security Agent | SAST, secret scan, dependency audit |
| Safety Agent | Agronomic safety audit via Safety Kernel |
| Release Agent | Evidence verification; conservative readiness check |
| Documentation Agent | READMEs, runbooks, API docs |
| Architecture Agent | ADR authoring, component impact analysis |
| Observability Agent | Tracing, logging, monitoring setup |

Agent YAML files at `.ai-sdlc/agents/` declare `permittedTools`, `prohibitedActions`, and `evidenceProduced`.

---

## Skill Runbooks

Skills under `.ai-sdlc/skills/` are **executable runbooks**, not just documentation. Each SKILL.md contains:
- Input/output schema
- Exact commands to run
- Expected output markers
- Evidence file path to write

Use a skill when you need a repeatable, auditable task. Skills produce evidence files.

---

## Feature Delivery Workflow

Full pipeline: `intake → requirement-analysis → risk-classification → architecture-impact → human-approval-requirements → implementation → developer-selfcheck → test-generation → test-execution → security-review → safety-review → documentation-update → pr-review → release-readiness → human-release-approval`

For a feature change, at minimum run:
```bash
make test
make security
make ai-sdlc-check
```

And ensure evidence artifacts are written before claiming PASS.

---

## Adding a New Skill to `.ai-sdlc/skills/`

1. Create `.ai-sdlc/skills/<skill-name>/SKILL.md`.
2. Include YAML frontmatter with `name` and `description`.
3. Include Input/Output schema, Success Criteria, Failure Conditions.
4. Include **exact commands** to run (not abstract "run validation scripts").
5. Specify evidence output path.
6. Register in `manifest.yaml` if referenced by a workflow.
