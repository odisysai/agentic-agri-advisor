# Architectural Review: Krishi Sampark — Lead AI Solutions Architect Assessment

> **Reviewed:** July 3, 2026 | **Reviewer:** GitHub Copilot (Lead AI Solutions Architect) | **Status:** Pre-Production Prototype

---

## 1. Executive Summary

The local agent has built a **conceptually sound, architecturally ambitious prototype** that demonstrates strong alignment with Google's ADK multi-agent patterns. The vision — an offline-first, voice-first, multilingual advisory platform for 500M+ smallholders — is the right one. The structural bones are solid.

However, the project is currently a **well-documented prototype, not a production system**. The gap between what is *designed* and what is *actually wired, tested, and safe* is large. Several components that carry life-safety risk (chemical dosage, pesticide advice) are structurally absent. Deployment, observability, and the evaluation flywheel are entirely missing.

The mission is to take it from **demo-ready → farmer-ready**.

---

## 2. What Was Built — Honest Inventory

### Strengths

| Component | Status | Quality |
|---|---|---|
| Router-Specialist Multi-Agent Pattern (ADK) | ✅ Implemented | Strong — 9 specialists + coordinator, ADK-native |
| 4-Layer Knowledge Architecture (OKF / Dynamic / RAG / Edge) | ✅ Designed | Excellent conceptual layering |
| MCP Server Integration (8 servers) | ✅ Wired | Weather server is real; others partial |
| Farmer Digital Twin (SQLite) | ✅ Implemented | Solid foundation |
| Multi-language Support (5 languages) | ✅ Working | EN/HI/MR/TE/SW in UI |
| A2UI Dynamic UI Schema Rendering | ✅ Working | Appropriate for low-literacy users |
| Hybrid Edge-Cloud Routing Logic | ✅ Designed | Strategy is correct |
| ADK Lifecycle Alignment | ⚠️ Phases 0-3 only | Phases 4-7 entirely missing |
| Coordinator Persona (Krishi Sastri) | ✅ Strong | JSON-structured responses, warm persona |

### What Was Agreed, Documented, But Not Built

| Component | Documented | Reality |
|---|---|---|
| Agricultural Safety Kernel | Full spec in AGENTS.md | `safety_kernel/` is empty — `__init__.py` only |
| RAG Pipeline | Directories + README | Zero documents ingested, zero embeddings generated |
| TFLite Pest Classifier | Design doc + `ui/models/` path | No model file, not trained |
| Evaluation Framework | `eval_config.yaml` exists | 1 generic metric, no agronomy-specific test cases |
| Terraform / CI-CD | `deployment/terraform/` exists | Empty |
| Observability (Cloud Trace, BigQuery Analytics) | Planned in ADK Lifecycle doc | Not implemented |
| Safety Plugin Architecture (Model Armor) | ADK Samples Summary | Not implemented |

---

## 3. Alignment With Google's ADK & Agent Whitepapers

Google's agent architecture rests on four primitives: **Model, Tools, Orchestration, and Memory**. Here is where Krishi Sampark stands against each:

### 3.1 Model

- ✅ `gemini-3.5-flash` with retry_options is appropriate for cost-efficiency at edge.
- ⚠️ **Gap**: No model selection strategy. Weather and pest queries have different latency/cost profiles. A `gemini-3.5-flash` for all 9 agents is over-specified for some (farmer_interaction) and under-specified for others (image analysis should use a vision model).
- ⚠️ **Gap**: No fallback model chain. If Gemini is unavailable, no degradation path exists.

### 3.2 Tools

Google's whitepaper defines tools as the **only** way agents access real-world data. This is the largest implementation gap:

| Agent | Tools Defined | Real Data Access |
|---|---|---|
| `weather_advisor_agent` | `tools=[]` | **None — the most critical agent has no tools** |
| `pest_detector_agent` | `get_ui_schema` only | No pest identification, no image analysis MCP |
| `irrigation_advisor_agent` | `get_ui_schema` only | No soil sensor, no evapotranspiration tools |
| `crop_analyst_agent` | `refresh_crop_schema`, `get_ui_schema` | Dashboard refresh only, no OKF lookup |
| `knowledge_retriever_agent` | OKF tools | ✅ Best-wired agent |
| `market_advisor_agent` | `refresh_market_schema`, `get_ui_schema` | ✅ Partial (Yahoo Finance) |

**Assessment**: The coordinator routes queries to specialist agents that have no tools to answer them. The agents are responding from LLM parametric knowledge — which is the opposite of grounding. This is the single highest-priority technical debt item.

### 3.3 Orchestration

- ✅ Router-Specialist pattern is correctly implemented using ADK `sub_agents`.
- ✅ Coordinator persona (JSON response schema) is well-designed for UI consistency.
- ⚠️ **Gap**: No `turn_handlers` or `callbacks` implemented. No pre/post-tool safety checks.
- ⚠️ **Gap**: Sub-agent routing is implicit (LLM decides). For safety-critical queries (pesticides), routing must be explicit with deterministic guardrails.
- ⚠️ **Gap**: No agent-to-agent memory. Each specialist starts from zero context.

### 3.4 Memory

Google's agents whitepaper defines 4 memory types:

| Type | Status |
|---|---|
| In-context (conversation window) | ✅ Implemented |
| External/vector (RAG) | ❌ Not populated |
| Episodic (past interactions) | ❌ Not implemented |
| Semantic (knowledge graph) | ⚠️ OKF exists but very narrow coverage |

The Digital Twin (SQLite) is the strongest memory component. It needs to be expanded as the central "farmer episodic memory."

---

## 4. Gap Analysis — Prioritized by Risk

### 🔴 P0 — Life Safety (Fix Before Any Farmer Uses This)

**Gap 1: Agricultural Safety Kernel is Empty**

The AGENTS.md mandates: *"All prescriptive agronomic recommendations must navigate through the backend Agricultural Safety Kernel."*

The `safety_kernel/` module contains only `__init__.py`. There are **no actual guardrails**. A coordinator agent can today hallucinate a pesticide dosage that could harm a farmer or contaminate food.

**Design Direction**: Implement as ADK `before_tool_callback` and `after_agent_callback` pattern (as shown in the `safety-plugins` sample already studied). The kernel must:
- Validate any chemical/pesticide name against OKF `safety/pesticide_limits.md`
- Enforce Pre-Harvest Interval (PHI) rules before any treatment recommendation
- Escalate to human agronomist when confidence is below threshold
- Reject responses that include dosages exceeding OKF-defined limits

**Gap 2: Pest/Disease Advice is Pure LLM Hallucination**

`pest_detector_agent` has no tools connected to OKF, no image analysis MCP wiring, and no RAG lookup. Any pest or disease diagnosis is the model's parametric knowledge — which may be wrong, regionally inappropriate, or outdated.

---

### 🟠 P1 — Functional Correctness (Fix to Make It Actually Work)

**Gap 3: Weather Advisor Has No Tools**

`weather_advisor_agent` has `tools=[]`. The entire weather MCP server (`mcp_servers/weather/server.py`) — which correctly calls the Open-Meteo API — is **never invoked by any agent**. The MCP server exists and works, but nothing calls it.

**Design Direction**: Wire `fetch_weather_forecast` from the weather MCP into `weather_advisor_agent`'s tool list. This is the lowest-effort, highest-impact fix in the codebase.

**Gap 4: RAG Pipeline Has No Data**

- `rag_pipeline/documents/raw/` — empty
- `rag_pipeline/embeddings/index/` — contains only a placeholder JSON

**Priority document corpus to curate:**
1. ICAR (India) crop advisory bulletins for major crops (wheat, rice, cotton, soybean)
2. FAO IPM guidelines for Sub-Saharan Africa (maize, cassava, sorghum)
3. State-level mandi/MSP regulations for India
4. Kenya/Tanzania/Uganda agricultural extension bulletins

**Gap 5: OKF Coverage is India-Centric and Thin**

Current OKF: 5 diseases, 4 pests, 3 soil types — all India-focused. For the stated mission of serving India **and Africa**, the knowledge graph is approximately 20% complete.

Specifically absent:
- Africa crops: maize, cassava, sorghum, groundnut, millet, banana
- Africa pests: Fall Armyworm (highest-impact pest in Sub-Saharan Africa), cassava mosaic disease, banana Xanthomonas wilt
- African soils: laterite, vertisol (black cotton soil), ferralsol
- India completeness: pulses (lentil, chickpea), horticulture crops, spices

---

### 🟡 P2 — Production Readiness (Required Before Scale)

**Gap 6: No Evaluation / Quality Flywheel**

The project has 1 generic 1-5 quality metric, no agriculture-domain-specific metrics, no regional eval datasets, and no language correctness validation.

**Eval Metrics to Define:**

| Metric | Description | Why Critical |
|---|---|---|
| `agronomy_factual_accuracy` | LLM-as-judge against OKF ground truth | Prevent hallucination in crop advice |
| `safety_kernel_compliance` | Does response violate any PHI or dosage limit? | Life safety |
| `language_script_correctness` | Is Hindi in Devanagari? Telugu in Telugu script? | Usability |
| `tool_invocation_quality` | Was the correct tool called for the query type? | Functional correctness |
| `offline_fallback_quality` | Is the offline Gemma response appropriate? | Resilience |
| `regional_relevance` | Is advice appropriate for stated region? | Trust |

**Gap 7: No Deployment Infrastructure**

`deployment/terraform/` is empty. No Cloud Run service definition, no Secret Manager, no CI/CD pipeline, no environment separation.

**Gap 8: No Observability**

No Cloud Trace, no monitoring, no alerting on agent failures, no drift detection, no error rate monitoring on MCP server calls.

---

### 🔵 P3 — Mission-Critical Capability Gaps (Differentiation)

**Gap 9: Africa Market Data is Absent**

Market MCP fetches Yahoo Finance (US-centric). African farmers need:
- Kenya NCPB (National Cereals and Produce Board) prices
- Nigeria FEWSNET market data
- Ethiopia Commodity Exchange (ECX)
- COMESA Grain Marketwatch

**Gap 10: USSD / WhatsApp / Feature Phone Access Not Designed**

Ground reality:
- India: 40%+ of rural farmers use feature phones or low-end Android (no WebGPU)
- Sub-Saharan Africa: USSD is the dominant mobile interface in Tanzania, Uganda, Ethiopia
- WhatsApp has 500M+ users in India and 100M+ in Africa

**Design Direction**: The FastAPI + ADK backend is already API-first. Expose:
1. WhatsApp Business API webhook (Twilio/360dialog) → routes to existing coordinator agent
2. USSD gateway (Africa's Talking) → simplified text-only query path
3. SMS notification channel for market price alerts

**Gap 11: No Human-in-Loop Escalation Path**

UI has expert review screens (designed), but no expert identity database, no routing from agent → expert notification, no expert response feedback loop, and no agronomist network coverage by region.

**Gap 12: No Feedback Loop and Learning**

No mechanism to:
- Rate advice quality
- Track whether a recommendation was followed and the outcome
- Use agronomist corrections to improve agent instructions

---

## 5. Google Whitepaper Alignment Summary

| Whitepaper Principle | Current Status | Gap |
|---|---|---|
| Grounding over Hallucination — Agents must use tools | ⚠️ Partial | 6/9 agents have no real-data tools |
| Safety by Design — Guardrails at every agent boundary | ❌ Missing | Safety Kernel is empty |
| Quality Flywheel — Eval → Grade → Analyze → Optimize | ❌ Missing | No domain metrics, no agronomy datasets |
| Memory Hierarchy — In-context, external, episodic, semantic | ⚠️ Partial | Only in-context + Digital Twin |
| Hybrid Edge-Cloud — Routing by latency/cost | ✅ Designed | TFLite not bundled, Gemma not validated |
| Observability — Trace every agent span | ❌ Missing | No OTel, no Cloud Trace |
| Human-in-Loop — Escalation for low-confidence | ⚠️ UI only | Backend escalation not implemented |
| Contextual Personalization — Digital Twin drives prompts | ✅ Implemented | Good foundation |
| Offline Resilience — Service Worker, IndexedDB, sync queue | ✅ Designed | Partially implemented |
| Structured Outputs — Consistent JSON schemas | ✅ Implemented | Coordinator JSON schema is clean |

---

## 6. Action Plan — Phased Roadmap

### Phase 0 — Immediate (Weeks 1-2): Make It Safe

> These must be done before any farmer interaction.

| # | Action | Effort |
|---|---|---|
| 0.1 | Implement Agricultural Safety Kernel as ADK `before_tool_callback` / `after_agent_callback` | 3 days |
| 0.2 | Wire `fetch_weather_forecast` MCP tool into `weather_advisor_agent` | 2 hours |
| 0.3 | Wire OKF + image_analysis MCP into `pest_detector_agent` | 1 day |
| 0.4 | Add before/after tool callbacks to coordinator for safety validation | 1 day |
| 0.5 | Write 10 safety eval cases (pesticide dosage, PHI violations) | 1 day |

### Phase 1 — Foundation (Weeks 3-6): Make It Work

| # | Action | Effort |
|---|---|---|
| 1.1 | Curate and ingest 10-15 priority agricultural documents into RAG pipeline | 1 week |
| 1.2 | Expand OKF: Africa priority crops/pests (Fall Armyworm, cassava, maize) | 1 week |
| 1.3 | Expand OKF: India completeness (pulses, horticulture, spices) | 1 week |
| 1.4 | Build eval dataset: 50 agronomy QA pairs per region (India, East Africa) | 1 week |
| 1.5 | Define and implement 6 domain eval metrics (see Gap 6 table) | 3 days |
| 1.6 | Run Quality Flywheel: eval → grade → analyze failures → fix agents | Ongoing |
| 1.7 | Wire Africa market data sources into market MCP server | 3 days |
| 1.8 | Implement Human-in-Loop: expert notification backend + feedback loop | 1 week |

### Phase 2 — Production Infrastructure (Weeks 7-10): Make It Deployable

| # | Action | Effort |
|---|---|---|
| 2.1 | Terraform: Cloud Run service, Secret Manager, VPC | 1 week |
| 2.2 | CI/CD: GitHub Actions → test → eval → deploy gate | 3 days |
| 2.3 | OTel tracing: ADK spans → Cloud Trace → BigQuery Agent Analytics | 3 days |
| 2.4 | Define SLOs: latency per agent, eval score floor, error rate ceiling | 1 day |
| 2.5 | Farmer authentication: lightweight OTP-based identity | 3 days |
| 2.6 | Multi-tenancy: farmer data isolation per region (India vs Africa) | 3 days |

### Phase 3 — Scale and Reach (Weeks 11-16): Expand Entry Points

| # | Action | Effort |
|---|---|---|
| 3.1 | WhatsApp Business API integration: webhook → coordinator agent | 1 week |
| 3.2 | USSD gateway (Africa's Talking): simplified text flow | 1 week |
| 3.3 | SMS market price alerts: scheduled agent → farmer notification | 3 days |
| 3.4 | TFLite model: acquire/train plant disease classifier, bundle in `ui/models/` | 2 weeks |
| 3.5 | Validate Gemma-2B on low-end Android (budget phones, no WebGPU) | 1 week |
| 3.6 | Feedback loop: farmer outcome tracking → advisor quality improvement | 1 week |
| 3.7 | Government scheme integration (PM-KISAN, MSP for India) | 1 week |

### Phase 4 — Differentiation (Months 4-6): Intelligence Layer

| # | Action | Effort |
|---|---|---|
| 4.1 | Community intelligence: aggregate nearby farmer alerts for outbreak detection | 2 weeks |
| 4.2 | Satellite / NDVI data integration: Sentinel-2 via Google Earth Engine | 2 weeks |
| 4.3 | Crop yield prediction model: Digital Twin + weather + historical data | 3 weeks |
| 4.4 | Personalized crop recommendation engine: soil × season × market price | 2 weeks |
| 4.5 | Expert knowledge distillation: agronomist corrections → OKF updates | Ongoing |

---

## 7. Architecture Design Principles Going Forward

**P1. Ground Every Claim**
No agent may return an agronomic recommendation that is not traceable to OKF, RAG, or a real-time API call. If the tool fails, the agent must say "I don't have verified data right now" — not hallucinate. Instrument this in eval.

**P2. Safety is Pre-Response, Not Post-Response**
The safety kernel must be a `before_tool_callback` that intercepts before any chemical recommendation is issued, not a review layer after the fact. Once a farmer reads "apply X at Y liters," they may act on it immediately.

**P3. Offline Is a Feature, Not a Fallback**
The offline experience must be designed as the primary experience for Africa, not an edge case. This changes how TFLite models are selected (smaller), how OKF is cached (full local copy), and how the UI behaves (no "loading..." spinners — all immediate).

**P4. Every Release Passes the Flywheel**
No code change to agent instructions, OKF, or RAG goes to production without running the eval pipeline and showing improvement or neutral delta on all 6 domain metrics. This must be enforced as a CI gate.

**P5. One Platform, Multiple Interfaces**
The FastAPI + ADK backend is the platform. PWA is one client. WhatsApp is another. USSD is another. SMS alerts are another. Design the backend API contract to be interface-agnostic. The coordinator's structured JSON responses are already well-suited for this.

**P6. The Digital Twin is the Source of Truth**
Every farmer interaction, every recommendation outcome, every telemetry reading goes into the Digital Twin. This is what makes the advice hyper-personalized over time. Protect it, version it, and never let agents write to it without validation.

---

## 8. Summary Scorecard

| Dimension | Current Score | Target (Production) |
|---|---|---|
| Architecture Design | 8/10 | 9/10 |
| Tool Grounding | 3/10 | 9/10 |
| Safety | 1/10 | 10/10 |
| Knowledge Coverage (OKF + RAG) | 2/10 | 8/10 |
| Evaluation & Quality Flywheel | 1/10 | 8/10 |
| Deployment & DevOps | 0/10 | 8/10 |
| Observability | 0/10 | 7/10 |
| Africa Readiness | 2/10 | 8/10 |
| Offline PWA Completeness | 4/10 | 8/10 |
| **Overall Production Readiness** | **2.5/10** | **8/10** |

---

## 9. Bottom Line

> The architecture is the right one. The foundation is solid. What's needed now is to **stop building new features and instead wire, test, evaluate, and harden what already exists** — starting with the safety kernel and tool grounding, which are blocking issues for any real farmer interaction.

The next sprint should open with the ADK `before_tool_callback` safety pattern, wire the weather MCP tool (2-hour fix), and run the evaluation pipeline on pest and disease flows before any other feature work begins.

---

*This assessment is based on direct review of all source files, agent implementations, documentation, and the ADK Lifecycle Alignment Plan as of July 3, 2026.*
