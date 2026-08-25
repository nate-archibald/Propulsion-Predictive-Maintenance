-- Step 1: Create qx_ppmtx_pn_master
CREATE OR REPLACE MATERIALIZED VIEW subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_pn_master
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS SELECT * FROM subject_maintenanceengineering.ds_maintenanceengineering_ods.qx_trax_pn_master;
