#!/usr/bin/env python3
"""Create the Lakebase synced table for the per-part live TSN/TSC Gold table.

Adds a reverse-ETL synced table matching the existing `qx_ppmtx_synced_gold_*`
set (TRIGGERED, incremental via Change Data Feed). The daily
`refresh_synced_tables.py` job auto-discovers it by the `qx_ppmtx_synced_gold_`
name prefix — no job edit required.

Uses the Lakebase Autoscaling Postgres API (`POST /api/2.0/postgres/synced_tables`)
with `spec.branch`, matching create_synced_interchangeable_table.py.

Prerequisites (run in order first):
  1. Run the gold merge job so qx_ppmtx_gold_part_live_times exists + is populated
     (it declares PRIMARY KEY (sn) + CDF via merge_part_live_times()).
  2. Run this script.
  3. Grant the app SP SELECT:
     `python scripts/grant_part_live_times_sp.py --profile <p>`.

Usage:
  python scripts/create_synced_part_live_times_table.py --profile adb-620317033646362
  python scripts/create_synced_part_live_times_table.py --profile <p> --no-wait
"""
import argparse
import sys
import time

from databricks.sdk import WorkspaceClient

CATALOG = "subject_maintenanceengineering_test"
SCHEMA = "an_maintenanceengineering_ods"
GOLD_SOURCE = f"{CATALOG}.{SCHEMA}.qx_ppmtx_gold_part_live_times"
SYNCED_ID = f"{CATALOG}.{SCHEMA}.qx_ppmtx_synced_gold_part_live_times"
PRIMARY_KEY = ["sn"]

PROJECT = "nathan-a-ppmtx"
BRANCH = f"projects/{PROJECT}/branches/production"
POSTGRES_DATABASE = "databricks_postgres"

HEALTHY = {
    "SYNCED_TABLE_ONLINE_NO_PENDING_UPDATE",
    "SYNCED_TABLE_ONLINE_TRIGGERED_UPDATE",
    "SYNCED_TABLE_ONLINE_CONTINUOUS_UPDATE",
    "SYNCED_TABLE_ONLINE_SNAPSHOT_UPDATED",
}


def get_state(w: WorkspaceClient, resource_name: str):
    resp = w.api_client.do("GET", f"/api/2.0/postgres/{resource_name}")
    return (resp.get("status") or {}).get("detailed_state")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--profile", required=True, help="Databricks CLI profile")
    ap.add_argument("--no-wait", action="store_true",
                    help="Return immediately instead of polling for a healthy state")
    args = ap.parse_args()

    w = WorkspaceClient(profile=args.profile)
    resource_name = f"synced_tables/{SYNCED_ID}"

    try:
        state = get_state(w, resource_name)
        if state in HEALTHY:
            print(f"[SKIP] {SYNCED_ID} already exists (state={state}). Nothing to do.")
            return 0
        print(f"[WARN] {SYNCED_ID} exists but is unhealthy (state={state}). "
              f"Delete it first, then re-run:\n"
              f"  databricks postgres delete-synced-table {resource_name} --profile {args.profile}")
        return 1
    except Exception:
        pass  # not found — proceed to create

    body = {
        "spec": {
            "source_table_full_name": GOLD_SOURCE,
            "branch": BRANCH,
            "primary_key_columns": PRIMARY_KEY,
            "scheduling_policy": "TRIGGERED",
            "postgres_database": POSTGRES_DATABASE,
            "create_database_objects_if_missing": True,
        }
    }

    print(f"Creating synced table: {SYNCED_ID}")
    print(f"  source : {GOLD_SOURCE}")
    print(f"  pk     : {PRIMARY_KEY}")
    print(f"  branch : {BRANCH}")
    print(f"  policy : TRIGGERED (incremental via CDF)")
    w.api_client.do(
        "POST", "/api/2.0/postgres/synced_tables",
        query={"synced_table_id": SYNCED_ID}, body=body,
    )
    print(f"[OK] Create requested — pipeline provisioning under projects/{PROJECT}.")

    if not args.no_wait:
        deadline = time.time() + 900  # 15 minutes
        while time.time() < deadline:
            state = get_state(w, resource_name)
            print(f"  {time.strftime('%H:%M:%S')} {state}")
            if state in HEALTHY:
                print("[OK] Synced table is online.")
                break
            if state and ("FAILED" in state or "OFFLINE" in state):
                print(f"[FAIL] Synced table reached {state}. "
                      "Check the DLT pipeline update for details.")
                return 1
            time.sleep(15)
        else:
            print("[WARN] Timed out waiting for a healthy state; poll with "
                  f"`databricks postgres get-synced-table {resource_name}`.")

    print()
    print("── NEXT: grant the app service principal SELECT on the new table ──")
    print(f"  python scripts/grant_part_live_times_sp.py --profile {args.profile}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
