# Databricks notebook source
# MAGIC %md
# MAGIC # Silver Layer - Part Master & Inventory Control (Dimensions)
# MAGIC Spark Declarative Pipeline notebook for dimension-like tables in the predictive maintenance domain.

# COMMAND ----------

import dlt
from pyspark.sql import functions as F
from dq_rules_loader import get_critical_rules_for_table, get_warning_rules_for_table

# COMMAND ----------

# MAGIC %md
# MAGIC ## Helper: Get Bronze Table

# COMMAND ----------

def get_bronze_table(table_name):
    """Read a Bronze table using Delta streaming from the configured source."""
    bronze_catalog = spark.conf.get("bronze_catalog")
    bronze_schema = spark.conf.get("bronze_schema")
    # Exclude CDF metadata columns that conflict with enabling CDF on Silver tables
    cdf_cols = ["_change_type", "_commit_version", "_commit_timestamp"]
    df = spark.readStream.table(
        f"{bronze_catalog}.{bronze_schema}.{table_name}"
    )
    return df.drop(*cdf_cols)

# COMMAND ----------

# MAGIC %md
# MAGIC ## qx_ppmtx_pn_master (Part Number Master)

# COMMAND ----------

@dlt.table(
    name="qx_ppmtx_pn_master",
    comment="Silver part number master - validated part catalog with quality checks",
    table_properties={
        "delta.enableChangeDataFeed": "true",
        "delta.enableRowTracking": "true",
        "delta.autoOptimize.optimizeWrite": "true",
        "delta.autoOptimize.autoCompact": "true",
        "quality": "silver",
    },
    cluster_by_auto=True,
)
@dlt.expect_all_or_drop(get_critical_rules_for_table("qx_ppmtx_pn_master"))
@dlt.expect_all(get_warning_rules_for_table("qx_ppmtx_pn_master"))
def qx_ppmtx_pn_master():
    return (
        get_bronze_table("qx_trax_pn_master")
        .withColumn("processed_timestamp", F.current_timestamp())
    )

# COMMAND ----------

# MAGIC %md
# MAGIC ## qx_ppmtx_pn_inventory_control (Inventory Control Schedules)

# COMMAND ----------

@dlt.table(
    name="qx_ppmtx_pn_inventory_control",
    comment="Silver inventory control - validated scheduled maintenance controls for parts",
    table_properties={
        "delta.enableChangeDataFeed": "true",
        "delta.enableRowTracking": "true",
        "delta.autoOptimize.optimizeWrite": "true",
        "delta.autoOptimize.autoCompact": "true",
        "quality": "silver",
    },
    cluster_by_auto=True,
)
@dlt.expect_all_or_drop(get_critical_rules_for_table("qx_ppmtx_pn_inventory_control"))
@dlt.expect_all(get_warning_rules_for_table("qx_ppmtx_pn_inventory_control"))
def qx_ppmtx_pn_inventory_control():
    return (
        get_bronze_table("qx_trax_pn_inventory_control")
        .withColumn("processed_timestamp", F.current_timestamp())
    )
