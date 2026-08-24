-- ============================================================================
-- Tier 1: Fixed Schedule Materialized Views - 4-Hourly Refresh
-- ============================================================================
-- These materialized views read directly from bronze tables and refresh
-- every 4 hours using SCHEDULE EVERY clause.
-- Each view includes CLUSTER BY AUTO and REFRESH POLICY INCREMENTAL.
-- ============================================================================

-- @dbt: Catalog and schema are templated at deployment time
-- Assumes ${catalog} and ${an_maintenanceengineering_ods} variables are set

-- ============================================================================
-- 7. qx_ppmtx_pn_inventory_control (Inventory Control Schedules)
-- ============================================================================
-- Silver inventory control - validated scheduled maintenance controls for parts
CREATE OR REPLACE MATERIALIZED VIEW ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_pn_inventory_control
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE EVERY 4 HOURS
AS
SELECT
  *,
  current_timestamp() AS processed_timestamp
FROM ${catalog}.${bronze_schema}.qx_trax_pn_inventory_control;

-- ============================================================================
-- 8. qx_ppmtx_defect_report (Defect Reports)
-- ============================================================================
-- Silver defect reports - validated aircraft defect and maintenance action records
CREATE OR REPLACE MATERIALIZED VIEW ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_defect_report
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE EVERY 4 HOURS
AS
SELECT
  *,
  current_timestamp() AS processed_timestamp
FROM ${catalog}.${bronze_schema}.qx_trax_defect_report;

-- ============================================================================
-- 9. qx_ppmtx_defect_report_pn (Defect Report Parts)
-- ============================================================================
-- Silver defect report parts - validated parts associated with defect reports
CREATE OR REPLACE MATERIALIZED VIEW ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_defect_report_pn
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE EVERY 4 HOURS
AS
SELECT
  *,
  current_timestamp() AS processed_timestamp
FROM ${catalog}.${bronze_schema}.qx_trax_defect_report_pn;
