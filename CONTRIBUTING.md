# Contributing to Krishi Sampark

Thanks for your interest in improving this project.

## Development Setup

```bash
make setup
uv run agents-cli playground
uv run python -m app.fast_api_app
```

## Before Opening a PR

Run the core checks locally:

```bash
make lint
make typecheck
make test
make ai-sdlc-check
```

## Pull Request Guidelines

- Keep PRs focused and small.
- Explain user impact and testing evidence.
- Do not include credentials, keys, or model weights.
- Update docs when behavior changes.
- Ensure translation and safety checks still pass.

Use the repository PR template in `.github/pull_request_template.md`.

## Code Style

- Follow existing Python and JavaScript style in the repo.
- Prefer clear names and small functions.
- Avoid unrelated refactors in feature/fix PRs.

## Reporting Bugs

Use GitHub Issue templates under `.github/ISSUE_TEMPLATE/` and include:

- Steps to reproduce
- Expected behavior
- Actual behavior
- Logs/screenshots

## Security

Please report vulnerabilities via `SECURITY.md` and avoid public disclosure first.
