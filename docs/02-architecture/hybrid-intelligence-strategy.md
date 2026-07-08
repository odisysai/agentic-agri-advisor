# Hybrid Intelligence Strategy

> **Status:** Active
> **Last Updated:** 2026-07-04
> **Owner:** Architecture
> **Related ADR:** [ADR-AAA-004](adr/ADR-AAA-004-edge-cloud-advisor-routing.md)

---

## The Hybrid Intelligence Paradigm

To deliver maximum value under network and cost constraints, the platform divides intelligence between the **Edge** (Farmer's Mobile Device) and the **Cloud** (FastAPI backend server).

```
                                  [ Farmer's Query / Photo ]
                                              │
                                              ▼
                                   { Local Query Triage }
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         [ Simple / Local Intents ]                      [ Complex / Dynamic Intents ]
                      │                                               │
             (Check Connection)                                (Check Connection)
            ┌─────────┴─────────┐                            ┌─────────┴─────────┐
            ▼                   ▼                            ▼                   ▼
        [ Online ]         [ Offline ]                  [ Online ]          [ Offline ]
            │                   │                            │                   │
     (Local Gemma)        (Local Gemma)              (Backend Agents)      (Local Gemma
  Low Latency, $0 Cost     Zero-Data, $0 Cost         RAG, Mandi APIs,     Fallback + Queue)
                                                      Weather Models
```

## Smart Routing Strategy

| Query Type | Classification Criteria | Engine (Online) | Engine (Offline) |
|------------|------------------------|-----------------|-------------------|
| **Simple / Chit-Chat** | Greetings, "Who are you?" | Local Gemma ($0) | Local Gemma |
| **Local Diagnostics** | Photo of leaves, insects | Local Gemma + TFLite | Local Gemma + TFLite |
| **Traditional Remedy** | "Neem spray mix", "Cow manure" | Local Gemma | Local Gemma |
| **Historical Data** | Profile info, current crop stage | Local Gemma (reads IndexedDB) | Local Gemma (reads IndexedDB) |
| **Live Mandi Prices** | "Wheat price in Nagpur" | Backend Market Agent (API) | Local Gemma (reads cache) |
| **Weather Forecast** | "Will it rain next week?" | Backend Weather Agent (API) | Local Gemma (reads cache) |
| **Deep Agronomy** | "Chemical composition of fertilizer X" | Backend RAG Agent | Local Gemma (general knowledge) |

## Edge Layer Capabilities

### Local AI Engines

| Engine | Technology | Size | Purpose |
|--------|-----------|------|---------|
| Gemma 2B | MediaPipe WebGenAI (`@mediapipe/tasks-genai`) | ~1.4GB | Offline conversational reasoning |
| TFLite Classifier | MediaPipe Tasks-Vision | ~15MB | Offline crop disease classification (38 labels) |
| Rule-based fallback | JavaScript dictionary | <100KB | Tier-3 fallback for budget devices |

### IndexedDB Caching

- OKF knowledge cached on first online sync for offline queries
- Market and weather data cached with TTL for offline reference
- Chat history and activities queued for sync when connectivity returns

## Cloud Layer Capabilities

### Multi-Agent Specialist System

- 9 specialist agents with MCP tools for real-time data access
- Weather (Open-Meteo), Market (Yahoo Finance), OKF knowledge graph
- Gemini Vision for complex image analysis
- RAG pipeline for agronomy manual search (documents not yet ingested)

### Safety Kernel

- Pre- and post-agent callback validation
- Banned chemical enforcement (5 chemicals)
- Dosage limits (10 pesticides)
- Pre-harvest interval checks
- Escalation queue for human agronomist review

## Edge Use Cases

### 1. In-Browser Crop Stage Identification

Farmer photographs emerging sprout → TFLite identifies V3 vegetative stage → Gemma explains nutrient and water requirements for that stage → Updates IndexedDB digital twin.

### 2. Voice-First Field Action Logger

Farmer speaks: "I added wood ash to the hillside field and applied 15 liters of water" → Browser STT transcribes → Gemma parses into structured action `{ treatment: "wood_ash", irrigation_liters: 15.0 }` → Saves to IndexedDB queue → Syncs to Firestore through backend APIs when online.

### 3. Offline Quarantine & Alert System

Farmer photographs diseased leaf → TFLite detects 90%+ match for Late Blight → Gemma instructs isolation and pruning → Queues report to backend for neighbor alert when online.

## Related Documents

- [Edge-Cloud Advisor Architecture](edge-cloud-advisor-architecture.md)
- [Local LLM & Device Capabilities](../04-engineering/local-llm-and-device-capabilities.md)
- [PWA Offline Implementation](../04-engineering/pwa-offline-implementation.md)
- [ADR-AAA-004: Edge-Cloud Advisor Routing](adr/ADR-AAA-004-edge-cloud-advisor-routing.md)
