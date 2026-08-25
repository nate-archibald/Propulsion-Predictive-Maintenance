-- ============================================================================
-- STEP 3: Deploy Tier 2 Trigger-Based Materialized Views (3 DQ views)
-- Refresh: Automatically on upstream Tier 1 MV updates (TRIGGER ON UPDATE)
-- ============================================================================
-- Execute this AFTER Step 2 completes, wait for completion (~5 min)
-- NOTE: Do NOT run this before Tier 1 MVs are fully created!

-- Set variables (same as Step 1 & 2)
SET VARIABLE catalog = 'subject_maintenanceengineering_test';
SET VARIABLE an_maintenanceengineering_ods = 'an_maintenanceengineering_ods';
SET VARIABLE bronze_schema = 'an_raw_data';

-- ============================================================================
-- TIER 2: 3 Data Quality Monitoring Views (Trigger-Based Refresh)
-- These read from Tier 1 MVs and refresh automatically on upstream updates
-- ============================================================================

-- 10. qx_ppmtx_dq_orphaned_inventory
-- Referential integrity check - inventory detail records without matching part master entry
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

-- 11. qx_ppmtx_dq_orphaned_defect_pn
-- Referential integrity check - defect report parts without matching part master entry
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

-- 12. qx_ppmtx_dq_record_counts
-- Data quality monitoring - record counts and processing timestamps per Silver table
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

-- ============================================================================
-- VERIFICATION: Check ALL 12 MVs Created Successfully
-- ============================================================================
SELECT 
  name,
  kind,
  owner,
  created_at,
  CASE 
    WHEN name IN ('qx_ppmtx_pn_master', 'qx_ppmtx_pn_inventory_detail', 'qx_ppmtx_pn_inventory_history',
                  'qx_ppmtx_ac_pn_transaction_history', 'qx_ppmtx_pn_tear_down_report', 'qx_ppmtx_order_detail')
    THEN 'TIER 1 DAILY'
    WHEN name IN ('qx_ppmtx_pn_inventory_control', 'qx_ppmtx_defect_report', 'qx_ppmtx_defect_report_pn')
    THEN 'TIER 1 4-HOURLY'
    WHEN name IN ('qx_ppmtx_dq_orphaned_inventory', 'qx_ppmtx_dq_orphaned_defect_pn', 'qx_ppmtx_dq_record_counts')
    THEN 'TIER 2 TRIGGER'
    ELSE 'UNKNOWN'
  END as tier
FROM system.information_schema.materialized_views
WHERE catalog_name = '${catalog}'
  AND schema_name = '${an_maintenanceengineering_ods}'
  AND name LIKE 'qx_ppmtx_%'
ORDER BY tier, name;

-- ============================================================================
-- SUMMARY: Expected Output Should Show 12 Rows
-- ============================================================================
-- Tier 1 Daily: 6 rows
-- Tier 1 4-Hourly: 3 rows
-- Tier 2 Trigger: 3 rows
-- TOTAL: 12 rows ✅
