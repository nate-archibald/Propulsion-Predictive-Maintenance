# QX Predictive Maintenance — Genie Context

> **Purpose:** Context handoff for Databricks Genie to continue data refinement work.
> **Last Updated:** 2026-06-30

---

## Project Overview

**Project:** QX Predictive Maintenance — Propulsion Parts & Defects Intelligence
**Operator:** Horizon Air (Alaska Air Group)
**Fleet:** Embraer E175 (CF34-8E engines / APS2300 APU)
**Business Domain:** Regional airline propulsion reliability engineering

### Key Personas

| Persona | Role | Primary Need |
|---------|------|-------------|
| Nate | Propulsion Reliability Engineer | Failure-mode trending, ATA hotspots, MTBUR |
| Corey | MOC Controller | Defect-to-spare resolution, deferral risk |
| Erika | Powerplant Engineer | Engine genealogy, LLP red-line tracking |
| Bill | Rotables / Inventory Planner | Population views, stock-out risk, removal velocity |
| Will | Reliability Program Manager | Executive summaries, data-quality metrics |

---

## Databricks Environment

| Variable | Value |
|----------|-------|
| **Workspace** | `https://adb-620317033646362.2.azuredatabricks.net/` |
| **Source Catalog (Bronze)** | `subject_maintenanceengineering` |
| **Source Schema (Bronze)** | `ds_maintenanceengineering_ods` |
| **Gold/Silver Catalog** | `subject_maintenanceengineering_test` |
| **Gold/Silver Schema** | `an_maintenanceengineering_ods` |
| **Table Prefix** | `qx_ppmtx_` (silver), `qx_ppmtx_gold_` (gold) |
| **SQL Warehouse** | QXOps SQL warehouse |

---

## What's Been Built

### Silver Layer (9 tables) — COMPLETE

Silver tables live in `subject_maintenanceengineering_test.an_maintenanceengineering_ods` and are sourced from Bronze tables in `subject_maintenanceengineering.ds_maintenanceengineering_ods`.

| Silver Table | Source Bronze Table | Purpose |
|---|---|---|
| `qx_ppmtx_pn_master` | pn_master | Part number master reference |
| `qx_ppmtx_ac_pn_transaction_history` | ac_pn_transaction_history | Component removal/installation events |
| `qx_ppmtx_defect_report` | defect_report | Aircraft defect reports |
| `qx_ppmtx_defect_report_pn` | defect_report_pn | Parts implicated in defects |
| `qx_ppmtx_pn_inventory_history` | pn_inventory_history | Inventory movement transactions |
| `qx_ppmtx_pn_inventory_detail` | pn_inventory_detail | Current inventory positions |
| `qx_ppmtx_pn_inventory_control` | pn_inventory_control | Maintenance schedule limits |
| `qx_ppmtx_order_detail` | order_detail | Procurement/repair orders |
| `qx_ppmtx_pn_tear_down_report` | pn_tear_down_report | Shop teardown findings |

Silver also has DQ monitoring tables: `qx_ppmtx_dq_orphaned_defect_pn`, `qx_ppmtx_dq_orphaned_inventory`, `qx_ppmtx_dq_record_counts`, `qx_ppmtx_dq_rules`, `qx_ppmtx_pn_inventory_detail_quarantine` (these are excluded from Gold).

### Gold Layer (13 tables) — COMPLETE

Star schema dimensional model. All tables in `subject_maintenanceengineering_test.an_maintenanceengineering_ods`.

#### Dimensions (5)

| Gold Table | Domain | Business Key | Columns | SCD |
|---|---|---|---|---|
| `qx_ppmtx_gold_dim_part` | Part Master | `pn` | 17 | Type 1 |
| `qx_ppmtx_gold_dim_aircraft` | Component Lifecycle | `ac` | 3 | Type 1 |
| `qx_ppmtx_gold_dim_station` | Component Lifecycle | `station_code` | 3 | Type 1 |
| `qx_ppmtx_gold_dim_ata_chapter` | Defect Management | `chapter, section, paragraph` | 5 | Type 1 |
| `qx_ppmtx_gold_dim_date` | Common | `calendar_date` | 9 | Generated |

#### Facts (7)

| Gold Table | Domain | Grain | Type | Key Measures |
|---|---|---|---|---|
| `qx_ppmtx_gold_fact_component_removal` | Component Lifecycle | (transaction, transaction_item) | Transaction | hours_installed, cycles_installed, days_installed, qty |
| `qx_ppmtx_gold_fact_defect` | Defect Management | (defect_type, defect, defect_item) | Transaction | delays_hours, delay_minutes, fuel |
| `qx_ppmtx_gold_fact_inventory_transaction` | Inventory & Spares | (transaction_no, batch) | Transaction | qty |
| `qx_ppmtx_gold_fact_inventory_snapshot` | Inventory & Spares | (batch) | Periodic Snapshot | unit_cost |
| `qx_ppmtx_gold_fact_inventory_control` | Inventory & Spares | (pn, sn, control) | Accumulating Snapshot | schedule_hours, schedule_cycles, schedule_days, actual_hours, actual_cycles, actual_days, remaining_hours, remaining_cycles, remaining_days |
| `qx_ppmtx_gold_fact_order` | Procurement & Overhaul | (order_type, order_number, order_line) | Transaction | exchange_repair_cost, qty_require, qty_received, qty_available, lead_time |
| `qx_ppmtx_gold_fact_teardown` | Procurement & Overhaul | (order_type, order_number, order_line) | Transaction | (qualitative: fault_confirm, work_done, shop_finding) |

#### Bridge (1)

| Gold Table | Domain | Grain | Purpose |
|---|---|---|---|
| `qx_ppmtx_gold_bridge_defect_part` | Defect Management | (defect_type, defect, defect_item, item) | M:M link between defects and implicated parts |

### Dashboards (5) — COMPLETE

Lakeview dashboards deployed to the workspace:
1. **Propulsion Reliability** — removal trending, MTBUR, time-on-wing
2. **Defect Intelligence** — ATA hotspot trending, delay/cancellation impact
3. **Inventory & Spares** — stock positioning, condition breakdown, LLP red-line
4. **Procurement & Overhaul** — order status, shop findings, repair costs
5. **Executive Reliability** — cross-domain KPIs, fleet-level summary

---

## Gold Table Column Details

### dim_part (17 columns)
`dim_part_key` (BIGINT, PK), `pn` (STRING), `pn_description` (STRING), `category` (STRING), `sub_category` (STRING), `expenditure` (STRING), `stock_uom` (STRING), `shelf_life_flag` (STRING), `shelf_life_days` (DECIMAL), `tool_calibration_flag` (STRING), `tool_life_days` (DECIMAL), `ri_flag` (STRING), `pn_supersede` (STRING), `standard_cost` (DECIMAL), `average_cost` (DECIMAL), `gl_company` (STRING), `gl_expenditure` (STRING)

### dim_aircraft (3 columns)
`dim_aircraft_key` (BIGINT, PK), `ac` (STRING — tail number e.g. N193QX), `aircraft_type` (STRING — all E175)

### dim_station (3 columns)
`dim_station_key` (BIGINT, PK), `station_code` (STRING — IATA code e.g. PDX, SEA), `station_name` (STRING)

### dim_ata_chapter (5 columns)
`dim_ata_chapter_key` (BIGINT, PK), `chapter` (DECIMAL — ATA chapter 49, 70-80), `section` (DECIMAL), `paragraph` (DECIMAL), `chapter_description` (STRING — e.g. "Engine", "Auxiliary Power Unit")

ATA chapter reference: 49=APU, 70=Standard Practices-Engine, 71=Power Plant, 72=Engine, 73=Engine Fuel and Control, 74=Ignition, 75=Air, 76=Engine Controls, 77=Engine Indicating, 78=Exhaust, 79=Oil, 80=Starting

### dim_date (9 columns)
`dim_date_key` (INT, PK — YYYYMMDD format), `calendar_date` (DATE), `year` (INT), `quarter` (INT), `month` (INT), `week_of_year` (INT), `day_of_month` (INT), `day_name` (STRING), `month_name` (STRING)

### fact_component_removal (22 columns)
`fact_component_removal_key` (BIGINT, PK), `dim_part_key` (BIGINT, FK→dim_part), `dim_aircraft_key` (BIGINT, FK→dim_aircraft), `dim_station_key` (BIGINT, FK→dim_station), `dim_ata_chapter_key` (BIGINT, FK→dim_ata_chapter), `transaction_date_key` (INT, FK→dim_date), `transaction` (STRING), `transaction_item` (DECIMAL), `transaction_type` (STRING — RMV/INS), `transaction_type_control` (STRING — scheduled/unscheduled), `sn` (STRING), `nha_pn` (STRING), `nha_sn` (STRING), `position` (STRING — ENG1/ENG2/APU), `reason_category` (STRING), `schedule_category` (STRING), `hours_installed` (DECIMAL — TSI flight hours), `minutes_installed` (DECIMAL), `cycles_installed` (DECIMAL — CSI), `days_installed` (DECIMAL), `qty` (DECIMAL), `defect_type` (STRING), `defect` (STRING), `wo` (DECIMAL), `tag_no` (STRING), `removal_reason` (STRING), `status` (STRING)

### fact_defect (22 columns)
`fact_defect_key` (BIGINT, PK), `dim_aircraft_key` (BIGINT, FK→dim_aircraft), `dim_ata_chapter_key` (BIGINT, FK→dim_ata_chapter), `reported_date_key` (INT, FK→dim_date), `resolved_date_key` (INT, FK→dim_date), `defect_type` (STRING — PIREP/MIREP/Cabin Log), `defect` (STRING), `defect_item` (DECIMAL), `status` (STRING — Open/Deferred/Closed), `defect_description` (STRING), `defect_category` (STRING), `resolution_description` (STRING), `resolution_category` (STRING), `delay` (STRING — Y/N), `delays_hours` (DECIMAL), `delay_minutes` (DECIMAL), `cancellation` (STRING — Y/N), `i_f_s_d` (STRING — In-Flight Shut Down), `fuel` (DECIMAL), `mel` (STRING — MEL flag), `mel_number` (STRING), `defer` (STRING), `fault_confirm` (STRING), `wo` (DECIMAL), `flight` (STRING)

### fact_inventory_transaction (14 columns)
`fact_inventory_transaction_key` (BIGINT, PK), `dim_part_key` (BIGINT, FK→dim_part), `dim_aircraft_key` (BIGINT, FK→dim_aircraft), `dim_station_key` (BIGINT, FK→dim_station), `transaction_date_key` (INT, FK→dim_date), `transaction_no` (DECIMAL), `batch` (DECIMAL), `transaction_type` (STRING — Receipt/Issue/Transfer/Adjustment), `sn` (STRING), `condition` (STRING — SVC/UNS/SCR), `qty` (DECIMAL), `order_type` (STRING), `order_no` (DECIMAL), `wo` (DECIMAL)

### fact_inventory_snapshot (14 columns)
`fact_inventory_snapshot_key` (BIGINT, PK), `dim_part_key` (BIGINT, FK→dim_part), `dim_aircraft_key` (BIGINT, FK→dim_aircraft), `dim_station_key` (BIGINT, FK→dim_station), `snapshot_date_key` (INT, FK→dim_date), `batch` (DECIMAL), `sn` (STRING), `nha_pn` (STRING), `nha_sn` (STRING), `condition` (STRING — SVC/RFI/UNS/SCR/AOG), `owner` (STRING), `unit_cost` (DECIMAL), `currency` (STRING), `location` (STRING), `installed_ac` (STRING), `installed_position` (STRING)

### fact_inventory_control (15 columns)
`fact_inventory_control_key` (BIGINT, PK), `dim_part_key` (BIGINT, FK→dim_part), `schedule_date_key` (INT, FK→dim_date), `reset_date_key` (INT, FK→dim_date), `pn` (STRING), `sn` (STRING), `control` (STRING — Hard Time/On Condition/TBO), `schedule_hours` (DECIMAL), `schedule_cycles` (DECIMAL), `schedule_days` (DECIMAL), `actual_hours` (DECIMAL), `actual_minutes` (DECIMAL), `actual_cycles` (DECIMAL), `actual_days` (DECIMAL), `remaining_hours` (DECIMAL — derived: schedule_hours - actual_hours), `remaining_cycles` (DECIMAL — derived: schedule_cycles - actual_cycles), `remaining_days` (DECIMAL — derived: schedule_days - actual_days)

### fact_order (16 columns)
`fact_order_key` (BIGINT, PK), `dim_part_key` (BIGINT, FK→dim_part), `order_date_key` (INT, FK→dim_date), `order_type` (STRING — Purchase/Repair/Exchange/Loan), `order_number` (DECIMAL), `order_line` (DECIMAL), `status` (STRING), `sn` (STRING), `batch` (DECIMAL), `pn_description` (STRING), `exchange_pn` (STRING), `exchange_sn` (STRING), `exchange_repair_cost` (DECIMAL), `qty_require` (DECIMAL), `qty_received` (DECIMAL), `qty_available` (DECIMAL), `lead_time` (DECIMAL)

### fact_teardown (14 columns)
`fact_teardown_key` (BIGINT, PK), `dim_part_key` (BIGINT, FK→dim_part), `dim_ata_chapter_key` (BIGINT, FK→dim_ata_chapter), `created_date_key` (INT, FK→dim_date), `order_type` (STRING), `order_number` (DECIMAL), `order_line` (DECIMAL), `sn` (STRING), `batch` (DECIMAL), `fault_confirm` (STRING — NFF vs confirmed), `status` (STRING), `pn_description` (STRING), `work_done` (STRING), `shop_finding` (STRING), `defect_type` (STRING), `defect` (STRING), `defect_item` (DECIMAL)

### bridge_defect_part (10 columns)
`bridge_defect_part_key` (BIGINT, PK), `dim_part_key` (BIGINT, FK→dim_part), `defect_type` (STRING, FK→fact_defect), `defect` (STRING, FK→fact_defect), `defect_item` (DECIMAL, FK→fact_defect), `item` (DECIMAL), `qty` (DECIMAL), `qty_reserved` (DECIMAL), `spare` (STRING), `ipc` (STRING), `reserved` (STRING)

---

## Star Schema Relationships

```
                        dim_date
                       /   |    \
                      /    |     \
    dim_aircraft ← fact_component_removal → dim_part
         |              ↓                     ↑
         |         dim_station            bridge_defect_part
         |              ↑                     ↑
         ↓              |                     |
    fact_defect ← dim_ata_chapter        fact_defect
         |
         ↓
    fact_inventory_snapshot → dim_station
         |
    fact_inventory_transaction → dim_station
         |
    fact_inventory_control → dim_part
         |
    fact_order → dim_part
         |
    fact_teardown → dim_part, dim_ata_chapter
```

All facts join to `dim_date` via date key columns (YYYYMMDD INT format).

---

## Source Table Lineage (Silver → Gold)

| Silver Table | → Gold Table | Domain |
|---|---|---|
| `qx_ppmtx_pn_master` | `qx_ppmtx_gold_dim_part` | Part Master |
| `qx_ppmtx_ac_pn_transaction_history` | `qx_ppmtx_gold_fact_component_removal` + dim_aircraft, dim_station | Component Lifecycle |
| `qx_ppmtx_defect_report` | `qx_ppmtx_gold_fact_defect` + dim_ata_chapter | Defect Management |
| `qx_ppmtx_defect_report_pn` | `qx_ppmtx_gold_bridge_defect_part` | Defect Management |
| `qx_ppmtx_pn_inventory_history` | `qx_ppmtx_gold_fact_inventory_transaction` | Inventory & Spares |
| `qx_ppmtx_pn_inventory_detail` | `qx_ppmtx_gold_fact_inventory_snapshot` | Inventory & Spares |
| `qx_ppmtx_pn_inventory_control` | `qx_ppmtx_gold_fact_inventory_control` | Inventory & Spares |
| `qx_ppmtx_order_detail` | `qx_ppmtx_gold_fact_order` | Procurement & Overhaul |
| `qx_ppmtx_pn_tear_down_report` | `qx_ppmtx_gold_fact_teardown` | Procurement & Overhaul |

---

## What's Next (Planned but Not Built)

Per project plans, the remaining work is:

1. **Semantic Layer** — TVFs (3-5), Metric Views (1-2), Genie Spaces (1)
2. **Lakehouse Monitoring** — Data quality monitors on Gold tables
3. **Alerting** — Threshold alerts for LLP red-lines, stock-out risk
4. **ML Models** — Remaining life prediction, anomaly detection
5. **GenAI Agents** — 4 domain agents + orchestrator

---

## Useful Queries for Data Exploration

```sql
-- Quick row counts across all Gold tables
SELECT 'dim_part' AS tbl, COUNT(*) AS cnt FROM subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_dim_part
UNION ALL SELECT 'dim_aircraft', COUNT(*) FROM subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_dim_aircraft
UNION ALL SELECT 'dim_station', COUNT(*) FROM subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_dim_station
UNION ALL SELECT 'dim_ata_chapter', COUNT(*) FROM subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_dim_ata_chapter
UNION ALL SELECT 'dim_date', COUNT(*) FROM subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_dim_date
UNION ALL SELECT 'fact_component_removal', COUNT(*) FROM subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_fact_component_removal
UNION ALL SELECT 'fact_defect', COUNT(*) FROM subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_fact_defect
UNION ALL SELECT 'fact_inventory_transaction', COUNT(*) FROM subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_fact_inventory_transaction
UNION ALL SELECT 'fact_inventory_snapshot', COUNT(*) FROM subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_fact_inventory_snapshot
UNION ALL SELECT 'fact_inventory_control', COUNT(*) FROM subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_fact_inventory_control
UNION ALL SELECT 'fact_order', COUNT(*) FROM subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_fact_order
UNION ALL SELECT 'fact_teardown', COUNT(*) FROM subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_fact_teardown
UNION ALL SELECT 'bridge_defect_part', COUNT(*) FROM subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_bridge_defect_part
ORDER BY tbl;

-- Top removal reasons
SELECT reason_category, COUNT(*) AS removals
FROM subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_fact_component_removal
GROUP BY reason_category ORDER BY removals DESC;

-- Defects causing delays
SELECT d.chapter_description, COUNT(*) AS defects, SUM(f.delay_minutes) AS total_delay_min
FROM subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_fact_defect f
JOIN subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_dim_ata_chapter d ON f.dim_ata_chapter_key = d.dim_ata_chapter_key
WHERE f.delay = 'Y'
GROUP BY d.chapter_description ORDER BY total_delay_min DESC;

-- LLP parts approaching red-line (< 500 cycles remaining)
SELECT p.pn, p.pn_description, ic.sn, ic.control, ic.remaining_cycles, ic.remaining_hours
FROM subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_fact_inventory_control ic
JOIN subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_dim_part p ON ic.dim_part_key = p.dim_part_key
WHERE ic.remaining_cycles IS NOT NULL AND ic.remaining_cycles < 500
ORDER BY ic.remaining_cycles ASC;
```
