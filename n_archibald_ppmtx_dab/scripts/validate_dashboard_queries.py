"""
Validate dashboard SQL queries against Databricks SQL Warehouse.

Executes each dataset query with LIMIT 1 to catch:
- UNRESOLVED_COLUMN errors
- TABLE_OR_VIEW_NOT_FOUND errors
- UNBOUND_SQL_PARAMETER errors
- DATATYPE_MISMATCH errors

Usage:
    python scripts/validate_dashboard_queries.py [--dashboard defect_intelligence_dashboard]
"""

import argparse
import json
import re
import sys
from pathlib import Path

try:
    from databricks.sdk import WorkspaceClient
except ImportError:
    print("ERROR: databricks-sdk not installed. Run: pip install databricks-sdk")
    sys.exit(1)

DASHBOARD_DIR = Path(__file__).parent.parent / "docs" / "dashboards"

VARIABLES = {
    "catalog": "subject_maintenanceengineering",
    "gold_schema": "an_maintenanceengineering_ods",
}

# Default parameter values for validation runs
PARAM_DEFAULTS = {
    "start_date": "2024-01-01",
    "end_date": "2026-06-24",
}

_VAR_RE = re.compile(r"(?<!\$)\$\{([A-Za-z_][A-Za-z0-9_]*)\}")


def substitute_variables(text: str) -> str:
    """Replace ${var} with resolved values."""
    for key, value in VARIABLES.items():
        text = text.replace(f"${{{key}}}", value)
    return text


def substitute_parameters(sql: str) -> str:
    """Replace :param with literal default values for validation."""
    for param, value in PARAM_DEFAULTS.items():
        sql = sql.replace(f":{param}", f"'{value}'")
    return sql


def wrap_limit(sql: str) -> str:
    """Wrap query with LIMIT 1 for validation."""
    sql = sql.rstrip().rstrip(";")
    if "LIMIT" not in sql.upper():
        sql += "\nLIMIT 1"
    return sql


def validate_dashboard(dashboard_name: str) -> bool:
    """Validate all datasets in a dashboard. Returns True if all pass."""
    dashboard_file = DASHBOARD_DIR / f"{dashboard_name}.lvdash.json"
    if not dashboard_file.exists():
        print(f"ERROR: Dashboard file not found: {dashboard_file}")
        return False

    raw_json = dashboard_file.read_text(encoding="utf-8")
    rendered = substitute_variables(raw_json)
    dashboard = json.loads(rendered)
    datasets = dashboard.get("datasets", [])

    if not datasets:
        print("WARNING: No datasets found in dashboard.")
        return True

    w = WorkspaceClient()
    all_passed = True
    print(f"\n{'='*60}")
    print(f"Validating: {dashboard_file.name} ({len(datasets)} datasets)")
    print(f"{'='*60}\n")

    for ds in datasets:
        name = ds.get("name", "unknown")
        query_lines = ds.get("queryLines", [])
        sql = "\n".join(query_lines)
        sql = substitute_parameters(sql)
        sql = wrap_limit(sql)

        print(f"  [{name}] ... ", end="", flush=True)

        try:
            result = w.statement_execution.execute_statement(
                warehouse_id=_get_warehouse_id(w),
                statement=sql,
                wait_timeout="30s",
            )
            if result.status and result.status.state.value == "SUCCEEDED":
                cols = len(result.manifest.schema.columns) if result.manifest else 0
                print(f"PASS ({cols} columns)")
            else:
                error = result.status.error if result.status else "Unknown"
                print(f"FAIL: {error}")
                all_passed = False
        except Exception as e:
            print(f"FAIL: {e}")
            all_passed = False

    print(f"\n{'='*60}")
    print(f"Result: {'ALL PASSED' if all_passed else 'FAILURES DETECTED'}")
    print(f"{'='*60}\n")
    return all_passed


def _get_warehouse_id(w: WorkspaceClient) -> str:
    """Get the first available SQL warehouse ID."""
    warehouses = list(w.warehouses.list())
    if not warehouses:
        print("ERROR: No SQL warehouses found.")
        sys.exit(1)
    # Prefer warehouse named 'QXOps SQL warehouse' if available
    for wh in warehouses:
        if "QXOps" in (wh.name or ""):
            return wh.id
    return warehouses[0].id


def main():
    parser = argparse.ArgumentParser(description="Validate Dashboard SQL Queries")
    parser.add_argument(
        "--dashboard",
        default=None,
        help="Dashboard name (without .lvdash.json extension). Omit to list available.",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Validate all dashboards",
    )
    args = parser.parse_args()

    if args.all:
        dashboard_files = list(DASHBOARD_DIR.glob("*.lvdash.json"))
        results = []
        for f in dashboard_files:
            name = f.stem.replace(".lvdash", "")
            results.append((name, validate_dashboard(name)))
        failed = [n for n, passed in results if not passed]
        if failed:
            print(f"\nFailed dashboards: {failed}")
            sys.exit(1)
    else:
        if not validate_dashboard(args.dashboard):
            sys.exit(1)


if __name__ == "__main__":
    main()
