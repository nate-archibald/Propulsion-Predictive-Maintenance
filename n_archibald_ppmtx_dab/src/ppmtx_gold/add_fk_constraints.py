# Databricks notebook source
# MAGIC %md
# MAGIC # Gold Layer — Add FK Constraints
# MAGIC Applies FOREIGN KEY constraints after all tables and PKs exist.
# MAGIC FK constraints are NOT ENFORCED in Unity Catalog — they are metadata-only
# MAGIC for query optimization and documentation.

# COMMAND ----------

# MAGIC %pip install pyyaml>=6.0
# MAGIC %restart_python

# COMMAND ----------

import yaml
import os
from pathlib import Path

# COMMAND ----------

dbutils.widgets.text("catalog", "subject_maintenanceengineering", "Catalog")
dbutils.widgets.text("schema", "an_maintenanceengineering_ods", "Schema")

catalog = dbutils.widgets.get("catalog")
schema = dbutils.widgets.get("schema")

print(f"Target: {catalog}.{schema}")

# COMMAND ----------

def find_yaml_base():
    """Discover YAML schema directory."""
    cwd = os.getcwd()
    search = Path(cwd)
    for _ in range(5):
        candidate = search / "gold_layer_design" / "yaml"
        if candidate.exists():
            return str(candidate)
        search = search.parent
    bundle_root = os.environ.get("BUNDLE_ROOT", "")
    if bundle_root:
        candidate = Path(bundle_root) / "gold_layer_design" / "yaml"
        if candidate.exists():
            return str(candidate)
    raise FileNotFoundError("Cannot find gold_layer_design/yaml directory.")


yaml_base = find_yaml_base()
print(f"YAML base: {yaml_base}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Load YAML Schemas and Extract FK Definitions

# COMMAND ----------

def load_all_yaml_schemas(yaml_base_path):
    """Load all YAML schema files."""
    schemas = {}
    base = Path(yaml_base_path)
    for yaml_file in sorted(base.rglob("*.yaml")):
        with open(yaml_file, "r") as f:
            schema_def = yaml.safe_load(f)
        schemas[schema_def["table_name"]] = schema_def
    return schemas


schemas = load_all_yaml_schemas(yaml_base)
print(f"Loaded {len(schemas)} schemas")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Apply FK Constraints (Graceful Failure)

# COMMAND ----------

fk_applied = []
fk_warnings = []

for table_name, schema_def in schemas.items():
    fk_defs = schema_def.get("foreign_keys", [])
    if not fk_defs:
        continue

    full_name = f"{catalog}.{schema}.{table_name}"

    for i, fk in enumerate(fk_defs):
        fk_columns = fk.get("columns", [])
        references = fk.get("references", "")

        if not fk_columns or not references:
            continue

        # Parse references: "target_table(target_column)" or composite
        # Format: qx_ppmtx_gold_dim_part(dim_part_key)
        if "(" in references:
            ref_table = references.split("(")[0]
            ref_cols_str = references.split("(")[1].rstrip(")")
            ref_cols = [c.strip() for c in ref_cols_str.split(",")]
        else:
            continue

        ref_full_name = f"{catalog}.{schema}.{ref_table}"
        fk_cols_sql = ", ".join([f"`{c}`" for c in fk_columns])
        ref_cols_sql = ", ".join([f"`{c}`" for c in ref_cols])
        constraint_name = f"fk_{table_name}_{fk_columns[0]}"

        try:
            # Drop existing FK if any
            spark.sql(
                f"ALTER TABLE {full_name} DROP CONSTRAINT IF EXISTS {constraint_name}"
            )
            # Add FK (NOT ENFORCED)
            spark.sql(
                f"ALTER TABLE {full_name} ADD CONSTRAINT {constraint_name} "
                f"FOREIGN KEY ({fk_cols_sql}) "
                f"REFERENCES {ref_full_name} ({ref_cols_sql}) NOT ENFORCED"
            )
            fk_applied.append(f"{full_name}.{fk_columns[0]} → {ref_full_name}")
            print(f"✓ FK: {table_name}.{fk_columns[0]} → {ref_table}.{ref_cols[0]}")
        except Exception as e:
            # Graceful failure — warn and continue
            fk_warnings.append((table_name, fk_columns[0], str(e)))
            print(f"⚠ FK skipped: {table_name}.{fk_columns[0]} — {e}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Summary

# COMMAND ----------

print("=" * 60)
print("FK CONSTRAINT APPLICATION COMPLETE")
print("=" * 60)
print(f"Applied: {len(fk_applied)}")
print(f"Warnings (skipped): {len(fk_warnings)}")
if fk_warnings:
    print("\nSkipped FKs:")
    for t, c, e in fk_warnings:
        print(f"  {t}.{c}: {e}")
