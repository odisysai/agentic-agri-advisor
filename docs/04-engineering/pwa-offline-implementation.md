# PWA Offline Implementation

> **Status:** Active
> **Last Updated:** 2026-07-04
> **Owner:** Engineering
> **Related ADR:** [ADR-AAA-002](../02-architecture/adr/ADR-AAA-002-offline-first-pwa-indexeddb-sync.md)

---

## Current State

| Component | Status | Notes |
|-----------|--------|-------|
| Service Worker (`ui/sw.js`) | ✅ v3 | Cache-first for static, network-first for API |
| Web Manifest (`ui/manifest.webmanifest`) | ✅ Working | Installable, standalone, brand icons |
| IndexedDB (`ui/agui/local_db.js`) | ✅ Working | 11 object stores |
| Camera (`ui/agui/camera.js`) | ✅ Working | `getUserMedia`, rear camera, file fallback |
| Voice (`ui/agui/voice.js`) | ✅ v6 | Web Speech API STT + backend TTS |
| Offline routing (`ui/agui/dashboard.js`) | ✅ v15 | Online→cloud, offline→OKF cache |
| PWA Config (`ui/agui/pwa_config.js`) | ✅ Working | Backend URLs, install prompt, background sync |
| Device detection (`ui/agui/device_capabilities.js`) | ✅ Working | 3-tier classification |

## Service Worker Strategy

**File:** `ui/sw.js`

### Cache Strategies

| Asset Type | Strategy | Rationale |
|------------|----------|-----------|
| Static assets (HTML, CSS, JS, fonts) | **Cache-first** | Instant load from cache, update in background |
| API endpoints (`/api/profile/*`) | **Network-first** | Fresh data when online, cached when offline |
| API fallback | **Offline mock** | Returns mock JSON to prevent UI crashes |

### Versioning

Service worker version is tracked in `sw.js`. Cache-busting via `?v=N` query parameters on script tags:
```html
<script src="translations.js?v=6"></script>
<script src="dashboard.js?v=15"></script>
<script src="voice.js?v=6"></script>
```

**Important:** Bump version numbers when updating files to force browser cache invalidation.

## IndexedDB Schema

**File:** `ui/agui/local_db.js`

### Stores (11)

```javascript
const DB_STORES = [
  'farmer_profile',    // Cached farmer profile
  'chat_history',      // Offline chat messages
  'telemetry_queue',   // Pending telemetry updates
  'okf_knowledge',     // OKF entity cache
  'farm_activities',   // Logged activities
  'reminders',         // Irrigation/treatment reminders
  'escalations',       // Expert escalation queue
  'feedback',          // User feedback
  'soil_reports',      // Soil test reports
  'market_cache',      // Market price cache
  'weather_cache',     // Weather data cache
];
```

### Sync Pattern

```
[Online] → Fetch data → Store in IndexedDB → Display
[Offline] → Read from IndexedDB → Display → Queue changes
[Reconnect] → Read queue → POST to server → Clear queue → Sync fresh data
```

## Local Crop Facts Sync

The `/api/okf/sync` endpoint returns curated crop, disease, pest, soil, and safety entities as JSON for offline caching:

```bash
curl localhost:8000/api/okf/sync
# Returns: { crops: [...], diseases: [...], pests: [...], soil: [...], safety: [...] }
```

On first online launch, the PWA fetches and caches these facts to IndexedDB. Krishi Sastri uses them as grounding/fallback context, not as a separate answer engine.

## Offline Routing Logic

**File:** `ui/agui/dashboard.js` (v15)

```javascript
function handleSend(message) {
  // Sastri mode always stays local.
  // Local crop facts ground Gemma when available, or the deterministic fallback.
  routeToLocalSastri(message);
}
```

## Background Sync

**File:** `ui/agui/pwa_config.js`

- Registers background sync for telemetry queue
- When connectivity returns, sync queue is flushed automatically
- Note: Background Sync is disabled in some browsers (shows console warning, non-blocking)

## Known Limitations

- iOS Safari: Limited PWA support (no background sync, limited IndexedDB)
- Gemma 2B model not bundled (deterministic local facts fallback is used)
- TFLite model not bundled (color heuristic fallback works)
- No conflict resolution for sync collisions (last-write-wins)

## Related Documents

- [ADR-AAA-002: Offline-First PWA](../02-architecture/adr/ADR-AAA-002-offline-first-pwa-indexeddb-sync.md)
- [Local LLM & Device Capabilities](local-llm-and-device-capabilities.md)
- [Data & Farm Twin Architecture](../02-architecture/data-and-farm-twin-architecture.md)
