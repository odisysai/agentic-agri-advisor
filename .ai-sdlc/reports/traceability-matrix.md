# Requirements Traceability Matrix

Status: **WARNING**

| Req ID | Title | ADR | Sources | Tests | Safety Controls | Status | Gaps |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REQ-AAA-001 | Multilingual UI | docs/adr/ADR-AAA-001.md (GAP) | ui/agui/translations.js (OK), ui/agui/index.html (OK) | tests/integration/test_localization.py (OK) | none | GAP | missing ADR docs/adr/ADR-AAA-001.md |
| REQ-AAA-002 | Offline-First Operation & Storage | docs/adr/ADR-AAA-002.md (GAP) | ui/sw.js (OK), ui/agui/local_db.js (OK) | tests/integration/test_phase4.py (OK) | none | GAP | missing ADR docs/adr/ADR-AAA-002.md |
| REQ-AAA-005 | Agricultural Safety Kernel Advice Audit | docs/adr/ADR-AAA-005.md (GAP) | app/fast_api_app.py (OK), ui/agui/dashboard.js (OK) | tests/integration/test_server_e2e.py (OK) | safety-validation | GAP | missing ADR docs/adr/ADR-AAA-005.md |
