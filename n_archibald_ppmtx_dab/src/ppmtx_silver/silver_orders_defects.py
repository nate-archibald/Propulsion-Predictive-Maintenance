# Databricks notebook source
# MAGIC %md
# MAGIC # Silver Layer - Orders, Defects & Tear Down Reports
# MAGIC Spark Declarative Pipeline notebook for maintenance order and defect tracking tables.

# COMMAND ----------

import dlt
from pyspark.sql import functions as F
from dq_rules_loader import get_critical_rules_for_table, get_warning_rules_for_table

# COMMAND ----------

# MAGIC %md
# MAGIC ## Helper: Get Bronze Table

# COMMAND ----------

def get_bronze_table(table_name):
    """Read a Bronze table using batch read from the configured source."""
    bronze_catalog = spark.conf.get("bronze_catalog")
    bronze_schema = spark.conf.get("bronze_schema")
    # Exclude CDF metadata columns that conflict with enabling CDF on Silver tables
    cdf_cols = ["_change_type", "_commit_version", "_commit_timestamp"]
    df = spark.read.table(
        f"{bronze_catalog}.{bronze_schema}.{table_name}"
    )
    return df.drop(*cdf_cols)

# COMMAND ----------

# MAGIC %md
# MAGIC ## qx_ppmtx_order_detail (Order Details)

# COMMAND ----------

@dlt.table(
    name="qx_ppmtx_order_detail",
    comment="Silver order detail - validated maintenance order line items",
    table_properties={
        "delta.enableChangeDataFeed": "true",
        "delta.enableRowTracking": "true",
        "delta.autoOptimize.optimizeWrite": "true",
        "delta.autoOptimize.autoCompact": "true",
        "quality": "silver",
    },
    cluster_by_auto=True,
)
@dlt.expect_all_or_drop(get_critical_rules_for_table("qx_ppmtx_order_detail"))
@dlt.expect_all(get_warning_rules_for_table("qx_ppmtx_order_detail"))
def qx_ppmtx_order_detail():
    return (
        get_bronze_table("qx_trax_order_detail")
        .withColumn("processed_timestamp", F.current_timestamp())
    )

# COMMAND ----------

# MAGIC %md
# MAGIC ## qx_ppmtx_pn_tear_down_report (Tear Down Reports)

# COMMAND ----------

@dlt.table(
    name="qx_ppmtx_pn_tear_down_report",
    comment="Silver tear down reports - validated component teardown and fault analysis records",
    table_properties={
        "delta.enableChangeDataFeed": "true",
        "delta.enableRowTracking": "true",
        "delta.autoOptimize.optimizeWrite": "true",
        "delta.autoOptimize.autoCompact": "true",
        "quality": "silver",
    },
    cluster_by_auto=True,
)
@dlt.expect_all_or_drop(get_critical_rules_for_table("qx_ppmtx_pn_tear_down_report"))
@dlt.expect_all(get_warning_rules_for_table("qx_ppmtx_pn_tear_down_report"))
def qx_ppmtx_pn_tear_down_report():
    return (
        get_bronze_table("qx_trax_pn_tear_down_report")
        .withColumn("processed_timestamp", F.current_timestamp())
    )

# COMMAND ----------

# MAGIC %md
# MAGIC ## qx_ppmtx_defect_report (Defect Reports)

# COMMAND ----------

@dlt.table(
    name="qx_ppmtx_defect_report",
    comment="Silver defect reports - validated aircraft defect and maintenance action records",
    table_properties={
        "delta.enableChangeDataFeed": "true",
        "delta.enableRowTracking": "true",
        "delta.autoOptimize.optimizeWrite": "true",
        "delta.autoOptimize.autoCompact": "true",
        "quality": "silver",
    },
    cluster_by_auto=True,
)
@dlt.expect_all_or_drop(get_critical_rules_for_table("qx_ppmtx_defect_report"))
@dlt.expect_all(get_warning_rules_for_table("qx_ppmtx_defect_report"))
def qx_ppmtx_defect_report():
    return (
        get_bronze_table("qx_trax_defect_report")
        .withColumn("processed_timestamp", F.current_timestamp())
    )

# COMMAND ----------

# MAGIC %md
# MAGIC ## qx_ppmtx_defect_report_pn (Defect Report Parts)

# COMMAND ----------

@dlt.table(
    name="qx_ppmtx_defect_report_pn",
    comment="Silver defect report parts - validated parts associated with defect reports",
    table_properties={
        "delta.enableChangeDataFeed": "true",
        "delta.enableRowTracking": "true",
        "delta.autoOptimize.optimizeWrite": "true",
        "delta.autoOptimize.autoCompact": "true",
        "quality": "silver",
    },
    cluster_by_auto=True,
)
@dlt.expect_all_or_drop(get_critical_rules_for_table("qx_ppmtx_defect_report_pn"))
@dlt.expect_all(get_warning_rules_for_table("qx_ppmtx_defect_report_pn"))
def qx_ppmtx_defect_report_pn():
    return (
        get_bronze_table("qx_trax_defect_report_pn")
        .withColumn("processed_timestamp", F.current_timestamp())
    )
