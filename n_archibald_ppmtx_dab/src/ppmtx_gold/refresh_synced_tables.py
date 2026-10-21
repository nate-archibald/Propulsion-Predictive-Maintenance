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
# MAGIC
# MAGIC IMPORTANT: `start_update` only *triggers* the pipeline asynchronously — it
# MAGIC does not wait for the sync to actually finish. This notebook polls every
# MAGIC triggered/in-flight update to a terminal state and fails the job if any
# MAGIC update does not COMPLETE, so a broken sync (e.g. a stale CDF checkpoint
# MAGIC after `CREATE OR REPLACE TABLE` on the Gold side) surfaces immediately
# MAGIC instead of silently retrying/failing in the background for days.

# COMMAND ----------

NAME_MATCH = "qx_ppmtx_synced_gold_"
POLL_INTERVAL_SECONDS = 15
MAX_WAIT_SECONDS = 1800  # 30 minutes

# COMMAND ----------

import time
from databricks.sdk import WorkspaceClient

w = WorkspaceClient()

# Discover all synced-table pipelines by name.
pipelines = [p for p in w.pipelines.list_pipelines() if p.name and NAME_MATCH in p.name]
print(f"Found {len(pipelines)} synced-table pipeline(s) matching '{NAME_MATCH}'")

# COMMAND ----------

# in_flight maps pipeline_id -> (name, update_id) for every update we need to wait on,
# whether we just triggered it or it was already running when we got here.
in_flight = {}
trigger_failed = []
for p in pipelines:
    try:
        resp = w.pipelines.start_update(pipeline_id=p.pipeline_id, full_refresh=False)
        in_flight[p.pipeline_id] = (p.name, resp.update_id)
        print(f"[OK]      {p.name} -> update {resp.update_id}")
    except Exception as e:
        msg = str(e)
        if "already" in msg.lower() or "ACTIVE" in msg or "RUNNING" in msg:
            # Already updating — track the pipeline's current in-flight update instead.
            current = w.pipelines.get(p.pipeline_id)
            latest = (current.latest_updates or [None])[0]
            if latest is not None:
                in_flight[p.pipeline_id] = (p.name, latest.update_id)
                print(f"[SKIP]    {p.name} already updating (update {latest.update_id})")
            else:
                print(f"[SKIP]    {p.name} already updating (no update id found to track)")
        else:
            trigger_failed.append((p.name, p.pipeline_id, msg))
            print(f"[FAIL]    {p.name}: {msg}")

# COMMAND ----------

# Poll every in-flight update until it reaches a terminal state (COMPLETED/FAILED/
# CANCELED) or we exceed the wait budget.
completed, sync_failed, timed_out = [], [], []
deadline = time.time() + MAX_WAIT_SECONDS
pending = dict(in_flight)
while pending and time.time() < deadline:
    for pipeline_id, (name, update_id) in list(pending.items()):
        update = w.pipelines.get_update(pipeline_id=pipeline_id, update_id=update_id).update
        state = str(update.state)
        if state == "COMPLETED":
            completed.append((name, pipeline_id, update_id))
            print(f"[DONE]    {name} -> {state}")
            del pending[pipeline_id]
        elif state in ("FAILED", "CANCELED"):
            sync_failed.append((name, pipeline_id, update_id, state))
            print(f"[FAILED]  {name} -> {state}")
            del pending[pipeline_id]
    if pending:
        time.sleep(POLL_INTERVAL_SECONDS)

for pipeline_id, (name, update_id) in pending.items():
    timed_out.append((name, pipeline_id, update_id))
    print(f"[TIMEOUT] {name} did not reach a terminal state within {MAX_WAIT_SECONDS}s")

print("\nSummary:")
print(f"  trigger failed: {len(trigger_failed)}")
print(f"  completed: {len(completed)}")
print(f"  sync failed: {len(sync_failed)}")
print(f"  timed out: {len(timed_out)}")

# COMMAND ----------

# Fail the task loudly if anything didn't cleanly complete, so a broken sync (stale
# CDF checkpoint, permission issue, etc.) is caught the same day instead of silently
# retrying/failing in the background for days.
problems = []
if trigger_failed:
    problems.append(
        f"{len(trigger_failed)} pipeline(s) failed to trigger: "
        + "; ".join(f"{n} ({e})" for n, _, e in trigger_failed)
    )
if sync_failed:
    problems.append(
        f"{len(sync_failed)} pipeline(s) reached a non-success terminal state: "
        + "; ".join(f"{n} (update {u}, state={s})" for n, _, u, s in sync_failed)
    )
if timed_out:
    problems.append(
        f"{len(timed_out)} pipeline(s) did not complete within {MAX_WAIT_SECONDS}s: "
        + "; ".join(f"{n} (update {u})" for n, _, u in timed_out)
    )

if problems:
    raise Exception(" | ".join(problems))
