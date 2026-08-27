# Spare Parts Count Analysis: ENG SCV PN 4120T05P04

## EXACT CRITERIA FOR SPARE PARTS DISPLAY

The **Critical Spares Quick View widget** uses this exact SQL logic to count spares:

```sql
SELECT p.pn, COUNT(DISTINCT s.sn)::int AS spare_count
FROM qx_ppmtx_synced_gold_fact_inventory_snapshot s
JOIN qx_ppmtx_synced_gold_dim_part p ON s.dim_part_key = p.dim_part_key
WHERE p.pn IN ('4120T05P04', ...) 
  AND s.installed_ac IS NULL              -- NOT installed on an aircraft
  AND s.condition IN (
    'REPAIR', 'SV', 'OH', 'NEW', 'MOD', 'INSPTEST'
  )                                       -- In serviceable/repairable condition
GROUP BY p.pn
```

### Spare Parts Count Requirements (ALL must be true):
1. **Part Number** = 4120T05P04 (ENG SCV)
2. **installed_ac IS NULL** → Part is NOT currently installed on any aircraft
3. **condition** IN ('REPAIR', 'SV', 'OH', 'NEW', 'MOD', 'INSPTEST') → Serviceable condition
4. **DISTINCT sn count** → Counted by serial number (one unit per SN)

---

## WHY YOU HAVE 6 IN APP BUT ONLY 2 IN ERP

Based on your data and hypothesis, here are the most likely causes:

### ✅ CONFIRMED HYPOTHESIS: Shop Engines Not Attached to Aircraft

**This is very likely the primary culprit:**

- An engine installed on a **shop engine** (not attached to any aircraft) will have:
  - `installed_ac = NULL` (because it's not on an active A/C)
  - `condition = 'REPAIR'` or `'INSPTEST'` (it's being worked on)
  - Therefore it **COUNTS AS A SPARE** in the widget logic
  
- However, in your ERP system, it's likely tracked as:
  - **"In Maintenance/Repair"** status (not counted as spare)
  - OR associated with the "shop" as a location
  - Therefore **NOT counted as spare** in the ERP

### 🔍 OTHER POSSIBLE CAUSES:

1. **Engine Shop vs. Warehouse Location Confusion**
   - Parts at "ENG Shop" bin might show `installed_ac = NULL` even though they're not available for immediate deployment
   - The app doesn't distinguish between warehouse and shop locations

2. **Condition Code Discrepancy**
   - Parts marked as `'INSPTEST'` (Inspected & Tested) in Databricks are counted as spares
   - Your ERP might count these as "In Process" instead of "Spare"

3. **Duplicate Serial Numbers**
   - If the same SN appears multiple times in `qx_ppmtx_synced_gold_fact_inventory_snapshot` with different conditions or locations
   - The SQL uses `COUNT(DISTINCT s.sn)`, so duplicates per condition are deduplicated, but...
   - If a part has multiple SNs in snapshot, all are counted

4. **Data Sync Lag**
   - The snapshot table might include historical records not yet removed
   - Lakebase might not have the latest disposition from ERP

---

## DIAGNOSTIC QUERIES TO RUN

To find the discrepancy for 4120T05P04, run these:

### 1. **What spares is the app counting?**
```sql
SELECT s.sn, s.condition, s.installed_ac, s.installed_position, MAX(s.station_code)
FROM an_maintenanceengineering_ods.qx_ppmtx_synced_gold_fact_inventory_snapshot s
JOIN an_maintenanceengineering_ods.qx_ppmtx_synced_gold_dim_part p 
  ON s.dim_part_key = p.dim_part_key
WHERE p.pn = '4120T05P04'
  AND s.installed_ac IS NULL
  AND s.condition IN ('REPAIR', 'SV', 'OH', 'NEW', 'MOD', 'INSPTEST')
GROUP BY s.sn, s.condition, s.installed_ac, s.installed_position
ORDER BY s.sn;
```

### 2. **What does ERP show as spare for 4120T05P04?**
```sql
-- Query your source ERP tables to compare
-- This depends on your ERP schema, but likely:
SELECT serial_number, status, location, condition
FROM your_erp_spares_table
WHERE part_number = '4120T05P04'
  AND status = 'SPARE'  -- or 'AVAILABLE' depending on your ERP
ORDER BY serial_number;
```

### 3. **Which SNs are in shop engines?**
```sql
-- Check if the 4 "extra" units are associated with shop engines
SELECT 
  s.sn, 
  s.condition,
  s.installed_position,
  ic.sn AS engine_sn  -- If installed on an engine
FROM an_maintenanceengineering_ods.qx_ppmtx_synced_gold_fact_inventory_snapshot s
LEFT JOIN an_maintenanceengineering_ods.qx_ppmtx_synced_gold_fact_inventory_control ic
  ON s.sn = ic.sn
JOIN an_maintenanceengineering_ods.qx_ppmtx_synced_gold_dim_part p 
  ON s.dim_part_key = p.dim_part_key
WHERE p.pn = '4120T05P04'
  AND s.installed_ac IS NULL
  AND s.condition IN ('REPAIR', 'SV', 'OH', 'NEW', 'MOD', 'INSPTEST');
```

---

## THE FIX

To correct the spare count display, you have 3 options:

### **Option A: Exclude Shop Engines** (Recommended if shop engines shouldn't count as spares)
```typescript
// In server.ts, modify the /api/critical-spares endpoint:
const result = await executeQuery(
  req,
  appkit,
  `SELECT p.pn, COUNT(DISTINCT s.sn)::int AS spare_count
   FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_snapshot s
   JOIN ${S}.qx_ppmtx_synced_gold_dim_part p ON s.dim_part_key = p.dim_part_key
   WHERE p.pn IN (${pnList})
     AND s.installed_ac IS NULL
     AND s.condition IN (${conditionList})
     -- EXCLUDE parts installed on shop engines:
     AND NOT EXISTS (
       SELECT 1 FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_control ic
       WHERE ic.sn = s.sn 
         AND ic.control = 'INSTALLED'  -- or your shop engine designation
     )
   GROUP BY p.pn`,
);
```

### **Option B: Use Station/Location Filter**
```typescript
// Only count parts in warehouse locations, not shop
AND s.station_code NOT LIKE '%SHOP%'
AND s.station_code NOT LIKE '%ENGINE%'
```

### **Option C: Align ERP Data in Lakebase**
- Ensure ERP sync only sends parts with `status='SPARE'` and `location='WAREHOUSE'` to the snapshot table
- Filter at the source (bronze/silver layer) rather than at query time

---

## SUMMARY TABLE

| Criteria | Current Logic | Your Suggestion | Our Recommendation |
|----------|--|--|--|
| **Not installed on A/C** | `installed_ac IS NULL` | ✓ Keep | ✓ Keep |
| **Serviceable condition** | `condition IN (REPAIR, SV, OH, NEW, MOD, INSPTEST)` | ✓ (but REPAIR is odd for spare?) | Consider renaming or scoping |
| **Not in shop engine** | ❌ NOT checked | ✓ **This is your missing filter** | **Add this** |
| **In warehouse location** | ❌ NOT checked | ⚠️ Maybe | Consider adding |

---

## NEXT STEPS

1. **Run diagnostic query #1** above to see which 6 SNs are showing up
2. **Check if 4 of them are marked as installed on shop engines** in your data
3. **Confirm with your ERP** whether those should count as "spare"
4. **Apply Option A** (exclude shop engines) if confirmed
5. **Repeat for other parts** with discrepancies
