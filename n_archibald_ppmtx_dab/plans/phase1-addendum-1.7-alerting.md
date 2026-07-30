# Phase 1 Addendum 1.7 — Alerting Framework

> **Agent Domain Framework applies.** Alerts organized by domain with severity tiers.
> **Planning Source:** `gold_design` | **Readiness:** `gold_design_only`
> **Back to:** [phase1-use-cases.md](phase1-use-cases.md)

---

## Summary

| # | Alert ID | Severity | Domain | Trigger | Use Case Refs |
|---|----------|----------|--------|---------|---------------|
| 1 | DEFECT-001-CRIT | 🔴 Critical | ⚠️ Defect Intelligence | In-Flight Shut Down detected | UC-003 |
| 2 | DEFECT-002-WARN | 🟡 Warning | ⚠️ Defect Intelligence | ATA chapter defect rate > 2σ rolling avg | UC-002 |
| 3 | INV-001-CRIT | 🔴 Critical | 📦 Inventory & Spares | Stock-out risk: < 2 SVC spares + high removal velocity | UC-006 |
| 4 | INV-002-WARN | 🟡 Warning | 📦 Inventory & Spares | LLP within 500 cycles of red-line | UC-005 |
| 5 | PROC-001-WARN | 🟡 Warning | 🛠️ Procurement & Overhaul | Repair order lead time exceeded threshold | UC-008 |
| 6 | REL-001-WARN | 🟡 Warning | ⚙️ Component Lifecycle | Unscheduled removal rate spike (> 2σ WoW) | UC-001 |
| 7 | DQ-001-WARN | 🟡 Warning | ⚠️ Defect Intelligence | Defect↔part linkage coverage < 80% | UC-004, UC-010 |

---

## Alert Definitions

### DEFECT-001-CRIT — In-Flight Shut Down Detected

**Domain:** ⚠️ Defect Intelligence
**Severity:** 🔴 Critical
**Use Case Refs:** UC-003
**Schedule:** Every 15 minutes
**Notification:** Email + Slack to Reliability Engineering, MOC

```sql
SELECT
  f.defect_type, f.defect, f.defect_item,
  a.ac AS aircraft,
  c.chapter, c.chapter_description,
  f.defect_description,
  d.calendar_date AS reported_date
FROM ${catalog}.${gold_schema}.qx_ppmtx_gold_fact_defect f
JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_aircraft a ON f.dim_aircraft_key = a.dim_aircraft_key
LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_ata_chapter c ON f.dim_ata_chapter_key = c.dim_ata_chapter_key
JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_date d ON f.reported_date_key = d.dim_date_key
WHERE f.i_f_s_d = 'Y'
  AND d.calendar_date >= CURRENT_DATE - INTERVAL 1 DAY
```

**Threshold:** Any row returned = ALERT

---

### DEFECT-002-WARN — ATA Defect Rate Anomaly

**Domain:** ⚠️ Defect Intelligence
**Severity:** 🟡 Warning
**Use Case Refs:** UC-002
**Schedule:** Daily
**Notification:** Email to Reliability Engineering

```sql
-- Compare current week defect count by ATA chapter to 12-week rolling average
-- Alert when current week > rolling_avg + 2 * rolling_stddev
WITH weekly_counts AS (
  SELECT c.chapter, c.chapter_description, d.week_of_year, d.year,
    COUNT(*) AS defect_count
  FROM ${catalog}.${gold_schema}.qx_ppmtx_gold_fact_defect f
  JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_ata_chapter c ON f.dim_ata_chapter_key = c.dim_ata_chapter_key
  JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_date d ON f.reported_date_key = d.dim_date_key
  WHERE d.calendar_date >= CURRENT_DATE - INTERVAL 13 WEEK
  GROUP BY c.chapter, c.chapter_description, d.week_of_year, d.year
)
SELECT chapter, chapter_description, defect_count AS current_week_count,
  rolling_avg, rolling_stddev, (defect_count - rolling_avg) / NULLIF(rolling_stddev, 0) AS z_score
FROM (...)
WHERE z_score > 2.0
```

**Threshold:** z_score > 2.0

---

### INV-001-CRIT — Spare Stock-Out Risk

**Domain:** 📦 Inventory & Spares
**Severity:** 🔴 Critical
**Use Case Refs:** UC-006
**Schedule:** Every 4 hours
**Notification:** Email + Slack to Materials/Inventory, MOC

```sql
-- P/Ns with < 2 serviceable spares AND ≥ 3 unscheduled removals in last 90 days
WITH spare_counts AS (
  SELECT p.pn, p.pn_description, COUNT(*) AS svc_count
  FROM ${catalog}.${gold_schema}.qx_ppmtx_gold_fact_inventory_snapshot s
  JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_part p ON s.dim_part_key = p.dim_part_key
  WHERE s.condition = 'SVC' AND s.installed_ac IS NULL
  GROUP BY p.pn, p.pn_description
  HAVING COUNT(*) < 2
),
recent_removals AS (
  SELECT p.pn, COUNT(*) AS removal_count
  FROM ${catalog}.${gold_schema}.qx_ppmtx_gold_fact_component_removal r
  JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_part p ON r.dim_part_key = p.dim_part_key
  JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_date d ON r.transaction_date_key = d.dim_date_key
  WHERE r.schedule_category = 'Unscheduled' AND d.calendar_date >= CURRENT_DATE - INTERVAL 90 DAY
  GROUP BY p.pn
  HAVING COUNT(*) >= 3
)
SELECT s.pn, s.pn_description, s.svc_count, r.removal_count
FROM spare_counts s JOIN recent_removals r ON s.pn = r.pn
```

**Threshold:** Any row returned = ALERT

---

### INV-002-WARN — LLP Approaching Red-Line

**Domain:** 📦 Inventory & Spares
**Severity:** 🟡 Warning
**Use Case Refs:** UC-005
**Schedule:** Daily
**Notification:** Email to Powerplant Engineering

```sql
SELECT p.pn, p.pn_description, ic.sn, ic.control,
  ic.remaining_cycles, ic.remaining_hours, ic.remaining_days
FROM ${catalog}.${gold_schema}.qx_ppmtx_gold_fact_inventory_control ic
JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_part p ON ic.dim_part_key = p.dim_part_key
WHERE (ic.remaining_cycles IS NOT NULL AND ic.remaining_cycles < 500)
   OR (ic.remaining_hours IS NOT NULL AND ic.remaining_hours < 1000)
```

**Threshold:** Any row returned = ALERT

---

### PROC-001-WARN — Repair Order Lead Time Exceeded

**Domain:** 🛠️ Procurement & Overhaul
**Severity:** 🟡 Warning
**Use Case Refs:** UC-008
**Schedule:** Daily
**Notification:** Email to Materials/Procurement

```sql
SELECT o.order_type, o.order_number, o.order_line,
  p.pn, p.pn_description, o.status, o.lead_time,
  d.calendar_date AS order_date
FROM ${catalog}.${gold_schema}.qx_ppmtx_gold_fact_order o
JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_part p ON o.dim_part_key = p.dim_part_key
JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_date d ON o.order_date_key = d.dim_date_key
WHERE o.status = 'Open'
  AND o.lead_time IS NOT NULL
  AND DATEDIFF(CURRENT_DATE, d.calendar_date) > o.lead_time
```

**Threshold:** Any row returned = ALERT

---

### REL-001-WARN — Unscheduled Removal Rate Spike

**Domain:** ⚙️ Component Lifecycle & Reliability
**Severity:** 🟡 Warning
**Use Case Refs:** UC-001
**Schedule:** Weekly
**Notification:** Email to Reliability Engineering

```sql
-- Alert when current week unscheduled removals > 12-week rolling avg + 2σ
-- Similar structure to DEFECT-002-WARN but on fact_component_removal
```

**Threshold:** z_score > 2.0

---

### DQ-001-WARN — Defect↔Part Linkage Coverage Low

**Domain:** ⚠️ Defect Intelligence
**Severity:** 🟡 Warning
**Use Case Refs:** UC-004, UC-010
**Schedule:** Daily
**Notification:** Email to Data Engineering, Reliability Engineering

```sql
SELECT
  COUNT(DISTINCT CONCAT(f.defect_type, f.defect, CAST(f.defect_item AS STRING))) AS total_defects,
  COUNT(DISTINCT CONCAT(b.defect_type, b.defect, CAST(b.defect_item AS STRING))) AS linked_defects,
  ROUND(COUNT(DISTINCT CONCAT(b.defect_type, b.defect, CAST(b.defect_item AS STRING)))
    / NULLIF(COUNT(DISTINCT CONCAT(f.defect_type, f.defect, CAST(f.defect_item AS STRING))), 0) * 100, 1) AS coverage_pct
FROM ${catalog}.${gold_schema}.qx_ppmtx_gold_fact_defect f
LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_bridge_defect_part b
  ON f.defect_type = b.defect_type AND f.defect = b.defect AND f.defect_item = b.defect_item
HAVING coverage_pct < 80
```

**Threshold:** coverage_pct < 80%

---

## Success Criteria

| Criteria | Target |
|----------|--------|
| Critical alerts trigger within 15 min of event | ≤ 15 min |
| Warning alerts assessed daily | Daily |
| All alerts use Gold layer tables exclusively | 100% |
| Each alert traces to a use case | 100% |
| Zero false positive rate on IFSD alert | 0% FP |
