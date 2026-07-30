# Project Variables

> **Usage:** When a prompt or skill needs any of these values, reference this file
> (`variables/project-variables.md`). Do not hardcode these values elsewhere.
> Always read from this file to get the current value.

## Databricks Environment

| Variable | Value | Description |
|---|---|---|
| `WORKSPACE_ORG_ID` | 620317033646362 | The Databricks Workspace Organization ID |
| `DATABRICKS_WORKSPACE_URL` | https://adb-620317033646362.2.azuredatabricks.net/ | Full URL of the Databricks workspace (e.g. `https://adb-xxxx.azuredatabricks.net`) |
| `DEFAULT_SQL_WAREHOUSE` | QXOps SQL warehouse | Name or ID of the default SQL warehouse for queries |
| `MODEL_SERVING_ENDPOINT` | databricks-claude-Opus-4-6 | Name of the model serving endpoint |
| `PROFILE` | default | Databricks CLI profile name for authentication |

## Application

| Variable | Value | Description |
|---|---|---|
| `APP_NAME` | Propulsion_Predictive_Maintenance | The application name for this project |
| `LAKEBASE_MODE` | autoscaling | Lakebase deployment mode |

## Lakehouse Configuration

| Variable | Value | Description |
|---|---|---|
| `lakehouse_default_catalog` | subject_maintenanceengineering_test | The default Unity Catalog catalog for this project |
| `chapter_3_lakehouse_catalog` | subject_maintenanceengineering | The source catalog where raw/ingested data resides |
| `chapter_3_lakehouse_schema` | an_maintenanceengineering_ods | The source schema within the source catalog |

## Informative Variables

| Variable | Value | Description |
|---|---|---|
| `use_case_file_prefix` | ppmtx | Use case prefix for file identification |
| `user_schema_prefix` | n_archibald | User-specific schema prefix |
| `use_case_slug` | ppmtx | Use case slug for bundle and folder naming |
