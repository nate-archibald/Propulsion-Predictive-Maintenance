#!/usr/bin/env python
"""
Create views one by one with independent connections and proper error handling
"""

from databricks.sql import connect
import time

SILVER_CATALOG = 'subject_maintenanceengineering_test'
SILVER_SCHEMA = 'an_maintenanceengineering_ods'
BRONZE_CATALOG = 'subject_maintenanceengineering'
BRONZE_SCHEMA = 'ds_maintenanceengineering_ods'

views = [
    ("qx_ppmtx_pn_master", "qx_trax_pn_master"),
    ("qx_ppmtx_pn_inventory_detail", "qx_trax_pn_inventory_detail"),
    ("qx_ppmtx_pn_inventory_history", "qx_trax_pn_inventory_history"),
    ("qx_ppmtx_ac_pn_transaction_history", "qx_trax_ac_pn_transaction_history"),
    ("qx_ppmtx_pn_tear_down_report", "qx_trax_pn_tear_down_report"),
    ("qx_ppmtx_order_detail", "qx_trax_order_detail"),
]

def create_one_mv(view_name, bronze_table):
    """Create a single MV with its own connection"""
    print(f"Creating {view_name}...", end=" ", flush=True)
    
    try:
        # Fresh connection for each view
        with connect(
            server_hostname="adb-620317033646362.2.azuredatabricks.net",
            http_path="/sql/1.0/warehouses/c4e3ef39022c2b04",
            auth_type="pat"
        ) as connection:
            with connection.cursor() as cursor:
                sql = f"""
                CREATE OR REPLACE MATERIALIZED VIEW {SILVER_CATALOG}.{SILVER_SCHEMA}.{view_name}
                CLUSTER BY AUTO
                REFRESH POLICY INCREMENTAL
                SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
                AS SELECT * FROM {BRONZE_CATALOG}.{BRONZE_SCHEMA}.{bronze_table}
                """
                
                cursor.execute(sql)
                print("[OK]")
                return True
    except Exception as e:
        print(f"[ERROR] {str(e)[:100]}")
        return False

def main():
    print("\n" + "="*80)
    print("TIER 1 DAILY MATERIALIZED VIEWS - CREATE (ONE PER CONNECTION)")
    print("="*80 + "\n")
    
    success_count = 0
    for view_name, bronze_table in views:
        if create_one_mv(view_name, bronze_table):
            success_count += 1
        time.sleep(3)  # Brief pause between creations
    
    print(f"\n{success_count}/{len(views)} MVs created successfully\n")
    
    # Final verification
    print("Waiting 15 seconds for system to catch up...")
    time.sleep(15)
    
    print("\nVerifying...", end=" ", flush=True)
    try:
        with connect(
            server_hostname="adb-620317033646362.2.azuredatabricks.net",
            http_path="/sql/1.0/warehouses/c4e3ef39022c2b04",
            auth_type="pat"
        ) as connection:
            with connection.cursor() as cursor:
                sql = f"""
                SELECT table_name
                FROM system.information_schema.tables
                WHERE table_catalog = '{SILVER_CATALOG}'
                  AND table_schema = '{SILVER_SCHEMA}'
                  AND table_type = 'MATERIALIZED VIEW'
                  AND table_name LIKE 'qx_ppmtx%'
                ORDER BY table_name
                """
                result = cursor.execute(sql).fetchall()
                
                print(f"[OK]\nFound {len(result)} MVs:\n")
                for row in result:
                    print(f"  - {row[0]}")
                
                if len(result) >= 6:
                    print("\n" + "="*80)
                    print("[SUCCESS] Tier 1 Daily MVs deployed!")
                    print("="*80)
                    return 0
                else:
                    return 1
    except Exception as e:
        print(f"[ERROR] {e}")
        return 1

if __name__ == "__main__":
    exit(main())
