# Local LLM & Device Capabilities

> **Status:** Active
> **Last Updated:** 2026-07-04
> **Owner:** Engineering

---

## Device Capability Detection

**File:** `ui/agui/device_capabilities.js`

The system detects device capabilities at startup and classifies into 3 tiers:

| Tier | Detection | Classification | Capability |
|------|-----------|---------------|------------|
| Tier 1 | WebGPU + ≥4GB RAM | High-end | Full local models (Gemma-4-2B + TFLite) |
| Tier 2 | WebGL + ≥2GB RAM | Mid-range | TFLite classifier + rule-based fallback |
| Tier 3 | No GPU or <2GB RAM | Budget | Rule-based responses only |

### Detection APIs

```javascript
// WebGPU detection
const hasWebGPU = !!navigator.gpu;

// WebGL detection
const canvas = document.createElement('canvas');
const hasWebGL = !!canvas.getContext('webgl2') || !!canvas.getContext('webgl');

// Camera detection
const hasCamera = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

// Voice detection
const hasVoice = !!window.speechRecognition || !!window.webkitSpeechRecognition;

// RAM estimation (approximate)
const ram = navigator.deviceMemory || 2; // GB, not precise
```

## Local LLM: Gemma-4-2B

**File:** `ui/agui/local_models.js`

### Architecture

- **Engine:** MediaPipe WebGenAI (`@mediapipe/tasks-genai`)
- **Model:** Gemma-4-2B INT4 (quantized for browser)
- **Acceleration:** WebGPU (preferred) or WebGL (fallback)
- **Size:** ~1.4GB (one-time download)
- **Cache:** Browser Cache API (`gemma-model-cache`)

### Current Status

| Component | Status |
|-----------|--------|
| `loadLlm()` | ⚠️ Stub — tries to fetch from `/models/gemma-4-2b-it-gpu-int4.bin` (not bundled) |
| `generateText()` | ⚠️ Stub — uses hardcoded `offlineDatabase` responses instead of real model |
| Model binary | ❌ Not bundled |
| WebGPU detection | ✅ Working |
| Model download UI | ⚠️ Fake progress bar |

### Production Requirements

1. Host Gemma-4-2B INT4 model on CDN or Google Cloud Storage
2. Implement real `@mediapipe/tasks-genai` Web LLM API integration
3. Add one-time download prompt with storage warning (~1.4GB)
4. Graceful fallback for devices without WebGPU
5. Keep rule-based engine as tier-3 fallback

## TFLite Crop Disease Classifier

**File:** `ui/agui/crop_classifier.js`

### Architecture

- **Engine:** MediaPipe Tasks-Vision ImageClassifier
- **Model:** PlantVillage-trained TFLite model (38 disease labels)
- **Size:** ~15MB
- **Fallback:** Color heuristic (for devices without WebGPU/WebGL)

### Current Status

| Component | Status |
|-----------|--------|
| `loadClassifier()` | ✅ Working — loads TFLite model if available, falls back gracefully |
| `classifyImage()` | ✅ Working — runs TFLite inference, falls back to color heuristic |
| Model file | ❌ Not bundled (falls back to color heuristic automatically) |
| 38 disease labels | ✅ Defined in `crop_classifier.js` |
| Color heuristic | ✅ Working fallback (green=healthy, yellow=N deficiency, brown=fungal) |

### Disease Labels (38)

```
Apple: scab, black_rot, cedar_rust, healthy
Corn: cercospora_leaf_spot, common_rust, northern_leaf_blight, healthy
Grape: black_rot, esca, leaf_blight, healthy
Potato: early_blight, late_blight, healthy
Tomato: bacterial_spot, early_blight, late_blight, leaf_mold, septoria_leaf_spot,
        spider_mites, target_spot, yellow_leaf_curl_virus, mosaic_virus, healthy
... (38 total)
```

## Rule-Based Fallback Engine

The `offlineDatabase` in `local_models.js` provides hardcoded agronomic responses for offline queries. This is the **tier-3 fallback** for budget devices.

| Query Pattern | Response |
|---------------|----------|
| "गेहूँ के लिए पानी" | "Gehu ke liye pratham 30 din mein 2-3 baar sinchai karein." |
| "भुट्टे की खाद" | "Makke ke liye 50 kg urea pratham 30 din mein dein." |
| "कपास की कीट" | "Kapas mein bollworm ke liye neem oil spray karein." |

## Related Documents

- [PWA Offline Implementation](pwa-offline-implementation.md)
- [Edge-Cloud Advisor Architecture](../02-architecture/edge-cloud-advisor-architecture.md)
- [Hybrid Intelligence Strategy](../02-architecture/hybrid-intelligence-strategy.md)
- [ADR-AAA-004: Edge-Cloud Advisor Routing](../02-architecture/adr/ADR-AAA-004-edge-cloud-advisor-routing.md)
