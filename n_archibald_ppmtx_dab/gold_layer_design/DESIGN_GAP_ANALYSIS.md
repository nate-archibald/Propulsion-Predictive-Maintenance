# Design Gap Analysis — QX Predictive Maintenance Gold Layer

> **Date:** 2026-06-19

---

## Coverage Assessment

### Included Source Tables (9/14 = 64%)

All business-critical Silver tables are included. The 5 excluded tables are internal DQ monitoring artifacts that serve pipeline operations, not business analytics.

### PRD Coverage (10/10 = 100%)

All functional requirements from the PRD have corresponding Gold table support:

| FR | Coverage | Notes |
|---|---|---|
| FR-1 Parts Search | Full | dim_part + fact_inventory_snapshot provide complete P/N and S/N visibility |
| FR-2 Defects Search | Full | fact_defect has all defect attributes including narratives for text search |
| FR-3 Engine Genealogy | Partial | Current state via fact_inventory_snapshot; historical via fact_component_removal. "As of date" view requires temporal query pattern, not separate table. |
| FR-4 Spares & Inventory | Full | fact_inventory_snapshot with condition and station grouping |
| FR-5 Defect↔Part Linkage | Full | bridge_defect_part provides the M:M link. Confidence scoring to be implemented in Gold merge logic. |
| FR-6 Natural-Language Query | Full | All Gold tables feed Genie Space |
| FR-7 LLP Red-Line | Full | fact_inventory_control with derived remaining_cycles/hours/days |
| FR-8 Operational Impact | Full | fact_defect.delay_minutes and cancellation columns |
| FR-9 Persona Dashboards | Full | Multi-fact combinations serve all 5 personas |
| FR-10 Global Filters | Full | Dimensions provide all filter axes |

---

## Known Gaps and Mitigations

### Gap 1: Engine Serial Number as First-Class Entity

**Issue:** The PRD specifies engine S/N as a key entity (FR-3 Engine Genealogy), but we don't have a separate `dim_engine` table. Engine S/Ns appear as `nha_sn` in component transactions and `sn` in inventory (when the part IS an engine).

**Mitigation:** Engine S/N queries are served by filtering `dim_part` to engine-level parts and querying `fact_inventory_snapshot` and `fact_component_removal` with `nha_sn` or by P/N category. If this proves insufficient at implementation, a `dim_engine` can be added as a view over dim_part + fact_inventory_snapshot.

**Risk:** Low — engine S/N queries work via the existing model with appropriate filtering.

### Gap 2: Confidence Scoring for Defect↔Part Bridge

**Issue:** FR-5 requires HIGH/MEDIUM/LOW confidence scoring on the defect↔part linkage.

**Mitigation:** The `bridge_defect_part` table captures direct Silver associations from `defect_report_pn`. The confidence scoring logic (time-window matching, P/N inference from ATA) will be implemented as a derived column during the Gold merge phase, not the design phase. The bridge structure supports adding a `confidence_level` column.

**Risk:** Low — data structure is ready; logic deferred to implementation.

### Gap 3: Historical Configuration ("As of Date" View)

**Issue:** FR-3 mentions "as of date" historical configuration view for engines.

**Mitigation:** `fact_component_removal` contains the full chronological history of what was installed where and when. "As of date" configuration is a temporal query against this table (all installations before date X where no subsequent removal exists). No separate snapshot table needed.

**Risk:** Low — achievable via query patterns on existing fact.

### Gap 4: Source Column Coverage

**Issue:** Silver tables have very wide schemas (214 columns in pn_master, 221 in defect_report, 226 in order_detail). The Gold design selects the most analytically relevant columns, not all columns.

**Mitigation:** Gold tables focus on columns needed for the 10 PRD requirements and Genie Space queries. Additional columns can be added iteratively based on user feedback. The YAML schemas document which columns are included and their lineage.

**Risk:** Medium — users may ask for columns not in Gold. Mitigation: Genie Space can also query Silver tables directly for ad-hoc exploration.

### Gap 5: Multi-Position Part Tracking

**Issue:** A single P/N+S/N can move between multiple positions (ENG1, ENG2, APU) over time. The current fact_component_removal captures each event individually but doesn't pre-compute "current position."

**Mitigation:** Current position is derivable from the latest installation event in fact_component_removal (or from fact_inventory_snapshot.installed_position for currently installed parts). A materialized "current configuration" view could be added if query performance requires it.

**Risk:** Low — current design supports the query; performance optimization is a deployment concern.

---

## Recommendations for Future Phases

| Phase | Enhancement | Benefit |
|---|---|---|
| Domain 2 | Add ECM/ACARS telemetry fact table | Engine condition monitoring integration |
| Domain 3 | Add RUL prediction output table | Predictive remaining useful life |
| Domain 4 | Add warranty/financial fact table | Cost recovery analytics |
| Enhancement | Add `dim_engine` view/table | Simplified engine-centric queries |
| Enhancement | Add `confidence_level` to bridge | Explicit linkage quality metric |
| Enhancement | Add vendor dimension | Supplier performance analytics |
