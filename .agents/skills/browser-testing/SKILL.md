---
name: browser-testing
description: Run browser-based end-to-end tests for Krishi Sampark using Playwright. Covers local test execution, common failures, and how to write new browser tests.
applyTo: "**/*"
---

# Skill: Browser Testing

## Prerequisites

The FastAPI server must be running first:
```bash
make serve   # in a separate terminal
```

## Run Browser Tests

```bash
# Install Playwright (one-time)
uv run playwright install chromium

# Run E2E browser tests
make browser-test
# Runs test_real_browser.py — opens a visible Chromium window
```

## Test File Location

`test_real_browser.py` — root of the workspace.

Test flow: Landing → Guest Login → Dashboard → Ask Advisor → Simple Query → Expert Escalation

## Running Individual Test Functions

```bash
uv run python -m pytest test_real_browser.py::test_landing_page -v
```

## Writing New Browser Tests

Use `sync_playwright` with a 375×812 mobile viewport (primary farmer use case):

```python
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:8000"

def test_my_feature():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page(viewport={"width": 375, "height": 812})
        page.goto(BASE_URL)
        # ... assertions
        browser.close()
```

## Common Failures

**`Error: Executable doesn't exist`** → run `uv run playwright install chromium`

**`Connection refused`** → server not running; start with `make serve`

**`AssertionError: Landing page title missing`** → check `ui/index.html` for `#brand-logo` element

**Timeout on login** → check that `GEMINI_API_KEY` is set in `.env`
