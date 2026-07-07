# Krishi Sampark: Offline-First Multi-Agent Agriculture Advisor for Smallholder Farmers

**Track:** Agents for Good

**GitHub:** https://github.com/girinalin/agentic-agri-advisor

**Live Demo:** https://krishi.odisysai.com

**License:** Source code under Apache 2.0; documentation and visual assets under CC BY 4.0. See [LICENSE](https://github.com/girinalin/agentic-agri-advisor/blob/main/LICENSE), [LICENSE-DOCS](https://github.com/girinalin/agentic-agri-advisor/blob/main/LICENSE-DOCS), and [NOTICE](https://github.com/girinalin/agentic-agri-advisor/blob/main/NOTICE) for details.

**Kaggle Submission Note:** If selected as a winning submission, the project owner is prepared to grant the competition sponsor the license described in the competition rules for showcasing and promoting this submission.

---

## The Problem

Over 500 million smallholder farmers across India and East Africa face a daily struggle: crop diseases, irrigation decisions, market price volatility, and weather risks — all without reliable access to agronomic expertise. Existing agricultural apps fail these farmers in three critical ways: they require constant internet connectivity, they demand English literacy, and they provide generic advice without safety validation.

The traditional solution has been the village elder — the "Krishi Sastri" (agricultural scholar) — who knows the local soil, crops, and seasons. But there are far too few of them. Krishi Sampark ("Agricultural Connection") brings this village scholar digitally into every farmer's pocket.

## Why Agents?

A single LLM cannot effectively serve as agronomist, meteorologist, market analyst, irrigation engineer, and pest pathologist simultaneously — it hallucinates, loses context, and produces generic responses. A multi-agent system solves this by decomposing the problem into specialized agents, each with narrow domain expertise, coordinated by a central orchestrator.

Agents uniquely solve this problem because:

1. **Specialization reduces hallucination** — A pest detector agent trained on crop disease patterns is far more accurate than a general LLM guessing at leaf symptoms
2. **Tool use enables real-time data** — MCP servers fetch live weather, market prices, and knowledge graph data on demand
3. **Safety callbacks enforce guardrails** — The Safety Kernel intercepts every agent response to block banned chemicals and enforce dosage limits
4. **Offline resilience** — Local agents with cached knowledge can function without internet, escalating to cloud only when needed

## Architecture

Krishi Sampark uses a **Router-Specialist** multi-agent pattern built on Google ADK (Agent Development Kit):

### Agent Layer (Google ADK)

A **Coordinator Agent** receives farmer queries (voice or text), triages intent, and routes to one of 9 specialist agents:

| Agent | Domain |
|---|---|
| Crop Analyst | Soil chemistry, NPK calibration, crop health |
| Irrigation Advisor | Drip scheduling, moisture thresholds |
| Pest Detector | Image-based disease identification, remedies |
| Weather Advisor | Microclimate analysis, planting windows |
| Market Advisor | Commodity pricing, mandi rates, sale timing |
| Knowledge Retriever | OKF knowledge graph + RAG semantic search |
| Farmer Interaction | Multilingual voice/audio handling |
| Simulation Agent | What-If farm simulations, soil predictions |
| Dashboard Agent | Declarative UI card generation |

### MCP Tool Servers (8)

Agents access external data through **Model Context Protocol (MCP)** servers, decoupling data access from agent logic:

- **OKF** — Agricultural ontology & knowledge graph queries
- **RAG** — Semantic search over agronomy manuals
- **Weather** — Local forecast & microclimate analysis
- **Market** — Crop pricing, supply charts
- **Image Analysis** — Multimodal plant disease identification
- **STT** — Speech-to-text transcription
- **TTS** — Neural text-to-speech synthesis
- **Translation** — Gemini-driven multilingual translation

### Safety Kernel

The Safety Kernel implements ADK `before_agent_callback` and `after_agent_callback` hooks that intercept every agent response to enforce:

- **Banned chemical blocking** — endosulfan, carbofuran, monocrotophos never recommended
- **Pesticide dosage limits** — max concentration and application rate per OKF safety files
- **PHI enforcement** — pre-harvest interval checks before any chemical spray recommendation
- **Low-confidence escalation** — uncertain diagnoses routed to human agronomist via Expert mode
- **Farmer UX invariants** — responses under 80 words, no markdown, warm "Krishi Sastri" persona

### Offline-First PWA

The frontend is a Progressive Web App with:
- **In-browser Gemma 2B** model (WebGPU) for offline AI inference
- **IndexedDB local data twin** syncing with server-side SQLite
- **Service worker caching** for all critical assets
- **Browser-native STT/TTS** — zero API cost, sub-100ms latency, works offline
- **6 languages** — English, Hindi, Marathi, Telugu, Swahili, Zulu — with script purity enforcement

### Hybrid Intelligence

When the local Krishi Sastri agent encounters a complex diagnosis (disease, chemical dosage), it offers to escalate to **Krishi Visheshagya (Expert)** — a cloud Gemini 2.5 Flash agent with deeper reasoning. This hybrid approach keeps costs near zero for routine queries while providing expert-grade analysis when needed.

## Course Concepts Applied

This project demonstrates **5 of the 6** key concepts from the AI Agents Intensive course:

### 1. Agent / Multi-Agent System (ADK) — Code
Built 10 ADK agents with a Coordinator-Specialist orchestration pattern. The coordinator agent uses ADK's routing capabilities to triage and dispatch to specialists. Agents are registered in `agent_registry.yaml` and discoverable via `agents-cli`.

### 2. MCP Server — Code
Implemented 8 MCP servers using the Model Context Protocol. Each server exposes domain-specific tools (weather forecasts, market prices, knowledge graph queries, speech synthesis) that agents call through the standard MCP interface. This decoupled architecture allows swapping data sources without touching agent code.

### 3. Security Features — Code
The Agricultural Safety Kernel uses ADK callback hooks (`before_agent_callback`, `after_agent_callback`) to enforce safety rules on every agent response. It blocks banned chemicals, enforces pesticide dosage limits, validates pre-harvest intervals, and escalates low-confidence diagnoses to human experts. 19 adversarial safety tests confirm resistance to prompt injection.

### 4. Deployability — Video
The project includes Dockerfile, Terraform IaC for Google Cloud Run, GitHub Actions CI/CD, and `agents-cli` deployment manifests. The PWA is installable on any mobile device and works offline. The demo video shows the deployment architecture and local setup.

### 5. Agent Skills (Agents CLI) — Code
The project was scaffolded using `agents-cli` with an `agents-cli-manifest.yaml` defining the agent directory, deployment target (Cloud Run), session type, and CI/CD configuration. The `agents-cli playground` command enables interactive agent development and testing.

## The Build Journey

### What We Built

We started with the vision of bringing AI-driven agronomic wisdom to farmers in their language, even offline. The build progressed through several phases:

1. **Agent Foundation** — Scaffolding 10 ADK agents with the Coordinator-Specialist pattern, defining agent prompts and routing logic
2. **MCP Integration** — Building 8 MCP servers to standardize data access (weather, market, knowledge, voice)
3. **Safety Kernel** — Implementing ADK callbacks to enforce agricultural safety rules, because prescriptive advice without guardrails is dangerous
4. **PWA Frontend** — Building a voice-first, multilingual farmer dashboard with offline capabilities
5. **Offline AI** — Integrating in-browser Gemma 2B for zero-cost, offline-capable inference
6. **Evaluation** — Building an AI evaluation flywheel with 29 test cases across 10 categories, achieving 4.34/5.0 average score

### Challenges We Overcame

- **Multilingual speech recognition** — Web Speech API language codes needed mapping for each supported language; we built a robust fallback from browser STT to backend STT
- **Offline agent responses** — When OKF cache is empty and no internet is available, we integrated a LocalAiEngine that provides contextual multi-agent skill routing based on the farmer's profile (crop, soil, language)
- **Safety vs. accessibility tradeoff** — Balancing prescriptive advice with safety guardrails — the Safety Kernel blocks dangerous recommendations while still providing organic alternatives
- **Icon generation for voice UI** — Iteratively solved icon visibility issues by converting green transparent icons to white and matching button backgrounds for contrast

### Technologies Used

| Layer | Technology |
|---|---|
| Agent Framework | Google ADK 2.3+ |
| Agent CLI | agents-cli (scaffold, playground, deploy) |
| Tool Protocol | Model Context Protocol (MCP) |
| Backend | FastAPI (Python) |
| Frontend | Vanilla JS PWA, A2UI declarative canvas |
| Local AI | Gemma 2B (WebGPU, in-browser) |
| Cloud AI | Gemini 2.5 Flash (expert escalation) |
| Knowledge | OKF (Open Knowledge Format) + RAG |
| Database | SQLite (server) + IndexedDB (client) |
| Voice | Web Speech API + edge-tts |
| Deployment | Docker, Terraform, Cloud Run |
| CI/CD | GitHub Actions |

## Evaluation Results

- **29 eval cases** across 10 categories (irrigation, pest, soil, market, weather, safety, language, escalation, offline, general)
- **4 metrics**: response quality, safety compliance, language accuracy, tool usage
- **4.34/5.0** average eval score
- **19/19** safety tests pass (banned chemicals blocked, dosage limits enforced, PHI validated)

## Setup Instructions

```bash
# Clone the repository
git clone https://github.com/girinalin/agentic-agri-advisor.git
cd agentic-agri-advisor

# Install dependencies
make setup

# (Optional) Configure API keys for cloud expert mode
cp config/secrets.template.env .env
# Edit .env with your GEMINI_API_KEY

# Start the server
uv run python -m app.fast_api_app

# Open the project
open https://krishi.odisysai.com
```

For ADK interactive development:
```bash
uv run agents-cli playground
```

## Impact Vision

Krishi Sampark demonstrates how multi-agent AI systems can address real-world challenges in agriculture — the most critical domain for human survival. By combining offline-first architecture, voice-first interaction, safety-validated guidance, and multilingual support, we've built a system that can truly reach the last-mile farmer.

The agent-based architecture is extensible — new specialists (e.g., livestock advisor, government schemes navigator) can be added without touching existing agents. The MCP protocol allows swapping data sources as better APIs become available. And the Safety Kernel ensures that as the system grows, prescriptive advice remains grounded in agronomic science.

> **Krishi Sampark** — *Connecting farmers with AI-driven agronomic wisdom, in their language, even offline.*