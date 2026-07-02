# AI-SDLC Evidence Walkthrough

1. Install the project tools.

```bash
uv sync --all-extras --dev
```

2. Run tests and coverage evidence.

```bash
make coverage
```

3. Run security gates.

```bash
make secret-scan
make dependency-scan
make sast
make container-scan
```

4. Verify evidence and generate reports.

```bash
make evidence
make release-check
```

Evidence is stored below `.ai-sdlc/evidence/` and indexed by `.ai-sdlc/evidence/evidence-manifest.json`. A PASS means the source command succeeded. Missing tools are recorded as NOT_EXECUTED.

Production approval is manual. An authorized reviewer records approval in `.ai-sdlc/evidence/approvals/approvals.json` for the exact commit SHA, and GitHub repository settings should require reviewers for the `production` environment.
