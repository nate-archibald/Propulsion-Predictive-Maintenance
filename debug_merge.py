#!/usr/bin/env python3
"""Debug the merge_part_live_tso function."""

from databricks.sdk import WorkspaceClient

w = WorkspaceClient(profile="adb-620317033646362")

catalog = "subject_maintenanceengineering_test"
schema = "an_maintenanceengineering_ods"

# Check source tables
inv_table = f"{catalog}.{schema}.qx_ppmtx_gold_fact_inventory_control"
txn_table = "subject_maintenanceengineering.ds_maintenanceengineering_ods.qx_trax_ac_pn_transaction_history"
flt_table = "subject_maintenanceengineering.ds_maintenanceengineering_ods.qx_trax_ac_actual_flights"

print(f"Checking source tables:")
print(f"  inv: {inv_table}")
print(f"  txn: {txn_table}")
print(f"  flt: {flt_table}")

# Use SQL API to check row counts
from databricks.sql import connect

print("\nConnecting to Databricks SQL Warehouse...")
try:
    conn = connect(
        host="adb-620317033646362.2.azuredatabricks.net",
        http_path="/sql/1.0/warehouses/600d6ad41356867b",
        auth_type="pat",
        token=None,  # Will use default auth
    )
    cursor = conn.cursor()
    
    for table in [inv_table, txn_table, flt_table]:
        try:
            cursor.execute(f"SELECT COUNT(*) as cnt FROM {table}")
            row = cursor.fetchone()
            count = row[0] if row else 0
            print(f"  [{table}] {count} rows")
        except Exception as e:
            print(f"  [{table}] ERROR: {e}")
    
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Could not connect: {e}")
