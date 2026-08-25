#!/usr/bin/env python
"""
Deploy Tier 1 Daily Materialized Views via Databricks SDK
"""

from databricks.sql import connect
import time

# Configuration
SILVER_CATALOG = 'subject_maintenanceengineering_test'
SILVER_SCHEMA = 'an_maintenanceengineering_ods'
BRONZE_CATALOG = 'subject_maintenanceengineering'
BRONZE_SCHEMA = 'ds_maintenanceengineering_ods'

# SQL Statements for all 6 Tier 1 Daily MVs
mv_definitions = [
    {
        "name": "qx_ppmtx_pn_master",
        "comment": "Part Number Master - validated part catalog with quality checks",
        "bronze_table": "qx_trax_pn_master"
    },
    {
        "name": "qx_ppmtx_pn_inventory_detail",
        "comment": "Inventory Detail - validated part inventory records",
        "bronze_table": "qx_trax_pn_inventory_detail"
    },
    {
        "name": "qx_ppmtx_pn_inventory_history",
        "comment": "Inventory History - validated inventory transaction records",
        "bronze_table": "qx_trax_pn_inventory_history"
    },
    {
        "name": "qx_ppmtx_ac_pn_transaction_history",
        "comment": "Aircraft Part Transactions - component removal/installation history",
        "bronze_table": "qx_trax_ac_pn_transaction_history"
    },
    {
        "name": "qx_ppmtx_pn_tear_down_report",
        "comment": "Tear Down Reports - component teardown and fault analysis records",
        "bronze_table": "qx_trax_pn_tear_down_report"
    },
    {
        "name": "qx_ppmtx_order_detail",
        "comment": "Order Details - validated maintenance order line items",
        "bronze_table": "qx_trax_order_detail"
    }
]

def create_mv(cursor, mv_info):
    """Create a single materialized view"""
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
    
    print(f"Creating {mv_name}...", end=" ", flush=True)
    try:
        cursor.execute(sql)
        print("[OK]")
        return True
    except Exception as e:
        print(f"[ERROR] {e}")
        return False

def verify_mvs(cursor):
    """Verify all 6 Tier 1 Daily MVs were created"""
    print("\n" + "="*80)
    print("VERIFICATION: All 6 Tier 1 Daily MVs")
    print("="*80)
    
    sql = f"""
    SELECT 
      m.table_name,
      m.table_type,
      m.table_owner,
      m.created_time
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
    
    try:
        result = cursor.execute(sql).fetchall()
        print(f"\n[OK] Found {len(result)} Materialized Views:\n")
        for row in result:
            print(f"  {row[0]:<40} | Owner: {row[2]:<30} | Created: {row[3]}")
        return len(result) == 6
    except Exception as e:
        print(f"[ERROR] Verification failed: {e}")
        return False

def main():
    """Main deployment function"""
    print("\n" + "="*80)
    print("TIER 1 DAILY MATERIALIZED VIEWS - DEPLOYMENT")
    print("="*80)
    print(f"Silver Location: {SILVER_CATALOG}.{SILVER_SCHEMA}")
    print(f"Bronze Location: {BRONZE_CATALOG}.{BRONZE_SCHEMA}")
    print("="*80 + "\n")
    
    try:
        # Connect to Databricks
        print("Connecting to Databricks...", end=" ", flush=True)
        with connect(
            server_hostname="adb-620317033646362.2.azuredatabricks.net",
            http_path="/sql/1.0/warehouses/c4e3ef39022c2b04",
            auth_type="pat"
        ) as connection:
            print("[OK] Connected\n")
            
            with connection.cursor() as cursor:
                # Create all 6 Tier 1 Daily MVs
                success_count = 0
                for mv_info in mv_definitions:
                    if create_mv(cursor, mv_info):
                        success_count += 1
                
                print(f"\n{success_count}/{len(mv_definitions)} MVs created successfully")
                
                # Wait a moment for system to settle
                print("\nWaiting for system to register MVs...", end=" ", flush=True)
                time.sleep(5)
                print("[OK]")
                
                # Verify all MVs were created
                if verify_mvs(cursor):
                    print("\n" + "="*80)
                    print("[SUCCESS] All 6 Tier 1 Daily MVs deployed successfully!")
                    print("="*80)
                    print("\nNext Steps:")
                    print("1. Wait for first refresh (7:00 AM UTC tomorrow)")
                    print("2. Run STEP 2 deployment: 02_TIER1_HOURLY_DEPLOY.sql")
                    print("3. Run STEP 3 deployment: 03_TIER2_TRIGGER_DEPLOY.sql")
                    return 0
                else:
                    print("\n[WARNING] Verification query returned fewer than 6 MVs")
                    return 1
                    
    except Exception as e:
        print(f"\n[ERROR] FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit(main())
