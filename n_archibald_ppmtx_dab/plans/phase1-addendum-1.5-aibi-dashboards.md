# Phase 1 Addendum 1.5 — AI/BI Dashboards

> **Agent Domain Framework applies.** Dashboards aligned to personas and domains.
> **Planning Source:** `gold_design` | **Readiness:** `gold_design_only`
> **Back to:** [phase1-use-cases.md](phase1-use-cases.md)

---

## Summary

| # | Dashboard | Domain | Primary Persona | Key Metrics | Use Case Refs |
|---|-----------|--------|----------------|-------------|---------------|
| 1 | Propulsion Reliability Overview | ⚙️ Component Lifecycle | Nate, Erika | Removal count, MTBUR, hours-at-failure, scheduled vs unscheduled ratio | UC-001, UC-010 |
| 2 | Defect Intelligence Dashboard | ⚠️ Defect Intelligence | Nate, Corey | Defect volume by ATA, delay minutes, cancellations, IFSDs, deferral rate | UC-002, UC-003, UC-004 |
| 3 | Inventory & Spares Dashboard | 📦 Inventory & Spares | Bill, Corey | Spare counts by station/condition, stock-out risk, LLP red-line fleet scan | UC-005, UC-006, UC-007 |
| 4 | Procurement & Overhaul Dashboard | 🛠️ Procurement & Overhaul | Bill, Erika | Order status, lead time, repair costs, shop findings, fault confirmation rate | UC-008, UC-009 |
| 5 | Executive Reliability Summary | Cross-domain | Will | Top 10 ATA by delays, top 10 P/Ns by cancellations, fleet trend, DQ metrics | UC-010 |

---

## Dashboard Designs

### 1. Propulsion Reliability Overview

**Persona:** Nate (Propulsion Reliability Engineer), Erika (Powerplant Engineer)
**Data Sources:** `component_lifecycle_analytics_metrics`, `get_component_removal_history`, `get_mtbur_analysis`

**Widgets:**
1. **Removal Volume Trend** — Weekly removal count (line chart, 52 weeks), split by scheduled/unscheduled
2. **MTBUR by Top Part Numbers** — Bar chart, top 15 P/Ns by lowest MTBUR
3. **Hours-at-Failure Distribution** — Histogram for selected P/N, selectable via filter
4. **Removals by ATA Chapter** — Treemap, sized by removal count, colored by unscheduled ratio
5. **Removal by Station** — Horizontal bar chart, removals by station, last 90 days
6. **Removal by Aircraft Tail** — Table, top 10 tails by removal count
7. **Scheduled vs Unscheduled Ratio Trend** — Area chart, monthly ratio over 24 months
8. **Removal Reason Category Breakdown** — Donut chart

**Global Filters:** Date range, Part number, Aircraft tail, Station, ATA chapter, Reason category

---

### 2. Defect Intelligence Dashboard

**Persona:** Nate (Reliability Engineer), Corey (MOC Controller)
**Data Sources:** `defect_intelligence_analytics_metrics`, `get_defect_trending_by_ata`, `get_defect_part_linkage`

**Widgets:**
1. **Defect Volume Trend** — Weekly defect count (line chart, 52 weeks)
2. **ATA Hotspot Heatmap** — Chapter × Week heatmap, color by defect count
3. **Top 10 ATA Sections by Delay Minutes** — Horizontal bar chart, current period
4. **Operational Impact Summary** — KPI cards: total delays, total cancellations, total IFSDs, total delay hours
5. **Cancellation Trend** — Monthly cancellation count (bar chart) with rolling average line
6. **Deferral Analysis** — Stacked bar: MEL vs non-MEL, open vs closed deferrals
7. **Defect↔Part Linkage Coverage** — Gauge showing % of defects with linked parts (DQ metric)
8. **Recent Defects Table** — Sortable table with defect description, ATA, aircraft, status, impact

**Global Filters:** Date range, ATA chapter/section, Aircraft tail, Defect type, Status

---

### 3. Inventory & Spares Dashboard

**Persona:** Bill (Inventory Planner), Corey (MOC Controller)
**Data Sources:** `inventory_spares_analytics_metrics`, `get_spare_availability_by_station`, `get_llp_redline_status`

**Widgets:**
1. **Inventory Overview KPIs** — Cards: total instances, serviceable count, AOG count, total value
2. **Spare Availability by Station** — Stacked bar by station, colored by condition
3. **Stock-Out Risk Table** — P/Ns with < 2 serviceable spares and high removal velocity, ranked
4. **LLP Red-Line Fleet Scan** — Table: parts within 1,000 cycles of limit, sorted by urgency
5. **Condition Code Distribution** — Donut: SVC / UNS / SCR / AOG / other
6. **Inventory Movement Trend** — Monthly transaction volume (line chart), split by type
7. **Station Coverage Map** — Table view of all stations with spare positioning summary
8. **Parts on AOG Hold** — Table of parts in AOG condition with location and P/N

**Global Filters:** Part number, Station, Condition code, Category

---

### 4. Procurement & Overhaul Dashboard

**Persona:** Bill (Inventory Planner), Erika (Powerplant Engineer)
**Data Sources:** `procurement_overhaul_analytics_metrics`, `get_order_status_summary`, `get_shop_findings_by_part`

**Widgets:**
1. **Open Orders Summary** — KPI cards: open orders, overdue orders, total order value, avg lead time
2. **Order Status by Type** — Stacked bar: Purchase/Repair/Exchange × status
3. **Lead Time Trend** — Monthly average lead time (line chart) with threshold line
4. **Repair Cost by Order Type** — Bar chart, quarterly view
5. **Fulfillment Rate Trend** — Line chart, monthly qty_received/qty_require
6. **Top Shop Findings** — Bar chart: most common shop findings by count, last 12 months
7. **Fault Confirmation Rate** — Gauge: confirmed faults vs NFF (No Fault Found)
8. **Overdue Orders Table** — Sortable table of orders exceeding expected lead time

**Global Filters:** Date range, Order type, Part number, Status

---

### 5. Executive Reliability Summary

**Persona:** Will (Reliability Program Manager)
**Data Sources:** All 4 metric views, `get_operational_impact_summary`, `get_mtbur_analysis`

**Widgets:**
1. **Executive KPIs** — Large cards: total defects, total delay hours, cancellations, IFSDs, fleet MTBUR
2. **Top 10 ATA Sections by Delay Minutes** — Horizontal bar for current reporting period
3. **Top 10 P/Ns by Cancellation-Attributable Removals** — Horizontal bar
4. **Fleet-Wide Weekly Defect Trend** — Line chart, 12-week rolling view
5. **MTBUR Fleet Trend** — Line chart, monthly fleet-wide MTBUR (hours), YoY comparison
6. **Data Quality Scorecard** — Table: defect↔part linkage %, FK null rates, freshness
7. **Inventory Health Summary** — Serviceable ratio, AOG count, stock-out risk count
8. **Period-over-Period Change** — Comparison cards showing MoM delta for key metrics

**Global Filters:** Reporting period (month/quarter), ATA chapter scope

---

## Success Criteria

| Criteria | Target |
|----------|--------|
| All 5 personas served by at least one dashboard | 100% |
| Each dashboard ≤ 10 widgets | ≤ 10 |
| Every widget traces to a business question | 100% |
| All dashboards use Gold layer tables (via Metric Views or TVFs) | 100% |
