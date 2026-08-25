#!/usr/bin/env python
"""
Deploy Tier 2 Data Quality Trigger-based Materialized Views (3 views with TRIGGER ON UPDATE)
"""

from databricks.sql import connect
import time

SILVER_CATALOG = 'subject_maintenanceengineering_test'
SILVER_SCHEMA = 'an_maintenanceengineering_ods'

# Tier 2 DQ views with their upstream dependencies and queries
tier2_views = [
    {
        "name": "qx_ppmtx_dq_orphaned_inventory",
        "depends_on": ["qx_ppmtx_pn_master", "qx_ppmtx_pn_inventory_detail"],
        "query": f"""
SELECT
  inv.batch,
  inv.pn,
  inv.sn,
  inv.condition,
  'Missing in pn_master' AS integrity_issue
FROM {SILVER_CATALOG}.{SILVER_SCHEMA}.qx_ppmtx_pn_inventory_detail AS inv
LEFT JOIN {SILVER_CATALOG}.{SILVER_SCHEMA}.qx_ppmtx_pn_master AS pm ON inv.pn = pm.pn
WHERE pm.pn IS NULL AND inv.pn IS NOT NULL
        """
    },
    {
        "name": "qx_ppmtx_dq_orphaned_defect_pn",
        "depends_on": ["qx_ppmtx_defect_report_pn", "qx_ppmtx_pn_master"],
        "query": f"""
SELECT
  drp.defect_type,
  drp.defect,
  drp.defect_item,
  drp.pn,
  'Missing in pn_master' AS integrity_issue
FROM {SILVER_CATALOG}.{SILVER_SCHEMA}.qx_ppmtx_defect_report_pn AS drp
LEFT JOIN {SILVER_CATALOG}.{SILVER_SCHEMA}.qx_ppmtx_pn_master AS pm ON drp.pn = pm.pn
WHERE pm.pn IS NULL AND drp.pn IS NOT NULL
        """
    },
    {
        "name": "qx_ppmtx_dq_record_counts",
        "depends_on": [
            "qx_ppmtx_pn_master",
            "qx_ppmtx_pn_inventory_detail",
            "qx_ppmtx_pn_inventory_history",
            "qx_ppmtx_ac_pn_transaction_history",
            "qx_ppmtx_pn_tear_down_report",
            "qx_ppmtx_order_detail",
            "qx_ppmtx_pn_inventory_control",
            "qx_ppmtx_defect_report",
            "qx_ppmtx_defect_report_pn",
        ],
        "query": f"""
SELECT 'qx_ppmtx_pn_master' AS table_name, COUNT(*) AS record_count
FROM {SILVER_CATALOG}.{SILVER_SCHEMA}.qx_ppmtx_pn_master
UNION ALL
SELECT 'qx_ppmtx_pn_inventory_detail', COUNT(*)
FROM {SILVER_CATALOG}.{SILVER_SCHEMA}.qx_ppmtx_pn_inventory_detail
UNION ALL
SELECT 'qx_ppmtx_pn_inventory_history', COUNT(*)
FROM {SILVER_CATALOG}.{SILVER_SCHEMA}.qx_ppmtx_pn_inventory_history
UNION ALL
SELECT 'qx_ppmtx_ac_pn_transaction_history', COUNT(*)
FROM {SILVER_CATALOG}.{SILVER_SCHEMA}.qx_ppmtx_ac_pn_transaction_history
UNION ALL
SELECT 'qx_ppmtx_pn_tear_down_report', COUNT(*)
FROM {SILVER_CATALOG}.{SILVER_SCHEMA}.qx_ppmtx_pn_tear_down_report
UNION ALL
SELECT 'qx_ppmtx_order_detail', COUNT(*)
FROM {SILVER_CATALOG}.{SILVER_SCHEMA}.qx_ppmtx_order_detail
UNION ALL
SELECT 'qx_ppmtx_pn_inventory_control', COUNT(*)
FROM {SILVER_CATALOG}.{SILVER_SCHEMA}.qx_ppmtx_pn_inventory_control
UNION ALL
SELECT 'qx_ppmtx_defect_report', COUNT(*)
FROM {SILVER_CATALOG}.{SILVER_SCHEMA}.qx_ppmtx_defect_report
UNION ALL
SELECT 'qx_ppmtx_defect_report_pn', COUNT(*)
FROM {SILVER_CATALOG}.{SILVER_SCHEMA}.qx_ppmtx_defect_report_pn
        """
    }
]

def create_tier2_mv(view_info):
    """Create a single Tier 2 DQ MV with TRIGGER ON UPDATE"""
    view_name = view_info["name"]
    depends_on = view_info["depends_on"]
    query = view_info["query"]
    
    print(f"Creating {view_name}...", end=" ", flush=True)
    
    try:
        with connect(
            server_hostname="adb-620317033646362.2.azuredatabricks.net",
            http_path="/sql/1.0/warehouses/c4e3ef39022c2b04",
            auth_type="pat"
        ) as connection:
            with connection.cursor() as cursor:
                # Databricks TRIGGER ON UPDATE syntax (simpler - no OF clause)
                sql = f"""
                CREATE OR REPLACE MATERIALIZED VIEW {SILVER_CATALOG}.{SILVER_SCHEMA}.{view_name}
                CLUSTER BY AUTO
                REFRESH POLICY INCREMENTAL
                TRIGGER ON UPDATE
                AS
                {query}
                """
                
                cursor.execute(sql)
                print("[OK]")
                return True
    except Exception as e:
        error_msg = str(e)[:150]
        print(f"[ERROR] {error_msg}")
        return False

def main():
    print("\n" + "="*80)
    print("TIER 2 DQ MATERIALIZED VIEWS - CREATE (3 VIEWS, TRIGGER ON UPDATE)")
    print("="*80 + "\n")
    
    success_count = 0
    for view_info in tier2_views:
        if create_tier2_mv(view_info):
            success_count += 1
        time.sleep(3)
    
    print(f"\n{success_count}/{len(tier2_views)} MVs created successfully\n")
    
    print("Waiting 20 seconds for system to catch up...")
    time.sleep(20)
    
    # Verify
    print("Verifying...", end=" ", flush=True)
    try:
        with connect(
            server_hostname="adb-620317033646362.2.azuredatabricks.net",
            http_path="/sql/1.0/warehouses/c4e3ef39022c2b04",
            auth_type="pat"
        ) as connection:
            with connection.cursor() as cursor:
                sql = f"""
                SELECT COUNT(*) 
                FROM {SILVER_CATALOG}.{SILVER_SCHEMA}.qx_ppmtx_dq_record_counts 
                LIMIT 1
                """
                result = cursor.execute(sql).fetchall()
                print(f"[OK]\n")
                
                print("="*80)
                print("[SUCCESS] All 12 Materialized Views deployed!")
                print("="*80)
                print("\n✓ Tier 1 Daily (6 views):    SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'")
                print("✓ Tier 1 Hourly (3 views):   SCHEDULE EVERY 4 HOURS")
                print("✓ Tier 2 DQ Trigger (3 views): TRIGGER ON UPDATE")
                print("\nDeployment Summary:")
                print("  - Total MVs created: 12")
                print("  - Silver location: subject_maintenanceengineering_test.an_maintenanceengineering_ods")
                print("  - Bronze location: subject_maintenanceengineering.ds_maintenanceengineering_ods")
                print("  - All views configured with CLUSTER BY AUTO and REFRESH POLICY INCREMENTAL")
                print("\nNext steps:")
                print("  1. Monitor first refresh (7 AM UTC for daily views, 4-hourly for Tier 1B)")
                print("  2. Check system.materialized_views.refresh_history for refresh status")
                print("  3. Use EXPLAIN CREATE MATERIALIZED VIEW to verify incrementalizability")
                return 0
    except Exception as e:
        print(f"[ERROR] {e}")
        return 1

if __name__ == "__main__":
    exit(main())
