#!/usr/bin/env python3
"""Check if the gold tables exist and have data."""

from databricks.sdk import WorkspaceClient
from databricks.sql import connect

w = WorkspaceClient(profile="adb-620317033646362")

# Check if tables exist in UC
catalog = "subject_maintenanceengineering_test"
schema = "an_maintenanceengineering_ods"

tables_to_check = [
    "qx_ppmtx_gold_fact_inventory_control",
    "qx_ppmtx_gold_part_live_tso",
    "qx_ppmtx_synced_gold_part_live_tso",
]

print("Checking tables in UC...")
for table_name in tables_to_check:
    full_name = f"{catalog}.{schema}.{table_name}"
    try:
        table = w.tables.get(full_name)
        print(f"[OK] {table_name}: EXISTS (type: {table.table_type})")
    except Exception as e:
        print(f"[NOTFOUND] {table_name}: NOT FOUND ({type(e).__name__})")

# Try to query row counts
print("\nQuerying row counts...")
warehouse_id = "600d6ad41356867b"  # from databricks.yml

try:
    conn = w.workspace_client.data_sources.get(warehouse_id)
    print(f"[OK] Connected to warehouse: {warehouse_id}")
except Exception as e:
    print(f"[WARN] Could not connect to warehouse: {e}")
