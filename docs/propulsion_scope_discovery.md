# Propulsion Scope Discovery

> Source of truth for narrowing the `nathan-a-ppmtx` app to **propulsion-only** data.
> Extracted from the user's `vw_prop_*` Unity Catalog views in
> `subject_maintenanceengineering_test.an_maintenanceengineering_ods` (the same views that scope
> the 2 Genie spaces). The app queries **Lakebase Postgres** synced tables and cannot read these UC
> views, so their filter *logic* is replicated as SQL in `server/server.ts`.

## Canonical propulsion definition

- **Propulsion ATA chapters:** `chapter IN (49, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80)`
  (APU = 49; powerplant/engine group = 70–80). Applied by joining to `dim_ata_chapter`.
- **Propulsion part population** (`vw_prop_part_population`): the set of `dim_part_key` that are
  propulsion parts, defined as:
  1. `DISTINCT dim_part_key` from `fact_component_removal` joined to `dim_ata_chapter` where
     `chapter IN (49,70..80)`, **UNION**
  2. curated overrides — parts whose `pn` is in `qx_ppmtx_prop_part_overrides`.

## The 9 `vw_prop_*` views and their filter mechanism

| View | Base gold table | Filter |
|------|-----------------|--------|
| `vw_prop_fact_defect` | `fact_defect` | JOIN `dim_ata_chapter`, `chapter IN (49,70..80)` |
| `vw_prop_fact_component_removal` | `fact_component_removal` | JOIN `dim_ata_chapter`, `chapter IN (49,70..80)` (also adds aircraft `ac`) |
| `vw_prop_fact_teardown` | `fact_teardown` | JOIN `dim_ata_chapter`, `chapter IN (49,70..80)` |
| `vw_prop_bridge_defect_part` | `bridge_defect_part` | `EXISTS` matching row in `vw_prop_fact_defect` (by defect_type, defect, defect_item) |
| `vw_prop_fact_inventory_control` | `fact_inventory_control` | `dim_part_key IN (vw_prop_part_population)` |
| `vw_prop_fact_inventory_snapshot` | `fact_inventory_snapshot` | `dim_part_key IN (vw_prop_part_population)` |
| `vw_prop_fact_inventory_transaction` | `fact_inventory_transaction` | `dim_part_key IN (vw_prop_part_population)` |
| `vw_prop_fact_order` | `fact_order` | `dim_part_key IN (vw_prop_part_population)` |
| `vw_prop_part_population` | `fact_component_removal` + `dim_part`/overrides | DISTINCT propulsion-ATA parts UNION curated overrides |

## Curated overrides (`qx_ppmtx_prop_part_overrides`)

- Columns: `pn, pn_description, reason, added_by, added_date`.
- **Current contents: 1 row** — `pn = '3215790-3'`.
- This table is **NOT** synced to Lakebase Postgres (not one of the 13 synced tables). To preserve
  parity with the Genie views, the app embeds the override PN list as a documented constant
  (`PROP_PART_OVERRIDE_PNS` in `server/server.ts`). If the override list grows or changes often,
  sync `qx_ppmtx_prop_part_overrides` as a 14th synced table and switch the app to read it instead.

## Scoping impact (row counts: fleet-wide → propulsion)

| Table | Base rows | Propulsion rows |
|-------|-----------|-----------------|
| `fact_defect` | 172,982 | 5,904 |
| `fact_inventory_control` (parts page) | 638,264 | 74,445 |
| `fact_inventory_snapshot` (spares page) | 147,532 | 13,383 |
| propulsion part population | — | 224 parts (222 ATA + curated) |

## App endpoint → filter mapping

| Endpoint | Source synced table(s) | Propulsion filter to add |
|----------|------------------------|--------------------------|
| `/api/defects` | `fact_defect` (joins aircraft, ata, date) | `WHERE c.chapter IN (49,70..80)` (join already present) |
| `/api/defects/by-ata` | `fact_defect` + `dim_ata_chapter` | `WHERE c.chapter IN (49,70..80)` (join already present) |
| `/api/defects/weekly-trend` | `fact_defect` + `dim_date` | add JOIN `dim_ata_chapter` + `WHERE chapter IN (...)` |
| `/api/parts` | `fact_inventory_control` | `WHERE dim_part_key IN (prop_part_population)` |
| `/api/spares` | `fact_inventory_snapshot` | `WHERE dim_part_key IN (prop_part_population)` |
| `/api/engines` | `dim_aircraft` | unchanged — the views do not scope aircraft (fleet is single-type E175) |
| `/api/kpis` | `fact_defect` + `fact_inventory_control` | defect agg: ATA filter; LLP agg: part-population filter |

**prop_part_population (Postgres)** replicated as:
```sql
SELECT DISTINCT cr.dim_part_key
FROM <schema>.qx_ppmtx_synced_gold_fact_component_removal cr
JOIN <schema>.qx_ppmtx_synced_gold_dim_ata_chapter c ON cr.dim_ata_chapter_key = c.dim_ata_chapter_key
WHERE c.chapter IN (49,70,71,72,73,74,75,76,77,78,79,80)
UNION
SELECT p.dim_part_key
FROM <schema>.qx_ppmtx_synced_gold_dim_part p
WHERE p.pn IN (<PROP_PART_OVERRIDE_PNS>)
```
