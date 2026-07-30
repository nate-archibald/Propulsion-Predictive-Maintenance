# Domain ERD — 🛠️ Procurement & Overhaul

> Maintenance orders and component teardown findings linked to parts.

```mermaid
erDiagram
    qx_ppmtx_gold_fact_order {
        BIGINT fact_order_key PK
        BIGINT dim_part_key
        INT order_date_key
        STRING order_type
        DECIMAL order_number
        DECIMAL order_line
        STRING status
        STRING sn
        DECIMAL batch
        STRING pn_description
        STRING exchange_pn
        STRING exchange_sn
        DECIMAL exchange_repair_cost
        DECIMAL qty_require
        DECIMAL qty_received
        DECIMAL qty_available
        DECIMAL lead_time
    }

    qx_ppmtx_gold_fact_teardown {
        BIGINT fact_teardown_key PK
        BIGINT dim_part_key
        BIGINT dim_ata_chapter_key
        INT created_date_key
        STRING order_type
        DECIMAL order_number
        DECIMAL order_line
        STRING sn
        DECIMAL batch
        STRING fault_confirm
        STRING status
        STRING pn_description
        STRING work_done
        STRING shop_finding
        STRING defect_type
        STRING defect
        DECIMAL defect_item
    }

    %% Cross-domain references
    qx_ppmtx_gold_dim_part["🔧 dim_part (Part Master)"] ||--o{ qx_ppmtx_gold_fact_order : "by_dim_part_key"
    qx_ppmtx_gold_dim_date["📅 dim_date (Common)"] ||--o{ qx_ppmtx_gold_fact_order : "by_order_date_key"

    qx_ppmtx_gold_dim_part ||--o{ qx_ppmtx_gold_fact_teardown : "by_dim_part_key"
    qx_ppmtx_gold_dim_ata_chapter["⚠️ dim_ata_chapter (Defect Mgmt)"] ||--o{ qx_ppmtx_gold_fact_teardown : "by_dim_ata_chapter_key"
    qx_ppmtx_gold_dim_date ||--o{ qx_ppmtx_gold_fact_teardown : "by_created_date_key"

    qx_ppmtx_gold_fact_order ||--o{ qx_ppmtx_gold_fact_teardown : "by_order_composite"
```
