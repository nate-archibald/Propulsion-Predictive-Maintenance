-- ============================================================================
-- Tier 2: Trigger-Based Materialized Views
-- ============================================================================
-- These data quality monitoring materialized views read from Tier 1 silver MVs
-- and refresh automatically when their upstream dependencies are updated.
-- Each view includes CLUSTER BY AUTO and REFRESH POLICY INCREMENTAL with TRIGGER ON UPDATE.
-- ============================================================================

-- ============================================================================
-- 10. qx_ppmtx_dq_orphaned_inventory
-- ============================================================================
-- Referential integrity check - inventory detail records without matching part master entry
-- Upstream dependencies: qx_ppmtx_pn_inventory_detail, qx_ppmtx_pn_master
CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_dq_orphaned_inventory
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
TRIGGER ON UPDATE
AS
SELECT
  inv.batch,
  inv.pn,
  inv.sn,
  inv.condition,
  'Missing in pn_master' AS integrity_issue
FROM ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_inventory_detail AS inv
LEFT JOIN ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_master AS pm ON inv.pn = pm.pn
WHERE pm.pn IS NULL AND inv.pn IS NOT NULL;

-- ============================================================================
-- 11. qx_ppmtx_dq_orphaned_defect_pn
-- ============================================================================
-- Referential integrity check - defect report parts without matching part master entry
-- Upstream dependencies: qx_ppmtx_defect_report_pn, qx_ppmtx_pn_master
CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_dq_orphaned_defect_pn
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
TRIGGER ON UPDATE
AS
SELECT
  drp.defect_type,
  drp.defect,
  drp.defect_item,
  drp.pn,
  'Missing in pn_master' AS integrity_issue
FROM ${silver_catalog}.${silver_schema}.qx_ppmtx_defect_report_pn AS drp
LEFT JOIN ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_master AS pm ON drp.pn = pm.pn
WHERE pm.pn IS NULL AND drp.pn IS NOT NULL;

-- ============================================================================
-- 12. qx_ppmtx_dq_record_counts
-- ============================================================================
-- Data quality monitoring - record counts per Silver table
-- Upstream dependencies: All 9 Tier 1 MVs
-- (qx_ppmtx_pn_master, qx_ppmtx_pn_inventory_control, qx_ppmtx_pn_inventory_detail,
--  qx_ppmtx_pn_inventory_history, qx_ppmtx_ac_pn_transaction_history, qx_ppmtx_order_detail,
--  qx_ppmtx_pn_tear_down_report, qx_ppmtx_defect_report, qx_ppmtx_defect_report_pn)
CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_dq_record_counts
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
TRIGGER ON UPDATE
AS
SELECT 'qx_ppmtx_pn_master' AS table_name, COUNT(*) AS record_count
FROM ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_master
UNION ALL
SELECT 'qx_ppmtx_pn_inventory_control' AS table_name, COUNT(*) AS record_count
FROM ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_inventory_control
UNION ALL
SELECT 'qx_ppmtx_pn_inventory_detail' AS table_name, COUNT(*) AS record_count
FROM ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_inventory_detail
UNION ALL
SELECT 'qx_ppmtx_pn_inventory_history' AS table_name, COUNT(*) AS record_count
FROM ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_inventory_history
UNION ALL
SELECT 'qx_ppmtx_ac_pn_transaction_history' AS table_name, COUNT(*) AS record_count
FROM ${silver_catalog}.${silver_schema}.qx_ppmtx_ac_pn_transaction_history
UNION ALL
SELECT 'qx_ppmtx_order_detail' AS table_name, COUNT(*) AS record_count
FROM ${silver_catalog}.${silver_schema}.qx_ppmtx_order_detail
UNION ALL
SELECT 'qx_ppmtx_pn_tear_down_report' AS table_name, COUNT(*) AS record_count
FROM ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_tear_down_report
UNION ALL
SELECT 'qx_ppmtx_defect_report' AS table_name, COUNT(*) AS record_count
FROM ${silver_catalog}.${silver_schema}.qx_ppmtx_defect_report
UNION ALL
SELECT 'qx_ppmtx_defect_report_pn' AS table_name, COUNT(*) AS record_count
FROM ${silver_catalog}.${silver_schema}.qx_ppmtx_defect_report_pn;

-- ============================================================================
-- 13. qx_ppmtx_pn_inventory_detail_quarantine
-- ============================================================================
-- Quarantined inventory detail records that fail critical DQ rules (replaces
-- the old @dlt.expect_all_or_drop-based quarantine table from the retired
-- Silver DLT pipeline). Reads from Bronze directly, same as the pre-MV logic,
-- since qx_ppmtx_pn_inventory_detail itself no longer drops failing rows.
-- Critical rules reproduced here from qx_ppmtx_dq_rules as of 2026-09-21:
--   unit_cost_non_negative: unit_cost IS NULL OR unit_cost >= 0
--   batch_not_null: batch IS NOT NULL
-- If qx_ppmtx_dq_rules changes for this table, this view must be updated and
-- redeployed to match (it is no longer read dynamically from the rules table).
-- No quarantine_timestamp column: current_timestamp() is non-deterministic and
-- blocks REFRESH POLICY INCREMENTAL (MATERIALIZED_VIEW_NOT_INCREMENTALIZABLE).
-- Upstream dependency: qx_ppmtx_pn_inventory_detail (triggers refresh on update)
CREATE OR REPLACE MATERIALIZED VIEW ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_inventory_detail_quarantine
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
TRIGGER ON UPDATE
AS
SELECT
  b.*,
  'Failed critical DQ rules' AS quarantine_reason
FROM ${bronze_catalog}.${bronze_schema}.qx_trax_pn_inventory_detail AS b
-- Semi-join on the published Silver MV (rather than raw Bronze) so this view's
-- refresh is triggered by qx_ppmtx_pn_inventory_detail's own schedule/updates.
LEFT SEMI JOIN ${silver_catalog}.${silver_schema}.qx_ppmtx_pn_inventory_detail AS s
  ON b.pn <=> s.pn AND b.batch <=> s.batch
WHERE NOT (b.unit_cost IS NULL OR b.unit_cost >= 0)
   OR NOT (b.batch IS NOT NULL);
