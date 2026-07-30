# Phase 1 Addendum 1.4 — Lakehouse Monitoring

> **Agent Domain Framework applies.** One monitor per Gold table.
> **Planning Source:** `gold_design` | **Readiness:** `gold_design_only`
> **Back to:** [phase1-use-cases.md](phase1-use-cases.md)

---

## Summary

| # | Table | Monitor Type | Timestamp Column | Domain | Use Case Refs |
|---|-------|-------------|-----------------|--------|---------------|
| 1 | `fact_component_removal` | TimeSeries | `transaction_date_key` → dim_date | ⚙️ Component Lifecycle | UC-001 |
| 2 | `fact_defect` | TimeSeries | `reported_date_key` → dim_date | ⚠️ Defect Intelligence | UC-002, UC-003 |
| 3 | `fact_inventory_transaction` | TimeSeries | `transaction_date_key` → dim_date | 📦 Inventory & Spares | UC-007 |
| 4 | `fact_inventory_snapshot` | Snapshot | — | 📦 Inventory & Spares | UC-006 |
| 5 | `fact_inventory_control` | Snapshot | — | 📦 Inventory & Spares | UC-005 |
| 6 | `fact_order` | TimeSeries | `order_date_key` → dim_date | 🛠️ Procurement & Overhaul | UC-008 |
| 7 | `fact_teardown` | TimeSeries | `created_date_key` → dim_date | 🛠️ Procurement & Overhaul | UC-009 |
| 8 | `bridge_defect_part` | Snapshot | — | ⚠️ Defect Intelligence | UC-004 |
| 9 | `dim_part` | Snapshot | — | 🔧 Part Master | — |
| 10 | `dim_aircraft` | Snapshot | — | ⚙️ Component Lifecycle | — |
| 11 | `dim_station` | Snapshot | — | ⚙️ Component Lifecycle | — |
| 12 | `dim_ata_chapter` | Snapshot | — | ⚠️ Defect Intelligence | — |
| 13 | `dim_date` | Snapshot | — | 📅 Common | — |

**Note:** Timestamp columns use the date key FK → `dim_date.calendar_date` for business event dates (NOT audit timestamps).

---

## Fact Table Monitors (TimeSeries)

### 1. `fact_component_removal` Monitor

**Domain:** ⚙️ Component Lifecycle & Reliability
**Monitor Type:** TimeSeries
**Timestamp:** `transaction_date_key` (FK to dim_date — business event date)

**Custom Metrics:**
- `component_total_removals`: `COUNT(*)` — Total removal events
- `component_unscheduled_ratio`: `COUNT(CASE WHEN schedule_category = 'Unscheduled' THEN 1 END) / NULLIF(COUNT(*), 0)` — Unscheduled removal ratio
- `component_avg_hours_at_removal`: `AVG(hours_installed)` — Average hours at removal

**Slicing Expressions:** `schedule_category`, `transaction_type`, `reason_category`

### 2. `fact_defect` Monitor

**Domain:** ⚠️ Defect Intelligence
**Monitor Type:** TimeSeries
**Timestamp:** `reported_date_key` (FK to dim_date — business event date)

**Custom Metrics:**
- `defect_total_count`: `COUNT(*)` — Total defect events
- `defect_delay_rate`: `COUNT(CASE WHEN delay = 'Y' THEN 1 END) / NULLIF(COUNT(*), 0)` — Delay rate
- `defect_total_delay_minutes`: `SUM(delay_minutes)` — Total delay minutes
- `defect_cancel_count`: `COUNT(CASE WHEN cancellation = 'Y' THEN 1 END)` — Cancellation count
- `defect_ifsd_count`: `COUNT(CASE WHEN i_f_s_d = 'Y' THEN 1 END)` — IFSD event count

**Slicing Expressions:** `defect_type`, `defect_category`, `status`

### 3. `fact_inventory_transaction` Monitor

**Domain:** 📦 Inventory & Spares
**Monitor Type:** TimeSeries
**Timestamp:** `transaction_date_key` (FK to dim_date — business event date)

**Custom Metrics:**
- `inventory_movement_count`: `COUNT(*)` — Total movement events
- `inventory_total_qty`: `SUM(qty)` — Total quantity moved

**Slicing Expressions:** `transaction_type`, `condition`

### 4. `fact_order` Monitor

**Domain:** 🛠️ Procurement & Overhaul
**Monitor Type:** TimeSeries
**Timestamp:** `order_date_key` (FK to dim_date — business event date)

**Custom Metrics:**
- `order_total_cost`: `SUM(exchange_repair_cost)` — Total order cost
- `order_avg_lead_time`: `AVG(lead_time)` — Average lead time
- `order_fulfillment_rate`: `SUM(qty_received) / NULLIF(SUM(qty_require), 0)` — Fulfillment rate

**Slicing Expressions:** `order_type`, `status`

### 5. `fact_teardown` Monitor

**Domain:** 🛠️ Procurement & Overhaul
**Monitor Type:** TimeSeries
**Timestamp:** `created_date_key` (FK to dim_date — business event date)

**Custom Metrics:**
- `teardown_total_count`: `COUNT(*)` — Total teardown reports
- `teardown_fault_confirm_rate`: `COUNT(CASE WHEN fault_confirm = 'Y' THEN 1 END) / NULLIF(COUNT(*), 0)` — Fault confirmation rate

**Slicing Expressions:** `fault_confirm`, `status`

---

## Snapshot Monitors

### 6. `fact_inventory_snapshot` Monitor

**Domain:** 📦 Inventory & Spares
**Monitor Type:** Snapshot

**Custom Metrics:**
- `snapshot_total_instances`: `COUNT(*)` — Total inventory positions
- `snapshot_total_value`: `SUM(unit_cost)` — Total inventory value
- `snapshot_serviceable_ratio`: `COUNT(CASE WHEN condition = 'SVC' THEN 1 END) / NULLIF(COUNT(*), 0)` — Serviceable ratio

### 7. `fact_inventory_control` Monitor

**Domain:** 📦 Inventory & Spares
**Monitor Type:** Snapshot

**Custom Metrics:**
- `control_total_records`: `COUNT(*)` — Total controlled parts
- `control_critical_count`: `COUNT(CASE WHEN remaining_cycles < 1000 OR remaining_hours < 2000 THEN 1 END)` — Parts near red-line

### 8–13. Dimension and Bridge Monitors (Snapshot)

| Table | Custom Metric | Description |
|-------|--------------|-------------|
| `bridge_defect_part` | `bridge_record_count`: `COUNT(*)` | Linkage record count |
| `dim_part` | `part_count`: `COUNT(*)` | Total part master records |
| `dim_aircraft` | `aircraft_count`: `COUNT(*)` | Fleet size |
| `dim_station` | `station_count`: `COUNT(*)` | Station count |
| `dim_ata_chapter` | `ata_combination_count`: `COUNT(*)` | ATA chapter/section combos |
| `dim_date` | `date_range_days`: `DATEDIFF(MAX(calendar_date), MIN(calendar_date))` | Date range coverage |

---

## Success Criteria

| Criteria | Target |
|----------|--------|
| All 13 Gold tables monitored | 100% |
| TimeSeries monitors use business event dates (not audit timestamps) | 100% |
| Custom metrics trace to business KPIs | ≥ 1 per fact monitor |
| Anomaly detection enabled on all TimeSeries monitors | Yes |
