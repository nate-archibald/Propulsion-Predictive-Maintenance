# Gold Layer Design Decisions

> **Project:** QX Predictive Maintenance — Propulsion Parts & Defects Intelligence
> **Catalog:** `subject_maintenanceengineering`
> **Schema:** `an_maintenanceengineering_ods`
> **Table Prefix:** `qx_ppmtx_gold_`
> **Date:** 2026-06-19

---

## 1. Table Inventory

| Table Name | Entity Type | Domain | SCD Type | Grain | Source Silver Table(s) |
|---|---|---|---|---|---|
| `qx_ppmtx_gold_dim_part` | dimension | part_master | Type 1 | One row per part number | `qx_ppmtx_pn_master` |
| `qx_ppmtx_gold_dim_aircraft` | dimension | component_lifecycle | Type 1 | One row per aircraft registration | `qx_ppmtx_ac_pn_transaction_history`, `qx_ppmtx_defect_report` |
| `qx_ppmtx_gold_dim_ata_chapter` | dimension | defect_management | Type 1 | One row per ATA chapter+section+paragraph | `qx_ppmtx_defect_report`, `qx_ppmtx_ac_pn_transaction_history` |
| `qx_ppmtx_gold_dim_station` | dimension | component_lifecycle | Type 1 | One row per station code | `qx_ppmtx_ac_pn_transaction_history`, `qx_ppmtx_pn_inventory_detail` |
| `qx_ppmtx_gold_dim_date` | dimension | common | N/A | One row per calendar date | GENERATED |
| `qx_ppmtx_gold_fact_component_removal` | fact | component_lifecycle | N/A | One row per (transaction, transaction_item) | `qx_ppmtx_ac_pn_transaction_history` |
| `qx_ppmtx_gold_fact_defect` | fact | defect_management | N/A | One row per (defect_type, defect, defect_item) | `qx_ppmtx_defect_report` |
| `qx_ppmtx_gold_fact_inventory_transaction` | fact | inventory_spares | N/A | One row per (transaction_no, batch) | `qx_ppmtx_pn_inventory_history` |
| `qx_ppmtx_gold_fact_inventory_snapshot` | fact | inventory_spares | N/A | One row per (batch) at snapshot date | `qx_ppmtx_pn_inventory_detail` |
| `qx_ppmtx_gold_fact_order` | fact | procurement_overhaul | N/A | One row per (order_type, order_number, order_line) | `qx_ppmtx_order_detail` |
| `qx_ppmtx_gold_fact_teardown` | fact | procurement_overhaul | N/A | One row per (order_type, order_number, order_line) | `qx_ppmtx_pn_tear_down_report` |
| `qx_ppmtx_gold_bridge_defect_part` | bridge | defect_management | N/A | One row per (defect_type, defect, defect_item, item) | `qx_ppmtx_defect_report_pn` |
| `qx_ppmtx_gold_fact_inventory_control` | fact | inventory_spares | N/A | One row per (pn, sn, control) | `qx_ppmtx_pn_inventory_control` |

### Classification Overrides

| Table | Heuristic Classification | Override | Reason |
|---|---|---|---|
| `qx_ppmtx_pn_master` | fact (many numeric columns) | dimension | Numeric columns (standard_cost, average_cost, shelf_life_days, tool_life_days) are descriptive attributes of a part, not additive measures. This is the central reference entity. |
| `qx_ppmtx_pn_inventory_detail` | fact | periodic snapshot fact | Contains current state of inventory with unit_cost as a measure, but grain is one row per batch (part instance). Used as a periodic snapshot. |
| `qx_ppmtx_pn_inventory_control` | fact | accumulating snapshot fact | schedule/actual hours/cycles/days are semi-additive measures tracking progress toward maintenance thresholds. |

---

## 2. FK Format Contract

Every `foreign_keys:` entry in YAML schemas MUST use this exact structure:

```yaml
foreign_keys:
  - columns: ["fk_column_name"]
    references: target_table(target_column)
    nullable: true   # or false
```

---

## 3. Description Format Contract

Every `description:` value MUST follow this pattern (no literal brackets):

```
One-sentence definition. Business: business context sentence. Technical: implementation details sentence.
```

**Examples:**
- `"Part number identifier. Business: the manufacturer-assigned identifier for a propulsion component type. Technical: natural key from TRAX pn_master source system."`
- `"Total delay minutes caused by this defect. Business: operational impact measured in minutes of flight delay attributed to this maintenance event. Technical: SUM of delay_minutes from Silver defect_report."`

---

## 4. Transformation Type Enum

The following 15 values are the ONLY permitted `lineage.transformation` values:

```
DIRECT_COPY | RENAME | CAST | AGGREGATE_SUM | AGGREGATE_SUM_CONDITIONAL
AGGREGATE_COUNT | AGGREGATE_AVG | DERIVED_CALCULATION | DERIVED_CONDITIONAL
HASH_MD5 | HASH_SHA256 | COALESCE | DATE_TRUNC | GENERATED | LOOKUP
```

**Edge-case mapping:**

| Source Pattern | Correct Type |
|---|---|
| Boolean-to-text conversion | `DERIVED_CONDITIONAL` |
| SCD2 effective_to close | `GENERATED` |
| SCD2 is_current flag | `GENERATED` |
| Join to another table | `LOOKUP` |
| Rename + type change | `RENAME` |
| Surrogate key generation | `GENERATED` |
| Composite key concatenation | `DERIVED_CALCULATION` |

---

## 5. Top-Level YAML Key Contract

### Mandatory Keys (ALL tables)

```yaml
table_name:          # Full table name with prefix
entity_type:         # dimension | fact | bridge
domain:              # Business domain
description:         # Dual-purpose description
catalog:             # subject_maintenanceengineering
schema:              # an_maintenanceengineering_ods
clustering:          # ALWAYS "auto"
table_properties:    # MANDATORY properties block
columns:             # Column definitions array
primary_key:         # PK column(s)
```

### Dimension-Only Keys

```yaml
scd_type:            # 1 or 2
business_key:        # Natural business key column(s)
unknown_member:      # Default values for unknown/missing dimension rows
```

### Fact-Only Keys

```yaml
grain:               # Explicit grain statement
update_frequency:    # daily | hourly | real-time
fact_type:           # transaction | periodic_snapshot | accumulating_snapshot
foreign_keys:        # FK references to dimensions
measures:            # List of measure columns
```

### Bridge-Only Keys

```yaml
grain:               # Explicit grain statement
foreign_keys:        # FK references to connected dimensions/facts
```

---

## 6. Boolean-to-Text Conversion List

No BOOLEAN source columns require text conversion in this model. All flag columns in the source (e.g., `shelf_life_flag`, `ri_flag`, `tool_calibration_flag`) are already STRING type in Silver and will be carried as DIRECT_COPY STRING attributes.

---

## 7. Domain Assignments

| Domain | Tables | Emoji |
|---|---|---|
| **part_master** | dim_part | 🔧 |
| **component_lifecycle** | fact_component_removal, dim_aircraft, dim_station | ✈️ |
| **defect_management** | fact_defect, bridge_defect_part, dim_ata_chapter | ⚠️ |
| **inventory_spares** | fact_inventory_transaction, fact_inventory_snapshot, fact_inventory_control | 📦 |
| **procurement_overhaul** | fact_order, fact_teardown | 🛠️ |
| **common** | dim_date | 📅 |

---

## 8. Enterprise Bus Matrix

| Fact Table | dim_part | dim_aircraft | dim_ata_chapter | dim_station | dim_date |
|---|---|---|---|---|---|
| fact_component_removal | ✓ | ✓ | ✓ | ✓ | ✓ |
| fact_defect | ✓ (via bridge) | ✓ | ✓ | — | ✓ |
| fact_inventory_transaction | ✓ | ✓ | — | ✓ | ✓ |
| fact_inventory_snapshot | ✓ | ✓ | — | ✓ | ✓ |
| fact_inventory_control | ✓ | — | — | — | ✓ |
| fact_order | ✓ | — | — | — | ✓ |
| fact_teardown | ✓ | — | — | — | ✓ |
| bridge_defect_part | ✓ | — | — | — | — |
