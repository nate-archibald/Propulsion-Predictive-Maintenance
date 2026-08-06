# Lakebase Schema Discovery

> Auto-generated from a serverless profiling job (Spark on the UC gold source tables + Postgres `information_schema`).
> **Postgres database:** `databricks_postgres` | **schema:** `an_maintenanceengineering_ods` | **project:** `nathan-a-ppmtx`
> Postgres synced-table column names are lowercase and identical to the Spark column names below (verified via `information_schema`).
> Query synced tables as `an_maintenanceengineering_ods.<synced_table>` (e.g. `an_maintenanceengineering_ods.qx_ppmtx_synced_gold_fact_defect`).

| # | Synced table (Postgres) | Source gold table | Rows |
|---|---|---|---|
| 1 | `qx_ppmtx_synced_gold_dim_date` | `qx_ppmtx_gold_dim_date` | 5,844 |
| 2 | `qx_ppmtx_synced_gold_dim_part` | `qx_ppmtx_gold_dim_part` | 89,344 |
| 3 | `qx_ppmtx_synced_gold_dim_aircraft` | `qx_ppmtx_gold_dim_aircraft` | 120 |
| 4 | `qx_ppmtx_synced_gold_dim_station` | `qx_ppmtx_gold_dim_station` | 129 |
| 5 | `qx_ppmtx_synced_gold_dim_ata_chapter` | `qx_ppmtx_gold_dim_ata_chapter` | 1,142 |
| 6 | `qx_ppmtx_synced_gold_fact_defect` | `qx_ppmtx_gold_fact_defect` | 172,982 |
| 7 | `qx_ppmtx_synced_gold_fact_component_removal` | `qx_ppmtx_gold_fact_component_removal` | 751,774 |
| 8 | `qx_ppmtx_synced_gold_fact_inventory_transaction` | `qx_ppmtx_gold_fact_inventory_transaction` | 13,950,200 |
| 9 | `qx_ppmtx_synced_gold_fact_inventory_snapshot` | `qx_ppmtx_gold_fact_inventory_snapshot` | 147,532 |
| 10 | `qx_ppmtx_synced_gold_fact_inventory_control` | `qx_ppmtx_gold_fact_inventory_control` | 638,264 |
| 11 | `qx_ppmtx_synced_gold_fact_order` | `qx_ppmtx_gold_fact_order` | 1,406,198 |
| 12 | `qx_ppmtx_synced_gold_fact_teardown` | `qx_ppmtx_gold_fact_teardown` | 78,372 |
| 13 | `qx_ppmtx_synced_gold_bridge_defect_part` | `qx_ppmtx_gold_bridge_defect_part` | 44,334 |

---

## `qx_ppmtx_synced_gold_dim_date`

- **Source:** `subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_dim_date`
- **Rows:** 5,844

| Column | Type | Nulls | Enum values (<=40 distinct) |
|---|---|---|---|
| `dim_date_key` | int | 0 |  |
| `calendar_date` | date | 0 |  |
| `year` | int | 0 |  |
| `quarter` | int | 0 |  |
| `month` | int | 0 |  |
| `week_of_year` | int | 0 |  |
| `day_of_month` | int | 0 |  |
| `day_name` | string | 0 | `Friday`, `Monday`, `Saturday`, `Sunday`, `Thursday`, `Tuesday`, `Wednesday` |
| `month_name` | string | 0 | `April`, `August`, `December`, `February`, `January`, `July`, `June`, `March`, `May`, `November`, `October`, `September` |

## `qx_ppmtx_synced_gold_dim_part`

- **Source:** `subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_dim_part`
- **Rows:** 89,344

| Column | Type | Nulls | Enum values (<=40 distinct) |
|---|---|---|---|
| `dim_part_key` | bigint | 0 |  |
| `pn` | string | 0 | _high-cardinality_ |
| `pn_description` | string | 0 | _high-cardinality_ |
| `category` | string | 0 | `CHEMICAL`, `CONSMBLE`, `ENG_E175`, `ENG_Q400`, `EXPNDBLE`, `GSE PART`, `KIT`, `REPAF175`, `REPAP175`, `REPEN175`, `REP_AF`, `REP_AP`, `REP_EN`, `REP_PR`, `ROTAF175`, `ROTAP175`, `ROTAV175`, `ROTEN175`, `ROTLG175`, `ROTWB175`, `ROT_AF`, `ROT_AP`, `ROT_AV`, `ROT_EN`, `ROT_LG`, `ROT_PR`, `ROT_WB`, `TOOLING` |
| `sub_category` | string | 88,029 | ` `, `APU`, `DISK`, `ENGINE`, `ENGINE `, `MODULE`, `NONE` |
| `expenditure` | string | 89,344 |  |
| `stock_uom` | string | 0 | `BOX`, `BOX100`, `BOX20`, `CASE`, `DRUM`, `EA`, `FT`, `GL`, `IN`, `KIT`, `LB`, `LTR`, `MTR`, `PACK`, `PT`, `QT`, `ROLL`, `SET`, `SHEET`, `SQFT`, `SQIN`, `SQM`, `SQYD`, `TUBE`, `YD` |
| `shelf_life_flag` | string | 0 | `N`, `Y` |
| `shelf_life_days` | decimal(10,0) | 10 |  |
| `tool_calibration_flag` | string | 0 | `N`, `Y` |
| `tool_life_days` | decimal(10,0) | 5 |  |
| `ri_flag` | string | 0 | `N`, `Y` |
| `pn_supersede` | string | 89,040 | _high-cardinality_ |
| `standard_cost` | decimal(10,0) | 0 |  |
| `average_cost` | decimal(10,0) | 3 |  |
| `gl_company` | string | 5 | `QXA` |
| `gl_expenditure` | string | 5 | `03150`, `05105`, `05250`, `05260`, `49040` |

## `qx_ppmtx_synced_gold_dim_aircraft`

- **Source:** `subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_dim_aircraft`
- **Rows:** 120

| Column | Type | Nulls | Enum values (<=40 distinct) |
|---|---|---|---|
| `dim_aircraft_key` | bigint | 0 |  |
| `ac` | string | 0 | _high-cardinality_ |
| `aircraft_type` | string | 0 | `E175` |

## `qx_ppmtx_synced_gold_dim_station`

- **Source:** `subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_dim_station`
- **Rows:** 129

| Column | Type | Nulls | Enum values (<=40 distinct) |
|---|---|---|---|
| `dim_station_key` | bigint | 0 |  |
| `station_code` | string | 0 | _high-cardinality_ |
| `station_name` | string | 0 | _high-cardinality_ |

## `qx_ppmtx_synced_gold_dim_ata_chapter`

- **Source:** `subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_dim_ata_chapter`
- **Rows:** 1,142

| Column | Type | Nulls | Enum values (<=40 distinct) |
|---|---|---|---|
| `dim_ata_chapter_key` | bigint | 0 |  |
| `chapter` | decimal(10,0) | 0 |  |
| `section` | decimal(10,0) | 0 |  |
| `paragraph` | decimal(10,0) | 0 |  |
| `chapter_description` | string | 0 | _high-cardinality_ |

## `qx_ppmtx_synced_gold_fact_defect`

- **Source:** `subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_fact_defect`
- **Rows:** 172,982

| Column | Type | Nulls | Enum values (<=40 distinct) |
|---|---|---|---|
| `fact_defect_key` | bigint | 0 |  |
| `dim_aircraft_key` | bigint | 2 |  |
| `dim_ata_chapter_key` | bigint | 2 |  |
| `reported_date_key` | int | 2 |  |
| `resolved_date_key` | int | 849 |  |
| `defect_type` | string | 0 | `DAMAGE`, `MAINT`, `MRONR`, `PILOT`, `TECHREC`, `TO`, `VR`, `WO/DEFER` |
| `defect` | string | 0 | _high-cardinality_ |
| `defect_item` | decimal(10,0) | 0 |  |
| `status` | string | 0 | `CLOSED`, `OPEN` |
| `defect_description` | string | 15 | _high-cardinality_ |
| `defect_category` | string | 171,014 | `A12`, `A2`, `A8`, `C2`, `DAILY`, `LM`, `OILCHECK`, `UNSCHED` |
| `resolution_description` | string | 926 | _high-cardinality_ |
| `resolution_category` | string | 172,894 | ` `, `MAJOR`, `NOPART`, `S/N PART` |
| `delay` | string | 171,884 | `MECH` |
| `delays_hours` | decimal(10,0) | 162,953 |  |
| `delay_minutes` | decimal(10,0) | 162,977 |  |
| `cancellation` | string | 172,772 | `MECH` |
| `i_f_s_d` | string | 172,980 | ` ` |
| `fuel` | decimal(10,0) | 172,982 |  |
| `mel` | string | 155,711 | `A`, `B`, `C`, `D`, `NA` |
| `mel_number` | string | 155,354 | _high-cardinality_ |
| `defer` | string | 128,689 | `DURATION`, `ENGACT`, `FLTENG`, `LABOR`, `MTXCTL`, `OTHER`, `PARTS`, `PLNACT`, `RECDS` |
| `fault_confirm` | string | 0 | `CONFIRM`, `NOT/CONFIRM`, `PENDING` |
| `wo` | decimal(10,0) | 135,404 |  |
| `flight` | string | 116,741 | _high-cardinality_ |

## `qx_ppmtx_synced_gold_fact_component_removal`

- **Source:** `subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_fact_component_removal`
- **Rows:** 751,774

| Column | Type | Nulls | Enum values (<=40 distinct) |
|---|---|---|---|
| `fact_component_removal_key` | bigint | 0 |  |
| `dim_part_key` | bigint | 147,770 |  |
| `dim_aircraft_key` | bigint | 0 |  |
| `dim_station_key` | bigint | 433,753 |  |
| `dim_ata_chapter_key` | bigint | 424,676 |  |
| `transaction_date_key` | int | 0 |  |
| `transaction` | string | 0 | _high-cardinality_ |
| `transaction_item` | decimal(10,0) | 0 |  |
| `transaction_type` | string | 0 | `INSTALL`, `INT/INST`, `INTERCHG`, `REMOVE` |
| `transaction_type_control` | string | 272,616 | `EXCHANGE`, `INSTALL`, `REMOVE`, `REMOVE/INSTALL`, `SWAP` |
| `sn` | string | 6 | _high-cardinality_ |
| `nha_pn` | string | 537,420 | _high-cardinality_ |
| `nha_sn` | string | 537,431 | _high-cardinality_ |
| `position` | string | 637 | _high-cardinality_ |
| `reason_category` | string | 195,254 | `5061`, `BAD`, `DAMAGE`, `ERROR`, `FAILED`, `FOM`, `INOP`, `INST`, `INSTALL`, `INTERCHG`, `LIFE`, `MISSING`, `MOD`, `NEW`, `ORIG`, `ROB`, `ROB `, `RTNE`, `SCAM`, `SCHC`, `SCHD`, `SERVABLE`, `SRVCABLE`, `SWAP`, `TRBL-UNS`, `TROUBLE`, `TROUBLE `, `UNKN`, `UNSC`, `WORN` |
| `schedule_category` | string | 6,191 | `NLA`, `SCHEDULE`, `SWAP`, `UN/SCHEDULE` |
| `hours_installed` | decimal(10,0) | 25,992 |  |
| `minutes_installed` | decimal(10,0) | 25,992 |  |
| `cycles_installed` | decimal(10,0) | 25,992 |  |
| `days_installed` | decimal(10,0) | 25,925 |  |
| `qty` | decimal(10,0) | 751,774 |  |
| `defect_type` | string | 678,467 | ` `, `  `, `DAMAGE`, `MAINT`, `MRONR`, `PILOT`, `TECHREC`, `TO`, `VR` |
| `defect` | string | 678,630 | _high-cardinality_ |
| `wo` | decimal(10,0) | 336,510 |  |
| `tag_no` | string | 743,219 | _high-cardinality_ |
| `removal_reason` | string | 695,947 | _high-cardinality_ |
| `status` | string | 159,403 | `CLOSED` |

## `qx_ppmtx_synced_gold_fact_inventory_transaction`

- **Source:** `subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_fact_inventory_transaction`
- **Rows:** 13,950,200

| Column | Type | Nulls | Enum values (<=40 distinct) |
|---|---|---|---|
| `fact_inventory_transaction_key` | bigint | 0 |  |
| `dim_part_key` | bigint | 2,864,240 |  |
| `dim_aircraft_key` | bigint | 11,116,232 |  |
| `dim_station_key` | bigint | 2,273,059 |  |
| `transaction_date_key` | int | 0 |  |
| `transaction_no` | decimal(10,0) | 0 |  |
| `batch` | decimal(10,0) | 0 |  |
| `transaction_type` | string | 0 | _high-cardinality_ |
| `sn` | string | 6,771,876 | _high-cardinality_ |
| `condition` | string | 2,394,186 | _high-cardinality_ |
| `qty` | decimal(10,0) | 0 |  |
| `order_type` | string | 6,485,815 | _high-cardinality_ |
| `order_no` | decimal(10,0) | 6,133,670 |  |
| `wo` | decimal(10,0) | 7,876,360 |  |

## `qx_ppmtx_synced_gold_fact_inventory_snapshot`

- **Source:** `subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_fact_inventory_snapshot`
- **Rows:** 147,532

| Column | Type | Nulls | Enum values (<=40 distinct) |
|---|---|---|---|
| `fact_inventory_snapshot_key` | bigint | 0 |  |
| `dim_part_key` | bigint | 14,709 |  |
| `dim_aircraft_key` | bigint | 66,425 |  |
| `dim_station_key` | bigint | 84,077 |  |
| `snapshot_date_key` | int | 0 |  |
| `batch` | decimal(10,0) | 0 |  |
| `sn` | string | 52,713 | _high-cardinality_ |
| `nha_pn` | string | 125,542 | _high-cardinality_ |
| `nha_sn` | string | 125,585 | _high-cardinality_ |
| `condition` | string | 203 | `AR`, `BADSTOCK`, `BENCHCK`, `CAL`, `INSPTEST`, `MOD`, `NEW`, `OH`, `ORIG`, `REPAIR`, `SCRP`, `SOS`, `SV`, `TX`, `U/S` |
| `owner` | string | 147,407 | `V00103`, `V00145`, `V00317`, `V00914`, `V01834`, `V05865`, `V05868`, `V12595`, `V14075`, `V17320`, `V19139`, `V21800`, `V32672`, `V50100`, `V5058`, `V5087`, `V7072` |
| `unit_cost` | decimal(10,0) | 0 |  |
| `currency` | string | 91,447 | `USD` |
| `location` | string | 84,077 | _high-cardinality_ |
| `installed_ac` | string | 66,425 | _high-cardinality_ |
| `installed_position` | string | 66,425 | _high-cardinality_ |

## `qx_ppmtx_synced_gold_fact_inventory_control`

- **Source:** `subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_fact_inventory_control`
- **Rows:** 638,264

| Column | Type | Nulls | Enum values (<=40 distinct) |
|---|---|---|---|
| `fact_inventory_control_key` | bigint | 0 |  |
| `dim_part_key` | bigint | 94,216 |  |
| `schedule_date_key` | int | 638,262 |  |
| `reset_date_key` | int | 0 |  |
| `pn` | string | 0 | _high-cardinality_ |
| `sn` | string | 0 | _high-cardinality_ |
| `control` | string | 0 | `DISCARD`, `DS`, `FC`, `LL`, `OTHER`, `RS`, `RS-CAL`, `RS-CLEAN`, `RS-FUNC`, `RS-HYDRO`, `RS-LL`, `RS-OH`, `RS-SOFT`, `SDI`, `SDI-NDT`, `TSN`, `TSO`, `TSR` |
| `schedule_hours` | decimal(10,0) | 1,049 |  |
| `schedule_cycles` | decimal(10,0) | 942 |  |
| `schedule_days` | decimal(10,0) | 942 |  |
| `actual_hours` | decimal(10,0) | 1 |  |
| `actual_minutes` | decimal(10,0) | 0 |  |
| `actual_cycles` | decimal(10,0) | 2,676 |  |
| `actual_days` | decimal(10,0) | 1 |  |
| `remaining_hours` | decimal(10,0) | 1,050 |  |
| `remaining_cycles` | decimal(10,0) | 3,618 |  |
| `remaining_days` | decimal(10,0) | 943 |  |

## `qx_ppmtx_synced_gold_fact_order`

- **Source:** `subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_fact_order`
- **Rows:** 1,406,198

| Column | Type | Nulls | Enum values (<=40 distinct) |
|---|---|---|---|
| `fact_order_key` | bigint | 0 |  |
| `dim_part_key` | bigint | 280,965 |  |
| `order_date_key` | int | 0 |  |
| `order_type` | string | 0 | `EX`, `LO`, `MO`, `PO`, `RN`, `RO`, `SV`, `TO`, `TP`, `TS`, `WC`, `XO` |
| `order_number` | decimal(10,0) | 0 |  |
| `order_line` | decimal(10,0) | 0 |  |
| `status` | string | 0 | `CANCEL`, `CLOSED`, `OPEN` |
| `sn` | string | 849,478 | _high-cardinality_ |
| `batch` | decimal(10,0) | 288,032 |  |
| `pn_description` | string | 280 | _high-cardinality_ |
| `exchange_pn` | string | 1,382,458 | _high-cardinality_ |
| `exchange_sn` | string | 1,385,456 | _high-cardinality_ |
| `exchange_repair_cost` | decimal(10,0) | 730,485 |  |
| `qty_require` | decimal(10,0) | 21 |  |
| `qty_received` | decimal(10,0) | 0 |  |
| `qty_available` | decimal(10,0) | 240 |  |
| `lead_time` | decimal(10,0) | 1,404,100 |  |

## `qx_ppmtx_synced_gold_fact_teardown`

- **Source:** `subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_fact_teardown`
- **Rows:** 78,372

| Column | Type | Nulls | Enum values (<=40 distinct) |
|---|---|---|---|
| `fact_teardown_key` | bigint | 0 |  |
| `dim_part_key` | bigint | 17,274 |  |
| `dim_ata_chapter_key` | bigint | 78,372 |  |
| `created_date_key` | int | 0 |  |
| `order_type` | string | 0 | `EX`, `LO`, `PO`, `RO`, `TO`, `W/O`, `XO` |
| `order_number` | decimal(10,0) | 0 |  |
| `order_line` | decimal(10,0) | 0 |  |
| `sn` | string | 1,001 | _high-cardinality_ |
| `batch` | decimal(10,0) | 0 |  |
| `fault_confirm` | string | 2,715 | `CONFIRM`, `NOT/CONFIRM`, `PENDING`, `Y` |
| `status` | string | 67,592 | `CLOSED` |
| `pn_description` | string | 10,780 | _high-cardinality_ |
| `work_done` | string | 377 | _high-cardinality_ |
| `shop_finding` | string | 20,359 | _high-cardinality_ |
| `defect_type` | string | 61,315 | ` `, `  `, `MAINT`, `MRONR`, `PILOT`, `TECHREC`, `TO`, `VR` |
| `defect` | string | 61,338 | _high-cardinality_ |
| `defect_item` | decimal(10,0) | 36,723 |  |

## `qx_ppmtx_synced_gold_bridge_defect_part`

- **Source:** `subject_maintenanceengineering_test.an_maintenanceengineering_ods.qx_ppmtx_gold_bridge_defect_part`
- **Rows:** 44,334

| Column | Type | Nulls | Enum values (<=40 distinct) |
|---|---|---|---|
| `bridge_defect_part_key` | bigint | 0 |  |
| `dim_part_key` | bigint | 8,464 |  |
| `defect_type` | string | 0 | `DAMAGE`, `MAINT`, `PILOT`, `TO`, `VR`, `WO/DEFER` |
| `defect` | string | 0 | _high-cardinality_ |
| `defect_item` | decimal(10,0) | 0 |  |
| `item` | decimal(10,0) | 0 |  |
| `qty` | decimal(10,0) | 0 |  |
| `qty_reserved` | decimal(10,0) | 44,334 |  |
| `spare` | string | 0 | `OTHER`, `SPARE` |
| `ipc` | string | 33,875 | _high-cardinality_ |
| `reserved` | string | 0 | `NO`, `YES` |

