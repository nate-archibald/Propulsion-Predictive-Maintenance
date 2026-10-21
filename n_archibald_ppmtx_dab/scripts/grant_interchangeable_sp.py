#!/usr/bin/env python3
"""Grant the app service principal SELECT on the interchangeable synced table.

Connects to the Lakebase Autoscaling Postgres endpoint with a short-lived OAuth
token (minted via `databricks postgres generate-database-credential`) as the
schema-owning superuser identity, then grants USAGE on the schema and SELECT on
the new synced table to the app SP — the same grant the other 13 synced tables
already have. Idempotent.

Usage:
  python scripts/grant_interchangeable_sp.py --profile adb-620317033646362
"""
import argparse
import json
import subprocess
import sys

import psycopg2

ENDPOINT = "projects/nathan-a-ppmtx/branches/production/endpoints/primary"
HOST = "ep-summer-wave-eey39uw9.database.westus2.azuredatabricks.net"
DBNAME = "databricks_postgres"
SCHEMA = "an_maintenanceengineering_ods"
TABLE = "qx_ppmtx_synced_gold_bridge_part_interchangeable"
APP_SP = "06a44e88-0780-4525-9d65-ff609515cdc4"

# Candidate Postgres role names for the current identity (OAuth login).
USER_CANDIDATES = ["nathan.archibald@horizonair.com", "nathan-archibald"]


def mint_token(profile: str) -> str:
    out = subprocess.check_output(
        ["databricks", "postgres", "generate-database-credential", ENDPOINT,
         "-o", "json", "--profile", profile],
        text=True,
    )
    return json.loads(out)["token"]


def connect(profile: str):
    token = mint_token(profile)
    last_err = None
    for user in USER_CANDIDATES:
        try:
            conn = psycopg2.connect(
                host=HOST, port=5432, dbname=DBNAME,
                user=user, password=token, sslmode="require",
                connect_timeout=15,
            )
            print(f"[OK] connected as {user}")
            return conn
        except Exception as e:  # noqa: BLE001
            last_err = e
            print(f"[..] connect as {user} failed: {str(e).splitlines()[0]}")
    raise SystemExit(f"Could not connect to Lakebase: {last_err}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--profile", required=True)
    args = ap.parse_args()

    conn = connect(args.profile)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("SELECT current_user, session_user")
        print("  current_user/session_user:", cur.fetchone())

        cur.execute(f'GRANT USAGE ON SCHEMA {SCHEMA} TO "{APP_SP}"')
        cur.execute(f'GRANT SELECT ON TABLE {SCHEMA}.{TABLE} TO "{APP_SP}"')
        # Keep future synced tables covered too (idempotent, matches prior setup).
        cur.execute(
            f'ALTER DEFAULT PRIVILEGES IN SCHEMA {SCHEMA} '
            f'GRANT SELECT ON TABLES TO "{APP_SP}"'
        )
        print("[OK] grants applied")

        cur.execute(
            "SELECT has_table_privilege(%s, %s, 'SELECT')",
            (APP_SP, f"{SCHEMA}.{TABLE}"),
        )
        print("  app SP has SELECT:", cur.fetchone()[0])

        cur.execute(f"SELECT count(*) FROM {SCHEMA}.{TABLE}")
        print("  row count:", cur.fetchone()[0])
    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
