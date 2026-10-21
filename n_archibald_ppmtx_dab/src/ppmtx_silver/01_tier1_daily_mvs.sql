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

-- ============================================================================
-- 7. qx_ppmtx_engineering_order (Engineering Orders)
-- ============================================================================
-- Silver engineering orders - validated EO/EC records (mandatory service bulletins,
-- ECMP task cards, etc.). Powers the Overview 'ECMP' open-count KPI.
-- Runs at 6:45 AM Pacific (not UTC) -- 15 min ahead of the 7 AM
-- America/Los_Angeles Gold merge / Lakebase sync job, so Gold always reads
-- freshly refreshed Silver data instead of racing it.
CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_engineering_order
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 45 6 * * ?' AT TIME ZONE 'America/Los_Angeles'
AS
SELECT *
FROM ${bronze_catalog}.${bronze_schema}.qx_trax_engineering_order;

-- ============================================================================
-- 8. qx_ppmtx_pn_interchangeable (Two-Way Interchangeable Part Numbers)
-- ============================================================================
-- Silver two-way interchangeability catalog - validated, ACTIVE-only part
-- equivalence pairs. Feeds the Gold bridge_part_interchangeable table so that
-- whenever a PN is queried, its interchangeable alternates are resolvable.
-- Curated projection: the bronze table carries 60+ mostly-null columns; only
-- the substitution-relevant attributes are retained here.
CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_interchangeable
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS
SELECT
  pn,
  pn_interchangeable,
  interchangeable_type,
  prefer,
  manufacturer,
  vendor,
  iic,
  pma,
  status,
  modified_date
FROM ${bronze_catalog}.${bronze_schema}.qx_trax_pn_interchangeable
WHERE UPPER(TRIM(status)) = 'ACTIVE';

-- ============================================================================
-- 9. qx_ppmtx_pn_interchg_one_way (One-Way Interchangeable Part Numbers)
-- ============================================================================
-- Silver one-way (directional) interchangeability catalog - pn can be replaced
-- BY pn_interchangeable, but not necessarily the reverse. Feeds the Gold bridge
-- alongside the two-way pairs, tagged as one_way so the app can badge and apply
-- them directionally. This table has no status column in the source.
CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_interchg_one_way
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
SCHEDULE CRON '0 0 7 * * ?' AT TIME ZONE 'UTC'
AS
SELECT
  pn,
  pn_interchangeable,
  interchangeable_type,
  pn_inter_type,
  prefer,
  vendor,
  authorization_code,
  conditional_notes,
  modified_date
FROM ${bronze_catalog}.${bronze_schema}.qx_trax_pn_interchg_one_way;
