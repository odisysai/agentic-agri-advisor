# Data & Farm Twin Architecture

> **Status:** Active
> **Last Updated:** 2026-07-04
> **Owner:** Architecture / Data

---

## Farm Digital Twin

The Farm Digital Twin is stored in Firestore. Production uses Firestore Native
mode, and local development uses the Firestore Emulator. The browser keeps an
IndexedDB offline twin and syncs farmer actions back to Firestore when online.

### Schema

```
farmers
├── farmer_id (PK)
├── name
├── language (en/hi/mr/te/sw)
└── created_at

fields
├── field_id (PK)
├── farmer_id (FK)
├── name
├── soil_type (Clay, Sandy Loam, Alluvial, Black Clay, Red Sandy Loam)
├── acres
└── irrigation_type (Drip, Sprinkler, Flood)

plantings
├── planting_id (PK)
├── field_id (FK)
├── crop_type (Corn, Wheat, Cotton, Rice, Soybeans, Sugarcane)
├── variety
├── planting_date
├── stage (germination, vegetative, flowering, yield)
├── nitrogen_ppm
├── moisture_pct
└── health_pct

soil_reports
├── report_id (PK)
├── field_id (FK)
├── sample_date
├── lab_name
├── soil_type_reported
└── created_at

soil_test_values
├── report_id (FK)
├── ph
├── ec
├── organic_carbon
├── nitrogen
├── phosphorus
├── potassium
├── sulfur
├── zinc
├── boron
└── iron
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/profile/{farmer_id}` | GET | Get farmer profile with fields and plantings |
| `/api/telemetry/{planting_id}` | POST | Update planting telemetry (moisture, nitrogen, health) |
| `/api/soil/save` | POST | Save soil test report + values |
| `/api/soil/latest/{field_id}` | GET | Get latest soil report for a field |
| `/api/soil/reports/{field_id}` | GET | Get all soil reports for a field |
| `/api/okf/sync` | GET | Get all OKF entities for IndexedDB caching |

### Manager Functions

File: `data/db_manager.py`

| Function | Purpose |
|----------|---------|
| `init_soil_tables()` | No-op compatibility hook; Firestore creates collections on demand |
| `get_profile_data(farmer_id)` | Get farmer + fields + plantings as nested dict |
| `save_farmer_field(farmer_id, ...)` | Create or update a field |
| `update_planting_telemetry(planting_id, ...)` | Update moisture, nitrogen, health |
| `save_soil_report(field_id, ...)` | Save soil test report + values |
| `save_content_item(...)` | Save Cloud Storage metadata for uploaded farmer content |
| `get_soil_reports(field_id)` | Get all soil reports for a field |
| `get_latest_soil_report(field_id)` | Get most recent soil report |

## IndexedDB (Client-Side)

The PWA uses IndexedDB with 11 object stores for offline operation:

| Store | Purpose | Sync Direction |
|-------|---------|----------------|
| `farmer_profile` | Cached farmer profile | Server → Client |
| `chat_history` | Offline chat messages | Bidirectional |
| `telemetry_queue` | Pending telemetry updates | Client → Server |
| `okf_knowledge` | OKF entity cache | Server → Client |
| `farm_activities` | Logged farm activities | Bidirectional |
| `reminders` | Irrigation/treatment reminders | Client → Server |
| `escalations` | Pending expert escalations | Bidirectional |
| `feedback` | User feedback | Client → Server |
| `soil_reports` | Cached soil reports | Bidirectional |
| `market_cache` | Cached market prices | Server → Client |
| `weather_cache` | Cached weather data | Server → Client |

## User Content Storage

Farmer-owned files are stored in a private Cloud Storage bucket configured by
`USER_CONTENT_BUCKET_NAME`. Objects use one canonical per-user prefix:

```text
users/{farmer_id}/{category}/{YYYY}/{MM}/{uuid}_{filename}
```

Supported categories are `soil_reports`, `crop_photos`, `expert_uploads`,
`reports`, and `profile_documents`. Firestore stores the object metadata
(`storage_bucket`, `storage_object`, `storage_uri`, content type, and size)
with the related farmer record, such as a soil report. Crop photo capture,
image analysis, and expert photo attachments upload through the `crop_photos`
category when online. Local development can run without a bucket; upload APIs
return `storage.status = "not_configured"` while preserving the rest of the
farmer workflow.

## OKF Knowledge Graph

The Open Knowledge Graph (OKF) is a curated static knowledge base stored as markdown files.

### Entity Types

| Type | Count | Location | Status |
|------|-------|----------|--------|
| Safety rules | 3 | `okf-knowledge-graph/data/safety/` | ✅ Created |
| Diseases | 5 | `okf-knowledge-graph/data/diseases/` | ✅ Created |
| Pests | 4 | `okf-knowledge-graph/data/pests/` | ✅ Created |
| Soil types | 3 | `okf-knowledge-graph/data/soil/` | ✅ Created |
| Crops | 7 | `okf/crops/` | ✅ Created |
| Practices | 1 | `okf/practices/` | ✅ Created |
| Irrigation rules | 3 | `okf/irrigation/rules/` | ✅ Created |
| Relations | 1 | `okf-knowledge-graph/relations.yaml` | ✅ Created |

Total: **22 entities** with cross-references between crops → diseases → pests → treatments.

## RAG Pipeline

The RAG pipeline is structurally ready but has **no documents ingested**.

| Component | Status | Notes |
|-----------|--------|-------|
| `rag_pipeline/config.yaml` | ✅ Exists | Chunking & model settings configured |
| `rag_pipeline/documents/raw/` | ⚠️ 4 stub docs | Need real agronomy manuals |
| `rag_pipeline/embeddings/` | ❌ Empty | No embeddings generated |
| `rag_pipeline/retriever/` | ✅ Exists | Retrieval script ready |
| MCP server `rag/` | ✅ Exists | Search interface ready |

## Related Documents

- [Architecture Overview](architecture-overview.md)
- [Agent Architecture](agent-architecture.md)
- [ADR-AAA-002: Offline-First PWA](adr/ADR-AAA-002-offline-first-pwa-indexeddb-sync.md)
