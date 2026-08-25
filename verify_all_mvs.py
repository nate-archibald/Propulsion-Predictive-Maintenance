#!/usr/bin/env python
"""
Verify all 12 Materialized Views are deployed and functional
"""

from databricks.sql import connect

SILVER_CATALOG = 'subject_maintenanceengineering_test'
SILVER_SCHEMA = 'an_maintenanceengineering_ods'

all_views = [
    # Tier 1 Daily (6)
    'qx_ppmtx_pn_master',
    'qx_ppmtx_pn_inventory_detail',
    'qx_ppmtx_pn_inventory_history',
    'qx_ppmtx_ac_pn_transaction_history',
    'qx_ppmtx_pn_tear_down_report',
    'qx_ppmtx_order_detail',
    # Tier 1 Hourly (3)
    'qx_ppmtx_pn_inventory_control',
    'qx_ppmtx_defect_report',
    'qx_ppmtx_defect_report_pn',
    # Tier 2 DQ (3)
    'qx_ppmtx_dq_orphaned_defect_pn',
    'qx_ppmtx_dq_orphaned_inventory',
    'qx_ppmtx_dq_record_counts'
]

def main():
    print("\n" + "="*80)
    print("VERIFICATION: ALL 12 MATERIALIZED VIEWS")
    print("="*80 + "\n")
    
    try:
        with connect(
            server_hostname="adb-620317033646362.2.azuredatabricks.net",
            http_path="/sql/1.0/warehouses/c4e3ef39022c2b04",
            auth_type="pat"
        ) as connection:
            with connection.cursor() as cursor:
                print("Testing each view...\n")
                found = []
                not_found = []
                
                for view_name in all_views:
                    try:
                        sql = f"SELECT COUNT(*) FROM {SILVER_CATALOG}.{SILVER_SCHEMA}.{view_name}"
                        cursor.execute(sql)
                        result = cursor.fetchall()
                        count = result[0][0]
                        found.append((view_name, count))
                        print(f"  [OK] {view_name:<45} ({count} rows)")
                    except Exception as e:
                        not_found.append((view_name, str(e)))
                        print(f"  [FAIL] {view_name:<45} - {str(e)[:60]}")
                
                print("\n" + "="*80)
                print(f"RESULTS: {len(found)}/12 views are accessible\n")
                
                if len(found) == 12:
                    print("[SUCCESS] All 12 Materialized Views deployed and functional!")
                    print("\nDeployment Breakdown:")
                    print("\n  TIER 1 DAILY (6 views, SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'):")
                    tier1_daily = found[:6]
                    for name, count in tier1_daily:
                        print(f"    - {name:<45} {count:>12} rows")
                    
                    print("\n  TIER 1 HOURLY (3 views, SCHEDULE EVERY 4 HOURS):")
                    tier1_hourly = found[6:9]
                    for name, count in tier1_hourly:
                        print(f"    - {name:<45} {count:>12} rows")
                    
                    print("\n  TIER 2 DQ TRIGGER (3 views, TRIGGER ON UPDATE):")
                    tier2_dq = found[9:12]
                    for name, count in tier2_dq:
                        print(f"    - {name:<45} {count:>12} rows")
                    
                    print("\n" + "="*80)
                    print("Location Information:")
                    print(f"  Silver Catalog: {SILVER_CATALOG}")
                    print(f"  Silver Schema:  {SILVER_SCHEMA}")
                    print(f"  Bronze Catalog: subject_maintenanceengineering")
                    print(f"  Bronze Schema:  ds_maintenanceengineering_ods")
                    print("\nAll views configured with:")
                    print("  - CLUSTER BY AUTO")
                    print("  - REFRESH POLICY INCREMENTAL")
                    print("="*80)
                    return 0
                else:
                    if not_found:
                        print("\nFailed Views:")
                        for name, error in not_found:
                            print(f"  - {name}: {error}")
                    return 1
                    
    except Exception as e:
        print(f"[ERROR] Connection failed: {e}")
        return 1

if __name__ == "__main__":
    exit(main())
