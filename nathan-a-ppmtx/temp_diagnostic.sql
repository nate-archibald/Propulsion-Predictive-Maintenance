SELECT 
  s.sn,
  s.installed_ac,
  s.installed_position,
  s.condition,
  p.pn
FROM an_maintenanceengineering_ods.qx_ppmtx_synced_gold_fact_inventory_snapshot s
JOIN an_maintenanceengineering_ods.qx_ppmtx_synced_gold_dim_part p ON s.dim_part_key = p.dim_part_key
WHERE p.pn = '4120T05P04'
  AND s.installed_ac IS NULL
  AND s.condition IN ('REPAIR', 'SV', 'OH', 'NEW', 'MOD', 'INSPTEST')
ORDER BY s.installed_position, s.sn;
