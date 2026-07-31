-- Propulsion-filtered views on Gold tables
-- These views scope all analytics to propulsion ATA chapters (49, 70-80)
-- using the vw_prop_part_population view as the filter.
-- Deploy order: vw_prop_part_population FIRST, then all others.

-- qx_ppmtx_prop_part_overrides (manual overrides table - deploy first)
-- Parts here are included in propulsion views even if they lack ATA 49/70-80 removal history.
CREATE TABLE IF NOT EXISTS ${catalog}.${gold_schema}.qx_ppmtx_prop_part_overrides (
  pn STRING COMMENT 'Part number to include in propulsion scope',
  pn_description STRING COMMENT 'Part description for reference only',
  reason STRING COMMENT 'Why this part is propulsion-related despite not being in ATA 49/70-80',
  added_by STRING COMMENT 'Who added this override',
  added_date DATE COMMENT 'When this override was added'
)
USING delta
COMMENT 'Manual overrides for propulsion part population. Parts here are included in propulsion views even if they lack ATA 49/70-80 removal history.';

-- vw_prop_bridge_defect_part
CREATE VIEW ${gold_schema}.vw_prop_bridge_defect_part (
  bridge_defect_part_key COMMENT 'Surrogate key for defect-part bridge. Business: unique identifier for each defect-to-part association. Technical: generated via hash of (defect_type, defect, defect_item, item).',
  dim_part_key COMMENT 'Foreign key to part dimension. Business: the part number implicated in this defect. Technical: lookup join on pn to dim_part.',
  defect_type COMMENT 'Defect type code. Business: links back to the parent defect event. Technical: composite FK part 1 to fact_defect.',
  defect COMMENT 'Defect number. Business: links back to the parent defect event. Technical: composite FK part 2 to fact_defect.',
  defect_item COMMENT 'Defect line item number. Business: links back to the parent defect event. Technical: composite FK part 3 to fact_defect.',
  item COMMENT 'Part line item within the defect. Business: sequence number for multiple parts associated with one defect. Technical: degenerate dimension, part of grain.',
  qty COMMENT 'Quantity required. Business: number of units of this part needed for defect resolution. Technical: measure from Silver.',
  qty_reserved COMMENT 'Quantity reserved from inventory. Business: how many units have been reserved against available stock. Technical: measure from Silver.',
  spare COMMENT 'Spare designation flag. Business: indicates if this part line is designated as a spare replacement. Technical: attribute from Silver.',
  ipc COMMENT 'Illustrated Parts Catalog reference. Business: IPC reference for the part within the maintenance manual. Technical: attribute from Silver.',
  reserved COMMENT 'Reservation status. Business: whether inventory has been reserved for this defect resolution. Technical: flag from Silver.')
WITH SCHEMA COMPENSATION
AS SELECT b.*
FROM ${catalog}.${gold_schema}.qx_ppmtx_gold_bridge_defect_part b
WHERE EXISTS (
  SELECT 1 FROM ${catalog}.${gold_schema}.vw_prop_fact_defect d
  WHERE b.defect_type = d.defect_type 
    AND b.defect = d.defect 
    AND b.defect_item = d.defect_item
)
;

-- vw_prop_fact_component_removal
CREATE VIEW ${gold_schema}.vw_prop_fact_component_removal (
  fact_component_removal_key COMMENT 'Surrogate key for component removal fact. Business: unique identifier for each removal/installation event. Technical: generated via hash of (transaction, transaction_item).',
  dim_part_key COMMENT 'Foreign key to part dimension. Business: identifies the part number involved in this removal/installation. Technical: lookup join on pn to dim_part.',
  dim_aircraft_key COMMENT 'Foreign key to aircraft dimension. Business: identifies the aircraft tail this event occurred on. Technical: lookup join on ac to dim_aircraft.',
  dim_station_key COMMENT 'Foreign key to station dimension. Business: identifies the maintenance station where this event occurred. Technical: lookup join on station to dim_station.',
  dim_ata_chapter_key COMMENT 'Foreign key to ATA chapter dimension. Business: identifies the ATA system classification for this event. Technical: lookup join on (chapter, section, paragraph) to dim_ata_chapter.',
  transaction_date_key COMMENT 'Foreign key to date dimension for transaction date. Business: the date this removal/installation occurred. Technical: CAST(date_format(transaction_date, \'yyyyMMdd\') AS INT).',
  transaction COMMENT 'Transaction identifier. Business: the unique transaction number from TRAX for this component swap event. Technical: degenerate dimension, part of grain composite key.',
  transaction_item COMMENT 'Transaction line item number. Business: line sequence within a multi-line transaction. Technical: degenerate dimension, part of grain composite key.',
  transaction_type COMMENT 'Transaction type code. Business: indicates removal (RMV), installation (INS), or other component movement types. Technical: categorical attribute from Silver.',
  transaction_type_control COMMENT 'Transaction type control classification. Business: scheduled vs unscheduled designation for reliability categorization. Technical: attribute from Silver.',
  sn COMMENT 'Serial number of the specific component instance. Business: identifies the exact part instance removed or installed for genealogy tracking. Technical: degenerate dimension from Silver.',
  nha_pn COMMENT 'Next Higher Assembly part number. Business: the parent assembly this component is installed within (e.g., engine module for an LRU). Technical: attribute from Silver.',
  nha_sn COMMENT 'Next Higher Assembly serial number. Business: the specific parent assembly instance. Technical: attribute from Silver.',
  position COMMENT 'Installation position on the aircraft. Business: the physical location where the component is installed (e.g., ENG1, ENG2, APU). Technical: attribute from Silver.',
  reason_category COMMENT 'Removal reason category. Business: why the component was removed (e.g., Failure, Scheduled, Opportunity, Modification). Technical: categorical attribute for reliability trending.',
  schedule_category COMMENT 'Schedule category classification. Business: whether the removal was scheduled or unscheduled, critical for MTBUR calculations. Technical: categorical attribute from Silver.',
  hours_installed COMMENT 'Flight hours the component was installed (TSI). Business: time-since-install in flight hours, critical for hours-at-failure analysis and MTBUR. Technical: additive measure from Silver.',
  minutes_installed COMMENT 'Minutes component was installed. Business: fractional hours-at-failure for precision calculations. Technical: additive measure from Silver.',
  cycles_installed COMMENT 'Flight cycles the component was installed (CSI). Business: cycles-since-install critical for high-cycle PNW operations and LLP tracking. Technical: additive measure from Silver.',
  days_installed COMMENT 'Calendar days the component was installed. Business: elapsed time on wing for calendar-limited parts. Technical: additive measure from Silver.',
  qty COMMENT 'Quantity of units in this transaction. Business: number of items removed or installed (usually 1 for serialized parts). Technical: additive measure from Silver.',
  defect_type COMMENT 'Associated defect type code. Business: links this removal to a defect record for root cause tracing. Technical: degenerate dimension from Silver, FK-like to fact_defect.',
  defect COMMENT 'Associated defect number. Business: specific defect identifier linking removal to defect report. Technical: degenerate dimension from Silver.',
  wo COMMENT 'Work order number. Business: the maintenance work order authorizing this component swap. Technical: degenerate dimension from Silver.',
  tag_no COMMENT 'Component tag number. Business: the removal/serviceable tag attached to the physical part. Technical: attribute from Silver.',
  removal_reason COMMENT 'Detailed removal reason text. Business: free-text explanation of why the component was removed. Technical: attribute from Silver.',
  status COMMENT 'Transaction status. Business: current processing state of this transaction record. Technical: attribute from Silver.',
  ac COMMENT 'Aircraft registration number. Business: the tail number identifying a specific Horizon Air E175 aircraft (e.g., 628QX, N193QX). Technical: natural key extracted as distinct values from Silver transaction and defect tables.')
WITH SCHEMA COMPENSATION
AS SELECT f.*, a.ac
FROM ${catalog}.${gold_schema}.qx_ppmtx_gold_fact_component_removal f
JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_ata_chapter c 
  ON f.dim_ata_chapter_key = c.dim_ata_chapter_key
LEFT JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_aircraft a
  ON f.dim_aircraft_key = a.dim_aircraft_key
WHERE c.chapter IN (49, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80)
;

-- vw_prop_fact_defect
CREATE VIEW ${gold_schema}.vw_prop_fact_defect (
  fact_defect_key COMMENT 'Surrogate key for defect fact. Business: unique identifier for each defect event. Technical: generated via hash of (defect_type, defect, defect_item).',
  dim_aircraft_key COMMENT 'Foreign key to aircraft dimension. Business: identifies the aircraft where this defect was reported. Technical: lookup join on ac to dim_aircraft.',
  dim_ata_chapter_key COMMENT 'Foreign key to ATA chapter dimension. Business: classifies the defect by aircraft system. Technical: lookup join on (chapter, section, paragraph) to dim_ata_chapter.',
  reported_date_key COMMENT 'Foreign key to date dimension for defect reported date. Business: when the defect was first reported. Technical: CAST(date_format(reported_date, \'yyyyMMdd\') AS INT).',
  resolved_date_key COMMENT 'Foreign key to date dimension for defect resolution date. Business: when the defect was resolved or closed. Technical: CAST(date_format(resolved_date, \'yyyyMMdd\') AS INT).',
  defect_type COMMENT 'Defect type code. Business: classification of the defect source (e.g., PIREP, MIREP, Cabin Log). Technical: degenerate dimension, part of grain composite key.',
  defect COMMENT 'Defect number. Business: unique defect identifier within a defect type. Technical: degenerate dimension, part of grain composite key.',
  defect_item COMMENT 'Defect line item number. Business: line sequence for multi-item defects. Technical: degenerate dimension, part of grain composite key.',
  status COMMENT 'Defect status. Business: current state of the defect (Open, Deferred, Closed). Technical: attribute from Silver.',
  defect_description COMMENT 'Defect narrative description. Business: free-text description of what was observed, critical for Genie natural language search. Technical: text attribute from Silver.',
  defect_category COMMENT 'Defect category classification. Business: standardized categorization for reporting and trending. Technical: attribute from Silver.',
  resolution_description COMMENT 'Resolution narrative. Business: what maintenance action was taken to resolve the defect. Technical: text attribute from Silver.',
  resolution_category COMMENT 'Resolution category. Business: standardized resolution type for resolution effectiveness analysis. Technical: attribute from Silver.',
  delay COMMENT 'Delay flag. Business: indicates whether this defect caused a flight delay. Technical: Y/N flag from Silver.',
  delays_hours COMMENT 'Delay duration in hours. Business: flight delay hours attributed to this defect for operational impact ranking. Technical: additive measure from Silver.',
  delay_minutes COMMENT 'Delay duration in minutes. Business: flight delay minutes for granular impact attribution and top-10 ranking. Technical: additive measure from Silver.',
  cancellation COMMENT 'Flight cancellation flag. Business: indicates whether this defect caused a flight cancellation, a key CPA economics metric. Technical: Y/N flag from Silver.',
  i_f_s_d COMMENT 'In-Flight Shut Down indicator. Business: critical safety event flag indicating an engine was shut down in flight. Technical: flag from Silver.',
  fuel COMMENT 'Fuel quantity at time of event. Business: fuel level context for defect occurrence analysis. Technical: additive measure from Silver.',
  mel COMMENT 'MEL applicability flag. Business: indicates if defect was deferred under Minimum Equipment List provisions. Technical: flag from Silver.',
  mel_number COMMENT 'MEL item number. Business: specific MEL reference for deferral compliance tracking. Technical: attribute from Silver.',
  defer COMMENT 'Deferral flag. Business: indicates this defect was deferred rather than immediately resolved. Technical: flag from Silver.',
  fault_confirm COMMENT 'Fault confirmed flag. Business: indicates whether the reported fault was confirmed during maintenance investigation. Technical: flag from Silver.',
  wo COMMENT 'Work order number. Business: the maintenance work order opened to address this defect. Technical: degenerate dimension from Silver.',
  flight COMMENT 'Flight number. Business: the flight during which the defect was observed. Technical: attribute from Silver.')
WITH SCHEMA COMPENSATION
AS SELECT f.*
FROM ${catalog}.${gold_schema}.qx_ppmtx_gold_fact_defect f
JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_ata_chapter c 
  ON f.dim_ata_chapter_key = c.dim_ata_chapter_key
WHERE c.chapter IN (49, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80)
;

-- vw_prop_fact_inventory_control
CREATE VIEW ${gold_schema}.vw_prop_fact_inventory_control (
  fact_inventory_control_key COMMENT 'Surrogate key for inventory control fact. Business: unique identifier for each maintenance control record. Technical: generated via hash of (pn, sn, control).',
  dim_part_key COMMENT 'Foreign key to part dimension. Business: the part number being monitored. Technical: lookup join on pn to dim_part.',
  schedule_date_key COMMENT 'Foreign key to date dimension for scheduled maintenance date. Business: when the next maintenance action is due. Technical: derived from schedule_date.',
  reset_date_key COMMENT 'Foreign key to date dimension for last reset date. Business: when the maintenance counter was last reset (e.g., after shop visit). Technical: derived from reset_date.',
  pn COMMENT 'Part number. Business: the controlled part type. Technical: degenerate dimension, part of grain.',
  sn COMMENT 'Serial number. Business: the specific part instance being tracked. Technical: degenerate dimension, part of grain.',
  control COMMENT 'Control type. Business: type of maintenance limit (e.g., Hard Time, On Condition, TBO). Technical: degenerate dimension, part of grain.',
  schedule_hours COMMENT 'Scheduled hours limit. Business: maximum flight hours before required maintenance action (red-line for hours). Technical: semi-additive measure from Silver.',
  schedule_cycles COMMENT 'Scheduled cycles limit. Business: maximum flight cycles before required maintenance action (red-line for cycles, critical for high-cycle PNW ops). Technical: semi-additive measure from Silver.',
  schedule_days COMMENT 'Scheduled days limit. Business: maximum calendar days before required maintenance action. Technical: semi-additive measure from Silver.',
  actual_hours COMMENT 'Actual hours accumulated. Business: current flight hours since last reset toward the limit. Technical: semi-additive measure from Silver.',
  actual_minutes COMMENT 'Actual minutes accumulated. Business: fractional hours for precision tracking. Technical: semi-additive measure from Silver.',
  actual_cycles COMMENT 'Actual cycles accumulated. Business: current cycles since last reset toward the cycle limit. Technical: semi-additive measure from Silver.',
  actual_days COMMENT 'Actual days accumulated. Business: calendar days since last reset toward the day limit. Technical: semi-additive measure from Silver.',
  remaining_hours COMMENT 'Remaining hours to limit. Business: hours remaining before red-line, critical for fleet scan and shop visit planning. Technical: derived as schedule_hours - actual_hours.',
  remaining_cycles COMMENT 'Remaining cycles to limit. Business: cycles remaining before red-line, the primary LLP tracking metric for high-cycle PNW operations. Technical: derived as schedule_cycles - actual_cycles.',
  remaining_days COMMENT 'Remaining days to limit. Business: calendar days remaining before maintenance action required. Technical: derived as schedule_days - actual_days.')
WITH SCHEMA COMPENSATION
AS SELECT f.*
FROM ${catalog}.${gold_schema}.qx_ppmtx_gold_fact_inventory_control f
WHERE f.dim_part_key IN (
  SELECT dim_part_key 
  FROM ${catalog}.${gold_schema}.vw_prop_part_population
)
;

-- vw_prop_fact_inventory_snapshot
CREATE VIEW ${gold_schema}.vw_prop_fact_inventory_snapshot (
  fact_inventory_snapshot_key COMMENT 'Surrogate key for inventory snapshot. Business: unique identifier for each inventory position record. Technical: generated via hash of batch.',
  dim_part_key COMMENT 'Foreign key to part dimension. Business: the part number of this inventory item. Technical: lookup join on pn to dim_part.',
  dim_aircraft_key COMMENT 'Foreign key to aircraft dimension. Business: identifies aircraft if part is currently installed. Technical: lookup join on installed_ac to dim_aircraft.',
  dim_station_key COMMENT 'Foreign key to station dimension. Business: the station where this part is currently located. Technical: lookup join on location to dim_station.',
  snapshot_date_key COMMENT 'Foreign key to date dimension for snapshot date. Business: the date this inventory position was captured. Technical: derived from processed_timestamp.',
  batch COMMENT 'Inventory batch number. Business: unique identifier for a specific part instance in inventory. Technical: natural key from Silver, grain column.',
  sn COMMENT 'Serial number. Business: the specific serialized part instance. Technical: attribute from Silver.',
  nha_pn COMMENT 'Next Higher Assembly part number. Business: the parent assembly this part belongs to. Technical: attribute from Silver.',
  nha_sn COMMENT 'Next Higher Assembly serial number. Business: the specific parent assembly instance. Technical: attribute from Silver.',
  condition COMMENT 'Part condition code. Business: current serviceability (SVC/RFI/UNS/SCR/AOG) critical for spare availability queries. Technical: attribute from Silver.',
  owner COMMENT 'Part owner. Business: who owns this part instance (airline, vendor, pool). Technical: attribute from Silver.',
  unit_cost COMMENT 'Unit cost of this part instance. Business: current value for inventory valuation and financial reporting. Technical: semi-additive measure from Silver.',
  currency COMMENT 'Cost currency. Business: currency denomination for the unit cost. Technical: attribute from Silver.',
  location COMMENT 'Storage location. Business: physical location of the part (station code or warehouse). Technical: attribute from Silver, also used for dim_station lookup.',
  installed_ac COMMENT 'Aircraft registration if installed. Business: which aircraft this part is currently on (null if in stock). Technical: attribute from Silver.',
  installed_position COMMENT 'Installation position. Business: physical location on the aircraft where the part is installed. Technical: attribute from Silver.')
WITH SCHEMA COMPENSATION
AS SELECT f.*
FROM ${catalog}.${gold_schema}.qx_ppmtx_gold_fact_inventory_snapshot f
WHERE f.dim_part_key IN (SELECT dim_part_key FROM ${catalog}.${gold_schema}.vw_prop_part_population)
;

-- vw_prop_fact_inventory_transaction
CREATE VIEW ${gold_schema}.vw_prop_fact_inventory_transaction (
  fact_inventory_transaction_key COMMENT 'Surrogate key for inventory transaction fact. Business: unique identifier for each inventory movement event. Technical: generated via hash of (transaction_no, batch).',
  dim_part_key COMMENT 'Foreign key to part dimension. Business: identifies the part number being moved. Technical: lookup join on pn to dim_part.',
  dim_aircraft_key COMMENT 'Foreign key to aircraft dimension. Business: identifies the aircraft involved (if installed/removed from aircraft). Technical: lookup join on ac to dim_aircraft.',
  dim_station_key COMMENT 'Foreign key to station dimension. Business: the station where this inventory movement occurred. Technical: lookup join on location to dim_station.',
  transaction_date_key COMMENT 'Foreign key to date dimension for transaction date. Business: when this inventory movement occurred. Technical: derived from processed_timestamp.',
  transaction_no COMMENT 'Inventory transaction number. Business: unique movement identifier in the inventory system. Technical: degenerate dimension, part of grain.',
  batch COMMENT 'Inventory batch number. Business: identifies the specific part instance being moved. Technical: degenerate dimension, part of grain.',
  transaction_type COMMENT 'Inventory transaction type. Business: type of movement (Receipt, Issue, Transfer, Adjustment, etc.). Technical: categorical attribute from Silver.',
  sn COMMENT 'Serial number. Business: specific part instance being moved. Technical: attribute from Silver.',
  condition COMMENT 'Part condition code. Business: serviceability status (SVC, UNS, SCR, etc.) at time of movement. Technical: attribute from Silver.',
  qty COMMENT 'Quantity moved. Business: number of units in this inventory transaction. Technical: additive measure from Silver.',
  order_type COMMENT 'Associated order type. Business: links inventory movement to originating order. Technical: attribute from Silver.',
  order_no COMMENT 'Associated order number. Business: links to the procurement or repair order. Technical: attribute from Silver.',
  wo COMMENT 'Work order number. Business: maintenance work order consuming this part. Technical: attribute from Silver.')
WITH SCHEMA COMPENSATION
AS SELECT f.*
FROM ${catalog}.${gold_schema}.qx_ppmtx_gold_fact_inventory_transaction f
WHERE f.dim_part_key IN (SELECT dim_part_key FROM ${catalog}.${gold_schema}.vw_prop_part_population)
;

-- vw_prop_fact_order
CREATE VIEW ${gold_schema}.vw_prop_fact_order (
  fact_order_key COMMENT 'Surrogate key for order fact. Business: unique identifier for each order line item. Technical: generated via hash of (order_type, order_number, order_line).',
  dim_part_key COMMENT 'Foreign key to part dimension. Business: the part being ordered. Technical: lookup join on pn to dim_part.',
  order_date_key COMMENT 'Foreign key to date dimension for order date. Business: when the order was placed. Technical: derived from processed_timestamp.',
  order_type COMMENT 'Order type code. Business: type of procurement (Purchase, Repair, Exchange, Loan). Technical: degenerate dimension, part of grain.',
  order_number COMMENT 'Order number. Business: unique order identifier in the procurement system. Technical: degenerate dimension, part of grain.',
  order_line COMMENT 'Order line number. Business: line item sequence within the order. Technical: degenerate dimension, part of grain.',
  status COMMENT 'Order line status. Business: current processing state (Open, In Progress, Received, Closed). Technical: attribute from Silver.',
  sn COMMENT 'Serial number of ordered part. Business: specific part instance being ordered or returned. Technical: attribute from Silver.',
  batch COMMENT 'Inventory batch reference. Business: links to the inventory record for this part. Technical: attribute from Silver.',
  pn_description COMMENT 'Part description on order. Business: human-readable part name as it appears on the order. Technical: attribute from Silver.',
  exchange_pn COMMENT 'Exchange part number. Business: the part number received in exchange transactions. Technical: attribute from Silver.',
  exchange_sn COMMENT 'Exchange serial number. Business: the specific unit received in exchange. Technical: attribute from Silver.',
  exchange_repair_cost COMMENT 'Exchange or repair cost. Business: total cost of the exchange or repair transaction for financial analysis. Technical: additive measure from Silver.',
  qty_require COMMENT 'Quantity required. Business: how many units are needed. Technical: additive measure from Silver.',
  qty_received COMMENT 'Quantity received. Business: how many units have been received against this order line. Technical: additive measure from Silver.',
  qty_available COMMENT 'Quantity available. Business: units available to fulfill this order. Technical: additive measure from Silver.',
  lead_time COMMENT 'Order lead time in days. Business: expected days from order to receipt for supply chain planning. Technical: additive measure from Silver.')
WITH SCHEMA COMPENSATION
AS SELECT f.*
FROM ${catalog}.${gold_schema}.qx_ppmtx_gold_fact_order f
WHERE f.dim_part_key IN (SELECT dim_part_key FROM ${catalog}.${gold_schema}.vw_prop_part_population)
;

-- vw_prop_fact_teardown
CREATE VIEW ${gold_schema}.vw_prop_fact_teardown (
  fact_teardown_key COMMENT 'Surrogate key for teardown fact. Business: unique identifier for each teardown report record. Technical: generated via hash of (order_type, order_number, order_line).',
  dim_part_key COMMENT 'Foreign key to part dimension. Business: the part that was torn down. Technical: lookup join on pn to dim_part.',
  dim_ata_chapter_key COMMENT 'Foreign key to ATA chapter dimension. Business: ATA classification of the teardown finding. Technical: lookup join on (chapter, section, paragraph) — uses defect-associated ATA from tear_down_report.',
  created_date_key COMMENT 'Foreign key to date dimension for report creation date. Business: when the teardown report was created. Technical: derived from created_date.',
  order_type COMMENT 'Order type. Business: type of maintenance order (Repair, Overhaul). Technical: degenerate dimension, part of grain.',
  order_number COMMENT 'Order number. Business: the repair/overhaul order this teardown is associated with. Technical: degenerate dimension, part of grain.',
  order_line COMMENT 'Order line number. Business: line item within the order. Technical: degenerate dimension, part of grain.',
  sn COMMENT 'Serial number of the torn-down component. Business: the specific part instance that was inspected. Technical: attribute from Silver.',
  batch COMMENT 'Inventory batch reference. Business: links to inventory for traceability. Technical: attribute from Silver.',
  fault_confirm COMMENT 'Fault confirmed indicator. Business: whether the reported fault was confirmed during teardown inspection, critical for reliability trending (NFF vs confirmed failure). Technical: attribute from Silver.',
  status COMMENT 'Teardown report status. Business: processing state of the teardown. Technical: attribute from Silver.',
  pn_description COMMENT 'Part description. Business: name of the part as recorded on the teardown report. Technical: attribute from Silver.',
  work_done COMMENT 'Work performed description. Business: narrative of the repair/overhaul work completed during teardown. Technical: text attribute from Silver.',
  shop_finding COMMENT 'Shop finding description. Business: the root cause finding from teardown inspection, critical for failure mode identification and Genie search. Technical: text attribute from Silver.',
  defect_type COMMENT 'Originating defect type. Business: links this teardown back to the originating defect for end-to-end traceability. Technical: degenerate dimension from Silver.',
  defect COMMENT 'Originating defect number. Business: specific defect that led to this teardown. Technical: degenerate dimension from Silver.',
  defect_item COMMENT 'Originating defect item. Business: defect line item for multi-item defects. Technical: degenerate dimension from Silver.')
WITH SCHEMA COMPENSATION
AS SELECT f.*
FROM ${catalog}.${gold_schema}.qx_ppmtx_gold_fact_teardown f
JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_ata_chapter c 
  ON f.dim_ata_chapter_key = c.dim_ata_chapter_key
WHERE c.chapter IN (49, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80)
;

-- vw_prop_part_population
CREATE VIEW ${gold_schema}.vw_prop_part_population (
  dim_part_key COMMENT 'Foreign key to part dimension. Business: identifies the part number involved in this removal/installation. Technical: lookup join on pn to dim_part.')
WITH SCHEMA COMPENSATION
AS SELECT DISTINCT f.dim_part_key
FROM ${catalog}.${gold_schema}.qx_ppmtx_gold_fact_component_removal f
JOIN ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_ata_chapter c 
  ON f.dim_ata_chapter_key = c.dim_ata_chapter_key
WHERE c.chapter IN (49, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80)

UNION

-- Manual overrides: curated propulsion parts not in standard ATA scope
SELECT p.dim_part_key
FROM ${catalog}.${gold_schema}.qx_ppmtx_gold_dim_part p
JOIN ${catalog}.${gold_schema}.qx_ppmtx_prop_part_overrides o ON p.pn = o.pn
;

