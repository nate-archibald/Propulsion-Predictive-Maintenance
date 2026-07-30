# Prerequisites — QX Predictive Maintenance

> **Planning Mode:** Data Product Acceleration (default)
> **Planning Source:** `gold_design`
> **Generated:** 2026-06-24

---

## Project Information

| Field | Value |
|-------|-------|
| **Project Name** | QX Predictive Maintenance |
| **Business Domain** | Travel & Hospitality — Regional Airline Operations |
| **Operator** | Horizon Air (Alaska Air Group) |
| **Fleet** | Embraer E175 (CF34-8E / APS2300 APU) |
| **Catalog** | `subject_maintenanceengineering` |
| **Gold Schema** | `an_maintenanceengineering_ods` |
| **Table Prefix** | `qx_ppmtx_gold_` |

## Prerequisites Status

| Layer | Count | Status |
|-------|-------|--------|
| Bronze Tables | 9 | ✅ Complete |
| Silver Tables | 9 | ✅ Complete |
| Gold Dimensions | 5 | 🟡 Designed only (YAML schemas complete) |
| Gold Facts | 7 | 🟡 Designed only (YAML schemas complete) |
| Gold Bridges | 1 | 🟡 Designed only (YAML schemas complete) |
| **Selected planning source** | — | `gold_design` |

## Gold Layer Summary

### Dimensions (5)

| Table | Domain | Business Key | Columns |
|-------|--------|-------------|---------|
| `qx_ppmtx_gold_dim_part` | Part Master | `pn` | 17 |
| `qx_ppmtx_gold_dim_aircraft` | Component Lifecycle | `ac` | 3 |
| `qx_ppmtx_gold_dim_station` | Component Lifecycle | `station_code` | 3 |
| `qx_ppmtx_gold_dim_ata_chapter` | Defect Management | `chapter, section, paragraph` | 5 |
| `qx_ppmtx_gold_dim_date` | Common | `calendar_date` | 9 |

### Facts (7)

| Table | Domain | Grain | Fact Type | Key Measures |
|-------|--------|-------|-----------|-------------|
| `qx_ppmtx_gold_fact_component_removal` | Component Lifecycle | transaction + transaction_item | Transaction | hours_installed, cycles_installed, days_installed |
| `qx_ppmtx_gold_fact_defect` | Defect Management | defect_type + defect + defect_item | Transaction | delays_hours, delay_minutes, fuel |
| `qx_ppmtx_gold_fact_inventory_transaction` | Inventory & Spares | transaction_no + batch | Transaction | qty |
| `qx_ppmtx_gold_fact_inventory_snapshot` | Inventory & Spares | batch | Periodic Snapshot | unit_cost |
| `qx_ppmtx_gold_fact_inventory_control` | Inventory & Spares | pn + sn + control | Accumulating Snapshot | schedule_hours/cycles/days, actual_hours/cycles/days, remaining_hours/cycles/days |
| `qx_ppmtx_gold_fact_order` | Procurement & Overhaul | order_type + order_number + order_line | Transaction | exchange_repair_cost, qty_require, qty_received, lead_time |
| `qx_ppmtx_gold_fact_teardown` | Procurement & Overhaul | order_type + order_number + order_line | Transaction | (qualitative — fault_confirm, work_done, shop_finding) |

### Bridges (1)

| Table | Domain | Grain | Purpose |
|-------|--------|-------|---------|
| `qx_ppmtx_gold_bridge_defect_part` | Defect Management | defect_type + defect + defect_item + item | M:M link between defects and implicated parts |

## PRD Reference

Business requirements, personas, and user journeys sourced from [docs/design_prd.md](../../docs/design_prd.md).

| Persona | Role | Primary Need |
|---------|------|-------------|
| Nate | Propulsion Reliability Engineer | Failure-mode trending, ATA hotspots, MTBUR |
| Corey | MOC Controller | Defect-to-spare resolution, deferral risk |
| Erika | Powerplant Engineer | Engine genealogy, LLP red-line tracking |
| Bill | Rotables / Inventory Planner | Population views, stock-out risk, removal velocity |
| Will | Reliability Program Manager | Executive summaries, data-quality metrics |
