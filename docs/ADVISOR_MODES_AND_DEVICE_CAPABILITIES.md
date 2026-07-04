# Advisor Mode & Device Capability Architecture

> Date: 2026-07-03
> Status: Implemented

---

## 1. Two Advisor Modes — User Choice

The farmer selects which service they need. The choice is explicit, not automatic.

```
┌─────────────────────────────────────────────────────────────┐
│                    ADVISOR MODE SELECTOR                     │
├───────────────────────────┬─────────────────────────────────┤
│    👨‍🌾 कृषि शास्त्री        │      🔬 कृषि विशेषज्ञ           │
│   Agriculture Advisor     │   Agriculture Expert            │
├───────────────────────────┼─────────────────────────────────┤
│ ✓ Free — No API cost      │ ⚠ Internet Required             │
│ ✓ Offline Ready           │ ⚠ API Cost per query            │
│ ✓ OKF Knowledge Cache     │ ✓ Deep agronomic analysis       │
│ ✓ Voice + Camera          │ ✓ Real-time weather/market      │
│ ✓ Rule-based responses    │ ✓ Multi-agent specialist system │
│ ✓ TFLite crop diagnosis   │ ✓ Gemini 3.5 Flash LLM          │
├───────────────────────────┼─────────────────────────────────┤
│ USE FOR:                  │ USE FOR:                        │
│ • Greetings, simple Qs    │ • Complex disease diagnosis     │
│ • "What is wheat rust?"   │ • "Analyze my soil NPK report"  │
│ • "How much water for     │ • "Will frost hit my soybeans?" │
│   corn?"                  │ • "Cotton price trend + advice" │
│ • Photo diagnosis (TFLite)│ • Cross-regional outbreak data  │
│ • Activity logging        │ • Expert escalation             │
└───────────────────────────┴─────────────────────────────────┘
```

### Routing Logic

```
User sends query
       │
       ▼
┌──────────────────┐
│  Advisor Mode?   │
└──────┬───────────┘
       │
       ├── 'advisor' (कृषि शास्त्री) ──────────────────┐
       │     │                                         │
       │     ├── Online? ──→ Cloud Agent (Gemini)      │
       │     │                  (free, uses OKF tools)  │
       │     │                                         │
       │     └── Offline? ──→ Local Knowledge           │
       │                       (OKF cache + rule-based) │
       │                                                 │
       └── 'expert' (कृषि विशेषज्ञ) ─────────────────┐
             │                                         │
             ├── Online? ──→ Cloud Agent Network        │
             │                  (specialist sub-agents, │
             │                   real-time APIs,        │
             │                   deep analysis)         │
             │                                         │
             └── Offline? ──→ Fallback to Advisor mode  │
                              + warning toast            │
```

---

## 2. Device Capability Detection

The PWA detects the farmer's device capabilities on first load and determines which features can be enabled.

### Three-Tier Strategy

```
┌──────────────────────────────────────────────────────────────────┐
│  TIER 1: Full AI (High-end phones, 4GB+ RAM, WebGPU)             │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ • Gemma 2B LLM (1.4GB) — offline natural language reasoning │  │
│  │ • TFLite Crop Classifier (15MB) — offline photo diagnosis   │  │
│  │ • OKF Knowledge Cache (200KB) — all crop/disease/pest data  │  │
│  │ • Voice STT + TTS — browser native                          │  │
│  │ • Push Notifications — weather/pest alerts                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│  Target: Flagship Android, iPhone, Tablets                       │
├──────────────────────────────────────────────────────────────────┤
│  TIER 2: Vision AI (Mid-range phones, 2-3GB RAM, WebGL)          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ • TFLite Crop Classifier (15MB) — offline photo diagnosis   │  │
│  │ • OKF Knowledge Cache (200KB) — all crop/disease/pest data  │  │
│  │ • Voice STT + TTS — browser native                          │  │
│  │ • NO Gemma 2B (no WebGPU)                                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│  Target: Most Android phones (Redmi, Realme, Samsung A-series)   │
├──────────────────────────────────────────────────────────────────┤
│  TIER 3: Knowledge AI (Budget phones, 1-2GB RAM, no GPU)         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ • OKF Knowledge Cache (200KB) — keyword search offline      │  │
│  │ • Voice STT + TTS — browser native (if language pack)       │  │
│  │ • Color heuristic crop diagnosis (no ML model)              │  │
│  │ • Rule-based responses from cached knowledge                │  │
│  └────────────────────────────────────────────────────────────┘  │
│  Target: Old Android, feature phones with browser                │
└──────────────────────────────────────────────────────────────────┘
```

### Detection Checks

| Feature | Detection Method | Enables |
|---------|-----------------|---------|
| WebGPU | `navigator.gpu` + adapter request | Gemma 2B LLM |
| WebGL | `canvas.getContext('webgl')` | TFLite classifier |
| Camera | `navigator.mediaDevices.getUserMedia` | Photo capture |
| Speech Recognition | `webkitSpeechRecognition` in window | Voice input (STT) |
| Speech Synthesis | `window.speechSynthesis` | Voice output (TTS) |
| Service Worker | `'serviceWorker' in navigator` | Offline caching |
| Push Manager | `'PushManager' in window` | Push notifications |
| Background Sync | `'SyncManager' in window` | Auto-sync offline data |
| IndexedDB | `window.indexedDB` | Local knowledge cache |
| Cache API | `'caches' in window` | Model file caching |
| Device Memory | `navigator.deviceMemory` | Tier classification |
| Connection | `navigator.connection.effectiveType` | Data-saving mode |

### Feature Gating

```
Device detected → Tier determined → Features enabled/disabled:

if (tier === 1) {
  enable(GEMMA_2B);
  enable(TFLITE_CLASSIFIER);
  enable(OKF_CACHE);
  enable(VOICE);
  enable(PUSH);
}

if (tier === 2) {
  disable(GEMMA_2B);  // No WebGPU
  enable(TFLITE_CLASSIFIER);
  enable(OKF_CACHE);
  enable(VOICE);
  enable(PUSH);
}

if (tier === 3) {
  disable(GEMMA_2B);
  disable(TFLITE_CLASSIFIER);  // No WebGL
  enable(OKF_CACHE);
  enable(VOICE);
  disable(PUSH);  // May not support
}
```

---

## 3. On-Field Use Case Scenarios

### Scenario 1: Photo Diagnosis (Fully Offline, Tier 2+)

```
Farmer standing in field, no internet
       │
       ▼
  📷 Takes photo of diseased wheat leaf
       │
       ▼
  TFLite classifier runs locally (2 seconds)
       │
       ├── Confidence > 70%? ──→ "Wheat Rust detected (92%)"
       │                              │
       │                              ▼
       │                        Query OKF cache → treatment, dosage, PHI
       │                              │
       │                              ▼
       │                        Display + 🔊 Speak in farmer's language
       │
       └── Confidence < 70%? ──→ "I can't identify this clearly"
                                      │
                                      ▼
                                Queue for expert escalation (when online)
                                      │
                                      ▼
                                "Please consult a local agronomist"
```

### Scenario 2: Voice Question (Offline with OKF, Tier 3)

```
Farmer speaks: "गेहूँ में रतुआ का इलाज क्या है?"
       │
       ▼
  Web Speech API transcribes (offline, if language pack)
       │
       ▼
  Keyword search in OKF cache (IndexedDB)
       │
       ├── Found? ──→ Return treatment from wheat_rust.md
       │                  │
       │                  ▼
       │              Display + 🔊 Speak in Hindi
       │
       └── Not found? ──→ "I don't have this offline. 
                            When online, I can ask the expert."
```

### Scenario 3: Expert Consultation (Online, Expert Mode)

```
Farmer selects "कृषि विशेषज्ञ" mode
       │
       ▼
  ⚠ Warning: "Internet + API cost required"
       │
       ▼
  Farmer asks: "मेरी मिट्टी का NPK रिपोर्ट देखें — गेहूँ के लिए क्या करें?"
       │
       ▼
  Cloud agent (Gemini 3.5 Flash) processes
       │
       ├── crop_analyst_agent → OKF query for wheat NPK targets
       ├── weather_advisor_agent → Open-Meteo API for forecast
       ├── knowledge_retriever_agent → OKF soil recommendations
       │
       ▼
  Comprehensive response with:
  • NPK gap analysis
  • Fertilizer schedule
  • Weather-based timing
  • Safety kernel check
  • Expert escalation if needed
```

---

## 4. Cost Model

| Service | Mode | Cost | Who Pays |
|---------|------|------|----------|
| OKF Knowledge Search | Advisor (offline) | ₹0 | Free |
| TFLite Crop Diagnosis | Advisor (offline) | ₹0 | Free |
| Voice STT/TTS | Both | ₹0 | Browser native |
| Cloud Agent (simple) | Advisor (online) | ~₹0.05/query | Platform |
| Cloud Agent (complex) | Expert (online) | ~₹0.15/query | Platform/Farmer |
| Expert Escalation | Expert (online) | Human time | Platform |

The farmer sees clear messaging:
- **कृषि शास्त्री**: "✓ Free • Offline Ready"
- **कृषि विशेषज्ञ**: "⚠ Internet Required • API Cost"