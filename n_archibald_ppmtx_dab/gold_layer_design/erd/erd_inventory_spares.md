# Domain ERD — 📦 Inventory & Spares

> Inventory transactions, current position snapshots, and maintenance control schedules.

```mermaid
erDiagram
    qx_ppmtx_gold_fact_inventory_transaction {
        BIGINT fact_inventory_transaction_key PK
        BIGINT dim_part_key
        BIGINT dim_aircraft_key
        BIGINT dim_station_key
        INT transaction_date_key
        DECIMAL transaction_no
        DECIMAL batch
        STRING transaction_type
        STRING condition
        DECIMAL qty
        STRING order_type
        DECIMAL order_no
        DECIMAL order_line
        DECIMAL wo
    }

    qx_ppmtx_gold_fact_inventory_snapshot {
        BIGINT fact_inventory_snapshot_key PK
        BIGINT dim_part_key
        BIGINT dim_aircraft_key
        BIGINT dim_station_key
        INT snapshot_date_key
        DECIMAL batch
        STRING sn
        STRING nha_pn
        STRING nha_sn
        STRING condition
        STRING owner
        DECIMAL unit_cost
        STRING currency
        STRING location
        STRING installed_ac
        STRING installed_position
    }

    qx_ppmtx_gold_fact_inventory_control {
        BIGINT fact_inventory_control_key PK
        BIGINT dim_part_key
        INT schedule_date_key
        INT reset_date_key
        STRING sn
        STRING control
        DECIMAL schedule_hours
        DECIMAL schedule_cycles
        DECIMAL schedule_days
        DECIMAL actual_hours
        DECIMAL actual_minutes
        DECIMAL actual_cycles
        DECIMAL actual_days
    }

    %% Cross-domain references
    qx_ppmtx_gold_dim_part["🔧 dim_part (Part Master)"] ||--o{ qx_ppmtx_gold_fact_inventory_transaction : "by_dim_part_key"
    qx_ppmtx_gold_dim_aircraft["✈️ dim_aircraft (Lifecycle)"] ||--o{ qx_ppmtx_gold_fact_inventory_transaction : "by_dim_aircraft_key"
    qx_ppmtx_gold_dim_station["✈️ dim_station (Lifecycle)"] ||--o{ qx_ppmtx_gold_fact_inventory_transaction : "by_dim_station_key"
    qx_ppmtx_gold_dim_date["📅 dim_date (Common)"] ||--o{ qx_ppmtx_gold_fact_inventory_transaction : "by_transaction_date_key"

    qx_ppmtx_gold_dim_part ||--o{ qx_ppmtx_gold_fact_inventory_snapshot : "by_dim_part_key"
    qx_ppmtx_gold_dim_aircraft ||--o{ qx_ppmtx_gold_fact_inventory_snapshot : "by_dim_aircraft_key"
    qx_ppmtx_gold_dim_station ||--o{ qx_ppmtx_gold_fact_inventory_snapshot : "by_dim_station_key"
    qx_ppmtx_gold_dim_date ||--o{ qx_ppmtx_gold_fact_inventory_snapshot : "by_snapshot_date_key"

    qx_ppmtx_gold_dim_part ||--o{ qx_ppmtx_gold_fact_inventory_control : "by_dim_part_key"
    qx_ppmtx_gold_dim_date ||--o{ qx_ppmtx_gold_fact_inventory_control : "by_schedule_date_key"
```
