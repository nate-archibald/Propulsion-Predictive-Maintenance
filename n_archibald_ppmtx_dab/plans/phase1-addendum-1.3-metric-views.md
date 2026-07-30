# Phase 1 Addendum 1.3 — Metric Views

> **Agent Domain Framework applies.** One metric view per distinct analytical grain.
> **Planning Source:** `gold_design` | **SQL Standard:** `${catalog}.${gold_schema}.table_name`
> **Back to:** [phase1-use-cases.md](phase1-use-cases.md)

---

## Summary

| # | Metric View Name | Domain | Source Fact Table | Dimensions Joined | Measures | Use Case Refs |
|---|-----------------|--------|------------------|-------------------|----------|---------------|
| 1 | `component_lifecycle_analytics_metrics` | ⚙️ Component Lifecycle | fact_component_removal | dim_part, dim_aircraft, dim_station, dim_ata_chapter, dim_date | hours_installed, cycles_installed, days_installed, qty | UC-001, UC-010 |
| 2 | `defect_intelligence_analytics_metrics` | ⚠️ Defect Intelligence | fact_defect | dim_aircraft, dim_ata_chapter, dim_date | delays_hours, delay_minutes, fuel | UC-002, UC-003, UC-010 |
| 3 | `inventory_spares_analytics_metrics` | 📦 Inventory & Spares | fact_inventory_snapshot, fact_inventory_transaction | dim_part, dim_station, dim_date | unit_cost, qty | UC-006, UC-007 |
| 4 | `procurement_overhaul_analytics_metrics` | 🛠️ Procurement & Overhaul | fact_order, fact_teardown | dim_part, dim_ata_chapter, dim_date | exchange_repair_cost, qty_require, qty_received, lead_time | UC-008, UC-009, UC-010 |

---

## ⚙️ Component Lifecycle & Reliability

### 1. `component_lifecycle_analytics_metrics`

**Agent Domain:** ⚙️ Component Lifecycle & Reliability
**Source:** `fact_component_removal`
**Grain:** One row per component removal/installation event
**Use Case Refs:** UC-001, UC-010

```sql
CREATE METRIC VIEW ${catalog}.${gold_schema}.component_lifecycle_analytics_metrics
COMMENT 'LLM: Pre-aggregated metrics for propulsion component removal and lifecycle analysis. Use for removal counts, average time-on-wing, and fleet-wide removal trending. Example questions: "How many removals this month?", "Average hours at removal for rotables?"'
AS SELECT
  f.fact_component_removal_key,
  p.pn,
  p.pn_description,
  p.category,
  a.ac,
  a.aircraft_type,
  s.station_code,
  s.station_name,
  c.chapter,
  c.section,
  c.chapter_description,
  d.calendar_date AS removal_date,
  d.year,
  d.quarter,
  d.month,
  d.month_name,
  f.transaction_type,
  f.reason_category,
  f.schedule_category,
  f.position,
  MEASURE SUM(f.hours_installed) AS total_hours_at_removal,
  MEASURE SUM(f.cycles_installed) AS total_cycles_at_removal,
  MEASURE SUM(f.days_installed) AS total_days_at_removal,
  MEASURE COUNT(*) AS removal_count,
  MEASURE AVG(f.hours_installed) AS avg_hours_at_removal,
  MEASURE AVG(f.cycles_installed) AS avg_cycles_at_removal,
  MEASURE COUNT(CASE WHEN f.schedule_category = 'Unscheduled' THEN 1 END) AS unscheduled_removal_count
FROM ${catalog}.${gold_schema}.qx_ppmtx_gold_fact_component_removal f
LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_part p ON f.dim_part_key = p.dim_part_key
LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_aircraft a ON f.dim_aircraft_key = a.dim_aircraft_key
LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_station s ON f.dim_station_key = s.dim_station_key
LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_ata_chapter c ON f.dim_ata_chapter_key = c.dim_ata_chapter_key
LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_date d ON f.transaction_date_key = d.dim_date_key;
```

---

## ⚠️ Defect Intelligence

### 2. `defect_intelligence_analytics_metrics`

**Agent Domain:** ⚠️ Defect Intelligence
**Source:** `fact_defect`
**Grain:** One row per defect event
**Use Case Refs:** UC-002, UC-003, UC-010

```sql
CREATE METRIC VIEW ${catalog}.${gold_schema}.defect_intelligence_analytics_metrics
COMMENT 'LLM: Pre-aggregated metrics for propulsion defect analysis including operational impact (delays, cancellations, IFSDs). Use for ATA hotspot trending, operational impact ranking, and deferral analysis. Example questions: "Top ATA sections by delay minutes?", "Defect count trend this quarter?"'
AS SELECT
  f.fact_defect_key,
  a.ac,
  a.aircraft_type,
  c.chapter,
  c.section,
  c.paragraph,
  c.chapter_description,
  d.calendar_date AS reported_date,
  d.year,
  d.quarter,
  d.month,
  d.week_of_year,
  d.month_name,
  f.defect_type,
  f.defect_category,
  f.status,
  f.cancellation,
  f.delay,
  f.mel,
  f.defer,
  f.i_f_s_d,
  f.fault_confirm,
  MEASURE COUNT(*) AS defect_count,
  MEASURE SUM(f.delay_minutes) AS total_delay_minutes,
  MEASURE SUM(f.delays_hours) AS total_delay_hours,
  MEASURE COUNT(CASE WHEN f.cancellation = 'Y' THEN 1 END) AS cancellation_count,
  MEASURE COUNT(CASE WHEN f.delay = 'Y' THEN 1 END) AS delay_event_count,
  MEASURE COUNT(CASE WHEN f.i_f_s_d = 'Y' THEN 1 END) AS ifsd_count,
  MEASURE COUNT(CASE WHEN f.mel = 'Y' THEN 1 END) AS mel_deferral_count,
  MEASURE COUNT(CASE WHEN f.defer = 'Y' THEN 1 END) AS deferral_count
FROM ${catalog}.${gold_schema}.qx_ppmtx_gold_fact_defect f
LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_aircraft a ON f.dim_aircraft_key = a.dim_aircraft_key
LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_ata_chapter c ON f.dim_ata_chapter_key = c.dim_ata_chapter_key
LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_date d ON f.reported_date_key = d.dim_date_key;
```

---

## 📦 Inventory & Spares

### 3. `inventory_spares_analytics_metrics`

**Agent Domain:** 📦 Inventory & Spares
**Source:** `fact_inventory_snapshot` (primary), `fact_inventory_transaction` (secondary)
**Grain:** One row per inventory snapshot position (fact_inventory_snapshot)
**Use Case Refs:** UC-006, UC-007

```sql
CREATE METRIC VIEW ${catalog}.${gold_schema}.inventory_spares_analytics_metrics
COMMENT 'LLM: Pre-aggregated metrics for propulsion spare inventory analysis. Use for spare counts by station and condition, stock-out risk identification, and inventory valuation. Example questions: "How many serviceable spares at PDX?", "Total inventory value by condition?"'
AS SELECT
  f.fact_inventory_snapshot_key,
  p.pn,
  p.pn_description,
  p.category,
  s.station_code,
  s.station_name,
  f.condition,
  f.owner,
  f.location,
  f.installed_ac,
  MEASURE COUNT(*) AS instance_count,
  MEASURE SUM(f.unit_cost) AS total_value,
  MEASURE COUNT(CASE WHEN f.condition = 'SVC' THEN 1 END) AS serviceable_count,
  MEASURE COUNT(CASE WHEN f.condition = 'UNS' THEN 1 END) AS unserviceable_count,
  MEASURE COUNT(CASE WHEN f.condition = 'AOG' THEN 1 END) AS aog_count,
  MEASURE COUNT(CASE WHEN f.installed_ac IS NOT NULL THEN 1 END) AS installed_count,
  MEASURE COUNT(CASE WHEN f.installed_ac IS NULL THEN 1 END) AS in_stock_count
FROM ${catalog}.${gold_schema}.qx_ppmtx_gold_fact_inventory_snapshot f
LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_part p ON f.dim_part_key = p.dim_part_key
LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_station s ON f.dim_station_key = s.dim_station_key;
```

---

## 🛠️ Procurement & Overhaul

### 4. `procurement_overhaul_analytics_metrics`

**Agent Domain:** 🛠️ Procurement & Overhaul
**Source:** `fact_order` (primary), `fact_teardown` (secondary)
**Grain:** One row per order line item (fact_order)
**Use Case Refs:** UC-008, UC-009, UC-010

```sql
CREATE METRIC VIEW ${catalog}.${gold_schema}.procurement_overhaul_analytics_metrics
COMMENT 'LLM: Pre-aggregated metrics for procurement, repair orders, and shop findings. Use for cost analysis, lead time tracking, fulfillment rates, and fault confirmation rates. Example questions: "Average repair cost by order type?", "Order fulfillment rate trend?"'
AS SELECT
  f.fact_order_key,
  p.pn,
  p.pn_description,
  p.category,
  d.calendar_date AS order_date,
  d.year,
  d.quarter,
  d.month,
  f.order_type,
  f.status,
  MEASURE SUM(f.exchange_repair_cost) AS total_repair_cost,
  MEASURE AVG(f.exchange_repair_cost) AS avg_repair_cost,
  MEASURE SUM(f.qty_require) AS total_qty_required,
  MEASURE SUM(f.qty_received) AS total_qty_received,
  MEASURE AVG(f.lead_time) AS avg_lead_time,
  MEASURE COUNT(*) AS order_line_count,
  MEASURE COUNT(CASE WHEN f.status = 'Open' THEN 1 END) AS open_order_count,
  MEASURE SUM(f.qty_received) / NULLIF(SUM(f.qty_require), 0) AS fulfillment_rate
FROM ${catalog}.${gold_schema}.qx_ppmtx_gold_fact_order f
LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_part p ON f.dim_part_key = p.dim_part_key
LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_date d ON f.order_date_key = d.dim_date_key;
```

---

## Rationalization Notes

- **4 Metric Views for 7 fact tables** — within the right-sizing guide (3-5 for 4-6 facts).
- `fact_inventory_control` is not covered by a Metric View because its analytical value comes from parameterized threshold queries (served by the `get_llp_redline_status` TVF).
- `bridge_defect_part` is a linkage table, not an analytical grain — no Metric View needed (served by `get_defect_part_linkage` TVF).
- Each Metric View covers one distinct analytical grain; no duplicates.
- All include LLM-friendly `COMMENT` strings with example questions for Genie integration.
