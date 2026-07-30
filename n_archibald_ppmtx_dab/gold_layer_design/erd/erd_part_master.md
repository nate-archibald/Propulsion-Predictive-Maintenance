# Domain ERD — 🔧 Part Master

> Central part number dimension referenced by all fact tables.

```mermaid
erDiagram
    qx_ppmtx_gold_dim_part {
        BIGINT dim_part_key PK
        STRING pn
        STRING pn_description
        STRING category
        STRING sub_category
        STRING expenditure
        STRING stock_uom
        STRING shelf_life_flag
        DECIMAL shelf_life_days
        STRING tool_calibration_flag
        DECIMAL tool_life_days
        STRING ri_flag
        STRING pn_supersede
        DECIMAL standard_cost
        DECIMAL average_cost
        STRING gl_company
        STRING gl_expenditure
    }

    %% Referencing facts (cross-domain)
    qx_ppmtx_gold_dim_part ||--o{ qx_ppmtx_gold_fact_component_removal["✈️ fact_component_removal"] : "by_dim_part_key"
    qx_ppmtx_gold_dim_part ||--o{ qx_ppmtx_gold_fact_defect["⚠️ bridge_defect_part"] : "by_dim_part_key"
    qx_ppmtx_gold_dim_part ||--o{ qx_ppmtx_gold_fact_inventory_transaction["📦 fact_inventory_transaction"] : "by_dim_part_key"
    qx_ppmtx_gold_dim_part ||--o{ qx_ppmtx_gold_fact_inventory_snapshot["📦 fact_inventory_snapshot"] : "by_dim_part_key"
    qx_ppmtx_gold_dim_part ||--o{ qx_ppmtx_gold_fact_inventory_control["📦 fact_inventory_control"] : "by_dim_part_key"
    qx_ppmtx_gold_dim_part ||--o{ qx_ppmtx_gold_fact_order["🛠️ fact_order"] : "by_dim_part_key"
    qx_ppmtx_gold_dim_part ||--o{ qx_ppmtx_gold_fact_teardown["🛠️ fact_teardown"] : "by_dim_part_key"
```
