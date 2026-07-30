"""
Rewrite all dashboard SQL to use actual Gold fact+dimension tables
instead of non-existent metric views.
"""
import json, os, glob

DASH_DIR = os.path.join(os.path.dirname(__file__), '..', 'docs', 'dashboards')
P = '${catalog}.${gold_schema}'  # shorthand for fully qualified prefix

# --- SQL REWRITES PER DASHBOARD ---
# Each entry: dataset_name -> new queryLines (each element MUST end with \n)

PROPULSION = {
    "ds_reliability_kpis": [
        "SELECT\n",
        "  COUNT(*) AS removal_count,\n",
        "  AVG(f.hours_installed) AS avg_hours_at_removal,\n",
        "  AVG(f.cycles_installed) AS avg_cycles_at_removal,\n",
        "  COUNT(CASE WHEN f.schedule_category = 'Unscheduled' THEN 1 END) AS unscheduled_count\n",
        f"FROM {P}.qx_ppmtx_gold_fact_component_removal f\n",
        f"JOIN {P}.qx_ppmtx_gold_dim_date d ON f.transaction_date_key = d.dim_date_key\n",
        "WHERE d.calendar_date BETWEEN DATE_ADD(current_date(), -365) AND current_date()\n",
    ],
    "ds_removal_trend_weekly": [
        "SELECT\n",
        "  DATE_TRUNC('WEEK', d.calendar_date) AS week_start,\n",
        "  COUNT(*) AS removal_count,\n",
        "  COUNT(CASE WHEN f.schedule_category = 'Unscheduled' THEN 1 END) AS unscheduled_count,\n",
        "  COUNT(CASE WHEN f.schedule_category = 'Scheduled' THEN 1 END) AS scheduled_count\n",
        f"FROM {P}.qx_ppmtx_gold_fact_component_removal f\n",
        f"JOIN {P}.qx_ppmtx_gold_dim_date d ON f.transaction_date_key = d.dim_date_key\n",
        "WHERE d.calendar_date BETWEEN DATE_ADD(current_date(), -365) AND current_date()\n",
        "GROUP BY DATE_TRUNC('WEEK', d.calendar_date)\n",
        "ORDER BY week_start\n",
    ],
    "ds_mtbur_by_part": [
        "SELECT\n",
        "  p.pn,\n",
        "  COALESCE(p.pn_description, p.pn) AS part_name,\n",
        "  AVG(f.hours_installed) AS mtbur_hours,\n",
        "  COUNT(*) AS removal_count\n",
        f"FROM {P}.qx_ppmtx_gold_fact_component_removal f\n",
        f"JOIN {P}.qx_ppmtx_gold_dim_part p ON f.dim_part_key = p.dim_part_key\n",
        f"JOIN {P}.qx_ppmtx_gold_dim_date d ON f.transaction_date_key = d.dim_date_key\n",
        "WHERE d.calendar_date BETWEEN DATE_ADD(current_date(), -365) AND current_date()\n",
        "  AND p.pn IS NOT NULL\n",
        "GROUP BY p.pn, p.pn_description\n",
        "ORDER BY mtbur_hours ASC\n",
        "LIMIT 15\n",
    ],
    "ds_removals_by_ata": [
        "SELECT\n",
        "  c.chapter_description,\n",
        "  COUNT(*) AS removal_count,\n",
        "  COUNT(CASE WHEN f.schedule_category = 'Unscheduled' THEN 1 END) AS unscheduled_count\n",
        f"FROM {P}.qx_ppmtx_gold_fact_component_removal f\n",
        f"JOIN {P}.qx_ppmtx_gold_dim_ata_chapter c ON f.dim_ata_chapter_key = c.dim_ata_chapter_key\n",
        f"JOIN {P}.qx_ppmtx_gold_dim_date d ON f.transaction_date_key = d.dim_date_key\n",
        "WHERE d.calendar_date BETWEEN DATE_ADD(current_date(), -365) AND current_date()\n",
        "  AND c.chapter_description IS NOT NULL\n",
        "GROUP BY c.chapter_description\n",
        "ORDER BY removal_count DESC\n",
        "LIMIT 10\n",
    ],
    "ds_removals_by_station": [
        "SELECT\n",
        "  COALESCE(s.station_name, s.station_code) AS station,\n",
        "  COUNT(*) AS removal_count\n",
        f"FROM {P}.qx_ppmtx_gold_fact_component_removal f\n",
        f"JOIN {P}.qx_ppmtx_gold_dim_station s ON f.dim_station_key = s.dim_station_key\n",
        f"JOIN {P}.qx_ppmtx_gold_dim_date d ON f.transaction_date_key = d.dim_date_key\n",
        "WHERE d.calendar_date BETWEEN DATE_ADD(current_date(), -365) AND current_date()\n",
        "  AND s.station_code IS NOT NULL\n",
        "GROUP BY s.station_name, s.station_code\n",
        "ORDER BY removal_count DESC\n",
    ],
    "ds_sched_unsched_trend": [
        "SELECT\n",
        "  DATE_TRUNC('MONTH', d.calendar_date) AS month_start,\n",
        "  f.schedule_category,\n",
        "  COUNT(*) AS removal_count\n",
        f"FROM {P}.qx_ppmtx_gold_fact_component_removal f\n",
        f"JOIN {P}.qx_ppmtx_gold_dim_date d ON f.transaction_date_key = d.dim_date_key\n",
        "WHERE d.calendar_date BETWEEN DATE_ADD(current_date(), -365) AND current_date()\n",
        "  AND f.schedule_category IS NOT NULL\n",
        "GROUP BY DATE_TRUNC('MONTH', d.calendar_date), f.schedule_category\n",
        "ORDER BY month_start\n",
    ],
    "ds_reason_breakdown": [
        "SELECT\n",
        "  COALESCE(f.reason_category, 'Unknown') AS reason_category,\n",
        "  COUNT(*) AS removal_count\n",
        f"FROM {P}.qx_ppmtx_gold_fact_component_removal f\n",
        f"JOIN {P}.qx_ppmtx_gold_dim_date d ON f.transaction_date_key = d.dim_date_key\n",
        "WHERE d.calendar_date BETWEEN DATE_ADD(current_date(), -365) AND current_date()\n",
        "GROUP BY f.reason_category\n",
    ],
}

DEFECT = {
    "ds_defect_kpis": [
        "SELECT\n",
        "  COUNT(*) AS total_defects,\n",
        "  COUNT(CASE WHEN f.delay = 'Y' THEN 1 END) AS delay_events,\n",
        "  COUNT(CASE WHEN f.cancellation = 'Y' THEN 1 END) AS cancellations,\n",
        "  COUNT(CASE WHEN f.i_f_s_d = 'Y' THEN 1 END) AS ifsds,\n",
        "  COALESCE(SUM(f.delays_hours), 0) AS total_delay_hours,\n",
        "  COUNT(CASE WHEN f.defer = 'Y' OR f.mel = 'Y' THEN 1 END) AS deferrals\n",
        f"FROM {P}.qx_ppmtx_gold_fact_defect f\n",
        f"JOIN {P}.qx_ppmtx_gold_dim_date d ON f.reported_date_key = d.dim_date_key\n",
        "WHERE d.calendar_date BETWEEN DATE_ADD(current_date(), -365) AND current_date()\n",
    ],
    "ds_defect_trend_weekly": [
        "SELECT\n",
        "  DATE_TRUNC('WEEK', d.calendar_date) AS week_start,\n",
        "  COUNT(*) AS defect_count,\n",
        "  COUNT(CASE WHEN f.delay = 'Y' THEN 1 END) AS delay_events\n",
        f"FROM {P}.qx_ppmtx_gold_fact_defect f\n",
        f"JOIN {P}.qx_ppmtx_gold_dim_date d ON f.reported_date_key = d.dim_date_key\n",
        "WHERE d.calendar_date BETWEEN DATE_ADD(current_date(), -365) AND current_date()\n",
        "GROUP BY DATE_TRUNC('WEEK', d.calendar_date)\n",
        "ORDER BY week_start\n",
    ],
    "ds_top_ata_by_delays": [
        "SELECT\n",
        "  c.chapter_description,\n",
        "  COALESCE(SUM(f.delay_minutes), 0) AS delay_minutes\n",
        f"FROM {P}.qx_ppmtx_gold_fact_defect f\n",
        f"JOIN {P}.qx_ppmtx_gold_dim_ata_chapter c ON f.dim_ata_chapter_key = c.dim_ata_chapter_key\n",
        f"JOIN {P}.qx_ppmtx_gold_dim_date d ON f.reported_date_key = d.dim_date_key\n",
        "WHERE d.calendar_date BETWEEN DATE_ADD(current_date(), -365) AND current_date()\n",
        "  AND c.chapter_description IS NOT NULL\n",
        "GROUP BY c.chapter_description\n",
        "ORDER BY delay_minutes DESC\n",
        "LIMIT 10\n",
    ],
    "ds_cancellation_trend": [
        "SELECT\n",
        "  DATE_TRUNC('MONTH', d.calendar_date) AS month_start,\n",
        "  COUNT(CASE WHEN f.cancellation = 'Y' THEN 1 END) AS cancellation_count\n",
        f"FROM {P}.qx_ppmtx_gold_fact_defect f\n",
        f"JOIN {P}.qx_ppmtx_gold_dim_date d ON f.reported_date_key = d.dim_date_key\n",
        "WHERE d.calendar_date BETWEEN DATE_ADD(current_date(), -365) AND current_date()\n",
        "GROUP BY DATE_TRUNC('MONTH', d.calendar_date)\n",
        "ORDER BY month_start\n",
    ],
    "ds_deferral_analysis": [
        "SELECT\n",
        "  CASE\n",
        "    WHEN f.mel = 'Y' THEN 'MEL Deferral'\n",
        "    WHEN f.defer = 'Y' THEN 'Non-MEL Deferral'\n",
        "    ELSE 'No Deferral'\n",
        "  END AS deferral_type,\n",
        "  f.status,\n",
        "  COUNT(*) AS defect_count\n",
        f"FROM {P}.qx_ppmtx_gold_fact_defect f\n",
        f"JOIN {P}.qx_ppmtx_gold_dim_date d ON f.reported_date_key = d.dim_date_key\n",
        "WHERE d.calendar_date BETWEEN DATE_ADD(current_date(), -365) AND current_date()\n",
        "GROUP BY\n",
        "  CASE WHEN f.mel = 'Y' THEN 'MEL Deferral' WHEN f.defer = 'Y' THEN 'Non-MEL Deferral' ELSE 'No Deferral' END,\n",
        "  f.status\n",
        "ORDER BY defect_count DESC\n",
    ],
}

EXECUTIVE = {
    "ds_defect_kpis": [
        "SELECT\n",
        "  COUNT(*) AS total_defects,\n",
        "  COALESCE(SUM(f.delays_hours), 0) AS total_delay_hours,\n",
        "  COUNT(CASE WHEN f.cancellation = 'Y' THEN 1 END) AS cancellations,\n",
        "  COUNT(CASE WHEN f.i_f_s_d = 'Y' THEN 1 END) AS ifsds\n",
        f"FROM {P}.qx_ppmtx_gold_fact_defect f\n",
        f"JOIN {P}.qx_ppmtx_gold_dim_date d ON f.reported_date_key = d.dim_date_key\n",
        "WHERE d.calendar_date BETWEEN DATE_ADD(current_date(), -365) AND current_date()\n",
    ],
    "ds_mtbur_kpi": [
        "SELECT\n",
        "  AVG(f.hours_installed) AS fleet_mtbur\n",
        f"FROM {P}.qx_ppmtx_gold_fact_component_removal f\n",
        f"JOIN {P}.qx_ppmtx_gold_dim_date d ON f.transaction_date_key = d.dim_date_key\n",
        "WHERE d.calendar_date BETWEEN DATE_ADD(current_date(), -365) AND current_date()\n",
        "  AND f.hours_installed IS NOT NULL\n",
    ],
    "ds_top_ata_delays": [
        "SELECT\n",
        "  c.chapter_description,\n",
        "  COALESCE(SUM(f.delay_minutes), 0) AS delay_minutes\n",
        f"FROM {P}.qx_ppmtx_gold_fact_defect f\n",
        f"JOIN {P}.qx_ppmtx_gold_dim_ata_chapter c ON f.dim_ata_chapter_key = c.dim_ata_chapter_key\n",
        f"JOIN {P}.qx_ppmtx_gold_dim_date d ON f.reported_date_key = d.dim_date_key\n",
        "WHERE d.calendar_date BETWEEN DATE_ADD(current_date(), -365) AND current_date()\n",
        "  AND c.chapter_description IS NOT NULL\n",
        "GROUP BY c.chapter_description\n",
        "ORDER BY delay_minutes DESC\n",
        "LIMIT 10\n",
    ],
    "ds_defect_trend_weekly": [
        "SELECT\n",
        "  DATE_TRUNC('WEEK', d.calendar_date) AS week_start,\n",
        "  COUNT(*) AS defect_count\n",
        f"FROM {P}.qx_ppmtx_gold_fact_defect f\n",
        f"JOIN {P}.qx_ppmtx_gold_dim_date d ON f.reported_date_key = d.dim_date_key\n",
        "WHERE d.calendar_date BETWEEN DATE_ADD(current_date(), -365) AND current_date()\n",
        "GROUP BY DATE_TRUNC('WEEK', d.calendar_date)\n",
        "ORDER BY week_start\n",
    ],
    "ds_inventory_health": [
        "SELECT\n",
        "  COUNT(CASE WHEN s.condition = 'SVC' THEN 1 END) * 1.0 / NULLIF(COUNT(*), 0) AS serviceable_ratio,\n",
        "  COUNT(CASE WHEN s.condition = 'AOG' THEN 1 END) AS aog_count,\n",
        "  COUNT(*) AS total_instances\n",
        f"FROM {P}.qx_ppmtx_gold_fact_inventory_snapshot s\n",
    ],
}

INVENTORY = {
    "ds_inventory_kpis": [
        "SELECT\n",
        "  COUNT(*) AS total_instances,\n",
        "  COUNT(CASE WHEN s.condition = 'SVC' THEN 1 END) AS serviceable_count,\n",
        "  COUNT(CASE WHEN s.condition = 'AOG' THEN 1 END) AS aog_count,\n",
        "  COALESCE(SUM(s.unit_cost), 0) AS total_value\n",
        f"FROM {P}.qx_ppmtx_gold_fact_inventory_snapshot s\n",
    ],
    "ds_spare_by_station": [
        "SELECT\n",
        "  COALESCE(st.station_name, st.station_code) AS station,\n",
        "  s.condition,\n",
        "  COUNT(*) AS instance_count\n",
        f"FROM {P}.qx_ppmtx_gold_fact_inventory_snapshot s\n",
        f"JOIN {P}.qx_ppmtx_gold_dim_station st ON s.dim_station_key = st.dim_station_key\n",
        "WHERE st.station_code IS NOT NULL\n",
        "  AND s.condition IS NOT NULL\n",
        "GROUP BY st.station_name, st.station_code, s.condition\n",
        "ORDER BY instance_count DESC\n",
    ],
    "ds_condition_distribution": [
        "SELECT\n",
        "  COALESCE(s.condition, 'Unknown') AS condition,\n",
        "  COUNT(*) AS instance_count\n",
        f"FROM {P}.qx_ppmtx_gold_fact_inventory_snapshot s\n",
        "GROUP BY s.condition\n",
    ],
}

PROCUREMENT = {
    "ds_procurement_kpis": [
        "SELECT\n",
        "  COUNT(CASE WHEN o.status = 'Open' THEN 1 END) AS open_orders,\n",
        "  COALESCE(SUM(o.exchange_repair_cost), 0) AS total_repair_cost,\n",
        "  AVG(o.lead_time) AS avg_lead_time,\n",
        "  COALESCE(SUM(o.qty_received) * 1.0 / NULLIF(SUM(o.qty_require), 0), 0) AS fulfillment_rate\n",
        f"FROM {P}.qx_ppmtx_gold_fact_order o\n",
        f"JOIN {P}.qx_ppmtx_gold_dim_date d ON o.order_date_key = d.dim_date_key\n",
        "WHERE d.calendar_date BETWEEN DATE_ADD(current_date(), -365) AND current_date()\n",
    ],
    "ds_order_status_by_type": [
        "SELECT\n",
        "  o.order_type,\n",
        "  o.status,\n",
        "  COUNT(*) AS order_count\n",
        f"FROM {P}.qx_ppmtx_gold_fact_order o\n",
        f"JOIN {P}.qx_ppmtx_gold_dim_date d ON o.order_date_key = d.dim_date_key\n",
        "WHERE d.calendar_date BETWEEN DATE_ADD(current_date(), -365) AND current_date()\n",
        "  AND o.order_type IS NOT NULL\n",
        "  AND o.status IS NOT NULL\n",
        "GROUP BY o.order_type, o.status\n",
        "ORDER BY order_count DESC\n",
    ],
}

# Map dashboard filename -> rewrites
DASHBOARD_REWRITES = {
    "propulsion_reliability_dashboard.lvdash.json": PROPULSION,
    "defect_intelligence_dashboard.lvdash.json": DEFECT,
    "executive_reliability_dashboard.lvdash.json": EXECUTIVE,
    "inventory_spares_dashboard.lvdash.json": INVENTORY,
    "procurement_overhaul_dashboard.lvdash.json": PROCUREMENT,
}


def apply_rewrites():
    total_fixed = 0
    for fname, rewrites in DASHBOARD_REWRITES.items():
        fpath = os.path.join(DASH_DIR, fname)
        with open(fpath, 'r') as f:
            dash = json.load(f)

        ds_fixed = 0
        for ds in dash['datasets']:
            if ds['name'] in rewrites:
                ds['queryLines'] = rewrites[ds['name']]
                ds_fixed += 1

        with open(fpath, 'w') as f:
            json.dump(dash, f, indent=2)
            f.write('\n')

        print(f"Fixed {ds_fixed}/{len(rewrites)} datasets in {fname}")
        if ds_fixed != len(rewrites):
            missing = set(rewrites.keys()) - {ds['name'] for ds in dash['datasets']}
            print(f"  WARNING: missing datasets: {missing}")
        total_fixed += ds_fixed

    print(f"\nDone. Rewrote {total_fixed} datasets across {len(DASHBOARD_REWRITES)} dashboards.")

    # Verify no metric view references remain
    print("\n--- Verification: checking for remaining metric view references ---")
    metric_views = [
        'component_lifecycle_analytics_metrics',
        'defect_intelligence_analytics_metrics',
        'inventory_spares_analytics_metrics',
        'procurement_overhaul_analytics_metrics',
    ]
    clean = True
    for fname in DASHBOARD_REWRITES:
        fpath = os.path.join(DASH_DIR, fname)
        with open(fpath, 'r') as f:
            content = f.read()
        for mv in metric_views:
            if mv in content:
                print(f"  FAIL: {fname} still references {mv}")
                clean = False
    if clean:
        print("  ALL CLEAN - no metric view references remain.")

    # Verify no MEASURE() references remain
    print("\n--- Verification: checking for remaining MEASURE() references ---")
    measure_clean = True
    for fname in DASHBOARD_REWRITES:
        fpath = os.path.join(DASH_DIR, fname)
        with open(fpath, 'r') as f:
            content = f.read()
        if 'MEASURE(' in content:
            print(f"  FAIL: {fname} still has MEASURE() calls")
            measure_clean = False
    if measure_clean:
        print("  ALL CLEAN - no MEASURE() calls remain.")


if __name__ == '__main__':
    apply_rewrites()
