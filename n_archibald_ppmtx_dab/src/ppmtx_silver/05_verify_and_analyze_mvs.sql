-- ============================================================================
-- Silver Materialized Views - Deployment Verification & Incrementalizability Check
-- ============================================================================
-- This script validates the 12 standalone materialized views after deployment
-- and includes EXPLAIN statements to verify incrementalizability.
-- 
-- Run this script AFTER deploying all 3 SQL files in sequence:
-- 1. 01_tier1_daily_mvs.sql
-- 2. 01_tier1_hourly_mvs.sql
-- 3. 03_tier2_trigger_mvs.sql
--
-- Prerequisites:
-- - Set ${catalog} and ${an_maintenanceengineering_ods} variables
-- - All 12 MVs must be created
-- ============================================================================

-- ============================================================================
-- SECTION 1: Verify All 12 MVs Are Created
-- ============================================================================

SELECT
  catalog_name,
  schema_name,
  name AS materialized_view_name,
  kind,
  comment,
  owner,
  created_at,
  updated_at
FROM system.information_schema.materialized_views
WHERE catalog_name = '${catalog}'
  AND schema_name = '${an_maintenanceengineering_ods}'
  AND name LIKE 'qx_ppmtx_%'
ORDER BY name;

-- Expected: 12 rows (9 Tier 1 + 3 Tier 2)
-- ============================================================================
-- SECTION 2: Verify Row Counts Match Bronze (Post First Refresh)
-- ============================================================================

-- After the first refresh cycle (which may take 24 hours for daily views),
-- row counts should match the bronze source tables. Run this query to check.

SELECT 'qx_ppmtx_pn_master' AS table_name, COUNT(*) AS silver_row_count
FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_pn_master
UNION ALL
SELECT 'qx_ppmtx_pn_inventory_detail' AS table_name, COUNT(*) AS silver_row_count
FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_pn_inventory_detail
UNION ALL
SELECT 'qx_ppmtx_pn_inventory_history' AS table_name, COUNT(*) AS silver_row_count
FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_pn_inventory_history
UNION ALL
SELECT 'qx_ppmtx_ac_pn_transaction_history' AS table_name, COUNT(*) AS silver_row_count
FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_ac_pn_transaction_history
UNION ALL
SELECT 'qx_ppmtx_pn_tear_down_report' AS table_name, COUNT(*) AS silver_row_count
FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_pn_tear_down_report
UNION ALL
SELECT 'qx_ppmtx_order_detail' AS table_name, COUNT(*) AS silver_row_count
FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_order_detail
UNION ALL
SELECT 'qx_ppmtx_pn_inventory_control' AS table_name, COUNT(*) AS silver_row_count
FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_pn_inventory_control
UNION ALL
SELECT 'qx_ppmtx_defect_report' AS table_name, COUNT(*) AS silver_row_count
FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_defect_report
UNION ALL
SELECT 'qx_ppmtx_defect_report_pn' AS table_name, COUNT(*) AS silver_row_count
FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_defect_report_pn
ORDER BY table_name;

-- ============================================================================
-- SECTION 3: Verify DQ Record Counts Monitoring
-- ============================================================================

-- The qx_ppmtx_dq_record_counts view should show counts for all 9 Tier 1 tables
SELECT * FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_dq_record_counts
ORDER BY table_name;

-- Expected: 9 rows with non-null record_count and last_processed values

-- ============================================================================
-- SECTION 4: Verify DQ Orphaned Records Detection
-- ============================================================================

-- Check for any orphaned inventory records (should be empty or documented)
SELECT COUNT(*) AS orphaned_inventory_count
FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_dq_orphaned_inventory;

-- Check for any orphaned defect part records (should be empty or documented)
SELECT COUNT(*) AS orphaned_defect_pn_count
FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_dq_orphaned_defect_pn;

-- ============================================================================
-- SECTION 5: Incrementalizability Analysis - TIER 1 (Simple Read/Transform)
-- ============================================================================
-- Tier 1 views are simple SELECT * from bronze tables with a timestamp column added.
-- These should be 100% incrementalizable as they have no joins or complex logic.

-- Example: qx_ppmtx_pn_master (simplest case)
EXPLAIN CREATE MATERIALIZED VIEW ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_pn_master_explain
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS
SELECT
  *,
  current_timestamp() AS processed_timestamp
FROM ${catalog}.${bronze_schema}.qx_trax_pn_master;

-- ============================================================================
-- SECTION 6: Incrementalizability Analysis - TIER 2 (LEFT OUTER JOINs)
-- ============================================================================
-- Tier 2 DQ views use LEFT OUTER JOINs which may not be fully incrementalizable.
-- Monitor the EXPLAIN output to understand refresh efficiency.

-- Example: qx_ppmtx_dq_orphaned_inventory (uses LEFT OUTER JOIN)
-- This is more complex - the optimizer must handle the anti-join pattern
EXPLAIN CREATE MATERIALIZED VIEW ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_dq_orphaned_inventory_explain
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
TRIGGER ON UPDATE
AS
SELECT
  inv.batch,
  inv.pn,
  inv.sn,
  inv.condition,
  inv.processed_timestamp,
  'Missing in pn_master' AS integrity_issue
FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_pn_inventory_detail AS inv
LEFT JOIN ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_pn_master AS pm ON inv.pn = pm.pn
WHERE pm.pn IS NULL AND inv.pn IS NOT NULL;

-- ============================================================================
-- SECTION 7: Incrementalizability Analysis - TIER 2 (UNION OF COUNTS)
-- ============================================================================
-- The qx_ppmtx_dq_record_counts view aggregates counts from 9 upstream MVs.
-- The incrementalization of this view depends on Databricks optimizer's ability
-- to handle the UNION of COUNT aggregations across 9 sources.

EXPLAIN CREATE MATERIALIZED VIEW ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_dq_record_counts_explain
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
TRIGGER ON UPDATE
AS
SELECT 'qx_ppmtx_pn_master' AS table_name, COUNT(*) AS record_count, MAX(processed_timestamp) AS last_processed
FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_pn_master
UNION ALL
SELECT 'qx_ppmtx_pn_inventory_control' AS table_name, COUNT(*) AS record_count, MAX(processed_timestamp) AS last_processed
FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_pn_inventory_control
UNION ALL
SELECT 'qx_ppmtx_pn_inventory_detail' AS table_name, COUNT(*) AS record_count, MAX(processed_timestamp) AS last_processed
FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_pn_inventory_detail
UNION ALL
SELECT 'qx_ppmtx_pn_inventory_history' AS table_name, COUNT(*) AS record_count, MAX(processed_timestamp) AS last_processed
FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_pn_inventory_history
UNION ALL
SELECT 'qx_ppmtx_ac_pn_transaction_history' AS table_name, COUNT(*) AS record_count, MAX(processed_timestamp) AS last_processed
FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_ac_pn_transaction_history
UNION ALL
SELECT 'qx_ppmtx_order_detail' AS table_name, COUNT(*) AS record_count, MAX(processed_timestamp) AS last_processed
FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_order_detail
UNION ALL
SELECT 'qx_ppmtx_pn_tear_down_report' AS table_name, COUNT(*) AS record_count, MAX(processed_timestamp) AS last_processed
FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_pn_tear_down_report
UNION ALL
SELECT 'qx_ppmtx_defect_report' AS table_name, COUNT(*) AS record_count, MAX(processed_timestamp) AS last_processed
FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_defect_report
UNION ALL
SELECT 'qx_ppmtx_defect_report_pn' AS table_name, COUNT(*) AS record_count, MAX(processed_timestamp) AS last_processed
FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_defect_report_pn;

-- ============================================================================
-- SECTION 8: Monitor Refresh History & Performance
-- ============================================================================
-- Once MVs are deployed and have refreshed, check the refresh history

SELECT
  materialized_view_name,
  refresh_start_time,
  refresh_end_time,
  refresh_duration_ms,
  refresh_bytes_scanned,
  refresh_bytes_produced,
  refresh_status
FROM system.materialized_views.refresh_history
WHERE materialized_view_catalog = '${catalog}'
  AND materialized_view_schema = '${an_maintenanceengineering_ods}'
  AND materialized_view_name LIKE 'qx_ppmtx_%'
ORDER BY refresh_start_time DESC
LIMIT 50;

-- ============================================================================
-- CLEANUP: Drop Explain Views (Optional)
-- ============================================================================
-- If this script creates EXPLAIN views, drop them after analysis:
-- DROP MATERIALIZED VIEW IF EXISTS ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_pn_master_explain;
-- DROP MATERIALIZED VIEW IF EXISTS ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_dq_orphaned_inventory_explain;
-- DROP MATERIALIZED VIEW IF EXISTS ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_dq_record_counts_explain;
