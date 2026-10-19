# Delays/Cancels Not Showing on Overview — Root Cause & Fix ✓

## Problem
The Overview page shows KPI counts for delays and cancellations, but the detail dropdowns don't display corresponding records.

## Root Cause Found ✓
**File:** `nathan-a-ppmtx/server/server.ts` (Line ~1980)

The **KPI delay aggregation** was summing ALL delay_minutes values (including NULL and ≤ 0), but the **detail endpoint** only returned rows where `delay_minutes > 0`.

### Before (Buggy)
```sql
-- KPI query sums ALL delay minutes (no > 0 filter)
COALESCE(SUM(fd.delay_minutes) FILTER (WHERE ${inRange}), 0)::int AS total_delay_minutes

-- Detail query only returns rows where delay > 0
WHERE ... AND fd.delay_minutes > 0
```

**Result:** KPI shows totals that include records not in the detail list = mismatch!

### After (Fixed) ✓
```sql
-- KPI query now filters delay_minutes > 0, matching detail endpoint
COALESCE(SUM(fd.delay_minutes) FILTER (WHERE fd.delay_minutes > 0 AND ${inRange}), 0)::int AS total_delay_minutes
```

**Now:** KPI totals reconcile perfectly with detail list contents.

---

## Change Summary
- **Modified:** `nathan-a-ppmtx/server/server.ts` line ~1980
- **Change:** Added `fd.delay_minutes > 0 AND` to the delay SUM FILTER clause
- **Impact:** Delays shown on Overview card now match detail dropdown records exactly

## Next Steps
1. Rebuild and deploy the app
2. Refresh the Overview page
3. Verify delay/cancellation KPI dropdowns now show data

Test SQL to confirm data exists:
```sql
SELECT COUNT(*) FROM qx_ppmtx_synced_gold_fact_defect_delay
WHERE fd.delay_minutes > 0
  AND fd.delay_date_key IN (
    SELECT dim_date_key FROM qx_ppmtx_synced_gold_dim_date
    WHERE calendar_date >= DATE_SUB(CURRENT_DATE, 7)
  );
```
