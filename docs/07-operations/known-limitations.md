# Known Limitations

> **Status:** Active
> **Last Updated:** 2026-07-04
> **Owner:** Architecture / Engineering

---

## Implementation Gaps

### Models Not Bundled

| Model | Size | Status | Impact |
|-------|------|--------|--------|
| Gemma 2B INT4 | ~1.4GB | ❌ Not bundled | `loadLlm()` is a stub with fake progress bar; rule-based fallback used instead |
| TFLite Plant Disease | ~15MB | ❌ Not bundled | Color heuristic fallback used instead of real classification |

### RAG Pipeline Empty

| Component | Status |
|-----------|--------|
| `rag_pipeline/documents/raw/` | ⚠️ 4 stub documents only |
| `rag_pipeline/embeddings/` | ❌ No embeddings generated |
| MCP server `rag/` | ✅ Ready but has nothing to search |

### Deployment Not Started

| Component | Status |
|-----------|--------|
| Cloud Run deployment | ❌ Not started |
| CI/CD pipeline | ⚠️ GitHub Actions exists for AI-SDLC gates, no deployment pipeline |
| Terraform | ❌ Empty `deployment/terraform/` |
| Observability | ❌ Not started (see [Observability Guide](observability-guide.md)) |

### Evidence Stale

All evidence in `.ai-sdlc/evidence/` was generated on July 2 against commit `361502a`. Significant work has been done since then (safety kernel, eval flywheel, security hardening, soil test, UI redesign). Evidence needs regeneration via `make ai-sdlc-check`.

## Security Limitations

| Limitation | Risk Level | Mitigation |
|------------|-----------|------------|
| No farmer authentication | HIGH | `user_id` passed from frontend without session |
| No rate limiting on API/SSE | MEDIUM | DoS risk on agent endpoint |
| Escalation queue needs production hardening | MEDIUM | Persisted through backend data APIs; add SLA alerts and queue ownership before launch |
| EXIF metadata not stripped from photos | MEDIUM | Privacy risk from uploaded images |
| Evidence not cryptographically signed | LOW | Hashed + commit-linked but not signed |
| No audit trail for safety kernel decisions | MEDIUM | No logging of block/escalation decisions |

## Safety Limitations

| Limitation | Risk Level | Mitigation |
|------------|-----------|------------|
| Only 10 pesticides in registry | MEDIUM | Need comprehensive pesticide database for production |
| Safety data is static markdown | LOW | Requires manual updates when regulations change |
| "Per liter" dosage format needed regex fix | LOW | Fixed, but other formats may need similar handling |
| Organic standards not enforced programmatically | LOW | Only documented, not validated in code |

## Platform Limitations

| Limitation | Impact |
|------------|--------|
| iOS Safari: No background sync | IndexedDB sync queue won't auto-flush on iOS |
| iOS Safari: Limited IndexedDB | Storage quota lower than Android Chrome |
| iOS Safari: No push notifications | Can't send crop alerts to iOS users |
| Budget devices (2GB RAM, no WebGPU) | Can't run Gemma 2B; rule-based fallback only |
| No conflict resolution for sync | Last-write-wins; potential data loss on concurrent edits |

## AI-SDLC Framework Limitations

| Limitation | Impact |
|------------|--------|
| Declarative agents are specifications, not enforcement | Agents describe responsibilities but don't auto-execute |
| Not all skills have CLI implementations | `post-release-review`, `api-contract-validation` lack CLI tools |
| External scanners must be installed | gitleaks, pip-audit, bandit, trivy — NOT_EXECUTED if missing |
| No Observability Agent (Phase 7 gap) | ✅ Resolved | `observability_agent.yaml` created in `.ai-sdlc/agents/` |
| 3 ADRs were missing (now created) | Traceability matrix had gaps; ADRs now in `docs/02-architecture/adr/` |

## Functional Limitations

| Feature | Status | Impact |
|---------|--------|--------|
| Soil test OCR extraction | ❌ Not implemented | Manual entry required; PDF upload shows form but doesn't extract |
| WhatsApp voice-note integration | ❌ Planned | Future roadmap item |
| IoT soil moisture sensor telemetry | ❌ Planned | Future roadmap item |
| Real mandi prices (data.gov.in) | ❌ API key needed | Currently using Yahoo Finance futures, not local mandi prices |
| Conflict resolution for offline sync | ❌ Not implemented | Last-write-wins, potential data loss |

## Related Documents

- [Runbook](runbook.md)
- [Observability Guide](observability-guide.md)
- [Future Roadmap](../08-roadmap/future-roadmap.md)
- [Threat Model](../06-devsecops/threat-model.md)
