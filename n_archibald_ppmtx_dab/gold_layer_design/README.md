# Gold Layer Design — QX Predictive Maintenance

> **Navigation hub for all Gold layer design artifacts**

---

## Quick Links

| Document | Purpose |
|----------|---------|
| [DESIGN_DECISIONS.md](DESIGN_DECISIONS.md) | Design contracts (FK format, descriptions, transformation types, table inventory) |
| [DESIGN_SUMMARY.md](DESIGN_SUMMARY.md) | High-level design overview and PRD alignment |
| [DESIGN_GAP_ANALYSIS.md](DESIGN_GAP_ANALYSIS.md) | Known gaps, mitigations, and future recommendations |
| [erd_master.md](erd_master.md) | Master ERD with all 13 tables |
| [COLUMN_LINEAGE.csv](COLUMN_LINEAGE.csv) | Machine-readable column lineage |
| [COLUMN_LINEAGE.md](COLUMN_LINEAGE.md) | Human-readable column lineage |
| [SOURCE_TABLE_MAPPING.csv](SOURCE_TABLE_MAPPING.csv) | Source table inclusion/exclusion rationale |
| [docs/BUSINESS_ONBOARDING_GUIDE.md](docs/BUSINESS_ONBOARDING_GUIDE.md) | Business onboarding with real-world scenarios |

---

## ERD Diagrams

| ERD | Tables | File |
|-----|--------|------|
| **Master** (all tables) | 13 | [erd_master.md](erd_master.md) |
| 🔧 Part Master | 1 | [erd/erd_part_master.md](erd/erd_part_master.md) |
| ✈️ Component Lifecycle | 3 | [erd/erd_component_lifecycle.md](erd/erd_component_lifecycle.md) |
| ⚠️ Defect Management | 3 | [erd/erd_defect_management.md](erd/erd_defect_management.md) |
| 📦 Inventory & Spares | 3 | [erd/erd_inventory_spares.md](erd/erd_inventory_spares.md) |
| 🛠️ Procurement & Overhaul | 2 | [erd/erd_procurement_overhaul.md](erd/erd_procurement_overhaul.md) |

---

## YAML Schemas (by domain)

### 🔧 Part Master
- [yaml/part_master/qx_ppmtx_gold_dim_part.yaml](yaml/part_master/qx_ppmtx_gold_dim_part.yaml)

### ✈️ Component Lifecycle
- [yaml/component_lifecycle/qx_ppmtx_gold_dim_aircraft.yaml](yaml/component_lifecycle/qx_ppmtx_gold_dim_aircraft.yaml)
- [yaml/component_lifecycle/qx_ppmtx_gold_dim_station.yaml](yaml/component_lifecycle/qx_ppmtx_gold_dim_station.yaml)
- [yaml/component_lifecycle/qx_ppmtx_gold_fact_component_removal.yaml](yaml/component_lifecycle/qx_ppmtx_gold_fact_component_removal.yaml)

### ⚠️ Defect Management
- [yaml/defect_management/qx_ppmtx_gold_dim_ata_chapter.yaml](yaml/defect_management/qx_ppmtx_gold_dim_ata_chapter.yaml)
- [yaml/defect_management/qx_ppmtx_gold_fact_defect.yaml](yaml/defect_management/qx_ppmtx_gold_fact_defect.yaml)
- [yaml/defect_management/qx_ppmtx_gold_bridge_defect_part.yaml](yaml/defect_management/qx_ppmtx_gold_bridge_defect_part.yaml)

### 📦 Inventory & Spares
- [yaml/inventory_spares/qx_ppmtx_gold_fact_inventory_transaction.yaml](yaml/inventory_spares/qx_ppmtx_gold_fact_inventory_transaction.yaml)
- [yaml/inventory_spares/qx_ppmtx_gold_fact_inventory_snapshot.yaml](yaml/inventory_spares/qx_ppmtx_gold_fact_inventory_snapshot.yaml)
- [yaml/inventory_spares/qx_ppmtx_gold_fact_inventory_control.yaml](yaml/inventory_spares/qx_ppmtx_gold_fact_inventory_control.yaml)

### 🛠️ Procurement & Overhaul
- [yaml/procurement_overhaul/qx_ppmtx_gold_fact_order.yaml](yaml/procurement_overhaul/qx_ppmtx_gold_fact_order.yaml)
- [yaml/procurement_overhaul/qx_ppmtx_gold_fact_teardown.yaml](yaml/procurement_overhaul/qx_ppmtx_gold_fact_teardown.yaml)

### 📅 Common
- [yaml/common/qx_ppmtx_gold_dim_date.yaml](yaml/common/qx_ppmtx_gold_dim_date.yaml)

---

## Target Location

- **Catalog:** `subject_maintenanceengineering`
- **Schema:** `an_maintenanceengineering_ods`
- **Table prefix:** `qx_ppmtx_gold_`

---

## Next Step

After stakeholder review, proceed to implementation:

```
Read: data_product_accelerator/skills/gold/01-gold-layer-setup/SKILL.md
```
