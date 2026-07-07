# Architecture Overview

> **Status:** Active
> **Last Updated:** 2026-07-06
> **Owner:** Architecture

---

## System Architecture

![Krishi Sampark System Architecture](../assets/krishi_system_architecture_infographic.png)

Krishi Sampark uses a router-specialist multi-agent pattern aligned with Google ADK concepts, with a decoupled edge-cloud architecture designed for limited-connectivity farming environments. The system combines a mobile PWA, local/offline-friendly data stores, cloud-hosted agent coordination, MCP-style tools, curated agriculture knowledge, and safety-aware response validation.

```
┌─────────────────────────────────────────────────────────────┐
│                    EDGE LAYER (PWA)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Local AI    │  │ TFLite       │  │ IndexedDB        │  │
│  │ (WebGPU,    │  │ Classifier   │  │ (11 stores)      │  │
│  │ experimental)│  │              │  │                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Service Worker│  │ Voice STT/TTS│  │ Camera (getUserMedia)│
│  │ (Cache API)  │  │ (Web Speech)  │  │                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ (online/offline routing)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   CLOUD LAYER (FastAPI)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Krishi Sastri (Coordinator Agent)           │   │
│  │  ┌─────────┬─────────┬─────────┬─────────┬──────────┐ │   │
│  │  │Crop     │Weather  │Market   │Pest     │Irrigation│ │   │
│  │  │Analyst  │Advisor  │Advisor  │Detector │Advisor   │ │   │
│  │  └─────────┴─────────┴─────────┴─────────┴──────────┘ │   │
│  │  ┌─────────┬─────────┬─────────┬─────────┐             │   │
│  │  │Knowledge│Simul-   │Dashboard│Farmer   │             │   │
│  │  │Retriever│ation    │Agent    │Interact.│             │   │
│  │  └─────────┴─────────┴─────────┴─────────┘             │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              MCP Servers (8)                          │   │
│  │  weather │ market │ okf │ rag │ image_analysis        │   │
│  │  tts     │ stt    │ translation                       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  OKF Knowledge Graph │ RAG Pipeline │ Safety Kernel   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  SQLite Farm Twin (farm_twin.db)                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Key Architectural Decisions

| Decision | ADR | Rationale |
|----------|-----|-----------|
| Multilingual UI with translation keys | [ADR-AAA-001](adr/ADR-AAA-001-multilingual-ui-architecture.md) | 5 languages, instant switching, script purity |
| Offline-first PWA with IndexedDB | [ADR-AAA-002](adr/ADR-AAA-002-offline-first-pwa-indexeddb-sync.md) | Rural connectivity is intermittent |
| Agent-skills-based AI-SDLC | [ADR-AAA-003](adr/ADR-AAA-003-agent-skills-based-ai-sdlc.md) | 10 lifecycle agents, 29 skills, evidence-driven |
| Edge-cloud advisor routing | [ADR-AAA-004](adr/ADR-AAA-004-edge-cloud-advisor-routing.md) | Simple queries local, complex queries cloud |
| Agricultural Safety Kernel | [ADR-AAA-005](adr/ADR-AAA-005-agricultural-safety-kernel.md) | Banned chemicals, dosage limits, PHI |
| Two-pane layout (content + chat) | — | Chat always visible; agent-triggered schemas render in content pane without replacing chat |
| Same-origin ADK endpoints | — | FastAPI serves both ADK `/run_sse` and static UI on port 8000; no separate port needed |

## Technology Stack

| Layer | Technology | Version/Config |
|-------|-----------|----------------|
| Agent Framework | Google ADK | `google-adk>=2.0.0` |
| LLM | Gemini 3.5 Flash | Retry options, temperature-tuned per agent |
| Backend | FastAPI | Port 8000, SSE streaming, serves ADK + static UI |
| Frontend | Vanilla JS PWA | Two-pane layout (content + chat), Service worker v5 |
| Database | SQLite / Firestore | SQLite (local), Firestore emulator (local dev), Firestore (GCP) |
| MCP Servers | Python | 8 servers (weather, market, okf, rag, image_analysis, tts, stt, translation) |
| Voice | Web Speech API + edge-tts | Browser-native STT, backend neural TTS (edge-tts) |
| Local Models | MediaPipe WebGenAI + TFLite | Gemma 2B (WebGPU), PlantVillage classifier (38 labels) |

## Folder Structure

```
agentic-agri-advisor/
├── agents/                  # Python ADK agents (coordinator + 9 specialists)
├── app/                     # FastAPI server & endpoints
├── ui/agui/                 # PWA frontend (dashboard, voice, camera, translations)
├── ui/a2ui/                 # A2UI declarative UI rendering engine
├── mcp_servers/             # 8 MCP servers
├── okf-knowledge-graph/     # OKF knowledge graph data & schema
├── rag_pipeline/            # RAG document search pipeline
├── safety_kernel/           # Agricultural Safety Kernel
├── simulation/              # Farm simulation sandbox
├── data/                    # SQLite database manager
├── tests/                   # Unit, integration, eval tests
├── .ai-sdlc/                # AI-SDLC framework (agents, skills, workflows, evidence)
├── tools/ai_sdlc/           # AI-SDLC validation CLI scripts
└── docs/                    # This documentation
```

## Related Documents

- [Edge-Cloud Advisor Architecture](edge-cloud-advisor-architecture.md)
- [Agent Architecture](agent-architecture.md)
- [Data & Farm Twin Architecture](data-and-farm-twin-architecture.md)
- [Hybrid Intelligence Strategy](hybrid-intelligence-strategy.md)