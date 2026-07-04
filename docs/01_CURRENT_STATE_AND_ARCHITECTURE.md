# Krishi Sampark — Current State & Architecture Alignment

> Date: 2026-07-02
> Status: App reviewed, architecture aligned, ready for OKF curation

---

## 1. Application Under Review

The **Krishi Sampark** dashboard is fully operational at `http://localhost:8000/agui/index.html`.

### UI Layout (Verified Working)

| Pane | Content | Status |
|------|---------|--------|
| **Farmer Mode (Left)** | Profile, Digital Twin fields, Health gauges, Today's Plan, Crop telemetry, Community feed | ✅ |
| **Expert Console (Right)** | Agent control, Traces, Sessions, Telemetry | ✅ |
| **Multi-language** | EN, HI, MR, TE, SW | ✅ |
| **Themes** | Light / Dark | ✅ |
| **Camera** | Photo capture for pest/disease | ✅ (UI only) |
| **Voice** | Web Speech API (STT) + Edge TTS | ✅ |

### Architecture Summary

```
Farmer's Query
       │
       ▼
┌─────────────────────────────┐
│       EDGE LAYER (PWA)       │
│  ┌─────────────────────┐    │
│  │ Local Gemma 2B      │    │  Offline reasoning
│  │ (WebGPU / fallback) │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ TFLite Classifier   │    │  Offline pest/disease
│  │ (Camera → diagnosis)│    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ IndexedDB Sync Queue │    │  Offline caching
│  └─────────────────────┘    │
└─────────────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│     CLOUD LAYER (FastAPI)    │
│  ┌─────────────────────┐    │
│  │ Krishi Sastri Agent │    │  Coordinator
│  │ (10 specialist sub) │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ MCP Servers (8)     │    │  Real-time tools
│  │ ─ weather           │    │
│  │ ─ market            │    │
│  │ ─ okf               │    │
│  │ ─ rag               │    │
│  │ ─ image_analysis    │    │
│  │ ─ tts / stt         │    │
│  │ ─ translation       │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ OKF Knowledge Graph │    │  Static curated knowledge
│  │ ─ crops             │    │
│  │ ─ soil              │    │
│  │ ─ diseases          │    │
│  │ ─ pests             │    │
│  │ ─ practices         │    │
│  │ ─ regulations       │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ RAG Pipeline        │    │  Document search
│  │ ─ embeddings        │    │
│  │ ─ retriever         │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

---

## 2. Architecture Decisions (Agreed)

### Knowledge分层 (Layering)

| Layer | Type | Example | Source |
|-------|------|---------|--------|
| **OKF** | Static, curated reference | "Wheat needs 100-150 kg N/ha" | OKF knowledge graph |
| **Dynamic** | Real-time, fresh data | "Wheat price today: ₹2,200/quintal" | MCP servers (APIs) |
| **RAG** | Document search | "Follow integrated pest management guidelines..." | Vector index over manuals |
| **Edge** | Offline models | TFLite pest ID, Gemma explanations | Local models + IndexedDB |

### What Goes Where

**OKF (Static Knowledge — Do NOT change at runtime):**
- Crop facts (species, varieties, growing seasons, NPK targets)
- Soil types and properties (clay, loam, sandy — water capacity, pH)
- Disease profiles (symptoms, identification, treatment guidelines)
- Pest identification and control methods
- Standard agricultural practices (irrigation, fertilization schedules)
- Regulations (pesticide limits, organic standards, safety guidelines)
- Crop-disease-pest relations (what affects what)

**Dynamic (Real-Time Data — Updated at query time):**
- Weather forecasts (Open-Meteo API, hourly/daily)
- Market prices (Yahoo Finance / Mandi data)
- Soil moisture telemetry (sensor data)
- Community alerts (user-submitted observations)

**RAG (Document Retrieval — Index is static, queries are dynamic):**
- Agronomy manuals (state agriculture department)
- Research papers
- Government crop advisory circulars
- Regional farming practices

**Edge PWA (Offline-First Capabilities):**
- TFLite image classifier → pest/disease identification
- Local Gemma 2B → explanation in farmer's language
- IndexedDB → offline conversation + telemetry caching
- Sync queue → auto-sync when online

---

## 3. What's Currently Working (Verified)

| Component | File | Status |
|-----------|------|--------|
| Coordinator Agent | `agents/coordinator/agent.py` | ✅ Works |
| 9 Specialist Agents | `agents/*/agent.py` | ✅ Works |
| FastAPI Backend | `app/fast_api_app.py` | ✅ Works |
| AGUI Dashboard | `ui/agui/index.html` | ✅ Works |
| A2UI Rendering | `ui/a2ui/app.js` | ✅ Works |
| Multi-language | `ui/agui/translations.js` (5 languages) | ✅ Works |
| Local DB Sync | `ui/agui/local_db.js` | ✅ Works |
| Voice Interface | `ui/agui/voice.js` | ✅ Works |
| Offline Banner | `ui/agui/dashboard.js` | ✅ Works |
| Battery Monitor | `ui/agui/dashboard.js` | ✅ Works |
| Health Gauges | `ui/agui/dashboard.js` | ✅ Works (mock data) |
| Today's Plan | `ui/agui/dashboard.js` | ✅ Works |
| Market Insights | `ui/agui/` (UI only, mock prices) | ⚠️ Needs real API |
| Weather Forecasts | `agents/weather_advisor/tools.py` | ⚠️ Placeholder tools |
| OKF Query | `agents/knowledge_retriever/tools.py` | ⚠️ Limited lookup |
| RAG Retrieval | `mcp_servers/rag/server.py` | ⚠️ Needs index |
| Image Analysis | `mcp_servers/image_analysis/` | ❌ Not started |
| TTS Server | `mcp_servers/tts/` | ❌ Not started |
| STT Server | `mcp_servers/stt/` | ❌ Not started |
| Translation Server | `mcp_servers/translation/` | ❌ Not started |

---

## 4. OKF Curation — Next Steps

### Scope Defined

**Primary Crops (Start with, extend later):**
| Crop | Region | Status |
|------|--------|--------|
| Wheat (गेहूँ) | North India, Maharashtra | 🔴 TODO |
| Rice (चावल/অত়ল) | Eastern India, Tamil Nadu | 🔴 TODO |
| Corn (मकका/కర్రలు) | Maharashtra, Karnataka | 🔴 TODO |
| Soybean (सोयाबीन) | Central India (MP, Maharashtra) | 🔴 TODO |
| Cotton (कपास) | Maharashtra, Gujarat | 🔴 TODO |
| Sugarcane (गन्ना) | Maharashtra, UP | 🔴 TODO |

**For Each Crop, OKF Should Contain:**
```
okf-knowledge-graph/data/
└── crops/
    ├── wheat.md          # Metadata + NPK targets, growing season, optimal conditions
    ├── rice.md
    ├── corn.md
    ├── soybean.md
    ├── cotton.md
    └── sugarcane.md
```

**For Each Disease/Pest:**
```
okf-knowledge-graph/data/
├── diseases/
│   ├── wheat_rust.md     # Symptoms, identification, treatment
│   ├── rice_blight.md
│   └── ...
└── pests/
    ├── corn_borer.md       # Life cycle, damage signs, control methods
    ├── cotton_bollworm.md
    └── ...
```

**For Soil:**
```
okf-knowledge-graph/data/
└── soil/
    ├── clay.md             # Properties, water capacity, pH range
    ├── sandy_loam.md
    ├── black_cotton_soil.md
    └── alluvial.md
```

### DO NOT Put in OKF (Dynamic):
- ❌ Current weather (use Open-Meteo API)
- ❌ Live market prices (use Yahoo Finance / Mandi API)
- ❌ Real-time soil moisture (use sensor data)
- ❌ Community alerts (use runtime database)
- ❌ Individual farmer telemetry (use SQLite Farm Twin)

### RAG (Separate from OKF):
- ❌ Don't duplicate OKF in RAG
- ✅ Use RAG for: full agronomy manuals, research papers, government circulars
- ✅ OKF provides quick reference lookups; RAG provides deep document search

---

## 5. Definition of OKF Entity Format

Each OKF entity should follow this structure:

```markdown
---
id: wheat_rust
type: Disease
name: Wheat Rust (गेहूँ की रस्ट)
scientific_name: Puccinia graminis
family: Pucciniaceae
---

# Wheat Rust

## Overview
Wheat rust is a fungal disease affecting wheat crops worldwide. It manifests as
reddish-brown pustules on leaves and stems.

## Symptoms
- Small reddish-brown pustules on leaf surface
- Yellowing (chlorosis) around infected areas
- Reduced grain filling
- Premature plant death in severe cases

## Identification
- Visual inspection of leaves
- Confirm with expert review if uncertain
- Moisture + moderate temperature favors outbreak

## Treatment
- Apply copper-based fungicide at first sign of infection
- Remove and destroy severely infected plants
- Use resistant varieties where available
- Ensure adequate air circulation between rows

## Risk Factors
- High humidity (>80%)
- Moderate temperatures (15-25°C)
- Dense planting
- Overhead irrigation

## Safety Notes
- Follow pesticide label instructions
- Wear protective gear during application
- Wait recommended pre-harvest interval before harvest

## Related Entities
- crop: wheat
- region: north_india, maharashtra
- season: rabi
-防治: fungicide, resistant_varieties
```

---

## 6. Priorities for OKF Curation

### Phase 1: Core Crop Knowledge (Highest Priority)
1. Wheat — full crop profile (season, NPK, diseases, pests, practices)
2. Rice — full crop profile
3. Cotton — full crop profile
4. Corn — full crop profile

### Phase 2: Soil Knowledge
1. Black Cotton Soil (Maharashtra) — properties, NPK, water
2. Alluvial Soil — properties, NPK, water
3. Sandy Loam — properties, NPK, water
4. Clay Soil — properties, NPK, water

### Phase 3: Disease & Pest Profiles
1. Top 10 crop diseases with treatment guidelines
2. Top 10 crop pests with control methods
3. Safety kernel (dosage limits, pre-harvest intervals)

### Phase 4: Practices & Regulations
1. Standard irrigation schedules per crop
2. Fertilization schedules (NPK timing and dosage)
3. Pesticide safety regulations (India + Africa)
4. Organic farming guidelines

---

## 7. Open Questions

| Question | Status |
|----------|--------|
| Which crops to prioritize first? | Wheat, Rice, Cotton, Corn (as above) |
| OKF entity format — Markdown with YAML frontmatter? | ✅ Agreed |
| RAG separate from OKF? | ✅ Agreed |
| Dynamic data sources — which APIs? | Weather: Open-Meteo ✅, Market: TBD |
| TFLite model — which pest/disease dataset? | TBD |
| Language priority for documentation | Hindi, Marathi, English first |

---

**Next Action:** Begin OKF curation — start with Wheat crop profile, then expand to other crops, soil types, diseases, and pests.
