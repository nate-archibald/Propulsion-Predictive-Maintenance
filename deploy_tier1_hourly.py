#!/usr/bin/env python
"""
Deploy Tier 1 Hourly Materialized Views (3 views with EVERY 4 HOURS refresh)
"""

from databricks.sql import connect
import time

SILVER_CATALOG = 'subject_maintenanceengineering_test'
SILVER_SCHEMA = 'an_maintenanceengineering_ods'
BRONZE_CATALOG = 'subject_maintenanceengineering'
BRONZE_SCHEMA = 'ds_maintenanceengineering_ods'

views = [
    ("qx_ppmtx_pn_inventory_control", "qx_trax_pn_inventory_control"),
    ("qx_ppmtx_defect_report", "qx_trax_defect_report"),
    ("qx_ppmtx_defect_report_pn", "qx_trax_defect_report_pn"),
]

def create_one_mv(view_name, bronze_table):
    """Create a single MV with its own connection"""
    print(f"Creating {view_name}...", end=" ", flush=True)
    
    try:
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
                SCHEDULE EVERY 4 HOURS
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
    print("TIER 1 HOURLY MATERIALIZED VIEWS - CREATE (3 VIEWS, EVERY 4 HOURS)")
    print("="*80 + "\n")
    
    success_count = 0
    for view_name, bronze_table in views:
        if create_one_mv(view_name, bronze_table):
            success_count += 1
        time.sleep(3)
    
    print(f"\n{success_count}/{len(views)} MVs created successfully\n")
    
    print("Waiting 15 seconds for system to catch up...")
    time.sleep(15)
    
    # Verify one of them exists
    print("Verifying...", end=" ", flush=True)
    try:
        with connect(
            server_hostname="adb-620317033646362.2.azuredatabricks.net",
            http_path="/sql/1.0/warehouses/c4e3ef39022c2b04",
            auth_type="pat"
        ) as connection:
            with connection.cursor() as cursor:
                # Quick check by querying one view
                sql = "SELECT COUNT(*) FROM subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_pn_inventory_control LIMIT 1"
                result = cursor.execute(sql).fetchall()
                print(f"[OK]\n")
                
                if success_count == 3:
                    print("="*80)
                    print("[SUCCESS] Tier 1 Hourly MVs deployed!")
                    print("="*80)
                    print("\nNext: Deploy Tier 2 DQ Trigger MVs (3 views)")
                    return 0
                else:
                    return 1
    except Exception as e:
        print(f"[ERROR] {e}")
        return 1

if __name__ == "__main__":
    exit(main())
