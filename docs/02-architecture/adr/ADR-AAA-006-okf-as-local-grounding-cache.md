# ADR-AAA-006: OKF as Local Grounding Cache

> **Status:** Accepted  
> **Date:** 2026-07-07  
> **Owner:** Architecture

## Context

Krishi Sampark's farmer objective is simple: Krishi Sastri should answer instantly on device, using Gemma-4-2B when available, and escalate complex or uncertain cases to Krishi Bisesagya in the cloud. The previous implementation risked making OKF behave like a second chatbot, which made responses feel fixed and sometimes irrelevant when the selected crop differed from the farmer's question.

## Decision

OKF remains in the system, but only as a compact local grounding and fallback cache. It must not become the primary response engine for farmer chat.

Krishi Sastri response flow:

1. Detect language, crop, and intent from the farmer query.
2. Load compact local crop facts from IndexedDB when available.
3. Generate the Sastri response through the local model path.
4. Use deterministic local fallback only when real Gemma inference is unavailable.
5. Apply safety and escalation rules for risky, uncertain, or complex cases.

## Consequences

- Farmer chat remains centered on Sastri/Gemma, not raw OKF snippets.
- OKF stays useful for offline grounding, safety facts, tests, and deterministic fallback.
- The local cache should stay small and operational: crop names, symptoms, safe first steps, moisture/NPK ranges, and escalation triggers.
- Real Gemma runtime integration remains the main missing capability for the intended product experience.

## Non-Goals

- Do not build a large agricultural ontology before the core Sastri experience works.
- Do not hand-author every answer as OKF JSON.
- Do not let OKF bypass the Agricultural Safety Kernel.
