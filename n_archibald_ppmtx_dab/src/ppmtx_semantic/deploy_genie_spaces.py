# Databricks notebook source
# MAGIC %md
# MAGIC # Deploy Genie Spaces
# MAGIC Creates or updates Genie Spaces from the JSON configuration.
# MAGIC Uses the Genie REST API (POST for create, PATCH for update).

# COMMAND ----------

import json
import os
import requests
import uuid

notebook_path = dbutils.notebook.entry_point.getDbutils().notebook().getContext().notebookPath().get()
bundle_root = notebook_path.rsplit("/src/", 1)[0]

catalog = dbutils.widgets.get("catalog")
gold_schema = dbutils.widgets.get("gold_schema")
warehouse_id = dbutils.widgets.get("warehouse_id")

# Optional: pre-existing space IDs for PATCH (idempotent re-deployment)
space_id_reliability = dbutils.widgets.get("genie_space_id_reliability") if "genie_space_id_reliability" in dbutils.widgets.getAll() else ""
space_id_inventory = dbutils.widgets.get("genie_space_id_inventory") if "genie_space_id_inventory" in dbutils.widgets.getAll() else ""

print(f"Catalog: {catalog}")
print(f"Gold Schema: {gold_schema}")
print(f"Warehouse ID: {warehouse_id}")
print(f"Existing Reliability Space ID: {space_id_reliability or '(none — will POST)'}")
print(f"Existing Inventory Space ID: {space_id_inventory or '(none — will POST)'}")

# COMMAND ----------

# Read and render configuration
config_path = f"/Workspace{bundle_root}/src/ppmtx_semantic/genie_space_config.json"
print(f"Reading config from: {config_path}")

with open(config_path, "r") as f:
    raw_config = f.read()

# Variable substitution
rendered = raw_config.replace("${catalog}", catalog) \
                     .replace("${gold_schema}", gold_schema) \
                     .replace("${warehouse_id}", warehouse_id)

config = json.loads(rendered)
print(f"Loaded {len(config['spaces'])} Genie Space definitions")

# COMMAND ----------

def _normalize_ids(obj):
    """Recursively convert all 'id' fields to 32-hex UUID format (deterministic from content)."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == "id" and isinstance(v, str) and len(v) < 32:
                obj[k] = uuid.uuid5(uuid.NAMESPACE_DNS, v).hex
            else:
                _normalize_ids(v)
    elif isinstance(obj, list):
        for item in obj:
            _normalize_ids(item)

def _assert_sql_arrays(space: dict) -> None:
    """Validate that all sql fields in benchmarks are List[str], never bare strings."""
    benchmarks = space.get("benchmarks", {}).get("questions", [])
    for bq in benchmarks:
        sql_val = bq.get("sql")
        if sql_val is not None and not isinstance(sql_val, list):
            raise ValueError(
                f"Benchmark '{bq.get('id', '?')}' has sql as {type(sql_val).__name__}, "
                f"expected List[str]. Value: {sql_val!r}"
            )
        if isinstance(sql_val, list):
            for item in sql_val:
                if not isinstance(item, str):
                    raise ValueError(
                        f"Benchmark '{bq.get('id', '?')}' has non-string item in sql list: {item!r}"
                    )

# COMMAND ----------

# Get auth context
host = spark.conf.get("spark.databricks.workspaceUrl", "")
if not host.startswith("http"):
    host = f"https://{host}"
token = dbutils.notebook.entry_point.getDbutils().notebook().getContext().apiToken().get()

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# Map space titles to pre-existing IDs
space_id_map = {
    "Propulsion Reliability Intelligence": space_id_reliability,
    "Inventory & Supply Chain Intelligence": space_id_inventory
}

# COMMAND ----------

results = []

for space_def in config["spaces"]:
    space_name = space_def["title"]
    existing_id = space_id_map.get(space_name, "")
    
    # Build serialized_space: only inner sections (no title/description/warehouse_id at top)
    # API requires tables sorted by identifier
    ds = space_def.get("data_sources", {})
    if "tables" in ds:
        ds["tables"] = sorted(ds["tables"], key=lambda t: t.get("identifier", ""))
    if "metric_views" in ds:
        ds["metric_views"] = sorted(ds["metric_views"], key=lambda t: t.get("identifier", ""))
    
    # Merge all text_instructions into a single entry (API allows at most one)
    instructions = space_def.get("instructions", {})
    text_items = instructions.get("text_instructions", [])
    if len(text_items) > 1:
        merged_content = []
        for item in text_items:
            merged_content.extend(item.get("content", []))
        instructions["text_instructions"] = [
            {"id": text_items[0]["id"], "content": merged_content}
        ]
    
    serialized_content = {
        "version": config.get("version", 2),
        "data_sources": ds,
        "config": space_def.get("config", {}),
        "instructions": space_def.get("instructions", {}),
        "benchmarks": space_def.get("benchmarks", {})
    }
    
    # Normalize all short IDs to 32-hex UUIDs (API requirement)
    _normalize_ids(serialized_content)

    # Sort instruction lists by id (API requirement)
    instr = serialized_content.get("instructions", {})
    for key in ("example_question_sqls", "sql_functions", "text_instructions"):
        if key in instr and isinstance(instr[key], list):
            instr[key] = sorted(instr[key], key=lambda x: x.get("id", ""))

    # Sort benchmark questions by id
    bm = serialized_content.get("benchmarks", {})
    if "questions" in bm and isinstance(bm["questions"], list):
        bm["questions"] = sorted(bm["questions"], key=lambda x: x.get("id", ""))

    # Build API payload — title, description, warehouse_id at top level
    payload = {
        "title": space_name,
        "description": space_def.get("description", ""),
        "warehouse_id": space_def.get("warehouse_id", warehouse_id),
        "serialized_space": json.dumps(serialized_content)
    }
    
    if existing_id:
        # PATCH existing space
        url = f"{host}/api/2.0/genie/spaces/{existing_id}"
        print(f"PATCHing existing space: {space_name} (ID: {existing_id})")
        resp = requests.patch(url, headers=headers, json=payload)
    else:
        # POST new space
        url = f"{host}/api/2.0/genie/spaces"
        print(f"POSTing new space: {space_name}")
        resp = requests.post(url, headers=headers, json=payload)
    
    if resp.status_code in (200, 201):
        result = resp.json()
        space_id = result.get("space_id", result.get("id", "unknown"))
        results.append({"name": space_name, "id": space_id, "status": "success"})
        print(f"  ✅ Success — Space ID: {space_id}")
        
        if not existing_id:
            print(f"\n  [ACTION REQUIRED] Add to databricks.yml variables:")
            stem = "reliability" if "Reliability" in space_name else "inventory"
            print(f"    genie_space_id_{stem}:")
            print(f"      default: \"{space_id}\"")
            print()
    else:
        results.append({"name": space_name, "id": None, "status": f"FAILED ({resp.status_code})", "error": resp.text[:500]})
        print(f"  ❌ FAILED ({resp.status_code}): {resp.text[:500]}")

# COMMAND ----------

# Summary
print(f"\n{'='*60}")
print("Genie Space Deployment Summary")
print(f"{'='*60}")
for r in results:
    status = "✅" if r["status"] == "success" else "❌"
    print(f"  {status} {r['name']}: {r['id'] or r['status']}")

failures = [r for r in results if r["status"] != "success"]
if failures:
    detail = "; ".join(f"{f['name']}: {f['status']} — {f.get('error','')}" for f in failures)
    raise RuntimeError(f"{len(failures)} Genie Space(s) failed to deploy: {detail}")
else:
    print(f"\n✅ All {len(results)} Genie Spaces deployed successfully")
