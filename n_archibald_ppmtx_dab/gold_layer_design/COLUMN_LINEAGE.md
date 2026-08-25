# Column-Level Lineage — QX Predictive Maintenance Gold Layer

> **Transformation Types Used:** GENERATED, DIRECT_COPY, LOOKUP, DERIVED_CALCULATION, DERIVED_CONDITIONAL

---

## 🔧 qx_ppmtx_gold_dim_part

| Gold Column | Silver Source | Transformation | Logic |
|---|---|---|---|
| dim_part_key | qx_ppmtx_pn_master.pn | GENERATED | ROW_NUMBER() OVER (ORDER BY pn) |
| pn | qx_ppmtx_pn_master.pn | DIRECT_COPY | pn |
| pn_description | qx_ppmtx_pn_master.pn_description | DIRECT_COPY | pn_description |
| category | qx_ppmtx_pn_master.category | DIRECT_COPY | category |
| sub_category | qx_ppmtx_pn_master.sub_category | DIRECT_COPY | sub_category |
| expenditure | qx_ppmtx_pn_master.expenditure | DIRECT_COPY | expenditure |
| stock_uom | qx_ppmtx_pn_master.stock_uom | DIRECT_COPY | stock_uom |
| shelf_life_flag | qx_ppmtx_pn_master.shelf_life_flag | DIRECT_COPY | shelf_life_flag |
| shelf_life_days | qx_ppmtx_pn_master.shelf_life_days | DIRECT_COPY | shelf_life_days |
| tool_calibration_flag | qx_ppmtx_pn_master.tool_calibration_flag | DIRECT_COPY | tool_calibration_flag |
| tool_life_days | qx_ppmtx_pn_master.tool_life_days | DIRECT_COPY | tool_life_days |
| ri_flag | qx_ppmtx_pn_master.ri_flag | DIRECT_COPY | ri_flag |
| pn_supersede | qx_ppmtx_pn_master.pn_supersede | DIRECT_COPY | pn_supersede |
| standard_cost | qx_ppmtx_pn_master.standard_cost | DIRECT_COPY | standard_cost |
| average_cost | qx_ppmtx_pn_master.average_cost | DIRECT_COPY | average_cost |
| gl_company | qx_ppmtx_pn_master.gl_company | DIRECT_COPY | gl_company |
| gl_expenditure | qx_ppmtx_pn_master.gl_expenditure | DIRECT_COPY | gl_expenditure |

## ✈️ qx_ppmtx_gold_dim_aircraft

| Gold Column | Silver Source | Transformation | Logic |
|---|---|---|---|
| dim_aircraft_key | qx_ppmtx_ac_pn_transaction_history.ac | GENERATED | ROW_NUMBER() |
| ac | qx_ppmtx_ac_pn_transaction_history.ac | DIRECT_COPY | DISTINCT ac UNION sources |
| aircraft_type | — | GENERATED | 'E175' (defaulted) |

## ✈️ qx_ppmtx_gold_dim_station

| Gold Column | Silver Source | Transformation | Logic |
|---|---|---|---|
| dim_station_key | qx_ppmtx_ac_pn_transaction_history.station | GENERATED | ROW_NUMBER() |
| station_code | qx_ppmtx_ac_pn_transaction_history.station | DIRECT_COPY | DISTINCT station UNION location |
| station_name | qx_ppmtx_ac_pn_transaction_history.station | DERIVED_CONDITIONAL | CASE mapping |

## ⚠️ qx_ppmtx_gold_dim_ata_chapter

| Gold Column | Silver Source | Transformation | Logic |
|---|---|---|---|
| dim_ata_chapter_key | qx_ppmtx_defect_report.chapter | GENERATED | ROW_NUMBER() |
| chapter | qx_ppmtx_defect_report.chapter | DIRECT_COPY | chapter |
| section | qx_ppmtx_defect_report.section | DIRECT_COPY | section |
| paragraph | qx_ppmtx_defect_report.paragraph | DIRECT_COPY | paragraph |
| chapter_description | qx_ppmtx_defect_report.chapter | DERIVED_CONDITIONAL | ATA 100 CASE mapping |

## 📅 qx_ppmtx_gold_dim_date

| Gold Column | Silver Source | Transformation | Logic |
|---|---|---|---|
| dim_date_key | — | GENERATED | CAST(date_format(calendar_date, 'yyyyMMdd') AS INT) |
| calendar_date | — | GENERATED | sequence(2015-01-01, 2030-12-31) |
| year | — | GENERATED | YEAR(calendar_date) |
| quarter | — | GENERATED | QUARTER(calendar_date) |
| month | — | GENERATED | MONTH(calendar_date) |
| week_of_year | — | GENERATED | WEEKOFYEAR(calendar_date) |
| day_of_month | — | GENERATED | DAY(calendar_date) |
| day_name | — | GENERATED | date_format(calendar_date, 'EEEE') |
| month_name | — | GENERATED | date_format(calendar_date, 'MMMM') |

## ✈️ qx_ppmtx_gold_fact_component_removal

| Gold Column | Silver Source | Transformation | Logic |
|---|---|---|---|
| fact_component_removal_key | .transaction | GENERATED | HASH(transaction, transaction_item) |
| dim_part_key | .pn | LOOKUP | JOIN dim_part |
| dim_aircraft_key | .ac | LOOKUP | JOIN dim_aircraft |
| dim_station_key | .station | LOOKUP | JOIN dim_station |
| dim_ata_chapter_key | .chapter | LOOKUP | JOIN dim_ata_chapter |
| transaction_date_key | .transaction_date | DERIVED_CALCULATION | date to INT key |
| transaction | .transaction | DIRECT_COPY | — |
| transaction_item | .transaction_item | DIRECT_COPY | — |
| transaction_type | .transaction_type | DIRECT_COPY | — |
| transaction_type_control | .transaction_type_control | DIRECT_COPY | — |
| sn | .sn | DIRECT_COPY | — |
| nha_pn | .nha_pn | DIRECT_COPY | — |
| nha_sn | .nha_sn | DIRECT_COPY | — |
| position | .position | DIRECT_COPY | — |
| reason_category | .reason_category | DIRECT_COPY | — |
| schedule_category | .schedule_category | DIRECT_COPY | — |
| hours_installed | .hours_installed | DIRECT_COPY | — |
| minutes_installed | .minutes_installed | DIRECT_COPY | — |
| cycles_installed | .cycles_installed | DIRECT_COPY | — |
| days_installed | .days_installed | DIRECT_COPY | — |
| qty | .qty | DIRECT_COPY | — |
| defect_type | .defect_type | DIRECT_COPY | — |
| defect | .defect | DIRECT_COPY | — |
| wo | .wo | DIRECT_COPY | — |
| tag_no | .tag_no | DIRECT_COPY | — |
| removal_reason | .removal_reason | DIRECT_COPY | — |
| status | .status | DIRECT_COPY | — |

## ⚠️ qx_ppmtx_gold_fact_defect

| Gold Column | Silver Source | Transformation | Logic |
|---|---|---|---|
| fact_defect_key | .defect | GENERATED | HASH(defect_type, defect, defect_item) |
| dim_aircraft_key | .ac | LOOKUP | JOIN dim_aircraft |
| dim_ata_chapter_key | .chapter | LOOKUP | JOIN dim_ata_chapter |
| reported_date_key | .reported_date | DERIVED_CALCULATION | date to INT key |
| resolved_date_key | .resolved_date | DERIVED_CALCULATION | date to INT key |
| defect_type | .defect_type | DIRECT_COPY | — |
| defect | .defect | DIRECT_COPY | — |
| defect_item | .defect_item | DIRECT_COPY | — |
| status | .status | DIRECT_COPY | — |
| defect_description | .defect_description | DIRECT_COPY | — |
| defect_category | .defect_category | DIRECT_COPY | — |
| resolution_description | .resolution_description | DIRECT_COPY | — |
| resolution_category | .resolution_category | DIRECT_COPY | — |
| delay | .delay | DIRECT_COPY | — |
| delays_hours | .delays_hours | DIRECT_COPY | — |
| delay_minutes | .delay_minutes | DIRECT_COPY | — |
| cancellation | .cancellation | DIRECT_COPY | — |
| i_f_s_d | .i_f_s_d | DIRECT_COPY | — |
| fuel | .fuel | DIRECT_COPY | — |
| mel | .mel | DIRECT_COPY | — |
| mel_number | .mel_number | DIRECT_COPY | — |
| defer | .defer | DIRECT_COPY | — |
| fault_confirm | .fault_confirm | DIRECT_COPY | — |
| wo | .wo | DIRECT_COPY | — |
| flight | .flight | DIRECT_COPY | — |

## ⚠️ qx_ppmtx_gold_bridge_defect_part

| Gold Column | Silver Source | Transformation | Logic |
|---|---|---|---|
| bridge_defect_part_key | .defect | GENERATED | HASH(defect_type, defect, defect_item, item) |
| dim_part_key | .pn | LOOKUP | JOIN dim_part |
| defect_type | .defect_type | DIRECT_COPY | — |
| defect | .defect | DIRECT_COPY | — |
| defect_item | .defect_item | DIRECT_COPY | — |
| item | .item | DIRECT_COPY | — |
| qty | .qty | DIRECT_COPY | — |
| qty_reserved | .qty_reserved | DIRECT_COPY | — |
| spare | .spare | DIRECT_COPY | — |
| ipc | .ipc | DIRECT_COPY | — |
| reserved | .reserved | DIRECT_COPY | — |

## 📦 qx_ppmtx_gold_fact_inventory_transaction

| Gold Column | Silver Source | Transformation | Logic |
|---|---|---|---|
| fact_inventory_transaction_key | .transaction_no | GENERATED | HASH(transaction_no, batch) |
| dim_part_key | .pn | LOOKUP | JOIN dim_part |
| dim_aircraft_key | .ac | LOOKUP | JOIN dim_aircraft |
| dim_station_key | .location | LOOKUP | JOIN dim_station |
| transaction_date_key | .modified_date | DERIVED_CALCULATION | date to INT key |
| transaction_no | .transaction_no | DIRECT_COPY | — |
| batch | .batch | DIRECT_COPY | — |
| transaction_type | .transaction_type | DIRECT_COPY | — |
| sn | .sn | DIRECT_COPY | — |
| condition | .condition | DIRECT_COPY | — |
| qty | .qty | DIRECT_COPY | — |
| order_type | .order_type | DIRECT_COPY | — |
| order_no | .order_no | DIRECT_COPY | — |
| wo | .wo | DIRECT_COPY | — |

## 📦 qx_ppmtx_gold_fact_inventory_snapshot

| Gold Column | Silver Source | Transformation | Logic |
|---|---|---|---|
| fact_inventory_snapshot_key | .batch | GENERATED | HASH(batch) |
| dim_part_key | .pn | LOOKUP | JOIN dim_part |
| dim_aircraft_key | .installed_ac | LOOKUP | JOIN dim_aircraft |
| dim_station_key | .location | LOOKUP | JOIN dim_station |
| snapshot_date_key | .modified_date | DERIVED_CALCULATION | date to INT key |
| batch | .batch | DIRECT_COPY | — |
| sn | .sn | DIRECT_COPY | — |
| nha_pn | .nha_pn | DIRECT_COPY | — |
| nha_sn | .nha_sn | DIRECT_COPY | — |
| condition | .condition | DIRECT_COPY | — |
| owner | .owner | DIRECT_COPY | — |
| unit_cost | .unit_cost | DIRECT_COPY | — |
| currency | .currency | DIRECT_COPY | — |
| location | .location | DIRECT_COPY | — |
| installed_ac | .installed_ac | DIRECT_COPY | — |
| installed_position | .installed_position | DIRECT_COPY | — |

## 📦 qx_ppmtx_gold_fact_inventory_control

| Gold Column | Silver Source | Transformation | Logic |
|---|---|---|---|
| fact_inventory_control_key | .pn | GENERATED | HASH(pn, sn, control) |
| dim_part_key | .pn | LOOKUP | JOIN dim_part |
| schedule_date_key | .schedule_date | DERIVED_CALCULATION | date to INT key |
| reset_date_key | .reset_date | DERIVED_CALCULATION | date to INT key |
| pn | .pn | DIRECT_COPY | — |
| sn | .sn | DIRECT_COPY | — |
| control | .control | DIRECT_COPY | — |
| schedule_hours | .schedule_hours | DIRECT_COPY | — |
| schedule_cycles | .schedule_cycles | DIRECT_COPY | — |
| schedule_days | .schedule_days | DIRECT_COPY | — |
| actual_hours | .actual_hours | DIRECT_COPY | — |
| actual_minutes | .actual_minutes | DIRECT_COPY | — |
| actual_cycles | .actual_cycles | DIRECT_COPY | — |
| actual_days | .actual_days | DIRECT_COPY | — |
| remaining_hours | .schedule_hours | DERIVED_CALCULATION | schedule_hours - actual_hours |
| remaining_cycles | .schedule_cycles | DERIVED_CALCULATION | schedule_cycles - actual_cycles |
| remaining_days | .schedule_days | DERIVED_CALCULATION | schedule_days - actual_days |

## 🛠️ qx_ppmtx_gold_fact_order

| Gold Column | Silver Source | Transformation | Logic |
|---|---|---|---|
| fact_order_key | .order_number | GENERATED | HASH(order_type, order_number, order_line) |
| dim_part_key | .pn | LOOKUP | JOIN dim_part |
| order_date_key | .modified_date | DERIVED_CALCULATION | date to INT key |
| order_type | .order_type | DIRECT_COPY | — |
| order_number | .order_number | DIRECT_COPY | — |
| order_line | .order_line | DIRECT_COPY | — |
| status | .status | DIRECT_COPY | — |
| sn | .sn | DIRECT_COPY | — |
| batch | .batch | DIRECT_COPY | — |
| pn_description | .pn_description | DIRECT_COPY | — |
| exchange_pn | .exchange_pn | DIRECT_COPY | — |
| exchange_sn | .exchange_sn | DIRECT_COPY | — |
| exchange_repair_cost | .exchange_repair_cost | DIRECT_COPY | — |
| qty_require | .qty_require | DIRECT_COPY | — |
| qty_received | .qty_received | DIRECT_COPY | — |
| qty_available | .qty_available | DIRECT_COPY | — |
| lead_time | .lead_time | DIRECT_COPY | — |

## 🛠️ qx_ppmtx_gold_fact_teardown

| Gold Column | Silver Source | Transformation | Logic |
|---|---|---|---|
| fact_teardown_key | .order_number | GENERATED | HASH(order_type, order_number, order_line) |
| dim_part_key | .pn | LOOKUP | JOIN dim_part |
| dim_ata_chapter_key | — | LOOKUP | via defect linkage |
| created_date_key | .created_date | DERIVED_CALCULATION | date to INT key |
| order_type | .order_type | DIRECT_COPY | — |
| order_number | .order_number | DIRECT_COPY | — |
| order_line | .order_line | DIRECT_COPY | — |
| sn | .sn | DIRECT_COPY | — |
| batch | .batch | DIRECT_COPY | — |
| fault_confirm | .fault_confirm | DIRECT_COPY | — |
| status | .status | DIRECT_COPY | — |
| pn_description | .pn_description | DIRECT_COPY | — |
| work_done | .work_done | DIRECT_COPY | — |
| shop_finding | .shop_finding | DIRECT_COPY | — |
| defect_type | .defect_type | DIRECT_COPY | — |
| defect | .defect | DIRECT_COPY | — |
| defect_item | .defect_item | DIRECT_COPY | — |
