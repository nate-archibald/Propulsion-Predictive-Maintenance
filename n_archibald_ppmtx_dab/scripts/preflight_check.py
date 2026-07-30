"""Phase 0.5 pre-flight: enumerate variables and validate JSON."""
import re, json
from pathlib import Path

DASHBOARD_DIR = Path(__file__).parent.parent / "docs" / "dashboards"
VARIABLES = {"catalog": "subject_maintenanceengineering", "gold_schema": "an_maintenanceengineering_ods"}
_VAR_RE = re.compile(r"(?<!\$)\$\{([A-Za-z_][A-Za-z0-9_]*)\}")

print("=== Phase 0.5: Pre-Flight Variable Enumeration ===\n")
all_ok = True

for f in sorted(DASHBOARD_DIR.glob("*.lvdash.json")):
    raw = f.read_text(encoding="utf-8")
    found = set(_VAR_RE.findall(raw))
    missing = [v for v in found if v not in VARIABLES or not VARIABLES[v]]

    try:
        data = json.loads(raw)
        ds_count = len(data.get("datasets", []))
        widgets = sum(len(p.get("layout", [])) for p in data.get("pages", []))
    except json.JSONDecodeError as e:
        print(f"  FAIL: Invalid JSON in {f.name}: {e}")
        all_ok = False
        continue

    status = "PASS" if not missing else "FAIL"
    if missing:
        all_ok = False
    print(f"[{status}] {f.name}")
    print(f"  Variables: {sorted(found)}")
    print(f"  Datasets: {ds_count} | Widgets: {widgets}")
    if missing:
        print(f"  MISSING: {missing}")
    print()

result = "ALL PASSED" if all_ok else "FAILURES DETECTED"
print("=" * 60)
print(f"Result: {result}")
