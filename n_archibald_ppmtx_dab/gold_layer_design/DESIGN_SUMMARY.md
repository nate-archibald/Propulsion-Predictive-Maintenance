# Design Summary — QX Predictive Maintenance Gold Layer

> **Project:** QX Predictive Maintenance — Propulsion Parts & Defects Intelligence
> **Date:** 2026-06-19
> **Status:** Design Complete — Pending Stakeholder Review

---

## Overview

| Attribute | Value |
|---|---|
| **Catalog** | `subject_maintenanceengineering` |
| **Schema** | `an_maintenanceengineering_ods` |
| **Table Prefix** | `qx_ppmtx_gold_` |
| **Total Gold Tables** | 13 |
| **Dimensions** | 5 (Part, Aircraft, Station, ATA Chapter, Date) |
| **Facts** | 7 (Component Removal, Defect, Inventory Transaction, Inventory Snapshot, Inventory Control, Order, Teardown) |
| **Bridges** | 1 (Defect↔Part) |
| **Domains** | 6 (Part Master, Component Lifecycle, Defect Management, Inventory & Spares, Procurement & Overhaul, Common) |
| **Source Silver Tables Used** | 9 of 14 (64%) |
| **Source Tables Excluded** | 5 (all DQ monitoring/quarantine) |

---

## Design Decisions

### Dimensional Modeling Approach

- **Star schema** — all facts reference dimensions via surrogate keys (BIGINT)
- **SCD Type 1** for all dimensions — no historical tracking needed in MVP (parts don't change identity; aircraft/stations are static)
- **Date dimension** uses YYYYMMDD integer keys for efficient joins
- **Bridge table** for defect↔part (M:M relationship)

### Naming Convention

- All tables prefixed with `qx_ppmtx_gold_` per shared workspace requirements
- Dimensions: `qx_ppmtx_gold_dim_{entity}`
- Facts: `qx_ppmtx_gold_fact_{process}`
- Bridge: `qx_ppmtx_gold_bridge_{relationship}`

### Grain Decisions

| Fact | Grain | Rationale |
|---|---|---|
| fact_component_removal | (transaction, transaction_item) | One event per line item in a component swap transaction |
| fact_defect | (defect_type, defect, defect_item) | One event per reported defect line item |
| fact_inventory_transaction | (transaction_no, batch) | One movement per inventory transaction against a specific batch |
| fact_inventory_snapshot | (batch) | One row per part instance (current state) |
| fact_inventory_control | (pn, sn, control) | One schedule limit per part instance per control type |
| fact_order | (order_type, order_number, order_line) | One row per order line item |
| fact_teardown | (order_type, order_number, order_line) | One teardown per repair order line |

### Key Derived Measures

| Measure | Table | Derivation |
|---|---|---|
| remaining_hours | fact_inventory_control | schedule_hours - actual_hours |
| remaining_cycles | fact_inventory_control | schedule_cycles - actual_cycles |
| remaining_days | fact_inventory_control | schedule_days - actual_days |

### PRD Alignment

| PRD Requirement | Gold Table(s) Supporting |
|---|---|
| FR-1: Unified Parts Search | dim_part + fact_inventory_snapshot |
| FR-2: Defects Search | fact_defect + bridge_defect_part |
| FR-3: Engine Genealogy | fact_component_removal + fact_inventory_snapshot |
| FR-4: Spares & Inventory | fact_inventory_snapshot + dim_station |
| FR-5: Defect↔Part Linkage | bridge_defect_part |
| FR-6: Natural-Language Query | All Gold tables via Genie Space |
| FR-7: LLP Red-Line Tracking | fact_inventory_control |
| FR-8: Operational Impact | fact_defect (delays_hours, delay_minutes, cancellation) |
| FR-9: Persona Dashboards | Multiple fact combinations per persona |
| FR-10: Global Filters | dim_aircraft, dim_station, dim_ata_chapter, dim_date |

---

## Table Properties (Applied to ALL Tables)

```yaml
clustering: auto
table_properties:
  delta.enableChangeDataFeed: "true"
  delta.enableRowTracking: "true"
  delta.autoOptimize.optimizeWrite: "true"
  delta.autoOptimize.autoCompact: "true"
  layer: "gold"
```

---

## Next Steps

1. **Stakeholder Review** — Present ERD and grain definitions to reliability engineering team
2. **Implementation** — Proceed with `gold/01-gold-layer-setup` skill for table creation and merge scripts
3. **Genie Space** — Configure Genie Space with Gold tables per `genie_plan.md` structure
4. **Monitoring** — Set up data quality monitors on FK integrity and freshness targets
