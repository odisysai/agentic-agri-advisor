# Agentic Agriculture Advisor (Krishi Sampark) — Project Summary

> **Created:** 2026-07-03  
> **Purpose:** Master reference document for AI-assisted development. Read this before making any code changes to the project.  
> **Architecture Framework:** Google ADK (Agent Development Kit) & Antigravity SDK conventions  

---

## 1. Vision & Mission

**Krishi Sampark** is an offline-first, voice-first multi-agent agricultural intelligence platform for **smallholder farmers in India and Sub-Saharan Africa**.

### The Problem
- 500M+ smallholders face volatile climates, crop diseases, and fluctuating market prices
- High literacy barriers → need voice-first, visual interfaces
- Poor internet connectivity in rural areas → need offline-first design  
- Prohibitive cloud API costs → need zero-cost voice and hybrid edge-cloud routing
- Generic AI advice doesn't work → need hyper-personalized farm-specific recommendations

### The Solution
A multi-agent system (coordinator + 9 specialists) with:
- Four intelligence layers (OKF → Dynamic APIs → RAG → Edge PWA)
- Hybrid edge-cloud routing (simple queries local, complex queries cloud)
- Offline-first PWA with IndexedDB sync queue
- Browser-native voice (STT/TTS) at zero API cost
- Multi-language support (English, Hindi, Marathi, Telugu, Swahili)

---

## 2. Architecture (Router-Specialist Pattern)

```
Farmer's Query / Photo → Krishi Sastri (Coordinator Agent)
                              ├── Crop Analyst       — Soil chemistry, NPK targets, crop health
                              ├── Weather Advisor    — Microclimate risk modeling, evapotranspiration
                              ├── Market Advisor     — Commodity prices, mandi trends
                              ├── Pest Detector      — Disease identification, pest control
                              ├── Irrigation Advisor — Water requirements, soil moisture
                              ├── Farmer Interaction — Voice/chat translation
                              ├── Knowledge Retriever — OKF knowledge graph queries
                              ├── Simulation Agent   — Farm sandbox dynamics
                              └── Dashboard Agent    — UI schema configuration
```

**Registry:** `agents/agent_registry.yaml`

---

## 3. Four Intelligence Layers

| Layer | Type | Example Data Source |
|-------|------|---------------------|
| **OKF** (Knowledge Graph) | Static, curated reference | `okf-knowledge-graph/data/` — crop facts, disease profiles, soil types, safety rules |
| **Dynamic** (MCP APIs) | Real-time fresh data | MCP servers — Open-Meteo weather, Mandi market prices, crop pricing APIs |
| **RAG** (Vector Search) | Document retrieval | `rag_pipeline/` — embeddings over agronomy manuals, research papers, circulars |
| **Edge PWA** (Offline) | Local models + caching | `ui/` — TFLite pest classifier, local Gemma-2B explanations, IndexedDB cache + sync queue |

### What Goes Where
- **OKF (Static — NEVER change at runtime):** Crop facts, disease profiles, pest IDs, soil types, safety rules, crop-disease-pest relations
- **Dynamic (Real-time — fetched at query time):** Weather forecasts, market prices, soil moisture telemetry
- **RAG (Index static, queries dynamic):** Agronomy manuals, research papers, government circulars
- **Edge (Offline-first):** TFLite image classifier (~15MB), Gemma 2B explanations, IndexedDB cache

---

## 4. Directory Map

```
agentic-agri-advisor/
├── agents/                          # Python ADK specialist agent definitions
│   ├── coordinator/                 # Krishi Sastri — root orchestrator
│   ├── crop_analyst/                # Agronomy, NPK optimization, soil health
│   ├── weather_advisor/             # Weather impact modeling, hazard forecasts
│   ├── market_advisor/              # Commodity pricing and trends
│   ├── pest_detector/               # Plant disease & pest identification
│   ├── irrigation_advisor/          # Water requirements, soil moisture
│   ├── farmer_interaction/          # Voice/chat translation formatting
│   ├── knowledge_retriever/         # OKF knowledge graph queries
│   ├── simulation_agent/            # Farm sandbox environment
│   ├── dashboard_agent/             # UI schema configuration
│   └── agent_registry.yaml          # Agent registry mapping
├── app/                             # FastAPI server & REST endpoints
│   ├── fast_api_app.py              # Main app, SSE streaming, profiles, telemetry
│   └── app_utils/                   # Telemetry setup, typing helpers
├── ui/                              # Frontend assets (Vanilla JS, HTML, CSS)
│   ├── agui/                        # Krishi Sampark visual dashboard (main UI)
│   │   ├── index.html               # Main PWA entry point
│   │   ├── dashboard.js             # Core UI logic, hybrid routing, telemetry
│   │   ├── voice.js                 # STT/TTS integration
│   │   ├── camera.js                # Camera capture for pest/disease photos
│   │   ├── local_db.js              # IndexedDB cache + sync queue
│   │   ├── translations.js          # 5-language translation map (en/hi/mr/te/sw)
│   │   └── local_models.js          # WebGPU Gemma-2B + TFLite classifier
│   ├── a2ui/                        # Agent-to-User Interface rendering engine
│   │   └── app.js                   # JSON schema → HTML canvas parser
│   ├── schemas/                     # A2UI declarative screen layouts (JSON)
│   │   ├── crop_dashboard.json
│   │   ├── farmer_profile.json
│   │   ├── irrigation_planner.json
│   │   ├── market_insights.json
│   │   ├── pest_alert.json
│   │   └── simulation.json
│   ├── manifest.webmanifest         # PWA manifest (icons, brand color #3E8E41)
│   └── sw.js                        # Service worker (cache-first for UI, network-first for data)
├── ui_agents/                       # JS/TS client-side UI agent definitions
├── mcp_servers/                     # Model Context Protocol servers (decoupled from agents)
│   ├── okf/                         # Knowledge graph database interface
│   ├── rag/                         # Semantic search over agronomy manuals
│   ├── weather/                     # Open-Meteo REST API connector (⚠️ placeholder tools)
│   ├── market/                      # Commodity pricing API connector (⚠️ mock data)
│   ├── image_analysis/              # Multimodal Gemini Vision for pest/disease (❌ not started)
│   ├── tts/                         # Text-to-Speech via Edge TTS (❌ not started)
│   ├── stt/                         # Speech-to-Text cloud fallback (❌ not started)
│   ├── translation/                 # Backend translation engine (❌ not started)
│   └── mcp_registry.json            # MCP server configuration & definitions
├── okf-knowledge-graph/             # Open Knowledge Graph assets & ingestion
│   ├── data/
│   │   ├── safety/                  # 3 safety rule files (pesticide limits, PHI, organic)
│   │   ├── diseases/                # 5 disease profiles (wheat rust, rice blast, cotton grey mold...)
│   │   ├── pests/                   # 4 pest profiles (corn borer, cotton bollworm...)
│   │   ├── soil/                    # 3 soil types (clay, sandy loam, alluvial)
│   │   └── relations.yaml           # Cross-entity references (crops↔diseases↔pests)
│   └── scripts/                     # Ingestion and query scripts
├── rag_pipeline/                    # RAG data retrieval pipeline
│   ├── config.yaml                  # Chunking & model settings
│   ├── documents/                   # Source agronomy manuals
│   └── embeddings/                  # Vector index generation script
├── simulation/                      # Farm sandbox simulator (Gym-style environment)
│   ├── env.py                       # Crop hydration, pest dynamics, market simulation logic
│   └── run_simulation.py            # Main simulation runner
├── data/                            # SQLite Farm Twin database
│   ├── db_manager.py                # DB helper functions (get_profile, save_field, update_telemetry)
│   └── init_db.py                   # Database initialization schema (farmers, fields, plantings)
├── config/                          # Configuration files
│   ├── dev.yaml
│   └── prod.yaml
├── safety_kernel/                   # Safety guardrails for agronomic recommendations
├── deployment/terraform/            # Terraform infrastructure (pending)
├── tests/                           # Unit & integration tests
│   └── integration/test_localization.py  # Translation validation (4 key tests)
├── AGENTS.md                        # AI development coding guidance, safety rules, DoD
├── pyproject.toml                   # Python dependencies (Google ADK >=2.0, edge-tts, Google Cloud)
├── Dockerfile                       # Container configuration for Cloud Run deployment
├── Makefile                         # Development commands (setup, test, lint, ai-sdlc-check, release-check)
├── agents-cli-manifest.yaml         # Google agents-cli manifest configuration
└── GEMINI.md                        # AI-assisted development instructions

Key URLs:
- Dashboard (AGUI): http://localhost:8000/agui/index.html
- A2UI Client:      http://localhost:8000/a2ui/index.html
- API:              http://localhost:8000/openapi.json

```

---

## 5. Key Technical Decisions & Constraints

### Coding Standards (from AGENTS.md)
1. **Schema Modifications**: New A2UI schemas must be valid JSON with `type` field, no inline `<script>` tags
2. **Translation Consistency**: Every key ending in `Key` must exist in all 5 languages (`ui/agui/translations.js`)
3. **Script Separation**: Hindi mode = zero Telugu characters; Telugu mode = zero Devanagari characters
4. **Preserve Names**: Farmer names and regional locations must remain unchanged in greetings
5. **No Script Leaks**: Never leak binary files, credentials, or disable PWA caching

### Safety Rules (from AGENTS.md)
1. All prescriptive agronomic recommendations (dosages, chemical sprays) must go through Safety Kernel
2. Low confidence diagnoses → trigger human consultation escalation
3. Farmer Mode persona: warm village scholar ("Krishi Sastri"), under 80 words, no markdown symbols, max 4 bullet points
4. Hidden internal agent names (never expose "pathologist" or "irrigation planner" to farmer)

### Prohibited Changes
- Do NOT bypass failing tests or suppress linter errors
- Do NOT commit binary weights or credentials
- Do NOT disable PWA caching or local database twin fallback

### Commands Reference
```bash
make setup                  # Install project tools (uv sync --all-extras --dev)
make lint                   # Ruff + codespell check
make typecheck              # ty type checker
make test                   # Full unit + integration tests
make coverage               # pytest with JUnit evidence
make security               # Security scanners (bandit, detect-secrets, pip-audit)
make ai-sdlc-check          # Translation + schema + safety + codebase audits
make release-check          # Release readiness from evidence & approvals
```

---

## 6. Current Status Matrix

| Component | File/Location | Status | Notes |
|-----------|--------------|--------|-------|
| Coordinator Agent | `agents/coordinator/` | ✅ Works | 10 specialist sub-agents registered |
| Specialist Agents (9) | `agents/*/agent.py` | ✅ Works | ADK patterns followed |
| FastAPI Backend | `app/fast_api_app.py` | ✅ Works | SSE streaming, profiles, telemetry, TTS endpoints |
| AGUI Dashboard | `ui/agui/index.html` | ✅ Works | Main PWA entry, all features operational |
| A2UI Rendering | `ui/a2ui/app.js` | ✅ Works | JSON schema → HTML rendering |
| Multi-language (5) | `ui/agui/translations.js` | ✅ Works | EN, HI, MR, TE, SW with script separation |
| Local DB Sync | `ui/agui/local_db.js` | ✅ Works | IndexedDB + sync queue |
| Voice Interface | `ui/agui/voice.js` | ✅ Works | Web Speech API STT + Edge TTS fallback |
| Offline Banner | `ui/agui/dashboard.js` | ✅ Works | Network status indicator |
| Battery Monitor | `ui/agui/dashboard.js` | ✅ Works | Power awareness UI |
| Health Gauges | `ui/agui/dashboard.js` | ✅ Works | Mock data display |
| Today's Plan | `ui/agui/dashboard.js` | ✅ Works | Dynamic plan generation |
| Market Insights | `ui/agui/` | ⚠️ UI only | Mock prices, needs live API |
| Weather Forecasts | `agents/weather_advisor/tools.py` | ⚠️ Placeholder | Needs Open-Meteo API wiring |
| OKF Query | `agents/knowledge_retriever/tools.py` | ⚠️ Limited | Needs full wiring to OKF markdown files |
| RAG Retrieval | `mcp_servers/rag/server.py` | ⚠️ Needs index | Vector index not generated yet |
| Image Analysis MCP | `mcp_servers/image_analysis/` | ❌ Not started | Multimodal pest/disease detection |
| TTS MCP Server | `mcp_servers/tts/` | ❌ Not started | Backend TTS engine |
| STT MCP Server | `mcp_servers/stt/` | ❌ Not started | Cloud fallback STT |
| Translation MCP | `mcp_servers/translation/` | ❌ Not started | Backend translation engine |

### OKF Knowledge Graph Coverage
| Entity Type | Count in OKF | Priority Crops Missing |
|-------------|-------------|----------------------|
| Safety Rules | 3 ✅ | — |
| Diseases | 5 ✅ | Needs more for: cotton, sugarcane, sorghum, millet |
| Pests | 4 ✅ | Needs more for: cotton, sugarcane crops |
| Soil Types | 3 ✅ | black_cotton_soil needs to be added |
| Relations | ⚠️ In Progress | Cross-reference matrix for all crops→diseases→pests incomplete |

---

## 7. Google ADK Lifecycle Alignment (Development Roadmap)

| Phase | Name | Status | Priority |
|-------|------|--------|----------|
| 0 | **Understand** — Write spec (`.agents-cli-spec.md`) | ✅ Complete | Done |
| 1 | **Study Samples** — Clone & study reference projects | ✅ Complete | Done |
| 2 | **Scaffold** — `agents-cli scaffold enhance` alignment | ⚠️ Partially done | **Blocker for Phase 4/5** — `agents-cli-manifest.yaml` has directory mismatch (`app` vs actual `agents/`) |
| 3 | **Build** — Code quality, MCP wiring, agent enhancement | ⚠️ In Progress | Fix weather/market tools → add monitoring/turn_handlers/memory to coordinator |
| 3.5 | **Datastore** — RAG pipeline decision (custom vs template) | ⚠️ Direction-dependent | Custom `rag_pipeline/` or use `agents-cli agentic_rag` template |
| 4 | **Evaluate** — Quality Flywheel (generate → grade → optimize) | ❌ Missing | **HIGHEST PRIORITY** — Create datasets, metrics (hallucination, safety, language), run eval pipeline |
| 5 | **Deploy** — Cloud Run / Agent Runtime, CI/CD via Terraform | ❌ Missing | Post-eval step: `agents-cli infra cicd` → deploy |
| 6 | **Publish** — Register with Gemini Enterprise (optional) | ❌ N/A | Post-deploy optional step |
| 7 | **Observe** — Cloud Trace, prompt logging, BigQuery analytics | ❌ Missing | Post-deploy monitoring |

**Estimated effort remaining:** ~14-16 hours total (Phase 2: 1.5h, Phase 3: 1.5h, Phase 4: 5-6h, Phase 5: 2h)

---

## 8. Hybrid Intelligence Strategy (Edge vs Cloud Routing)

### Query Classification & Routing
| Query Type | Online Engine | Offline Engine | Example |
|-----------|---------------|----------------|---------|
| Simple/Chit-Chat | **Local Gemma** (0 cost) | Local Gemma | "Hello", "Who are you?" |
| Local Diagnostics | Gemma + TFLite | Gemma + TFLite | Leaf photo → pest ID |
| Traditional Remedy | **Local Gemma** (0 cost) | Local Gemma | "neem spray mix" |
| Historical Data | **Local Gemma** (IndexedDB) | Local Gemma (IndexedDB) | Farm profile, current crop stage |
| Live Mandi Prices | **Backend Market Agent** (API) | Gemma (cached data) | "Wheat price in Nagpur" |
| Weather Risk Forecast | **Backend Weather Agent** (API) | Gemma (cached data) | "Will it rain next week?" |
| Deep Agronomy Retrieval | **Backend RAG Agent** (vector search) | Gemma (general knowledge) | "Fertilizer X composition" |

### Keywords for Complex Intent Detection
```javascript
const complexKeywords = ['price', 'mandi', 'weather', 'rain', 'forecast', 
                         'predict', 'trend', 'market', 'manual', 'sensor'];
// If ANY keyword matches → route to cloud agents (if online)
// Otherwise → run locally on Gemma-2B (saves cost + latency)
```

### Edge Intelligence via Local Gemma as Orchestrator
Gemma-2B dynamically negotiates optimal resource allocation based on:
- **Battery Level** (low <15% → shift to cloud or lightweight fallback)
- **Network Type** (3G slow → route locally; Wi-Fi free → sync + cloud TTS)
- **Voice Package** (check available local voices for selected language)
- **Semantic Triage** (parse query → Local vs Backend routing decision)

---

## 9. PWA & Offline Strategy

### Component Files
- **`ui/manifest.webmanifest`** — PWA launcher config (icons, brand `#3E8E41`, standalone display)
- **`ui/sw.js`** — Service worker (cache-first for UI files, network-first for profile endpoints)
- **`ui/agui/local_models.js`** — MediaPipe WebGenAI Gemma 2B loader (WebGPU)
- **`ui/agui/camera.js`** — Camera capture (`facingMode: "environment"`) for pest/disease photos
- **`ui/agui/local_db.js`** — IndexedDB (profiles, chat history, telemetry cache + sync queue)

### PWA Capabilities
1. **Offline Pest/Disease Diagnosis** — Camera capture → TFLite classifier (embedded ~15MB model) → Gemma explains results
2. **Offline Voice Logging** — "I added wood ash" → STT → Gemma parses structure → IndexedDB save → auto-sync when online
3. **Offline Quarantine Alerts** — 90%+ disease match → offline quarantine instructions → queue alert for when online
4. **Offline Dashboard** — Full farmer dashboard with cached crop data, health gauges, and today's plan

---

## 10. Docker & Deployment
- **Dockerfile:** Container for Cloud Run (FastAPI + agents + MCP servers)
- **Terraform:** `deployment/terraform/` directory exists (empty placeholder, infrastructure not yet created)
- **Target:** Cloud Run (flexible, event-driven) — Google's recommended deployment for ADK agents
- **Secrets:** `config/secrets.template.env` — template for env vars (no actual secrets)

---

## 11. Multi-Language Strategy
5 languages with recursive UI translation (no page reload):

| Code | Language | Native Script | Google Voice |
|------|----------|---------------|-------------|
| `en` | English | Latin | `en-US-GuyNeural` |
| `hi` | Hindi | हिंदी | `hi-IN-MadhurNeural` |
| `mr` | Marathi | मराठी | `mr-IN-ManoharNeural` |
| `te` | Telugu | तेलుగు | `te-IN-MohanNeural` |
| `sw` | Swahili | Kiswahili | `sw-KE-RafikiNeural` |

---

## 12. Simulation Environment
Gym-style sandbox with stochastic models:
- **Weather Simulator** — Temperature, rain parameters, frost indicators (stochastic)
- **Irrigation Simulator** — Moisture absorption by soil type + evapotranspiration
- **Pest Simulator** — Risk % based on humidity and treatment history
- **Crop Growth Simulator** — Biological phases + health degradation when thresholds violated
- **Market Price Simulator** — Commodity price oscillations based on mandi supply forecasts

---

## 13. Key Design Principles (from whitepapers)
1. **Prototype First** — Build minimal, demonstrate value quickly, then iterate (Google's ADK workflow)
2. **Offline-First by Default** — Every feature must work without internet; online features are enhanced, not required
3. **Voice-First UX** — Farmers speak and listen; reading text is a fallback for low-literacy users
4. **Zero API Cost** — Browser-native STT/TTS + local Gemma for simple queries = $0 ongoing cost
5. **Safety Kernel** — All chemical/agricultural recommendations go through safety validation before delivery
6. **Evaluation Flywheel** — Continuously generate → grade → analyze → optimize agent responses before deploying to real farmers
7. **Agent Safety & RBAC** — Use Google's auth and permission patterns for production deployment
8. **TinyML Edge Models** — TFLite classification runs on-device, never sends sensitive farm photos to cloud

---

## 14. Tech Stack Summary
| Layer | Technology |
|-------|-----------|
| **Orchestration** | Google ADK (Agent Development Kit) >= 2.0 |
| **Orchestration SDK** | Antigravity SDK conventions (skills, callbacks, observability) |
| **Backend API** | FastAPI + Google ADK `get_fast_api_app()` wrapper |
| **Agent Runtime** | `agents-cli` workflow (scaffold, run, playground, eval, deploy) |
| **Frontend** | Vanilla JS + HTML + CSS (no framework), served by FastAPI static files |
| **UI Rendering** | A2UI 2.0 Canvas (declarative JSON → HTML) + AGUI custom dashboard |
| **PWA** | Service worker, manifest.webmanifest, IndexedDB |
| **Knowledge Graph** | Open Knowledge Graph (OKF) — markdown files + relations.yaml |
| **RAG** | Custom vector embeddings pipeline (configurable via rag_pipeline/config.yaml) |
| **Database** | SQLite (Farm Twin — farmers, fields, plantings, telemetry) |
| **Voice** | Web Speech API (STT) + SpeechSynthesis (TTS) edge; Edge-TTS backend fallback |
| **Vision** | MediaPipe Tasks-Vision TFLite (~15MB), Gemini Vision (cloud fallback) |
| **Container** | Docker → Cloud Run deployment |
| **IaC** | Terraform (pending) |
| **Monitoring** | OpenTelemetry → Google Cloud Trace, Logging (pending configuration) |

---

## 15. Immediate Next Steps (Recommended Order)

### 🔴 Phase 2 Fix — Scaffold Alignment
1. Fix `agents-cli-manifest.yaml` directory mismatch (`agent_directory: "app"` → `"agents"`)
2. Run `agents-cli scaffold enhance . --deployment-target cloud_run --agent-directory agents`

### 🟡 Phase 3 — Complete MCP Servers
3. Wire weather MCP server to Open-Meteo API (real forecasts, not placeholders)
4. Wire market MCP server to Mandi/Yahoo Finance API (real prices, not mocks)
5. Build image_analysis MCP server (multimodal pest/disease via Gemini Vision)
6. Build STT MCP server (cloud fallback for unsupported dialects)
7. Build translation MCP server (backend Gemini translation engine)

### 🔴 Phase 4 — Evaluation (HIGHEST PRIORITY)
8. Create `tests/eval/datasets/` with agronomy test cases (crop, weather, market, pest, irrigation)
9. Define eval config with metrics: hallucination, safety, language_correctness, multi_turn_task_success
10. Run `agents-cli eval generate` → grade → analyze → iterate (expect 5-10+ iterations)
11. Add custom `language_correctness` metric for all 5 languages

### 🟡 Phase 5 — Deployment
12. Set up CI/CD: `agents-cli infra cicd`
13. Deploy to dev environment on Cloud Run

---

## 17. 🔴 Missing Links: Prototype → Production Readiness for Real Farmers

> **This section was added during review (2026-07-03) to identify what separates a working prototype from a deployable product for smallholder farmers in India and Sub-Saharan Africa.**

### 17.1 Simulation Environment — Missing Critical Files (❌ COMPLETELY BROKEN)
| File | Referenced In | Status | What Breaks |
|------|--------------|--------|-------------|
| `simulation/pest_outbreak_simulator.py` | `env.py:4`, `env.py:21` | ❌ File does NOT exist | `FarmSimulationEnv.step()` raises ImportError at runtime — **entire simulation feature crashes** when farmer tries to use it |
| `simulation/market_price_simulator.py` | `env.py:5`, `env.py:21` | ❌ File does NOT exist | Same ImportError — **market simulation feature crashes** alongside pest simulator |
| `simulation/historical_parameters.json` | `crop_growth_simulator.py:14` | ❌ File does NOT exist | Falls back to hardcoded 5.0 t/ha yield for ALL crops — **gives farmers completely wrong harvest forecasts** |

**Impact:** The Simulation Agent and its "Simulation Sandbox" UI card (`ui/schemas/simulation.json`) are totally non-functional. Any farmer interaction with the simulator will produce errors or wildly inaccurate predictions (e.g., telling a cotton farmer that wheat yields are 5 t/ha regardless of crop type, soil, or season).

### 17.2 MCP Servers — Empty Directories (❌ NOTHING WORKS)
| Server Directory | Files Present? | Actual Implementation? | Real Farmer Impact |
|-----------------|---------------|----------------------|-------------------|
| `mcp_servers/image_analysis/` | ❌ Directory may not exist | ❌ **Nothing implemented** | Primary use case — pest/disease photo ID via camera — is COMPLETELY non-functional. The AGUI dashboard's Camera button does nothing when clicked (the JS file for camera capture references this MCP which doesn't exist) |
| `mcp_servers/tts/` | ❌ Directory may not exist | ❌ **Nothing implemented** | No cloud TTS fallback — the system relies 100% on browser `SpeechSynthesis` which has **terrible coverage** for Hindi/Marathi/Telugu/Swahili on the low-end Android phones that 80% of farmers actually use |
| `mcp_servers/stt/` | ❌ Directory may not exist | ❌ **Nothing implemented** | No cloud STT fallback — browser Web Speech API fails on Safari, older Android, and on devices without Google Play Services. Farmers in Africa (where iPhones/Safaris are common) get stuck with no voice input at all |
| `mcp_servers/translation/` | ❌ Directory may not exist | ❌ **Nothing implemented** | Complex technical agricultural terms cannot be translated accurately between languages — the system falls back to literal/basic translation that could mislead farmers on chemical dosages |

### 17.3 Weather & Market MCP — Stubbed APIs (⚠️ FAKE DATA SERVED)
| Server | What's Implemented | What's Missing | Real Farmer Impact |
|--------|-------------------|---------------|-------------------|
| `mcp_servers/weather/server.py` | ✅ Stub code exists with Open-Meteo URL hardcoded | ❌ No actual geocoding for **Indian cities/African locations**, no API call made when farmer query reaches it | Will serve weather data for **Pune (18.52, 73.85) hardcoded as fallback** for farmers in Maharashtra. Farmers in Karnataka, Tamil Nadu, Nigeria, or Kenya get **wrong weather data for their region** |
| `mcp_servers/market/server.py` | ✅ Stub code exists with Yahoo Finance URL | ❌ No actual API call wired, no India-specific APMC Mandi data source | Will serve Yahoo Finance futures prices (US dollars per bushel) — this is meaningless to a farmer in Maharashtra who needs prices in **₹/quintal** at their local APMC Mandi. Or worse, if the Yahoo API fails silently, it falls back to **hardcoded fallback rates** (`corn: 4.50`, `wheat: 6.12`) which are arbitrary numbers, not real Mandi prices |

### 17.4 Offline-First PWA — Not Built (❌ CRITICAL)
The project documentation in `docs/PWA_LLM_IMPLEMENTATION_PLAN.md` describes a PWA architecture, but the actual implementation is **mostly stubs and documentation** without working code:

| Component | File Path | Reality Check |
|-----------|----------|---------------|
| **Service Worker** | `ui/sw.js` | ❌ File does NOT exist. PWA will not cache UI assets, no offline fallback page, no network-first strategy for profile endpoints |
| **Local DB Sync** | `ui/agui/local_db.js` | ❌ File does NOT exist. IndexedDB offline cache, sync queue, auto-retry on reconnection — all documented but unimplemented |
| **Local Models** | `ui/agui/local_models.js` | ❌ File does NOT exist. MediaPipe WebGenAI Gemma-2B loader and TFLite classifier integration — completely absent |
| **Camera Capture** | `ui/agui/camera.js` | ❌ File does NOT exist. No camera access, no photo capture for pest/disease photos, canvas-based image processing |
| **PWA Manifest** | `ui/manifest.webmanifest` | ⚠️ May exist but service worker is not registered in `index.html`, so offline install won't work |

**Real farmer impact:** In rural India, internet connectivity is **intermittent and unreliable**. A farmer in a village with 3G might lose connection for hours while in the field. Without offline-first capabilities:
- App shows a blank/error page when connectivity drops (no service worker)
- Cannot capture pest/disease photos offline to analyze later
- Farm logs (irrigation records, treatment history) are lost when app goes offline
- Cannot function at all in areas with **no internet coverage** (many tribal/rural areas)

### 17.5 Safety Kernel — Not Built (❌ LIFE/SAFETY RISK)
| Component | Status | Real Farmer Risk |
|-----------|--------|-----------------|
| `safety_kernel/` directory | ❌ Exists as empty placeholder or may not exist at all | ⚠️ **No validation exists** for pesticide dosages, fertilizer amounts, or chemical recommendations before they reach the farmer |
| `safety_kernel/pesticide_limits.md` (OKF) | ✅ Exists with limits defined | ⚠️ But **nothing enforces these limits** in the agent pipeline — coordinator could recommend an unsafe dosage and deliver it without any safety check |
| Expert Escalation Pathway | ❌ Not implemented | ⚠️ When agent has low confidence (per AGENTS.md rule #2: "Low confidence diagnoses → trigger human consultation escalation"), there's **no mechanism** to route to a real agronomist. The rule is documented but silently ignored |

This is the most dangerous gap: an AI could confidently recommend **wrong pesticide dosages** that kill crops, harm farmers' health, or violate government regulations — with no safety layer to catch it.

### 17.6 Communication Channels — Not Built (❌ NO REACH TO FARMERS)
| Channel | Use Case for Farmers | Why It Matters |
|---------|---------------------|---------------|
| **WhatsApp Integration** | Farmers send voice notes → AI responds via WhatsApp chat/voice reply | 95%+ of Indian farmers use WhatsApp. Most **don't have smartphones** or access to a web browser with this dashboard |
| **SMS Notifications** | Weather alerts, pest outbreak warnings sent via SMS | 100% of farmers have basic feature phones that receive SMS. No smartphone needed |
| **Voice Call (IVR)** | Emergency pest quarantine alerts, government circulars delivered via phone call | For illiterate farmers who can't read SMS; critical during pest outbursts when every hour counts |
| **Community Alert System** | When one farmer reports pest outbreak → neighbors in radius get alerted | Prevents disease/pest spread across neighboring farms. No notification infrastructure exists at all |

### 17.7 Data Pipelines — Not Connected (❌ NO REAL DATA FLOWS)
| Pipeline | Infrastructure Status | Data Flow Reality |
|----------|----------------------|------------------|
| Weather → Open-Meteo API | ⚠️ Server.py has stub code | ❌ No actual endpoint wired through to OKF/agents. Weather advisor agent can't fetch live weather |
| Market → Mandi Prices | ⚠️ Server.py has stub code with fallback | ❌ No API wired. Market advisor returns mock or hardcoded data |
| Image → TFLite/Gemini Vision | ❌ No server built | ❌ Cannot process any images from farmer camera at all |
| RAG → Vector Database (Pinecone/Weaviate) | ❌ Config.yaml exists, embeddings/ has script placeholder | ❌ No actual vector index, no semantic search pipeline. RAG retrieval returns nothing useful |
| STT/TTS → Google Cloud Speech APIs | ❌ No servers built, no API keys configured | ❌ Voice processing limited to browser-native APIs only (poor coverage) |

### 17.8 RAG Pipeline — Concept Only, Not Implemented
| Component | Status | Impact |
|-----------|--------|--------|
| `rag_pipeline/config.yaml` (chunking settings) | ✅ Exists | Configuration only, no enforcement |
| `rag_pipeline/documents/` (source manuals) | ⚠️ May have placeholder files | No actual agronomy manuals loaded or indexed |
| `rag_pipeline/embeddings/` (vector index) | ⚠️ Script placeholder exists | ❌ No actual embedding model, no vector database, no retriever implementation. RAG MCP server returns empty/error |

### 17.9 Deployment Infrastructure — Not Built (❌ CANNOT DEPLOY)
| Component | Status | What Needs Building |
|-----------|--------|-------------------|
| Docker/Cloud Run | ⚠️ `Dockerfile` exists but not configured for Cloud Run deployment | Needs: proper health checks, environment config for Firebase/Google services, build context cleanup |
| Terraform IaC | ❌ `deployment/terraform/` is an empty directory or has placeholder structure only | Needs: Firebase Realtime Database config, Firestore indexes for Farm Twin data, Cloud Run service definitions, IAM roles, Vertex AI endpoints |
| CI/CD Pipeline | ❌ Not implemented at all | Needs: GitHub Actions or Cloud Build for automated testing (make test, make lint), security scans (bandit, detect-secrets), and deployment to dev/staging/prod |
| Firebase Integration | ❌ Documented as requirement but never configured | Needs: Realtime Database setup for farmer profiles, analytics events, push notification configuration |

### 17.10 Monitoring & Observability — Not Built (❌ NO PRODUCTION VISIBILITY)
| Component | Status | Impact After Deployment |
|-----------|--------|----------------------|
| OpenTelemetry tracing | ❌ Not configured (basic FastAPI logging exists only) | Cannot trace full request/response across agent pipeline; can't debug why a farmer's query fails in production |
| Logging & metrics | ⚠️ Basic print statements in FastAPI only | Cannot track agent performance, response latency, error rates, or farmer engagement metrics |
| BigQuery analytics | ❌ Not configured | Cannot analyze which features farmers actually use, query success/failure patterns, or system health over time |
| Agent Ops monitoring | ❌ Not configured | Cannot set up alerts for unusual agent behavior, high error rates, or safety kernel bypasses |

### 17.11 Complete Gap Analysis Summary
| Category | Built? | % Complete | Impact of Missing It |
|----------|--------|-----------|---------------------|
| **Agent Orchestration** (multi-agent logic) | ✅ Fully built | ~85% | Core reasoning engine works — this is the foundation |
| **Simulation Environment** (pest/market simulators) | ❌ Missing 2 files + missing JSON data | ~15% | Entire feature crashes; wrong crop forecasts served to farmers |
| **Image/Pest Detection MCP** (TFLite + Gemini Vision) | ❌ Nothing implemented | 0% | Primary use case (photo ID of pests/diseases) completely broken |
| **Voice/Speech MCP** (STT + TTS cloud fallback) | ❌ Nothing implemented | 0% | Voice-first UX fails on ~80% of farmer devices (older Android, Safari) |
| **Translation MCP** (backend Gemini translation) | ❌ Nothing implemented | 0% | Technical terms poorly translated; potential safety risk with chemical dosages in wrong language |
| **Offline-First PWA** (Service Worker + IndexedDB) | ❌ Nothing implemented | 0% | App broken in fields with no internet — critical since farmers work in remote areas |
| **Communication Channels** (WhatsApp, SMS, Voice call) | ❌ Nothing implemented | 0% | Will not reach farmers who only use WhatsApp/feature phones — the largest user segment |
| **Weather/Mandi Data Pipelines** (Open-Meteo, APMC APIs) | ⚠️ Stub code only | ~20% | Farmers get wrong weather for their region or fake Mandi prices |
| **Safety Kernel** (chemical validation) | ❌ Not implemented | 0% | Could deliver unsafe pesticide/fertilizer recommendations without any guardrails |
| **RAG Pipeline** (vector search for manuals) | ❌ Concept only | 5% | No document retrieval; cannot answer "Follow integrated pest management guidelines..." queries |
| **Deployment Infrastructure** (Docker, Terraform, CI/CD) | ❌ Not implemented | 5% | Cannot deploy to production even if all features are built |
| **Monitoring & Observability** (OpenTelemetry, BigQuery) | ❌ Not implemented | 0% | Cannot debug, monitor, or optimize the system once deployed to real farmers |
| **Overall Production Readiness** | ❌ | ~20% total | Working prototype of agent logic only; ~85% more work needed for real farmer deployment |

### 17.12 Recommended Build Order (Minimal to Production)
```bash
# BLOCKER 1 — Make simulation work TODAY (fix the crash)
→ Create `simulation/pest_outbreak_simulator.py` with humidity + treatment-based pest risk model
→ Create `simulation/market_price_simulator.py` with crop yield vs price oscillation model  
→ Create `simulation/historical_parameters.json` with real NPK/yield targets for Indian crops (wheat, rice, cotton, maize, soybean)
→ Then `FarmSimulationEnv` will no longer crash on import

# BLOCKER 2 — Wire real data APIs (next priority)
→ Fix Weather MCP: Use Open-Meteo for actual farmer location forecasts, not hardcoded Pune fallback
→ Fix Market MCP: Connect to APMC Mandi API (or Google Sheets with real data) for India-specific ₹/quintal pricing

# BLOCKER 3 — Build Safety Kernel (before showing any advice to real farmers)
→ Create `safety_kernel/validate_recommendation()` that cross-checks ALL chemical recommendations against OKF safety rules
→ Add confidence threshold routing: if < 0.7 → automatically escalate to expert agronomist via WhatsApp/voice

# BLOCKER 4 — Build offline-first PWA (critical for rural India)
→ Create `ui/sw.js` with proper cache-first strategy and offline fallback page
→ Create `ui/agui/local_db.js` with IndexedDB for offline profiles, chat history, telemetry cache
→ Add network status indicator (simple JavaScript `navigator.onLine` check with visual banner)

# Phase 5 — Build MCP servers (after blockers are fixed)
→ `mcp_servers/image_analysis/server.py`: TFLite pest classifier (~15MB model) + Gemini Vision fallback
→ `mcp_servers/tts/server.py`: Edge-TTS with proper voice selection for each language
→ `mcp_servers/stt/server.py`: Google Cloud Speech-to-Text fallback for browser STT failures
→ `mcp_servers/translation/server.py`: Gemini translation for accurate technical term handling

# Phase 6 — Deploy infrastructure (after all features work locally)
→ Dockerize properly for Cloud Run deployment with Firebase integration
→ Set up Terraform for GCP infrastructure (Firestore, Vertex AI, Cloud Run)
→ Create CI/CD pipeline with automated testing + deployment

# Phase 7 — Communication channels (post-deployment)
→ WhatsApp Business API integration via Twilio for voice note-based farmer interactions
→ SMS gateway (Gupshup/Twilio) for geo-fenced pest/weather alerts
```

### 17.13 Effort Estimate (Hours)
| Phase | Focus | Hours | Why |
|-------|------|-------|-----|
| Blocker 1 — Simulation fix | Python + JSON files for pest/market simulators | ~3 hours | 2 missing files + historical_parameters.json with real crop data |
| Blocker 2 — Real APIs | Weather MCP wiring + Market Mandi API connection | ~4 hours | Open-Meteo integration with proper location handling; APMC/Mandi data source setup |
| Blocker 3 — Safety Kernel | Validation layer + expert escalation routing | ~5 hours | Cross-reference agent recommendations against OKF safety rules; build escalation mechanism |
| Blocker 4 — Offline PWA | Service worker + IndexedDB sync queue | ~6 hours | Core offline infrastructure (this is the most critical gap for rural farmers) |
| Phase 5 — MCP servers | image_analysis, tts, stt, translation | ~8 hours | 4 MCP servers with real API integrations |
| Phase 6 — Deployment | Docker, Terraform, CI/CD | ~8 hours | Production deployment infrastructure on GCP |
| Phase 7 — Communication | WhatsApp, SMS, Voice call integration | ~6 hours | Real farmer reach through preferred channels |
| **TOTAL** | From current state to production-ready for real farmers | **~40-45 hours** | |
