# Business Onboarding Guide — QX Predictive Maintenance

> **Domain:** Propulsion Parts & Defects Intelligence
> **Platform:** Databricks Lakehouse + Genie Space
> **Operator:** Horizon Air (Alaska Air Group)
> **Fleet:** Embraer E175 (CF34-8E / APS2300 APU)

---

## 1. Introduction to the Business Domain

The **QX Predictive Maintenance** platform is a propulsion intelligence system for Horizon Air's E175 fleet. It replaces three disconnected legacy tools (A/C Defects Lookup, PIREP/MIREP Tableau Dashboard, Teardown Reports View) with a unified data product that enables:

- Natural-language querying of propulsion data
- End-to-end **defect → part → spare → shop-finding** traceability
- Real-time spare availability by station
- LLP red-line tracking across the fleet

**Why it matters:** Horizon operates exclusively under a Capacity Purchase Agreement (CPA) with Alaska Airlines. Every avoidable mechanical delay or cancellation directly impacts revenue. Short-haul, high-cycle Pacific Northwest operations mean cycles-at-failure analytics are as critical as hours-at-failure.

---

## 2. The Business Lifecycle — From Defect to Resolution

```
┌─────────────┐    ┌──────────────┐    ┌───────────────┐    ┌──────────────┐    ┌─────────────┐
│  DEFECT     │───▶│  REMOVAL     │───▶│  SPARE ISSUE  │───▶│  REPAIR      │───▶│  RETURN TO  │
│  REPORTED   │    │  FROM A/C    │    │  FROM STOCK   │    │  ORDER SENT  │    │  SERVICE    │
└─────────────┘    └──────────────┘    └───────────────┘    └──────────────┘    └─────────────┘
      │                   │                    │                    │                    │
      ▼                   ▼                    ▼                    ▼                    ▼
  fact_defect    fact_component_    fact_inventory_     fact_order        fact_inventory_
                    removal          transaction                           snapshot
```

### Key Stages

1. **Defect Discovery** — A flight crew or maintenance technician reports a defect (PIREP/MIREP)
2. **Component Removal** — The failed or suspect component is removed from the aircraft
3. **Spare Provisioning** — A serviceable spare is issued from inventory or transferred from another station
4. **Repair/Overhaul** — The removed component goes to shop for teardown, inspection, and repair
5. **Return to Service** — Repaired component returns to inventory as serviceable stock

---

## 3. Key Business Entities

| Entity | Description | Gold Table |
|--------|-------------|------------|
| **Part Number (P/N)** | A component TYPE — the design/manufacturer identifier (e.g., HPT shroud) | `dim_part` |
| **Serial Number (S/N)** | A specific INSTANCE of a part type — serialized, individually tracked | Attributes in facts |
| **Aircraft (A/C)** | A specific aircraft tail number (e.g., 628QX, N193QX) | `dim_aircraft` |
| **ATA Chapter** | Aircraft system classification (ATA 100 standard): Ch 72=Engine, 73=Fuel/Control | `dim_ata_chapter` |
| **Station** | Three-letter airport code where maintenance occurs (PDX, SEA, BLI, RDM) | `dim_station` |
| **Defect** | A reported maintenance event with operational impact | `fact_defect` |
| **Removal** | A component swap event (removal + installation) | `fact_component_removal` |
| **Inventory** | Current stock position of all propulsion spares | `fact_inventory_snapshot` |
| **Maintenance Control** | Schedule limits (hours, cycles, days) for time-controlled parts | `fact_inventory_control` |

---

## 4. The Gold Layer Data Model

The Gold layer uses a **star schema** dimensional model with:

- **5 Dimensions** — Part, Aircraft, Station, ATA Chapter, Date
- **7 Fact tables** — Component Removal, Defect, Inventory Transaction, Inventory Snapshot, Inventory Control, Order, Teardown
- **1 Bridge** — Defect↔Part linkage

### Domain Organization

| Domain | Purpose | Key Questions Answered |
|--------|---------|----------------------|
| 🔧 Part Master | Central part reference | "What is this part? What category?" |
| ✈️ Component Lifecycle | Removals and installations | "How long did it last? Why was it removed?" |
| ⚠️ Defect Management | Defect events and impact | "What broke? How much delay did it cause?" |
| 📦 Inventory & Spares | Stock and maintenance limits | "Do we have spares? When is it due?" |
| 🛠️ Procurement & Overhaul | Orders and shop findings | "What did the shop find? How long to fix?" |

---

## 5. Business Processes & Tracking

### 5A. Core Processes

**Process 1: Reliability Trending**

```
Weekly defect data → ATA chapter aggregation → trend charts → hotspot identification → investigation
```

The `fact_defect` table joined to `dim_ata_chapter` enables week-over-week trending by aircraft system. Rising trends in a specific ATA section trigger reliability investigations.

**Process 2: MTBUR (Mean Time Between Unscheduled Removals)**

```
Component removals → filter unscheduled → group by P/N → AVG(hours_installed) = MTBUR
```

The `fact_component_removal` table with `schedule_category = 'Unscheduled'` provides hours_installed and cycles_installed for MTBUR/MCBUR calculations.

**Process 3: Spare Positioning**

```
Inventory snapshot → group by station + condition → compare to removal velocity → risk scoring
```

The `fact_inventory_snapshot` joined to `dim_station` shows current spare availability. Compare against removal velocity from `fact_inventory_transaction` to identify stock-out risk.

**Process 4: LLP Red-Line Monitoring**

```
Maintenance controls → remaining_cycles calculation → flag < 1000 cycles → prioritize shop visits
```

The `fact_inventory_control` table provides `remaining_cycles` (derived: `schedule_cycles - actual_cycles`) for fleet-wide LLP scanning.

### 5B. Real-World Scenarios

---

**Scenario 1: "Oil on the Thrust Reverser" — Defect-to-Spare Resolution**

*Setting:* PDX line station, 06:45 AM, Corey (MOC Controller) receives a write-up.

**What happens in the data:**

1. **fact_defect** — A new row appears: defect_type='PIREP', ATA 78 (Exhaust), delay='Y', delay_minutes=45
2. **bridge_defect_part** — Part P/N for thrust reverser actuator seal linked to defect
3. **fact_inventory_snapshot** — Corey queries for serviceable spares at PDX (condition='SVC', location='PDX')
4. **fact_component_removal** — After swap: removal record with hours_installed=3,200, reason_category='Unscheduled'
5. **fact_inventory_transaction** — Issue transaction decrements PDX stock, receipt transaction at repair vendor

**Analytics impact:** This event feeds the delay_minutes attributed to ATA 78, contributes to the P/N's MTBUR calculation, and reduces PDX spare count (visible in next stock-out risk assessment).

---

**Scenario 2: "HPT Shroud Fleet Campaign" — Failure Mode Trending**

*Setting:* Monthly reliability board, Nate (Reliability Engineer) presents.

**What happens in the data:**

1. **fact_component_removal** — Nate filters by P/N (HPT shroud), last 24 months, schedule_category='Unscheduled'
2. He calculates MTBUR: AVG(hours_installed) = 8,200 hrs (down from 12,000 hrs fleet average)
3. **fact_teardown** — Joins to teardown reports: 4 of 6 removals show shop_finding='Thermal fatigue cracking'
4. **dim_ata_chapter** — Confirms ATA 72-50 trending up week-over-week
5. **bridge_defect_part** — Links back to original defect descriptions confirming thermal distress pattern

**Analytics impact:** The declining MTBUR triggers a fleet-wide inspection campaign. Data supports the business case to Alaska Air Group VP Maintenance.

---

**Scenario 3: "BLI Running Low" — Spare Shortfall Identification**

*Setting:* Weekly inventory review, Bill (Inventory Planner) runs his check.

**What happens in the data:**

1. **fact_inventory_snapshot** — Bill queries: WHERE condition='SVC' GROUP BY dim_station_key, dim_part_key
2. **fact_inventory_transaction** — Calculates 90-day removal velocity for top propulsion P/Ns
3. Identifies BLI station: 1 serviceable spare, 4 removals in last 90 days for a fuel control P/N
4. **fact_order** — Checks if a repair order is in progress (status='In Progress')
5. Places expedite request or initiates inter-station transfer from SEA (3 serviceable)

**Analytics impact:** Prevents an AOG event at BLI by proactive spare redistribution before the next unscheduled removal.

---

**Scenario 4: "LLP Approaching Limit" — Red-Line Fleet Scan**

*Setting:* Erika (Powerplant Engineer) runs her weekly fleet scan.

**What happens in the data:**

1. **fact_inventory_control** — Filters WHERE remaining_cycles < 1000 AND remaining_cycles > 0
2. Joins to **dim_part** for part description and to identify LLP classification
3. Cross-references against aircraft heavy check schedule
4. Identifies 2 HPT discs with < 500 cycles remaining on engines not scheduled for shop visit
5. Escalates to planning for engine swap or accelerated shop visit

**Analytics impact:** Prevents in-service cycle exceedance (a regulatory violation) by identifying parts approaching hard limits.

---

## 6. Analytics Use Cases

| Use Case | Primary Fact | Key Metric | Persona |
|----------|-------------|------------|---------|
| Failure mode trending | fact_component_removal | MTBUR by P/N | Nate |
| ATA hotspot analysis | fact_defect | Defect count by ATA section/week | Nate |
| Operational impact ranking | fact_defect | SUM(delay_minutes) by P/N | Will |
| Spare positioning optimization | fact_inventory_snapshot | Serviceable count by station | Bill |
| Stock-out risk scoring | fact_inventory_transaction | Removal velocity vs. on-hand | Bill |
| LLP red-line monitoring | fact_inventory_control | remaining_cycles < threshold | Erika |
| Defect-to-spare resolution | fact_defect + bridge + snapshot | Part availability at event station | Corey |
| Shop finding analysis | fact_teardown | Fault confirm rate by P/N | Nate |
| Order lead time tracking | fact_order | AVG(lead_time) by vendor/type | Bill |
| Cancellation attribution | fact_defect | COUNT(cancellation='Y') by ATA | Will |

---

## 7. AI & ML Opportunities

| Opportunity | Data Sources | Potential Model |
|-------------|-------------|-----------------|
| Remaining Useful Life prediction | fact_component_removal (hours/cycles at failure), fact_inventory_control | Survival analysis / Weibull |
| Anomaly detection in removal patterns | fact_component_removal time series | Statistical process control |
| Spare demand forecasting | fact_inventory_transaction, fact_component_removal | Time-series forecasting |
| No-Fault-Found prediction | fact_teardown (fault_confirm rates) | Classification model |
| Defect clustering | fact_defect (descriptions) | NLP topic modeling |

---

## 8. Self-Service Analytics with Genie

The Genie Space is configured with all Gold tables and understands:

- **Tail number patterns:** `628QX`, `N193QX`
- **Station codes:** `PDX`, `SEA`, `BLI`, `RDM`
- **ATA chapters:** `72`, `73-21`, `78`
- **Part/Serial numbers:** P/N and S/N as distinct concepts

**Example questions:**
- "Which P/Ns have more than 3 unscheduled removals in the last 90 days?"
- "Show me all defects on tail 628QX with ATA 73 in the last 6 months"
- "What is the MTBUR for the HPT shroud P/N across the fleet?"
- "Which LLPs have fewer than 1,000 cycles remaining?"
- "How many serviceable spares are at PDX for fuel control valves?"

---

## 9. Data Quality & Monitoring

| Metric | Target | Source |
|--------|--------|--------|
| Defect↔Part linkage coverage | ≥ 60% HIGH confidence | bridge_defect_part vs fact_defect |
| Column completeness (critical fields) | ≥ 95% | All fact tables |
| Referential integrity (FK valid) | 100% | All FK columns |
| Data freshness (defects) | ≤ 15 minutes | fact_defect |
| Data freshness (inventory) | ≤ 1 hour | fact_inventory_snapshot |

---

## 10. Getting Started by Role

### Reliability Engineer (Nate)

1. Start with `fact_component_removal` — filter by P/N or ATA chapter
2. Calculate MTBUR: `AVG(hours_installed) WHERE schedule_category = 'Unscheduled'`
3. Join to `fact_teardown` via P/N and S/N for shop findings
4. Use `dim_date` for time-window filtering and trending

### MOC Controller (Corey)

1. Start with `fact_defect` — search by defect ID or tail number
2. Check `bridge_defect_part` for implicated P/Ns
3. Query `fact_inventory_snapshot` for serviceable spares at the event station
4. Confirm spare availability and dispatch

### Powerplant Engineer (Erika)

1. Start with `fact_inventory_control` — filter by remaining_cycles < threshold
2. Cross-reference with `fact_inventory_snapshot` for current installed position
3. Join to `dim_aircraft` for tail-level LLP status
4. Plan shop visits around upcoming heavy checks

### Inventory Planner (Bill)

1. Start with `fact_inventory_snapshot` — group by station, condition
2. Calculate removal velocity from `fact_inventory_transaction`
3. Identify risk: stations where velocity > stock
4. Check `fact_order` for incoming replenishment

### Program Manager (Will)

1. Start with `fact_defect` — aggregate by period for executive summaries
2. Top 10 lists: P/N by delay_minutes, ATA section by defect count
3. Check data quality metrics (linkage coverage, freshness)
4. Export period reports for reliability board
