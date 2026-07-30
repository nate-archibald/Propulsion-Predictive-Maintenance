# Use Case Catalog — QX Predictive Maintenance

> **Planning Mode:** Data Product Acceleration (default)
> **Planning Source:** `gold_design`
> **Generated:** 2026-06-24

---

## Use Case Summary

| UC# | Use Case Name | Domain | Gold Tables | Artifact Types | Personas |
|-----|--------------|--------|-------------|---------------|----------|
| UC-001 | Component Reliability Trending | ⚙️ Component Lifecycle | fact_component_removal, dim_part, dim_aircraft, dim_date | TVF, MV, Dashboard, Monitor | Nate, Erika |
| UC-002 | ATA Hotspot Analysis | ⚠️ Defect Intelligence | fact_defect, dim_ata_chapter, dim_aircraft, dim_date | TVF, MV, Dashboard, Alert | Nate, Will |
| UC-003 | Operational Impact Attribution | ⚠️ Defect Intelligence | fact_defect, dim_aircraft, dim_ata_chapter, dim_date | TVF, MV, Dashboard, Alert | Nate, Corey, Will |
| UC-004 | Defect-to-Part Linkage | ⚠️ Defect Intelligence | fact_defect, bridge_defect_part, dim_part, fact_teardown | TVF, Dashboard | Nate, Corey |
| UC-005 | LLP Red-Line Fleet Scan | 📦 Inventory & Spares | fact_inventory_control, dim_part, dim_date | TVF, Dashboard, Alert | Erika |
| UC-006 | Spare Availability & Stock-Out Risk | 📦 Inventory & Spares | fact_inventory_snapshot, dim_part, dim_station | TVF, MV, Dashboard, Alert | Bill, Corey |
| UC-007 | Inventory Movement Analytics | 📦 Inventory & Spares | fact_inventory_transaction, dim_part, dim_station, dim_date | TVF, MV, Monitor | Bill |
| UC-008 | Procurement & Repair Order Tracking | 🛠️ Procurement & Overhaul | fact_order, dim_part, dim_date | TVF, MV, Dashboard, Alert | Bill |
| UC-009 | Shop Finding Root Cause Analysis | 🛠️ Procurement & Overhaul | fact_teardown, dim_part, dim_ata_chapter | TVF, MV, Dashboard | Nate, Erika |
| UC-010 | Monthly Reliability Reporting | Cross-domain | All fact tables, all dimensions | Dashboard, MV | Will |

---

## Use Case Details

### UC-001: Component Reliability Trending

**Agent Domain:** ⚙️ Component Lifecycle & Reliability
**Gold Tables:** `fact_component_removal`, `dim_part`, `dim_aircraft`, `dim_station`, `dim_ata_chapter`, `dim_date`
**Personas:** Nate (Propulsion Reliability Engineer), Erika (Powerplant Engineer)

**Business Questions:**
1. "What is the MTBUR (mean time between unscheduled removals) for part number X over the last 24 months?"
2. "Which propulsion part numbers have the highest removal velocity this quarter compared to last quarter?"
3. "What is the hours-at-failure distribution for HPT shroud P/N across the fleet?"
4. "Which aircraft tails have the most component removals in the last 90 days?"
5. "What is the time-on-wing trend for CF34-8E engine LRUs by reason category?"

**Implementing Artifacts:**
- TVF: `get_component_removal_history`, `get_mtbur_analysis`, `get_time_on_wing_distribution`
- MV: `component_lifecycle_analytics_metrics`
- Dashboard: Propulsion Reliability Overview
- Monitor: `fact_component_removal` TimeSeries monitor

---

### UC-002: ATA Hotspot Analysis

**Agent Domain:** ⚠️ Defect Intelligence
**Gold Tables:** `fact_defect`, `dim_ata_chapter`, `dim_aircraft`, `dim_date`
**Personas:** Nate (Propulsion Reliability Engineer), Will (Program Manager)

**Business Questions:**
1. "Which ATA chapters are trending up in defect volume week-over-week?"
2. "What are the top 5 ATA sections by total defect count for the last 6 months?"
3. "Are there any emerging ATA hotspots in ATA 73 (Engine Fuel & Control) this quarter?"
4. "Which ATA chapter/section combinations have the highest defect recurrence rate?"
5. "How does ATA 72 (Engine) defect volume compare year-over-year?"

**Implementing Artifacts:**
- TVF: `get_defect_trending_by_ata`
- MV: `defect_intelligence_analytics_metrics`
- Dashboard: Defect Intelligence Dashboard
- Alert: `DEFECT-002-WARN` (ATA defect rate exceeds 2σ)

---

### UC-003: Operational Impact Attribution

**Agent Domain:** ⚠️ Defect Intelligence
**Gold Tables:** `fact_defect`, `dim_aircraft`, `dim_ata_chapter`, `dim_date`
**Personas:** Nate, Corey (MOC Controller), Will (Program Manager)

**Business Questions:**
1. "What are the top 10 ATA sections by total delay minutes this month?"
2. "How many flight cancellations were caused by propulsion defects in the last quarter?"
3. "Which aircraft tails have accumulated the most delay hours from propulsion issues?"
4. "What is the month-over-month trend of IFSD (In-Flight Shut Down) events?"
5. "What percentage of propulsion defects result in MEL deferrals vs immediate resolution?"

**Implementing Artifacts:**
- TVF: `get_operational_impact_summary`
- MV: `defect_intelligence_analytics_metrics`
- Dashboard: Defect Intelligence Dashboard, Executive Reliability Summary
- Alert: `DEFECT-001-CRIT` (IFSD detected), `REL-001-WARN` (impact spike)

---

### UC-004: Defect-to-Part Linkage Investigation

**Agent Domain:** ⚠️ Defect Intelligence
**Gold Tables:** `fact_defect`, `bridge_defect_part`, `dim_part`, `fact_teardown`
**Personas:** Nate, Corey

**Business Questions:**
1. "Which parts were implicated in defect ID X, and what were the shop findings?"
2. "For part number Y, what is the complete defect history with linked shop findings?"
3. "Which defects in the last 90 days have unresolved part linkages?"
4. "What is the defect↔part linkage coverage rate (data quality metric)?"
5. "Which part numbers have the highest count of confirmed fault findings from teardown?"

**Implementing Artifacts:**
- TVF: `get_defect_part_linkage`
- Dashboard: Defect Intelligence Dashboard
- Alert: `DQ-001-WARN` (linkage coverage below threshold)

---

### UC-005: LLP Red-Line Fleet Scan

**Agent Domain:** 📦 Inventory & Spares
**Gold Tables:** `fact_inventory_control`, `dim_part`, `dim_date`
**Personas:** Erika (Powerplant Engineer)

**Business Questions:**
1. "Which LLPs across the fleet have fewer than 1,000 cycles remaining to red-line?"
2. "Which engines have parts within 500 cycles of a hard maintenance limit?"
3. "What is the remaining hours/cycles/days breakdown for all controlled parts on tail N193QX?"
4. "How many parts fleet-wide will exceed their cycle limit in the next 6 months at current utilization?"
5. "Which control types (Hard Time, On Condition, TBO) have the most components approaching limits?"

**Implementing Artifacts:**
- TVF: `get_llp_redline_status`
- Dashboard: Inventory & Spares Dashboard
- Alert: `INV-002-WARN` (LLP approaching red-line)

---

### UC-006: Spare Availability & Stock-Out Risk

**Agent Domain:** 📦 Inventory & Spares
**Gold Tables:** `fact_inventory_snapshot`, `dim_part`, `dim_station`
**Personas:** Bill (Inventory Planner), Corey (MOC Controller)

**Business Questions:**
1. "Which P/Ns have fewer than two serviceable spares and three or more unscheduled removals in the last 90 days?"
2. "What is the current serviceable spare count at station PDX for part number X?"
3. "Which stations have the highest stock-out risk based on recent removal velocity?"
4. "What is the total inventory value by station and condition code?"
5. "Which parts are in AOG condition and where are they located?"

**Implementing Artifacts:**
- TVF: `get_spare_availability_by_station`
- MV: `inventory_spares_analytics_metrics`
- Dashboard: Inventory & Spares Dashboard
- Alert: `INV-001-CRIT` (stock-out risk)

---

### UC-007: Inventory Movement Analytics

**Agent Domain:** 📦 Inventory & Spares
**Gold Tables:** `fact_inventory_transaction`, `dim_part`, `dim_station`, `dim_date`
**Personas:** Bill (Inventory Planner)

**Business Questions:**
1. "What is the removal velocity (removals per 1,000 flight hours) for high-value rotables this quarter?"
2. "What are the top 10 part numbers by inventory transaction volume this month?"
3. "How do condition-code transitions (SVC→UNS→SCR) flow for propulsion spares?"
4. "Which stations have the most receipt vs issue imbalance?"

**Implementing Artifacts:**
- TVF: `get_inventory_movement_velocity`
- MV: `inventory_spares_analytics_metrics`
- Monitor: `fact_inventory_transaction` TimeSeries monitor

---

### UC-008: Procurement & Repair Order Tracking

**Agent Domain:** 🛠️ Procurement & Overhaul
**Gold Tables:** `fact_order`, `dim_part`, `dim_date`
**Personas:** Bill (Inventory Planner)

**Business Questions:**
1. "What is the average lead time for exchange/repair orders by part category?"
2. "Which open orders have exceeded their expected lead time?"
3. "What is the total repair cost by order type (Purchase, Repair, Exchange) this quarter?"
4. "Which part numbers have the highest unfulfilled order backlog?"
5. "What is the order fulfillment rate (qty_received / qty_require) trend over the last 12 months?"

**Implementing Artifacts:**
- TVF: `get_order_status_summary`
- MV: `procurement_overhaul_analytics_metrics`
- Dashboard: Procurement & Overhaul Dashboard
- Alert: `PROC-001-WARN` (lead time exceeded)

---

### UC-009: Shop Finding Root Cause Analysis

**Agent Domain:** 🛠️ Procurement & Overhaul
**Gold Tables:** `fact_teardown`, `dim_part`, `dim_ata_chapter`
**Personas:** Nate, Erika

**Business Questions:**
1. "What are the most common shop findings for ATA 73 teardowns in the last 12 months?"
2. "What is the fault confirmation rate (confirmed vs NFF) by ATA chapter?"
3. "Which part numbers have the highest frequency of confirmed fault findings?"
4. "For part X, show all teardown reports with work done and shop findings chronologically."
5. "Are there any emerging failure modes in recent teardown reports?"

**Implementing Artifacts:**
- TVF: `get_shop_findings_by_part`
- MV: `procurement_overhaul_analytics_metrics`
- Dashboard: Procurement & Overhaul Dashboard

---

### UC-010: Monthly Reliability Program Reporting

**Agent Domain:** Cross-domain
**Gold Tables:** All fact tables, all dimensions
**Personas:** Will (Reliability Program Manager)

**Business Questions:**
1. "What are the top 10 ATA sections by delay minutes for the current reporting period?"
2. "What are the top 10 P/Ns by cancellation-attributable removals?"
3. "What is the fleet-wide weekly defect trend for the last 12 weeks?"
4. "What is the defect↔part linkage coverage percentage (data quality metric)?"
5. "What is the overall MTBUR trend for the fleet this year vs last year?"

**Implementing Artifacts:**
- Dashboard: Executive Reliability Summary
- MV: All 4 metric views
- TVF: Multiple TVFs across domains

---

## Traceability Matrix

| Artifact | UC-001 | UC-002 | UC-003 | UC-004 | UC-005 | UC-006 | UC-007 | UC-008 | UC-009 | UC-010 |
|----------|--------|--------|--------|--------|--------|--------|--------|--------|--------|--------|
| get_component_removal_history | ✅ | | | | | | | | | ✅ |
| get_mtbur_analysis | ✅ | | | | | | | | | ✅ |
| get_time_on_wing_distribution | ✅ | | | | | | | | | |
| get_defect_trending_by_ata | | ✅ | ✅ | | | | | | | ✅ |
| get_operational_impact_summary | | | ✅ | | | | | | | ✅ |
| get_defect_part_linkage | | | | ✅ | | | | | | |
| get_spare_availability_by_station | | | | | | ✅ | | | | |
| get_llp_redline_status | | | | | ✅ | | | | | |
| get_inventory_movement_velocity | | | | | | | ✅ | | | |
| get_order_status_summary | | | | | | | | ✅ | | |
| get_shop_findings_by_part | | | | ✅ | | | | | ✅ | |
| component_lifecycle_analytics_metrics | ✅ | | | | | | | | | ✅ |
| defect_intelligence_analytics_metrics | | ✅ | ✅ | | | | | | | ✅ |
| inventory_spares_analytics_metrics | | | | | | ✅ | ✅ | | | |
| procurement_overhaul_analytics_metrics | | | | | | | | ✅ | ✅ | |
