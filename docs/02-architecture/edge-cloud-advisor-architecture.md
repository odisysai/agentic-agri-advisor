# Edge-Cloud Advisor Architecture

> **Status:** Active
> **Last Updated:** 2026-07-04
> **Owner:** Architecture
> **Related ADR:** [ADR-AAA-004](adr/ADR-AAA-004-edge-cloud-advisor-routing.md)

---

## Two Advisor Modes

The farmer explicitly selects which advisor they need. The choice is not automatic.

### Krishi Sastri (कृषि शास्त्री) — Agriculture Advisor

| Attribute | Value |
|-----------|-------|
| Cost | Free — no API cost |
| Connectivity | Offline-capable |
| Knowledge source | Local Gemma path, grounded by compact crop facts in IndexedDB; deterministic fallback when model runtime is unavailable |
| Capabilities | Voice + camera, TFLite crop diagnosis, activity logging |
| Best for | Greetings, simple questions, photo diagnosis, traditional remedies, activity logging |

### Krishi Visheshagya (कृषि विशेषज्ञ) — Agriculture Expert

| Attribute | Value |
|-----------|-------|
| Cost | API cost per query |
| Connectivity | Internet required |
| Knowledge source | Multi-agent specialist system (9 agents), real-time APIs, RAG |
| Capabilities | Deep agronomic analysis, real-time weather/market, cross-regional data |
| Best for | Complex disease diagnosis, soil NPK analysis, frost/rain forecasting, price trends, expert escalation |

## Routing Logic

```
User sends query
       │
       ▼
┌──────────────────┐
│  Advisor Mode?    │
└──────┬───────────┘
       │
       ├── 'advisor' (कृषि शास्त्री) ──────────────────┐
       │     │                                         │
       │     ├── Gemma available? ──→ Local Gemma       │
       │     │                  + compact crop facts    │
       │     │                                         │
       │     └── No runtime? ──→ Deterministic local    │
       │                       fallback + crop facts    │
       │                                                 │
       └── 'expert' (कृषि विशेषज्ञ) ─────────────────┐
             │                                         │
             ├── Online? ──→ Cloud Agent Network        │
             │                  (specialist sub-agents, │
             │                   real-time APIs,        │
             │                   deep analysis)         │
             │                                         │
             └── Offline? ──→ Show "Internet Required"  │
                              + queue for when online    │
```

## Escalation Flow

When Krishi Sastri encounters a low-confidence diagnosis:

```
Krishi Sastri: "मुझे इसकी पक्की जानकारी नहीं है।"
     │
     ▼
Escalation prompt: "कृषि विशेषज्ञ से सलाह लें?"
     │
     ├── Farmer clicks "हाँ" (Yes) →
     │     Expert form: crop, symptom, photo, urgency
     │     → Routes to full cloud multi-agent system
     │     → Weather + Crop + Pest agents collaborate
     │     → Safety kernel verifies all recommendations
     │
     └── Farmer clicks "नहीं" (No) →
           Short local fallback advice grounded by cached crop facts
```

## Device Capability Tiers

The system detects device capabilities at startup and routes accordingly:

| Tier | Detection | Classification | Routing |
|------|-----------|---------------|---------|
| Tier 1 | WebGPU + ≥4GB RAM | High-end | Full local models (Gemma 2B + TFLite) grounded by compact crop facts |
| Tier 2 | WebGL + ≥2GB RAM | Mid-range | TFLite classifier + deterministic Sastri fallback grounded by crop facts |
| Tier 3 | No GPU or <2GB RAM | Budget | Rule-based responses only, cloud for everything else |

## Related Documents

- [Architecture Overview](architecture-overview.md)
- [Hybrid Intelligence Strategy](hybrid-intelligence-strategy.md)
- [Local LLM & Device Capabilities](../04-engineering/local-llm-and-device-capabilities.md)
- [ADR-AAA-004: Edge-Cloud Advisor Routing](adr/ADR-AAA-004-edge-cloud-advisor-routing.md)
