-- Deploy Tier 1 Daily Materialized Views (6 views)
-- This script can be executed directly via Databricks CLI

-- ============================================================================
-- 1. qx_ppmtx_pn_master (Part Number Master)
-- ============================================================================
CREATE OR REPLACE MATERIALIZED VIEW subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_pn_master
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS
SELECT *
FROM subject_maintenanceengineering.ds_maintenanceengineering_ods.qx_trax_pn_master;

-- ============================================================================
-- 2. qx_ppmtx_pn_inventory_detail (Inventory Detail)
-- ============================================================================
CREATE OR REPLACE MATERIALIZED VIEW subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_pn_inventory_detail
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS
SELECT *
FROM subject_maintenanceengineering.ds_maintenanceengineering_ods.qx_trax_pn_inventory_detail;

-- ============================================================================
-- 3. qx_ppmtx_pn_inventory_history (Inventory Transaction History)
-- ============================================================================
CREATE OR REPLACE MATERIALIZED VIEW subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_pn_inventory_history
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS
SELECT *
FROM subject_maintenanceengineering.ds_maintenanceengineering_ods.qx_trax_pn_inventory_history;

-- ============================================================================
-- 4. qx_ppmtx_ac_pn_transaction_history (Aircraft Part Transaction History)
-- ============================================================================
CREATE OR REPLACE MATERIALIZED VIEW subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_ac_pn_transaction_history
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS
SELECT *
FROM subject_maintenanceengineering.ds_maintenanceengineering_ods.qx_trax_pn_transaction_history;

-- ============================================================================
-- 5. qx_ppmtx_pn_tear_down_report (Tear Down Reports)
-- ============================================================================
CREATE OR REPLACE MATERIALIZED VIEW subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_pn_tear_down_report
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS
SELECT *
FROM subject_maintenanceengineering.ds_maintenanceengineering_ods.qx_trax_pn_tear_down_report;

-- ============================================================================
-- 6. qx_ppmtx_order_detail (Order Details)
-- ============================================================================
CREATE OR REPLACE MATERIALIZED VIEW subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_order_detail
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS
SELECT *
FROM subject_maintenanceengineering.ds_maintenanceengineering_ods.qx_trax_order_detail;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 
  name,
  kind,
  owner,
  created_at,
  'TIER 1 DAILY' as tier
FROM system.information_schema.materialized_views
WHERE catalog_name = 'subject_maintenanceengineering_test'
  AND schema_name = 'an_maintenanceengineering_ods'
  AND name IN (
    'qx_ppmtx_pn_master',
    'qx_ppmtx_pn_inventory_detail',
    'qx_ppmtx_pn_inventory_history',
    'qx_ppmtx_ac_pn_transaction_history',
    'qx_ppmtx_pn_tear_down_report',
    'qx_ppmtx_order_detail'
  )
ORDER BY name;
