"""
Deploy AI/BI Dashboard to Databricks Workspace.

UPDATE-or-CREATE pattern: preserves URL + permissions on re-deploy.
Pre-flight: enumerates all ${var} placeholders and fails loud if any are missing.

Usage:
    python scripts/deploy_dashboard.py [--dashboard defect_intelligence_dashboard]
"""

import argparse
import base64
import json
import re
import sys
from pathlib import Path

try:
    from databricks.sdk import WorkspaceClient
    from databricks.sdk.service.dashboards import Dashboard
except ImportError:
    print("ERROR: databricks-sdk not installed. Run: pip install databricks-sdk")
    sys.exit(1)

# --- Configuration ---
DASHBOARD_DIR = Path(__file__).parent.parent / "docs" / "dashboards"
WORKSPACE_DEPLOY_PATH = "/Workspace/Users/{user_email}/dashboards"

VARIABLES = {
    "catalog": "subject_maintenanceengineering_test",
    "gold_schema": "an_maintenanceengineering_ods",
}

_VAR_RE = re.compile(r"(?<!\$)\$\{([A-Za-z_][A-Za-z0-9_]*)\}")


def preflight_check(json_str: str, source_file: Path) -> list[str]:
    """Enumerate all ${...} variables and return any missing ones."""
    found_vars = set(_VAR_RE.findall(json_str))
    missing = [v for v in found_vars if v not in VARIABLES or not VARIABLES[v]]
    return missing


def substitute_variables(json_str: str) -> str:
    """Replace ${var} placeholders with resolved values."""
    for key, value in VARIABLES.items():
        json_str = json_str.replace(f"${{{key}}}", value)
    return json_str


def validate_json(json_str: str) -> dict:
    """Parse JSON and return the dict. Raises on malformed JSON."""
    return json.loads(json_str)


def deploy_dashboard(dashboard_name: str, dry_run: bool = False, profile: str = None) -> None:
    """Deploy a single .lvdash.json to the workspace."""
    dashboard_file = DASHBOARD_DIR / f"{dashboard_name}.lvdash.json"
    if not dashboard_file.exists():
        print(f"ERROR: Dashboard file not found: {dashboard_file}")
        sys.exit(1)

    print(f"--- Deploying: {dashboard_file.name} ---")

    # Read raw JSON
    raw_json = dashboard_file.read_text(encoding="utf-8")

    # Phase 0.5: Pre-flight variable check
    missing = preflight_check(raw_json, dashboard_file)
    if missing:
        print(f"ERROR: Missing variable values for: {missing}")
        print("  Update VARIABLES dict in this script or set environment variables.")
        sys.exit(1)

    # Variable substitution
    rendered = substitute_variables(raw_json)

    # Validate JSON structure
    try:
        dashboard_obj = validate_json(rendered)
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON after substitution: {e}")
        sys.exit(1)

    # Summary
    datasets = dashboard_obj.get("datasets", [])
    pages = [p for p in dashboard_obj.get("pages", []) if p.get("pageType") != "PAGE_TYPE_GLOBAL_FILTERS"]
    widgets = sum(len(p.get("layout", [])) for p in dashboard_obj.get("pages", []))
    print(f"  Datasets: {len(datasets)}")
    print(f"  Pages: {len(pages)}")
    print(f"  Widgets: {widgets}")

    if dry_run:
        print("  [DRY RUN] Skipping deployment.")
        # Write rendered version for inspection
        rendered_path = dashboard_file.parent / f"{dashboard_name}.rendered.json"
        rendered_path.write_text(rendered, encoding="utf-8")
        print(f"  Rendered output: {rendered_path}")
        return

    # Deploy via Lakeview Dashboards API (UPDATE-or-CREATE)
    w = WorkspaceClient(profile=profile) if profile else WorkspaceClient()
    host = w.config.host.rstrip("/")

    # Check if dashboard already exists (by display name)
    display_name = dashboard_name.replace("_", " ").title()
    existing_id = None
    try:
        for d in w.lakeview.list():
            if d.display_name == display_name:
                existing_id = d.dashboard_id
                break
    except Exception:
        pass

    if existing_id:
        # Update existing dashboard
        print(f"  Updating existing dashboard: {existing_id}")
        result = w.lakeview.update(
            dashboard_id=existing_id,
            dashboard=Dashboard(
                display_name=display_name,
                serialized_dashboard=rendered,
            ),
        )
        dashboard_id = existing_id
    else:
        # Create new dashboard
        print(f"  Creating new dashboard: {display_name}")
        result = w.lakeview.create(
            dashboard=Dashboard(
                display_name=display_name,
                serialized_dashboard=rendered,
            ),
        )
        dashboard_id = result.dashboard_id

    dashboard_url = f"{host}/sql/dashboardsv3/{dashboard_id}"
    print(f"  SUCCESS: {dashboard_url}")


def main():
    parser = argparse.ArgumentParser(description="Deploy AI/BI Dashboard")
    parser.add_argument(
        "--dashboard",
        default=None,
        help="Dashboard name (without .lvdash.json extension). Omit to list available.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Render and validate without deploying",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Deploy all dashboards in docs/dashboards/",
    )
    parser.add_argument(
        "--profile",
        default=None,
        help="Databricks CLI profile to use",
    )
    args = parser.parse_args()

    if args.all or (args.dashboard is None and not args.all):
        dashboard_files = sorted(DASHBOARD_DIR.glob("*.lvdash.json"))
        if not dashboard_files:
            print(f"No .lvdash.json files found in {DASHBOARD_DIR}")
            sys.exit(1)
        if args.dashboard is None and not args.all:
            print(f"Available dashboards in {DASHBOARD_DIR}:")
            for f in dashboard_files:
                print(f"  - {f.stem.replace('.lvdash', '')}")
            print("\nRe-run with --dashboard <name> or --all")
            return
        for f in dashboard_files:
            deploy_dashboard(f.stem.replace(".lvdash", ""), dry_run=args.dry_run, profile=args.profile)
    else:
        deploy_dashboard(args.dashboard, dry_run=args.dry_run, profile=args.profile)


if __name__ == "__main__":
    main()
