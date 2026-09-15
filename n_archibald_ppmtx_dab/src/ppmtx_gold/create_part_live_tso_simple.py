# Databricks notebook source

# MAGIC %md
# MAGIC # Quick Fix: Create part_live_tso table directly

# COMMAND ----------

catalog = "subject_maintenanceengineering_test"
schema = "an_maintenanceengineering_ods"
target_table = f"{catalog}.{schema}.qx_ppmtx_gold_part_live_tso"

print(f"Creating: {target_table}")

spark.sql(f"""
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
""")

# Insert test data
spark.sql(f"""
    INSERT INTO {target_table}
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
""")

count = spark.table(target_table).count()
print(f"OK: {target_table} now has {count} rows")
