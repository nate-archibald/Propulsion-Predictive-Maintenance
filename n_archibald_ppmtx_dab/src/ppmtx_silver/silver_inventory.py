# Databricks notebook source
# MAGIC %md
# MAGIC # Silver Layer - Inventory & Transaction Facts
# MAGIC Spark Declarative Pipeline notebook for inventory and transaction fact tables.

# COMMAND ----------

import dlt
from pyspark.sql import functions as F
from dq_rules_loader import get_critical_rules_for_table, get_warning_rules_for_table, get_quarantine_condition

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
# MAGIC ## qx_ppmtx_pn_inventory_detail (Inventory Detail)

# COMMAND ----------

@dlt.table(
    name="qx_ppmtx_pn_inventory_detail",
    comment="Silver inventory detail - validated part inventory records with cost and condition tracking",
    table_properties={
        "delta.enableChangeDataFeed": "true",
        "delta.enableRowTracking": "true",
        "delta.autoOptimize.optimizeWrite": "true",
        "delta.autoOptimize.autoCompact": "true",
        "quality": "silver",
    },
    cluster_by_auto=True,
)
@dlt.expect_all_or_drop(get_critical_rules_for_table("qx_ppmtx_pn_inventory_detail"))
@dlt.expect_all(get_warning_rules_for_table("qx_ppmtx_pn_inventory_detail"))
def qx_ppmtx_pn_inventory_detail():
    return (
        get_bronze_table("qx_trax_pn_inventory_detail")
        .withColumn("processed_timestamp", F.current_timestamp())
    )

# COMMAND ----------

# MAGIC %md
# MAGIC ## qx_ppmtx_pn_inventory_history (Inventory Transaction History)

# COMMAND ----------

@dlt.table(
    name="qx_ppmtx_pn_inventory_history",
    comment="Silver inventory history - validated inventory transaction records",
    table_properties={
        "delta.enableChangeDataFeed": "true",
        "delta.enableRowTracking": "true",
        "delta.autoOptimize.optimizeWrite": "true",
        "delta.autoOptimize.autoCompact": "true",
        "quality": "silver",
    },
    cluster_by_auto=True,
)
@dlt.expect_all_or_drop(get_critical_rules_for_table("qx_ppmtx_pn_inventory_history"))
@dlt.expect_all(get_warning_rules_for_table("qx_ppmtx_pn_inventory_history"))
def qx_ppmtx_pn_inventory_history():
    return (
        get_bronze_table("qx_trax_pn_inventory_history")
        .withColumn("processed_timestamp", F.current_timestamp())
    )

# COMMAND ----------

# MAGIC %md
# MAGIC ## qx_ppmtx_ac_pn_transaction_history (Aircraft Part Transaction History)

# COMMAND ----------

@dlt.table(
    name="qx_ppmtx_ac_pn_transaction_history",
    comment="Silver aircraft part transactions - validated component removal/installation history",
    table_properties={
        "delta.enableChangeDataFeed": "true",
        "delta.enableRowTracking": "true",
        "delta.autoOptimize.optimizeWrite": "true",
        "delta.autoOptimize.autoCompact": "true",
        "quality": "silver",
    },
    cluster_by_auto=True,
)
@dlt.expect_all_or_drop(get_critical_rules_for_table("qx_ppmtx_ac_pn_transaction_history"))
@dlt.expect_all(get_warning_rules_for_table("qx_ppmtx_ac_pn_transaction_history"))
def qx_ppmtx_ac_pn_transaction_history():
    return (
        get_bronze_table("qx_trax_ac_pn_transaction_history")
        .withColumn("processed_timestamp", F.current_timestamp())
    )

# COMMAND ----------

# MAGIC %md
# MAGIC ## Quarantine Table - Inventory Detail (Critical Violations)

# COMMAND ----------

@dlt.table(
    name="qx_ppmtx_pn_inventory_detail_quarantine",
    comment="Quarantined inventory detail records that failed critical DQ rules",
    table_properties={
        "delta.enableChangeDataFeed": "true",
        "delta.autoOptimize.optimizeWrite": "true",
        "delta.autoOptimize.autoCompact": "true",
        "quality": "quarantine",
    },
    cluster_by_auto=True,
)
def qx_ppmtx_pn_inventory_detail_quarantine():
    quarantine_cond = get_quarantine_condition("qx_ppmtx_pn_inventory_detail")
    return (
        get_bronze_table("qx_trax_pn_inventory_detail")
        .filter(F.expr(quarantine_cond))
        .withColumn("quarantine_timestamp", F.current_timestamp())
        .withColumn("quarantine_reason", F.lit("Failed critical DQ rules"))
    )
