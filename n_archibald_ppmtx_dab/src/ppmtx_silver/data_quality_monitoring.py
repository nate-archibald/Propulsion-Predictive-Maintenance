# Databricks notebook source
# MAGIC %md
# MAGIC # Silver Layer - Data Quality Monitoring Views
# MAGIC Spark Declarative Pipeline notebook for DQ metrics, referential integrity, and data freshness.

# COMMAND ----------

import dlt
from pyspark.sql import functions as F

# COMMAND ----------

# MAGIC %md
# MAGIC ## DQ Metrics - Record Counts per Silver Table

# COMMAND ----------

@dlt.table(
    name="qx_ppmtx_dq_record_counts",
    comment="Data quality monitoring - record counts and processing timestamps per Silver table",
    table_properties={
        "delta.enableChangeDataFeed": "true",
        "delta.autoOptimize.optimizeWrite": "true",
        "delta.autoOptimize.autoCompact": "true",
        "quality": "monitoring",
    },
    cluster_by_auto=True,
)
def qx_ppmtx_dq_record_counts():
    tables = [
        "qx_ppmtx_pn_master",
        "qx_ppmtx_pn_inventory_control",
        "qx_ppmtx_pn_inventory_detail",
        "qx_ppmtx_pn_inventory_history",
        "qx_ppmtx_ac_pn_transaction_history",
        "qx_ppmtx_order_detail",
        "qx_ppmtx_pn_tear_down_report",
        "qx_ppmtx_defect_report",
        "qx_ppmtx_defect_report_pn",
    ]

    union_sql = " UNION ALL ".join([
        f"SELECT '{tbl}' AS table_name, COUNT(*) AS record_count, MAX(modified_date) AS last_processed FROM LIVE.{tbl}"
        for tbl in tables
    ])

    return spark.sql(union_sql)

# COMMAND ----------

# MAGIC %md
# MAGIC ## Referential Integrity - Inventory Detail to Part Master

# COMMAND ----------

@dlt.table(
    name="qx_ppmtx_dq_orphaned_inventory",
    comment="Referential integrity check - inventory detail records without matching part master entry",
    table_properties={
        "delta.enableChangeDataFeed": "true",
        "delta.autoOptimize.optimizeWrite": "true",
        "delta.autoOptimize.autoCompact": "true",
        "quality": "monitoring",
    },
    cluster_by_auto=True,
)
def qx_ppmtx_dq_orphaned_inventory():
    return spark.sql("""
        SELECT
            inv.batch,
            inv.pn,
            inv.sn,
            inv.condition,
            'Missing in pn_master' AS integrity_issue
        FROM LIVE.qx_ppmtx_pn_inventory_detail AS inv
        LEFT JOIN LIVE.qx_ppmtx_pn_master AS pm ON inv.pn = pm.pn
        WHERE pm.pn IS NULL AND inv.pn IS NOT NULL
    """)

# COMMAND ----------

# MAGIC %md
# MAGIC ## Referential Integrity - Defect Report PNs to Part Master

# COMMAND ----------

@dlt.table(
    name="qx_ppmtx_dq_orphaned_defect_pn",
    comment="Referential integrity check - defect report parts without matching part master entry",
    table_properties={
        "delta.enableChangeDataFeed": "true",
        "delta.autoOptimize.optimizeWrite": "true",
        "delta.autoOptimize.autoCompact": "true",
        "quality": "monitoring",
    },
    cluster_by_auto=True,
)
def qx_ppmtx_dq_orphaned_defect_pn():
    return spark.sql("""
        SELECT
            drp.defect_type,
            drp.defect,
            drp.defect_item,
            drp.pn,
            'Missing in pn_master' AS integrity_issue
        FROM LIVE.qx_ppmtx_defect_report_pn AS drp
        LEFT JOIN LIVE.qx_ppmtx_pn_master AS pm ON drp.pn = pm.pn
        WHERE pm.pn IS NULL AND drp.pn IS NOT NULL
    """)
