#!/usr/bin/env python3
"""Create the part_live_tso table directly via Databricks API."""

from databricks.sdk import WorkspaceClient
import time

w = WorkspaceClient(profile="adb-620317033646362")

# Create a simple notebook content
notebook_content = """# Databricks notebook source
catalog = "subject_maintenanceengineering_test"
schema = "an_maintenanceengineering_ods"
target_table = f"{catalog}.{schema}.qx_ppmtx_gold_part_live_tso"

print(f"Creating: {target_table}")

spark.sql(f\"\"\"
    CREATE TABLE IF NOT EXISTS {target_table} (
        pn STRING,
        sn STRING NOT NULL,
        reset_date DATE,
        baseline_tso_hours INT,
        flight_hours_since_reset INT,
        live_tso INT,
        on_wing_periods INT,
        as_of_date DATE,
        computed_at TIMESTAMP,
        CONSTRAINT pk_part_live_tso PRIMARY KEY (sn, pn)
    ) TBLPROPERTIES (delta.enableChangeDataFeed = true)
\"\"\")

spark.sql(f\"\"\"
    INSERT OVERWRITE TABLE {target_table}
    SELECT 
        ic.pn,
        ic.sn,
        CURRENT_DATE() AS reset_date,
        ic.actual_hours AS baseline_tso_hours,
        0 AS flight_hours_since_reset,
        ic.actual_hours AS live_tso,
        0 AS on_wing_periods,
        CURRENT_DATE() AS as_of_date,
        CURRENT_TIMESTAMP() AS computed_at
    FROM {catalog}.{schema}.qx_ppmtx_gold_fact_inventory_control ic
    WHERE ic.control = 'TSO' AND ic.sn IS NOT NULL
\"\"\")

count = spark.table(target_table).count()
print(f"SUCCESS: {target_table} now has {count} rows")
"""

# Write the notebook to workspace
notebook_path = "/Workspace/Users/nathan.archibald@horizonair.com/.bundle/nathan-a-ppmtx/default/notebooks/create_part_live_tso"
print(f"Writing notebook to: {notebook_path}")

try:
    # Import the notebook
    w.workspace.import_notebook(
        path=notebook_path,
        format="SOURCE",
        language="PYTHON",
        content=notebook_content.encode("utf-8"),
        overwrite=True
    )
    print(f"Notebook created at {notebook_path}")
    
    # Run the notebook
    print("Running notebook...")
    run = w.jobs.submit(
        run_name="Create part_live_tso",
        tasks=[{
            "task_key": "create_part_live_tso",
            "notebook_task": {
                "notebook_path": notebook_path,
            },
            "new_cluster": {
                "spark_version": "14.3.x-scala2.12",
                "node_type_id": "i3.xlarge",
                "num_workers": 1,
            },
        }]
    ).result()
    
    print(f"Run completed with state: {run.state}")
    print(f"Run ID: {run.run_id}")
    
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
