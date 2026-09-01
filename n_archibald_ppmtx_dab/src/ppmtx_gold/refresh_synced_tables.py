# Databricks notebook source
# MAGIC %md
# MAGIC # Refresh Lakebase Synced Tables
# MAGIC Triggers an incremental update on every Lakebase synced-table pipeline
# MAGIC (`qx_ppmtx_synced_gold_*`) so the app's Postgres-backed tables stay current
# MAGIC after the daily gold merge. Pipelines are discovered dynamically by name —
# MAGIC no hardcoded IDs.
# MAGIC
# MAGIC Runs incrementally (Change Data Feed). Running daily keeps the sync cursor
# MAGIC well within CDF retention, avoiding the `DELTA_SHALLOW_CLONE_FILE_NOT_FOUND`
# MAGIC failure that occurs when a sync falls weeks behind and the CDC files are
# MAGIC vacuumed away.

# COMMAND ----------

NAME_MATCH = "qx_ppmtx_synced_gold_"

# COMMAND ----------

import time
from databricks.sdk import WorkspaceClient

w = WorkspaceClient()

# Discover all synced-table pipelines by name.
pipelines = [p for p in w.pipelines.list_pipelines() if p.name and NAME_MATCH in p.name]
print(f"Found {len(pipelines)} synced-table pipeline(s) matching '{NAME_MATCH}'")

# COMMAND ----------

triggered, skipped, failed = [], [], []
for p in pipelines:
    try:
        resp = w.pipelines.start_update(pipeline_id=p.pipeline_id, full_refresh=False)
        triggered.append((p.name, p.pipeline_id, resp.update_id))
        print(f"[OK]      {p.name} -> update {resp.update_id}")
    except Exception as e:
        msg = str(e)
        # A pipeline already running is fine — it will pick up the latest data.
        if "already" in msg.lower() or "ACTIVE" in msg or "RUNNING" in msg:
            skipped.append((p.name, p.pipeline_id, msg))
            print(f"[SKIP]    {p.name} already updating")
        else:
            failed.append((p.name, p.pipeline_id, msg))
            print(f"[FAIL]    {p.name}: {msg}")

print("\nSummary:")
print(f"  triggered: {len(triggered)}")
print(f"  skipped (already running): {len(skipped)}")
print(f"  failed: {len(failed)}")

# COMMAND ----------

# Fail the task if any pipeline could not be triggered so the job surfaces the problem.
if failed:
    raise Exception(
        f"{len(failed)} synced-table pipeline(s) failed to trigger: "
        + "; ".join(f"{n} ({e})" for n, _, e in failed)
    )
