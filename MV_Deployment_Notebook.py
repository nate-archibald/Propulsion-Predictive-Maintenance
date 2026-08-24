# Databricks notebook source
# MAGIC %md
# MAGIC # Silver Materialized Views - Deployment Notebook
# MAGIC **Project**: Propulsion Predictive Maintenance (nathan-a-ppmtx)  
# MAGIC **Status**: Ready for deployment  
# MAGIC **Instructions**: Execute cells in order (0 → 1 → 2 → 3 → 4 → 5 → 6)
# MAGIC 
# MAGIC ## Overview
# MAGIC This notebook deploys 12 standalone materialized views with tiered incremental refresh:
# MAGIC - **Tier 1A**: 6 daily refresh MVs (7 AM UTC)
# MAGIC - **Tier 1B**: 3 4-hourly refresh MVs  
# MAGIC - **Tier 2**: 3 trigger-based DQ monitoring MVs
# MAGIC 
# MAGIC **Execution Time**: ~30 minutes total
# MAGIC - Step 1: ~15 min (Tier 1 Daily)
# MAGIC - Step 2: ~10 min (Tier 1 4-Hourly)
# MAGIC - Step 3: ~5 min (Tier 2 Trigger)
# MAGIC - Step 4: ~2 min (Verification)
# MAGIC 
# MAGIC ## Critical Changes (v2.0)
# MAGIC ✅ Fixed configuration variables (SET instead of SET VARIABLE)
# MAGIC ✅ Removed non-deterministic current_timestamp() from Tier 1 views
# MAGIC ✅ Updated Tier 2 views to remove processed_timestamp references
# MAGIC ✅ Corrected bronze/silver catalog and schema references

# COMMAND ----------

# MAGIC %md
# MAGIC ## Cell 0: Configuration - Set Your Variables
# MAGIC ⚠️ **CRITICAL**: These variables MUST be set before running any deployment steps
# MAGIC 
# MAGIC - **silver_catalog**: Where your silver MV views will be created
# MAGIC - **silver_schema**: Silver schema name
# MAGIC - **bronze_catalog**: Where bronze source tables are located
# MAGIC - **bronze_schema**: Bronze schema name

# COMMAND ----------

# MAGIC %sql
# MAGIC -- SET (not SET VARIABLE) to enable ${} string interpolation
# MAGIC SET silver_catalog = 'subject_maintenanceengineering_test';
# MAGIC SET silver_schema = 'an_maintenanceengineering_ods';
# MAGIC SET bronze_catalog = 'subject_maintenanceengineering';
# MAGIC SET bronze_schema = 'ds_maintenanceengineering_ods';
# MAGIC 
# MAGIC -- Verify configuration
# MAGIC SELECT 
# MAGIC   '${silver_catalog}' as SILVER_CATALOG,
# MAGIC   '${silver_schema}' as SILVER_SCHEMA,
# MAGIC   '${bronze_catalog}' as BRONZE_CATALOG,
# MAGIC   '${bronze_schema}' as BRONZE_SCHEMA,
# MAGIC   'Ready for deployment ✅' as status;

# COMMAND ----------

# MAGIC %md
# MAGIC ## STEP 1: Deploy Tier 1 Daily Materialized Views (6 views)
# MAGIC **Refresh Schedule**: Daily at 7:00 AM UTC  
# MAGIC **Expected Execution Time**: ~15 minutes (full materialization)
# MAGIC 
# MAGIC ### Views Being Created:
# MAGIC 1. qx_ppmtx_pn_master
# MAGIC 2. qx_ppmtx_pn_inventory_detail
# MAGIC 3. qx_ppmtx_pn_inventory_history
# MAGIC 4. qx_ppmtx_ac_pn_transaction_history
# MAGIC 5. qx_ppmtx_pn_tear_down_report
# MAGIC 6. qx_ppmtx_order_detail
# MAGIC 
# MAGIC ⚠️ **Execute this cell first, then wait for completion before moving to Step 2**

# COMMAND ----------

# MAGIC %sql
# MAGIC -- TIER 1 DAILY: 6 Materialized Views @ 7:00 AM UTC
# MAGIC 
# MAGIC -- 1. qx_ppmtx_pn_master
# MAGIC CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_master
# MAGIC CLUSTER BY AUTO
# MAGIC REFRESH POLICY INCREMENTAL
# MAGIC SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
# MAGIC AS
# MAGIC SELECT *
# MAGIC FROM ${bronze_catalog}.${bronze_schema}.qx_trax_pn_master;
# MAGIC 
# MAGIC -- 2. qx_ppmtx_pn_inventory_detail
# MAGIC CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_inventory_detail
# MAGIC CLUSTER BY AUTO
# MAGIC REFRESH POLICY INCREMENTAL
# MAGIC SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
# MAGIC AS
# MAGIC SELECT *
# MAGIC FROM ${bronze_catalog}.${bronze_schema}.qx_trax_pn_inventory_detail;
# MAGIC 
# MAGIC -- 3. qx_ppmtx_pn_inventory_history
# MAGIC CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_inventory_history
# MAGIC CLUSTER BY AUTO
# MAGIC REFRESH POLICY INCREMENTAL
# MAGIC SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
# MAGIC AS
# MAGIC SELECT *
# MAGIC FROM ${bronze_catalog}.${bronze_schema}.qx_trax_pn_inventory_history;
# MAGIC 
# MAGIC -- 4. qx_ppmtx_ac_pn_transaction_history
# MAGIC CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_ac_pn_transaction_history
# MAGIC CLUSTER BY AUTO
# MAGIC REFRESH POLICY INCREMENTAL
# MAGIC SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
# MAGIC AS
# MAGIC SELECT *
# MAGIC FROM ${bronze_catalog}.${bronze_schema}.qx_trax_pn_transaction_history;
# MAGIC 
# MAGIC -- 5. qx_ppmtx_pn_tear_down_report
# MAGIC CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_tear_down_report
# MAGIC CLUSTER BY AUTO
# MAGIC REFRESH POLICY INCREMENTAL
# MAGIC SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
# MAGIC AS
# MAGIC SELECT *
# MAGIC FROM ${bronze_catalog}.${bronze_schema}.qx_trax_pn_tear_down_report;
# MAGIC 
# MAGIC -- 6. qx_ppmtx_order_detail
# MAGIC CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_order_detail
# MAGIC CLUSTER BY AUTO
# MAGIC REFRESH POLICY INCREMENTAL
# MAGIC SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
# MAGIC AS
# MAGIC SELECT *
# MAGIC FROM ${bronze_catalog}.${bronze_schema}.qx_trax_order_detail;

# COMMAND ----------

# MAGIC %md
# MAGIC ### Verification: STEP 1 Completion
# MAGIC ✅ Check if all 6 Tier 1 Daily MVs were created successfully

# COMMAND ----------

# MAGIC %sql
# MAGIC SELECT 
# MAGIC   name,
# MAGIC   kind,
# MAGIC   owner,
# MAGIC   created_at,
# MAGIC   'TIER 1 DAILY ✅' as status
# MAGIC FROM system.information_schema.materialized_views
# MAGIC WHERE catalog_name = '${silver_catalog}'
# MAGIC   AND schema_name = '${silver_schema}'
# MAGIC   AND name IN (
# MAGIC     'qx_ppmtx_pn_master',
# MAGIC     'qx_ppmtx_pn_inventory_detail',
# MAGIC     'qx_ppmtx_pn_inventory_history',
# MAGIC     'qx_ppmtx_ac_pn_transaction_history',
# MAGIC     'qx_ppmtx_pn_tear_down_report',
# MAGIC     'qx_ppmtx_order_detail'
# MAGIC   )
# MAGIC ORDER BY name;
# MAGIC 
# MAGIC -- Expected: 6 rows showing all Tier 1 Daily MVs created ✅

# COMMAND ----------

# MAGIC %md
# MAGIC ## STEP 2: Deploy Tier 1 4-Hourly Materialized Views (3 views)
# MAGIC **Refresh Schedule**: Every 4 Hours (starting immediately)  
# MAGIC **Expected Execution Time**: ~10 minutes (full materialization)
# MAGIC 
# MAGIC ### Views Being Created:
# MAGIC 7. qx_ppmtx_pn_inventory_control
# MAGIC 8. qx_ppmtx_defect_report
# MAGIC 9. qx_ppmtx_defect_report_pn
# MAGIC 
# MAGIC ⚠️ **Only execute this cell AFTER Step 1 completes successfully**

# COMMAND ----------

# MAGIC %sql
# MAGIC -- TIER 1 4-HOURLY: 3 Materialized Views (Every 4 Hours)
# MAGIC 
# MAGIC -- 7. qx_ppmtx_pn_inventory_control
# MAGIC CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_inventory_control
# MAGIC CLUSTER BY AUTO
# MAGIC REFRESH POLICY INCREMENTAL
# MAGIC SCHEDULE EVERY 4 HOURS
# MAGIC AS
# MAGIC SELECT *
# MAGIC FROM ${bronze_catalog}.${bronze_schema}.qx_trax_pn_inventory_control;
# MAGIC 
# MAGIC -- 8. qx_ppmtx_defect_report
# MAGIC CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_defect_report
# MAGIC CLUSTER BY AUTO
# MAGIC REFRESH POLICY INCREMENTAL
# MAGIC SCHEDULE EVERY 4 HOURS
# MAGIC AS
# MAGIC SELECT *
# MAGIC FROM ${bronze_catalog}.${bronze_schema}.qx_trax_defect_report;
# MAGIC 
# MAGIC -- 9. qx_ppmtx_defect_report_pn
# MAGIC CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_defect_report_pn
# MAGIC CLUSTER BY AUTO
# MAGIC REFRESH POLICY INCREMENTAL
# MAGIC SCHEDULE EVERY 4 HOURS
# MAGIC AS
# MAGIC SELECT *
# MAGIC FROM ${bronze_catalog}.${bronze_schema}.qx_trax_defect_report_pn;

# COMMAND ----------

# MAGIC %md
# MAGIC ### Verification: STEP 2 Completion
# MAGIC ✅ Check if all 3 Tier 1 4-Hourly MVs were created successfully

# COMMAND ----------

# MAGIC %sql
# MAGIC SELECT 
# MAGIC   name,
# MAGIC   kind,
# MAGIC   owner,
# MAGIC   created_at,
# MAGIC   'TIER 1 4-HOURLY ✅' as status
# MAGIC FROM system.information_schema.materialized_views
# MAGIC WHERE catalog_name = '${silver_catalog}'
# MAGIC   AND schema_name = '${silver_schema}'
# MAGIC   AND name IN (
# MAGIC     'qx_ppmtx_pn_inventory_control',
# MAGIC     'qx_ppmtx_defect_report',
# MAGIC     'qx_ppmtx_defect_report_pn'
# MAGIC   )
# MAGIC ORDER BY name;
# MAGIC 
# MAGIC -- Expected: 3 rows showing all Tier 1 4-Hourly MVs created ✅

# COMMAND ----------

# MAGIC %md
# MAGIC ## STEP 3: Deploy Tier 2 Trigger-Based Materialized Views (3 DQ views)
# MAGIC **Refresh Schedule**: Automatic on Tier 1 upstream updates (TRIGGER ON UPDATE)  
# MAGIC **Expected Execution Time**: ~5 minutes (full materialization)
# MAGIC 
# MAGIC ### Views Being Created:
# MAGIC 10. qx_ppmtx_dq_orphaned_inventory (referential integrity monitoring)
# MAGIC 11. qx_ppmtx_dq_orphaned_defect_pn (referential integrity monitoring)
# MAGIC 12. qx_ppmtx_dq_record_counts (operational metrics)
# MAGIC 
# MAGIC ⚠️ **Only execute this cell AFTER Step 2 completes successfully**  
# MAGIC ⚠️ **Do NOT execute this before Tier 1 MVs are fully created!**

# COMMAND ----------

# MAGIC %sql
# MAGIC -- TIER 2: 3 Data Quality Monitoring Views (Trigger-Based Refresh)
# MAGIC 
# MAGIC -- 10. qx_ppmtx_dq_orphaned_inventory
# MAGIC CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_dq_orphaned_inventory
# MAGIC CLUSTER BY AUTO
# MAGIC REFRESH POLICY INCREMENTAL
# MAGIC TRIGGER ON UPDATE
# MAGIC AS
# MAGIC SELECT
# MAGIC   inv.batch,
# MAGIC   inv.pn,
# MAGIC   inv.sn,
# MAGIC   inv.condition,
# MAGIC   'Missing in pn_master' AS integrity_issue
# MAGIC FROM ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_inventory_detail AS inv
# MAGIC LEFT JOIN ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_master AS pm ON inv.pn = pm.pn
# MAGIC WHERE pm.pn IS NULL AND inv.pn IS NOT NULL;
# MAGIC 
# MAGIC -- 11. qx_ppmtx_dq_orphaned_defect_pn
# MAGIC CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_dq_orphaned_defect_pn
# MAGIC CLUSTER BY AUTO
# MAGIC REFRESH POLICY INCREMENTAL
# MAGIC TRIGGER ON UPDATE
# MAGIC AS
# MAGIC SELECT
# MAGIC   drp.defect_type,
# MAGIC   drp.defect,
# MAGIC   drp.defect_item,
# MAGIC   drp.pn,
# MAGIC   'Missing in pn_master' AS integrity_issue
# MAGIC FROM ${silver_catalog}.${silver_schema}.qx_ppmtx_defect_report_pn AS drp
# MAGIC LEFT JOIN ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_master AS pm ON drp.pn = pm.pn
# MAGIC WHERE pm.pn IS NULL AND drp.pn IS NOT NULL;
# MAGIC 
# MAGIC -- 12. qx_ppmtx_dq_record_counts
# MAGIC CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_dq_record_counts
# MAGIC CLUSTER BY AUTO
# MAGIC REFRESH POLICY INCREMENTAL
# MAGIC TRIGGER ON UPDATE
# MAGIC AS
# MAGIC SELECT 'qx_ppmtx_pn_master' AS table_name, COUNT(*) AS record_count
# MAGIC FROM ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_master
# MAGIC UNION ALL
# MAGIC SELECT 'qx_ppmtx_pn_inventory_control' AS table_name, COUNT(*) AS record_count
# MAGIC FROM ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_inventory_control
# MAGIC UNION ALL
# MAGIC SELECT 'qx_ppmtx_pn_inventory_detail' AS table_name, COUNT(*) AS record_count
# MAGIC FROM ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_inventory_detail
# MAGIC UNION ALL
# MAGIC SELECT 'qx_ppmtx_pn_inventory_history' AS table_name, COUNT(*) AS record_count
# MAGIC FROM ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_inventory_history
# MAGIC UNION ALL
# MAGIC SELECT 'qx_ppmtx_ac_pn_transaction_history' AS table_name, COUNT(*) AS record_count
# MAGIC FROM ${silver_catalog}.${silver_schema}.qx_ppmtx_ac_pn_transaction_history
# MAGIC UNION ALL
# MAGIC SELECT 'qx_ppmtx_order_detail' AS table_name, COUNT(*) AS record_count
# MAGIC FROM ${silver_catalog}.${silver_schema}.qx_ppmtx_order_detail
# MAGIC UNION ALL
# MAGIC SELECT 'qx_ppmtx_pn_tear_down_report' AS table_name, COUNT(*) AS record_count
# MAGIC FROM ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_tear_down_report
# MAGIC UNION ALL
# MAGIC SELECT 'qx_ppmtx_defect_report' AS table_name, COUNT(*) AS record_count
# MAGIC FROM ${silver_catalog}.${silver_schema}.qx_ppmtx_defect_report
# MAGIC UNION ALL
# MAGIC SELECT 'qx_ppmtx_defect_report_pn' AS table_name, COUNT(*) AS record_count
# MAGIC FROM ${silver_catalog}.${silver_schema}.qx_ppmtx_defect_report_pn;

# COMMAND ----------

# MAGIC %md
# MAGIC ## FINAL VERIFICATION: All 12 MVs Successfully Deployed ✅
# MAGIC Check that ALL 12 materialized views are created and ready

# COMMAND ----------

# MAGIC %sql
# MAGIC SELECT 
# MAGIC   name,
# MAGIC   kind,
# MAGIC   owner,
# MAGIC   created_at,
# MAGIC   CASE 
# MAGIC     WHEN name IN ('qx_ppmtx_pn_master', 'qx_ppmtx_pn_inventory_detail', 'qx_ppmtx_pn_inventory_history',
# MAGIC                   'qx_ppmtx_ac_pn_transaction_history', 'qx_ppmtx_pn_tear_down_report', 'qx_ppmtx_order_detail')
# MAGIC     THEN 'TIER 1 DAILY'
# MAGIC     WHEN name IN ('qx_ppmtx_pn_inventory_control', 'qx_ppmtx_defect_report', 'qx_ppmtx_defect_report_pn')
# MAGIC     THEN 'TIER 1 4-HOURLY'
# MAGIC     WHEN name IN ('qx_ppmtx_dq_orphaned_inventory', 'qx_ppmtx_dq_orphaned_defect_pn', 'qx_ppmtx_dq_record_counts')
# MAGIC     THEN 'TIER 2 TRIGGER'
# MAGIC     ELSE 'UNKNOWN'
# MAGIC   END as tier
# MAGIC FROM system.information_schema.materialized_views
# MAGIC WHERE catalog_name = '${silver_catalog}'
# MAGIC   AND schema_name = '${silver_schema}'
# MAGIC   AND name LIKE 'qx_ppmtx_%'
# MAGIC ORDER BY tier, name;
# MAGIC 
# MAGIC -- ✅ Expected: 12 rows total
# MAGIC --   - TIER 1 DAILY: 6 rows
# MAGIC --   - TIER 1 4-HOURLY: 3 rows
# MAGIC --   - TIER 2 TRIGGER: 3 rows

# COMMAND ----------

# MAGIC %md
# MAGIC ## Next Steps
# MAGIC 
# MAGIC ### ✅ Deployment Complete!
# MAGIC All 12 materialized views are now deployed and will refresh automatically on their schedules.
# MAGIC 
# MAGIC ### 📅 Refresh Schedules (No manual action needed)
# MAGIC - **Tier 1 Daily**: Refresh every day at **7:00 AM UTC**
# MAGIC - **Tier 1 4-Hourly**: Refresh every **4 hours** starting immediately
# MAGIC - **Tier 2 Trigger**: Refresh automatically when Tier 1 MVs complete
# MAGIC 
# MAGIC ### 📊 Monitoring (Optional)
# MAGIC Run this query daily during first week to verify successful refreshes:
# MAGIC ```sql
# MAGIC SELECT 
# MAGIC   name, 
# MAGIC   refresh_status, 
# MAGIC   last_refresh_time,
# MAGIC   DATEDIFF(MINUTE, last_refresh_time, now()) as minutes_since_refresh
# MAGIC FROM system.materialized_views
# MAGIC WHERE schema_name = '${silver_schema}'
# MAGIC   AND name LIKE 'qx_ppmtx_%'
# MAGIC ORDER BY last_refresh_time DESC;
# MAGIC ```
# MAGIC 
# MAGIC ### 📚 Documentation
# MAGIC Refer to:
# MAGIC - `MATERIALIZED_VIEWS_README.md` — Technical reference
# MAGIC - `DEPLOYMENT_GUIDE.md` — Troubleshooting & monitoring
# MAGIC - `05_verify_and_analyze_mvs.sql` — Detailed verification queries
# MAGIC 
# MAGIC ### 🆘 Questions?
# MAGIC - Check **DEPLOYMENT_GUIDE.md** (Troubleshooting section)
# MAGIC - Review **MATERIALIZED_VIEWS_README.md** for architecture details
# MAGIC - Run verification script for incrementalizability analysis
