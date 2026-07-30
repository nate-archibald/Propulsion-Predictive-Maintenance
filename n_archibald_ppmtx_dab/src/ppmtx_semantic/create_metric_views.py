# Databricks notebook source
# MAGIC %md
# MAGIC # Create Metric Views
# MAGIC Creates Metric Views using `CREATE VIEW ... WITH METRICS LANGUAGE YAML` syntax.
# MAGIC Sources from propulsion-scoped views (vw_prop_*) instead of raw Gold fact tables.
# MAGIC
# MAGIC Metric Views require execution on a SQL Warehouse.
# MAGIC Uses the Statement Execution API to run DDL on the configured warehouse.

# COMMAND ----------

from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementState

catalog = dbutils.widgets.get("catalog")
gold_schema = dbutils.widgets.get("gold_schema")
warehouse_id = dbutils.widgets.get("warehouse_id")

w = WorkspaceClient()

print(f"Catalog: {catalog}")
print(f"Gold Schema: {gold_schema}")
print(f"Warehouse ID: {warehouse_id}")

# COMMAND ----------

def execute_on_warehouse(sql: str, description: str):
    """Execute a SQL statement on the SQL warehouse via Statement Execution API."""
    resp = w.statement_execution.execute_statement(
        warehouse_id=warehouse_id,
        statement=sql,
        wait_timeout="50s",
        catalog=catalog,
        schema=gold_schema,
    )
    if resp.status and resp.status.state == StatementState.SUCCEEDED:
        print(f"✅ Created: {description}")
    else:
        error = resp.status.error if resp.status else "Unknown error"
        raise RuntimeError(f"❌ Failed to create {description}: {error}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 1. Component Lifecycle Analytics Metrics
# MAGIC Source: vw_prop_fact_component_removal + dimensions

# COMMAND ----------

execute_on_warehouse(f"""
CREATE OR REPLACE VIEW {catalog}.{gold_schema}.component_lifecycle_analytics_metrics
WITH METRICS
LANGUAGE YAML
COMMENT 'PURPOSE: Pre-aggregated metrics for propulsion component removal and lifecycle analysis.
BEST FOR: How many removals this month? | Average hours at removal? | Removal trend by ATA chapter?
NOT FOR: Parameterized P/N lookups (use get_component_removal_history TVF instead)
SOURCE: vw_prop_fact_component_removal (propulsion-scoped component removals)'
AS $$
version: "1.1"

source: {catalog}.{gold_schema}.vw_prop_fact_component_removal

joins:
  - name: dim_part
    source: {catalog}.{gold_schema}.qx_ppmtx_gold_dim_part
    on: source.dim_part_key = dim_part.dim_part_key
  - name: dim_aircraft
    source: {catalog}.{gold_schema}.qx_ppmtx_gold_dim_aircraft
    on: source.dim_aircraft_key = dim_aircraft.dim_aircraft_key
  - name: dim_station
    source: {catalog}.{gold_schema}.qx_ppmtx_gold_dim_station
    on: source.dim_station_key = dim_station.dim_station_key
  - name: dim_ata_chapter
    source: {catalog}.{gold_schema}.qx_ppmtx_gold_dim_ata_chapter
    on: source.dim_ata_chapter_key = dim_ata_chapter.dim_ata_chapter_key
  - name: dim_date
    source: {catalog}.{gold_schema}.qx_ppmtx_gold_dim_date
    on: source.transaction_date_key = dim_date.dim_date_key

dimensions:
  - name: pn
    expr: dim_part.pn
    synonyms: [part_number, p/n, part]
  - name: pn_description
    expr: dim_part.pn_description
    synonyms: [part_description, part_name]
  - name: category
    expr: dim_part.category
    synonyms: [part_category, component_type]
  - name: ac
    expr: dim_aircraft.ac
    synonyms: [tail_number, aircraft, tail]
  - name: aircraft_type
    expr: dim_aircraft.aircraft_type
    synonyms: [fleet_type, type]
  - name: station_code
    expr: dim_station.station_code
    synonyms: [station, airport, base]
  - name: station_name
    expr: dim_station.station_name
    synonyms: [station_description, location]
  - name: chapter
    expr: dim_ata_chapter.chapter
    synonyms: [ata_chapter, ata]
  - name: chapter_description
    expr: dim_ata_chapter.chapter_description
    synonyms: [ata_description, system]
  - name: removal_date
    expr: dim_date.calendar_date
    synonyms: [date, transaction_date, event_date]
  - name: year
    expr: dim_date.year
    synonyms: [calendar_year]
  - name: quarter
    expr: dim_date.quarter
    synonyms: [calendar_quarter]
  - name: month
    expr: dim_date.month
    synonyms: [calendar_month, month_number]
  - name: month_name
    expr: dim_date.month_name
    synonyms: [month_label]
  - name: reason_category
    expr: source.reason_category
    synonyms: [removal_reason, reason]
  - name: schedule_category
    expr: source.schedule_category
    synonyms: [scheduled_unscheduled, schedule_type]
  - name: transaction_type
    expr: source.transaction_type
    synonyms: [removal_type, type]
  - name: position
    expr: source.position
    synonyms: [engine_position, install_position]

measures:
  - name: total_hours_at_removal
    expr: SUM(source.hours_installed)
    synonyms: [total_hours, hours_on_wing, total_time]
  - name: total_cycles_at_removal
    expr: SUM(source.cycles_installed)
    synonyms: [total_cycles, cycles_on_wing]
  - name: total_days_at_removal
    expr: SUM(source.days_installed)
    synonyms: [total_days, days_on_wing]
  - name: removal_count
    expr: COUNT(*)
    synonyms: [removals, count, total_removals, number_of_removals]
  - name: avg_hours_at_removal
    expr: AVG(source.hours_installed)
    synonyms: [average_hours, mean_hours, mtbur_hours, mean_time_between_removal]
  - name: avg_cycles_at_removal
    expr: AVG(source.cycles_installed)
    synonyms: [average_cycles, mean_cycles]
  - name: unscheduled_removal_count
    expr: "COUNT(CASE WHEN source.schedule_category = 'Unscheduled' THEN 1 END)"
    synonyms: [unscheduled_removals, unplanned_removals, urs]
$$
""", "component_lifecycle_analytics_metrics")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 2. Defect Intelligence Analytics Metrics
# MAGIC Source: vw_prop_fact_defect + dimensions

# COMMAND ----------

execute_on_warehouse(f"""
CREATE OR REPLACE VIEW {catalog}.{gold_schema}.defect_intelligence_analytics_metrics
WITH METRICS
LANGUAGE YAML
COMMENT 'PURPOSE: Pre-aggregated metrics for propulsion defect analysis including operational impact.
BEST FOR: Top ATA sections by delay minutes? | Defect count trend this quarter? | Cancellations by chapter?
NOT FOR: Individual defect tracing (use get_defect_part_linkage TVF instead)
SOURCE: vw_prop_fact_defect (propulsion-scoped defects ATA 49/70-80)'
AS $$
version: "1.1"

source: {catalog}.{gold_schema}.vw_prop_fact_defect

joins:
  - name: dim_aircraft
    source: {catalog}.{gold_schema}.qx_ppmtx_gold_dim_aircraft
    on: source.dim_aircraft_key = dim_aircraft.dim_aircraft_key
  - name: dim_ata_chapter
    source: {catalog}.{gold_schema}.qx_ppmtx_gold_dim_ata_chapter
    on: source.dim_ata_chapter_key = dim_ata_chapter.dim_ata_chapter_key
  - name: dim_date
    source: {catalog}.{gold_schema}.qx_ppmtx_gold_dim_date
    on: source.reported_date_key = dim_date.dim_date_key

dimensions:
  - name: ac
    expr: dim_aircraft.ac
    synonyms: [tail_number, aircraft, tail]
  - name: aircraft_type
    expr: dim_aircraft.aircraft_type
    synonyms: [fleet_type, type]
  - name: chapter
    expr: dim_ata_chapter.chapter
    synonyms: [ata_chapter, ata]
  - name: section
    expr: dim_ata_chapter.section
    synonyms: [ata_section, subsystem]
  - name: chapter_description
    expr: dim_ata_chapter.chapter_description
    synonyms: [ata_description, system_name]
  - name: reported_date
    expr: dim_date.calendar_date
    synonyms: [date, defect_date, event_date]
  - name: year
    expr: dim_date.year
    synonyms: [calendar_year]
  - name: quarter
    expr: dim_date.quarter
    synonyms: [calendar_quarter]
  - name: month
    expr: dim_date.month
    synonyms: [calendar_month]
  - name: month_name
    expr: dim_date.month_name
    synonyms: [month_label]
  - name: defect_type
    expr: source.defect_type
    synonyms: [type, pirep_type, logbook_type]
  - name: defect_category
    expr: source.defect_category
    synonyms: [category]
  - name: status
    expr: source.status
    synonyms: [defect_status, state]
  - name: cancellation
    expr: source.cancellation
    synonyms: [cancelled, cnx]
  - name: delay
    expr: source.delay
    synonyms: [delayed, dly]
  - name: mel
    expr: source.mel
    synonyms: [mel_item, minimum_equipment_list]
  - name: defer
    expr: source.defer
    synonyms: [deferred, deferral]
  - name: i_f_s_d
    expr: source.i_f_s_d
    synonyms: [ifsd, in_flight_shutdown, engine_shutdown]

measures:
  - name: defect_count
    expr: COUNT(*)
    synonyms: [defects, count, total_defects, number_of_defects]
  - name: total_delay_minutes
    expr: SUM(source.delay_minutes)
    synonyms: [delay_minutes, minutes_delayed, total_minutes]
  - name: total_delay_hours
    expr: SUM(source.delays_hours)
    synonyms: [delay_hours, hours_delayed]
  - name: cancellation_count
    expr: "COUNT(CASE WHEN source.cancellation = 'Y' THEN 1 END)"
    synonyms: [cancellations, cnx_count, flights_cancelled]
  - name: delay_event_count
    expr: "COUNT(CASE WHEN source.delay = 'Y' THEN 1 END)"
    synonyms: [delays, delay_events, flights_delayed]
  - name: ifsd_count
    expr: "COUNT(CASE WHEN source.i_f_s_d = 'Y' THEN 1 END)"
    synonyms: [ifsds, in_flight_shutdowns, engine_shutdowns]
  - name: mel_deferral_count
    expr: "COUNT(CASE WHEN source.mel = 'Y' THEN 1 END)"
    synonyms: [mel_items, mel_deferrals]
  - name: deferral_count
    expr: "COUNT(CASE WHEN source.defer = 'Y' THEN 1 END)"
    synonyms: [deferrals, deferred_items]
$$
""", "defect_intelligence_analytics_metrics")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 3. Inventory Spares Analytics Metrics
# MAGIC Source: vw_prop_fact_inventory_snapshot + dimensions

# COMMAND ----------

execute_on_warehouse(f"""
CREATE OR REPLACE VIEW {catalog}.{gold_schema}.inventory_spares_analytics_metrics
WITH METRICS
LANGUAGE YAML
COMMENT 'PURPOSE: Pre-aggregated metrics for propulsion spare inventory analysis by station and condition.
BEST FOR: How many serviceable spares at PDX? | Total inventory value by condition? | Stock-out risk parts?
NOT FOR: Parameterized threshold queries (use get_spare_availability_by_station TVF)
SOURCE: vw_prop_fact_inventory_snapshot (propulsion-scoped inventory positions)'
AS $$
version: "1.1"

source: {catalog}.{gold_schema}.vw_prop_fact_inventory_snapshot

joins:
  - name: dim_part
    source: {catalog}.{gold_schema}.qx_ppmtx_gold_dim_part
    on: source.dim_part_key = dim_part.dim_part_key
  - name: dim_station
    source: {catalog}.{gold_schema}.qx_ppmtx_gold_dim_station
    on: source.dim_station_key = dim_station.dim_station_key

dimensions:
  - name: pn
    expr: dim_part.pn
    synonyms: [part_number, p/n, part]
  - name: pn_description
    expr: dim_part.pn_description
    synonyms: [part_description, part_name]
  - name: category
    expr: dim_part.category
    synonyms: [part_category, component_type]
  - name: station_code
    expr: dim_station.station_code
    synonyms: [station, airport, base]
  - name: station_name
    expr: dim_station.station_name
    synonyms: [station_description, location]
  - name: condition
    expr: source.condition
    synonyms: [condition_code, status, serviceability]
  - name: owner
    expr: source.owner
    synonyms: [ownership, owner_code]
  - name: location
    expr: source.location
    synonyms: [storage_location, warehouse]
  - name: installed_ac
    expr: source.installed_ac
    synonyms: [installed_aircraft, on_wing_aircraft]

measures:
  - name: instance_count
    expr: COUNT(*)
    synonyms: [parts_count, inventory_count, total_parts, quantity]
  - name: total_value
    expr: SUM(source.unit_cost)
    synonyms: [inventory_value, total_cost, value]
  - name: serviceable_count
    expr: "COUNT(CASE WHEN source.condition = 'SVC' THEN 1 END)"
    synonyms: [serviceable, svc_count, available_spares]
  - name: unserviceable_count
    expr: "COUNT(CASE WHEN source.condition = 'UNS' THEN 1 END)"
    synonyms: [unserviceable, uns_count, in_repair]
  - name: aog_count
    expr: "COUNT(CASE WHEN source.condition = 'AOG' THEN 1 END)"
    synonyms: [aog, aircraft_on_ground, critical_demand]
  - name: installed_count
    expr: COUNT(CASE WHEN source.installed_ac IS NOT NULL THEN 1 END)
    synonyms: [on_wing, installed, in_service]
  - name: in_stock_count
    expr: COUNT(CASE WHEN source.installed_ac IS NULL THEN 1 END)
    synonyms: [in_stock, spare, available]
$$
""", "inventory_spares_analytics_metrics")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 4. Procurement Overhaul Analytics Metrics
# MAGIC Source: vw_prop_fact_order + dimensions

# COMMAND ----------

execute_on_warehouse(f"""
CREATE OR REPLACE VIEW {catalog}.{gold_schema}.procurement_overhaul_analytics_metrics
WITH METRICS
LANGUAGE YAML
COMMENT 'PURPOSE: Pre-aggregated metrics for procurement, repair orders, and cost analytics for propulsion parts.
BEST FOR: Average repair cost by order type? | Order fulfillment rate trend? | Open orders this month?
NOT FOR: Individual order lookup (use get_order_status_summary TVF)
SOURCE: vw_prop_fact_order (propulsion-scoped procurement orders)'
AS $$
version: "1.1"

source: {catalog}.{gold_schema}.vw_prop_fact_order

joins:
  - name: dim_part
    source: {catalog}.{gold_schema}.qx_ppmtx_gold_dim_part
    on: source.dim_part_key = dim_part.dim_part_key
  - name: dim_date
    source: {catalog}.{gold_schema}.qx_ppmtx_gold_dim_date
    on: source.order_date_key = dim_date.dim_date_key

dimensions:
  - name: pn
    expr: dim_part.pn
    synonyms: [part_number, p/n, part]
  - name: pn_description
    expr: dim_part.pn_description
    synonyms: [part_description, part_name]
  - name: category
    expr: dim_part.category
    synonyms: [part_category, component_type]
  - name: order_date
    expr: dim_date.calendar_date
    synonyms: [date, purchase_date, created_date]
  - name: year
    expr: dim_date.year
    synonyms: [calendar_year]
  - name: quarter
    expr: dim_date.quarter
    synonyms: [calendar_quarter]
  - name: month
    expr: dim_date.month
    synonyms: [calendar_month]
  - name: order_type
    expr: source.order_type
    synonyms: [type, procurement_type, po_type]
  - name: status
    expr: source.status
    synonyms: [order_status, state]

measures:
  - name: total_repair_cost
    expr: SUM(source.exchange_repair_cost)
    synonyms: [repair_cost, total_cost, cost]
  - name: avg_repair_cost
    expr: AVG(source.exchange_repair_cost)
    synonyms: [average_cost, mean_cost]
  - name: total_qty_required
    expr: SUM(source.qty_require)
    synonyms: [quantity_required, demand, required]
  - name: total_qty_received
    expr: SUM(source.qty_received)
    synonyms: [quantity_received, received, fulfilled]
  - name: avg_lead_time
    expr: AVG(source.lead_time)
    synonyms: [lead_time, average_lead_time, tat, turnaround_time]
  - name: order_line_count
    expr: COUNT(*)
    synonyms: [orders, count, total_orders, lines]
  - name: open_order_count
    expr: "COUNT(CASE WHEN source.status = 'Open' THEN 1 END)"
    synonyms: [open_orders, pending_orders, outstanding]
  - name: fulfillment_rate
    expr: SUM(source.qty_received) / NULLIF(SUM(source.qty_require), 0)
    synonyms: [fill_rate, completion_rate, delivery_rate]
    format:
      type: percentage
$$
""", "procurement_overhaul_analytics_metrics")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Summary

# COMMAND ----------

# Verify all Metric Views exist
result = spark.sql(f"""
SELECT table_name, table_type, comment
FROM {catalog}.information_schema.tables
WHERE table_schema = '{gold_schema}'
  AND table_name LIKE '%_metrics'
ORDER BY table_name
""")
result.display()
print(f"\n✅ All 4 Metric Views created in {catalog}.{gold_schema}")
