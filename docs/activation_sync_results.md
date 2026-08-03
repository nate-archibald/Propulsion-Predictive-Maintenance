# Activation — Synced Table Creation Results (Step 33)

> Outcome of executing **Step 33 — Create Synced Tables** against the plan in
> [`activation_sync_plan.md`](activation_sync_plan.md). Environment per [`reverse_etl.md`](reverse_etl.md).
> **Status: ✅ COMPLETE — 13/13 live.** The 8 previously-blocked tables were fixed via the
> Gold-layer correction below (Option A) and are now ONLINE.
> **Migrated 2026-08-03:** all 13 tables were moved to catalog/schema
> `subject_maintenanceengineering_test.an_maintenanceengineering_ods` and renamed so the `synced`
> token comes right after `qx_ppmtx` (e.g. `qx_ppmtx_synced_gold_bridge_defect_part`). The Postgres
> schema is now **`an_maintenanceengineering_ods`** (project `nathan-a-ppmtx`, database
> `databricks_postgres`). The old UC synced tables and old Postgres schema `n_archibald` were removed.

## ⚠️ Frontend app must be repointed

The app previously read Postgres schema **`n_archibald`** with names `qx_ppmtx_gold_*_synced`.
It must now read schema **`an_maintenanceengineering_ods`** with names `qx_ppmtx_synced_gold_*`
(same `databricks_postgres` database / `nathan-a-ppmtx` project / host
`ep-summer-wave-eey39uw9.database.westus2.azuredatabricks.net`).

## Result summary

All 13 registered in UC as `subject_maintenanceengineering_test.an_maintenanceengineering_ods.*`
and materialized in Postgres schema `an_maintenanceengineering_ods`.

| # | Synced table (`...an_maintenanceengineering_ods.*`) | State |
|---|---|---|
| 1 | `qx_ppmtx_synced_gold_dim_date` | ✅ ONLINE — 5,844 rows |
| 2 | `qx_ppmtx_synced_gold_dim_aircraft` | ✅ ONLINE — 120 rows |
| 3 | `qx_ppmtx_synced_gold_dim_station` | ✅ ONLINE — 129 rows |
| 4 | `qx_ppmtx_synced_gold_dim_ata_chapter` | ✅ ONLINE — 1,142 rows |
| 5 | `qx_ppmtx_synced_gold_bridge_defect_part` | ✅ ONLINE — 44,334 rows |
| 6 | `qx_ppmtx_synced_gold_dim_part` | ✅ ONLINE — 89,344 rows |
| 7 | `qx_ppmtx_synced_gold_fact_defect` | ✅ ONLINE — 172,982 rows |
| 8 | `qx_ppmtx_synced_gold_fact_component_removal` | ✅ ONLINE — 751,774 rows |
| 9 | `qx_ppmtx_synced_gold_fact_inventory_transaction` | ✅ ONLINE — 13,950,200 rows |
| 10 | `qx_ppmtx_synced_gold_fact_inventory_snapshot` | ✅ ONLINE — 147,532 rows |
| 11 | `qx_ppmtx_synced_gold_fact_inventory_control` | ✅ ONLINE — 638,264 rows |
| 12 | `qx_ppmtx_synced_gold_fact_order` | ✅ ONLINE — 1,406,198 rows |
| 13 | `qx_ppmtx_synced_gold_fact_teardown` | ✅ ONLINE — 78,372 rows |

## ✅ Resolution (Option A — Gold layer fixed)

Executed on 2026-08-03. Changes in `n_archibald_ppmtx_dab/src/ppmtx_gold/merge_gold_tables.py`:

1. **Collision-free surrogate keys.** Replaced the 32-bit `F.abs(F.hash(...))` surrogate-key
   expressions with 64-bit `F.xxhash64(...)` for the 8 affected tables (`dim_part` + 7 facts).
   At these row counts a 64-bit hash is collision-free — verified `COUNT = COUNT(DISTINCT key)`
   for all 8 (e.g. `fact_inventory_transaction` 13,950,200 = 13,950,200).
2. **Recompute existing keys on merge.** For the 5 MERGE-based facts the surrogate key was
   excluded from `UPDATE SET`; changed `merge_cols` to include it so re-running the merge
   rewrites existing rows' keys (not just newly-inserted rows).
3. **`fact_teardown` fan-out fixed.** Switched its populate from a grain `MERGE` (which had
   accumulated ~248× duplicate rows and would error on multi-match) to a **truncate + insert**
   full refresh of the deduped single-grain source → **19,470,912 → 78,372 rows**, unique key.
4. Left the 5 already-ONLINE tables' key generation untouched to avoid disrupting their live syncs.

**Deploy + run:** `databricks bundle deploy` → `databricks bundle run qx_ppmtx_gold_merge_job`
(serverless, SUCCESS) → key-uniqueness verified via serverless job → **8 synced tables (re)created**
via `databricks postgres create-synced-table` (Autoscaling Lakebase project API), all reaching
`SYNCED_TABLE_ONLINE_NO_PENDING_UPDATE` with **no `PRIMARY_KEY_CONSTRAINT_VIOLATION`**.

---

## Original diagnosis (retained for history)

> Registration catalog note: synced tables register in UC under
> `databricksworkshop20260415.n_archibald` (the only catalog the user can `CREATE SCHEMA` in);
> the target Postgres schema is `n_archibald` in `databricks_postgres`, per plan.

## Root cause

1. **Non-unique surrogate keys in the Gold layer.** The design declares each `*_key` surrogate as a
   unique `ROW_NUMBER()`, but the deployed data uses a **hash that collides**, so the surrogate is not
   unique. Synced Tables require the sync PK to be the source table's **declared UC PRIMARY KEY**
   (the surrogate), and reject the duplicate keys with
   `SYNCED_TABLE_USER_ERROR.PRIMARY_KEY_CONSTRAINT_VIOLATION`.

   Collision counts (total → distinct surrogate):
   - dim_part 89,344 → 89,340 (4 collisions; **`pn` is 100% unique**)
   - fact_defect 172,982 → 172,975
   - fact_component_removal 751,774 → 751,642
   - fact_inventory_transaction 13,950,200 → 13,904,884
   - fact_inventory_snapshot 147,532 → 147,527
   - fact_inventory_control 638,264 → 638,153
   - fact_order 1,406,198 → 1,405,722

2. **`fact_teardown` is fanned out ~248×** — 19,470,912 rows but only 78,372 distinct rows (and only
   78,372 distinct `(order_type, order_number, order_line)` grain values). A join in the teardown gold
   merge is multiplying rows. This one needs a dedup/fix regardless of key choice.

## Natural (grain) keys verified UNIQUE in live data

These would work as PKs **if** the source tables declared them (they currently declare the surrogate):

| Table | Unique natural key | Distinct = total |
|---|---|---|
| dim_part | `pn` | 89,344 ✅ |
| fact_defect | `(defect_type, defect, defect_item)` | 172,982 ✅ |
| fact_order | `(order_type, order_number, order_line)` | 1,406,198 ✅ |
| fact_inventory_transaction | `(transaction_no, batch)` | 13,950,200 ✅ |
| fact_component_removal | `(transaction, transaction_item)` | 751,774 ✅ |
| fact_inventory_control | `(pn, sn, control)` | 638,264 ✅ |
| fact_inventory_snapshot | `(batch)` | 147,532 ✅ |
| fact_teardown | `(order_type, order_number, order_line)` | **78,372 ≠ 19.47M** ❌ |

## Why we can't just switch the PK here

The Synced Tables API rejects a PK that isn't part of the source table's declared UC PRIMARY KEY
constraint (`INVALID_PARAMETER_VALUE: Column pn cannot be used ... not part of the existing PRIMARY KEY`).
The user has **no explicit grants** on the team-owned `an_maintenanceengineering_ods` tables, so we cannot
`ALTER TABLE ... ADD/DROP PRIMARY KEY` on them. The correct fix is upstream in the Gold pipeline.

## Recommended fixes (need user decision)

- **A (recommended): Fix the Gold layer** in `n_archibald_ppmtx_dab` — regenerate each `*_key` as a truly
  unique surrogate (e.g. `monotonically_increasing_id()` or a collision-free hash of the grain), and fix
  the `fact_teardown` join fan-out; redeploy the gold pipeline; then re-run this sync. Clean and durable.
- **B: Re-declare source PK constraints** to the verified natural keys above (6/7 facts + `pn`). Requires
  ALTER/owner on the team-owned tables (likely blocked) and still doesn't fix `fact_teardown`.
- **C: Ship the 5 working tables now**, defer the 8 until the gold layer is corrected.

## Diagnostics used

- Serverless one-off jobs (`ppmtx_profile_keys`, `ppmtx_profile_grain2`) — the user cannot create SQL
  warehouses or clusters, but *can* submit serverless notebook jobs; used `dbutils.notebook.exit(json)`
  to return counts.
- REST: `POST/GET/DELETE /api/2.0/postgres/synced_tables` with bearer token from `databricks auth token`.
- **Row-count verification (Step 5)** could not run from the local IDE (corporate firewall blocks
  outbound TCP 5432 to the Lakebase host); verified instead via a serverless job (`ppmtx_verify_counts`)
  connecting with `psycopg2` and a `generate-database-credential` token. All 5 live tables returned
  non-zero counts (above).
- **Cleanup:** the 8 failed attempts left empty/FAILED synced-table shells; all 8 registrations were
  deleted via the REST `DELETE` endpoint. The `n_archibald` Postgres schema now contains **only the 5
  healthy synced tables**.

## To resume after the Gold layer is fixed

Re-run creation for the 8 remaining tables (dependency order: `dim_part` → 6 facts → skip/repair
`fact_teardown`) once their source surrogate keys are unique. The verified natural keys above can serve
as the regenerated surrogate basis. Helper scripts live in the session folder
(`create_synced.py`, `fix_synced.py`, `profile_*.py`, `verify_counts_nb.py`).
