"""Fix all dashboard queries: replace SQL parameters with dynamic date expressions."""
import json
from pathlib import Path

DASHBOARD_DIR = Path(__file__).parent.parent / "docs" / "dashboards"

# Replace :start_date and :end_date with dynamic SQL expressions
REPLACEMENTS = {
    ":start_date": "DATE_ADD(current_date(), -365)",
    ":end_date": "current_date()",
}

fixed = 0
for f in sorted(DASHBOARD_DIR.glob("*.lvdash.json")):
    raw = f.read_text(encoding="utf-8")
    changed = False

    data = json.loads(raw)

    # Remove top-level parameters (not supported by Lakeview API)
    if "parameters" in data:
        del data["parameters"]
        changed = True

    # Fix queryLines in datasets
    for ds in data.get("datasets", []):
        new_lines = []
        for line in ds.get("queryLines", []):
            new_line = line
            for param, expr in REPLACEMENTS.items():
                if param in new_line:
                    new_line = new_line.replace(param, expr)
                    changed = True
            new_lines.append(new_line)
        ds["queryLines"] = new_lines

    if changed:
        f.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        fixed += 1
        print(f"Fixed: {f.name}")

print(f"\nDone. Fixed {fixed} files.")
