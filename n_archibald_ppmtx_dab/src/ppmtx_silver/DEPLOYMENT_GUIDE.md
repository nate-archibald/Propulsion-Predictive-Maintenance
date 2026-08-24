# Silver Materialized Views - Deployment Guide

## Quick Summary

You now have 3 SQL files that convert 12 pipeline-based materialized views to standalone CREATE OR REPLACE MATERIALIZED VIEW statements with:

- **Tier 1 (9 views)**: Fixed refresh schedules reading from bronze tables
- **Tier 2 (3 DQ views)**: Trigger-based refresh reading from Tier 1 MVs
- All views: `CLUSTER BY AUTO` + `REFRESH POLICY INCREMENTAL`

## Files Created

```
n_archibald_ppmtx_dab/src/ppmtx_silver/
├── 01_tier1_daily_mvs.sql           # 6 daily refresh @ 7 AM UTC
├── 02_tier1_hourly_mvs.sql          # 3 4-hourly refresh
├── 03_tier2_trigger_mvs.sql         # 3 trigger-based DQ views
├── 05_verify_and_analyze_mvs.sql    # Verification & incrementalizability checks
└── MATERIALIZED_VIEWS_README.md     # Detailed documentation
```

## Deployment Checklist

### Step 1: Pre-Deployment Setup ✅

- [ ] Databricks workspace has Unity Catalog enabled
- [ ] Silver schema exists: `subject_maintenanceengineering_test.an_maintenanceengineering_ods`
- [ ] Bronze schema exists with source tables: `subject_maintenanceengineering_test.an_raw_data`
- [ ] Deployment principal has `MODIFY` on silver schema and `SELECT` on bronze schema
- [ ] Set Databricks variables:
  ```
  ${catalog} = subject_maintenanceengineering_test
  ${an_maintenanceengineering_ods} = an_maintenanceengineering_ods
  ${bronze_schema} = an_raw_data
  ```

### Step 2: Deploy Tier 1 Daily MVs

1. Open `01_tier1_daily_mvs.sql` in Databricks SQL Editor
2. Execute all 6 CREATE OR REPLACE MATERIALIZED VIEW statements
3. Verify with:
   ```sql
   SELECT name, created_at FROM system.information_schema.materialized_views
   WHERE schema_name = '${an_maintenanceengineering_ods}'
     AND name IN ('qx_ppmtx_pn_master', 'qx_ppmtx_pn_inventory_detail', 
                  'qx_ppmtx_pn_inventory_history', 'qx_ppmtx_ac_pn_transaction_history',
                  'qx_ppmtx_pn_tear_down_report', 'qx_ppmtx_order_detail');
   ```

**Expected**: 6 rows with status CREATED

**Execution Time**: ~5-15 minutes (first refresh is full materialization)

### Step 3: Deploy Tier 1 4-Hourly MVs

1. Open `02_tier1_hourly_mvs.sql` in Databricks SQL Editor
2. Execute all 3 CREATE OR REPLACE MATERIALIZED VIEW statements
3. Verify with:
   ```sql
   SELECT name, created_at FROM system.information_schema.materialized_views
   WHERE schema_name = '${an_maintenanceengineering_ods}'
     AND name IN ('qx_ppmtx_pn_inventory_control', 'qx_ppmtx_defect_report',
                  'qx_ppmtx_defect_report_pn');
   ```

**Expected**: 3 rows with status CREATED

**Execution Time**: ~5-15 minutes

### Step 4: Deploy Tier 2 Trigger-Based MVs

1. Open `03_tier2_trigger_mvs.sql` in Databricks SQL Editor
2. Execute all 3 CREATE OR REPLACE MATERIALIZED VIEW statements
3. Verify with:
   ```sql
   SELECT name, created_at FROM system.information_schema.materialized_views
   WHERE schema_name = '${an_maintenanceengineering_ods}'
     AND name IN ('qx_ppmtx_dq_orphaned_inventory', 'qx_ppmtx_dq_orphaned_defect_pn',
                  'qx_ppmtx_dq_record_counts');
   ```

**Expected**: 3 rows with status CREATED

**Execution Time**: ~2-5 minutes (depends on Tier 1 MV data sizes)

### Step 5: Post-Deployment Validation

Run the verification script:

```bash
# In Databricks SQL Editor, open and execute 05_verify_and_analyze_mvs.sql
```

This will:
1. Confirm all 12 MVs are created
2. Compare row counts with bronze (post first-refresh)
3. Show DQ monitoring results
4. Generate EXPLAIN plans to verify incrementalizability

## Refresh Schedule Reference

| Tier | View Name | Schedule | First Refresh | Subsequent Refreshes |
|------|-----------|----------|---------------|----------------------|
| **1-Daily** | qx_ppmtx_pn_master | Daily 7 AM UTC | Full | Incremental |
| **1-Daily** | qx_ppmtx_pn_inventory_detail | Daily 7 AM UTC | Full | Incremental |
| **1-Daily** | qx_ppmtx_pn_inventory_history | Daily 7 AM UTC | Full | Incremental |
| **1-Daily** | qx_ppmtx_ac_pn_transaction_history | Daily 7 AM UTC | Full | Incremental |
| **1-Daily** | qx_ppmtx_pn_tear_down_report | Daily 7 AM UTC | Full | Incremental |
| **1-Daily** | qx_ppmtx_order_detail | Daily 7 AM UTC | Full | Incremental |
| **1-Hourly** | qx_ppmtx_pn_inventory_control | Every 4 hours | Full | Incremental |
| **1-Hourly** | qx_ppmtx_defect_report | Every 4 hours | Full | Incremental |
| **1-Hourly** | qx_ppmtx_defect_report_pn | Every 4 hours | Full | Incremental |
| **2-DQ** | qx_ppmtx_dq_orphaned_inventory | On Tier 1 update | Full | Incremental |
| **2-DQ** | qx_ppmtx_dq_orphaned_defect_pn | On Tier 1 update | Full | Incremental |
| **2-DQ** | qx_ppmtx_dq_record_counts | On Tier 1 update | Full | Incremental |

## Important Considerations

### First Refresh Timing

The first refresh for each MV performs a full table materialization:

- **Daily MVs** refresh at 7:00 AM UTC
- **4-Hourly MVs** refresh immediately after creation, then every 4 hours
- **Trigger MVs** refresh immediately after Tier 1 MVs complete

**Planning Note**: The 7 AM UTC window on day 1 will see significant cluster activity. Allow 24 hours for the first complete refresh cycle.

### Incremental Refresh Efficiency

- **Tier 1**: Simple SELECT * queries should incrementalize well (90-95% efficiency)
- **Tier 2 (DQ Orphaned)**: LEFT OUTER JOIN with WHERE NULL check may have 60-80% incrementalization efficiency
- **Tier 2 (Record Counts)**: UNION of COUNT(*) across 9 MVs may have 40-60% incrementalization efficiency

Monitor refresh history after 1 week to baseline performance.

### Processing Timestamp Column

All views include a `processed_timestamp` column. Note:

- Set to `current_timestamp()` during view creation
- May not update during incremental refreshes (depends on optimization)
- Use `MAX(processed_timestamp)` to identify the refresh point

### Data Quality Rules

The original DLT expectations from pipeline definitions have been migrated to:
- `qx_ppmtx_dq_rules` table — Contains expectation definitions
- `qx_ppmtx_dq_record_counts`, `qx_ppmtx_dq_orphaned_*` views — Monitoring implementation

### Costs

- **Daily MVs**: 6 full refreshes per day (@ 7 AM) after first refresh
- **4-Hourly MVs**: 6 full refreshes per day after first refresh
- **Trigger MVs**: Refreshes on upstream updates (variable, typically 2-4x daily)

Incremental refreshes should reduce costs by 40-70% vs. full refreshes.

## Troubleshooting

### Issue: "Materialized view creation failed: Syntax error"

**Cause**: Variable substitution didn't work

**Solution**:
```sql
-- Check that these variables are set in your notebook
SHOW PARAMETER ${catalog};
SHOW PARAMETER ${an_maintenanceengineering_ods};
SHOW PARAMETER ${bronze_schema};

-- If not set, define them:
SET VARIABLE catalog = "subject_maintenanceengineering_test";
SET VARIABLE an_maintenanceengineering_ods = "an_maintenanceengineering_ods";
SET VARIABLE bronze_schema = "an_raw_data";
```

### Issue: "Tier 2 creation fails: Materialized view not found"

**Cause**: Tier 1 MVs haven't finished first refresh

**Solution**:
1. Wait for all Tier 1 MVs to complete initial materialization
2. Check refresh status:
   ```sql
   SELECT * FROM system.materialized_views.refresh_history
   WHERE materialized_view_catalog = 'subject_maintenanceengineering_test'
     AND materialized_view_schema = 'an_maintenanceengineering_ods'
   ORDER BY refresh_start_time DESC;
   ```

### Issue: "PERMISSION_DENIED: User does not have MODIFY privilege"

**Cause**: Missing permissions on silver schema

**Solution**:
```sql
-- As admin, grant permissions:
GRANT MODIFY ON SCHEMA subject_maintenanceengineering_test.an_maintenanceengineering_ods
  TO <your-principal>;

GRANT SELECT ON SCHEMA subject_maintenanceengineering_test.an_raw_data
  TO <your-principal>;
```

### Issue: DQ views show "0 orphaned records" but we know there are issues

**Cause**: First refresh hasn't completed

**Solution**: Wait for first refresh cycle to complete (up to 24 hours for daily MVs + 4 hours for trigger MVs)

## Monitoring After Deployment

### Daily Checks (First Week)

```sql
-- Check all MVs have refreshed
SELECT name, refresh_status, last_refresh_time
FROM system.materialized_views
WHERE schema_name = '${an_maintenanceengineering_ods}'
  AND name LIKE 'qx_ppmtx_%'
ORDER BY last_refresh_time DESC;

-- Verify DQ record counts
SELECT * FROM ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_dq_record_counts;
```

### Weekly Reviews

```sql
-- Check refresh performance trends
SELECT
  materialized_view_name,
  COUNT(*) as refresh_count,
  AVG(refresh_duration_ms) as avg_duration_ms,
  MAX(refresh_bytes_scanned) as max_bytes_scanned
FROM system.materialized_views.refresh_history
WHERE materialized_view_catalog = '${catalog}'
  AND materialized_view_schema = '${an_maintenanceengineering_ods}'
  AND materialized_view_name LIKE 'qx_ppmtx_%'
GROUP BY materialized_view_name
ORDER BY avg_duration_ms DESC;
```

### Monthly Health Check

Run `05_verify_and_analyze_mvs.sql` monthly to:
- Verify row counts haven't diverged from bronze
- Check incrementalization efficiency via EXPLAIN
- Monitor data quality monitoring results

## Rollback Procedure

If you need to revert to pipeline-based definitions:

```sql
-- Drop all standalone MVs (Tier 2 first)
DROP MATERIALIZED VIEW IF EXISTS ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_dq_record_counts;
DROP MATERIALIZED VIEW IF EXISTS ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_dq_orphaned_defect_pn;
DROP MATERIALIZED VIEW IF EXISTS ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_dq_orphaned_inventory;

-- Then Tier 1 (order doesn't matter for these)
DROP MATERIALIZED VIEW IF EXISTS ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_pn_master;
DROP MATERIALIZED VIEW IF EXISTS ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_pn_inventory_detail;
DROP MATERIALIZED VIEW IF EXISTS ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_pn_inventory_history;
DROP MATERIALIZED VIEW IF EXISTS ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_ac_pn_transaction_history;
DROP MATERIALIZED VIEW IF EXISTS ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_pn_tear_down_report;
DROP MATERIALIZED VIEW IF EXISTS ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_order_detail;
DROP MATERIALIZED VIEW IF EXISTS ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_pn_inventory_control;
DROP MATERIALIZED VIEW IF EXISTS ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_defect_report;
DROP MATERIALIZED VIEW IF EXISTS ${catalog}.${an_maintenanceengineering_ods}.qx_ppmtx_defect_report_pn;

-- Then revert to DLT pipeline
-- (Steps depend on your Git branch and DAB configuration)
```

## Questions?

Refer to `MATERIALIZED_VIEWS_README.md` for:
- Architecture diagram
- Business logic unchanged guarantee
- Tier dependency explanation
- Advanced troubleshooting

## Next Steps

1. ✅ Deploy Tier 1 daily MVs (`01_tier1_daily_mvs.sql`)
2. ✅ Deploy Tier 1 4-hourly MVs (`02_tier1_hourly_mvs.sql`)
3. ✅ Deploy Tier 2 trigger MVs (`03_tier2_trigger_mvs.sql`)
4. ✅ Run verification script (`05_verify_and_analyze_mvs.sql`)
5. ✅ Monitor first refresh cycle (24 hours)
6. ✅ Update documentation/runbooks for ops team
7. ✅ Schedule monthly health checks
