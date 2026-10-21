-- ============================================================================
-- Tier 1: Fixed Schedule Materialized Views - 4-Hourly Refresh
-- ============================================================================
-- These materialized views read directly from bronze tables and refresh
-- every 4 hours using SCHEDULE EVERY clause.
-- Each view includes CLUSTER BY AUTO and REFRESH POLICY INCREMENTAL.
-- ============================================================================

-- Variables configured at deployment time
-- Silver: subject_maintenanceengineering_test.an_maintenanceengineering_ods
-- Bronze: subject_maintenanceengineering.ds_maintenanceengineering_ods

-- ============================================================================
-- 7. qx_ppmtx_pn_inventory_control (Inventory Control Schedules)
-- ============================================================================
-- Silver inventory control - validated scheduled maintenance controls for parts
CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_inventory_control
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE EVERY 4 HOURS
AS
SELECT *
FROM ${bronze_catalog}.${bronze_schema}.qx_trax_pn_inventory_control;

-- ============================================================================
-- 8. qx_ppmtx_defect_report (Defect Reports)
-- ============================================================================
-- Silver defect reports - validated aircraft defect and maintenance action records
CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_defect_report
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE EVERY 4 HOURS
AS
SELECT *
FROM ${bronze_catalog}.${bronze_schema}.qx_trax_defect_report;

-- ============================================================================
-- 8b. qx_ppmtx_defect_report_delay (Defect Report Delay/Cancellation Detail)
-- ============================================================================
-- Silver delay/cancellation events, one row per delay_item within a defect.
-- This is the authoritative operational-impact source (delay_minutes,
-- cancellation reason) — NOT the rolled-up delay/cancellation columns carried
-- on qx_ppmtx_defect_report itself, which reflect only the last-known state
-- per defect and undercount/miss delay events tracked here.
-- Bronze has a handful of garbage sentinel dates (e.g. year 1018, year 2600)
-- for rows with no real delay event; filtered out with a fixed literal range
-- (kept deterministic/incrementalizable — no current_date()).
-- IMPORTANT: cancellation events (and many delay events) legitimately carry a
-- NULL delay_date because a cancellation is not a timed delay. A bare
-- `delay_date BETWEEN ...` predicate evaluates to NULL (not true) for those rows
-- and silently dropped ~61% of cancels and ~51% of delays before Gold. We keep
-- NULL delay_date rows (real events) and only exclude the out-of-range sentinels.
CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_defect_report_delay
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE EVERY 4 HOURS
AS
SELECT *
FROM ${bronze_catalog}.${bronze_schema}.qx_trax_defect_report_delay
WHERE delay_date IS NULL
   OR delay_date BETWEEN DATE'2015-01-01' AND DATE'2030-12-31';

-- ============================================================================
-- 9. qx_ppmtx_defect_report_pn (Defect Report Parts)
-- ============================================================================
-- Silver defect report parts - validated parts associated with defect reports
CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_defect_report_pn
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE EVERY 4 HOURS
AS
SELECT *
FROM ${bronze_catalog}.${bronze_schema}.qx_trax_defect_report_pn;
