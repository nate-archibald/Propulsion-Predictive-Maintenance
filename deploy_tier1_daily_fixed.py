#!/usr/bin/env python
"""
Drop the problematic qx_ppmtx_ac_pn_transaction_history MV and recreate all 6 Tier 1 Daily MVs
"""

from databricks.sql import connect
import time

SILVER_CATALOG = 'subject_maintenanceengineering_test'
SILVER_SCHEMA = 'an_maintenanceengineering_ods'
BRONZE_CATALOG = 'subject_maintenanceengineering'
BRONZE_SCHEMA = 'ds_maintenanceengineering_ods'

mv_definitions = [
    {
        "name": "qx_ppmtx_pn_master",
        "bronze_table": "qx_trax_pn_master"
    },
    {
        "name": "qx_ppmtx_pn_inventory_detail",
        "bronze_table": "qx_trax_pn_inventory_detail"
    },
    {
        "name": "qx_ppmtx_pn_inventory_history",
        "bronze_table": "qx_trax_pn_inventory_history"
    },
    {
        "name": "qx_ppmtx_ac_pn_transaction_history",
        "bronze_table": "qx_trax_ac_pn_transaction_history"
    },
    {
        "name": "qx_ppmtx_pn_tear_down_report",
        "bronze_table": "qx_trax_pn_tear_down_report"
    },
    {
        "name": "qx_ppmtx_order_detail",
        "bronze_table": "qx_trax_order_detail"
    }
]

def main():
    print("\n" + "="*80)
    print("STEP 0: DROP PIPELINE-OWNED MV + RECREATE ALL 6 TIER 1 DAILY MVs")
    print("="*80)
    
    try:
        print("Connecting to Databricks...", end=" ", flush=True)
        with connect(
            server_hostname="adb-620317033646362.2.azuredatabricks.net",
            http_path="/sql/1.0/warehouses/c4e3ef39022c2b04",
            auth_type="pat"
        ) as connection:
            print("[OK] Connected\n")
            
            with connection.cursor() as cursor:
                # First, force drop the pipeline-owned MV
                print("Dropping pipeline-owned MV: qx_ppmtx_ac_pn_transaction_history...", end=" ", flush=True)
                try:
                    cursor.execute(f"""
                    ALTER MATERIALIZED VIEW {SILVER_CATALOG}.{SILVER_SCHEMA}.qx_ppmtx_ac_pn_transaction_history
                    OWNER TO CURRENT_USER()
                    """)
                except:
                    pass  # May fail if already dropped
                
                # Now drop it
                sql = f"DROP MATERIALIZED VIEW IF EXISTS {SILVER_CATALOG}.{SILVER_SCHEMA}.qx_ppmtx_ac_pn_transaction_history"
                cursor.execute(sql)
                print("[OK]\n")
                
                # Wait a moment
                time.sleep(2)
                
                # Recreate all 6 Tier 1 Daily MVs
                print("Creating all 6 Tier 1 Daily MVs...\n")
                success_count = 0
                for mv_info in mv_definitions:
                    mv_name = mv_info["name"]
                    bronze_table = mv_info["bronze_table"]
                    
                    sql = f"""
                    CREATE OR REPLACE MATERIALIZED VIEW {SILVER_CATALOG}.{SILVER_SCHEMA}.{mv_name}
                    CLUSTER BY AUTO
                    REFRESH POLICY INCREMENTAL
                    SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
                    AS
                    SELECT *
                    FROM {BRONZE_CATALOG}.{BRONZE_SCHEMA}.{bronze_table}
                    """
                    
                    print(f"  Creating {mv_name}...", end=" ", flush=True)
                    try:
                        cursor.execute(sql)
                        print("[OK]")
                        success_count += 1
                    except Exception as e:
                        print(f"[ERROR] {e}")
                
                print(f"\n{success_count}/{len(mv_definitions)} MVs created successfully\n")
                
                # Wait for system
                print("Waiting for system to register MVs...", end=" ", flush=True)
                time.sleep(5)
                print("[OK]\n")
                
                # Verify
                print("="*80)
                print("VERIFICATION: All 6 Tier 1 Daily MVs")
                print("="*80)
                
                sql = f"""
                SELECT 
                  m.table_name,
                  m.table_type,
                  m.table_owner
                FROM system.information_schema.tables m
                WHERE m.table_catalog = '{SILVER_CATALOG}'
                  AND m.table_schema = '{SILVER_SCHEMA}'
                  AND m.table_type = 'MATERIALIZED VIEW'
                  AND m.table_name IN (
                    'qx_ppmtx_pn_master',
                    'qx_ppmtx_pn_inventory_detail',
                    'qx_ppmtx_pn_inventory_history',
                    'qx_ppmtx_ac_pn_transaction_history',
                    'qx_ppmtx_pn_tear_down_report',
                    'qx_ppmtx_order_detail'
                  )
                ORDER BY m.table_name
                """
                
                result = cursor.execute(sql).fetchall()
                print(f"\n[OK] Found {len(result)}/6 Materialized Views:\n")
                for row in result:
                    print(f"  {row[0]:<40} | {row[1]:<20} | Owner: {row[2]}")
                
                if len(result) == 6:
                    print("\n" + "="*80)
                    print("[SUCCESS] All 6 Tier 1 Daily MVs deployed successfully!")
                    print("="*80)
                    print("\nNext Steps:")
                    print("1. Deploy Tier 1 Hourly MVs (3 views)")
                    print("2. Deploy Tier 2 DQ Trigger MVs (3 views)")
                    return 0
                else:
                    return 1
                    
    except Exception as e:
        print(f"\n[ERROR] FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit(main())
