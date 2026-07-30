import json

with open("data_product_accelerator/skills/monitoring/02-databricks-aibi-dashboards/references/Jobs System Tables Dashboard.lvdash.json", encoding="utf-8") as f:
    data = json.load(f)

print("Top-level keys:", list(data.keys()))

for ds in data.get("datasets", [])[:3]:
    print("Dataset:", ds.get("name"), "| keys:", list(ds.keys()))
    if "parameters" in ds:
        print("  params:", json.dumps(ds["parameters"], indent=2))

if "parameters" in data:
    print("\nTop-level parameters:")
    print(json.dumps(data["parameters"][:2], indent=2))
