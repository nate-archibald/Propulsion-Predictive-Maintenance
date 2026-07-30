# Databricks notebook source
# MAGIC %md
# MAGIC # Create Table-Valued Functions (TVFs)
# MAGIC Reads `table_valued_functions.sql`, substitutes `${catalog}` and `${gold_schema}`,
# MAGIC splits into individual CREATE statements, and executes each via spark.sql().

# COMMAND ----------

import os
import sys

# Resolve bundle root for notebook_task context
notebook_path = dbutils.notebook.entry_point.getDbutils().notebook().getContext().notebookPath().get()
bundle_root = notebook_path.rsplit("/src/", 1)[0]

# Variables from job parameters
catalog = dbutils.widgets.get("catalog")
gold_schema = dbutils.widgets.get("gold_schema")

print(f"Catalog: {catalog}")
print(f"Gold Schema: {gold_schema}")
print(f"Bundle Root: {bundle_root}")

# COMMAND ----------

# Read the SQL file
sql_path = f"/Workspace{bundle_root}/src/ppmtx_semantic/table_valued_functions.sql"
print(f"Reading SQL from: {sql_path}")

with open(sql_path, "r") as f:
    raw_sql = f.read()

# Substitute variables
sql_content = raw_sql.replace("${catalog}", catalog).replace("${gold_schema}", gold_schema)

# COMMAND ----------

# Split into individual statements (split on CREATE OR REPLACE FUNCTION)
import re

statements = re.split(r'(?=CREATE OR REPLACE FUNCTION)', sql_content)
statements = [s.strip() for s in statements if s.strip() and s.strip().startswith("CREATE")]

print(f"Found {len(statements)} TVF statements to execute")

# COMMAND ----------

# Execute each TVF
failures = []
successes = []

for i, stmt in enumerate(statements, 1):
    # Extract function name for logging
    match = re.search(r'FUNCTION\s+\S+\.(\S+)\s*\(', stmt)
    func_name = match.group(1) if match else f"statement_{i}"
    
    try:
        spark.sql(stmt)
        successes.append(func_name)
        print(f"✅ [{i}/{len(statements)}] Created: {func_name}")
    except Exception as e:
        failures.append((func_name, str(e)))
        print(f"❌ [{i}/{len(statements)}] FAILED: {func_name}")
        print(f"   Error: {e}")

# COMMAND ----------

# Summary
print(f"\n{'='*60}")
print(f"TVF Deployment Summary")
print(f"{'='*60}")
print(f"  Successes: {len(successes)}/{len(statements)}")
print(f"  Failures:  {len(failures)}/{len(statements)}")

if failures:
    print(f"\nFailed TVFs:")
    for name, err in failures:
        print(f"  - {name}: {err[:200]}")
    raise RuntimeError(f"{len(failures)} TVF(s) failed to create: {[f[0] for f in failures]}")
else:
    print(f"\n✅ All {len(successes)} TVFs created successfully in {catalog}.{gold_schema}")
