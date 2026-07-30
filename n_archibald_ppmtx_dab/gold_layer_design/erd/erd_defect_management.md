# Domain ERD — ⚠️ Defect Management

> Aircraft defect tracking with part linkage bridge for root cause analysis.

```mermaid
erDiagram
    qx_ppmtx_gold_dim_ata_chapter {
        BIGINT dim_ata_chapter_key PK
        DECIMAL chapter
        DECIMAL section
        DECIMAL paragraph
        STRING chapter_description
    }

    qx_ppmtx_gold_fact_defect {
        BIGINT fact_defect_key PK
        BIGINT dim_aircraft_key
        BIGINT dim_ata_chapter_key
        INT reported_date_key
        INT resolved_date_key
        STRING defect_type
        STRING defect
        DECIMAL defect_item
        STRING status
        STRING defect_description
        STRING defect_category
        STRING resolution_description
        STRING resolution_category
        STRING delay
        DECIMAL delays_hours
        DECIMAL delay_minutes
        STRING cancellation
        STRING i_f_s_d
        STRING mel
        STRING mel_number
        STRING defer
        STRING fault_confirm
        DECIMAL wo
    }

    qx_ppmtx_gold_bridge_defect_part {
        BIGINT bridge_defect_part_key PK
        BIGINT dim_part_key
        STRING defect_type
        STRING defect
        DECIMAL defect_item
        DECIMAL item
        DECIMAL qty
        DECIMAL qty_reserved
        STRING spare
        STRING ipc
        STRING reserved
    }

    %% Cross-domain references
    qx_ppmtx_gold_dim_aircraft["✈️ dim_aircraft (Lifecycle)"] ||--o{ qx_ppmtx_gold_fact_defect : "by_dim_aircraft_key"
    qx_ppmtx_gold_dim_ata_chapter ||--o{ qx_ppmtx_gold_fact_defect : "by_dim_ata_chapter_key"
    qx_ppmtx_gold_dim_date["📅 dim_date (Common)"] ||--o{ qx_ppmtx_gold_fact_defect : "by_reported_date_key"
    qx_ppmtx_gold_dim_date ||--o{ qx_ppmtx_gold_fact_defect : "by_resolved_date_key"
    qx_ppmtx_gold_fact_defect ||--o{ qx_ppmtx_gold_bridge_defect_part : "by_defect_composite"
    qx_ppmtx_gold_dim_part["🔧 dim_part (Part Master)"] ||--o{ qx_ppmtx_gold_bridge_defect_part : "by_dim_part_key"
```
