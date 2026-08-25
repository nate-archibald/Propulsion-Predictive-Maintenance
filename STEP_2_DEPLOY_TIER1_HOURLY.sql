-- ============================================================================
-- STEP 2: Deploy Tier 1 4-Hourly Materialized Views (3 views)
-- Refresh: Every 4 Hours (starting immediately after creation)
-- ============================================================================
-- Execute this AFTER Step 1 completes, wait for completion (~10 min), then run Step 3

-- Set variables (same as Step 1)
SET VARIABLE catalog = 'subject_maintenanceengineering_test';
SET VARIABLE an_maintenanceengineering_ods = 'an_maintenanceengineering_ods';
SET VARIABLE bronze_schema = 'an_raw_data';

-- ============================================================================
-- TIER 1 4-HOURLY: 3 Materialized Views (Every 4 Hours)
-- ============================================================================

-- 7. qx_ppmtx_pn_inventory_control (Inventory Control Schedules)
CREATE OR REPLACE MATERIALIZED VIEW ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_pn_inventory_control
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE EVERY 4 HOURS
AS
SELECT
  *,
  current_timestamp() AS processed_timestamp
FROM ${catalog}.${bronze_schema}.qx_trax_pn_inventory_control;

-- 8. qx_ppmtx_defect_report (Defect Reports)
CREATE OR REPLACE MATERIALIZED VIEW ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_defect_report
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE EVERY 4 HOURS
AS
SELECT
  *,
  current_timestamp() AS processed_timestamp
FROM ${catalog}.${bronze_schema}.qx_trax_defect_report;

-- 9. qx_ppmtx_defect_report_pn (Defect Report Parts)
CREATE OR REPLACE MATERIALIZED VIEW ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_defect_report_pn
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE EVERY 4 HOURS
AS
SELECT
  *,
  current_timestamp() AS processed_timestamp
FROM ${catalog}.${bronze_schema}.qx_trax_defect_report_pn;

-- ============================================================================
-- VERIFICATION: Check Tier 1 4-Hourly MVs Created Successfully
-- ============================================================================
SELECT 
  name,
  kind,
  owner,
  created_at,
  'TIER 1 4-HOURLY' as tier
FROM system.information_schema.materialized_views
WHERE catalog_name = '${catalog}'
  AND schema_name = '${an_maintenanceengineering_ods}'
  AND name IN (
    'qx_ppmtx_pn_inventory_control',
    'qx_ppmtx_defect_report',
    'qx_ppmtx_defect_report_pn'
  )
ORDER BY name;
