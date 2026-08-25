#!/usr/bin/env python
"""
Drop existing Delta Live Tables Materialized Views before converting to standalone
"""

from databricks.sql import connect

SILVER_CATALOG = 'subject_maintenanceengineering_test'
SILVER_SCHEMA = 'an_maintenanceengineering_ods'

# All 12 MV names (9 Tier 1 + 3 Tier 2)
all_mvs = [
    # Tier 1 Daily (6)
    "qx_ppmtx_pn_master",
    "qx_ppmtx_pn_inventory_detail",
    "qx_ppmtx_pn_inventory_history",
    "qx_ppmtx_ac_pn_transaction_history",
    "qx_ppmtx_pn_tear_down_report",
    "qx_ppmtx_order_detail",
    # Tier 1 Hourly (3)
    "qx_ppmtx_pn_inventory_control",
    "qx_ppmtx_defect_report",
    "qx_ppmtx_defect_report_pn",
    # Tier 2 DQ (3)
    "qx_ppmtx_dq_orphaned_defect_pn",
    "qx_ppmtx_dq_orphaned_inventory",
    "qx_ppmtx_dq_record_counts"
]

def drop_mv(cursor, mv_name):
    """Drop a materialized view"""
    sql = f"DROP MATERIALIZED VIEW IF EXISTS {SILVER_CATALOG}.{SILVER_SCHEMA}.{mv_name}"
    print(f"Dropping {mv_name}...", end=" ", flush=True)
    try:
        cursor.execute(sql)
        print("[OK]")
        return True
    except Exception as e:
        print(f"[ERROR] {e}")
        return False

def main():
    print("\n" + "="*80)
    print("STEP 0: DROP EXISTING DELTA LIVE TABLES MATERIALIZED VIEWS")
    print("="*80)
    print(f"Target: {SILVER_CATALOG}.{SILVER_SCHEMA}\n")
    
    try:
        print("Connecting to Databricks...", end=" ", flush=True)
        with connect(
            server_hostname="adb-620317033646362.2.azuredatabricks.net",
            http_path="/sql/1.0/warehouses/c4e3ef39022c2b04",
            auth_type="pat"
        ) as connection:
            print("[OK] Connected\n")
            
            with connection.cursor() as cursor:
                print("[WARNING] This will DROP all 12 existing MVs created by Delta Live Tables.")
                print("[INFO] The standalone versions with refresh policies will be created in subsequent steps.\n")
                
                dropped = 0
                for mv_name in all_mvs:
                    if drop_mv(cursor, mv_name):
                        dropped += 1
                
                print(f"\n{dropped}/{len(all_mvs)} MVs dropped successfully")
                
                print("\n" + "="*80)
                print("[SUCCESS] Ready to deploy standalone MVs")
                print("="*80)
                return 0
                    
    except Exception as e:
        print(f"\n[ERROR] FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit(main())
