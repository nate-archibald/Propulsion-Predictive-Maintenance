"""Fetch a deployed dashboard's serialized format to inspect parameter binding."""
import json
from databricks.sdk import WorkspaceClient

w = WorkspaceClient(profile="adb-620317033646362")

# Fetch the defect intelligence dashboard (was updated, so it existed before)
for d in w.lakeview.list():
    if "Defect" in (d.display_name or ""):
        dash = w.lakeview.get(d.dashboard_id)
        data = json.loads(dash.serialized_dashboard)
        print("Top-level keys:", list(data.keys()))
        print()
        
        # Check datasets for parameters key
        for ds in data.get("datasets", [])[:2]:
            print(f"Dataset: {ds.get('name')} | keys: {list(ds.keys())}")
        
        # Check top-level parameters
        if "parameters" in data:
            print("\nTop-level parameters:")
            print(json.dumps(data["parameters"], indent=2))
        else:
            print("\nNo top-level 'parameters' key found!")
        break
