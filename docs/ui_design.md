# UI Design — QX Predictive Maintenance Platform
## Domain 1: Propulsion Parts & Defects Intelligence

| Field | Value |
|---|---|
| **App Name** | `nathan-a-ppmtx` |
| **Framework** | Databricks AppKit 0.38.1 (React + Vite + Express) |
| **Source** | `docs/design_prd.md` — v1.0 MVP |
| **Data** | Static mock data (`client/src/mock-data.ts`) — no live backend |

---

## Design Direction

### Brand & Aesthetic

The UI implements the Alaska Air Group / Horizon Air visual identity using CSS custom properties mapped to oklch color values:

| PRD Brand Token | oklch CSS Variable | Usage |
|---|---|---|
| Midnight Blue (`#00274C`) | `--primary: oklch(0.25 0.05 250)` | Top nav bar, header background, primary buttons |
| Alaska Teal (`#00B2A9`) | `--accent / --secondary: oklch(0.65 0.14 175)` | Active states, ring focus, accent highlights |
| Bright Lime (`#C5D86D`) | `--success: oklch(0.72 0.15 145)` | SVC badges, HIGH confidence, positive deltas |
| Warm Red (`#E04E39`) | `--destructive: oklch(0.58 0.22 25)` | LLP alerts, CANCEL badges, stock-out risk |
| Cloud White (`#F5F5F5`) | `--background: oklch(0.97 0.002 240)` | Page background |
| Dark Charcoal (`#2D2D2D`) | `--foreground: oklch(0.2 0.02 250)` | Body text |

Typography uses system sans-serif fonts. Dark mode is supported via `prefers-color-scheme: dark` with a complementary dark palette.

### Layout Pattern

- **Top navigation bar** — Midnight Blue background with inline nav links and fleet descriptor ("Horizon Air — E175 / CF34-8E")
- **Responsive** — Desktop-first with mobile nav via Sheet slide-over at `md` breakpoint
- **Cards** — White cards on light gray background, shadow elevation via AppKit `Card` component
- **Master-detail pattern** — Used on Defects, Parts, and Engines pages (table left, detail panel right)

---

## Key Screens / Pages

### 1. Overview (`/`) — `HomePage.tsx`

**Purpose:** Fleet-wide engine component snapshot — the landing page.
**PRD Journeys:** B (ATA Hotspot), G (Monthly Review prep)

| Section | Component | Mock Data Source |
|---|---|---|
| KPI strip (4 cards) | `MetricCard` × 4 | Derived from `MOCK_DEFECTS`, `MOCK_PARTS` |
| Defects by ATA Section | `BarChart` (AppKit) | `DEFECTS_BY_ATA` |
| Weekly Defect Trend | `LineChart` (AppKit) | `WEEKLY_DEFECT_TREND` |
| LLP Red-Line Alerts | HTML table | `MOCK_PARTS` filtered by `cyclesRemaining < 1000` |
| Defect↔Part Linkage Quality | Progress bars | `LINKAGE_STATS` |

**KPI cards:** Active Defects, Total Delay Minutes, Cancellations, LLP Alerts. Each card has a left colored border (variant-based: warning, destructive, success).

**Interactions:** LLP alert rows are clickable → navigates to Parts page with S/N search pre-filled.

### 2. Defects Search (`/defects`) — `DefectsPage.tsx`

**Purpose:** Search, filter, and inspect defect records.
**PRD Journeys:** C (Defect-to-Spare Resolution), B (drill-down target)

| Section | Component | Mock Data Source |
|---|---|---|
| Search input | `Input` with `Search` icon | Filters `MOCK_DEFECTS` by ID/tail/ATA/station/narrative |
| Results table | Sortable HTML table | `MOCK_DEFECTS` (12 records) |
| Detail panel | `Card` (right side) | Selected defect from table click |

**Table columns:** Defect ID, Tail, ATA, Station, Date, Impact (badge), Linkage Confidence (badge).

**Detail panel shows:** Full defect metadata, narrative text, resolution text, linked part P/N + S/N with confidence badge, deferral status.

**Badges:**
- Impact: `CANCEL` (destructive), `DELAY` (warning), `NONE` (muted)
- Confidence: `HIGH` (success), `MEDIUM` (warning), `LOW` (destructive)

### 3. Parts Search (`/parts`) — `PartsPage.tsx`

**Purpose:** Unified parts search by P/N, S/N, or Engine S/N.
**PRD Journeys:** A (Failure Mode Trending), D (Engine Genealogy entry)

| Section | Component | Mock Data Source |
|---|---|---|
| Search input | `Input` with typeahead-style filtering | Filters `MOCK_PARTS` |
| Results table | HTML table with condition badges | `MOCK_PARTS` (14 records) |
| Detail panel | `Card` with life metrics + LLP status | Selected part |

**Table columns:** P/N, S/N, Description, Tail, Condition (badge), CSN, LLP remaining.

**Detail panel shows:** Full identity (P/N, S/N, engine, position, tail, ATA), life metrics grid (TSN/CSN/TSO/CSI), LLP status with progress bar, install date.

**Condition badges:** SVC (success), UNS (warning), SCR (muted), AOG (destructive), IN-SHOP (accent).

**Cross-navigation:** Engine S/N in detail panel links to `/engines?search=ESN-xxxxx`.

### 4. Engine Genealogy (`/engines`) — `EnginesPage.tsx`

**Purpose:** Full engine configuration and installed parts.
**PRD Journeys:** D (Engine Genealogy Review), E (LLP Fleet Scan)

| Section | Component | Mock Data Source |
|---|---|---|
| Search input | `Input` | Filters `MOCK_ENGINES` by ESN/tail/type |
| Engine cards grid | `Card` grid (2-3 col) | `MOCK_ENGINES` (7 engines) |
| Configuration table | HTML table (expanded on engine select) | `engine.parts` array |

**Engine cards:** Show ESN, tail, position, hours, cycles, last shop visit. LLP alert count badge if any parts have `cyclesRemaining < 1000`.

**Configuration table columns:** Part description, P/N, S/N, Position, TSI, CSI, Install Date, LLP Status.

**Cross-navigation:** Part S/Ns in config table link to `/parts?search=SN-xxxxx`.

### 5. Spares & Inventory (`/spares`) — `SparesPage.tsx`

**Purpose:** Station-level spare positioning and stock-out risk assessment.
**PRD Journey:** F (Spare Shortfall Identification)

| Section | Component | Mock Data Source |
|---|---|---|
| Search input | `Input` | Filters `MOCK_SPARES` |
| Station Risk chart | `BarChart` (AppKit) | Aggregated from `MOCK_SPARES` |
| Inventory table | HTML table with risk badges | `MOCK_SPARES` (16 records) |

**Risk badges:** HIGH (destructive), MEDIUM (warning), LOW (success).

### 6. Reliability Dashboard (`/reliability`) — `ReliabilityPage.tsx`

**Purpose:** Executive summary for monthly reliability review.
**PRD Journey:** G (Monthly Reliability Review)

| Section | Component | Mock Data Source |
|---|---|---|
| KPI strip (4 boxes) | `StatBox` × 4 | Derived aggregates |
| Top ATA by delay minutes | `BarChart` | `DEFECTS_BY_ATA` sorted |
| Top P/N by cancellations | `BarChart` | `IMPACT_BY_PN` sorted |
| Weekly trend | `LineChart` | `WEEKLY_DEFECT_TREND` |
| Linkage quality | Stacked progress bar + legend | `LINKAGE_STATS` |
| Top P/Ns by delay minutes | Inline list | `IMPACT_BY_PN` slice |

---

## Core Components

### Navigation

| Component | Source | Description |
|---|---|---|
| `Layout` | `App.tsx` | Top bar (Midnight Blue) + responsive mobile Sheet nav + footer |
| `NavLinks` | `App.tsx` | 6 nav items with lucide icons: Overview, Defects, Parts, Engines, Spares, Reliability |
| `RouterProvider` | `App.tsx` | React Router v7 with `createBrowserRouter` |

### Data Display

| Component | Source | Description |
|---|---|---|
| `MetricCard` | `HomePage.tsx` | KPI card with title, large value, subtitle, icon, colored left border |
| `StatBox` | `ReliabilityPage.tsx` | Compact stat with icon, label, bold value |
| `ConfidenceBadge` | `DefectsPage.tsx` | HIGH/MEDIUM/LOW defect↔part linkage indicator |
| `ImpactBadge` | `DefectsPage.tsx` | CANCEL/DELAY/NONE operational impact indicator |
| `ConditionBadge` | `PartsPage.tsx` | SVC/UNS/SCR/AOG/IN-SHOP part condition indicator |
| `RiskBadge` | `SparesPage.tsx` | HIGH/MEDIUM/LOW stock-out risk indicator |
| `BarChart` | AppKit UI | Used for ATA hotspots, station risk, impact rankings |
| `LineChart` | AppKit UI | Used for weekly defect trends |

### Interaction

| Pattern | Pages | Behavior |
|---|---|---|
| Master-detail | Defects, Parts | Click table row → detail panel appears on right (3-col grid: 2 table + 1 detail) |
| Card selection | Engines | Click engine card → config table expands below |
| Search filtering | All data pages | Text input filters mock data array in real-time |
| Cross-page navigation | Parts ↔ Engines | Clickable Engine S/N → `/engines?search=...`; Part S/N → `/parts?search=...` |
| Sortable columns | Defects | Click column header to sort asc/desc |

---

## Navigation Flow

```
 ┌─────────────────────────────────────────────────┐
 │              Top Navigation Bar                  │
 │  Overview  Defects  Parts  Engines  Spares  Rel  │
 └──────┬───────┬───────┬───────┬───────┬───────┬──┘
        │       │       │       │       │       │
        ▼       │       │       │       │       │
   HomePage     │       │       │       │       │
   (KPIs +      │       │       │       │       │
    Charts)     │       │       │       │       │
   LLP click ───┼───────┼──►PartsPage  │       │
                │       │   │  detail   │       │
                ▼       │   │  ESN →────┼──►EnginesPage
           DefectsPage  │   │           │   │  config table
           │  detail    │   ◄───────────┼───┤  SN click
           │  linked PN─┼──►│           │   │
           │            │   │           │   │
                        │               ▼   │
                     SparesPage    ReliabilityPage
                     risk chart    executive summary
```

---

## Mock Data Summary

All mock data lives in `client/src/mock-data.ts`:

| Export | Type | Records | Key Fields |
|---|---|---|---|
| `MOCK_DEFECTS` | `Defect[]` | 12 | id, tail, ata, station, narrative, impact, linkedPartSN, confidence |
| `MOCK_PARTS` | `Part[]` | 14 | partNumber, serialNumber, engineSN, condition, tsn/csn, isLLP, cyclesRemaining |
| `MOCK_SPARES` | `SpareItem[]` | 16 | partNumber, station, condition, quantity, stockOutRisk |
| `MOCK_ENGINES` | `EngineConfig[]` | 7 | engineSN, tail, engineType, parts (linked from MOCK_PARTS) |
| `DEFECTS_BY_ATA` | aggregate | 8 | ata, description, count, delayMinutes, cancels |
| `WEEKLY_DEFECT_TREND` | aggregate | 10 | week, count |
| `IMPACT_BY_PN` | aggregate | 8 | partNumber, description, delayMinutes, cancels, removals |
| `LINKAGE_STATS` | summary | 1 | total, high, medium, low, highPct |

---

## State Handling

Every data-driven component includes three states:
- **Loading:** `<Skeleton>` placeholder (currently hardcoded to `false` since mock data is static)
- **Empty:** "No results match your search" card when filters produce zero results
- **Error:** `ErrorBoundary.tsx` wraps the entire app (scaffold-provided)

---

*End of UI Design — QX Predictive Maintenance Platform*
