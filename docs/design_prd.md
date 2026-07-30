# Product Requirements Document
## QX Predictive Maintenance — Domain 1: Propulsion Parts & Defects Intelligence

| Field | Value |
|---|---|
| **Product** | QX Predictive Maintenance Platform |
| **Domain** | 1 — Propulsion Parts & Defects Intelligence |
| **Industry** | Travel & Hospitality — Regional Airline Operations |
| **Operator** | Horizon Air (Alaska Air Group) |
| **Fleet** | Embraer E175 (CF34-8E / APS2300 APU) |
| **Platform** | Databricks Lakehouse + Genie Space |
| **Version** | 1.0 — MVP |
| **Status** | Draft |
| **Last Updated** | 2026-06-09 |

---

## Brand Identity

This product is part of the **Alaska Air Group** ecosystem and must feel native to the Horizon Air / Alaska Airlines brand family.

| Element | Specification |
|---|---|
| **Primary Color — Midnight Blue** | `#00274C` — headers, navigation, primary actions |
| **Accent — Alaska Teal** | `#00B2A9` — interactive elements, links, highlights |
| **Secondary — Bright Lime** | `#C5D86D` — success states, positive indicators |
| **Alert — Warm Red** | `#E04E39` — warnings, red-line indicators, critical alerts |
| **Neutral — Cloud White** | `#F5F5F5` — backgrounds, cards |
| **Text — Dark Charcoal** | `#2D2D2D` — body copy |
| **Brand Voice** | Confident, warm, direct — Pacific Northwest professionalism |
| **Typography** | Clean sans-serif consistent with alaskaair.com (e.g., ASCircular or system equivalent) |
| **Logo Reference** | Alaska Airlines Eskimo face wordmark; Horizon Air sub-brand lockup where applicable |
| **Visual Tone** | Operationally focused, data-dense but uncluttered, aviation-grade clarity |

> Reference: [alaskaair.com](https://www.alaskaair.com) for canonical brand assets, colors, and visual identity.

---

## 1. Summary

### Product Vision

A single governed intelligence platform that replaces three disconnected legacy dashboards — **A/C Defects Lookup**, **PIREP/MIREP Tableau Dashboard**, and **Teardown Reports Tableau View** — with a unified propulsion data product. The platform enables natural-language querying, structured search, and end-to-end **defect → part → spare → shop-finding** linkage — a join no current tool supports.

### Problem Statement

Horizon Air's reliability engineers, MOC controllers, powerplant engineers, and inventory planners currently spend **hours or days** manually correlating data across disconnected systems to answer fundamental questions about propulsion component health.

Key business drivers:

- **CPA economics** — Horizon operates exclusively under a Capacity Purchase Agreement with Alaska Airlines. Every avoidable mechanical delay or cancellation is a direct dollar leak to the group.
- **Fleet concentration** — The fleet is now 100% E175 (CF34-8E engines) following Q400 retirement, concentrating all propulsion analytics value into a single engine type.
- **Operational profile** — Short-haul, high-cycle Pacific Northwest operations drive thermal and mechanical fatigue patterns distinct from long-haul carriers. Cycles-at-failure analytics are as critical as hours-at-failure.
- **Station constraints** — Constrained line-station footprints across the Horizon network mean spares positioning failures quickly become AOG events with cascading schedule impact.

### Target Personas

| Persona | Role | Base | Primary Need |
|---|---|---|---|
| **Nate** | Propulsion Reliability Engineer | PDX | Failure-mode trending, ATA hotspot analysis, MTBUR calculations — in minutes, not days. Owns the CF34-8E reliability program, monthly reliability board, and CASS outputs. |
| **Corey** | Maintenance Operations Controller | PDX (24/7) | Instant defect-to-spare resolution and deferral risk assessment without leaving the tool. Authorizes line-station fixes and deferrals. |
| **Erika** | Powerplant Engineer | — | Full engine genealogy and LLP red-line visibility across the fleet. Owns engine-level integrity, configuration, LLP tracking, and shop visit planning. |
| **Bill** | Rotables / Inventory Planner | Materials org | Population views, stock-out risk by station, and removal velocity analytics. Owns spare positioning and rotable pool sizing. |
| **Will** | Reliability Program Manager | — | Executive-level summaries and data-quality metrics. Produces monthly reliability readouts to VP Maintenance & Engineering and quarterly board materials for Alaska Air Group. |

### Goals

1. **Collapse time-to-insight** for reliability investigations from days to minutes
2. **Enable end-to-end linkage** — defect → part → spare → shop-finding — in a single platform
3. **Consolidate three legacy dashboards** into a single governed source of truth
4. **Establish the Genie + Agent foundation** that all downstream propulsion domains will reuse
5. **Support cycles-at-failure analytics** with the same fidelity as hours-at-failure (critical for high-cycle PNW operations)

### Non-Goals

| Item | Reason |
|---|---|
| Engine condition monitoring / ACARS telemetry | Domain 2 |
| Predictive remaining-useful-life models or shop-visit forecasting | Domain 3 |
| Warranty recovery analytics against CF34-8E power-by-the-hour agreement | Domain 4 |
| Work-package authoring or task-card generation | Stays in TRAX |
| Non-propulsion components (airframe, avionics, interiors) | Out of scope |
| Mainline Alaska 737 fleet or Hawaiian fleet | Out of scope |
| Replacing TRAX as the system of record | Not a goal |

---

## 2. Scope

### MVP Scope (Domain 1)

- **Parts identity and genealogy** — Unified view for all propulsion components (on-wing and off-wing) across the E175 fleet
- **Defects history** — Full defect records with operational impact attribution (cancels, delays, delay minutes)
- **Spares inventory** — Station-level positioning and condition tracking for all propulsion spares
- **Shop findings** — Teardown reports and shop findings linked to originating defects
- **Defect↔Part linkage** — Derived bridge with confidence scoring (HIGH / MEDIUM / LOW)
- **Natural-language query** — Genie Space trained on propulsion domain vocabulary
- **Structured search** — Preserves user muscle memory from legacy dashboards
- **Persona dashboards** — Five persona-specific dashboard views
- **ATA chapter scope** — 49 (APU), 70–80 (Power Plant series), with chapter and section-level filtering
- **Station awareness** — All Horizon stations (three-letter codes as first-class entities)
- **Engine types** — CF34-8E (propulsion), APS2300 (APU)

### Out of Scope

- ECM / ACARS / AIRCOM engine telemetry ingestion
- Predictive or probabilistic models
- Warranty and financial analytics
- Non-propulsion ATA chapters
- Vendor PDF ingestion automation
- Multi-fleet support beyond E175

---

## 3. User Journeys

### Journey A — Failure Mode Trending

**Persona:** Nate (Propulsion Reliability Engineer)
**Completion target:** < 60 seconds end-to-end

1. Nate opens the platform and navigates to **Parts Search**
2. Enters a specific part number (e.g., HPT shroud P/N)
3. Views hours-and-cycles-at-failure distribution chart for the last 24 months
4. Sees top three shop findings associated with this part type
5. Reviews every removal event with linked defect narrative, tail number, engine position, and time-on-wing
6. Views a cohort-style time-on-wing chart showing fleet-wide removal patterns
7. Exports the data set for the next reliability board presentation

### Journey B — ATA Hotspot Drill-Down

**Persona:** Nate (Propulsion Reliability Engineer)

1. Nate opens the **Home / Engine Component Snapshot** page
2. Notices ATA 73 (Engine Fuel & Control) trending up week-over-week in the defect volume chart
3. Clicks to drill into ATA 73 defects
4. Sees which engine serial numbers dominate the trend
5. Identifies a cluster of defects on three specific engines
6. Exports a watchlist of those engine S/Ns with defect summaries for the reliability board

### Journey C — Defect-to-Spare Resolution

**Persona:** Corey (MOC Controller)
**Completion target:** < 30 seconds end-to-end

1. Corey receives notification of a propulsion defect at PDX (e.g., "OIL ON ENG 1 OUTBOARD THRUST REVERSER DOOR")
2. Opens the **Defects Search** page and enters the defect ID
3. Sees the full defect record with implicated part S/N, ATA code, and resolution guidance
4. Views the linked part's current status and sees serviceable spares at PDX
5. Confirms a serviceable spare is available at the current station
6. Dispatches the swap decision without leaving the platform

### Journey D — Engine Genealogy Review

**Persona:** Erika (Powerplant Engineer)

1. Erika navigates to **Parts Search** and selects "By Engine S/N"
2. Enters an engine serial number
3. Views the full current configuration: every part installed with position, install date, TSI/CSI, and last shop visit
4. Scrolls to the chronological defect history attributed to this engine
5. Identifies a part approaching LLP cycle red-line
6. Confirms remaining cycles against the limit and flags for upcoming heavy check planning

### Journey E — LLP Red-Line Fleet Scan

**Persona:** Erika (Powerplant Engineer)

1. Erika opens the **Genie chat pane** from any page
2. Types: *"Which LLPs across the fleet have fewer than 1,000 cycles remaining to red-line?"*
3. Receives a table of all LLPs approaching limits, sorted by urgency
4. Cross-references against tails planned for upcoming heavy checks
5. Flags any engine within 500 cycles of a hard limit for immediate planning action

### Journey F — Spare Shortfall Identification

**Persona:** Bill (Inventory Planner)

1. Bill opens the **Spares & Inventory** page
2. Views the stock-out risk view organized by station
3. Sees BLI and RDM highlighted as stations with low inventory and rising removal rates
4. Drills into a specific P/N to see every instance across installed / serviceable / unserviceable / in-shop / scrapped with location
5. Asks Genie: *"Which P/Ns have fewer than two serviceable spares and three or more unscheduled removals in the last 90 days?"*
6. Receives a prioritized list for reorder action

### Journey G — Monthly Reliability Review Preparation

**Persona:** Will (Program Manager)

1. Will opens his persona-specific dashboard
2. Views top 10 ATA sections by delay minutes for the reporting period
3. Views top 10 P/Ns by cancellations-attributable removals
4. Reviews the fleet-wide weekly defect trend chart
5. Checks the defect↔part linkage coverage statistic (data quality metric)
6. Exports all views as a formatted package for the quarterly reliability review readout to VP Maintenance & Engineering

### Journey H — Natural-Language Investigation

**Persona:** Any

1. User opens the **Genie chat pane** (accessible from every page)
2. Types a question in natural language using Horizon-specific terminology — tail numbers like `628QX`, station codes like `PDX`, ATA codes like `73-21`, part numbers, engine serial numbers
3. Genie interprets the question, states assumptions explicitly, and returns results as a table/chart
4. User clicks any P/N or S/N in the results to pivot to the structured search view for that entity
5. User saves the search for future reference or shares a deep link with a colleague

---

## 4. Functional Requirements

### FR-1: Unified Parts Search

- Search by Part Number, Serial Number, or Engine Serial Number
- Display current location, condition, installed position, and life metrics (TSN / CSN / TSO / TSI / CSI)
- Show full installation/removal history for any part instance
- One-click pivot from any P/N or S/N cell to its detail view

> **Acceptance:** User can find any propulsion part instance and view its complete history within 3 clicks.

### FR-2: Defects Search and Display

- Search by defect ID, tail number, ATA chapter/section, station, date range
- Display defect narrative, resolution, operational impact (cancels, delays, minutes), and deferral status
- Show linked part S/N (via defect↔part bridge) with confidence indicator
- Show linked teardown/shop findings when available
- Preserve layout patterns from legacy PIREP/MIREP dashboard for user muscle memory

> **Acceptance:** User can retrieve any defect and see its linked parts and shop findings in a single view.

### FR-3: Engine Genealogy View

- Display full current configuration of any engine by S/N
- Show every installed part with position, install date, and life metrics
- Show chronological defect history attributed to the engine
- Support "as of date" historical configuration view

> **Acceptance:** User can view complete engine configuration and history for any engine S/N.

### FR-4: Spares & Inventory Positioning

- Display all instances of a P/N across all conditions and locations
- Show station-level serviceable count with stock-out risk indicators
- Highlight stations with low inventory relative to recent removal velocity
- Support filtering by condition code (SVC / RFI / UNS / SCR / AOG)

> **Acceptance:** User can identify spare availability at any station for any propulsion P/N.

### FR-5: Defect↔Part Linkage

- Automatically derive linkage between defects and implicated parts with confidence scoring:
  - **HIGH** — Repair-order removal within 7 days of defect, tail matches, P/N in resolution or repair order referenced
  - **MEDIUM** — Tail + 14-day window, P/N inferred from ATA section mapping
  - **LOW** — Resolution text pattern match, no repair order found
- Surface linkage coverage as a data-quality metric (target ≥ 60% HIGH confidence)

> **Acceptance:** ≥ 60% of trailing 12-month defects have HIGH-confidence part linkage.

### FR-6: Natural-Language Query (Genie Space)

- Embedded chat pane accessible from every page
- Understands Horizon-specific vocabulary: tail patterns (`6xxQX` / `NxxxQX`), station codes, ATA chapters/sections, engine S/Ns, P/Ns, S/Ns
- Distinguishes between P/N (part type) and S/N (part instance) — never conflates them
- Treats ATA chapter (e.g., `73`) and section (e.g., `73-21`) as distinct filter grains
- States assumptions explicitly when query is ambiguous
- Returns results as tables, charts, or narrative with deep links to structured views
- Streams responses with first-token target ≤ 1.5 seconds

> **Acceptance:** ≥ 85% pass rate on a benchmark set of 18 representative questions.

### FR-7: LLP Red-Line Tracking

- Display remaining cycles to certified life limit for all life-limited parts across the fleet
- Alert when any LLP is within 500 cycles of red-line on an in-service engine
- Support filtering by engine, tail, and upcoming heavy check schedule

> **Acceptance:** User can identify all LLPs approaching limits fleet-wide in a single query.

### FR-8: Operational Impact Attribution

- Attribute delay minutes and cancellations to specific P/Ns via the defect↔part bridge
- Support ranking by operational impact (delay minutes, cancel count) at P/N and ATA level

> **Acceptance:** User can view top 10 P/Ns by delay minutes for any time period.

### FR-9: Persona-Specific Dashboards

| Persona | Dashboard Focus |
|---|---|
| **Nate** — Reliability Engineer | Failure trending, ATA hotspots, MTBUR, fleet-wide removal patterns |
| **Corey** — MOC Controller | Active defects, deferral aging, spare availability at current stations |
| **Erika** — Powerplant Engineer | Engine health scores, LLP status, configuration changes |
| **Bill** — Inventory Planner | Spare positioning, stock-out risk, removal velocity vs. on-hand |
| **Will** — Program Manager | Executive summary, top 10 lists, data quality metrics, trend charts |

> **Acceptance:** Each persona can access their primary metrics without configuration.

### FR-10: Global Filters and Navigation

- Persistent global filters (tail, engine S/N, ATA chapter, station, date range) across all tabs
- URL-deep-linkable views for sharing specific states
- Saved searches per user
- Share-link capability for any view

> **Acceptance:** User can share a filtered view via URL and recipient sees identical state.

---

## 5. Non-Functional Requirements

### Performance

| Metric | Target |
|---|---|
| Structured search response time | P50 ≤ 2 seconds |
| Natural-language query end-to-end | P50 ≤ 8 seconds |
| First-token streaming (Genie) | ≤ 1.5 seconds |
| Concurrent users | 50 without degradation |
| Data volume headroom | 10× current (~50K parts on-wing, ~30K spares, ~500K defects/year) |

### Data Freshness

| Source | Refresh Cadence |
|---|---|
| Defects | ≤ 15 minutes from source system commit (supports MOC dispatch scenarios) |
| Parts / engines / inventory | Hourly |
| Repair orders / teardowns | Daily |
| Master data | Daily |

### Security & Governance

- **Authentication** — SSO via Databricks identity tied to Horizon AD / Entra ID
- **Authorization** — Role-based access; mask `reporter_id` for non-MOC roles
- **Service principals** — Narrowly-scoped grants limited to propulsion catalog and schema
- **Data classification** — All PII fields tagged and masked per Alaska Air Group data governance policy
- **Audit logging** — All queries logged with user identity, timestamp, and query text for compliance
- **Network** — Databricks workspace within Alaska Air Group's private network perimeter

---

*End of PRD — Domain 1: Propulsion Parts & Defects Intelligence*
