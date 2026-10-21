# Databricks notebook source
# MAGIC %pip install psycopg2-binary

# COMMAND ----------

import psycopg2
from databricks.sdk import WorkspaceClient

ENDPOINT = "projects/nathan-a-ppmtx/branches/production/endpoints/primary"
HOST = "ep-summer-wave-eey39uw9.database.westus2.azuredatabricks.net"
DBNAME = "databricks_postgres"
SCHEMA = "an_maintenanceengineering_ods"
TABLE = "qx_ppmtx_synced_gold_part_live_times"
APP_SP = "06a44e88-0780-4525-9d65-ff609515cdc4"
USER_CANDIDATES = ["nathan.archibald@horizonair.com", "nathan-archibald"]

w = WorkspaceClient()
token = w.api_client.do("POST", "/api/2.0/postgres/credentials",
                        body={"endpoint": ENDPOINT})["token"]

conn = None
last_err = None
for user in USER_CANDIDATES:
    try:
        conn = psycopg2.connect(
            host=HOST, port=5432, dbname=DBNAME,
            user=user, password=token, sslmode="require", connect_timeout=30,
        )
        print(f"[OK] connected as {user}")
        break
    except Exception as e:  # noqa: BLE001
        last_err = e
        print(f"[..] connect as {user} failed: {str(e).splitlines()[0]}")
if conn is None:
    raise SystemExit(f"Could not connect to Lakebase: {last_err}")

conn.autocommit = True
with conn.cursor() as cur:
    cur.execute("SELECT current_user, session_user")
    print("  current_user/session_user:", cur.fetchone())
    cur.execute(f'GRANT USAGE ON SCHEMA {SCHEMA} TO "{APP_SP}"')
    cur.execute(f'GRANT SELECT ON TABLE {SCHEMA}.{TABLE} TO "{APP_SP}"')
    cur.execute(
        f'ALTER DEFAULT PRIVILEGES IN SCHEMA {SCHEMA} '
        f'GRANT SELECT ON TABLES TO "{APP_SP}"'
    )
    print("[OK] grants applied")
    cur.execute("SELECT has_table_privilege(%s, %s, 'SELECT')",
                (APP_SP, f"{SCHEMA}.{TABLE}"))
    print("  app SP has SELECT:", cur.fetchone()[0])
    cur.execute(f"SELECT count(*) FROM {SCHEMA}.{TABLE}")
    print("  row count:", cur.fetchone()[0])
conn.close()
print("DONE")
