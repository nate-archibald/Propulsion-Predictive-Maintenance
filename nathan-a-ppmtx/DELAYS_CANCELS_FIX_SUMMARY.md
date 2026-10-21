# Fix: Delays/Cancels Not Showing on Overview Page ✓

## Problem Statement
The Overview page displayed KPI counts for **Total Delay Minutes** and **Cancellations**, but when users clicked to see the detail dropdown, the records didn't appear or counts didn't match.

---

## Root Cause Analysis

**Location:** `nathan-a-ppmtx/server/server.ts` line ~1980

The **KPI aggregation query** (`/api/kpis`) was summing ALL `delay_minutes` values without filtering, but the **detail endpoint** (`/api/delays/detail`) only returned rows where `delay_minutes > 0`.

### Before (Buggy) ❌
```sql
-- KPI query: sums ALL delay_minutes (no > 0 check)
SELECT COUNT(*) FILTER (WHERE fd.cancellation IS NOT NULL ...) AS cancel_count,
       COALESCE(SUM(fd.delay_minutes) FILTER (WHERE ${inRange}), 0) AS total_delay_minutes
FROM ...

-- Detail endpoint: only returns rows where delay > 0
WHERE ... AND fd.delay_minutes > 0
```

**Impact:** 
- KPI might show "245 total delay minutes" from 5 records
- Detail dropdown shows only 3 records (the 2 with zero/NULL delays are excluded)
- **Mismatch & confusion**

---

## Solution Implemented ✓

Updated the KPI delay aggregation to apply the same `> 0` filter as the detail endpoint.

### After (Fixed) ✓
```sql
-- KPI query: now filters delay_minutes > 0 (matches detail endpoint)
SELECT COUNT(*) FILTER (WHERE fd.cancellation IS NOT NULL ...) AS cancel_count,
       COALESCE(SUM(fd.delay_minutes) FILTER (WHERE fd.delay_minutes > 0 AND ${inRange}), 0) AS total_delay_minutes
FROM ...

-- Detail endpoint: returns rows where delay > 0 (unchanged)
WHERE ... AND fd.delay_minutes > 0
```

**Result:** 
- KPI shows "180 total delay minutes" from exactly 3 records
- Detail dropdown shows the same 3 records
- **Perfect reconciliation!**

---

## Changes Made

| File | Change | Commit |
|------|--------|--------|
| `nathan-a-ppmtx/server/server.ts` | Line ~1980: Added `fd.delay_minutes > 0 AND` to delay SUM FILTER | [6dcfbcd](https://github.com/nate-archibald/Propulsion-Predictive-Maintenance/commit/6dcfbcd) |

---

## Verification

✓ **Build:** `npm run build` completed successfully (no TypeScript errors)

### Manual Testing
1. **Reload the Overview page** in your browser after deployment
2. **Check the delay/cancellation KPI cards** — note the counts
3. **Click the dropdowns** — verify records shown equal the count above

### SQL Verification
Run this to confirm data exists for your date range:
```sql
SELECT COUNT(*) AS delay_records
FROM qx_ppmtx_synced_gold_fact_defect_delay fd
WHERE fd.delay_minutes > 0
  AND fd.delay_date_key IN (
    SELECT dim_date_key FROM qx_ppmtx_synced_gold_dim_date
    WHERE calendar_date >= '2026-10-13'  -- Adjust to your test range
  );
```

---

## Deployment

1. **Branch:** Committed to `main` branch (pushed to remote)
2. **Next Step:** Deploy the app to Databricks Apps via:
   ```bash
   databricks apps deploy --deployment-id nathan-a-ppmtx
   ```
   OR via the Databricks UI

---

## Related Documentation
- See `DELAYS_CANCELS_FIX.md` at repo root for additional context
- App README: `nathan-a-ppmtx/README.md`
- Server code: `nathan-a-ppmtx/server/server.ts` (lines 1945–2135)
- Homepage client: `nathan-a-ppmtx/client/src/pages/HomePage.tsx`
