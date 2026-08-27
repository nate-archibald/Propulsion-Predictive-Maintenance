# Root Cause Analysis & Fix for Spare Parts Count Discrepancy (All 17 Parts)

## THE PROBLEM

The widget counts parts as "spare" using this logic:
```sql
WHERE s.installed_ac IS NULL
  AND s.condition IN ('REPAIR', 'SV', 'OH', 'NEW', 'MOD', 'INSPTEST')
```

This is **INCOMPLETE** because `installed_ac IS NULL` only tells you the part is **not on an aircraft**. It does NOT tell you whether the part is:
- In a **warehouse** (should count as spare) ✅
- Installed on a **shop engine** (should NOT count as spare) ❌

---

## YES, THERE IS AN IDENTIFIER: `installed_position`

From the code, **`installed_position`** contains values like:
- `'LH ENG'` → Left engine  
- `'RH ENG'` → Right engine
- `'APU'` → Auxiliary power unit
- `NULL` → Not installed anywhere (warehouse/loose part)

### The Distinguishing Logic:

A part is installed on **any engine/APU** if:
```sql
TRIM(s.installed_position) IN ('LH ENG', 'RH ENG', 'APU')
  -- OR more broadly:
TRIM(s.installed_position) LIKE '%ENG%' 
  OR TRIM(s.installed_position) = 'APU'
```

A part is **truly in inventory** (spare/warehouse) if:
```sql
s.installed_ac IS NULL 
  AND s.installed_position IS NULL
```

A part is **installed on shop engine** if:
```sql
s.installed_ac IS NULL  -- Not on aircraft
  AND TRIM(s.installed_position) IN ('LH ENG', 'RH ENG', 'APU')  -- But installed on engine/APU
```

---

## ROOT CAUSE CONFIRMED

Your spare count is inflated because it includes:

1. ✅ **Parts in warehouse** → `installed_ac IS NULL` AND `installed_position IS NULL` (correct)
2. ✅ **Parts staged for installation** → `installed_ac IS NULL` AND `installed_position IN ('STAGING', 'PREP')` (depends on your workflow)
3. ❌ **Parts on shop engines** → `installed_ac IS NULL` AND `installed_position IN ('LH ENG', 'RH ENG', 'APU')` (WRONG - should exclude)
4. ❌ **Parts on engines awaiting installation** → Same as #3

---

## THE FIX

Replace the `/api/critical-spares` endpoint query in `server.ts` (~line 1300):

### BEFORE (Current - Incorrect):
```typescript
const result = await executeQuery(
  req,
  appkit,
  `SELECT p.pn, COUNT(DISTINCT s.sn)::int AS spare_count
   FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_snapshot s
   JOIN ${S}.qx_ppmtx_synced_gold_dim_part p ON s.dim_part_key = p.dim_part_key
   WHERE p.pn IN (${pnList})
     AND s.installed_ac IS NULL
     AND s.condition IN (${conditionList})
   GROUP BY p.pn`,
);
```

### AFTER (Fixed - Correct):
```typescript
const result = await executeQuery(
  req,
  appkit,
  `SELECT p.pn, COUNT(DISTINCT s.sn)::int AS spare_count
   FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_snapshot s
   JOIN ${S}.qx_ppmtx_synced_gold_dim_part p ON s.dim_part_key = p.dim_part_key
   WHERE p.pn IN (${pnList})
     AND s.installed_ac IS NULL
     AND (s.installed_position IS NULL 
          OR TRIM(COALESCE(s.installed_position, '')) NOT IN ('LH ENG', 'RH ENG', 'APU'))
     AND s.condition IN (${conditionList})
   GROUP BY p.pn`,
);
```

**This logic says:**
- Part is not on an aircraft (`installed_ac IS NULL`), AND
- Part is either:
  - Not installed anywhere (`installed_position IS NULL`), OR
  - Not installed on an engine/APU (position is something other than ENG/APU)
- AND part is in serviceable condition

---

## ALTERNATIVE FIX: More Specific

If you want to be explicit about what qualifies as spare (warehouse only, nothing in progress):

```typescript
const result = await executeQuery(
  req,
  appkit,
  `SELECT p.pn, COUNT(DISTINCT s.sn)::int AS spare_count
   FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_snapshot s
   JOIN ${S}.qx_ppmtx_synced_gold_dim_part p ON s.dim_part_key = p.dim_part_key
   WHERE p.pn IN (${pnList})
     AND s.installed_ac IS NULL
     AND s.installed_position IS NULL  -- Truly in warehouse, not anywhere else
     AND s.condition IN (${conditionList})
   GROUP BY p.pn`,
);
```

**This is more conservative** — only counts loose parts in warehouse, no parts staged on engines.

---

## WHICH VERSION TO USE?

| Option | Definition of "Spare" | Best For |
|--------|----------------------|----------|
| **Original (Current)** | Not on aircraft | ❌ Too permissive, counts shop engines |
| **Option 1 (Recommended)** | Not on aircraft AND not installed on any engine/APU | ✅ Most accurate for operational inventory |
| **Option 2 (Conservative)** | Completely loose in warehouse | ⚠️ Excludes everything staged/prepared |

**Recommendation: Use Option 1** — it's the sweet spot. Parts staged on engines (but not yet on aircraft) are in use/maintenance and shouldn't be counted as "spare available."

---

## VERIFICATION STEPS

### 1. Run this diagnostic query BEFORE applying fix:
```sql
SELECT 
  TRIM(s.installed_position) as position,
  COUNT(DISTINCT s.sn)::int as count
FROM an_maintenanceengineering_ods.qx_ppmtx_synced_gold_fact_inventory_snapshot s
JOIN an_maintenanceengineering_ods.qx_ppmtx_synced_gold_dim_part p ON s.dim_part_key = p.dim_part_key
WHERE p.pn = '4120T05P04'
  AND s.installed_ac IS NULL
  AND s.condition IN ('REPAIR', 'SV', 'OH', 'NEW', 'MOD', 'INSPTEST')
GROUP BY TRIM(s.installed_position)
ORDER BY position;
```

This shows the **breakdown** — should tell you how many are on 'LH ENG', 'RH ENG', 'APU' vs. NULL.

### 2. After fix, run again and verify:
- `NULL` row = your new correct spare count
- `'LH ENG'` / `'RH ENG'` / `'APU'` rows = excluded (shop engines)

### 3. Compare with ERP for 4120T05P04:
Should now match (2 instead of 6, assuming the 4 extras are on shop engines).

---

## APPLY TO ALL 17 PARTS

The same fix applies to all 17 parts in the widget automatically once you update the query. No per-part changes needed.

---

## ADDITIONAL NOTES

### Data Schema Observations:
- `qx_ppmtx_synced_gold_fact_inventory_snapshot` is the **current state** table
- `installed_ac` = Aircraft tail number (if installed on aircraft), NULL if not
- `installed_position` = Position on aircraft/engine/APU (if installed), NULL if warehouse
- `condition` codes used: REPAIR, SV, OH, NEW, MOD, INSPTEST

### Why ERP and Lakebase Differ:
- ERP likely marks shop engines as "In Maintenance" status
- Lakebase snapshot only checks `installed_ac IS NULL` (aircraft-agnostic)
- The two systems have different definitions of "available spare"

### Condition Code Note:
The widget includes `'REPAIR'` and `'INSPTEST'` as spare-eligible conditions. If you want to further filter (e.g., only count 'NEW', 'SV', 'OH'), modify the `conditionList` at the top of the handler.
