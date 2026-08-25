-- Deploy Tier 1 Daily Materialized Views via databricks workspace CLI
-- Run as: databricks workspace import --source <this-file> --path /Workspace/Users/<user>/deploy_tier1.sql --format SOURCE

-- ============================================================================
-- TIER 1 DAILY - 6 Materialized Views with Daily CRON Refresh @ 7 AM UTC
-- ============================================================================

-- 1. qx_ppmtx_pn_master
CREATE OR REPLACE MATERIALIZED VIEW subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_pn_master
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS SELECT * FROM subject_maintenanceengineering.ds_maintenanceengineering_ods.qx_trax_pn_master;

-- 2. qx_ppmtx_pn_inventory_detail
CREATE OR REPLACE MATERIALIZED VIEW subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_pn_inventory_detail
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS SELECT * FROM subject_maintenanceengineering.ds_maintenanceengineering_ods.qx_trax_pn_inventory_detail;

-- 3. qx_ppmtx_pn_inventory_history
CREATE OR REPLACE MATERIALIZED VIEW subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_pn_inventory_history
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS SELECT * FROM subject_maintenanceengineering.ds_maintenanceengineering_ods.qx_trax_pn_inventory_history;

-- 4. qx_ppmtx_ac_pn_transaction_history (note: ac_pn, not pn)
CREATE OR REPLACE MATERIALIZED VIEW subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_ac_pn_transaction_history
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS SELECT * FROM subject_maintenanceengineering.ds_maintenanceengineering_ods.qx_trax_ac_pn_transaction_history;

-- 5. qx_ppmtx_pn_tear_down_report
CREATE OR REPLACE MATERIALIZED VIEW subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_pn_tear_down_report
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS SELECT * FROM subject_maintenanceengineering.ds_maintenanceengineering_ods.qx_trax_pn_tear_down_report;

-- 6. qx_ppmtx_order_detail
CREATE OR REPLACE MATERIALIZED VIEW subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_order_detail
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS SELECT * FROM subject_maintenanceengineering.ds_maintenanceengineering_ods.qx_trax_order_detail;
