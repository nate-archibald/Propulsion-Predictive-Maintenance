-- ============================================================================
-- Tier 2: Trigger-Based Materialized Views
-- ============================================================================
-- These data quality monitoring materialized views read from Tier 1 silver MVs
-- and refresh automatically when their upstream dependencies are updated.
-- Each view includes CLUSTER BY AUTO and REFRESH POLICY INCREMENTAL with TRIGGER ON UPDATE.
-- ============================================================================

-- @dbt: Catalog and schema are templated at deployment time
-- Assumes ${catalog} and ${an_maintenanceengineering_ods} variables are set

-- ============================================================================
-- 10. qx_ppmtx_dq_orphaned_inventory
-- ============================================================================
-- Referential integrity check - inventory detail records without matching part master entry
-- Upstream dependencies: qx_ppmtx_pn_inventory_detail, qx_ppmtx_pn_master
CREATE OR REPLACE MATERIALIZED VIEW ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_dq_orphaned_inventory
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
-- 11. qx_ppmtx_dq_orphaned_defect_pn
-- ============================================================================
-- Referential integrity check - defect report parts without matching part master entry
-- Upstream dependencies: qx_ppmtx_defect_report_pn, qx_ppmtx_pn_master
CREATE OR REPLACE MATERIALIZED VIEW ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_dq_orphaned_defect_pn
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
TRIGGER ON UPDATE
AS
SELECT
  drp.defect_type,
  drp.defect,
  drp.defect_item,
  drp.pn,
  drp.processed_timestamp,
  'Missing in pn_master' AS integrity_issue
FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_defect_report_pn AS drp
LEFT JOIN ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_pn_master AS pm ON drp.pn = pm.pn
WHERE pm.pn IS NULL AND drp.pn IS NOT NULL;

-- ============================================================================
-- 12. qx_ppmtx_dq_record_counts
-- ============================================================================
-- Data quality monitoring - record counts and processing timestamps per Silver table
-- Upstream dependencies: All 9 Tier 1 MVs
-- (qx_ppmtx_pn_master, qx_ppmtx_pn_inventory_control, qx_ppmtx_pn_inventory_detail,
--  qx_ppmtx_pn_inventory_history, qx_ppmtx_ac_pn_transaction_history, qx_ppmtx_order_detail,
--  qx_ppmtx_pn_tear_down_report, qx_ppmtx_defect_report, qx_ppmtx_defect_report_pn)
CREATE OR REPLACE MATERIALIZED VIEW ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_dq_record_counts
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
