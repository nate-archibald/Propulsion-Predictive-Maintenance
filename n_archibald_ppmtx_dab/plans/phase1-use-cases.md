# Phase 1: Use Cases — QX Predictive Maintenance

> **Planning Mode:** Data Product Acceleration (default)
> **Planning Source:** `gold_design` | **Readiness:** `gold_design_only`
> **Generated:** 2026-06-24

---

## Overview

| Attribute | Value |
|-----------|-------|
| **Status** | Planned |
| **Dependencies** | Gold layer deployment (13 tables) |
| **Effort** | Phase 1 covers all analytics artifacts |
| **Domains** | 4 agent domains + shared dimensions |

## Agent Domains

| Domain | Icon | Focus Area | Key Gold Tables | Business Questions |
|--------|------|------------|-----------------|-------------------|
| Component Lifecycle & Reliability | ⚙️ | MTBUR, time-on-wing, removal trending, failure patterns | fact_component_removal, dim_aircraft, dim_station | 7 |
| Defect Intelligence | ⚠️ | Defect trending, ATA hotspots, operational impact, deferrals | fact_defect, bridge_defect_part, dim_ata_chapter | 8 |
| Inventory & Spares | 📦 | Spare positioning, LLP red-line, stock-out risk, movement velocity | fact_inventory_snapshot, fact_inventory_transaction, fact_inventory_control | 7 |
| Procurement & Overhaul | 🛠️ | Order tracking, shop findings, repair costs, lead times | fact_order, fact_teardown | 6 |

**Shared dimensions:** `dim_part` (17 cols), `dim_date` (9 cols) — used across all domains.

## Phase 1 Addendum Selection

| # | Addendum | Include? | Artifact Count |
|---|----------|----------|----------------|
| 1.1 | ML Models | Yes | 2 models, 2 feature tables |
| 1.2 | Table-Valued Functions | Yes | 11 TVFs |
| 1.3 | Metric Views | Yes | 4 metric views |
| 1.4 | Lakehouse Monitoring | Yes | 13 monitors |
| 1.5 | AI/BI Dashboards | Yes | 5 dashboards |
| 1.6 | Genie Spaces | Yes | 2 Genie Spaces |
| 1.7 | Alerting Framework | Yes | 7 alerts |

## Key Business Questions by Domain

### ⚙️ Component Lifecycle & Reliability

1. What is the MTBUR for part number X over the last 24 months?
2. Which propulsion part numbers have the highest removal velocity this quarter?
3. What is the hours-at-failure distribution for a given P/N across the fleet?
4. Which aircraft tails have the most component removals in the last 90 days?
5. What is the time-on-wing trend for CF34-8E engine LRUs by reason category?
6. What is the scheduled vs unscheduled removal ratio by ATA chapter?
7. Which engine positions (ENG1 vs ENG2) show higher removal rates?

### ⚠️ Defect Intelligence

1. Which ATA chapters are trending up in defect volume week-over-week?
2. What are the top 10 ATA sections by total delay minutes this month?
3. How many flight cancellations were caused by propulsion defects this quarter?
4. Which parts were implicated in defect ID X, and what were the shop findings?
5. What percentage of propulsion defects result in MEL deferrals vs immediate resolution?
6. What is the IFSD (In-Flight Shut Down) event trend over the last 12 months?
7. What is the defect↔part linkage coverage rate (data quality)?
8. Which defect categories have the highest recurrence rate?

### 📦 Inventory & Spares

1. Which LLPs across the fleet have fewer than 1,000 cycles remaining to red-line?
2. Which P/Ns have fewer than 2 serviceable spares with 3+ recent unscheduled removals?
3. What is the serviceable spare count at station X for part number Y?
4. Which stations have the highest stock-out risk based on removal velocity?
5. What is the removal velocity for high-value rotables this quarter?
6. What are the top 10 P/Ns by inventory transaction volume this month?
7. Which parts are in AOG condition and where are they located?

### 🛠️ Procurement & Overhaul

1. What is the average lead time for exchange/repair orders by part category?
2. Which open orders have exceeded their expected lead time?
3. What is the total repair cost by order type this quarter?
4. What are the most common shop findings for ATA 73 teardowns?
5. What is the fault confirmation rate (confirmed vs NFF) by ATA chapter?
6. Which part numbers have the highest unfulfilled order backlog?

## Addendums

- [Addendum 1.1 — ML Models](phase1-addendum-1.1-ml-models.md)
- [Addendum 1.2 — Table-Valued Functions](phase1-addendum-1.2-tvfs.md)
- [Addendum 1.3 — Metric Views](phase1-addendum-1.3-metric-views.md)
- [Addendum 1.4 — Lakehouse Monitoring](phase1-addendum-1.4-lakehouse-monitoring.md)
- [Addendum 1.5 — AI/BI Dashboards](phase1-addendum-1.5-aibi-dashboards.md)
- [Addendum 1.6 — Genie Spaces](phase1-addendum-1.6-genie-spaces.md)
- [Addendum 1.7 — Alerting Framework](phase1-addendum-1.7-alerting.md)

## Success Criteria

| Criteria | Target |
|----------|--------|
| All 10 use cases covered by at least one implementing artifact | 100% |
| Every TVF traces to a business question Metric Views cannot answer | 100% |
| Each Genie Space ≤ 25 data assets | ≤ 25 |
| Each Genie Space ≥ 10 data assets | ≥ 10 |
| Business question coverage across domains | ≥ 3 per domain |
| Artifact-to-use-case traceability | 100% |
