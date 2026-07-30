Create a file at `variables/project-variables.md` in the project root. This file stores project-wide configuration variables that all subsequent prompts and skills should reference when they need environment-specific values.

Use the following template exactly, preserving the markdown table format. Leave the **Value** column blank — I will fill in the values myself.

## File: `variables/project-variables.md`

```markdown
# Project Variables

> **Usage:** When a prompt or skill needs any of these values, reference this file
> (`variables/project-variables.md`). Do not hardcode these values elsewhere.
> Always read from this file to get the current value.

## Databricks Environment

| Variable | Value | Description |
|---|---|---|
| `WORKSPACE_ORG_ID` | | The Databricks Workspace Organization ID |
| `DATABRICKS_WORKSPACE_URL` | | Full URL of the Databricks workspace (e.g. `https://adb-xxxx.azuredatabricks.net`) |
| `DEFAULT_SQL_WAREHOUSE` | | Name or ID of the default SQL warehouse for queries |
| `MODEL_SERVING_ENDPOINT` | | Name of the model serving endpoint |
| `PROFILE` | | Databricks CLI profile name for authentication |

## Lakehouse Configuration

| Variable | Value | Description |
|---|---|---|
| `LAKEHOUSE_DEFAULT_CATALOG` | | The default Unity Catalog catalog for this project |
| `LAKEHOUSE_SOURCE_CATALOG` | | The source catalog where raw/ingested data resides |
| `LAKEHOUSE_SOURCE_SCHEMA` | | The source schema within the source catalog |
```

Do not add any extra variables or modify the structure. Just create the file as specified above.
