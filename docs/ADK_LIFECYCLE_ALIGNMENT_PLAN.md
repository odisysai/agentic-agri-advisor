# ADK Lifecycle Alignment Plan: Agentic Agriculture Advisor (AAA)

> Based on the [Google Codelab: Getting Started with Antigravity Skills](https://codelabs.developers.google.com/getting-started-with-antigravity-skills?hl=en#0) and the agents-cli development workflow.

## Current State Assessment

The AAA project was manually created without using `agents-cli scaffold`. The core agent code follows ADK patterns faithfully, but the development process infrastructure (scaffolding, eval, deploy, observe) is absent.

| Lifecycle Phase | Status | Gap |
|----------------|--------|-----|
| **0 — Understand** | ✅ Complete | `.agents-cli-spec.md` written |
| **1 — Study Samples** | ✅ Complete | Samples cloned, `docs/ADK_SAMPLES_SUMMARY.md` written |
| **2 — Scaffold** | ✅ Complete | `agents-cli scaffold enhance` run, Cloud Run target set |
| **3 — Build** | ⚠️ In Progress | Weather/knowledge agents need MCP tool wiring |
| **3.5 — Datastore** | ⚠️ Custom | Own RAG pipeline vs built-in template |
| **4 — Evaluate** | ❌ Missing | No eval datasets, metrics, or flywheel |
| **5 — Deploy** | ❌ Missing | No CI/CD or Terraform |
| **6 — Publish** | ❌ N/A | Not deployed |
| **7 — Observe** | ❌ Missing | No tracing or monitoring |

---

## Phase 0: Requirements Spec

- [ ] 0.1 Write `.agents-cli-spec.md` with purpose, use cases, tools, constraints, success criteria
- [ ] 0.2 Cross-reference against AGENTS.md safety rules, OKF knowledge graph, RAG pipeline

---

## Phase 1: Study Reference Samples

- [ ] 1.1 Clone and study `ambient-expense-agent` (deployment + env config patterns)
- [ ] 1.2 Clone and study `data-science` (sub-agent orchestration patterns)
- [ ] 1.3 Clone and study `safety-plugins` (guardrail patterns)
- [ ] 1.4 Document findings in `docs/ADK_SAMPLES_SUMMARY.md`

---

## Phase 2: Scaffold with agents-cli

- [ ] 2.1 Run `agents-cli scaffold enhance . --deployment-target cloud_run --agent-directory agents`
  > ⚠️ The `agents-cli-manifest.yaml` says `agent_directory: "app"` but agents live in `agents/`. Must use `--agent-directory agents`.
- [ ] 2.2 Verify scaffold preserved all existing agent code, MCP servers, okf-knowledge-graph
- [ ] 2.3 Reconcile `agents-cli-manifest.yaml` fields with actual project structure
- [ ] 2.4 Confirm `tests/eval/`, `deployment/`, CI/CD files created correctly

---

## Phase 3: Build — Code Quality & ADK Patterns

- [ ] 3.1 Fix `weather_advisor_agent` and `knowledge_retriever_agent` — currently have `tools=[]` but reference MCP tools in comments; wire MCP tools properly
- [ ] 3.2 Add `monitoring` config to all agents per ADK best practices
- [ ] 3.3 Add `turn_handlers` to coordinator for robust conversation flow
- [ ] 3.4 Add `memory` to coordinator for cross-turn context if needed
- [ ] 3.5 Smoke test with `agents-cli run "..."` on coordinator

---

## Phase 3.5: Datastore (RAG)

- [ ] 3.5.1 Decision: keep custom `rag_pipeline/` or switch to `agents-cli agentic_rag` template
- [ ] 3.5.2 If custom: add eval data for RAG quality (grounding, hallucination metrics)
- [ ] 3.5.3 If template: run `agents-cli infra datastore` + `data-ingestion`

---

## Phase 4: Evaluate ⭐ Highest Priority

The Quality Flywheel: Prepare → Inference → Grade → Analyze → Optimize

- [ ] 4.1 Create `tests/eval/datasets/` with agronomy-specific test cases (crop, weather, market, pest, irrigation, general)
- [ ] 4.2 Create `tests/eval/eval_config.yaml` with metrics:
  - `hallucination` — catch fabricated agronomy facts
  - `safety` — compliance with safety kernel
  - `multi_turn_tool_use_quality` — proper tool selection
  - `final_response_quality` — clarity and completeness
  - `multi_turn_task_success` — goal completion
- [ ] 4.3 Add custom metrics: `language_correctness` (5 languages), `safety_kernel_compliance`
- [ ] 4.4 Run `agents-cli eval generate` — produce traces
- [ ] 4.5 Run `agents-cli eval grade` — score traces
- [ ] 4.6 Open `artifacts/grade_results/results_*.html` — analyze failures
- [ ] 4.7 Fix failing cases — iterate on prompts, tools, instructions (expect 5-10+ iterations)
- [ ] 4.8 Run `agents-cli eval compare` to confirm improvements

> Start with 1-2 eval cases, get them passing, then expand.

---

## Phase 5: Deploy

- [ ] 5.1 Choose target: Cloud Run (flexible, event-driven) or Agent Runtime (managed)
- [ ] 5.2 Scaffold deploy infra: `agents-cli scaffold enhance . --deployment-target <target>`
- [ ] 5.3 Set up CI/CD: `agents-cli infra cicd`
- [ ] 5.4 Deploy to dev: `agents-cli deploy` (after human approval)
- [ ] 5.5 Verify: curl deployed endpoint

---

## Phase 6: Publish (Optional)

- [ ] 6.1 Register agent with Gemini Enterprise (if deploying to Agent Runtime)

---

## Phase 7: Observe

- [ ] 7.1 Set up Cloud Trace for agent spans
- [ ] 7.2 Configure prompt-response logging
- [ ] 7.3 Set up BigQuery Agent Analytics

---

## Effort Estimate

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 0: Spec | 45 min | 🔴 Start here |
| Phase 1: Samples | 1 hr | 🟡 Parallel with 0 |
| Phase 2: Scaffold | 1.5 hr | 🔴 Blocker for 4/5 |
| Phase 3: Build | 1.5 hr | 🟡 Incremental |
| Phase 3.5: Datastore | 30-60 min | 🟡 Direction-dependent |
| Phase 4: Evaluate | 5-6 hr | 🔴 Core value add |
| Phase 5: Deploy | 1.5-2 hr | 🟡 Post-eval |
| Phase 6: Publish | 15 min | ⚪ Optional |
| Phase 7: Observe | 1.5 hr | 🟡 Post-deploy |
| **Total** | **~14-16 hr** | |

---

## Key Decisions Required

1. **Deployment target**: Cloud Run or Agent Runtime?
2. **RAG direction**: Keep custom `rag_pipeline/` or use `agents-cli agentic_rag` template?
3. **Phase 0 spec**: Do we write `.agents-cli-spec.md` before scaffolding?
