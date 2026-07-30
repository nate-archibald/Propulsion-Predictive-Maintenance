# Phase 1 Addendum 1.2 — Table-Valued Functions

> **Agent Domain Framework applies.** Every TVF is tagged with its agent domain.
> **Planning Source:** `gold_design` | **SQL Standard:** `${catalog}.${gold_schema}.table_name`
> **Back to:** [phase1-use-cases.md](phase1-use-cases.md)

---

## Summary

| # | TVF Name | Domain | Gold Tables Used | Use Case Refs |
|---|----------|--------|-----------------|---------------|
| 1 | `get_component_removal_history` | ⚙️ Component Lifecycle | fact_component_removal, dim_part, dim_aircraft, dim_station, dim_ata_chapter, dim_date | UC-001 |
| 2 | `get_mtbur_analysis` | ⚙️ Component Lifecycle | fact_component_removal, dim_part, dim_date | UC-001, UC-010 |
| 3 | `get_time_on_wing_distribution` | ⚙️ Component Lifecycle | fact_component_removal, dim_part | UC-001 |
| 4 | `get_defect_trending_by_ata` | ⚠️ Defect Intelligence | fact_defect, dim_ata_chapter, dim_date | UC-002, UC-003, UC-010 |
| 5 | `get_operational_impact_summary` | ⚠️ Defect Intelligence | fact_defect, dim_aircraft, dim_ata_chapter, dim_date | UC-003, UC-010 |
| 6 | `get_defect_part_linkage` | ⚠️ Defect Intelligence | fact_defect, bridge_defect_part, dim_part, fact_teardown | UC-004 |
| 7 | `get_spare_availability_by_station` | 📦 Inventory & Spares | fact_inventory_snapshot, dim_part, dim_station | UC-006 |
| 8 | `get_llp_redline_status` | 📦 Inventory & Spares | fact_inventory_control, dim_part | UC-005 |
| 9 | `get_inventory_movement_velocity` | 📦 Inventory & Spares | fact_inventory_transaction, dim_part, dim_station, dim_date | UC-007 |
| 10 | `get_order_status_summary` | 🛠️ Procurement & Overhaul | fact_order, dim_part, dim_date | UC-008 |
| 11 | `get_shop_findings_by_part` | 🛠️ Procurement & Overhaul | fact_teardown, dim_part, dim_ata_chapter | UC-004, UC-009 |

---

## ⚙️ Component Lifecycle & Reliability

### 1. `get_component_removal_history`

**Agent Domain:** ⚙️ Component Lifecycle & Reliability
**Gold Tables:** `fact_component_removal`, `dim_part`, `dim_aircraft`, `dim_station`, `dim_ata_chapter`, `dim_date`
**Use Case Refs:** UC-001

**Why not a Metric View?** Requires parameterized filtering by P/N, date range, station, and aircraft — multi-table join with flexible parameters.

```sql
CREATE OR REPLACE FUNCTION ${catalog}.${gold_schema}.get_component_removal_history(
  part_number STRING COMMENT 'Part number to filter (exact match or NULL for all)',
  start_date STRING COMMENT 'Start date filter. Format: YYYY-MM-DD',
  end_date STRING COMMENT 'End date filter. Format: YYYY-MM-DD',
  station_code STRING COMMENT 'Station code filter (e.g., PDX) or NULL for all'
)
RETURNS TABLE (
  transaction STRING, transaction_item DECIMAL, transaction_type STRING,
  pn STRING, pn_description STRING, sn STRING,
  ac STRING, station STRING, station_name STRING,
  chapter DECIMAL, chapter_description STRING,
  transaction_date DATE, hours_installed DECIMAL, cycles_installed DECIMAL,
  days_installed DECIMAL, reason_category STRING, schedule_category STRING,
  position STRING, nha_pn STRING, nha_sn STRING
)
COMMENT 'LLM: Returns component removal and installation history for propulsion parts. Supports filtering by part number, date range, and station. Example questions: "Show all removals for part X at PDX in the last 6 months", "What is the removal history for engine serial number Y?"'
RETURN
  SELECT ...
  FROM ${catalog}.${gold_schema}.qx_ppmtx_gold_fact_component_removal f
  JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_part p ON f.dim_part_key = p.dim_part_key
  JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_aircraft a ON f.dim_aircraft_key = a.dim_aircraft_key
  JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_station s ON f.dim_station_key = s.dim_station_key
  LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_ata_chapter c ON f.dim_ata_chapter_key = c.dim_ata_chapter_key
  JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_date d ON f.transaction_date_key = d.dim_date_key
  WHERE (part_number IS NULL OR p.pn = part_number)
    AND d.calendar_date BETWEEN CAST(start_date AS DATE) AND CAST(end_date AS DATE)
    AND (station_code IS NULL OR s.station_code = station_code);
```

---

### 2. `get_mtbur_analysis`

**Agent Domain:** ⚙️ Component Lifecycle & Reliability
**Gold Tables:** `fact_component_removal`, `dim_part`, `dim_date`
**Use Case Refs:** UC-001, UC-010

**Why not a Metric View?** Requires rolling-window MTBUR calculation with parameterized period and P/N filtering — complex windowed aggregation.

```sql
CREATE OR REPLACE FUNCTION ${catalog}.${gold_schema}.get_mtbur_analysis(
  part_number STRING COMMENT 'Part number for MTBUR calculation (NULL for all P/Ns)',
  lookback_months INT COMMENT 'Number of months to look back (e.g., 24)',
  schedule_filter STRING COMMENT 'Filter: UNSCHEDULED, SCHEDULED, or ALL'
)
RETURNS TABLE (
  pn STRING, pn_description STRING, category STRING,
  total_removals BIGINT, avg_hours_at_removal DECIMAL, avg_cycles_at_removal DECIMAL,
  mtbur_hours DECIMAL, mtbur_cycles DECIMAL,
  min_hours DECIMAL, max_hours DECIMAL, stddev_hours DECIMAL
)
COMMENT 'LLM: Calculates Mean Time Between Unscheduled Removals (MTBUR) in flight hours and cycles for propulsion components. Critical for reliability trending. Example questions: "What is the MTBUR for HPT shroud P/N?", "Which parts have the lowest MTBUR this year?"'
RETURN
  SELECT ...;
```

---

### 3. `get_time_on_wing_distribution`

**Agent Domain:** ⚙️ Component Lifecycle & Reliability
**Gold Tables:** `fact_component_removal`, `dim_part`
**Use Case Refs:** UC-001

**Why not a Metric View?** Requires binned distribution calculation with parameterized P/N and bin-width — statistical aggregation.

```sql
CREATE OR REPLACE FUNCTION ${catalog}.${gold_schema}.get_time_on_wing_distribution(
  part_number STRING COMMENT 'Part number for distribution analysis',
  metric STRING COMMENT 'Metric: HOURS, CYCLES, or DAYS',
  bin_width DECIMAL COMMENT 'Histogram bin width (e.g., 500 for hours, 100 for cycles)'
)
RETURNS TABLE (
  pn STRING, pn_description STRING, bin_start DECIMAL, bin_end DECIMAL,
  removal_count BIGINT, pct_of_total DECIMAL
)
COMMENT 'LLM: Returns hours/cycles/days-at-failure distribution histogram for a part number. Critical for identifying Weibull patterns and infant mortality. Example questions: "Show hours-at-failure distribution for P/N X", "What is the cycles-at-removal pattern for engine hot-section parts?"'
RETURN
  SELECT ...;
```

---

## ⚠️ Defect Intelligence

### 4. `get_defect_trending_by_ata`

**Agent Domain:** ⚠️ Defect Intelligence
**Gold Tables:** `fact_defect`, `dim_ata_chapter`, `dim_date`
**Use Case Refs:** UC-002, UC-003, UC-010

**Why not a Metric View?** Requires parameterized ATA chapter filtering, configurable time granularity (week/month), and period-over-period comparison logic.

```sql
CREATE OR REPLACE FUNCTION ${catalog}.${gold_schema}.get_defect_trending_by_ata(
  ata_chapter DECIMAL COMMENT 'ATA chapter to filter (e.g., 73) or NULL for all propulsion chapters',
  start_date STRING COMMENT 'Start date. Format: YYYY-MM-DD',
  end_date STRING COMMENT 'End date. Format: YYYY-MM-DD',
  granularity STRING COMMENT 'Time grouping: WEEK or MONTH'
)
RETURNS TABLE (
  period_start DATE, chapter DECIMAL, section DECIMAL, chapter_description STRING,
  defect_count BIGINT, delay_defect_count BIGINT, cancel_defect_count BIGINT,
  total_delay_minutes DECIMAL, ifsd_count BIGINT
)
COMMENT 'LLM: Returns defect volume trending by ATA chapter and time period. Supports hotspot detection and WOW comparison. Example questions: "Which ATA chapters are trending up this month?", "Show ATA 73 defect trend weekly for the last 6 months"'
RETURN
  SELECT ...;
```

---

### 5. `get_operational_impact_summary`

**Agent Domain:** ⚠️ Defect Intelligence
**Gold Tables:** `fact_defect`, `dim_aircraft`, `dim_ata_chapter`, `dim_date`
**Use Case Refs:** UC-003, UC-010

**Why not a Metric View?** Requires parameterized top-N ranking with flexible grouping (by ATA, by aircraft, by station).

```sql
CREATE OR REPLACE FUNCTION ${catalog}.${gold_schema}.get_operational_impact_summary(
  start_date STRING COMMENT 'Start date. Format: YYYY-MM-DD',
  end_date STRING COMMENT 'End date. Format: YYYY-MM-DD',
  group_by STRING COMMENT 'Grouping dimension: ATA, AIRCRAFT, or ALL',
  top_n INT COMMENT 'Return top N results by delay minutes (e.g., 10)'
)
RETURNS TABLE (
  group_key STRING, group_description STRING,
  total_defects BIGINT, delay_events BIGINT, cancel_events BIGINT,
  total_delay_minutes DECIMAL, total_delay_hours DECIMAL,
  ifsd_events BIGINT, mel_deferrals BIGINT
)
COMMENT 'LLM: Summarizes operational impact (delays, cancellations, IFSDs) from propulsion defects. Critical for CPA economics tracking. Example questions: "Top 10 ATA sections by delay minutes this month", "How many cancellations from propulsion issues this quarter?"'
RETURN
  SELECT ...;
```

---

### 6. `get_defect_part_linkage`

**Agent Domain:** ⚠️ Defect Intelligence
**Gold Tables:** `fact_defect`, `bridge_defect_part`, `dim_part`, `fact_teardown`
**Use Case Refs:** UC-004

**Why not a Metric View?** Requires multi-fact join (defect → bridge → part → teardown) with parameterized defect or part filtering — the cross-table linkage that no legacy tool supports.

```sql
CREATE OR REPLACE FUNCTION ${catalog}.${gold_schema}.get_defect_part_linkage(
  defect_id STRING COMMENT 'Defect number to trace (NULL to search by part)',
  part_number STRING COMMENT 'Part number to trace (NULL to search by defect)',
  start_date STRING COMMENT 'Start date. Format: YYYY-MM-DD',
  end_date STRING COMMENT 'End date. Format: YYYY-MM-DD'
)
RETURNS TABLE (
  defect_type STRING, defect STRING, defect_item DECIMAL,
  defect_description STRING, resolution_description STRING,
  pn STRING, pn_description STRING, sn STRING, qty DECIMAL,
  fault_confirm STRING, shop_finding STRING, work_done STRING,
  reported_date DATE, ac STRING
)
COMMENT 'LLM: Traces end-to-end defect→part→shop-finding linkage. The critical join no legacy tool supports. Example questions: "Which parts were implicated in defect X?", "Show all defects and shop findings for part number Y"'
RETURN
  SELECT ...;
```

---

## 📦 Inventory & Spares

### 7. `get_spare_availability_by_station`

**Agent Domain:** 📦 Inventory & Spares
**Gold Tables:** `fact_inventory_snapshot`, `dim_part`, `dim_station`
**Use Case Refs:** UC-006

**Why not a Metric View?** Requires parameterized station and part filtering with condition-code breakdown — multi-dimension pivoting.

```sql
CREATE OR REPLACE FUNCTION ${catalog}.${gold_schema}.get_spare_availability_by_station(
  part_number STRING COMMENT 'Part number (NULL for all)',
  station STRING COMMENT 'Station code (NULL for all stations)',
  condition_filter STRING COMMENT 'Condition code filter (SVC, UNS, AOG, etc.) or NULL for all'
)
RETURNS TABLE (
  pn STRING, pn_description STRING, category STRING,
  station_code STRING, station_name STRING, condition STRING,
  instance_count BIGINT, total_value DECIMAL, currency STRING
)
COMMENT 'LLM: Returns spare inventory availability by station and condition. Critical for AOG response and spare positioning. Example questions: "How many serviceable spares of P/N X at PDX?", "Which parts have fewer than 2 serviceable spares?"'
RETURN
  SELECT ...;
```

---

### 8. `get_llp_redline_status`

**Agent Domain:** 📦 Inventory & Spares
**Gold Tables:** `fact_inventory_control`, `dim_part`
**Use Case Refs:** UC-005

**Why not a Metric View?** Requires parameterized threshold filtering (remaining cycles < N) and multi-control-type logic.

```sql
CREATE OR REPLACE FUNCTION ${catalog}.${gold_schema}.get_llp_redline_status(
  remaining_cycles_threshold DECIMAL COMMENT 'Alert threshold for remaining cycles (e.g., 1000)',
  remaining_hours_threshold DECIMAL COMMENT 'Alert threshold for remaining hours (e.g., 2000)',
  control_type STRING COMMENT 'Control type filter (Hard Time, On Condition, TBO) or NULL for all'
)
RETURNS TABLE (
  pn STRING, pn_description STRING, sn STRING, control STRING,
  schedule_hours DECIMAL, actual_hours DECIMAL, remaining_hours DECIMAL,
  schedule_cycles DECIMAL, actual_cycles DECIMAL, remaining_cycles DECIMAL,
  schedule_days DECIMAL, actual_days DECIMAL, remaining_days DECIMAL,
  urgency_rank BIGINT
)
COMMENT 'LLM: Returns LLP red-line status for controlled propulsion components. Ranks by urgency. Example questions: "Which LLPs have fewer than 1000 cycles remaining?", "Fleet scan for parts within 500 cycles of hard limit"'
RETURN
  SELECT ...;
```

---

### 9. `get_inventory_movement_velocity`

**Agent Domain:** 📦 Inventory & Spares
**Gold Tables:** `fact_inventory_transaction`, `dim_part`, `dim_station`, `dim_date`
**Use Case Refs:** UC-007

**Why not a Metric View?** Requires parameterized rolling-window velocity calculations with station and transaction type filtering.

```sql
CREATE OR REPLACE FUNCTION ${catalog}.${gold_schema}.get_inventory_movement_velocity(
  part_number STRING COMMENT 'Part number (NULL for all)',
  station STRING COMMENT 'Station code (NULL for all)',
  start_date STRING COMMENT 'Start date. Format: YYYY-MM-DD',
  end_date STRING COMMENT 'End date. Format: YYYY-MM-DD',
  transaction_type_filter STRING COMMENT 'Transaction type filter or NULL for all'
)
RETURNS TABLE (
  pn STRING, pn_description STRING, station_code STRING,
  transaction_type STRING, period_month DATE,
  movement_count BIGINT, total_qty DECIMAL
)
COMMENT 'LLM: Returns inventory movement velocity by P/N, station, and transaction type. Enables removal velocity and stock positioning analytics. Example questions: "What is the removal velocity for high-value rotables?", "Top 10 P/Ns by transaction volume this month"'
RETURN
  SELECT ...;
```

---

## 🛠️ Procurement & Overhaul

### 10. `get_order_status_summary`

**Agent Domain:** 🛠️ Procurement & Overhaul
**Gold Tables:** `fact_order`, `dim_part`, `dim_date`
**Use Case Refs:** UC-008

**Why not a Metric View?** Requires parameterized order type filtering, lead-time calculations, and open/overdue status logic.

```sql
CREATE OR REPLACE FUNCTION ${catalog}.${gold_schema}.get_order_status_summary(
  order_type_filter STRING COMMENT 'Order type filter (Purchase, Repair, Exchange) or NULL for all',
  status_filter STRING COMMENT 'Status filter (Open, Closed, etc.) or NULL for all',
  start_date STRING COMMENT 'Start date. Format: YYYY-MM-DD',
  end_date STRING COMMENT 'End date. Format: YYYY-MM-DD'
)
RETURNS TABLE (
  order_type STRING, order_number DECIMAL, order_line DECIMAL,
  pn STRING, pn_description STRING, sn STRING, status STRING,
  exchange_repair_cost DECIMAL, qty_require DECIMAL, qty_received DECIMAL,
  lead_time DECIMAL, order_date DATE, fulfillment_rate DECIMAL
)
COMMENT 'LLM: Returns procurement and repair order status with cost and fulfillment metrics. Example questions: "Which open orders have exceeded lead time?", "Total repair cost by order type this quarter"'
RETURN
  SELECT ...;
```

---

### 11. `get_shop_findings_by_part`

**Agent Domain:** 🛠️ Procurement & Overhaul
**Gold Tables:** `fact_teardown`, `dim_part`, `dim_ata_chapter`
**Use Case Refs:** UC-004, UC-009

**Why not a Metric View?** Requires multi-table join with parameterized part/ATA filtering and full text search across shop_finding narratives.

```sql
CREATE OR REPLACE FUNCTION ${catalog}.${gold_schema}.get_shop_findings_by_part(
  part_number STRING COMMENT 'Part number (NULL for all)',
  ata_chapter DECIMAL COMMENT 'ATA chapter filter (NULL for all)',
  start_date STRING COMMENT 'Start date. Format: YYYY-MM-DD',
  end_date STRING COMMENT 'End date. Format: YYYY-MM-DD'
)
RETURNS TABLE (
  order_type STRING, order_number DECIMAL, order_line DECIMAL,
  pn STRING, pn_description STRING, sn STRING,
  chapter DECIMAL, chapter_description STRING,
  fault_confirm STRING, shop_finding STRING, work_done STRING,
  status STRING, created_date DATE,
  defect_type STRING, defect STRING
)
COMMENT 'LLM: Returns teardown shop findings linked to originating defects. Critical for root cause analysis and failure mode identification. Example questions: "Most common shop findings for ATA 73?", "Show teardown reports for part X with fault confirmation status"'
RETURN
  SELECT ...;
```

---

## Rationalization Notes

- **11 TVFs for 13 Gold tables** (~0.85 TVFs per table) — within the right-sizing guide (5-15 for 5-10 tables).
- Every TVF requires parameterized multi-table joins that Metric Views cannot answer alone.
- No TVF duplicates a Metric View's measures — they complement each other.
- All parameters use `STRING` type for date parameters (Genie compatible) and include `COMMENT` annotations.
- All TVFs include LLM-friendly `COMMENT` strings with example questions.
