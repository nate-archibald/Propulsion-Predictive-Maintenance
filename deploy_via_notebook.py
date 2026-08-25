#!/usr/bin/env python
"""
Deploy via notebook execution - execute one MV at a time in separate cells
"""

import subprocess
import json
import time
import tempfile
import os

def run_cmd(cmd):
    """Run shell command and return output"""
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.returncode, result.stdout, result.stderr

def main():
    print("\n" + "="*80)
    print("TIER 1 DAILY MATERIALIZED VIEWS - SEQUENTIAL DEPLOYMENT")
    print("="*80 + "\n")
    
    profile = "adb-620317033646362"
    user_home = "/Users/archibald.n@quantxcloud.com"
    notebook_path = f"{user_home}/tier1_daily_mvs_deploy"
    
    # SQL statements for each view
    views = [
        ("qx_ppmtx_pn_master", "qx_trax_pn_master"),
        ("qx_ppmtx_pn_inventory_detail", "qx_trax_pn_inventory_detail"),
        ("qx_ppmtx_pn_inventory_history", "qx_trax_pn_inventory_history"),
        ("qx_ppmtx_ac_pn_transaction_history", "qx_trax_ac_pn_transaction_history"),
        ("qx_ppmtx_pn_tear_down_report", "qx_trax_pn_tear_down_report"),
        ("qx_ppmtx_order_detail", "qx_trax_order_detail"),
    ]
    
    silver_catalog = "subject_maintenanceengineering_test"
    silver_schema = "an_maintenanceengineering_ods"
    bronze_catalog = "subject_maintenanceengineering"
    bronze_schema = "ds_maintenanceengineering_ods"
    
    # Create notebook content with Python cells
    notebook_content = '''# NBFORMAT 4
{
 "cells": [
'''
    
    cell_template = '''  {{
   "cell_type": "sql",
   "execution_count": {idx},
   "metadata": {{}},
   "outputs": [],
   "source": [
    "CREATE OR REPLACE MATERIALIZED VIEW {silver}.{schema}.{view_name}\\n",
    "CLUSTER BY AUTO\\n",
    "REFRESH POLICY INCREMENTAL\\n",
    "SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'\\n",
    "AS SELECT * FROM {bronze}.{bronze_schema}.{bronze_table}"
   ]
  }},'''
    
    # Build cells
    for idx, (view_name, bronze_table) in enumerate(views, 1):
        cell = cell_template.format(
            idx=idx,
            silver=silver_catalog,
            schema=silver_schema,
            view_name=view_name,
            bronze=bronze_catalog,
            bronze_schema=bronze_schema,
            bronze_table=bronze_table
        )
        notebook_content += '\n' + cell
    
    # Close notebook
    notebook_content = notebook_content.rstrip(',') + '''
 ],
 "metadata": {
  "kernelspec": {{
   "display_name": "SQL",
   "language": "sql",
   "name": "sql"
  }}
 },
 "nbformat": 4,
 "nbformat_minor": 4
}}'''
    
    # Write to temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.ipynb', delete=False) as f:
        f.write(notebook_content)
        temp_file = f.name
    
    try:
        print(f"Creating notebook at {notebook_path}...")
        
        # Upload notebook
        rc, out, err = run_cmd(f'databricks workspace import "{temp_file}" {notebook_path} --format JUPYTER --profile {profile} 2>&1')
        
        if rc == 0:
            print("[OK] Notebook created\n")
            
            # Run notebook
            print("Executing notebook (this will take a few minutes)...")
            rc, out, err = run_cmd(f'databricks jobs run-now --job-id 0 --profile {profile} 2>&1')
            
            if "notebook_task" in out or rc == 0:
                print("[OK] Execution started")
                print("\nPlease check the Databricks workspace to monitor execution progress:")
                print(f"  Notebook: {notebook_path}")
                return 0
            else:
                print(f"[ERROR] {out}\n{err}")
                return 1
        else:
            print(f"[ERROR] Failed to create notebook: {err}")
            return 1
            
    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)

if __name__ == "__main__":
    exit(main())
