# Browser Testing Guide

> **Status:** Active
> **Last Updated:** 2026-07-07
> **Owner:** Engineering / QA

---

## Setup

### Install Browser Test Dependencies

Browser automation must run from the project virtual environment so it uses the
same dependencies as the app and test suite.

```bash
env UV_CACHE_DIR=.uv-cache uv add --dev playwright pytest-playwright
.venv/bin/python -m playwright install chromium
```

Verify the install:

```bash
.venv/bin/python - <<'PY'
import playwright
print(playwright.__file__)
PY
```

### Start Local Services

1. Start Firestore Emulator:

```bash
make firestore-start
```

2. Start the app:

```bash
make serve
```

The app should be available at:

```text
http://localhost:8000/app/home
```

Health probes:

```bash
curl -s -o /dev/null -w 'APP_HTTP=%{http_code}\n' http://127.0.0.1:8000/agui/local_models.js
curl -s -o /dev/null -w 'FIRESTORE_EMULATOR_HTTP=%{http_code}\n' http://127.0.0.1:8081
```

### Run Automated Browser Tests

Use `.venv` explicitly:

```bash
.venv/bin/python -m pytest test_real_browser.py -v
```

For focused regression tests:

```bash
.venv/bin/python -m pytest tests/unit/test_local_sastri_language.py -v
```

Legacy manual setup, only if you are not using `make serve`:
```bash
uv run uvicorn app.fast_api_app:app --port 8000 &
uv run python -m app.agent &
```

Open the app in VS Code integrated browser or Chrome:
```
http://localhost:8000/app/home
```

Use cache-busting URL parameter when testing updates:
```
http://localhost:8000/app/home?cb={timestamp}
```

## Advisor Mapping Acceptance Checks

These checks protect the core edge/cloud objective:

| Check | Expected |
|------|----------|
| Krishi Sastri local identity | Browser-served `local_models.js` reports `advisor: "Krishi Sastri"` and `model: "Gemma-4-2B"` |
| Sastri Hindi response | Hindi language mode must not leak English words such as `Pathologist`, `Coordinator`, `Running`, or markdown markers |
| Sastri simple query | Simple local query stays in Sastri chat and does not call `/api/expert/chat` |
| Complex query | Disease, pest, pesticide, chemical, low-confidence, or unknown diagnosis prompts farmer for expert delegation |
| Krishi Bisesagya cloud identity | Expert UI labels cloud route as Krishi Bisesagya |
| Gemini model | Backend expert route uses `EXPERT_MODEL_NAME`, default `gemini-2.5-flash` |

## Test Matrix

### Language & Navigation

| Test | Steps | Expected | Status |
|------|-------|----------|--------|
| Language switch | Change dropdown to English | All UI text in English instantly | ✅ |
| Hindi nav labels | Set language to Hindi | नेवि labels: होम, मेरा खेत, मिट्टी जांच, पूछें | ✅ |
| Telugu script purity | Set to Telugu, check all text | Zero Devanagari characters | ✅ |
| nav_soil translation | Click 🧪 in nav | Shows "मिट्टी जांच" not "nav_soil" | ✅ |
| Cache invalidation | Update JS, reload with ?cb=N | New JS loaded (not cached) | ✅ |

### Voice

| Test | Steps | Expected | Status |
|------|-------|----------|--------|
| STT Hindi | Tap 🎙️, speak Hindi | Transcription appears in chat input | ✅ |
| TTS auto-read | Send query, wait for response | Response read aloud in Hindi | ✅ |
| TTS language | Switch to Swahili, send query | TTS reads in Swahili (Rafiki voice) | ✅ |
| Mic state | After response, check mic | Mic shows inactive (not always-on) | ✅ |
| TTS scope | Response in chat panel | Only reads chat panel content, not other panes | ✅ |

### Advisor Flow

| Test | Steps | Expected | Status |
|------|-------|----------|--------|
| Sastri card | Nav → पूछें → tap Sastri | Chat opens with Sastri persona | ✅ |
| Visheshagya card | Tap Visheshagya | Chat opens with expert mode | ✅ |
| Escalation prompt | Ask complex question in Sastri | Shows "कृषि विशेषज्ञ से सलाह लें?" | ✅ |
| Expert form | Click हाँ on escalation | Expert form opens (crop, symptom, photo) | ✅ |

### Soil Test

| Test | Steps | Expected | Status |
|------|-------|----------|--------|
| Nav to soil | Click 🧪 मिट्टी जांच | 3 options: upload, camera, manual | ✅ |
| Manual entry | Click ✏️ मान खुद भरें | Form with field dropdown + 13 fields | ✅ |
| Field dropdown | Click field selector | Shows "North Hillside (Corn)" and "Riverbed Meadow (Wheat)" | ✅ |
| Save without field | Fill values, click save without selecting field | Toast: "⚠️ खेत चुनें" | ✅ |
| Save with field | Select field, fill values, save | Toast: "✅ सेव हो गया" + summary screen | ✅ |
| Summary interpretations | View summary | Color-coded: 🟢/🟡/🔴 for each parameter | ✅ |
| Expandable details | Click "विस्तृत जानकारी" | Shows pH, N, P, K, OC values | ✅ |

### Photo Diagnosis

| Test | Steps | Expected | Status |
|------|-------|----------|--------|
| Camera capture | Nav → फोटो जांच → capture | Image captured from rear camera | ✅ |
| File upload | Use file upload fallback | Image loaded | ✅ |
| Classification | Submit photo | Disease label + confidence returned | ✅ (color heuristic fallback) |
| Expert delegation | Click "विशेषज्ञ को भेजें" | Routes to expert mode | ✅ |

### Market Prices

| Test | Steps | Expected | Status |
|------|-------|----------|--------|
| Price table | Nav → मंडी भाव | Table with 6 crops and prices | ✅ |
| Currency format | Check prices | Shows ₹ for India, KSh for Kenya | ✅ |

### Offline

| Test | Steps | Expected | Status |
|------|-------|----------|--------|
| Airplane mode | Enable, reload app | App loads from cache | ✅ |
| Offline query | Ask "गेहूँ के लिए पानी" | Rule-based response from OKF cache | ✅ |
| Activity queue | Log activity offline | Queued in IndexedDB | ✅ |
| Sync on reconnect | Disable airplane mode | Queue syncs to server | ✅ |

## API Testing

```bash
# Profile
curl -s http://localhost:8000/api/profile/user | python3 -m json.tool

# Weather
curl -s "http://localhost:8000/api/weather?lat=21.15&lon=79.09" | python3 -m json.tool

# Market
curl -s http://localhost:8000/api/market/price/corn | python3 -m json.tool

# Soil save
curl -s -X POST http://localhost:8000/api/soil/save \
  -H "Content-Type: application/json" \
  -d '{"field_id":"field_1","values":{"ph":7.2,"nitrogen":280,"potassium":140}}' | python3 -m json.tool

# Soil latest
curl -s http://localhost:8000/api/soil/latest/field_1 | python3 -m json.tool

# Safety validate
curl -s -X POST http://localhost:8000/api/safety/validate \
  -H "Content-Type: application/json" \
  -d '{"chemical":"imidacloprid","dosage":"10ml/L","crop":"cotton"}' | python3 -m json.tool
```

## Related Documents

- [Test Strategy](test-strategy.md)
- [Development Guide](../04-engineering/development-guide.md)
