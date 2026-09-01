---
name: trax-live-times-reconstruction
description: >
  Reconstruct LIVE component times/cycles (TSN, TSC, TSO, TSR, LLP) for the QX
  Propulsion fleet from TRAX source data. Use whenever engine/APU/part hours or
  cycles look "too low", stale, or zero (e.g. new engines showing 0 TSN), or when
  building any feature that depends on accurate accumulated times: Engine & APU
  Genealogy, Fleet Leaders, LLP overhaul budget, soft-time / overhaul forecasts.
  Explains the root-cause "frozen posting" bug in qx_trax_pn_inventory_control and
  the validated airframe-counter reconstruction that reproduces the ERP's live values.
---

# TRAX Live Times & Cycles Reconstruction

## The core problem (read this first)

`qx_trax_pn_inventory_control.actual_hours` / `.actual_cycles` are **frozen
"as-of-last-posting" snapshots, not live values.** TRAX's ERP screen *computes*
the live number on the fly; our ETL only extracted the frozen field. So:

- **Engines look wrong the most** — they are rarely removed, so their posting is
  2–4 years stale, and **~40% read exactly 0** (the clock was zeroed at install and
  never re-posted). Verified: 43/105 engine TSN rows = 0.
- **Parts look "OK" only by luck** — they cycle through the shop and get fresh
  postings. Same latent bug, just less visible.
- This one root cause corrupts **TSN (Time Since New), TSC (cycles), TSO (Time
  Since Overhaul), TSR (Time Since Repair), and LLP counts** — i.e. the data used
  most in daily work: Engine/APU Genealogy, Fleet Leaders, and LLP budgeting.

**Do not try to "fix" the frozen value or hunt for a better column in
`pn_inventory_control`.** The accumulated baseline is genuinely not stored there
for engines (all control rows come across as 0). The live value must be
**reconstructed** from utilization + install/removal history.

## The reconstruction (validated, reproduces ERP to within ~2 hrs)

```
live_TIME(component) = hours_installed_baseline
                     + Σ over each ON-WING period [ airframe_counter(end) − airframe_counter(start) ]
```

- **On-wing periods** come from component install/removal history
  (`qx_trax_ac_pn_transaction_history`). A period **starts** at an `INSTALL` or
  `INT/INST` event and **ends** at the next event of any kind (a `REMOVE`, a
  relocation to another tail, or *today* if still installed). **Gaps between a
  REMOVE and the next INSTALL are shop/stored time and accrue nothing** — the
  sessionization below handles this automatically.
- **Airframe counter** comes from the prod flight log
  (`qx_trax_ac_actual_flights`): use the **cumulative running counter delta**, not
  a sum of per-leg values:
  - TSN hours → `total_ac_flight_hours`
  - TSC cycles → `total_ac_cycles`
  - ⚠️ **Do NOT `SUM(flight_hours)` per leg** — that undercounts badly (gave ~5,000
    vs the true 8,644 for ESN 908283, because `flight_hours` is a block/airborne
    subset). Always use `MAX(counter) − MIN(counter)` of the airframe running total.
- **`hours_installed_baseline`** is `hours_installed` from the install transaction.
  For QX engines this is 0 (engines entered the fleet tracked-from-install), which
  is why the airframe delta alone matches ERP. Keep the term for correctness in
  case a component is ever installed with prior hours recorded.

### Validated SQL template (parameterize the PN filter)

```sql
WITH ev AS (   -- dedup raw transaction rows (INT/INST often duplicated)
  SELECT DISTINCT sn, ac,
    CASE WHEN transaction_type = 'REMOVE' THEN 'END' ELSE 'START' END AS kind,
    CAST(transaction_date AS DATE) AS d
  FROM subject_maintenanceengineering.ds_maintenanceengineering_ods.qx_trax_ac_pn_transaction_history
  WHERE pn LIKE 'CF34-8E5G%'          -- <-- component family filter
    AND sn IS NOT NULL AND ac IS NOT NULL
),
ordered AS (   -- next event per SN defines the close of each on-wing window
  SELECT sn, ac, kind, d,
    LEAD(d) OVER (PARTITION BY sn ORDER BY d, CASE WHEN kind='END' THEN 0 ELSE 1 END) AS next_d
  FROM ev
),
periods AS (   -- one row per on-wing window; open window closes "today"
  SELECT sn, ac AS tail, d AS s, COALESCE(next_d, CURRENT_DATE + 1) AS e
  FROM ordered WHERE kind = 'START'
),
per_period AS (   -- airframe counter delta within each window
  SELECT p.sn,
    MAX(f.total_ac_flight_hours) - MIN(f.total_ac_flight_hours) AS hrs,
    MAX(f.total_ac_cycles)       - MIN(f.total_ac_cycles)       AS cyc
  FROM periods p
  JOIN subject_maintenanceengineering.ds_maintenanceengineering_ods.qx_trax_ac_actual_flights f
    ON f.ac = p.tail AND f.void <> 'Y'
   AND f.flight_date >= p.s AND f.flight_date < p.e
  GROUP BY p.sn, p.tail, p.s, p.e
)
SELECT sn,
       CAST(ROUND(SUM(hrs)) AS INT) AS live_tsn,
       CAST(ROUND(SUM(cyc)) AS INT) AS live_tsc
FROM per_period
GROUP BY sn ORDER BY sn;
```

Why the sessionization is correct:
- `INSTALL`/`INT/INST` → `START`, `REMOVE` → `END`.
- Each `START`'s window runs to the **next event of any type**, so a relocation
  (START→START with no explicit REMOVE) splits cleanly onto two tails, and a
  REMOVE→(gap)→INSTALL correctly excludes the off-wing gap.
- `DISTINCT` removes the duplicate `INT/INST` rows TRAX emits.

## How to validate any reconstruction

Always confirm against **ERP ground truth** the user reads off the TRAX
`pn_inventory_control` screen. Known-good anchors captured this project:

| ESN     | ERP TSN | Reconstructed |
|---------|---------|---------------|
| 902599  | 11,491  | 11,489        |
| 908196  | 10,545  | 10,547        |
| 908283  | 8,644   | 8,644         |

Two engines on the **same tail** installed the same day correctly share the same
airframe hours (e.g. 908282/908283 both 8,644) — that's expected, not a bug.

## Important caveats / gotchas

- **APUs are different.** APUs accrue APU-run hours (incl. ground/gate use), **not**
  airframe flight hours. This method is correct for **engines and airframe-driven
  LLPs**, but **NOT** for APU TSN — find an APU hour-meter / oil-servicing source
  before touching APU genealogy.
- **PROD vs _test.** Use the **prod** ODS
  (`subject_maintenanceengineering.ds_maintenanceengineering_ods`). The `_test` copy
  of `qx_trax_ac_actual_flights` is empty.
- **`qx_trax_pn_inventory_control_log` is effectively empty** (4 junk rows) — it does
  NOT retain pre-reset values. Don't rely on it.
- **`fleet_utilization`** covers only AS/HA (B737), **no QX/E175** — not usable here.
- The prod flight log is live and complete: ~559K legs, 51 QX tails, back to 2005,
  current through today. Tail format (`620QX`) matches `installed_ac`.

## Implementation pattern used (Phase 1 → Phase 2)

**Phase 1 — thin proof (app-only, reversible, no pipeline change):**
1. Run the template above for the component family; snapshot results.
2. Generate a static lookup `nathan-a-ppmtx/server/engineLiveTimes.ts`
   (`Record<sn, {tsn, tsc}>` + an `AS_OF` date).
3. In the relevant `server.ts` endpoint (e.g. `/api/engines`), `LEFT JOIN` / override
   the frozen `total_hours`/`total_cycles` by SN, falling back to the old value for
   any SN not in the lookup. Ship and eyeball the whole fleet vs TRAX.
   - Rationale: the app server only reads **Lakebase Postgres** (`appkit.lakebase.query`);
     it has no direct Unity Catalog / warehouse path, so a baked lookup is the
     lightest way to get UC-derived values into the app for validation.

**Phase 2 — do it right in the pipeline (once trusted):**
1. Ingest the two prod sources (`ac_pn_transaction_history`, `ac_actual_flights`)
   through silver → gold as an `engine_live_times` (SN, live_tsn, live_tsc, as_of).
2. Point genealogy, fleet-leaders, **and LLP** views at the live value so engines,
   LLPs, soft-times, and the overhaul forecast all become correct at once.
3. Extend the same period/airframe-delta logic to compute TSO (anchor on the TSO
   `reset_date` instead of first install) for soft-time accuracy.

## Reference constants (this workspace)

- Warehouse id: `600d6ad41356867b`  ·  CLI profile: `adb-620317033646362`
- App/gold schema (Lakebase + UC): `subject_maintenanceengineering_test.an_maintenanceengineering_ods`
  (gold `qx_ppmtx_gold_*`, synced `qx_ppmtx_synced_gold_*`, silver `qx_ppmtx_pn_inventory_control`)
- Prod source ODS: `subject_maintenanceengineering.ds_maintenanceengineering_ods`
- Engine PN family: `CF34-8E5G%`  ·  APU PN: `4505001B`
- App: https://nathan-a-ppmtx-620317033646362.2.azure.databricksapps.com

### SQL-via-CLI execution recipe (Windows PowerShell, works reliably)

```powershell
$q = @"
<SQL here>
"@
$json = @{ warehouse_id="600d6ad41356867b"; statement=$q; wait_timeout="50s" } | ConvertTo-Json
[System.IO.File]::WriteAllText("$env:TEMP\qz.json", $json)   # NOT Set-Content — BOM breaks the JSON parser
databricks api post /api/2.0/sql/statements -p adb-620317033646362 --json "@$env:TEMP\qz.json" 2>&1 |
  ConvertFrom-Json | ForEach-Object {
    $_.status.state
    if ($_.status.error) { $_.status.error.message }
    $_.result.data_array | ForEach-Object { $_ -join '  |  ' }
  }
```

- `wait_timeout` **max is 50s** (55s errors out).
- The CLI prints progress to stderr; PowerShell may report **exit 1 even on success** —
  verify by the returned `SUCCEEDED` text, not the exit code.

### Deploy sequence

```
cd nathan-a-ppmtx
npm run build                                   # app.yaml runs `npm run start` on prebuilt dist/
databricks bundle deploy -p adb-620317033646362
databricks bundle run   app -p adb-620317033646362
```
