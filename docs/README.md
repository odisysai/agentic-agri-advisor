# Krishi Sampark — Documentation Index

> **Status:** Active
> **Last Updated:** 2026-07-04
> **Owner:** Architecture

This is the single entry point for all Krishi Sampark documentation. Every document in the project is listed here.

---

## 📁 01 — Product

| Document | Purpose |
|----------|---------|
| [Product Vision](01-product/product-vision.md) | Vision statement, value proposition, guiding principles, success criteria |
| [Problem Statement](01-product/problem-statement.md) | Advisory scarcity, connectivity, literacy, generic advice, safety risks |
| [Personas & User Journeys](01-product/personas-and-user-journeys.md) | Madhav (smallholder), Radha (progressive), Kamau (cooperative), journeys |
| [Functional Requirements](01-product/functional-requirements.md) | 12 requirements (REQ-AAA-001 through 012) with acceptance criteria |
| [Non-Functional Requirements](01-product/non-functional-requirements.md) | Performance, reliability, security, safety, localization, usability NFRs |

## 📁 02 — Architecture

| Document | Purpose |
|----------|---------|
| [Architecture Overview](02-architecture/architecture-overview.md) | System architecture diagram, tech stack, folder structure, key decisions |
| [Edge-Cloud Advisor Architecture](02-architecture/edge-cloud-advisor-architecture.md) | Two advisor modes (Sastri vs Visheshagya), routing, escalation, device tiers |
| [Agent Architecture](02-architecture/agent-architecture.md) | Router-Specialist pattern, 10 agents, MCP servers, 4 intelligence layers, safety kernel |
| [Data & Farm Twin Architecture](02-architecture/data-and-farm-twin-architecture.md) | SQLite schema, IndexedDB stores, OKF knowledge graph, RAG pipeline |
| [Hybrid Intelligence Strategy](02-architecture/hybrid-intelligence-strategy.md) | Edge vs cloud routing, smart routing strategy, edge use cases |

### Architecture Decision Records (ADRs)

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-AAA-001](02-architecture/adr/ADR-AAA-001-multilingual-ui-architecture.md) | Multilingual UI Architecture | Accepted |
| [ADR-AAA-002](02-architecture/adr/ADR-AAA-002-offline-first-pwa-indexeddb-sync.md) | Offline-First PWA with IndexedDB Sync | Accepted |
| [ADR-AAA-003](02-architecture/adr/ADR-AAA-003-agent-skills-based-ai-sdlc.md) | Agent-Skills-Based AI-SDLC | Accepted |
| [ADR-AAA-004](02-architecture/adr/ADR-AAA-004-edge-cloud-advisor-routing.md) | Edge-Cloud Advisor Routing | Accepted |
| [ADR-AAA-005](02-architecture/adr/ADR-AAA-005-agricultural-safety-kernel.md) | Agricultural Safety Kernel | Accepted |

## 📁 03 — Design

| Document | Purpose |
|----------|---------|
| [Farmer UX Guidelines](03-design/farmer-ux-guidelines.md) | Persona rules, color system, touch targets, typography, voice UX, offline UX |
| [Navigation & Screen Flow](03-design/navigation-and-screen-flow.md) | 7 nav sections, Mermaid flow diagram, screen descriptions |
| [Localization Guidelines](03-design/localization-guidelines.md) | 5 languages, translation key system, BCP-47 voice codes, common pitfalls |
| [Accessibility Guidelines](03-design/accessibility-guidelines.md) | WCAG 2.1 AA targets, voice-first accessibility, color-blind design, known gaps |

## 📁 04 — Engineering

| Document | Purpose |
|----------|---------|
| [Development Guide](04-engineering/development-guide.md) | Setup, key files, commands, coding standards, environment variables |
| [ADK Implementation Guide](04-engineering/adk-implementation-guide.md) | ADK lifecycle alignment, agent construction, MCP wiring, common gotchas |
| [Local LLM & Device Capabilities](04-engineering/local-llm-and-device-capabilities.md) | 3-tier device classification, Gemma 2B, TFLite classifier, rule-based fallback |
| [PWA Offline Implementation](04-engineering/pwa-offline-implementation.md) | Service worker, IndexedDB (11 stores), OKF sync, offline routing, background sync |
| [Soil Report Workflow](04-engineering/soil-report-workflow.md) | Soil test flow, manual entry form, interpretation logic, API endpoints, DB schema |

## 📁 05 — Testing

| Document | Purpose |
|----------|---------|
| [Test Strategy](05-testing/test-strategy.md) | Test pyramid (unit, integration, eval, adversarial, browser), CI/CD integration |
| [Evaluation & Safety Report](05-testing/evaluation-and-safety-report.md) | Eval flywheel results (4.34/5.0), safety kernel architecture, 19/19 adversarial tests |
| [Browser Testing Guide](05-testing/browser-testing-guide.md) | Test matrix for language, voice, advisor, soil, photo, market, offline + API tests |
| [AI Evaluation Flywheel](05-testing/ai-evaluation-flywheel.md) | Local eval runner, 29 cases × 4 metrics, pipeline, adding new cases |

## 📁 06 — DevSecOps

| Document | Purpose |
|----------|---------|
| [AI-SDLC Operating Model](06-devsecops/ai-sdlc-operating-model.md) | 10 lifecycle agents, 29 skills, 2 workflows, evidence principles, human gates |
| [Agent Skills Operating Model](06-devsecops/agent-skills-operating-model.md) | 29 skill definitions by category, skill structure, execution, limitations |
| [Lifecycle Mapping](06-devsecops/lifecycle-mapping.md) | ADK lifecycle ↔ AI-SDLC agents mapping, evidence flow, Phase 7 gap |
| [Threat Model](06-devsecops/threat-model.md) | STRIDE evaluation, entry points, data storage, mitigations, open risks |
| [Security Controls](06-devsecops/security-controls.md) | 5-layer security, pre-commit hooks, semgrep rules, tool validation, evidence gates |
| [Release Readiness](06-devsecops/release-readiness.md) | Current status (NOT_READY), 9 gates, decision logic, human approval process |

## 📁 07 — Operations

| Document | Purpose |
|----------|---------|
| [Runbook](07-operations/runbook.md) | Server management, database ops, common issues, deployment, rollback |
| [Deployment Setup Guide](07-operations/deployment-setup-guide.md) | **Complete fork-to-deploy guide** — GCP setup, GitHub Actions secrets, Firestore emulator, CI/CD |
| [Deployment Architecture Review](07-operations/deployment-architecture-review.md) | SQLite vs Cloud SQL PostgreSQL vs Firestore — options, recommendation, phased approach |
| [Observability Guide](07-operations/observability-guide.md) | Planned Cloud Trace, prompt-response logging, BigQuery analytics, continuous eval |
| [Known Limitations](07-operations/known-limitations.md) | Models not bundled, RAG empty, deployment pending, security/safety/platform gaps |

## 📁 08 — Roadmap

| Document | Purpose |
|----------|---------|
| [Current Status & Roadmap](08-roadmap/current-status-and-roadmap.md) | ADK lifecycle status, feature completion, what's not done |
| [Future Roadmap](08-roadmap/future-roadmap.md) | Short-term (2 weeks), medium-term (1-2 months), long-term (3-6 months) |
| [Kaggle Capstone Submission Guide](08-roadmap/kaggle-capstone-submission-guide.md) | 10-slide presentation outline, repository structure, demo script |

---

## Root-Level Documents

| Document | Purpose |
|----------|---------|
| [README.md](../README.md) | Project overview, structure, quick start |
| [AGENTS.md](../AGENTS.md) | Coding agent governance rules |
| [GEMINI.md](../GEMINI.md) | ADK development commands and phases |
| [Makefile](../Makefile) | 15+ AI-SDLC targets |
| [walkthrough.md](../walkthrough.md) | AI-SDLC evidence walkthrough |

## Executable Framework

| Directory | Purpose |
|-----------|---------|
| `.ai-sdlc/` | AI-SDLC framework (10 agents, 29 skills, 2 workflows, evidence, reports) |
| `tools/ai_sdlc/` | 13 Python CLI validation scripts |
| `.github/workflows/` | GitHub Actions CI/CD |
| `.semgrep/` | 6 custom security rules |
| `.agents/` | Tool validation and agent hooks |