# Phase 3: Frontend Application — QX Predictive Maintenance

> **Planning Mode:** Data Product Acceleration (default)
> **Planning Source:** `gold_design` | **Readiness:** `gold_design_only`
> **Generated:** 2026-06-24
> **Back to:** [README.md](README.md)

---

## Overview

The frontend application is implemented as a Databricks AppKit app at `apps_lakebase/nathan-a-qx-predictive/`. It provides:

1. **Structured search** — Parts, Defects, Engine Genealogy, Spares (preserving legacy dashboard muscle memory)
2. **Natural-language query** — Genie chat pane integrated on every page
3. **Persona dashboards** — Role-specific views for Nate, Corey, Erika, Bill, Will
4. **Agent chat** — Conversational AI interface backed by Phase 2 agents

## AppKit Plugins

| Plugin | Purpose |
|--------|---------|
| Lakebase | Persistent storage for user preferences, saved searches, chat history |
| Analytics | Embedded dashboard widgets from AI/BI dashboards |
| Serving | Agent endpoint wiring for conversational AI |

## Pages

| Page | Primary Persona(s) | Data Source |
|------|-------------------|-------------|
| Home / Engine Component Snapshot | All | component_lifecycle_analytics_metrics |
| Parts Search | Nate, Erika | get_component_removal_history, get_spare_availability_by_station |
| Defects Search | Nate, Corey | defect_intelligence_analytics_metrics, get_defect_part_linkage |
| Engine Genealogy | Erika | fact_inventory_snapshot, fact_component_removal |
| Spares & Inventory | Bill, Corey | inventory_spares_analytics_metrics, get_llp_redline_status |
| Genie Chat Pane | All | Genie Spaces (both) |
| Agent Chat | All | Phase 2 Agent endpoint |

## Dependencies

```
Phase 1 (All artifacts) ──→ Phase 2 (Agents) ──→ Phase 3 (Frontend)
```

The frontend consumes:
- Genie Spaces for NL query
- Agent endpoint for conversational AI
- AI/BI Dashboards for embedded analytics
- Gold tables (via Metric Views and TVFs) for structured search
