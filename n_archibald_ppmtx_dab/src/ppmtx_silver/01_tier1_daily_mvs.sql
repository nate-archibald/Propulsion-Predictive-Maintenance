-- ============================================================================
-- Tier 1: Fixed Schedule Materialized Views - Daily Refresh at 7:00 AM UTC
-- ============================================================================
-- These materialized views read directly from bronze tables and refresh
-- daily at 7:00 AM UTC using CRON schedule.
-- Each view includes CLUSTER BY AUTO and REFRESH POLICY INCREMENTAL.
-- ============================================================================

-- Variables configured at deployment time
-- Silver: subject_maintenanceengineering_test.an_maintenanceengineering_ods
-- Bronze: subject_maintenanceengineering.ds_maintenanceengineering_ods

-- ============================================================================
-- 1. qx_ppmtx_pn_master (Part Number Master)
-- ============================================================================
-- Silver part number master - validated part catalog with quality checks
CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_master
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS
SELECT *
FROM ${bronze_catalog}.${bronze_schema}.qx_trax_pn_master;

-- ============================================================================
-- 2. qx_ppmtx_pn_inventory_detail (Inventory Detail)
-- ============================================================================
-- Silver inventory detail - validated part inventory records with cost and condition tracking
CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_inventory_detail
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS
SELECT *
FROM ${bronze_catalog}.${bronze_schema}.qx_trax_pn_inventory_detail;

-- ============================================================================
-- 3. qx_ppmtx_pn_inventory_history (Inventory Transaction History)
-- ============================================================================
-- Silver inventory history - validated inventory transaction records
CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_inventory_history
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS
SELECT *
FROM ${bronze_catalog}.${bronze_schema}.qx_trax_pn_inventory_history;

-- ============================================================================
-- 4. qx_ppmtx_ac_pn_transaction_history (Aircraft Part Transaction History)
-- ============================================================================
-- Silver aircraft part transactions - validated component removal/installation history
CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_ac_pn_transaction_history
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS
SELECT *
FROM ${bronze_catalog}.${bronze_schema}.qx_trax_pn_transaction_history;

-- ============================================================================
-- 5. qx_ppmtx_pn_tear_down_report (Tear Down Reports)
-- ============================================================================
-- Silver tear down reports - validated component teardown and fault analysis records
CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_tear_down_report
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS
SELECT *
FROM ${bronze_catalog}.${bronze_schema}.qx_trax_pn_tear_down_report;

-- ============================================================================
-- 6. qx_ppmtx_order_detail (Order Details)
-- ============================================================================
-- Silver order detail - validated maintenance order line items
CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_order_detail
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS
SELECT *
FROM ${bronze_catalog}.${bronze_schema}.qx_trax_order_detail;
