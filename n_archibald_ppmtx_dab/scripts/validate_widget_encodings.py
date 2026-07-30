"""
Validate widget encodings against dataset columns.

Checks that every fieldName referenced in widget specs has a matching
column alias in the dataset query. Catches alias mismatches before deployment.

Usage:
    python scripts/validate_widget_encodings.py [--dashboard defect_intelligence_dashboard]
"""

import argparse
import json
import re
import sys
from pathlib import Path

DASHBOARD_DIR = Path(__file__).parent.parent / "docs" / "dashboards"

# Regex to extract column aliases from SELECT statements
_ALIAS_RE = re.compile(
    r"(?:^|,)\s*(?:.*?\s+(?:AS|as)\s+)?(\w+)\s*(?:,|$)",
    re.MULTILINE,
)


def extract_aliases_from_query(query_lines: list[str]) -> set[str]:
    """Extract column aliases from SQL query lines."""
    sql = "\n".join(query_lines)
    # Find SELECT ... FROM block
    select_match = re.search(r"SELECT\s+(.*?)(?:\sFROM\s)", sql, re.DOTALL | re.IGNORECASE)
    if not select_match:
        return set()

    select_block = select_match.group(1)
    aliases = set()
    for part in select_block.split(","):
        part = part.strip()
        if not part:
            continue
        # Check for explicit alias: expr AS alias
        as_match = re.search(r"\s+(?:AS|as)\s+(\w+)\s*$", part)
        if as_match:
            aliases.add(as_match.group(1))
        else:
            # Implicit alias: last identifier (after . if qualified)
            ident_match = re.search(r"\.?(\w+)\s*$", part)
            if ident_match:
                aliases.add(ident_match.group(1))
    return aliases


def extract_field_names_from_spec(spec: dict) -> set[str]:
    """Recursively extract all fieldName values from a widget spec."""
    fields = set()

    def _walk(obj):
        if isinstance(obj, dict):
            if "fieldName" in obj:
                fields.add(obj["fieldName"])
            for v in obj.values():
                _walk(v)
        elif isinstance(obj, list):
            for item in obj:
                _walk(item)

    _walk(spec.get("encodings", {}))
    return fields


def validate_dashboard(dashboard_name: str) -> bool:
    """Validate all widget encodings align with dataset columns."""
    dashboard_file = DASHBOARD_DIR / f"{dashboard_name}.lvdash.json"
    if not dashboard_file.exists():
        print(f"ERROR: Dashboard file not found: {dashboard_file}")
        return False

    raw_json = dashboard_file.read_text(encoding="utf-8")
    dashboard = json.loads(raw_json)

    # Build dataset alias map
    datasets = {ds["name"]: ds for ds in dashboard.get("datasets", [])}
    dataset_aliases = {}
    for name, ds in datasets.items():
        dataset_aliases[name] = extract_aliases_from_query(ds.get("queryLines", []))

    all_passed = True
    print(f"\n{'='*60}")
    print(f"Validating widget encodings: {dashboard_file.name}")
    print(f"{'='*60}\n")

    for page in dashboard.get("pages", []):
        page_name = page.get("displayName", page.get("name", "unknown"))
        for layout_item in page.get("layout", []):
            widget = layout_item.get("widget", {})
            widget_name = widget.get("name", "unknown")
            spec = widget.get("spec", {})

            # Get the dataset for this widget
            queries = widget.get("queries", [])
            if not queries:
                continue
            ds_name = queries[0].get("query", {}).get("datasetName", "")
            if not ds_name or ds_name not in dataset_aliases:
                continue

            available_cols = dataset_aliases[ds_name]
            referenced_fields = extract_field_names_from_spec(spec)

            # Filter widgets skip field validation (they reference parameters)
            widget_type = spec.get("widgetType", "")
            if "filter" in widget_type:
                # For filters, fieldName references a column in the filter dataset
                pass

            missing = referenced_fields - available_cols
            if missing:
                print(f"  MISMATCH [{page_name}/{widget_name}]:")
                print(f"    Dataset: {ds_name}")
                print(f"    Available: {sorted(available_cols)}")
                print(f"    Missing:   {sorted(missing)}")
                all_passed = False
            else:
                print(f"  OK [{page_name}/{widget_name}] ({len(referenced_fields)} fields)")

    print(f"\n{'='*60}")
    print(f"Result: {'ALL PASSED' if all_passed else 'MISMATCHES DETECTED'}")
    print(f"{'='*60}\n")
    return all_passed


def main():
    parser = argparse.ArgumentParser(description="Validate Widget Encodings")
    parser.add_argument(
        "--dashboard",
        default="defect_intelligence_dashboard",
        help="Dashboard name (without .lvdash.json extension)",
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
