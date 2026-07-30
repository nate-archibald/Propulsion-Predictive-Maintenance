# Databricks notebook source
# MAGIC %md
# MAGIC # DQ Rules Setup - Propulsion Predictive Maintenance
# MAGIC Creates and populates the centralized data quality rules table for the Silver layer.

# COMMAND ----------

# MAGIC %md
# MAGIC ## Parameters

# COMMAND ----------

dbutils.widgets.text("catalog", "subject_maintenanceengineering_test", "Target Catalog")
dbutils.widgets.text("silver_schema", "an_maintenanceengineering_ods", "Silver Schema")

catalog = dbutils.widgets.get("catalog")
silver_schema = dbutils.widgets.get("silver_schema")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Create DQ Rules Table

# COMMAND ----------

spark.sql(f"USE CATALOG {catalog}")
spark.sql(f"USE SCHEMA {silver_schema}")

# Create the DQ rules table
spark.sql(f"""
CREATE TABLE IF NOT EXISTS {catalog}.{silver_schema}.qx_ppmtx_dq_rules (
    table_name STRING NOT NULL COMMENT 'Target Silver table name',
    rule_name STRING NOT NULL COMMENT 'Unique rule identifier within a table',
    constraint_sql STRING NOT NULL COMMENT 'SQL boolean expression for the rule',
    severity STRING NOT NULL COMMENT 'CRITICAL (drop) or WARNING (log only)',
    description STRING COMMENT 'Human-readable rule description',
    is_active BOOLEAN NOT NULL COMMENT 'Whether the rule is currently active',
    created_date TIMESTAMP COMMENT 'Rule creation timestamp',
    modified_date TIMESTAMP COMMENT 'Last modification timestamp',
    CONSTRAINT pk_dq_rules PRIMARY KEY (table_name, rule_name) NOT ENFORCED
)
USING DELTA
COMMENT 'Centralized data quality rules for Silver layer pipelines'
TBLPROPERTIES (
    'delta.enableChangeDataFeed' = 'true',
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true'
)
CLUSTER BY AUTO
""")

print(f"✓ DQ rules table created: {catalog}.{silver_schema}.qx_ppmtx_dq_rules")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Populate DQ Rules

# COMMAND ----------

from pyspark.sql import functions as F
from pyspark.sql.types import StructType, StructField, StringType, BooleanType, TimestampType
from datetime import datetime

now = datetime.now()

rules_data = [
    # === qx_ppmtx_pn_master (Dimension - Part Number Master) ===
    ("qx_ppmtx_pn_master", "pn_not_null", "pn IS NOT NULL", "CRITICAL", "Part number must not be null", True, now, now),
    ("qx_ppmtx_pn_master", "pn_not_empty", "LENGTH(TRIM(pn)) > 0", "CRITICAL", "Part number must not be empty", True, now, now),
    ("qx_ppmtx_pn_master", "pn_description_not_null", "pn_description IS NOT NULL", "WARNING", "Part description should be populated", True, now, now),
    ("qx_ppmtx_pn_master", "category_not_null", "category IS NOT NULL", "WARNING", "Category should be populated for classification", True, now, now),
    ("qx_ppmtx_pn_master", "shelf_life_days_positive", "shelf_life_days IS NULL OR shelf_life_days >= 0", "CRITICAL", "Shelf life days must be non-negative", True, now, now),

    # === qx_ppmtx_pn_inventory_detail (Fact - Inventory Details) ===
    ("qx_ppmtx_pn_inventory_detail", "batch_not_null", "batch IS NOT NULL", "CRITICAL", "Batch must not be null", True, now, now),
    ("qx_ppmtx_pn_inventory_detail", "pn_not_null", "pn IS NOT NULL", "WARNING", "Part number should be populated", True, now, now),
    ("qx_ppmtx_pn_inventory_detail", "unit_cost_non_negative", "unit_cost IS NULL OR unit_cost >= 0", "CRITICAL", "Unit cost must be non-negative", True, now, now),
    ("qx_ppmtx_pn_inventory_detail", "condition_not_null", "condition IS NOT NULL", "WARNING", "Condition should be populated", True, now, now),
    ("qx_ppmtx_pn_inventory_detail", "ri_date_valid", "ri_date IS NULL OR ri_date <= current_timestamp()", "WARNING", "RI date should not be in the future", True, now, now),

    # === qx_ppmtx_pn_inventory_control (Fact - Inventory Control) ===
    ("qx_ppmtx_pn_inventory_control", "pn_not_null", "pn IS NOT NULL", "CRITICAL", "Part number must not be null", True, now, now),
    ("qx_ppmtx_pn_inventory_control", "sn_not_null", "sn IS NOT NULL", "CRITICAL", "Serial number must not be null", True, now, now),
    ("qx_ppmtx_pn_inventory_control", "control_not_null", "control IS NOT NULL", "CRITICAL", "Control code must not be null", True, now, now),
    ("qx_ppmtx_pn_inventory_control", "schedule_hours_non_negative", "schedule_hours IS NULL OR schedule_hours >= 0", "CRITICAL", "Schedule hours must be non-negative", True, now, now),
    ("qx_ppmtx_pn_inventory_control", "actual_hours_non_negative", "actual_hours IS NULL OR actual_hours >= 0", "WARNING", "Actual hours should be non-negative", True, now, now),

    # === qx_ppmtx_pn_inventory_history (Fact - Inventory Transactions) ===
    ("qx_ppmtx_pn_inventory_history", "transaction_no_not_null", "transaction_no IS NOT NULL", "CRITICAL", "Transaction number must not be null", True, now, now),
    ("qx_ppmtx_pn_inventory_history", "batch_not_null", "batch IS NOT NULL", "CRITICAL", "Batch must not be null", True, now, now),
    ("qx_ppmtx_pn_inventory_history", "transaction_type_not_null", "transaction_type IS NOT NULL", "WARNING", "Transaction type should be populated", True, now, now),
    ("qx_ppmtx_pn_inventory_history", "qty_non_negative", "qty IS NULL OR qty >= 0", "WARNING", "Quantity should be non-negative", True, now, now),

    # === qx_ppmtx_ac_pn_transaction_history (Fact - Aircraft Part Transactions) ===
    ("qx_ppmtx_ac_pn_transaction_history", "transaction_not_null", "transaction IS NOT NULL", "CRITICAL", "Transaction ID must not be null", True, now, now),
    ("qx_ppmtx_ac_pn_transaction_history", "transaction_item_not_null", "transaction_item IS NOT NULL", "CRITICAL", "Transaction item must not be null", True, now, now),
    ("qx_ppmtx_ac_pn_transaction_history", "transaction_type_not_null", "transaction_type IS NOT NULL", "WARNING", "Transaction type should be populated", True, now, now),
    ("qx_ppmtx_ac_pn_transaction_history", "transaction_date_not_null", "transaction_date IS NOT NULL", "WARNING", "Transaction date should be populated", True, now, now),
    ("qx_ppmtx_ac_pn_transaction_history", "transaction_date_not_future", "transaction_date IS NULL OR transaction_date <= current_timestamp()", "WARNING", "Transaction date should not be in the future", True, now, now),

    # === qx_ppmtx_pn_tear_down_report (Fact - Tear Down Reports) ===
    ("qx_ppmtx_pn_tear_down_report", "order_type_not_null", "order_type IS NOT NULL", "CRITICAL", "Order type must not be null", True, now, now),
    ("qx_ppmtx_pn_tear_down_report", "order_number_not_null", "order_number IS NOT NULL", "CRITICAL", "Order number must not be null", True, now, now),
    ("qx_ppmtx_pn_tear_down_report", "order_line_not_null", "order_line IS NOT NULL", "CRITICAL", "Order line must not be null", True, now, now),
    ("qx_ppmtx_pn_tear_down_report", "pn_not_null", "pn IS NOT NULL", "WARNING", "Part number should be populated", True, now, now),

    # === qx_ppmtx_order_detail (Fact - Order Details) ===
    ("qx_ppmtx_order_detail", "order_type_not_null", "order_type IS NOT NULL", "CRITICAL", "Order type must not be null", True, now, now),
    ("qx_ppmtx_order_detail", "order_number_not_null", "order_number IS NOT NULL", "CRITICAL", "Order number must not be null", True, now, now),
    ("qx_ppmtx_order_detail", "order_line_not_null", "order_line IS NOT NULL", "CRITICAL", "Order line must not be null", True, now, now),
    ("qx_ppmtx_order_detail", "pn_not_null", "pn IS NOT NULL", "WARNING", "Part number should be populated", True, now, now),
    ("qx_ppmtx_order_detail", "status_not_null", "status IS NOT NULL", "WARNING", "Status should be populated", True, now, now),

    # === qx_ppmtx_defect_report (Fact - Defect Reports) ===
    ("qx_ppmtx_defect_report", "defect_type_not_null", "defect_type IS NOT NULL", "CRITICAL", "Defect type must not be null", True, now, now),
    ("qx_ppmtx_defect_report", "defect_not_null", "defect IS NOT NULL", "CRITICAL", "Defect ID must not be null", True, now, now),
    ("qx_ppmtx_defect_report", "defect_item_not_null", "defect_item IS NOT NULL", "CRITICAL", "Defect item must not be null", True, now, now),
    ("qx_ppmtx_defect_report", "ac_not_null", "ac IS NOT NULL", "WARNING", "Aircraft should be populated", True, now, now),
    ("qx_ppmtx_defect_report", "status_not_null", "status IS NOT NULL", "WARNING", "Status should be populated", True, now, now),

    # === qx_ppmtx_defect_report_pn (Fact - Defect Report Parts) ===
    ("qx_ppmtx_defect_report_pn", "defect_type_not_null", "defect_type IS NOT NULL", "CRITICAL", "Defect type must not be null", True, now, now),
    ("qx_ppmtx_defect_report_pn", "defect_not_null", "defect IS NOT NULL", "CRITICAL", "Defect ID must not be null", True, now, now),
    ("qx_ppmtx_defect_report_pn", "defect_item_not_null", "defect_item IS NOT NULL", "CRITICAL", "Defect item must not be null", True, now, now),
    ("qx_ppmtx_defect_report_pn", "pn_not_null", "pn IS NOT NULL", "WARNING", "Part number should be populated", True, now, now),
    ("qx_ppmtx_defect_report_pn", "qty_non_negative", "qty IS NULL OR qty >= 0", "WARNING", "Quantity should be non-negative", True, now, now),
]

schema = StructType([
    StructField("table_name", StringType(), False),
    StructField("rule_name", StringType(), False),
    StructField("constraint_sql", StringType(), False),
    StructField("severity", StringType(), False),
    StructField("description", StringType(), True),
    StructField("is_active", BooleanType(), False),
    StructField("created_date", TimestampType(), True),
    StructField("modified_date", TimestampType(), True),
])

df_rules = spark.createDataFrame(rules_data, schema)

# Merge rules (upsert pattern)
df_rules.createOrReplaceTempView("new_rules")

spark.sql(f"""
MERGE INTO {catalog}.{silver_schema}.qx_ppmtx_dq_rules AS target
USING new_rules AS source
ON target.table_name = source.table_name AND target.rule_name = source.rule_name
WHEN MATCHED THEN UPDATE SET
    constraint_sql = source.constraint_sql,
    severity = source.severity,
    description = source.description,
    is_active = source.is_active,
    modified_date = source.modified_date
WHEN NOT MATCHED THEN INSERT *
""")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Verify Rules

# COMMAND ----------

rules_count = spark.sql(f"SELECT COUNT(*) as cnt FROM {catalog}.{silver_schema}.qx_ppmtx_dq_rules").collect()[0]["cnt"]
print(f"✓ Total DQ rules loaded: {rules_count}")

display(spark.sql(f"""
SELECT table_name, severity, COUNT(*) as rule_count
FROM {catalog}.{silver_schema}.qx_ppmtx_dq_rules
WHERE is_active = true
GROUP BY table_name, severity
ORDER BY table_name, severity
"""))
