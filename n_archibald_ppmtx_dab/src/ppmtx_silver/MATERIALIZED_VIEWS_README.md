# Silver Layer Materialized Views - Standalone Incremental Refresh

## Overview

This directory contains the standalone Materialized View (MV) definitions for the Silver layer, converted from pipeline-based DLT definitions to independent SQL CREATE OR REPLACE MATERIALIZED VIEW statements. All 12 views now include:

- **CLUSTER BY AUTO** — Automatic optimized clustering for performance
- **REFRESH POLICY INCREMENTAL** — Incremental refresh for cost efficiency
- **Individual Refresh Schedules** — Tier 1 views on fixed schedules; Tier 2 views trigger on upstream updates

## File Organization

### 1. `01_tier1_daily_mvs.sql`
**6 Materialized Views with Daily Refresh at 7:00 AM UTC**

These views read directly from bronze tables and refresh daily using a CRON schedule:

| View Name | Bronze Source | Upstream Dependencies | Refresh Schedule |
|-----------|---------------|----------------------|-----------------|
| `qx_ppmtx_pn_master` | `qx_trax_pn_master` | None (bronze) | CRON '0 0 7 * * ?' UTC |
| `qx_ppmtx_pn_inventory_detail` | `qx_trax_pn_inventory_detail` | None (bronze) | CRON '0 0 7 * * ?' UTC |
| `qx_ppmtx_pn_inventory_history` | `qx_trax_pn_inventory_history` | None (bronze) | CRON '0 0 7 * * ?' UTC |
| `qx_ppmtx_ac_pn_transaction_history` | `qx_trax_pn_transaction_history` | None (bronze) | CRON '0 0 7 * * ?' UTC |
| `qx_ppmtx_pn_tear_down_report` | `qx_trax_pn_tear_down_report` | None (bronze) | CRON '0 0 7 * * ?' UTC |
| `qx_ppmtx_order_detail` | `qx_trax_order_detail` | None (bronze) | CRON '0 0 7 * * ?' UTC |

### 2. `02_tier1_hourly_mvs.sql`
**3 Materialized Views with 4-Hourly Refresh**

These views also read directly from bronze tables but refresh every 4 hours for faster data currency:

| View Name | Bronze Source | Upstream Dependencies | Refresh Schedule |
|-----------|---------------|----------------------|-----------------|
| `qx_ppmtx_pn_inventory_control` | `qx_trax_pn_inventory_control` | None (bronze) | EVERY 4 HOURS |
| `qx_ppmtx_defect_report` | `qx_trax_defect_report` | None (bronze) | EVERY 4 HOURS |
| `qx_ppmtx_defect_report_pn` | `qx_trax_defect_report_pn` | None (bronze) | EVERY 4 HOURS |

### 3. `03_tier2_trigger_mvs.sql`
**3 Data Quality Monitoring Views with Trigger-Based Refresh**

These views read from Tier 1 MVs and automatically refresh whenever their upstream dependencies are updated:

| View Name | Upstream Dependencies | Refresh Trigger |
|-----------|----------------------|-----------------|
| `qx_ppmtx_dq_orphaned_inventory` | `qx_ppmtx_pn_inventory_detail`, `qx_ppmtx_pn_master` | TRIGGER ON UPDATE |
| `qx_ppmtx_dq_orphaned_defect_pn` | `qx_ppmtx_defect_report_pn`, `qx_ppmtx_pn_master` | TRIGGER ON UPDATE |
| `qx_ppmtx_dq_record_counts` | All 9 Tier 1 MVs | TRIGGER ON UPDATE |

## Architecture

```
Bronze Layer
├── qx_trax_pn_master
├── qx_trax_pn_inventory_detail
├── qx_trax_pn_inventory_history
├── qx_trax_pn_transaction_history
├── qx_trax_pn_tear_down_report
├── qx_trax_order_detail
├── qx_trax_pn_inventory_control
├── qx_trax_defect_report
└── qx_trax_defect_report_pn
        ↓
        ↓ (Read + Transform + REFRESH POLICY INCREMENTAL)
        ↓
┌─────────────────────────────────────────────────────┐
│         TIER 1: Fixed Schedule MVs (9 views)         │
│  • 6 Daily @ 7 AM UTC (CRON)                         │
│  • 3 Every 4 Hours (EVERY)                           │
└─────────────────────────────────────────────────────┘
        ↓
        ↓ (Read from Tier 1 + Transform)
        ↓
┌─────────────────────────────────────────────────────┐
│    TIER 2: Trigger-Based MVs (3 Data Quality)       │
│  • Refresh ON UPDATE from upstream dependencies     │
│  • Max 10 upstream sources per view (DQ views: 2, 9) │
└─────────────────────────────────────────────────────┘
```

## Deployment Instructions

### Prerequisites

1. **Databricks Workspace**: Must have Unity Catalog enabled
2. **Variables**: Set the following Databricks configuration variables:
   - `${catalog}` — The UC catalog name (e.g., `subject_maintenanceengineering_test`)
   - `${an_maintenanceengineering_ods}` — The silver schema name (e.g., `an_maintenanceengineering_ods`)
   - `${bronze_schema}` — The bronze schema name (e.g., `an_raw_data`)

3. **Permissions**: The deployment principal must have:
   - `MODIFY` permission on the silver schema
   - `SELECT` permission on the bronze schema

### Step 1: Deploy Tier 1 Views (Fixed Schedule)

Deploy the daily and hourly refresh views first:

```sql
-- In Databricks SQL Editor or via API
-- Run 01_tier1_daily_mvs.sql
-- Run 02_tier1_hourly_mvs.sql
```

**Order matters**: Tier 1 views must exist before Tier 2 can be created.

### Step 2: Deploy Tier 2 Views (Trigger-Based)

Once all Tier 1 views are successfully created, deploy Tier 2:

```sql
-- In Databricks SQL Editor or via API
-- Run 03_tier2_trigger_mvs.sql
```

### Step 3: Monitor Initial Refresh

After deployment, monitor the initial refresh:

```sql
-- Check MV refresh status
SELECT * FROM system.object_schema.materialized_views
WHERE catalog_name = '${catalog}'
  AND schema_name = '${an_maintenanceengineering_ods}'
  AND name LIKE 'qx_ppmtx_%'
ORDER BY name;
```

## Important Notes

### 1. First Refresh is Full Recomputation
- The first scheduled refresh after creation will perform a full table scan and materialization
- Subsequent refreshes use the INCREMENTAL policy for cost optimization
- Plan for potential increased compute cost during initial refresh window (7 AM UTC)

### 2. Incrementalizability Verification
- Complex joins (especially LEFT OUTER joins) may not be fully incrementalizable
- The DQ views use outer joins and should be monitored for refresh efficiency
- To verify incrementalizability of a specific view:

```sql
EXPLAIN CREATE MATERIALIZED VIEW ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_dq_orphaned_inventory
CLUSTER BY AUTO
REFRESH POLICY INCREMENTAL
TRIGGER ON UPDATE
AS ...;
```

### 3. TRIGGER ON UPDATE Limitations
- Maximum 10 upstream dependencies per view
- `qx_ppmtx_dq_record_counts` has exactly 9 upstream MVs (at capacity)
- Do not add additional upstream sources to this view

### 4. Reference Tables (Not Modified)
- `qx_ppmtx_dq_rules` — Data quality validation rules (unchanged)
- `qx_ppmtx_prop_part_overrides` — Manual part overrides (unchanged)

These are standalone configuration tables, not MVs, and should not be included in refresh policies.

### 5. Processing Timestamp Column
- All views include a `processed_timestamp` column set to `current_timestamp()` at creation
- This column indicates when the row was added to the MV
- Note: The refresh policy may not update this column on incremental refreshes

## Refresh Schedule Summary

| Schedule Type | Views | Refresh Interval | Rationale |
|---------------|-------|------------------|-----------|
| Daily @ 7 AM UTC | 6 Tier 1 (master data, inventory history) | 24 hours | Stable reference data, low churn |
| Every 4 Hours | 3 Tier 1 (control, defect, defect-parts) | 4 hours | Higher velocity, operational need |
| On Update | 3 Tier 2 (DQ monitoring) | Automatic | Real-time data quality visibility |

## Validation Steps

After deployment, validate the setup:

```sql
-- 1. Verify all 12 MVs are created
SELECT name, kind, refresh_policy, refresh_schedule
FROM system.object_schema.materialized_views
WHERE catalog_name = '${catalog}'
  AND schema_name = '${an_maintenanceengineering_ods}'
  AND name LIKE 'qx_ppmtx_%'
ORDER BY name;

-- 2. Verify row counts (should match bronze after first refresh)
SELECT 'qx_ppmtx_pn_master' as table_name, COUNT(*) as row_count
FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_pn_master
UNION ALL
SELECT 'qx_ppmtx_pn_inventory_detail' as table_name, COUNT(*) as row_count
FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_pn_inventory_detail
-- ... repeat for all 12 views

-- 3. Check DQ record counts are capturing all upstream tables
SELECT * FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_dq_record_counts
ORDER BY table_name;
```

## Troubleshooting

### MV Creation Fails
- **Issue**: Variable substitution error
- **Solution**: Verify `${catalog}`, `${an_maintenanceengineering_ods}`, and `${bronze_schema}` are set in workspace config

### Tier 2 Views Cannot Be Created
- **Issue**: Tier 1 views don't exist yet
- **Solution**: Ensure all Tier 1 views are successfully created before running `03_tier2_trigger_mvs.sql`

### Refresh Takes Too Long
- **Issue**: INCREMENTAL refresh not optimized for complex joins
- **Solution**: Run EXPLAIN on the view to diagnose; consider adding clustering hints or simplifying joins

### Data Freshness Issues
- **Issue**: DQ views not refreshing when upstream changes
- **Solution**: Verify TRIGGER ON UPDATE is active; check upstream MV refresh schedules

## Migration from Pipeline-Based Views

These standalone MVs replace the previous Spark Declarative Pipeline (DLT) definitions:

| Previous (DLT) | New (Standalone MV) | Key Changes |
|----------------|-------------------|-------------|
| @dlt.table decorator | CREATE OR REPLACE MATERIALIZED VIEW | SQL syntax instead of Python |
| Pipeline refresh | Fixed schedule + TRIGGER ON UPDATE | Independent refresh policies |
| DLT expectations | (Moved to qx_ppmtx_dq_rules table) | Data quality managed separately |
| cluster_by_auto=True | CLUSTER BY AUTO | Explicit clustering syntax |

The SELECT queries remain unchanged to preserve business logic and transformation rules.

## Related Files

- `dq_rules_loader.py` — Data quality validation rules loader
- `setup_dq_rules_table.py` — DQ rules table initialization
- `/resources/silver/silver_pipeline.yml` — Original DLT pipeline definition (legacy)
- `/resources/silver/silver_dq_setup_job.yml` — DQ rules setup job
