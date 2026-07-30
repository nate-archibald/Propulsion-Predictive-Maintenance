# Phase 1 Addendum 1.6 — Genie Spaces

> **Agent Domain Framework applies.** Genie Spaces serve as the NL query interface for agents.
> **Planning Source:** `gold_design` | **Readiness:** `gold_design_only`
> **Back to:** [phase1-use-cases.md](phase1-use-cases.md)

---

## Genie Space Capacity Planning

```
Total queryable assets:
  Gold tables:    13
  Metric Views:    4
  TVFs:           11
  ─────────────────
  Total:          28

28 assets → 2 Genie Spaces (split by domain cohesion)
Each space: 14-15 assets ✓ (within 10-25 optimal range)
```

## Summary

| # | Genie Space | Domains Covered | Gold Tables | MVs | TVFs | Total Assets | Use Case Refs |
|---|------------|----------------|-------------|-----|------|-------------|---------------|
| 1 | Propulsion Reliability Intelligence | ⚙️ Component Lifecycle, ⚠️ Defect Intelligence | 7 | 2 | 6 | 15 | UC-001 to UC-004, UC-010 |
| 2 | Inventory & Supply Chain Intelligence | 📦 Inventory & Spares, 🛠️ Procurement & Overhaul | 8 | 2 | 5 | 15 | UC-005 to UC-009 |

---

## Genie Space 1: Propulsion Reliability Intelligence

**Domains:** ⚙️ Component Lifecycle & Reliability, ⚠️ Defect Intelligence
**Use Case Refs:** UC-001, UC-002, UC-003, UC-004, UC-010
**Primary Personas:** Nate (Reliability Engineer), Corey (MOC Controller), Will (Program Manager)

### Data Assets (15)

| # | Asset | Type | Domain |
|---|-------|------|--------|
| 1 | `qx_ppmtx_gold_dim_part` | Gold Table | 🔧 Part Master |
| 2 | `qx_ppmtx_gold_dim_aircraft` | Gold Table | ⚙️ Component Lifecycle |
| 3 | `qx_ppmtx_gold_dim_ata_chapter` | Gold Table | ⚠️ Defect Intelligence |
| 4 | `qx_ppmtx_gold_dim_date` | Gold Table | 📅 Common |
| 5 | `qx_ppmtx_gold_fact_component_removal` | Gold Table | ⚙️ Component Lifecycle |
| 6 | `qx_ppmtx_gold_fact_defect` | Gold Table | ⚠️ Defect Intelligence |
| 7 | `qx_ppmtx_gold_bridge_defect_part` | Gold Table | ⚠️ Defect Intelligence |
| 8 | `component_lifecycle_analytics_metrics` | Metric View | ⚙️ Component Lifecycle |
| 9 | `defect_intelligence_analytics_metrics` | Metric View | ⚠️ Defect Intelligence |
| 10 | `get_component_removal_history` | TVF | ⚙️ Component Lifecycle |
| 11 | `get_mtbur_analysis` | TVF | ⚙️ Component Lifecycle |
| 12 | `get_time_on_wing_distribution` | TVF | ⚙️ Component Lifecycle |
| 13 | `get_defect_trending_by_ata` | TVF | ⚠️ Defect Intelligence |
| 14 | `get_operational_impact_summary` | TVF | ⚠️ Defect Intelligence |
| 15 | `get_defect_part_linkage` | TVF | ⚠️ Defect Intelligence |

### Genie Space Instructions

```
You are the Propulsion Reliability Intelligence assistant for Horizon Air's E175 fleet (CF34-8E engines / APS2300 APU).

DOMAIN KNOWLEDGE:
- ATA chapters in scope: 49 (APU), 70-80 (Power Plant series)
- Fleet: 100% Embraer E175 operated under CPA with Alaska Airlines
- Stations: Horizon Air network (PDX, SEA, BLI, RDM, etc.)
- MTBUR = Mean Time Between Unscheduled Removals (flight hours or cycles)
- IFSD = In-Flight Shut Down (safety-critical event)
- MEL = Minimum Equipment List (deferral mechanism)
- CPA = Capacity Purchase Agreement (delays/cancellations have direct $ impact)

QUERY PRIORITIES:
1. Use Metric Views (component_lifecycle_analytics_metrics, defect_intelligence_analytics_metrics) for aggregate questions
2. Use TVFs for parameterized queries (specific P/N, date range, station)
3. Use Gold tables directly only when Metric Views and TVFs cannot answer

TERMINOLOGY:
- "Tail" or "tail number" = aircraft registration (ac column)
- "P/N" = part number (pn column in dim_part)
- "S/N" = serial number (sn column)
- "ATA" = ATA chapter system classification
- "Delay minutes" = delay_minutes column in fact_defect
- "Cancel" = cancellation = 'Y' in fact_defect
- "NHA" = Next Higher Assembly (parent component)
- "TSI" = Time Since Install (hours_installed, cycles_installed)

ALWAYS state assumptions about date ranges, ATA scope, and filters explicitly.
```

### Sample Questions
1. "What are the top 5 ATA sections by defect volume this month?"
2. "Show MTBUR for all HPT parts over the last 24 months"
3. "Which tails have the most unscheduled removals in Q2?"
4. "Trace all parts linked to defect PIREP-12345"
5. "What is the delay impact trend for ATA 73 week over week?"

---

## Genie Space 2: Inventory & Supply Chain Intelligence

**Domains:** 📦 Inventory & Spares, 🛠️ Procurement & Overhaul
**Use Case Refs:** UC-005, UC-006, UC-007, UC-008, UC-009
**Primary Personas:** Bill (Inventory Planner), Erika (Powerplant Engineer), Corey (MOC Controller)

### Data Assets (15)

| # | Asset | Type | Domain |
|---|-------|------|--------|
| 1 | `qx_ppmtx_gold_dim_part` | Gold Table | 🔧 Part Master |
| 2 | `qx_ppmtx_gold_dim_station` | Gold Table | ⚙️ Component Lifecycle |
| 3 | `qx_ppmtx_gold_dim_date` | Gold Table | 📅 Common |
| 4 | `qx_ppmtx_gold_fact_inventory_snapshot` | Gold Table | 📦 Inventory & Spares |
| 5 | `qx_ppmtx_gold_fact_inventory_transaction` | Gold Table | 📦 Inventory & Spares |
| 6 | `qx_ppmtx_gold_fact_inventory_control` | Gold Table | 📦 Inventory & Spares |
| 7 | `qx_ppmtx_gold_fact_order` | Gold Table | 🛠️ Procurement & Overhaul |
| 8 | `qx_ppmtx_gold_fact_teardown` | Gold Table | 🛠️ Procurement & Overhaul |
| 9 | `inventory_spares_analytics_metrics` | Metric View | 📦 Inventory & Spares |
| 10 | `procurement_overhaul_analytics_metrics` | Metric View | 🛠️ Procurement & Overhaul |
| 11 | `get_spare_availability_by_station` | TVF | 📦 Inventory & Spares |
| 12 | `get_llp_redline_status` | TVF | 📦 Inventory & Spares |
| 13 | `get_inventory_movement_velocity` | TVF | 📦 Inventory & Spares |
| 14 | `get_order_status_summary` | TVF | 🛠️ Procurement & Overhaul |
| 15 | `get_shop_findings_by_part` | TVF | 🛠️ Procurement & Overhaul |

### Genie Space Instructions

```
You are the Inventory & Supply Chain Intelligence assistant for Horizon Air's propulsion spare parts program.

DOMAIN KNOWLEDGE:
- Parts: Propulsion components for CF34-8E engines and APS2300 APU
- Conditions: SVC (Serviceable), UNS (Unserviceable), SCR (Scrapped), AOG (Aircraft on Ground), RFI (Ready for Install)
- LLP = Life Limited Part (hard cycle/hour/day limit before mandatory replacement)
- Red-line = approaching a maintenance control limit (remaining_cycles, remaining_hours, remaining_days)
- AOG = Aircraft on Ground (critical priority — needs immediate spare resolution)
- Order types: Purchase, Repair, Exchange, Loan
- NFF = No Fault Found (teardown result where original fault was not confirmed)

QUERY PRIORITIES:
1. Use Metric Views (inventory_spares_analytics_metrics, procurement_overhaul_analytics_metrics) for aggregate questions
2. Use TVFs for parameterized queries (specific P/N, station, threshold)
3. Use Gold tables directly only when MVs and TVFs cannot answer

TERMINOLOGY:
- "Stock-out risk" = P/N with < 2 serviceable spares and high removal velocity
- "Batch" = unique identifier for a specific part instance in inventory
- "Lead time" = days from order placement to receipt
- "Fulfillment rate" = qty_received / qty_require
- "Shop finding" = root cause finding from component teardown inspection

ALWAYS state assumptions about condition codes, stations, and thresholds explicitly.
```

### Sample Questions
1. "Which LLPs have fewer than 1,000 cycles remaining fleet-wide?"
2. "How many serviceable spares of P/N X are at PDX?"
3. "Which parts have stock-out risk based on recent removals?"
4. "Show open repair orders exceeding 30-day lead time"
5. "What are the most common shop findings for ATA 73 teardowns?"

---

## Deployment Order

```
Phase 1.2 TVFs (11) ──┐
Phase 1.3 MVs (4)  ───┤──→ Phase 1.6 Genie Spaces (2) ──→ Phase 2 Agents (5)
Gold Tables (13)  ─────┘
```

**Genie Spaces MUST be deployed AFTER all TVFs and Metric Views are created.**
Agents consume Genie Spaces as their NL query interface — do not deploy agents before Genie Spaces are operational.

## Success Criteria

| Criteria | Target |
|----------|--------|
| Each Genie Space ≤ 25 data assets | ✅ 15 each |
| Each Genie Space ≥ 10 data assets | ✅ 15 each |
| All 10 use cases reachable via at least one Genie Space | 100% |
| Every Genie Space includes LLM-friendly instructions | 100% |
| Every queryable asset in a space has an LLM COMMENT | 100% |
