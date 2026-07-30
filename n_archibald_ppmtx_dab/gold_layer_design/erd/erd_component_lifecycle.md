# Domain ERD — ✈️ Component Lifecycle

> Part removal/installation events with aircraft, station, and time context.

```mermaid
erDiagram
    qx_ppmtx_gold_dim_aircraft {
        BIGINT dim_aircraft_key PK
        STRING ac
        STRING aircraft_type
    }

    qx_ppmtx_gold_dim_station {
        BIGINT dim_station_key PK
        STRING station_code
        STRING station_name
    }

    qx_ppmtx_gold_fact_component_removal {
        BIGINT fact_component_removal_key PK
        BIGINT dim_part_key
        BIGINT dim_aircraft_key
        BIGINT dim_station_key
        BIGINT dim_ata_chapter_key
        INT transaction_date_key
        STRING transaction
        DECIMAL transaction_item
        STRING transaction_type
        STRING transaction_type_control
        STRING sn
        STRING nha_pn
        STRING nha_sn
        STRING position
        STRING reason_category
        STRING schedule_category
        DECIMAL hours_installed
        DECIMAL minutes_installed
        DECIMAL cycles_installed
        DECIMAL days_installed
        DECIMAL qty
        STRING tag_no
        STRING removal_reason
        STRING status
    }

    %% Cross-domain references
    qx_ppmtx_gold_dim_part["🔧 dim_part (Part Master)"] ||--o{ qx_ppmtx_gold_fact_component_removal : "by_dim_part_key"
    qx_ppmtx_gold_dim_aircraft ||--o{ qx_ppmtx_gold_fact_component_removal : "by_dim_aircraft_key"
    qx_ppmtx_gold_dim_station ||--o{ qx_ppmtx_gold_fact_component_removal : "by_dim_station_key"
    qx_ppmtx_gold_dim_ata_chapter["⚠️ dim_ata_chapter (Defect Mgmt)"] ||--o{ qx_ppmtx_gold_fact_component_removal : "by_dim_ata_chapter_key"
    qx_ppmtx_gold_dim_date["📅 dim_date (Common)"] ||--o{ qx_ppmtx_gold_fact_component_removal : "by_transaction_date_key"
```
