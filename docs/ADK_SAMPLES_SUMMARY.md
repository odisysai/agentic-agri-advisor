# ADK Reference Samples Summary

Study date: 2026-07-02

## 1. ambient-expense-agent

**Purpose:** Ambient agent that processes expense report emails via Pub/Sub triggers.

**Key patterns to apply to AAA:**
- **Config module pattern:** `expense_agent/config.py` uses a `Config` dataclass for typed configuration. AAA should extract hardcoded values from agent instructions into a config module.
- **`fast_api_app.py` with `trigger_sources`:** Shows how to wire event-driven triggers (`trigger_sources=["pubsub"]`). AAA's current `fast_api_app.py` uses `web=True` but doesn't configure trigger sources — needed for future event-driven use cases.
- **Environment-driven deployment:** PORT from env var, OTEL cloud vs local fallback pattern. AAA already mirrors this pattern.
- **Pydantic schemas for structured data flow:** `ExpenseData` class with `Field` descriptions. Useful pattern for defining structured inputs between agents.

**Lessons for AAA:**
- Add a `config.py` module to the `app/` package for environment variables and model configuration
- Consider adding `trigger_sources` support for future event-driven workflows (e.g., scheduled crop alerts)

---

## 2. data-science

**Purpose:** Multi-agent data science agent using BQ + AlloyDB for NL2SQL and NL2Py analysis.

**Key patterns to apply to AAA:**
- **OTel/W&B tracing integration:** Shows how to set up OpenTelemetry tracing *before* importing ADK. AAA's `fast_api_app.py` has basic telemetry setup but could be enhanced with this pattern.
- **Sub-agent organization:** `data_science/sub_agents/` directory with dedicated tools per sub-agent. AAA's `agents/` directory follows a similar pattern but agents are at top level, not nested under sub-agents.
- **`call_*_agent` routing tools:** Root agent uses Python function tools that programmatically call sub-agents. AAA uses `sub_agents` list in `Agent()` constructor — both are valid, but the function-tool pattern gives more explicit control.
- **Eval directory structure:** `eval/` directory with dataset configs. AAA needs this.

**Lessons for AAA:**
- The `call_*_agent` function tool pattern could give AAA more granular control over when sub-agents are invoked vs. letting the coordinator decide dynamically
- OTel setup before ADK import is the correct pattern

---

## 3. safety-plugins

**Purpose:** Reusable safety guardrails that plug into any ADK agent runner.

**Key patterns to apply to AAA:**
- **Plugin architecture:** Safety plugins are Python classes that implement a plugin interface. AAA's "Agricultural Safety Kernel" is described in AGENTS.md but has no concrete implementation. This sample shows the exact pattern.
- **Model Armor:** Cloud-based content filtering plugin. AAA should consider using this for pesticide/chemical advice to prevent unsafe dosages.
- **LLM-as-Judge:** A plugin that grades agent output for safety compliance. AAA's eval phase should use this for `safety` metric.
- **`InMemoryRunner` with plugins:** Shows how to attach plugins to a runner. Can be applied to AAA's FastAPI app setup.

**Lessons for AAA:**
- The safety kernel described in AGENTS.md is currently **documented but unimplemented**. This sample provides the exact code pattern to implement it
- Add `safety_plugins/` directory to AAA project with Model Armor and LLM-as-Judge plugins

---

## Summary of Actions for AAA

| Pattern | Source | Action |
|---------|--------|--------|
| Typed config module | ambient-expense-agent | Extract hardcoded values from agent instructions into `app/config.py` |
| Event-driven triggers | ambient-expense-agent | Add `trigger_sources` support for scheduled crop alerts |
| OTel tracing before ADK | data-science | Reorder telemetry setup in `fast_api_app.py` |
| Sub-agent call tools | data-science | Optionally convert coordinator routing to explicit call functions |
| Eval directory structure | data-science | Create `tests/eval/` with dataset configs |
| Safety plugin architecture | safety-plugins | Implement the documented safety kernel as actual plugins |
| Model Armor filtering | safety-plugins | Add cloud content filtering for chemical/pesticide advice |
| LLM-as-Judge for eval | safety-plugins | Use for `safety` metric evaluation |
