# PWA Offline AI Stack — Implementation Plan

> Date: 2026-07-03
> Status: Planning → Implementation

---

## Current State Assessment

| Component | Status | Gap |
|-----------|--------|-----|
| **Service Worker** (`ui/sw.js`) | ✅ Working | Cache-first for static, network-first for API |
| **Web Manifest** (`ui/manifest.webmanifest`) | ✅ Working | Installable PWA with icons, standalone mode |
| **IndexedDB** (`ui/agui/local_db.js`) | ✅ Working | 11 object stores — profile, chats, telemetry, OKF, activities, plans, reminders, escalations, feedback |
| **Camera** (`ui/agui/camera.js`) | ✅ Working | `getUserMedia` with rear camera, canvas capture |
| **Voice** (`ui/agui/voice.js`) | ✅ Working | Web Speech API STT + SpeechSynthesis TTS |
| **Offline routing** (`ui/agui/dashboard.js`) | ✅ Working | Simple/complex keyword triage, online/offline detection |
| **Local LLM** (`ui/agui/local_models.js`) | ⚠️ Stub | `loadLlm()` tries to fetch from `/models/gemma-2b-it-gpu-int4.bin` (doesn't exist), falls back to fake progress bar. `generateText()` uses hardcoded `offlineDatabase` object instead of real model |
| **TFLite Classifier** (`ui/agui/local_models.js`) | ⚠️ Stub | `loadClassifier()` returns `true` immediately. `classifyImage()` returns hardcoded "Maize Stalk Borer" result |
| **`ui/models/` directory** | ❌ Missing | No model files bundled |

## Implementation Priorities

### Priority 1: TFLite Crop Disease Classifier (Offline Image Diagnosis)

This is the highest-impact offline feature — a farmer can take a photo of a diseased leaf and get a diagnosis without internet.

**Approach:** Use MediaPipe Tasks Vision API with a PlantVillage-trained TFLite model.

**Steps:**
1. Create `ui/models/` directory
2. Download a pre-trained plant disease TFLite model (~15MB) from the PlantVillage dataset
3. Rewrite `loadClassifier()` to use `@mediappe/tasks-vision` ImageClassifier API
4. Rewrite `classifyImage()` to run real inference and return actual disease labels + confidence
5. Add model download progress UI for first-time offline setup
6. Cache the model in the browser Cache API for offline use

**Model candidates:**
- Google's PlantVillage TFLite model (97% accuracy on 38 crop diseases)
- Or train a custom model on PlantVillage + India-specific crops

### Priority 2: Real Gemma 2B Loader

The current `loadLlm()` is a stub with a fake progress bar. For production, we need:

1. Host the Gemma 2B INT4 model binary on a CDN or Google Cloud Storage bucket
2. Rewrite `loadLlm()` to use `@mediapipe/tasks-genai` Web LLM API
3. Rewrite `generateText()` to run actual Gemma inference instead of hardcoded responses
4. Add WebGPU capability detection and graceful fallback for devices without WebGPU
5. Add a one-time download prompt (model is ~1.4GB) with clear storage warning

**Critical consideration:** Budget Android phones (2GB RAM, no WebGPU) cannot run Gemma 2B. The fallback rule-based engine (current `offlineDatabase`) must remain as a tier-3 fallback.

### Priority 3: OKF Knowledge Sync to IndexedDB

The `local_db.js` has an `okf_knowledge` store but it's not populated. For offline OKF queries:

1. Add a `/api/okf/sync` endpoint that returns all OKF entities as JSON
2. On first launch (online), fetch and cache all OKF data to IndexedDB
3. Add periodic sync (when online) to update cached OKF
4. Update `local_models.js` `generateText()` to query IndexedDB OKF instead of hardcoded `offlineDatabase`

### Priority 4: Offline Sync Conflict Resolution

The IndexedDB has `pending_telemetry` and `pending_activities` queues but no conflict resolution:

1. Add timestamp-based merge strategy (last-write-wins for telemetry)
2. Add activity deduplication (same activity_type + timestamp = skip)
3. Add sync status indicators in the UI
4. Add retry logic for failed syncs