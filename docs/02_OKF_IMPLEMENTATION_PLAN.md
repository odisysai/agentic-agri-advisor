# OKF (Open Knowledge Graph) Implementation Plan

> Date: 2026-07-02
> Status: Strategy aligned, foundation entities created, wiring in progress

---

## 1. Strategy Recap (Agreed)

| Layer | Type | Example | Source |
|-------|------|---------|--------|
| **OKF** | Static, curated reference | "Wheat rust: symptoms, treatment, dosage limits" | OKF knowledge graph |
| **Dynamic** | Real-time, fresh data | "Wheat price today: ₹2,200/quintal" | MCP servers (APIs) |
| **RAG** | Document search | "Follow integrated pest management guidelines..." | Vector index over manuals |
| **Edge** | Offline models | TFLite pest ID, Gemma explanations | Local models + IndexedDB |

### OKF Entity Types Created

| Type | File Count | Status |
|------|-----------|--------|
| **Safety Rules** | 3 | ✅ Created |
| **Diseases** | 5 | ✅ Created |
| **Pests** | 4 | ✅ Created |
| **Soil Types** | 3 | ✅ Created |
| **Relations** | 1 | ⚠️ In Progress |

---

## 2. Implementation Phases

### Phase 1: Foundation (DONE ✅)
- ✅ Safety rules (pesticide limits, PHI, organic standards)
- ✅ Disease profiles (wheat rust, wheat mildew, rice blast, rice blight, cotton grey mold)
- ✅ Pest profiles (corn borer, cotton bollworm, rice stem borer, wheat leaf eater)
- ✅ Soil types (clay, sandy loam, alluvial)

### Phase 2: Relations & Cross-References ✅ COMPLETE
- ✅ Created `relations.yaml` with entity cross-references
- ✅ Added cross-references between crops → diseases → pests → treatments
- ✅ Defined soil → crop suitability mappings
- ✅ Added treatment safety constraints

### Phase 3: Knowledge Retriever Integration
- Wire OKF lookup into `agents/knowledge_retriever/tools.py`
- Add `query_knowledge_graph()` that searches OKF markdown files
- Add `get_safety_rules()` for dosage limit checks
- Add `get_soil_recommendations()` for soil-specific advice

### Phase 4: Agent Instruction Updates
- Update coordinator agent to use knowledge retriever
- Update specialist agents with OKF-aware instructions
- Add safety escalation triggers

### Phase 5: RAG Pipeline (Future)
- Collect agronomy manuals
- Generate embeddings
- Set up vector index
- Wire RAG retrieval tool

---

## 3. Current File Structure

```
okf-knowledge-graph/data/
├── safety/
│   ├── pesticide_limits.md          ✅ Created
│   ├── pre_harvest_intervals.md     ✅ Created
│   └── organic_standards.md         ✅ Created
├── diseases/
│   ├── wheat_rust.md                ✅ Created
│   ├── wheat_powdery_mildew.md      ✅ Created
│   ├── rice_blast.md                ✅ Created
│   ├── rice_bacterial_leaf_blight.md ✅ Created
│   └── cotton_grey_mold.md          ✅ Created
├── pests/
│   ├── corn_stalk_borer.md          ✅ Created
│   ├── cotton_bollworm.md           ✅ Created
│   ├── rice_stem_borer.md           ✅ Created
│   └── wheat_leaf_eater.md          ✅ Created
├── soil/
│   ├── clay_soil.md                 ✅ Created
│   ├── sandy_loam_soil.md           ✅ Created
│   └── alluvial_soil.md             ✅ Created
└── relations.yaml                   ⚠️ TODO
```

---

## 4. Next Actions

### Immediate (Next 30 min)
1. Create `relations.yaml` with entity cross-references
2. Update `agents/knowledge_retriever/tools.py` with OKF query functions
3. Test knowledge retriever against OKF data

### Short-term (Next 2 hours)
4. Update coordinator agent instructions to use knowledge retriever
5. Add safety escalation logic to pesticide-related queries
6. Create test cases for knowledge retrieval

### Medium-term (Next day)
7. Add more disease/pest profiles for priority crops
8. Add soil amendment recommendations
9. Wire up RAG pipeline for document search
10. Update agent instructions with OKF-aware guidance

---

## 5. OKF Entity Format (Standard)

```markdown
---
id: disease_or_pest_name
type: Disease | Pest | SoilType | SafetyRule
name: Display Name (Regional Name)
scientific_name: Latin name (for diseases/pests)
family: Family classification (for diseases/pests)
severity: Low | Moderate | High
affected_crops: [crop1, crop2]
season: kharif | rabi | summer
regions: [north_india, maharashtra, ...]
---

# Title

## Overview
Brief description

## Symptoms / Identification
How to identify

## Treatment
| Stage | Treatment | Application |
|-------|-----------|-------------|
| ...   | ...       | ...         |

## Risk Factors
- ...

## Related Entities
- crop: wheat
-防治: carbendazim, mancozeb
- 防治_severity: moderate
```

---

**Next Step:** Create relations.yaml and wire knowledge retriever to OKF.
