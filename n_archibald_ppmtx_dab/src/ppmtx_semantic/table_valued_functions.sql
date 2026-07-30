-- =============================================================================
-- QX Predictive Maintenance — Table-Valued Functions (TVFs)
-- =============================================================================
-- Deploy via: notebook_task using create_tvfs.py (string substitution for ${catalog}/${gold_schema})
-- All TVFs query propulsion-scoped views (vw_prop_*) which pre-filter to ATA 49/70-80
-- Non-negotiable: STRING date params, v3.0 bullet COMMENTs, ROW_NUMBER for Top-N
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. get_component_removal_history
-- Domain: Component Lifecycle & Reliability
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ${catalog}.${gold_schema}.get_component_removal_history(
  part_number STRING COMMENT 'Part number to filter (exact match or NULL for all)',
  start_date STRING COMMENT 'Start date filter. Format: YYYY-MM-DD',
  end_date STRING COMMENT 'End date filter. Format: YYYY-MM-DD',
  station_code STRING COMMENT 'Station code filter (e.g., PDX) or NULL for all'
)
RETURNS TABLE (
  transaction STRING COMMENT 'Transaction number from TRAX',
  transaction_item DECIMAL COMMENT 'Transaction line item',
  transaction_type STRING COMMENT 'Removal (RMV) or Installation (INS)',
  pn STRING COMMENT 'Part number',
  pn_description STRING COMMENT 'Part description',
  sn STRING COMMENT 'Serial number',
  ac STRING COMMENT 'Aircraft tail number',
  station_code STRING COMMENT 'Station code',
  station_name STRING COMMENT 'Station name',
  chapter DECIMAL COMMENT 'ATA chapter',
  chapter_description STRING COMMENT 'ATA chapter description',
  transaction_date DATE COMMENT 'Date of removal/installation',
  hours_installed DECIMAL COMMENT 'Flight hours at removal (TSI)',
  cycles_installed DECIMAL COMMENT 'Flight cycles at removal (CSI)',
  days_installed DECIMAL COMMENT 'Calendar days installed',
  reason_category STRING COMMENT 'Removal reason',
  schedule_category STRING COMMENT 'Scheduled or Unscheduled',
  position STRING COMMENT 'Installation position (ENG1, ENG2, APU)',
  nha_pn STRING COMMENT 'Next Higher Assembly part number',
  nha_sn STRING COMMENT 'Next Higher Assembly serial number'
)
COMMENT '
• PURPOSE: Returns component removal and installation history for propulsion parts
• BEST FOR: "Show removals for part X" | "Removal history at PDX" | "What was removed from tail Y?"
• RETURNS: One row per removal/installation event with full part, aircraft, and station context
• PARAMS: part_number (NULL=all), start_date, end_date (YYYY-MM-DD), station_code (NULL=all)
• SYNTAX: SELECT * FROM get_component_removal_history(''337-100-305-0'', ''2024-01-01'', ''2025-12-31'', NULL)
'
RETURN
  SELECT
    f.transaction,
    f.transaction_item,
    f.transaction_type,
    p.pn,
    p.pn_description,
    f.sn,
    a.ac,
    s.station_code,
    s.station_name,
    c.chapter,
    c.chapter_description,
    d.calendar_date AS transaction_date,
    f.hours_installed,
    f.cycles_installed,
    f.days_installed,
    f.reason_category,
    f.schedule_category,
    f.position,
    f.nha_pn,
    f.nha_sn
  FROM ${catalog}.${gold_schema}.vw_prop_fact_component_removal f
  LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_part p ON f.dim_part_key = p.dim_part_key
  LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_aircraft a ON f.dim_aircraft_key = a.dim_aircraft_key
  LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_station s ON f.dim_station_key = s.dim_station_key
  LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_ata_chapter c ON f.dim_ata_chapter_key = c.dim_ata_chapter_key
  LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_date d ON f.transaction_date_key = d.dim_date_key
  WHERE (part_number IS NULL OR p.pn = part_number)
    AND d.calendar_date BETWEEN CAST(start_date AS DATE) AND CAST(end_date AS DATE)
    AND (station_code IS NULL OR s.station_code = station_code);

-- ---------------------------------------------------------------------------
-- 2. get_mtbur_analysis
-- Domain: Component Lifecycle & Reliability
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ${catalog}.${gold_schema}.get_mtbur_analysis(
  part_number STRING COMMENT 'Part number for MTBUR calculation (NULL for all)',
  lookback_months STRING COMMENT 'Number of months to look back (e.g., 24)',
  schedule_filter STRING COMMENT 'Filter: UNSCHEDULED, SCHEDULED, or ALL'
)
RETURNS TABLE (
  pn STRING COMMENT 'Part number',
  pn_description STRING COMMENT 'Part description',
  category STRING COMMENT 'Part category',
  total_removals BIGINT COMMENT 'Total removal count in period',
  avg_hours_at_removal DECIMAL COMMENT 'Average flight hours at removal',
  avg_cycles_at_removal DECIMAL COMMENT 'Average flight cycles at removal',
  mtbur_hours DECIMAL COMMENT 'Mean Time Between Unscheduled Removals (hours)',
  mtbur_cycles DECIMAL COMMENT 'Mean Time Between Unscheduled Removals (cycles)',
  min_hours DECIMAL COMMENT 'Minimum hours at removal',
  max_hours DECIMAL COMMENT 'Maximum hours at removal',
  stddev_hours DECIMAL COMMENT 'Standard deviation of hours at removal'
)
COMMENT '
• PURPOSE: Calculates Mean Time Between Unscheduled Removals (MTBUR) for propulsion components
• BEST FOR: "MTBUR for part X" | "Which parts have lowest MTBUR?" | "Reliability trending"
• RETURNS: One row per part number with MTBUR statistics (hours, cycles, count, stddev)
• PARAMS: part_number (NULL=all), lookback_months (STRING), schedule_filter (UNSCHEDULED/SCHEDULED/ALL)
• SYNTAX: SELECT * FROM get_mtbur_analysis(NULL, ''24'', ''UNSCHEDULED'')
'
RETURN
  SELECT
    p.pn,
    p.pn_description,
    p.category,
    COUNT(*) AS total_removals,
    AVG(f.hours_installed) AS avg_hours_at_removal,
    AVG(f.cycles_installed) AS avg_cycles_at_removal,
    SUM(f.hours_installed) / NULLIF(COUNT(*), 0) AS mtbur_hours,
    SUM(f.cycles_installed) / NULLIF(COUNT(*), 0) AS mtbur_cycles,
    MIN(f.hours_installed) AS min_hours,
    MAX(f.hours_installed) AS max_hours,
    STDDEV(f.hours_installed) AS stddev_hours
  FROM ${catalog}.${gold_schema}.vw_prop_fact_component_removal f
  LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_part p ON f.dim_part_key = p.dim_part_key
  LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_date d ON f.transaction_date_key = d.dim_date_key
  WHERE f.transaction_type = 'RMV'
    AND d.calendar_date >= ADD_MONTHS(CURRENT_DATE(), -CAST(lookback_months AS INT))
    AND (part_number IS NULL OR p.pn = part_number)
    AND (schedule_filter = 'ALL'
         OR (schedule_filter = 'UNSCHEDULED' AND f.schedule_category = 'Unscheduled')
         OR (schedule_filter = 'SCHEDULED' AND f.schedule_category = 'Scheduled'))
  GROUP BY p.pn, p.pn_description, p.category
  HAVING COUNT(*) > 0;

-- ---------------------------------------------------------------------------
-- 3. get_time_on_wing_distribution
-- Domain: Component Lifecycle & Reliability
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ${catalog}.${gold_schema}.get_time_on_wing_distribution(
  part_number STRING COMMENT 'Part number for distribution analysis',
  metric STRING COMMENT 'Metric: HOURS, CYCLES, or DAYS',
  bin_width STRING COMMENT 'Histogram bin width (e.g., 500 for hours, 100 for cycles)'
)
RETURNS TABLE (
  pn STRING COMMENT 'Part number',
  pn_description STRING COMMENT 'Part description',
  bin_start DECIMAL COMMENT 'Bin lower bound',
  bin_end DECIMAL COMMENT 'Bin upper bound',
  removal_count BIGINT COMMENT 'Number of removals in this bin',
  pct_of_total DECIMAL COMMENT 'Percentage of total removals'
)
COMMENT '
• PURPOSE: Returns time-on-wing distribution histogram for Weibull and infant mortality analysis
• BEST FOR: "Hours-at-failure distribution for part X" | "Cycles-at-removal pattern" | "Infant mortality check"
• RETURNS: Histogram bins with removal counts and percentage for a given part number
• PARAMS: part_number (required), metric (HOURS/CYCLES/DAYS), bin_width (e.g., 500)
• SYNTAX: SELECT * FROM get_time_on_wing_distribution(''337-100-305-0'', ''HOURS'', ''500'')
'
RETURN
  WITH base AS (
    SELECT
      p.pn,
      p.pn_description,
      CASE metric
        WHEN 'HOURS' THEN f.hours_installed
        WHEN 'CYCLES' THEN f.cycles_installed
        WHEN 'DAYS' THEN f.days_installed
      END AS metric_value
    FROM ${catalog}.${gold_schema}.vw_prop_fact_component_removal f
    LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_part p ON f.dim_part_key = p.dim_part_key
    WHERE f.transaction_type = 'RMV'
      AND p.pn = part_number
      AND CASE metric
            WHEN 'HOURS' THEN f.hours_installed
            WHEN 'CYCLES' THEN f.cycles_installed
            WHEN 'DAYS' THEN f.days_installed
          END IS NOT NULL
  ),
  binned AS (
    SELECT
      pn,
      pn_description,
      FLOOR(metric_value / CAST(bin_width AS DECIMAL)) * CAST(bin_width AS DECIMAL) AS bin_start,
      (FLOOR(metric_value / CAST(bin_width AS DECIMAL)) + 1) * CAST(bin_width AS DECIMAL) AS bin_end,
      COUNT(*) AS removal_count
    FROM base
    GROUP BY pn, pn_description,
             FLOOR(metric_value / CAST(bin_width AS DECIMAL)) * CAST(bin_width AS DECIMAL),
             (FLOOR(metric_value / CAST(bin_width AS DECIMAL)) + 1) * CAST(bin_width AS DECIMAL)
  )
  SELECT
    pn,
    pn_description,
    bin_start,
    bin_end,
    removal_count,
    ROUND(removal_count * 100.0 / NULLIF(SUM(removal_count) OVER(), 0), 2) AS pct_of_total
  FROM binned
  ORDER BY bin_start;

-- ---------------------------------------------------------------------------
-- 4. get_defect_trending_by_ata
-- Domain: Defect Intelligence
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ${catalog}.${gold_schema}.get_defect_trending_by_ata(
  ata_chapter STRING COMMENT 'ATA chapter to filter (e.g., 73) or NULL for all propulsion chapters',
  start_date STRING COMMENT 'Start date. Format: YYYY-MM-DD',
  end_date STRING COMMENT 'End date. Format: YYYY-MM-DD',
  granularity STRING COMMENT 'Time grouping: WEEK or MONTH'
)
RETURNS TABLE (
  period_start DATE COMMENT 'Period start date',
  chapter DECIMAL COMMENT 'ATA chapter',
  section DECIMAL COMMENT 'ATA section',
  chapter_description STRING COMMENT 'ATA chapter description',
  defect_count BIGINT COMMENT 'Total defects in period',
  delay_defect_count BIGINT COMMENT 'Defects causing delays',
  cancel_defect_count BIGINT COMMENT 'Defects causing cancellations',
  total_delay_minutes DECIMAL COMMENT 'Total delay minutes',
  ifsd_count BIGINT COMMENT 'In-Flight Shut Down events'
)
COMMENT '
• PURPOSE: Returns defect volume trending by ATA chapter and time period for hotspot detection
• BEST FOR: "ATA chapters trending up this month" | "ATA 73 defect trend weekly" | "IFSD trend"
• RETURNS: One row per period+ATA chapter with defect counts, delays, cancellations, IFSDs
• PARAMS: ata_chapter (NULL=all propulsion), start_date, end_date (YYYY-MM-DD), granularity (WEEK/MONTH)
• SYNTAX: SELECT * FROM get_defect_trending_by_ata(''73'', ''2025-01-01'', ''2025-06-30'', ''MONTH'')
'
RETURN
  SELECT
    CASE granularity
      WHEN 'WEEK' THEN DATE_TRUNC('WEEK', d.calendar_date)
      WHEN 'MONTH' THEN DATE_TRUNC('MONTH', d.calendar_date)
    END AS period_start,
    c.chapter,
    c.section,
    c.chapter_description,
    COUNT(*) AS defect_count,
    COUNT(CASE WHEN f.delay = 'Y' THEN 1 END) AS delay_defect_count,
    COUNT(CASE WHEN f.cancellation = 'Y' THEN 1 END) AS cancel_defect_count,
    SUM(COALESCE(f.delay_minutes, 0)) AS total_delay_minutes,
    COUNT(CASE WHEN f.i_f_s_d = 'Y' THEN 1 END) AS ifsd_count
  FROM ${catalog}.${gold_schema}.vw_prop_fact_defect f
  LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_ata_chapter c ON f.dim_ata_chapter_key = c.dim_ata_chapter_key
  LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_date d ON f.reported_date_key = d.dim_date_key
  WHERE d.calendar_date BETWEEN CAST(start_date AS DATE) AND CAST(end_date AS DATE)
    AND (ata_chapter IS NULL OR c.chapter = CAST(ata_chapter AS DECIMAL))
  GROUP BY
    CASE granularity
      WHEN 'WEEK' THEN DATE_TRUNC('WEEK', d.calendar_date)
      WHEN 'MONTH' THEN DATE_TRUNC('MONTH', d.calendar_date)
    END,
    c.chapter, c.section, c.chapter_description
  ORDER BY period_start, chapter;

-- ---------------------------------------------------------------------------
-- 5. get_operational_impact_summary
-- Domain: Defect Intelligence
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ${catalog}.${gold_schema}.get_operational_impact_summary(
  start_date STRING COMMENT 'Start date. Format: YYYY-MM-DD',
  end_date STRING COMMENT 'End date. Format: YYYY-MM-DD',
  group_by STRING COMMENT 'Grouping dimension: ATA, AIRCRAFT, or ALL',
  top_n STRING COMMENT 'Return top N results by delay minutes (e.g., 10)'
)
RETURNS TABLE (
  rank BIGINT COMMENT 'Rank by total delay minutes',
  group_key STRING COMMENT 'Group identifier (ATA chapter or tail number)',
  group_description STRING COMMENT 'Group description',
  total_defects BIGINT COMMENT 'Total defect count',
  delay_events BIGINT COMMENT 'Delay-causing events',
  cancel_events BIGINT COMMENT 'Cancellation events',
  total_delay_minutes DECIMAL COMMENT 'Total delay minutes',
  total_delay_hours DECIMAL COMMENT 'Total delay hours',
  ifsd_events BIGINT COMMENT 'In-Flight Shut Down events',
  mel_deferrals BIGINT COMMENT 'MEL deferral events'
)
COMMENT '
• PURPOSE: Summarizes operational impact (delays, cancellations, IFSDs) from propulsion defects
• BEST FOR: "Top 10 ATA by delay minutes" | "Cancellations this quarter" | "Worst performing tails"
• RETURNS: Ranked rows by total delay minutes with full operational impact breakdown
• PARAMS: start_date, end_date (YYYY-MM-DD), group_by (ATA/AIRCRAFT/ALL), top_n (STRING)
• SYNTAX: SELECT * FROM get_operational_impact_summary(''2025-01-01'', ''2025-06-30'', ''ATA'', ''10'')
'
RETURN
  WITH grouped AS (
    SELECT
      CASE group_by
        WHEN 'ATA' THEN CAST(c.chapter AS STRING)
        WHEN 'AIRCRAFT' THEN a.ac
        ELSE 'ALL'
      END AS group_key,
      CASE group_by
        WHEN 'ATA' THEN c.chapter_description
        WHEN 'AIRCRAFT' THEN a.aircraft_type
        ELSE 'All Propulsion'
      END AS group_description,
      COUNT(*) AS total_defects,
      COUNT(CASE WHEN f.delay = 'Y' THEN 1 END) AS delay_events,
      COUNT(CASE WHEN f.cancellation = 'Y' THEN 1 END) AS cancel_events,
      SUM(COALESCE(f.delay_minutes, 0)) AS total_delay_minutes,
      SUM(COALESCE(f.delays_hours, 0)) AS total_delay_hours,
      COUNT(CASE WHEN f.i_f_s_d = 'Y' THEN 1 END) AS ifsd_events,
      COUNT(CASE WHEN f.mel = 'Y' THEN 1 END) AS mel_deferrals
    FROM ${catalog}.${gold_schema}.vw_prop_fact_defect f
    LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_ata_chapter c ON f.dim_ata_chapter_key = c.dim_ata_chapter_key
    LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_aircraft a ON f.dim_aircraft_key = a.dim_aircraft_key
    LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_date d ON f.reported_date_key = d.dim_date_key
    WHERE d.calendar_date BETWEEN CAST(start_date AS DATE) AND CAST(end_date AS DATE)
    GROUP BY
      CASE group_by
        WHEN 'ATA' THEN CAST(c.chapter AS STRING)
        WHEN 'AIRCRAFT' THEN a.ac
        ELSE 'ALL'
      END,
      CASE group_by
        WHEN 'ATA' THEN c.chapter_description
        WHEN 'AIRCRAFT' THEN a.aircraft_type
        ELSE 'All Propulsion'
      END
  ),
  ranked AS (
    SELECT
      ROW_NUMBER() OVER (ORDER BY total_delay_minutes DESC) AS rank,
      group_key,
      group_description,
      total_defects,
      delay_events,
      cancel_events,
      total_delay_minutes,
      total_delay_hours,
      ifsd_events,
      mel_deferrals
    FROM grouped
  )
  SELECT * FROM ranked
  WHERE rank <= CAST(top_n AS INT);

-- ---------------------------------------------------------------------------
-- 6. get_defect_part_linkage
-- Domain: Defect Intelligence
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ${catalog}.${gold_schema}.get_defect_part_linkage(
  defect_id STRING COMMENT 'Defect number to trace (NULL to search by part)',
  part_number STRING COMMENT 'Part number to trace (NULL to search by defect)',
  start_date STRING COMMENT 'Start date. Format: YYYY-MM-DD',
  end_date STRING COMMENT 'End date. Format: YYYY-MM-DD'
)
RETURNS TABLE (
  defect_type STRING COMMENT 'Defect type (PIREP, MEL, etc.)',
  defect STRING COMMENT 'Defect number',
  defect_item DECIMAL COMMENT 'Defect item number',
  defect_description STRING COMMENT 'Defect description text',
  resolution_description STRING COMMENT 'Resolution/corrective action',
  pn STRING COMMENT 'Part number linked to defect',
  pn_description STRING COMMENT 'Part description',
  sn STRING COMMENT 'Serial number',
  qty DECIMAL COMMENT 'Quantity',
  fault_confirm STRING COMMENT 'Fault confirmed at teardown (Y/N)',
  shop_finding STRING COMMENT 'Shop finding description',
  work_done STRING COMMENT 'Work performed description',
  reported_date DATE COMMENT 'Defect reported date',
  ac STRING COMMENT 'Aircraft tail number'
)
COMMENT '
• PURPOSE: Traces end-to-end defect→part→shop-finding linkage (the join no legacy tool supports)
• BEST FOR: "Parts implicated in defect X" | "Defect history for part Y" | "Shop findings linked to PIREP"
• RETURNS: One row per defect-part linkage with full defect, part, and teardown context
• PARAMS: defect_id (NULL=search by part), part_number (NULL=search by defect), start_date, end_date
• SYNTAX: SELECT * FROM get_defect_part_linkage(''12345'', NULL, ''2024-01-01'', ''2025-12-31'')
'
RETURN
  SELECT
    f.defect_type,
    f.defect,
    f.defect_item,
    f.defect_description,
    f.resolution_description,
    p.pn,
    p.pn_description,
    t.sn,
    b.qty,
    t.fault_confirm,
    t.shop_finding,
    t.work_done,
    d.calendar_date AS reported_date,
    a.ac
  FROM ${catalog}.${gold_schema}.vw_prop_fact_defect f
  INNER JOIN ${catalog}.${gold_schema}.vw_prop_bridge_defect_part b
    ON f.defect_type = b.defect_type AND f.defect = b.defect AND f.defect_item = b.defect_item
  LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_part p ON b.dim_part_key = p.dim_part_key
  LEFT JOIN ${catalog}.${gold_schema}.vw_prop_fact_teardown t
    ON b.dim_part_key = t.dim_part_key AND b.defect_type = t.defect_type AND b.defect = t.defect AND b.defect_item = t.defect_item
  LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_aircraft a ON f.dim_aircraft_key = a.dim_aircraft_key
  LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_date d ON f.reported_date_key = d.dim_date_key
  WHERE d.calendar_date BETWEEN CAST(start_date AS DATE) AND CAST(end_date AS DATE)
    AND (defect_id IS NULL OR CAST(f.defect AS STRING) = defect_id)
    AND (part_number IS NULL OR p.pn = part_number);

-- ---------------------------------------------------------------------------
-- 7. get_spare_availability_by_station
-- Domain: Inventory & Spares
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ${catalog}.${gold_schema}.get_spare_availability_by_station(
  part_number STRING COMMENT 'Part number (NULL for all propulsion parts)',
  station STRING COMMENT 'Station code (NULL for all stations)',
  condition_filter STRING COMMENT 'Condition code (SVC, UNS, AOG, etc.) or NULL for all'
)
RETURNS TABLE (
  pn STRING COMMENT 'Part number',
  pn_description STRING COMMENT 'Part description',
  category STRING COMMENT 'Part category',
  station_code STRING COMMENT 'Station code',
  station_name STRING COMMENT 'Station name',
  condition STRING COMMENT 'Condition code',
  instance_count BIGINT COMMENT 'Number of instances',
  total_value DECIMAL COMMENT 'Total inventory value',
  currency STRING COMMENT 'Currency code'
)
COMMENT '
• PURPOSE: Returns spare inventory availability by station and condition for propulsion parts
• BEST FOR: "Serviceable spares of P/N X at PDX" | "Parts with fewer than 2 spares" | "AOG parts"
• RETURNS: One row per part/station/condition combination with counts and value
• PARAMS: part_number (NULL=all), station (NULL=all), condition_filter (NULL=all)
• SYNTAX: SELECT * FROM get_spare_availability_by_station(''337-100-305-0'', ''PDX'', ''SVC'')
'
RETURN
  SELECT
    p.pn,
    p.pn_description,
    p.category,
    s.station_code,
    s.station_name,
    f.condition,
    COUNT(*) AS instance_count,
    SUM(COALESCE(f.unit_cost, 0)) AS total_value,
    f.currency
  FROM ${catalog}.${gold_schema}.vw_prop_fact_inventory_snapshot f
  LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_part p ON f.dim_part_key = p.dim_part_key
  LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_station s ON f.dim_station_key = s.dim_station_key
  WHERE (part_number IS NULL OR p.pn = part_number)
    AND (station IS NULL OR s.station_code = station)
    AND (condition_filter IS NULL OR f.condition = condition_filter)
  GROUP BY p.pn, p.pn_description, p.category, s.station_code, s.station_name, f.condition, f.currency;

-- ---------------------------------------------------------------------------
-- 8. get_llp_redline_status
-- Domain: Inventory & Spares
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ${catalog}.${gold_schema}.get_llp_redline_status(
  remaining_cycles_threshold STRING COMMENT 'Alert threshold for remaining cycles (e.g., 1000)',
  remaining_hours_threshold STRING COMMENT 'Alert threshold for remaining hours (e.g., 2000)',
  control_type STRING COMMENT 'Control type filter (Hard Time, On Condition, TBO) or NULL for all'
)
RETURNS TABLE (
  pn STRING COMMENT 'Part number',
  pn_description STRING COMMENT 'Part description',
  sn STRING COMMENT 'Serial number',
  control STRING COMMENT 'Control type',
  schedule_hours DECIMAL COMMENT 'Scheduled limit hours',
  actual_hours DECIMAL COMMENT 'Actual hours accumulated',
  remaining_hours DECIMAL COMMENT 'Hours remaining to limit',
  schedule_cycles DECIMAL COMMENT 'Scheduled limit cycles',
  actual_cycles DECIMAL COMMENT 'Actual cycles accumulated',
  remaining_cycles DECIMAL COMMENT 'Cycles remaining to limit',
  schedule_days DECIMAL COMMENT 'Scheduled limit days',
  actual_days DECIMAL COMMENT 'Actual days accumulated',
  remaining_days DECIMAL COMMENT 'Days remaining to limit',
  urgency_rank BIGINT COMMENT 'Urgency rank (1=most urgent)'
)
COMMENT '
• PURPOSE: Returns LLP red-line status for controlled propulsion components ranked by urgency
• BEST FOR: "LLPs with fewer than 1000 cycles remaining" | "Fleet scan near hard limit" | "Parts due soon"
• RETURNS: One row per controlled part instance with remaining life and urgency ranking
• PARAMS: remaining_cycles_threshold, remaining_hours_threshold (STRING), control_type (NULL=all)
• SYNTAX: SELECT * FROM get_llp_redline_status(''1000'', ''2000'', NULL)
'
RETURN
  WITH redline AS (
    SELECT
      p.pn,
      p.pn_description,
      f.sn,
      f.control,
      f.schedule_hours,
      f.actual_hours,
      f.schedule_hours - f.actual_hours AS remaining_hours,
      f.schedule_cycles,
      f.actual_cycles,
      f.schedule_cycles - f.actual_cycles AS remaining_cycles,
      f.schedule_days,
      f.actual_days,
      f.schedule_days - f.actual_days AS remaining_days
    FROM ${catalog}.${gold_schema}.vw_prop_fact_inventory_control f
    LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_part p ON f.dim_part_key = p.dim_part_key
    WHERE (control_type IS NULL OR f.control = control_type)
  ),
  filtered AS (
    SELECT *
    FROM redline
    WHERE (remaining_cycles IS NOT NULL AND remaining_cycles <= CAST(remaining_cycles_threshold AS DECIMAL))
       OR (remaining_hours IS NOT NULL AND remaining_hours <= CAST(remaining_hours_threshold AS DECIMAL))
  )
  SELECT
    pn, pn_description, sn, control,
    schedule_hours, actual_hours, remaining_hours,
    schedule_cycles, actual_cycles, remaining_cycles,
    schedule_days, actual_days, remaining_days,
    ROW_NUMBER() OVER (ORDER BY COALESCE(remaining_cycles, 999999), COALESCE(remaining_hours, 999999)) AS urgency_rank
  FROM filtered;

-- ---------------------------------------------------------------------------
-- 9. get_inventory_movement_velocity
-- Domain: Inventory & Spares
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ${catalog}.${gold_schema}.get_inventory_movement_velocity(
  part_number STRING COMMENT 'Part number (NULL for all propulsion parts)',
  station STRING COMMENT 'Station code (NULL for all)',
  start_date STRING COMMENT 'Start date. Format: YYYY-MM-DD',
  end_date STRING COMMENT 'End date. Format: YYYY-MM-DD',
  transaction_type_filter STRING COMMENT 'Transaction type filter or NULL for all'
)
RETURNS TABLE (
  pn STRING COMMENT 'Part number',
  pn_description STRING COMMENT 'Part description',
  station_code STRING COMMENT 'Station code',
  transaction_type STRING COMMENT 'Transaction type',
  period_month DATE COMMENT 'Month period start',
  movement_count BIGINT COMMENT 'Number of transactions',
  total_qty DECIMAL COMMENT 'Total quantity moved'
)
COMMENT '
• PURPOSE: Returns inventory movement velocity by part, station, and transaction type
• BEST FOR: "Removal velocity for rotables" | "Top P/Ns by transaction volume" | "Movement trend"
• RETURNS: One row per part/station/type/month with movement counts and quantities
• PARAMS: part_number (NULL=all), station (NULL=all), start_date, end_date, transaction_type_filter (NULL=all)
• SYNTAX: SELECT * FROM get_inventory_movement_velocity(NULL, ''PDX'', ''2025-01-01'', ''2025-06-30'', NULL)
'
RETURN
  SELECT
    p.pn,
    p.pn_description,
    s.station_code,
    f.transaction_type,
    DATE_TRUNC('MONTH', d.calendar_date) AS period_month,
    COUNT(*) AS movement_count,
    SUM(COALESCE(f.qty, 0)) AS total_qty
  FROM ${catalog}.${gold_schema}.vw_prop_fact_inventory_transaction f
  LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_part p ON f.dim_part_key = p.dim_part_key
  LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_station s ON f.dim_station_key = s.dim_station_key
  LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_date d ON f.transaction_date_key = d.dim_date_key
  WHERE d.calendar_date BETWEEN CAST(start_date AS DATE) AND CAST(end_date AS DATE)
    AND (part_number IS NULL OR p.pn = part_number)
    AND (station IS NULL OR s.station_code = station)
    AND (transaction_type_filter IS NULL OR f.transaction_type = transaction_type_filter)
  GROUP BY p.pn, p.pn_description, s.station_code, f.transaction_type, DATE_TRUNC('MONTH', d.calendar_date)
  ORDER BY period_month, movement_count DESC;

-- ---------------------------------------------------------------------------
-- 10. get_order_status_summary
-- Domain: Procurement & Overhaul
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ${catalog}.${gold_schema}.get_order_status_summary(
  order_type_filter STRING COMMENT 'Order type (Purchase, Repair, Exchange) or NULL for all',
  status_filter STRING COMMENT 'Status filter (Open, Closed, etc.) or NULL for all',
  start_date STRING COMMENT 'Start date. Format: YYYY-MM-DD',
  end_date STRING COMMENT 'End date. Format: YYYY-MM-DD'
)
RETURNS TABLE (
  order_type STRING COMMENT 'Order type',
  order_number DECIMAL COMMENT 'Order number',
  order_line DECIMAL COMMENT 'Order line item',
  pn STRING COMMENT 'Part number',
  pn_description STRING COMMENT 'Part description',
  sn STRING COMMENT 'Serial number',
  status STRING COMMENT 'Order status',
  exchange_repair_cost DECIMAL COMMENT 'Repair/exchange cost',
  qty_require DECIMAL COMMENT 'Quantity required',
  qty_received DECIMAL COMMENT 'Quantity received',
  lead_time DECIMAL COMMENT 'Lead time in days',
  order_date DATE COMMENT 'Order date',
  fulfillment_rate DECIMAL COMMENT 'Fulfillment rate (received/required)'
)
COMMENT '
• PURPOSE: Returns procurement and repair order status with cost and fulfillment metrics
• BEST FOR: "Open orders exceeding lead time" | "Repair cost by order type" | "Overdue orders"
• RETURNS: One row per order line with status, cost, quantity, and fulfillment rate
• PARAMS: order_type_filter (NULL=all), status_filter (NULL=all), start_date, end_date (YYYY-MM-DD)
• SYNTAX: SELECT * FROM get_order_status_summary(''Repair'', ''Open'', ''2025-01-01'', ''2025-06-30'')
'
RETURN
  SELECT
    f.order_type,
    f.order_number,
    f.order_line,
    p.pn,
    p.pn_description,
    f.sn,
    f.status,
    f.exchange_repair_cost,
    f.qty_require,
    f.qty_received,
    f.lead_time,
    d.calendar_date AS order_date,
    f.qty_received / NULLIF(f.qty_require, 0) AS fulfillment_rate
  FROM ${catalog}.${gold_schema}.vw_prop_fact_order f
  LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_part p ON f.dim_part_key = p.dim_part_key
  LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_date d ON f.order_date_key = d.dim_date_key
  WHERE d.calendar_date BETWEEN CAST(start_date AS DATE) AND CAST(end_date AS DATE)
    AND (order_type_filter IS NULL OR f.order_type = order_type_filter)
    AND (status_filter IS NULL OR f.status = status_filter);

-- ---------------------------------------------------------------------------
-- 11. get_shop_findings_by_part
-- Domain: Procurement & Overhaul
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ${catalog}.${gold_schema}.get_shop_findings_by_part(
  part_number STRING COMMENT 'Part number (NULL for all)',
  ata_chapter STRING COMMENT 'ATA chapter filter (NULL for all)',
  start_date STRING COMMENT 'Start date. Format: YYYY-MM-DD',
  end_date STRING COMMENT 'End date. Format: YYYY-MM-DD'
)
RETURNS TABLE (
  order_type STRING COMMENT 'Order type',
  order_number DECIMAL COMMENT 'Order number',
  order_line DECIMAL COMMENT 'Order line',
  pn STRING COMMENT 'Part number',
  pn_description STRING COMMENT 'Part description',
  sn STRING COMMENT 'Serial number',
  chapter DECIMAL COMMENT 'ATA chapter',
  chapter_description STRING COMMENT 'ATA chapter description',
  fault_confirm STRING COMMENT 'Fault confirmed (Y/N)',
  shop_finding STRING COMMENT 'Shop finding description',
  work_done STRING COMMENT 'Work performed',
  status STRING COMMENT 'Order status',
  created_date DATE COMMENT 'Teardown record date'
)
COMMENT '
• PURPOSE: Returns teardown shop findings linked to parts and ATA chapters for root cause analysis
• BEST FOR: "Shop findings for ATA 73" | "Fault confirmation rate" | "Teardown results for part X"
• RETURNS: One row per teardown record with part, ATA, finding, and work performed
• PARAMS: part_number (NULL=all), ata_chapter (NULL=all), start_date, end_date (YYYY-MM-DD)
• SYNTAX: SELECT * FROM get_shop_findings_by_part(NULL, ''73'', ''2024-01-01'', ''2025-12-31'')
'
RETURN
  SELECT
    f.order_type,
    f.order_number,
    f.order_line,
    p.pn,
    p.pn_description,
    f.sn,
    c.chapter,
    c.chapter_description,
    f.fault_confirm,
    f.shop_finding,
    f.work_done,
    f.status,
    d.calendar_date AS created_date
  FROM ${catalog}.${gold_schema}.vw_prop_fact_teardown f
  LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_part p ON f.dim_part_key = p.dim_part_key
  LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_ata_chapter c ON f.dim_ata_chapter_key = c.dim_ata_chapter_key
  LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_date d ON f.created_date_key = d.dim_date_key
  WHERE (part_number IS NULL OR p.pn = part_number)
    AND (ata_chapter IS NULL OR c.chapter = CAST(ata_chapter AS DECIMAL))
    AND d.calendar_date BETWEEN CAST(start_date AS DATE) AND CAST(end_date AS DATE);
