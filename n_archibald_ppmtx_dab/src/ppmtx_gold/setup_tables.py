# Databricks notebook source
# MAGIC %md
# MAGIC # Gold Layer — Setup Tables
# MAGIC Creates all Gold tables from YAML schema definitions.
# MAGIC Applies PRIMARY KEY constraints after creation.

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

# MAGIC %md
# MAGIC ## Find YAML Base Directory

# COMMAND ----------

def find_yaml_base():
    """Discover YAML schema directory relative to notebook location."""
    # In bundle deployment, YAML files are synced alongside src/
    candidates = [
        "/Workspace/Users",  # workspace path
        ".",
        "..",
        "../..",
    ]
    # Try to find relative to current working directory
    cwd = os.getcwd()
    # Walk up from cwd looking for gold_layer_design/yaml
    search = Path(cwd)
    for _ in range(5):
        candidate = search / "gold_layer_design" / "yaml"
        if candidate.exists():
            return str(candidate)
        search = search.parent

    # Fallback: try workspace bundle paths
    bundle_root = os.environ.get("BUNDLE_ROOT", "")
    if bundle_root:
        candidate = Path(bundle_root) / "gold_layer_design" / "yaml"
        if candidate.exists():
            return str(candidate)

    raise FileNotFoundError(
        "Cannot find gold_layer_design/yaml directory. "
        "Ensure YAML files are synced in databricks.yml."
    )


yaml_base = find_yaml_base()
print(f"YAML base: {yaml_base}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Load All YAML Schemas

# COMMAND ----------

def load_all_yaml_schemas(yaml_base_path):
    """Load all YAML schema files from domain subdirectories."""
    schemas = {}
    base = Path(yaml_base_path)
    for yaml_file in sorted(base.rglob("*.yaml")):
        with open(yaml_file, "r") as f:
            schema_def = yaml.safe_load(f)
        table_name = schema_def["table_name"]
        schemas[table_name] = schema_def
        print(f"  Loaded: {table_name} ({schema_def['entity_type']})")
    print(f"\nTotal schemas loaded: {len(schemas)}")
    return schemas


schemas = load_all_yaml_schemas(yaml_base)

# COMMAND ----------

# MAGIC %md
# MAGIC ## Build CREATE TABLE DDL

# COMMAND ----------

def build_create_table_ddl(schema_def, catalog, schema):
    """Generate CREATE OR REPLACE TABLE DDL from YAML schema definition."""
    table_name = schema_def["table_name"]
    full_name = f"{catalog}.{schema}.{table_name}"
    columns = schema_def["columns"]
    table_props = schema_def.get("table_properties", {})
    description = schema_def.get("description", "")
    clustering = schema_def.get("clustering", "auto")

    # Build column definitions
    col_defs = []
    for col in columns:
        nullable = "NOT NULL" if not col.get("nullable", True) else ""
        comment = col.get("description", "").replace("'", "\\'")
        col_def = f"  `{col['name']}` {col['data_type']} {nullable}".rstrip()
        if comment:
            col_def += f" COMMENT '{comment}'"
        col_defs.append(col_def)

    columns_sql = ",\n".join(col_defs)

    # Build TBLPROPERTIES
    props_entries = []
    for k, v in table_props.items():
        props_entries.append(f"  '{k}' = '{v}'")
    props_sql = ",\n".join(props_entries)

    # Escape description for SQL
    description_sql = description.replace("'", "\\'")

    ddl = f"""CREATE OR REPLACE TABLE {full_name} (
{columns_sql}
)
USING DELTA
CLUSTER BY AUTO
COMMENT '{description_sql}'
TBLPROPERTIES (
{props_sql}
)"""

    return ddl, full_name


# COMMAND ----------

# MAGIC %md
# MAGIC ## Create Schema and Tables

# COMMAND ----------

# Ensure schema exists
spark.sql(f"CREATE SCHEMA IF NOT EXISTS {catalog}.{schema}")
print(f"Schema ready: {catalog}.{schema}")

# COMMAND ----------

# Create tables in dependency order: dimensions first, then facts, then bridges
dim_schemas = {k: v for k, v in schemas.items() if v["entity_type"] == "dimension"}
fact_schemas = {k: v for k, v in schemas.items() if v["entity_type"] == "fact"}
bridge_schemas = {k: v for k, v in schemas.items() if v["entity_type"] == "bridge"}

print(f"Dimensions: {len(dim_schemas)}")
print(f"Facts: {len(fact_schemas)}")
print(f"Bridges: {len(bridge_schemas)}")

# COMMAND ----------

# Create ALL tables
created_tables = []
errors = []

for table_name, schema_def in {**dim_schemas, **fact_schemas, **bridge_schemas}.items():
    try:
        ddl, full_name = build_create_table_ddl(schema_def, catalog, schema)
        spark.sql(ddl)
        created_tables.append(full_name)
        print(f"✓ Created: {full_name}")
    except Exception as e:
        errors.append((table_name, str(e)))
        print(f"✗ FAILED: {table_name} — {e}")

print(f"\n--- Summary ---")
print(f"Created: {len(created_tables)}")
print(f"Failed: {len(errors)}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Apply PRIMARY KEY Constraints

# COMMAND ----------

pk_applied = []
pk_errors = []

for table_name, schema_def in schemas.items():
    pk_columns = schema_def.get("primary_key", [])
    if not pk_columns:
        continue

    full_name = f"{catalog}.{schema}.{table_name}"
    pk_cols_sql = ", ".join([f"`{c}`" for c in pk_columns])

    try:
        # Drop existing PK if any
        spark.sql(f"ALTER TABLE {full_name} DROP PRIMARY KEY IF EXISTS")
        # Add PK
        spark.sql(
            f"ALTER TABLE {full_name} ADD CONSTRAINT pk_{table_name} "
            f"PRIMARY KEY ({pk_cols_sql})"
        )
        pk_applied.append(full_name)
        print(f"✓ PK: {full_name} ({pk_cols_sql})")
    except Exception as e:
        pk_errors.append((table_name, str(e)))
        print(f"✗ PK FAILED: {table_name} — {e}")

print(f"\n--- PK Summary ---")
print(f"Applied: {len(pk_applied)}")
print(f"Failed: {len(pk_errors)}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Insert Unknown Member Rows

# COMMAND ----------

for table_name, schema_def in dim_schemas.items():
    unknown = schema_def.get("unknown_member")
    if not unknown:
        continue

    full_name = f"{catalog}.{schema}.{table_name}"
    columns_list = list(unknown.keys())
    values_list = []
    for v in unknown.values():
        if isinstance(v, str):
            values_list.append(f"'{v}'")
        else:
            values_list.append(str(v))

    cols_sql = ", ".join([f"`{c}`" for c in columns_list])
    vals_sql = ", ".join(values_list)

    try:
        # MERGE to avoid duplicates on re-run
        spark.sql(f"""
            MERGE INTO {full_name} AS target
            USING (SELECT {vals_sql}) AS source({cols_sql})
            ON target.`{columns_list[0]}` = source.`{columns_list[0]}`
            WHEN NOT MATCHED THEN INSERT ({cols_sql}) VALUES ({vals_sql})
        """)
        print(f"✓ Unknown member: {full_name}")
    except Exception as e:
        print(f"⚠ Unknown member skipped: {table_name} — {e}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Final Report

# COMMAND ----------

print("=" * 60)
print("GOLD LAYER SETUP COMPLETE")
print("=" * 60)
print(f"Catalog: {catalog}")
print(f"Schema: {schema}")
print(f"Tables created: {len(created_tables)}")
print(f"PKs applied: {len(pk_applied)}")
print(f"Errors: {len(errors) + len(pk_errors)}")
if errors:
    print("\nTable creation errors:")
    for t, e in errors:
        print(f"  {t}: {e}")
if pk_errors:
    print("\nPK constraint errors:")
    for t, e in pk_errors:
        print(f"  {t}: {e}")
