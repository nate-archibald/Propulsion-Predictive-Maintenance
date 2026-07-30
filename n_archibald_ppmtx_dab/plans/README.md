# QX Predictive Maintenance — Project Plan

> **Planning Mode:** Data Product Acceleration (default)
> **Planning Source:** `gold_design` — Gold layer YAML schemas (13 tables)
> **Implementation Readiness:** `gold_design_only` — deploy after Gold provisioning
> **Generated:** 2026-06-24

---

## Plan Index

| Document | Purpose | Status |
|----------|---------|--------|
| [prerequisites.md](prerequisites.md) | Data layer summary | ✅ Complete |
| [use-case-catalog.md](use-case-catalog.md) | Consolidated use case definitions | ✅ Complete |
| [phase1-use-cases.md](phase1-use-cases.md) | Phase 1 master — analytics artifacts | ✅ Complete |
| [phase1-addendum-1.1-ml-models.md](phase1-addendum-1.1-ml-models.md) | ML Models | ✅ Complete |
| [phase1-addendum-1.2-tvfs.md](phase1-addendum-1.2-tvfs.md) | Table-Valued Functions | ✅ Complete |
| [phase1-addendum-1.3-metric-views.md](phase1-addendum-1.3-metric-views.md) | Metric Views | ✅ Complete |
| [phase1-addendum-1.4-lakehouse-monitoring.md](phase1-addendum-1.4-lakehouse-monitoring.md) | Lakehouse Monitoring | ✅ Complete |
| [phase1-addendum-1.5-aibi-dashboards.md](phase1-addendum-1.5-aibi-dashboards.md) | AI/BI Dashboards | ✅ Complete |
| [phase1-addendum-1.6-genie-spaces.md](phase1-addendum-1.6-genie-spaces.md) | Genie Spaces | ✅ Complete |
| [phase1-addendum-1.7-alerting.md](phase1-addendum-1.7-alerting.md) | Alerting Framework | ✅ Complete |
| [phase2-agent-framework.md](phase2-agent-framework.md) | Phase 2 — AI Agents | ✅ Complete |
| [phase3-frontend-app.md](phase3-frontend-app.md) | Phase 3 — Frontend App | ✅ Complete |

## Manifests

| Manifest | Consumed By | Artifacts |
|----------|-------------|-----------|
| [semantic-layer-manifest.yaml](manifests/semantic-layer-manifest.yaml) | `semantic-layer/00-*` | 4 Metric Views, 11 TVFs, 2 Genie Spaces |
| [observability-manifest.yaml](manifests/observability-manifest.yaml) | `monitoring/00-*` | 13 Monitors, 5 Dashboards, 7 Alerts |
| [ml-manifest.yaml](manifests/ml-manifest.yaml) | `ml/00-*` | 2 Feature Tables, 2 Models |
| [genai-agents-manifest.yaml](manifests/genai-agents-manifest.yaml) | `genai-agents/00-*` | 1 Orchestrator + 4 Domain Agents |
| [gold-dependency-manifest.yaml](manifests/gold-dependency-manifest.yaml) | Self-validation + downstream | 13 tables, all columns |

## Agent Domains

| Domain | Icon | Focus Area | Gold Tables | Est. Questions |
|--------|------|------------|-------------|----------------|
| Component Lifecycle & Reliability | ⚙️ | MTBUR, time-on-wing, removal trending | fact_component_removal, dim_aircraft, dim_station | 7 |
| Defect Intelligence | ⚠️ | Defect trending, ATA hotspots, operational impact | fact_defect, bridge_defect_part, dim_ata_chapter | 8 |
| Inventory & Spares | 📦 | Spare positioning, LLP red-line, stock-out risk | fact_inventory_snapshot, fact_inventory_transaction, fact_inventory_control | 7 |
| Procurement & Overhaul | 🛠️ | Order tracking, shop findings, repair costs | fact_order, fact_teardown | 6 |

**Shared dimensions:** `dim_part` (Part Master), `dim_date` (Common) — used across all domains.

## Deployment Order

```
Phase 1.2 TVFs ─────────┐
Phase 1.3 Metric Views ──┤
Phase 1.1 ML Models ─────┤──→ Phase 1.6 Genie Spaces ──→ Phase 2 Agents ──→ Phase 3 Frontend
Phase 1.4 Monitors ──────┤
Phase 1.5 Dashboards ────┤
Phase 1.7 Alerts ────────┘
```

## Total Artifact Count

| Artifact Type | Count |
|---------------|-------|
| TVFs | 11 |
| Metric Views | 4 |
| Genie Spaces | 2 |
| Lakehouse Monitors | 13 |
| Dashboards | 5 |
| Alerts | 7 |
| ML Models | 2 |
| Feature Tables | 2 |
| AI Agents | 5 (1 orchestrator + 4 domain) |
| **Total** | **49** |
