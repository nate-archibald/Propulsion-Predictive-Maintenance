#!/usr/bin/env python
"""
Minimal deployment script using SQL warehouse async API
"""

import subprocess
import json
import time

# The SQL queries
tier1_daily_sql = [
    # 1. qx_ppmtx_pn_master
    """CREATE OR REPLACE MATERIALIZED VIEW subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_pn_master
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS SELECT * FROM subject_maintenanceengineering.ds_maintenanceengineering_ods.qx_trax_pn_master""",
    
    # 2. qx_ppmtx_pn_inventory_detail
    """CREATE OR REPLACE MATERIALIZED VIEW subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_pn_inventory_detail
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS SELECT * FROM subject_maintenanceengineering.ds_maintenanceengineering_ods.qx_trax_pn_inventory_detail""",
    
    # 3. qx_ppmtx_pn_inventory_history
    """CREATE OR REPLACE MATERIALIZED VIEW subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_pn_inventory_history
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS SELECT * FROM subject_maintenanceengineering.ds_maintenanceengineering_ods.qx_trax_pn_inventory_history""",
    
    # 4. qx_ppmtx_ac_pn_transaction_history
    """CREATE OR REPLACE MATERIALIZED VIEW subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_ac_pn_transaction_history
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS SELECT * FROM subject_maintenanceengineering.ds_maintenanceengineering_ods.qx_trax_ac_pn_transaction_history""",
    
    # 5. qx_ppmtx_pn_tear_down_report
    """CREATE OR REPLACE MATERIALIZED VIEW subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_pn_tear_down_report
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS SELECT * FROM subject_maintenanceengineering.ds_maintenanceengineering_ods.qx_trax_pn_tear_down_report""",
    
    # 6. qx_ppmtx_order_detail
    """CREATE OR REPLACE MATERIALIZED VIEW subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_order_detail
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS SELECT * FROM subject_maintenanceengineering.ds_maintenanceengineering_ods.qx_trax_order_detail"""
]

def main():
    print("\n" + "="*80)
    print("TIER 1 DAILY MATERIALIZED VIEWS - DEPLOYMENT (via REST API)")
    print("="*80 + "\n")
    
    warehouse_id = "c4e3ef39022c2b04"
    
    # Get host/token
    try:
        result = subprocess.run(
            ["databricks", "auth", "token", "--profile", "adb-620317033646362"],
            capture_output=True,
            text=True,
            check=True
        )
        token_data = json.loads(result.stdout)
        token = token_data["access_token"]
    except Exception as e:
        print(f"[ERROR] Could not get token: {e}")
        return 1
    
    host = "adb-620317033646362.2.azuredatabricks.net"
    
    # Execute each query
    for i, sql in enumerate(tier1_daily_sql, 1):
        view_name = sql.split('.')[-1].split('\n')[0].strip()
        print(f"({i}/6) Creating {view_name}...", end=" ", flush=True)
        
        try:
            # Use curl to execute statement via SQL API
            curl_cmd = [
                "curl",
                "-s",
                "-X", "POST",
                f"https://{host}/api/2.1/sql/statements",
                "-H", f"Authorization: Bearer {token}",
                "-H", "Content-Type: application/json",
                "-d", json.dumps({
                    "warehouse_id": warehouse_id,
                    "statement": sql,
                    "wait_timeout": "3600s"
                })
            ]
            
            result = subprocess.run(curl_cmd, capture_output=True, text=True, check=True)
            response = json.loads(result.stdout)
            
            if "statement_id" in response:
                print("[OK]")
            else:
                print(f"[ERROR] {response}")
                
        except Exception as e:
            print(f"[ERROR] {e}")
    
    print("\n[INFO] Deployment complete. Verifying in 10 seconds...\n")
    time.sleep(10)
    
    # Verify
    verify_sql = """
    SELECT table_name, table_type
    FROM system.information_schema.tables
    WHERE table_catalog='subject_maintenanceengineering_test'
    AND table_schema='an_maintenanceengineering_ods'
    AND table_type='MATERIALIZED VIEW'
    AND table_name LIKE 'qx_ppmtx%'
    ORDER BY table_name
    """
    
    try:
        curl_cmd = [
            "curl",
            "-s",
            "-X", "POST",
            f"https://{host}/api/2.1/sql/statements",
            "-H", f"Authorization: Bearer {token}",
            "-H", "Content-Type: application/json",
            "-d", json.dumps({
                "warehouse_id": warehouse_id,
                "statement": verify_sql,
                "wait_timeout": "60s"
            })
        ]
        
        result = subprocess.run(curl_cmd, capture_output=True, text=True, check=True)
        response = json.loads(result.stdout)
        
        print("="*80)
        print("VERIFICATION")
        print("="*80)
        
        if "results" in response and response["results"]["rows"]:
            for row in response["results"]["rows"]:
                print(f"  {row[0]:<45} {row[1]}")
            print(f"\nFound {len(response['results']['rows'])} views")
        else:
            print("[INFO] Query submitted. Check status with statement_id:", response.get("statement_id"))
        
    except Exception as e:
        print(f"[ERROR] Verification failed: {e}")
    
    return 0

if __name__ == "__main__":
    exit(main())
