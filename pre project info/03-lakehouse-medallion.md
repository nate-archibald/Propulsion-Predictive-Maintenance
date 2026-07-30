# Chapter 3 — Lakehouse (Bronze / Silver / Gold)

Build the medallion architecture: table metadata, bronze ingestion, silver SDP pipelines, and the gold layer.

> Auto-generated from `02_seed_section_input_prompts.sql`. Each section below corresponds to one `section_tag` in the workshop builder's `section_input_prompts` table.

## Sections in this category

| Step (order) | Section | `section_tag` | Forks |
|---|---|---|---|
| 8 | [Table Metadata & Data Dictionary](#table-metadata-data-dictionary) | `bronze_table_metadata` | — |
| 8 | [Table Metadata & Data Dictionary (Upload CSV)](#table-metadata-data-dictionary-upload-csv) | `bronze_table_metadata_upload` | — |
| 8 | [Table Metadata & Data Dictionary (Design from PRD)](#table-metadata-data-dictionary-design-from-prd) | `bronze_table_metadata_generate` | — |
| 10 | [Bronze Layer Creation (Approach C)](#bronze-layer-creation-approach-c) | `bronze_layer_creation` | genie-code |
| 10 | [Bronze Layer Creation (from CSV)](#bronze-layer-creation-from-csv) | `bronze_layer_creation_upload` | — |
| 11 | [Silver Layer Pipelines (SDP)](#silver-layer-pipelines-sdp) | `silver_layer_sdp` | genie-code |
| 22 | [Analyze Silver Metadata](#analyze-silver-metadata) | `genie_silver_metadata` | — |
| 8 | [Analyze Silver Metadata (Upload CSV)](#analyze-silver-metadata-upload-csv) | `genie_silver_metadata_upload` | — |
| 22 | [Analyze Silver Metadata (Design from PRD)](#analyze-silver-metadata-design-from-prd) | `genie_silver_metadata_generate` | — |
| 23 | [Gold Layer Design (Genie Accelerator)](#gold-layer-design-genie-accelerator) | `genie_gold_design` | — |
| 9 | [Gold Layer Design (PRD-aligned)](#gold-layer-design-prd-aligned) | `gold_layer_design` | genie-code |
| 12 | [Gold Layer Pipeline (YAML-Driven)](#gold-layer-pipeline-yaml-driven) | `gold_layer_pipeline` | genie-code |
| 23 | [Deploy Lakehouse Assets (Bronze → Silver → Gold)](#deploy-lakehouse-assets-bronze-silver-gold) | `deploy_lakehouse_assets` | genie-code |

---

## Table Metadata & Data Dictionary

| Field | Value |
|-------|-------|
| `input_id` | `5` |
| `section_tag` | `bronze_table_metadata` |
| `order_number` | `8` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Extract table schema metadata from Databricks and save as CSV for data dictionary reference_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

````
Extract table schema metadata from Databricks and save as a CSV data dictionary.

This will:

- **Query information_schema.columns** — extract all table and column metadata from the **{chapter_3_lakehouse_catalog}.{chapter_3_lakehouse_schema}** source
- **Convert results to CSV** — transform the JSON API response into a structured CSV file using Python
- **Save as <ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Schema.csv** — create the data dictionary that drives the entire Design-First Pipeline (all subsequent steps reference this CSV)

**Source:** `{chapter_3_lakehouse_catalog}.{chapter_3_lakehouse_schema}` (configured in the source panel above — auto-set from Step 9 or editable via Edit)

Copy and paste this prompt to the AI:

```
Run this SQL query and save results to CSV:

Query: SELECT * FROM {chapter_3_lakehouse_catalog}.information_schema.columns WHERE table_schema = '{chapter_3_lakehouse_schema}' ORDER BY table_name, ordinal_position

Output: <ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Schema.csv

---

Technical reference (for AI execution):

1. Get warehouse ID:
   databricks warehouses list --output json | jq '.[0].id'

2. Execute SQL via Statement Execution API:
   databricks api post /api/2.0/sql/statements --json '{
     "warehouse_id": "<WAREHOUSE_ID>",
     "statement": "<SQL_QUERY>",
     "wait_timeout": "50s",
     "format": "JSON_ARRAY"
   }' > /tmp/sql_result.json

3. Convert JSON to CSV with Python:
   python3 << 'EOF'
   import json, csv
   with open('/tmp/sql_result.json', 'r') as f:
       result = json.load(f)
   if result.get('status', {}).get('state') != 'SUCCEEDED':
       print(f"Query failed: {result.get('status')}")
       exit(1)
   columns = [col['name'] for col in result['manifest']['schema']['columns']]
   data = result['result']['data_array']
   with open('<OUTPUT_FILE>', 'w', newline='') as f:
       writer = csv.writer(f)
       writer.writerow(columns)
       writer.writerows(data)
   print(f"Saved {len(data)} rows to <OUTPUT_FILE>")
   EOF

Known warehouse ID: <YOUR_WAREHOUSE_ID> (get via: databricks warehouses list --output json | jq '.[0].id')

Common queries:
- Schema info: SELECT * FROM <catalog>.information_schema.columns WHERE table_schema = '<schema>' ORDER BY table_name, ordinal_position
- Table list: SELECT * FROM <catalog>.information_schema.tables WHERE table_schema = '<schema>'
- Sample data: SELECT * FROM <catalog>.<schema>.<table> LIMIT 1000

Expected output (for schema query):
- Console: "Saved N rows to <ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Schema.csv"
- CSV file with columns: table_catalog, table_schema, table_name, column_name, ordinal_position, is_nullable, data_type, comment, ...
```
````

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

> **Artifact root (client-aware).** Resolve `<ARTIFACT_ROOT>` via `vibecoding-state.resolve_root` (it reads `artifact_root` from `## Environment Capabilities`, or detects the active client, `artifact_root` + `skills_install_root`) and write every artifact under it. On Cursor/Copilot that is your repo root; on Databricks Genie Code it is your user project root `/Workspace/Users/<email>/<repo>` (the repo is cloned separately at `/Workspace/Users/<email>/.assistant/skills/<repo>` for skill loading only) — never the page's current working directory.

## 1️⃣ How To Apply

Copy the prompt from the Prompt tab, start a new Agent chat in your coding assistant, paste it and press Enter.

**Prerequisite:** Run this in your cloned Template Repository (see Prerequisites in Step 0). Ensure Databricks CLI is authenticated.

**Steps:** Copy the prompt → paste into your coding assistant → AI executes SQL via Databricks CLI → CSV saved to <ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Schema.csv.

**Note:** The source catalog and schema are shown in the **Source** panel above this prompt. If you completed Step 9 (Register Lakebase in Unity Catalog), these are automatically set to your Lakebase UC catalog and user schema. You can edit or reset them using the Edit/Reset buttons.

---

## 2️⃣ What Are We Building?

This step extracts the **data dictionary** — a CSV file containing every table, column, data type, and comment from the source schema. This CSV becomes the starting input for the entire Design-First Pipeline:

```
<ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Schema.csv
  → Gold Design (Step 11)  — reads CSV to design dimensional model
  → Bronze (Step 12)       — uses schema to create tables
  → Silver (Step 13)       — uses schema for DQ expectations
  → Gold Impl (Step 14)    — uses YAML schemas derived from this CSV
```

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It's Used Here |
|----------|-------------------|
| **Unity Catalog `information_schema`** | Queries `information_schema.columns` — the standard UC metadata catalog — instead of proprietary DESCRIBE commands |
| **SQL Statement Execution API** | Uses the REST API (`/api/2.0/sql/statements`) for programmatic SQL execution — the production-grade approach for CI/CD |
| **Data Dictionary as Governance Foundation** | The CSV captures table/column COMMENTs from UC, establishing metadata lineage from day one |
| **Serverless SQL Warehouse** | Executes against a SQL warehouse (not a cluster) for cost-efficient, instant-start queries |

---

## 4️⃣ What Happens Behind the Scenes?

This step does **not** invoke an Agent Skill — it runs a direct SQL extraction via the Databricks CLI. Every subsequent skill references this CSV (or artifacts derived from it) to **extract** table names, column names, and data types — never generating them from scratch. This is the "Extract, Don't Generate" principle.

**Downstream Compatibility Note:** Bronze setup (Step 10) additionally requires per-table governance annotations (entity_type, contains_pii, data_classification, business_owner). If these are not present in the extracted CSV, the Bronze skill will infer them from column/table name patterns or ask.

</details>

<details><summary><strong>Expected Output</strong></summary>

## Expected Deliverables

- <ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Schema.csv file created
- Contains column metadata rows for all tables in {chapter_3_lakehouse_catalog}.{chapter_3_lakehouse_schema}
- Includes: table_name, column_name, data_type, comment
- Ready for use as data dictionary reference
- **This CSV is the starting input for the entire Design-First Pipeline** (all subsequent steps reference it)

</details>

---

## Table Metadata & Data Dictionary (Upload CSV)

| Field | Value |
|-------|-------|
| `input_id` | `119` |
| `section_tag` | `bronze_table_metadata_upload` |
| `order_number` | `8` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Upload an existing schema CSV to create the data dictionary for your project_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

````
Save the uploaded schema metadata CSV and validate it for the Design-First Pipeline.

This will:

- **Save the CSV file** to `<ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Schema.csv`
- **Validate metadata quality** — check for missing comments, incorrect data types, and sequencing issues
- **Enrich if needed** — fill missing fields, normalize types, and add recommended columns
- **Print verification summary** — confirm table count, column count, and any fixes applied

Copy and paste this prompt to the AI:

```
Save the following CSV content to: <ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Schema.csv

--- CSV CONTENT START ---
{csv_content}
--- CSV CONTENT END ---

After saving the file, validate and enrich the metadata:

1. Validate structure:
   - Verify required columns: table_name, column_name, data_type, ordinal_position, is_nullable, comment
   - Check ordinal_position is sequential per table (1, 2, 3...) — fix gaps
   - Remove empty or duplicate rows

2. Enrich metadata:
   - Fill empty comment fields with descriptions inferred from column_name and table_name
   - Normalize data_type to Spark SQL types (VARCHAR -> STRING, INT -> INTEGER, FLOAT -> DOUBLE)
   - Add table_catalog and table_schema columns if missing (default: {chapter_3_lakehouse_schema})

3. Print verification summary:
   - Total tables found
   - Total column definitions
   - File path where CSV was saved
   - List of fixes applied (if any)

Downstream Compatibility Note:
This CSV drives the entire Design-First Pipeline:
- Gold Design (Step 11) — reads CSV for dimensional model design
- Bronze Creation (Step 12) — uses schema to create Delta tables
- Silver DQ (Step 13) — uses schema for data quality expectations
- Gold Implementation (Step 14) — uses YAML schemas derived from this CSV
Missing comments, incorrect types, or invalid rows will cascade into errors downstream.

Note: Bronze setup (Step 10) additionally requires per-table governance annotations (entity_type, contains_pii, data_classification, business_owner). If these are not present in the uploaded CSV, the Bronze skill will infer them from column/table name patterns or ask.
```
````

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

> **Artifact root (client-aware).** Resolve `<ARTIFACT_ROOT>` via `vibecoding-state.resolve_root` (it reads `artifact_root` from `## Environment Capabilities`, or detects the active client, `artifact_root` + `skills_install_root`) and write every artifact under it. On Cursor/Copilot that is your repo root; on Databricks Genie Code it is your user project root `/Workspace/Users/<email>/<repo>` (the repo is cloned separately at `/Workspace/Users/<email>/.assistant/skills/<repo>` for skill loading only) — never the page's current working directory.

## 1️⃣ How To Apply

Select the **Upload CSV** tab in Step 10, upload your schema metadata CSV file, and click **Process & Generate**.

**Steps:**
1. Click the upload area or drag your CSV file into the upload zone
2. Wait for validation — all required columns must be present (table_name, column_name, data_type, ordinal_position, is_nullable, comment)
3. Review the preview (table count, column count, detected table names)
4. Click **Process & Generate** to create the coding assistant prompt
5. Copy the generated prompt into your coding assistant
6. The coding assistant will save the CSV to `<ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Schema.csv`

---

## 2️⃣ What Are We Building?

Same as the Extract mode — a **data dictionary CSV** that drives the entire Design-First Pipeline. The only difference is the source: instead of querying `information_schema`, you're providing the CSV directly.

```
<ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Schema.csv
  → Gold Design (Step 11)  — reads CSV to design dimensional model
  → Bronze (Step 12)       — uses schema to create tables
  → Silver (Step 13)       — uses schema for DQ expectations
  → Gold Impl (Step 14)    — uses YAML schemas derived from this CSV
```

---

## 3️⃣ When to Use Upload Mode

Use this when:
- Your source data is **not in Databricks** yet (external databases, CSV exports, data catalogs)
- You have a **pre-existing data dictionary** from another tool (ERStudio, dbt, etc.)
- You want to **skip the SQL extraction** step and provide metadata directly
- Your Databricks CLI is **not configured** for the source catalog

The CSV must follow the `information_schema.columns` format with required columns: `table_name`, `column_name`, `data_type`, `ordinal_position`, `is_nullable`, `comment`.

</details>

<details><summary><strong>Expected Output</strong></summary>

## Expected Deliverables

- `<ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Schema.csv` file created via coding assistant
- Contains column metadata rows for all tables in your schema
- Includes: table_name, column_name, data_type, ordinal_position, is_nullable, comment
- Ready for use as data dictionary reference
- **This CSV is the starting input for the entire Design-First Pipeline** (all subsequent steps reference it)

</details>

---

## Table Metadata & Data Dictionary (Design from PRD)

| Field | Value |
|-------|-------|
| `input_id` | `135` |
| `section_tag` | `bronze_table_metadata_generate` |
| `order_number` | `8` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Design table schema from your PRD — for when you don't have existing tables or a CSV_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

````
## Design Database Schema from PRD

The business requirements are documented in @docs/design_prd.md.

---

### Instructions

Based on the PRD, design a **normalized relational schema** for the **{use_case_title}** use case and save it as a CSV file.

Copy and paste this prompt to the AI:

```
Read the PRD at @docs/design_prd.md and design a complete database schema for the **{use_case_title}** use case.

**Output file:** <ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Schema.csv

**Schema design requirements:**
1. Design 5-15 tables covering all entities, relationships, and transactional data described in the PRD
2. Include primary keys (BIGINT, first column per table) and foreign keys referencing related tables
3. Use Spark SQL data types: STRING, BIGINT, INT, DOUBLE, DECIMAL(precision,scale), BOOLEAN, DATE, TIMESTAMP
4. Add descriptive comments for every column explaining its business meaning
5. Include standard operational columns per table: created_at (TIMESTAMP), updated_at (TIMESTAMP), is_active (BOOLEAN)
6. Use snake_case for all table and column names
7. Design for analytics — include fact tables with numeric measures and dimension tables with descriptive attributes

**CSV format (information_schema.columns compatible):**
```csv
table_catalog,table_schema,table_name,column_name,ordinal_position,data_type,is_nullable,comment
{chapter_3_lakehouse_catalog},{chapter_3_lakehouse_schema},<table_name>,<column_name>,<position>,<type>,<YES/NO>,<description>
```

One row per column, all tables included. ordinal_position restarts at 1 for each table.

**After creating the CSV, validate and enrich:**
1. Verify required columns: table_name, column_name, data_type, ordinal_position, is_nullable, comment
2. Check ordinal_position is sequential per table (1, 2, 3...) — fix gaps
3. Fill empty comment fields with descriptions inferred from column_name and table_name
4. Normalize data_type to Spark SQL types (VARCHAR -> STRING, INT -> INTEGER, FLOAT -> DOUBLE)
5. Print verification summary: total tables, total columns, file path, fixes applied

**Downstream Compatibility Note:**
This CSV drives the entire Design-First Pipeline:
- Gold Design (Step 11) — reads CSV for dimensional model design
- Bronze Creation (Step 12) — uses schema to create Delta tables
- Silver DQ (Step 13) — uses schema for data quality expectations
- Gold Implementation (Step 14) — uses YAML schemas derived from this CSV

Note: Bronze setup (Step 10) additionally requires per-table governance annotations (entity_type, contains_pii, data_classification, business_owner). If these are not present in the generated CSV, the Bronze skill will infer them from column/table name patterns or ask. Well-chosen column names (e.g., `email`, `phone_number`) improve downstream inference accuracy.
```
````

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

> **Artifact root (client-aware).** Resolve `<ARTIFACT_ROOT>` via `vibecoding-state.resolve_root` (it reads `artifact_root` from `## Environment Capabilities`, or detects the active client, `artifact_root` + `skills_install_root`) and write every artifact under it. On Cursor/Copilot that is your repo root; on Databricks Genie Code it is your user project root `/Workspace/Users/<email>/<repo>` (the repo is cloned separately at `/Workspace/Users/<email>/.assistant/skills/<repo>` for skill loading only) — never the page's current working directory.

## How To Apply

1. **Prerequisite:** Complete Step 3 (PRD Generation) first — the PRD is used as input to design the schema
2. Click **Generate** to create the prompt with your PRD embedded
3. Copy the prompt into your coding assistant
4. The coding assistant reads the PRD, designs tables, and saves the CSV to `<ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Schema.csv`
5. Review the generated schema and iterate if needed

---

## When to Use This Mode

Use **Design from PRD** when:
- You **don't have existing tables** in Databricks yet
- You **don't have a CSV export** from another tool
- You want to **start from scratch** with a schema designed from your requirements
- You have a **PRD from Step 3** that describes the data entities you need

This mode works just like the Lakebase table creation step — it gives your coding assistant a detailed prompt with the PRD as context, and the AI designs the schema for you.

---

## What Happens Next

The generated CSV becomes the **data dictionary** that drives the entire Design-First Pipeline:

```
<ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Schema.csv
  → Gold Design (Step 11)  — reads CSV to design dimensional model
  → Bronze (Step 12)       — uses schema to create tables
  → Silver (Step 13)       — uses schema for DQ expectations
  → Gold Impl (Step 14)    — uses YAML schemas derived from this CSV
```

</details>

<details><summary><strong>Expected Output</strong></summary>

## Expected Deliverables

- `<ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Schema.csv` file created via coding assistant
- Contains 5-15 tables with realistic column definitions designed from the PRD
- Includes: table_catalog, table_schema, table_name, column_name, ordinal_position, data_type, is_nullable, comment
- Every column has a descriptive business-context comment
- Ready for use as data dictionary reference
- **This CSV is the starting input for the entire Design-First Pipeline** (all subsequent steps reference it)

</details>

---

## Bronze Layer Creation (Approach C)

| Field | Value |
|-------|-------|
| `input_id` | `7` |
| `section_tag` | `bronze_layer_creation` |
| `order_number` | `10` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Create Bronze layer by copying sample data from {chapter_3_lakehouse_catalog}.{chapter_3_lakehouse_schema} with Asset Bundle structure_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Set up the Bronze layer using @data_product_accelerator/skills/bronze/00-bronze-layer-setup/SKILL.md with Approach C — copy data from the existing source tables in the {chapter_3_lakehouse_catalog}.{chapter_3_lakehouse_schema} schema.

This will involve the following steps:

- **Clone all source tables** from the {chapter_3_lakehouse_catalog}.{chapter_3_lakehouse_schema} schema into your target catalog's Bronze schema
- **Apply enterprise table properties** — enable Change Data Feed (CDF), Liquid Clustering (CLUSTER BY AUTO), auto-optimize, and auto-compact on every table
- **Preserve source COMMENTs** — carry over all column-level documentation from the source schema
- **Create Asset Bundle job** — generate a repeatable, version-controlled deployment job (databricks.yml + clone script)
- **Deploy and run** — validate, deploy the bundle, and execute the clone job to populate Bronze tables

**Bundle root:** Create this Asset Bundle in its own dedicated top-level directory `{user_schema_prefix}_{use_case_slug}_dab/` at the repo root (the data-product `dp_bundle_root`) — write `databricks.yml`, `src/`, and `resources/` UNDER `{user_schema_prefix}_{use_case_slug}_dab/`, never at the bare repo root. Every later data-product step (Silver, Gold, semantic, deploy) extends this SAME bundle folder, so the design (`gold_layer_design/`) and plans (`plans/`) co-locate here too. This is the same root folder on every coding agent.

IMPORTANT: Use the EXISTING catalog `{lakehouse_default_catalog}` -- do NOT create a new catalog. Create the Bronze schema `{user_schema_prefix}_bronze` and tables inside this catalog.

NOTE: Before creating the schema, check if `{lakehouse_default_catalog}.{user_schema_prefix}_bronze` already exists. If it does, DROP the schema with CASCADE and recreate it from scratch. These are user-specific schemas so dropping is safe.

**State-lock (`skills/vibecoding-state`) — run this prompt between an `enter` and an `exit` so workshop state is resolved and locked:**

1. **Phase 0 — first, before any step below:** `skills/vibecoding-state` op `enter` — params: `prompt_id: "bronze_layer_creation"`. `enter` resolves the `## Environment Capabilities` triple (deploy verb, CLI channel, `state_file_root`) so every deploy/run step below uses the resolved channel — `runDatabricksCli` on Genie Code — and writes state under `state_file_root`, never a bare-local assumption.
2. **Final — after the step succeeds:** `skills/vibecoding-state` op `exit` — params: `prompt_id: "bronze_layer_creation"`, `gate: "Bronze layer live"`, `captured: {lakehouse_default_catalog, bronze_schema}`.

**Gate:** `Bronze layer live` — the Bronze clone job completes and every source table is present in the Bronze schema with Change Data Feed enabled.
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## 1️⃣ How To Apply

Copy the prompt above, start a **new Agent chat** in your coding assistant, and paste it.

### Prerequisite

**Run this in your cloned Template Repository** (see Prerequisites in Step 0).

Ensure you have:
- ✅ `data_product_accelerator/skills/bronze/00-bronze-layer-setup/SKILL.md` - The Bronze layer setup skill
- ✅ Access to `{chapter_3_lakehouse_catalog}.{chapter_3_lakehouse_schema}` catalog in your Databricks workspace
- ✅ Permissions to create tables in your target catalog

### Steps to Apply

**Step 1:** Start a new Agent thread in your coding assistant
**Step 2:** Copy the prompt and paste it into your coding assistant
**Step 3:** Review generated code (Asset Bundle config, clone script, job definition)
**Step 4:** Validate: `databricks bundle validate -t dev`
**Step 5:** Deploy: `databricks bundle deploy -t dev`
**Step 6:** Run: `databricks bundle run -t dev bronze_clone_job`
**Step 7:** Verify in Databricks UI (SHOW TABLES, row counts, CDF enabled)

---

## 2️⃣ What Are We Building?

### What is the Bronze Layer?

The Bronze Layer is the **raw data landing zone** in the Medallion Architecture. It preserves source data exactly as received, enabling full traceability and reprocessing.

| Principle | Benefit |
|-----------|---------|
| **Raw Preservation** | Keep original data for audit and replay |
| **Change Data Feed** | Enable incremental processing downstream |
| **Schema Evolution** | Handle schema changes gracefully |
| **Single Source** | One place for all raw data ingestion |

### Bronze Layer in Medallion Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MEDALLION ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│  │   BRONZE    │───▶│   SILVER    │───▶│    GOLD     │                     │
│  │   (Raw)     │CDF │  (Cleaned)  │CDF │  (Business) │                     │
│  └─────────────┘    └─────────────┘    └─────────────┘                     │
│        ▲                                                                    │
│        │                                                                    │
│  ┌─────┴─────┐                                                             │
│  │  SOURCE   │  ◀── This step creates Bronze from source                   │
│  │   DATA    │                                                              │
│  └───────────┘                                                              │
│                                                                             │
│  CDF = Change Data Feed (enables incremental processing)                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Three Approaches for Bronze Data

| Approach | When to Use | What Happens |
|----------|-------------|--------------|
| **A: Generate Fake Data** | Testing/demos before customer delivery | Create DDLs, populate with Faker library |
| **B: Use Existing Bronze** | Customer already has Bronze layer | Skip this step, connect directly |
| **C: Copy from External** | Sample data available (THIS WORKSHOP) | Clone tables from `{chapter_3_lakehouse_catalog}.{chapter_3_lakehouse_schema}` |

**This Prompt Uses Approach C** — we copy from `{chapter_3_lakehouse_catalog}.{chapter_3_lakehouse_schema}` for real-world structure, immediate data availability, and focus on pipeline development.

### Bronze Clone Process

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BRONZE CLONE PROCESS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SOURCE                           TARGET                                    │
│  {chapter_3_lakehouse_catalog}.{chapter_3_lakehouse_schema}     →       {lakehouse_default_catalog}.{user_schema_prefix}_bronze           │
│                                                                             │
│  ┌─────────────────────┐          ┌─────────────────────┐                  │
│  │ amenities           │  CREATE  │ amenities           │ + CDF enabled    │
│  │ booking_updates     │  TABLE   │ booking_updates     │ + CLUSTER BY AUTO│
│  │ bookings            │   AS     │ bookings            │ + Auto-optimize  │
│  │ clickstream         │ SELECT   │ clickstream         │ + TBLPROPERTIES  │
│  │ countries           │ ──────▶  │ countries           │ + COMMENTs       │
│  │ customer_support_.. │          │ customer_support_.. │                  │
│  │ destinations        │          │ destinations        │                  │
│  │ employees           │          │ employees           │                  │
│  │ hosts               │          │ hosts               │                  │
│  │ page_views          │          │ page_views          │                  │
│  │ payments            │          │ payments            │                  │
│  │ properties          │          │ properties          │                  │
│  │ property_amenities  │          │ property_amenities  │                  │
│  │ property_images     │          │ property_images     │                  │
│  │ reviews             │          │ reviews             │                  │
│  │ users               │          │ users               │                  │
│  └─────────────────────┘          └─────────────────────┘                  │
│                                     (all tables)                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Table Properties (Best Practices Enabled)

| Property | Setting | Why It Matters |
|----------|---------|----------------|
| **Liquid Clustering** | ✅ `CLUSTER BY AUTO` | Automatic data layout optimization |
| **Change Data Feed** | ✅ `delta.enableChangeDataFeed = true` | Enables incremental Silver processing |
| **Auto Optimize** | ✅ `delta.autoOptimize.optimizeWrite = true` | Automatic file compaction |
| **Auto Compact** | ✅ `delta.autoOptimize.autoCompact = true` | Reduces small files |

### Tables Cloned from {chapter_3_lakehouse_catalog}.{chapter_3_lakehouse_schema}

| Table | Description | Columns |
|-------|-------------|---------|
| `amenities` | Property amenities (Wi-Fi, Pool, etc.) | 4 |
| `booking_updates` | Change log for booking modifications | 11 |
| `bookings` | Guest booking records | 10 |
| `clickstream` | User click behavior events | 5 |
| `countries` | Country reference data | 3 |
| `customer_support_logs` | Support ticket records | 5 |
| `destinations` | Travel destinations | 6 |
| `employees` | Company employee records | 10 |
| `hosts` | Property host profiles | 9 |
| `page_views` | Website page view events | 7 |
| `payments` | Payment transaction records | 6 |
| `properties` | Vacation rental listings | 13 |
| `property_amenities` | Property-to-amenity mapping (junction) | 2 |
| `property_images` | Property photo references | 6 |
| `reviews` | Guest reviews | 9 |
| `users` | Platform users (guests) | 8 |

### Verification Queries

```sql
-- 1. List all Bronze tables
SHOW TABLES IN {lakehouse_default_catalog}.{user_schema_prefix}_bronze;

-- 2. Check row counts for each table
SELECT 'amenities' as tbl, COUNT(*) as cnt FROM {lakehouse_default_catalog}.{user_schema_prefix}_bronze.amenities
UNION ALL SELECT 'booking_updates', COUNT(*) FROM {lakehouse_default_catalog}.{user_schema_prefix}_bronze.booking_updates
UNION ALL SELECT 'bookings', COUNT(*) FROM {lakehouse_default_catalog}.{user_schema_prefix}_bronze.bookings
UNION ALL SELECT 'clickstream', COUNT(*) FROM {lakehouse_default_catalog}.{user_schema_prefix}_bronze.clickstream
UNION ALL SELECT 'countries', COUNT(*) FROM {lakehouse_default_catalog}.{user_schema_prefix}_bronze.countries
UNION ALL SELECT 'customer_support_logs', COUNT(*) FROM {lakehouse_default_catalog}.{user_schema_prefix}_bronze.customer_support_logs
UNION ALL SELECT 'destinations', COUNT(*) FROM {lakehouse_default_catalog}.{user_schema_prefix}_bronze.destinations
UNION ALL SELECT 'employees', COUNT(*) FROM {lakehouse_default_catalog}.{user_schema_prefix}_bronze.employees
UNION ALL SELECT 'hosts', COUNT(*) FROM {lakehouse_default_catalog}.{user_schema_prefix}_bronze.hosts
UNION ALL SELECT 'page_views', COUNT(*) FROM {lakehouse_default_catalog}.{user_schema_prefix}_bronze.page_views
UNION ALL SELECT 'payments', COUNT(*) FROM {lakehouse_default_catalog}.{user_schema_prefix}_bronze.payments
UNION ALL SELECT 'properties', COUNT(*) FROM {lakehouse_default_catalog}.{user_schema_prefix}_bronze.properties
UNION ALL SELECT 'property_amenities', COUNT(*) FROM {lakehouse_default_catalog}.{user_schema_prefix}_bronze.property_amenities
UNION ALL SELECT 'property_images', COUNT(*) FROM {lakehouse_default_catalog}.{user_schema_prefix}_bronze.property_images
UNION ALL SELECT 'reviews', COUNT(*) FROM {lakehouse_default_catalog}.{user_schema_prefix}_bronze.reviews
UNION ALL SELECT 'users', COUNT(*) FROM {lakehouse_default_catalog}.{user_schema_prefix}_bronze.users;

-- 3. Verify CDF is enabled (check any table)
DESCRIBE EXTENDED {lakehouse_default_catalog}.{user_schema_prefix}_bronze.bookings;
-- Look for: delta.enableChangeDataFeed = true

-- 4. Preview sample data
SELECT * FROM {lakehouse_default_catalog}.{user_schema_prefix}_bronze.bookings LIMIT 5;
```

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It's Used Here |
|----------|-------------------|
| **Change Data Feed (CDF)** | `delta.enableChangeDataFeed = true` on every Bronze table — enables Silver to read only changed rows instead of full table scans |
| **Liquid Clustering** | `CLUSTER BY AUTO` — Databricks automatically chooses optimal clustering columns and reorganizes data layout over time |
| **Auto-Optimize** | `delta.autoOptimize.optimizeWrite = true` + `autoCompact = true` — automatic small file compaction, no manual OPTIMIZE needed |
| **Unity Catalog Governance** | All tables registered in Unity Catalog with proper catalog.schema.table naming, enabling lineage, access control, and discovery |
| **Schema-on-Read with Evolution** | Bronze preserves raw source schema; downstream layers handle schema evolution gracefully |
| **Databricks Asset Bundles (DAB)** | Infrastructure as Code — `databricks.yml` defines jobs, targets, and resources. Deploy with `databricks bundle deploy` for repeatable, CI/CD-ready deployments |
| **Serverless Jobs** | Jobs run on serverless compute — no cluster management, instant startup, pay-per-use cost model |
| **Enterprise Naming Standards** | Tables follow `{schema}.{table_name}` convention; COMMENTs applied to tables and columns for data discovery |

---

## 4️⃣ What Happens Behind the Scenes?

When you paste the prompt, the AI reads `@data_product_accelerator/skills/bronze/00-bronze-layer-setup/SKILL.md` — the **Bronze orchestrator skill**. Behind the scenes:

1. **Orchestrator reads approach** — detects "Approach C" and activates the clone-from-source workflow
2. **Common skills auto-loaded** — the orchestrator's mandatory dependencies include:
   - `databricks-table-properties` — ensures CDF, liquid clustering, auto-optimize are set
   - `databricks-asset-bundles` — generates proper `databricks.yml` and job YAML
   - `naming-tagging-standards` — applies enterprise naming conventions and COMMENTs
   - `schema-management-patterns` — handles `CREATE SCHEMA IF NOT EXISTS`
   - `databricks-python-imports` — handles shared code modules between notebooks
3. **Code generation** — the skill produces clone scripts that read from `{chapter_3_lakehouse_catalog}.{chapter_3_lakehouse_schema}` and write to your catalog with all best practices applied
4. **Deploy loop** — if deployment fails, the `databricks-autonomous-operations` skill kicks in for self-healing (deploy → poll → diagnose → fix → redeploy)

</details>

<details><summary><strong>Expected Output</strong></summary>

## Expected Deliverables

### 📁 Generated Asset Bundle Structure

```
{user_schema_prefix}_{use_case_slug}_dab/                    # data-product bundle root (dp_bundle_root) — a dedicated top-level folder at the repo root, NOT the bare root
├── databricks.yml                      # Bundle configuration (updated)
├── src/
│   └── {project}_bronze/
│       ├── __init__.py
│       └── clone_samples.py            # Code to copy sample data
└── resources/
    └── bronze/
        └── bronze_clone_job.yml        # Job configuration
```

---

### ✅ Success Criteria Checklist

**Bundle Deployment:**
- [ ] `databricks bundle validate` passes with no errors
- [ ] `databricks bundle deploy` completes successfully
- [ ] Job appears in Databricks Workflows UI

**Job Execution:**
- [ ] Bronze clone job runs without errors
- [ ] All tables cloned successfully
- [ ] Job completes in < 10 minutes

**Table Verification:**
- [ ] All tables visible in Unity Catalog
- [ ] Row counts match source tables
- [ ] CDF enabled on all tables
- [ ] Liquid clustering enabled
- [ ] Sample data looks correct

</details>

#### Fork — `coding_assistant = genie-code`  (input_id 901)

> Fork rows override only `input_template`, `system_prompt`, and `bypass_llm`. All display fields are inherited from the default row above.

| Field | Value |
|-------|-------|
| `input_id` | `901` |
| `section_tag` | `bronze_layer_creation` |
| `order_number` | `(inherited)` |
| `coding_assistant` | `genie-code` |
| `bypass_llm` | `true` |

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

````
Build the Bronze layer — author and deploy a bundle that lands raw source data into Delta. Before this step there are no Bronze tables; after it, the Bronze bundle is authored under `<DP_BUNDLE_ROOT>`, deployed, and the Bronze tables are live in the target catalog.

This will involve the following steps:

- **Resolve the target catalog** — no-create invariant (HARD STOP if absent).
- **Load the skills** — full `skill_ref_root`-prefixed paths.
- **Author the Bronze bundle** — copy the sample data (Approach C) into the bundle.
- **Write and deploy** — write the bundle files to `<DP_BUNDLE_ROOT>`, then deploy and run it from the bundle-editor page.

The steps below are the prescriptive runbook for those actions; follow them in order.

**Genie Code — this is a prescriptive runbook. Follow the steps in order. Do NOT improvise paths, do NOT use bare relative paths, do NOT use `@`-mentions, and do NOT create tables directly. Every skill is named by its full `skill_ref_root`-prefixed path; every artifact is anchored to `<DP_BUNDLE_ROOT>`; every table is created by a deployed bundle job — never by hand.**

### 🔴 Non-negotiable execution rule (read before anything)

❌ **NEVER** run table DDL, `CREATE` / `DEEP CLONE`, `ALTER … SET TBLPROPERTIES`, `CLUSTER BY`, or any data-loading statement directly via `executeCode` / `spark.sql` / a notebook cell. Those statements are the **body of the bundle job**. The bundle **is** the execution mechanism — never bypass it, even though direct SQL is faster. Creating live tables with no versioned bundle behind them is the regression this fork exists to prevent.

✅ The ONLY things you run directly are (a) **read-only** inspection (`SHOW TABLES`, `DESCRIBE`, `SELECT COUNT(*)`) and (b) `databricks bundle validate` / `deploy` / `run` through `runDatabricksCli`. If `bundle deploy` is blocked, FIX the page context (Step 3) — do **not** fall back to direct SQL.

### Step 0 — Resolve your environment (once, before anything else)

Run `skills/vibecoding-state` operation `enter` with `prompt_id: "bronze_layer_creation"`. It writes and echoes the `## Environment Capabilities` block. Read these resolved values and use them literally throughout:

- `client_context` = `genie_code`
- `artifact_root` = your workshop project root (e.g. `/Workspace/Users/<your-email>/vibe-coding-workshop`) — where all generated bundles/apps/docs build; the repo itself is cloned at `/Workspace/Users/<your-email>/.assistant/skills/vibe-coding-workshop` (skills load from there via `skill_ref_root`, NOT from `artifact_root`)
- `skill_ref_root` = `skills/vibe-coding-workshop` (substitute your clone folder if you cloned somewhere other than `.assistant/skills/vibe-coding-workshop`)
- `dp_bundle_root` = `<artifact_root>/{user_schema_prefix}_{use_case_slug}_dab` — the **self-contained Databricks Asset Bundle project** for the whole data-product pipeline (e.g. `…/vibe-coding-workshop/{user_schema_prefix}_booking_app_dab`). This — NOT the project root — is where you write `databricks.yml`, `src/`, and `resources/`, and it is the **page you deploy from**. Referred to below as `<DP_BUNDLE_ROOT>`.
- deploy verb = `bundle deploy --target dev`, run through the `runDatabricksCli` tool

If `enter` has not run in this thread, run it now — every step below depends on these values.

**On resume after a context reset:** trust the live state file over any chat summary — a prompt whose state entry shows its gate PASSED is DONE (do NOT re-run it), and before re-writing files reconcile what is already on disk with `os.listdir(...)` (NOT `listFiles`, which lags FUSE writes) against the state file's captured paths, so you resume rather than recreate.

### Step 0.5 — Resolve the target catalog (no-create invariant — HARD STOP if absent)

Catalogs are pre-provisioned in this workshop — you must **NEVER** create one. `CREATE CATALOG` in a Default-Storage workspace fails ("no metastore storage root"); creating catalogs is also not the customer best practice you are demonstrating. Resolve the catalog read-only, BEFORE authoring anything:

1. **List existing catalogs (read-only):** `executeCode` → `[c.name for c in w.catalogs.list()]` (or `SHOW CATALOGS`).
2. **If `{lakehouse_default_catalog}` is present** → proceed; use it literally as `USE CATALOG {lakehouse_default_catalog}` everywhere below.
3. **If `{lakehouse_default_catalog}` is ABSENT → 🛑 HARD STOP. Do NOT create it.** Print the existing catalogs as a numbered list and ask the operator to pick the catalog to use (or confirm the intended name). Re-run this step with their choice. Record the chosen value as `lakehouse_default_catalog` so the `exit` capture (Step 3) persists it and every downstream step reuses it without re-prompting.
4. **The generated clone/DDL notebook (Step 2) must `USE CATALOG <existing>` and must NEVER emit `CREATE CATALOG` / `CREATE CATALOG IF NOT EXISTS`.** Only the user-specific SCHEMA (`{user_schema_prefix}_bronze`) is created — inside the existing catalog, by the deployed job.

### Step 1 — Load the required skills by their FULL `skill_ref_root`-prefixed paths

Load each skill with `readSkillFile` using its fully-qualified `<skill_ref_root>`-prefixed path — NEVER a bare `@…` mention, NEVER a repo-relative path. **The root-level `skills/` come FIRST: they are the highest-priority, always-on guardrails and govern everything below.** Skills load in two tiers to keep context lean without weakening the preflight-ack gate.

**Tier A — read in FULL now (one batched `readSkillFile` turn) and acknowledge.** These are the guardrails used while authoring in Step 2:

1. `readSkillFile("skills/vibe-coding-workshop/skills/databricks-expert-agent/SKILL.md")` — core rule: extract names from the source, never hardcode.
2. `readSkillFile("skills/vibe-coding-workshop/skills/databricks-asset-bundles/SKILL.md")` — serverless job YAML, Environments V4, `notebook_task`, `base_parameters`. **You will not write any `databricks.yml` or job YAML until you have read this.**
3. `readSkillFile("skills/vibe-coding-workshop/data_product_accelerator/skills/bronze/00-bronze-layer-setup/SKILL.md")` — the orchestrator (drive Approach C from it).
4. `readSkillFile("skills/vibe-coding-workshop/data_product_accelerator/skills/common/databricks-table-properties/SKILL.md")` — Bronze TBLPROPERTIES, `CLUSTER BY AUTO`, governance metadata, and the no-`DEFAULT`-in-DDL rule. **NEVER write TBLPROPERTIES without reading this.**

**Tier B — acknowledge the inlined one-line rule now; defer the full `readSkillFile` to the phase that uses it.** This only DEFERS the read (the orchestrator's per-phase Pre-Conditions force the full read at the right moment) — it does NOT skip it:

- `skills/vibe-coding-workshop/data_product_accelerator/skills/common/naming-tagging-standards/SKILL.md` — rule: snake_case, `bronze_` table/schema prefix, dual-purpose COMMENTs on every table/column, governed `class.*` PII tags inferred from column names. Full read when you name the schema/tables.
- `skills/vibe-coding-workshop/data_product_accelerator/skills/common/schema-management-patterns/SKILL.md` — rule: `CREATE SCHEMA IF NOT EXISTS` with governance metadata; enable Predictive Optimization via `ALTER SCHEMA ENABLE PREDICTIVE OPTIMIZATION` (NOT TBLPROPERTIES); schemas are NOT bundle resources. Full read when you create the Bronze schema.

When the orchestrator lists further **Mandatory Skill Dependencies**, load EACH the same way: take its repo-relative path and prefix it with `skill_ref_root`. Genie Code has no repo-root-relative resolution and `AGENTS.md` does not carry across threads — so always prefix with `skill_ref_root`. **Read independent Tier-A skills in one batched `readSkillFile` turn — Genie Code reads multiple skill files in parallel in a single turn, so never serialize independent reads (`genie-code-environment` §10).**

**🔴 Preflight acknowledgement (hard gate — do this BEFORE writing any file).** Echo a one-line acknowledgement for EVERY skill above — **both tiers**: for Tier A, the rule you took from the full read; for Tier B, the inlined rule above plus the phase at which you will full-read it. If you cannot state a Tier-A skill's rule, you have not actually read it — STOP and read it before writing anything. Do not author `databricks.yml`, job/pipeline YAML, notebooks, or any artifact until every listed skill (both tiers) is acknowledged — silently skipping a skill is the regression this preflight exists to prevent.

### Step 2 — Author the bundle (Approach C — copy sample data). Do NOT execute anything yet.

Using the skills above, AUTHOR (write files only — no execution) a bundle whose job, when it runs, will:

- **Clone all source tables** from the `{chapter_3_lakehouse_catalog}.{chapter_3_lakehouse_schema}` schema into your target Bronze schema (the `DEEP CLONE` is a statement INSIDE the job notebook — not something you run now).
- **Apply enterprise table properties** — Change Data Feed (CDF), `CLUSTER BY AUTO`, auto-optimize, and auto-compact on every table.
- **Preserve source COMMENTs** — carry over all column-level documentation from the source schema.
- 🔴 **No `DEFAULT` column clauses in any DDL.** A `DEFAULT <expr>` clause needs the `delta.feature.allowColumnDefaults` table feature (off by default) and the `CREATE TABLE` will fail — set defaults at INSERT time instead, and do not add columns the source/template did not call for (see `common/unity-catalog-constraints` → "Never Use `DEFAULT` Column Clauses in DDL").

IMPORTANT: Use the EXISTING catalog `{lakehouse_default_catalog}` — do NOT create a new catalog. The job creates the Bronze schema `{user_schema_prefix}_bronze` and its tables inside this catalog.

NOTE: The job notebook checks whether `{lakehouse_default_catalog}.{user_schema_prefix}_bronze` already exists and, if so, DROPs it with CASCADE and recreates it from scratch (user-specific schema — safe to drop). This DROP/CREATE runs INSIDE the job, not as a direct statement you execute.

### Step 3 — Write bundle files to `<DP_BUNDLE_ROOT>`, then deploy FROM that page

- Write every generated file UNDER `<DP_BUNDLE_ROOT>` — never the project root (writing at the project root is the "one level too high" bug), never `/tmp`, never a bare relative path (Genie Code's CWD is page-type-dependent):
  - `<DP_BUNDLE_ROOT>/databricks.yml`
  - `<DP_BUNDLE_ROOT>/src/{user_schema_prefix}_bronze/clone_samples.py`
  - `<DP_BUNDLE_ROOT>/resources/bronze/bronze_clone_job.yml`
- 🔴 **`databricks.yml` MUST disable source-linked deployment from the start.** This is the bundle's root config and every later layer inherits it, so set it here, in Bronze, under `targets.dev`:

```yaml
targets:
  dev:
    presets:
      source_linked_deployment: false
```

  Rationale: with source-linked deployment ON, a `notebook_task` whose source is a workspace file resolves to the in-place editor file rather than the uploaded bundle artifact — which fails at run time with "Unable to access the notebook" (a live Bronze failure). `false` uploads a real notebook artifact, which is the customer best practice you are demonstrating. **Verify after deploy:** `databricks bundle validate --target dev` reports no source-linked warning, and the deployed job task points at the bundle's uploaded artifact path (under `…/.bundle/…/files/`), not your editor file path.
- 🔴 **The bundle `name:` MUST match the username-prefixed folder name** so concurrent workshop users in a shared workspace never collide. Set `bundle: { name: {user_schema_prefix}_{use_case_slug}_dab }` (the same `{user_schema_prefix}_{use_case_slug}_dab` as `<DP_BUNDLE_ROOT>`'s folder). Databricks already isolates deploys per user under `/Workspace/Users/<email>/.bundle/…`; the prefix additionally disambiguates the source folder AND the bundle name in shared catalogs/UIs.
- **Open the bundle editor BEFORE any `bundle` command — and surface its link.** As soon as `<DP_BUNDLE_ROOT>/databricks.yml` exists, the workspace file browser shows an **"Open in bundle editor"** affordance on that folder (and an **"Open in editor"** button at the top of the folder view). Its page CWD IS `<DP_BUNDLE_ROOT>` — the bundle-root page `bundle deploy`/`run` require, where Genie Code runs deploy/run pre-approved. **Do not make the operator hunt for the icon** — build a clickable link with the pre-authenticated `WorkspaceClient` (`w`) and print it:
  - `host = w.config.host`; `o = w.get_workspace_id()`
  - `file_id = w.workspace.get_status("<DP_BUNDLE_ROOT>/databricks.yml").object_id`
  - `folder_id = w.workspace.get_status("<DP_BUNDLE_ROOT>").object_id`
  - **Bundle editor:** `{host}/editor/files/{file_id}?o={o}&contextId=folder%3A{folder_id}` (plain folder: `{host}/browse/folders/{folder_id}?o={o}`)

  Tell the operator to open the **bundle-editor link**, then run every `databricks bundle …` command below from that page. Edit the EXISTING on-page `databricks.yml` — files created via the workspace API may not reach the CLI's FUSE mount.
- **File-write tiers + verify writes (Genie Code — see `genie-code-environment` §10).** Once compute is warm, write each file with `executeCode` `open(path,"w").write(...)` (one call per file; make the FIRST `executeCode` a trivial `print("ready")` to absorb the ~3–5 min serverless cold start, and never set `timeoutMinutes` below 15). The compute-free `createAsset` → `readFile` → `workspaceUpdateFile` trio also works, but `workspaceUpdateFile` only updates a file that already exists AND was read this thread — reserve it for editing the on-page `databricks.yml`. 🔴 **Verify every write with `os.path.exists(path)` (or `os.listdir(dir)`) in the SAME `executeCode` block — NOT `listFiles`:** the workspace REST API behind `listFiles` lags FUSE-written files (a live run saw `listFiles`=7 while `os.listdir`=12), so `listFiles` returns false "missing-file" negatives and you waste turns recreating files that already exist.
- Validate → deploy → run the job through `runDatabricksCli`, **from the bundle-editor page**, each with `--target dev` (mandatory — a target-less deploy is guardrail-blocked):
  - `databricks bundle validate --target dev`
  - `databricks bundle deploy --target dev`
  - `databricks bundle run --target dev bronze_clone_job`
- **🛑 If a `bundle` command is blocked or fails, STOP — do not work around it.** A `databricks.yml not found` error or a "blocked by safety guardrails" message means you are NOT on the bundle page: open the **bundle-editor link** above and retry (CONFIRMED — the same `bundle deploy` that is "blocked" from a file page returns "Deployment complete!" from the bundle editor). If it STILL fails from the bundle editor, STOP and report the blocker to the operator. Do **NOT** create the job or tables via the Jobs/Pipelines REST API (`jobs/create`, `/api/2.0/pipelines`), the SDK, or direct SQL to "get it done" — that silently defeats the bundle (no version control, no `bundle destroy` cleanup) and FAILS the gate. The REST/SDK route is an **escape hatch available only if the operator explicitly authorizes it.**

**State-lock:** this prompt runs between an `enter` (Step 0) and an `exit`. After the gate passes, run `skills/vibecoding-state` op `exit` — params: `prompt_id: "bronze_layer_creation"`, `gate: "Bronze layer live"`, `captured: {lakehouse_default_catalog, bronze_schema}`. **This `enter`/`exit` pair is a mandatory ritual, not advisory.** Step 0's `enter` MUST locate — or, if this is the first prompt of the track, bootstrap-create — the canonical live state file at `<dp_bundle_root>/.vibecoding-state.md` (never the temporary `example/…` bootstrap path). The closing `exit` MUST append this prompt's Per-Step Log entry, Gate result, and `captured` vars to that file, then **re-read it and echo the appended section to prove the write landed**. **Gate completion rule:** this prompt is NOT complete until that re-read confirms the appended entry — the chat summary is NOT the state store.

**Gate:** `Bronze layer live` — the Bronze clone job was **created by `bundle deploy` and executed by `bundle run`** (the job is visible in Workflows and returned a successful run ID), AND every source table is present in `{lakehouse_default_catalog}.{user_schema_prefix}_bronze` with Change Data Feed enabled. Tables existing + CDF on is **necessary but NOT sufficient** — if the tables were created by direct SQL instead of the deployed job, the gate FAILS and you must redo this via the bundle.

**➡️ Next step — keep the bundle editor open.** You now have a `databricks.yml` under `<DP_BUNDLE_ROOT>`, so the **"Open in bundle editor"** affordance is available on that folder. Every later data-product step (Silver, Gold, semantic, …) extends this SAME bundle and deploys from this SAME bundle-editor page — stay in (or return to) the bundle editor for `<DP_BUNDLE_ROOT>` rather than working from a generic file page.
````

---

## Bronze Layer Creation (from CSV)

| Field | Value |
|-------|-------|
| `input_id` | `120` |
| `section_tag` | `bronze_layer_creation_upload` |
| `order_number` | `10` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Generate DDLs and Faker test data from the uploaded schema CSV using Agent Skills to build the Bronze layer_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
## Bronze Layer Creation

Schema: @data_product_accelerator/context/{use_case_file_prefix}_Schema.csv
Skill: @data_product_accelerator/skills/bronze/00-bronze-layer-setup/SKILL.md
Approach: **A — Schema CSV + Faker** (DDLs + test data)

This will involve the following steps:

1. **Requirements** — Parse the schema CSV, classify tables (dims vs facts), identify FK relationships
2. **Table DDLs** — Generate `setup_tables.py` with CREATE TABLE for all tables (CLUSTER BY AUTO, CDF, TBLPROPERTIES)
3. **Faker Data** — Generate dimension + fact data scripts with seeded Faker, non-linear distributions, 5% corruption rate
4. **Asset Bundle Jobs** — Create job YAMLs for table creation and data generation (Serverless, Environments V4)
5. **Deploy & Validate** — After all artifacts are created, deploy and run:
   - `databricks bundle deploy -t dev`
   - `databricks bundle run bronze_setup_job -t dev`
   - `databricks bundle run bronze_data_generator_job -t dev`
   - Run validation queries to confirm tables exist, row counts are correct, and CDF is enabled

**State-lock (`genai-agents/vibecoding-state`) — run this prompt between an `enter` and an `exit` so workshop state is resolved and locked:**

1. **Phase 0 — first, before any step below:** `genai-agents/vibecoding-state` op `enter` — params: `prompt_id: "bronze_layer_creation_upload"`. `enter` resolves the `## Environment Capabilities` triple (deploy verb, CLI channel, `state_file_root`) so every deploy/run step below uses the resolved channel — `runDatabricksCli` on Genie Code — and writes state under `state_file_root`, never a bare-local assumption.
2. **Final — after the step succeeds:** `genai-agents/vibecoding-state` op `exit` — params: `prompt_id: "bronze_layer_creation_upload"`, `gate: "Bronze layer live"`, `captured: {lakehouse_default_catalog, bronze_schema}`.

**Gate:** `Bronze layer live` — the Bronze setup and data-generator jobs complete and the Bronze tables are populated.
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## 1️⃣ How To Apply

Copy the prompt above, start a **new Agent chat** in your coding assistant, and paste it. The AI will read the Bronze setup skill and generate the implementation.

### Prerequisite

**Run this in your cloned Template Repository** (see Prerequisites in Step 0).

Ensure you have:
- ✅ `data_product_accelerator/context/{use_case_file_prefix}_Schema.csv` — created in the previous step (Step 10 Upload CSV mode)
- ✅ `data_product_accelerator/skills/bronze/00-bronze-layer-setup/SKILL.md` — the Bronze layer setup skill in your repo
- ✅ Access to `{lakehouse_default_catalog}` catalog in your Databricks workspace
- ✅ Permissions to create schemas and tables in the target catalog

### Steps to Apply

**Step 1: Generate Bronze Layer Code**

1. **Start a new Agent thread** in your coding assistant
2. **Copy the prompt** using the copy button
3. **Paste it into your coding assistant** and let the AI:
   - Read the skill file and parse your schema CSV
   - Classify tables (dimensions vs facts) and identify FK relationships
   - Generate `setup_tables.py` with CREATE TABLE DDLs
   - Generate Faker data scripts with seeded data and corruption

**Step 2: Deploy the Bundle**

> **Client note:** IDE runs these in a terminal; Genie Code runs the `databricks bundle …` commands via `runDatabricksCli` (be on the bundle's page; resolved channel in `## Environment Capabilities`). See `genie-code-environment`.

```bash
# Deploy to Databricks workspace
databricks bundle deploy -t dev

# Expected: Jobs created successfully
```

**Step 3: Run Table Setup Job**

```bash
# Create all Bronze tables
databricks bundle run bronze_setup_job -t dev

# Verify tables were created in the catalog
```

**Step 4: Run Data Generator Job**

```bash
# Generate and load Faker test data
databricks bundle run bronze_data_generator_job -t dev

# Verify data was loaded with expected row counts
```

**Step 5: Validate Results**

Verify in Databricks UI:
- Tables created in `{lakehouse_default_catalog}.{user_schema_prefix}_bronze`
- Faker data loaded with correct row counts
- CDF enabled on all tables
- Non-linear distributions and ~5% corruption rate present in data

---

## 2️⃣ What Are We Building?

### Bronze Layer from CSV with Faker Data

This mode uses an **Agent Skill** to generate the Bronze layer from your schema CSV, creating DDLs and realistic test data using Faker:

| Step | What Happens |
|------|-------------|
| **Parse CSV** | Read the metadata CSV, classify tables (dims vs facts), identify FK relationships |
| **Generate DDLs** | `setup_tables.py` with CREATE TABLE (proper types, CDF, liquid clustering, auto-optimize) |
| **Generate Faker Data** | Python scripts using seeded Faker with non-linear distributions and 5% corruption |
| **Bundle & Deploy** | Asset Bundle jobs for table creation and data generation (Serverless, Environments V4) |

### Why This Approach?

Use this when your source data is **not in Databricks** yet. The skill-based approach ensures consistent, well-structured Bronze tables with realistic test data that exercises downstream Silver and Gold pipelines.

---

## 3️⃣ Generated File Structure

```
data_product_accelerator/
├── skills/bronze/00-bronze-layer-setup/
│   └── SKILL.md                          # Bronze layer skill (input)
├── context/
│   └── {use_case_file_prefix}_Schema.csv           # Schema metadata CSV (input)
├── src/bronze/
│   ├── setup_tables.py                   # CREATE TABLE DDLs for all tables
│   └── generate_data.py                  # Faker-based data generation scripts
└── resources/bronze/
    ├── bronze_setup_job.yml              # Asset Bundle job for table creation
    └── bronze_data_generator_job.yml     # Asset Bundle job for data generation
```

</details>

<details><summary><strong>Expected Output</strong></summary>

## Expected Deliverables

### 📁 Generated File Structure

```
data_product_accelerator/
├── skills/bronze/00-bronze-layer-setup/
│   └── SKILL.md                          # Bronze layer skill (input)
├── context/
│   └── {use_case_file_prefix}_Schema.csv           # Schema metadata CSV (input)
├── src/bronze/
│   ├── setup_tables.py                   # CREATE TABLE DDLs for all tables
│   └── generate_data.py                  # Faker-based data generation scripts
├── resources/bronze/
│   ├── bronze_setup_job.yml              # Asset Bundle job for table creation
│   └── bronze_data_generator_job.yml     # Asset Bundle job for data generation
└── databricks.yml                         # Updated bundle config
```

---

### ✅ Success Criteria Checklist

**Table DDLs:**
- [ ] All tables from the schema CSV have corresponding CREATE TABLE statements
- [ ] Column types match the CSV data_type values
- [ ] CDF enabled on all tables (`delta.enableChangeDataFeed = true`)
- [ ] Liquid clustering enabled (`CLUSTER BY AUTO`)
- [ ] Auto-optimize enabled (`delta.autoOptimize.optimizeWrite`, `delta.autoOptimize.autoCompact`)

**Faker Data:**
- [ ] Dimension tables populated with seeded Faker data
- [ ] Fact tables populated with non-linear distributions
- [ ] ~5% corruption rate applied for data quality testing
- [ ] Referential integrity across related tables

**Bundle Deployment:**
- [ ] `databricks bundle validate` passes with no errors
- [ ] `databricks bundle deploy` completes successfully
- [ ] Jobs appear in Databricks Workflows UI

**Job Execution:**
- [ ] `bronze_setup_job` creates all tables in `{lakehouse_default_catalog}.{user_schema_prefix}_bronze`
- [ ] `bronze_data_generator_job` loads Faker data successfully
- [ ] Validation queries confirm tables exist, row counts are correct, and CDF is enabled

</details>

---

## Silver Layer Pipelines (SDP)

| Field | Value |
|-------|-------|
| `input_id` | `8` |
| `section_tag` | `silver_layer_sdp` |
| `order_number` | `11` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Create Silver layer using Spark Declarative Pipelines with centralized data quality rules_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Set up the Silver layer using @data_product_accelerator/skills/silver/00-silver-layer-setup/SKILL.md

**Bundle root:** Extend the SAME data-product bundle created in Bronze — its dedicated top-level folder `{user_schema_prefix}_{use_case_slug}_dab/` at the repo root (`dp_bundle_root`). All relative paths below (`src/`, `resources/`, `databricks.yml`) resolve UNDER `{user_schema_prefix}_{use_case_slug}_dab/`, never the bare repo root. Same folder on every coding agent.

This will involve the following steps:

- **Generate SDP pipeline notebooks** — create Spark Declarative Pipeline notebooks with incremental ingestion from Bronze using Change Data Feed (CDF)
- **Create centralized DQ rules table** — build a configurable data quality rules table with expectations (null checks, range validation, referential integrity)
- **Create Asset Bundle** — generate bundle configuration for both the DQ rules setup job and the SDP pipeline
- **Deploy and run in order** — deploy the bundle, run the DQ rules setup job FIRST (creates the rules table), then run the SDP pipeline (reads rules from the table)

Ensure bundle is validated and deployed successfully, and silver layer jobs run with no errors.

Validate the results in the UI to ensure the DQ rules show up in centralized delta table, and that the silver layer pipeline runs successfully with Expectations being checked.

IMPORTANT: Use the EXISTING catalog `{lakehouse_default_catalog}` -- do NOT create a new catalog. Create the Silver schema `{user_schema_prefix}_silver` and all Silver tables inside this catalog.

NOTE: Before creating the schema, check if `{lakehouse_default_catalog}.{user_schema_prefix}_silver` already exists. If it does, DROP the schema with CASCADE and recreate it from scratch. These are user-specific schemas so dropping is safe.

NOTE: This is a shared workshop workspace. Include a `user_prefix` variable in your pipeline/job `name:` fields (e.g., `"[${bundle.target} ${var.user_prefix}] Silver Layer Pipeline"`) to avoid `pipeline name is already used` collisions with other attendees. `databricks bundle deploy --force` does NOT resolve these — see `common/databricks-asset-bundles` → "Shared Workspace Naming".

**State-lock (`skills/vibecoding-state`) — run this prompt between an `enter` and an `exit` so workshop state is resolved and locked:**

1. **Phase 0 — first, before any step below:** `skills/vibecoding-state` op `enter` — params: `prompt_id: "silver_layer_sdp"`, `require_prior_gate: {prompt_id: "bronze_layer_creation", gate: "Bronze layer live"}`. `enter` resolves the `## Environment Capabilities` triple (deploy verb, CLI channel, `state_file_root`) so every deploy/run step below uses the resolved channel — `runDatabricksCli` on Genie Code — and writes state under `state_file_root`, never a bare-local assumption.
2. **Final — after the step succeeds:** `skills/vibecoding-state` op `exit` — params: `prompt_id: "silver_layer_sdp"`, `gate: "Silver layer live"`, `captured: {silver_schema, silver_dlt_pipeline, dq_rules_table}`.

**Gate:** `Silver layer live` — the DQ-rules setup job runs first, then the Silver pipeline completes with data-quality expectations evaluated.
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## 1️⃣ How To Apply

Copy the prompt above, start a **new Agent chat** in your coding assistant, and paste it. The AI will read the Silver setup skill and generate the implementation.

### Prerequisite

**Run this in your cloned Template Repository** (see Prerequisites in Step 0).

Ensure you have:
- ✅ Bronze layer created and populated (Step 10 complete)
- ✅ `data_product_accelerator/skills/silver/00-silver-layer-setup/SKILL.md` - The Silver layer setup skill (loads worker skills automatically)

### Steps to Apply

**Step 1: Generate Silver Layer Code**

1. **Start a new Agent thread** in your coding assistant
2. **Copy the prompt** using the copy button
3. **Paste it into your coding assistant** and let the AI generate:
   - SDP pipeline notebooks
   - Data quality rules configuration
   - Asset Bundle job definitions

**Step 2: Validate the Bundle**

> **Client note:** IDE runs these in a terminal; Genie Code runs the `databricks bundle …` commands via `runDatabricksCli` (be on the bundle's page; resolved channel in `## Environment Capabilities`). See `genie-code-environment`.

```bash
# Validate bundle configuration
databricks bundle validate -t dev

# Expected: No errors, all resources validated
```

**Step 3: Deploy the Bundle**

```bash
# Deploy to Databricks workspace
databricks bundle deploy -t dev

# Expected: Pipeline and jobs created successfully
```

**Step 4: Run DQ Rules Setup Job FIRST ⚠️**

**CRITICAL: You must create the DQ rules table before running the pipeline — otherwise the pipeline fails with `Table or view not found: dq_rules`.**

```bash
# Run the DQ rules setup job (creates and populates dq_rules table)
databricks bundle run -t dev silver_dq_setup_job

# Verify the rules table was created:
# SELECT * FROM {lakehouse_default_catalog}.{user_schema_prefix}_silver.dq_rules
```

**Step 5: Run the Silver DLT Pipeline**

```bash
# NOW run the DLT pipeline (it reads rules from the dq_rules table)
databricks bundle run -t dev silver_dlt_pipeline

# Or trigger from Databricks UI:
# Workflows → DLT Pipelines → [dev] Silver Layer Pipeline → Start
```

**Step 6: Validate Results in UI**

After pipeline completes, verify in Databricks UI:

1. **Check DQ Rules Table:**
   ```sql
   SELECT * FROM {lakehouse_default_catalog}.{user_schema_prefix}_silver.dq_rules;
   ```
   ✅ Should show all configured quality rules

2. **Check Pipeline Event Log:**
   - Navigate to: Workflows → DLT Pipelines → Your Pipeline
   - Click "Data Quality" tab
   - ✅ Should show Expectations being evaluated
   - **For per-expectation pass/fail counts**, run this in the SQL editor (the `databricks pipelines list-pipeline-events` CLI does NOT return this detail):

     ```sql
     SELECT
       event_type,
       details:flow_progress.data_quality.dropped_records AS dropped,
       details:flow_progress.data_quality.expectations    AS expectations
     FROM event_log(TABLE({lakehouse_default_catalog}.{user_schema_prefix}_silver.<silver_table>))
     WHERE details:flow_progress.data_quality IS NOT NULL
     ORDER BY timestamp DESC
     LIMIT 5;
     ```

3. **Check Silver Tables:**
   ```sql
   SHOW TABLES IN {lakehouse_default_catalog}.{user_schema_prefix}_silver;
   SELECT * FROM {lakehouse_default_catalog}.{user_schema_prefix}_silver.{table} LIMIT 10;
   ```
   ✅ Should show cleaned, validated data

---

## 2️⃣ What Are We Building?

### What is the Silver Layer?

The Silver Layer transforms raw Bronze data into **cleaned, validated, and enriched** data ready for Gold layer consumption.

### Core Philosophy: Schema Cloning

Silver should **mirror the Bronze schema** with minimal changes — same column names, same data types, same grain. The value-add is **data quality**, not transformation:

| ✅ DO in Silver | ❌ DON'T do in Silver (save for Gold) |
|----------------|--------------------------------------|
| Apply DQ rules (null checks, range validation) | Aggregation (SUM, COUNT, GROUP BY) |
| Add derived flags (`is_return`, `is_out_of_stock`) | Join across tables |
| Add business keys (SHA256 hashes) | Complex business logic |
| Add `processed_timestamp` | Schema restructuring |
| Deduplicate records | Rename columns significantly |

**Why?** Silver is the validated copy of source data. Gold handles complex transformations. This keeps Silver focused on data quality and makes troubleshooting easier (column names match source).

### Why Spark Declarative Pipelines (SDP)?

| Feature | Benefit |
|---------|---------|
| **Incremental Ingestion** | Reads only changed data from Bronze using Change Data Feed (CDF) |
| **Built-in Quality Rules** | Expectations framework for data validation |
| **Serverless Compute** | Cost-efficient, auto-scaling execution |
| **Automatic Schema Evolution** | Handles schema changes gracefully |
| **Complete Lineage** | Full data lineage tracking in Unity Catalog |
| **Photon Engine** | Vectorized query execution for faster processing |

### Key Validation Points

| What to Check | Where | Expected Result |
|---------------|-------|-----------------|
| DQ Rules loaded | `dq_rules` table | Rules visible in Delta table |
| Expectations running | Pipeline event log | Pass/Warn/Fail counts shown |
| Data quality | Silver tables | Clean, standardized data |
| Incremental working | Pipeline metrics | Only new/changed rows processed |

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It's Used Here |
|----------|-------------------|
| **Spark Declarative Pipelines (SDP/DLT)** | Silver uses SDP for declarative, streaming-first pipelines — define WHAT the data should look like, not HOW to process it |
| **Legacy `import dlt` API** | Uses `import dlt` (not modern `pyspark.pipelines`) because the DQ rules framework depends on `@dlt.expect_all_or_drop()` decorators. Will migrate when Databricks ports expectations to the modern API. |
| **CDF-Based Incremental Reads** | Silver reads from Bronze using Change Data Feed — only processing new/changed rows, not full table scans |
| **Expectations Framework** | DLT Expectations with severity levels: `@dlt.expect_all()` (warn but keep), `@dlt.expect_all_or_drop()` (quarantine bad rows), `@dlt.expect_or_fail()` (halt pipeline — avoided in favor of drop) |
| **Centralized DQ Rules in Delta Tables** | Quality rules stored in `dq_rules` Delta table — updateable at runtime via SQL without code redeployment. PK constraint on `(table_name, rule_name)`. |
| **Quarantine Pattern** | Records failing critical DQ rules are routed to quarantine tables for investigation, not silently dropped |
| **Row Tracking** | `delta.enableRowTracking = true` on EVERY Silver table — required for downstream Gold Materialized Views to use incremental refresh instead of expensive full recomputation |
| **Photon + ADVANCED Edition** | `photon: true` and `edition: ADVANCED` are non-negotiable in pipeline YAML — Photon for vectorized execution, ADVANCED for expectations/CDC support |
| **Serverless DLT Compute** | `serverless: true` in pipeline YAML — auto-scaling, no cluster configuration, no `clusters:` block |
| **Schema Cloning Philosophy** | Silver mirrors Bronze schema (same column names, same grain, no aggregation, no joins). Only adds: DQ rules, derived flags, business keys, `processed_timestamp`. Aggregation belongs in Gold. |
| **Unity Catalog Integration** | Silver tables are UC-managed, inheriting governance, lineage tracking, and access controls from Bronze |
| **Pure Python DQ Loader** | `dq_rules_loader.py` has NO notebook header — it's a pure Python module importable by DLT notebooks. Cache pattern uses `toPandas()` (not `.collect()`) for performance. |
| **2-Job Deployment Pattern** | Two separate resources: (1) `silver_dq_setup_job` — regular job that creates and populates the `dq_rules` table, (2) `silver_dlt_pipeline` — DLT pipeline that reads rules from the table. Setup job MUST run first. |
| **Data Quality Monitoring** | DQ monitoring views created inside the DLT pipeline — per-table metrics, referential integrity checks, data freshness. Feeds into observability dashboards in later steps. |

---

## 4️⃣ What Happens Behind the Scenes?

When you paste the prompt, the AI reads `@data_product_accelerator/skills/silver/00-silver-layer-setup/SKILL.md` — the **Silver orchestrator skill**. Behind the scenes:

1. **Orchestrator activates** — reads the Silver setup workflow with streaming ingestion and DQ rules
2. **Worker skills auto-loaded:**
   - `01-dlt-expectations-patterns` — creates portable DQ rules stored in Unity Catalog Delta tables (not hardcoded in notebooks)
   - `02-dqx-patterns` — Databricks DQX framework for advanced validation with detailed failure diagnostics
3. **Common skills auto-loaded (8 total):**
   - `databricks-expert-agent` — core "Extract, Don't Generate" principle
   - `databricks-table-properties` — ensures proper TBLPROPERTIES (CDF, row tracking, auto-optimize)
   - `databricks-asset-bundles` — generates DLT pipeline YAML and DQ setup job YAML
   - `databricks-python-imports` — ensures `dq_rules_loader.py` is pure Python (no notebook header)
   - `unity-catalog-constraints` — PK constraint on `dq_rules` table: `(table_name, rule_name)`
   - `schema-management-patterns` — `CREATE SCHEMA IF NOT EXISTS` with governance metadata
   - `naming-tagging-standards` — enterprise naming conventions and dual-purpose COMMENTs
   - `databricks-autonomous-operations` — self-healing deploy loop if pipeline fails
4. **Key innovation: Runtime-updateable DQ rules** — expectations are stored in a Delta table, not in code. You can update rules without redeploying the pipeline.

</details>

<details><summary><strong>Expected Output</strong></summary>

## Expected Deliverables

### 📁 Generated Files

```
{user_schema_prefix}_{use_case_slug}_dab/                     # data-product bundle root (dp_bundle_root) — same folder Bronze created
├── databricks.yml                        # Updated with Silver resources
├── src/
│   └── {project}_silver/
│       ├── setup_dq_rules_table.py       # Notebook: Create & populate DQ rules Delta table
│       ├── dq_rules_loader.py            # Pure Python module (NO notebook header!)
│       ├── silver_dimensions.py          # DLT notebook: Dimension tables
│       ├── silver_facts.py               # DLT notebook: Fact tables with quarantine
│       └── data_quality_monitoring.py    # DLT notebook: DQ metrics & freshness views
└── resources/
    └── silver/
        ├── silver_dq_setup_job.yml       # Job: Creates dq_rules table (run FIRST)
        └── silver_dlt_pipeline.yml       # DLT pipeline configuration
```

> **Key file note:** `dq_rules_loader.py` must be a **pure Python module** (no `# Databricks notebook source` header). This is because DLT notebooks import it as a regular module. If it has a notebook header, imports break.

---

### 🔄 Silver Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SILVER LAYER (SDP Pipeline)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌──────────────────┐    ┌─────────────────────┐        │
│  │   Bronze    │───▶│  SDP Pipeline    │───▶│   Silver Tables     │        │
│  │   Tables    │    │  (Serverless)    │    │   (Cleaned Data)    │        │
│  │   (CDF)     │    │                  │    │                     │        │
│  └─────────────┘    │  • Read CDF      │    └─────────────────────┘        │
│                     │  • Apply DQ      │              │                     │
│                     │  • Transform     │              ▼                     │
│  ┌─────────────┐    │  • Deduplicate   │    ┌─────────────────────┐        │
│  │  DQ Rules   │───▶│                  │    │  Quarantine Table   │        │
│  │  (Delta)    │    └──────────────────┘    │  (Failed Records)   │        │
│  └─────────────┘                            └─────────────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 📊 Tables Created

| Table Type | Tables | Description |
|------------|--------|-------------|
| **Silver Dimensions** | `silver_amenities`, `silver_destinations`, ... | Cleaned dimension data mirroring Bronze schema |
| **Silver Facts** | `silver_bookings`, `silver_payments`, ... | Transformed fact data with DQ expectations applied |
| **DQ Rules** | `dq_rules` | Centralized rule definitions (PK: `table_name, rule_name`) |
| **Quarantine** | `quarantine_*` | Records that failed `expect_all_or_drop` critical rules |
| **DQ Monitoring Views** | `dq_metrics_*`, `data_freshness_*` | Per-table quality metrics and freshness tracking |

---

### ✅ Data Quality Framework

| Quality Dimension | Example Rules |
|-------------------|---------------|
| **Completeness** | Required fields not null |
| **Validity** | Values within expected ranges |
| **Uniqueness** | No duplicates on key columns |
| **Consistency** | Cross-field validations |
| **Referential** | Foreign keys exist in parent tables |

---

### 🖼️ Visual Validation in Databricks

**1. DLT Pipeline - Data Quality Tab:**

Shows Expectations results with Pass/Warn/Fail counts for each rule.

**2. Unity Catalog - Silver Schema:**

All Silver tables visible with proper metadata and lineage.

**3. DQ Rules Table:**

```sql
SELECT rule_name, rule_type, expectation, action 
FROM {lakehouse_default_catalog}.{user_schema_prefix}_silver.dq_rules;
```

---

### ✅ Success Criteria Checklist

**Deployment:**
- [ ] Bundle validates with no errors
- [ ] Bundle deploys successfully
- [ ] Pipeline and job names include `${var.user_prefix}` (no collisions in shared workspace)
- [ ] DQ rules setup job runs and creates `dq_rules` table (**must run FIRST**)
- [ ] DLT pipeline runs without failures

**Data Quality:**
- [ ] DQ rules loaded into centralized Delta table
- [ ] Expectations show in pipeline event log (Data Quality tab)
- [ ] Expectations verified via `event_log(TABLE(...))` TVF in SQL editor (per-expectation pass/fail counts)
- [ ] Quarantine table captures failed records (not silently dropped)

**Tables & Properties:**
- [ ] Silver tables populated with cleaned data
- [ ] Silver column names match Bronze (schema cloning)
- [ ] Row tracking enabled (`delta.enableRowTracking = true`)
- [ ] CDF enabled (`delta.enableChangeDataFeed = true`)
- [ ] `cluster_by_auto=True` on every table

**Pipeline Configuration:**
- [ ] `serverless: true` in pipeline YAML
- [ ] `photon: true` in pipeline YAML
- [ ] `edition: ADVANCED` in pipeline YAML
- [ ] `dq_rules_loader.py` has NO notebook header (pure Python)
- [ ] Incremental processing working (only new/changed rows)

</details>

#### Fork — `coding_assistant = genie-code`  (input_id 902)

> Fork rows override only `input_template`, `system_prompt`, and `bypass_llm`. All display fields are inherited from the default row above.

| Field | Value |
|-------|-------|
| `input_id` | `902` |
| `section_tag` | `silver_layer_sdp` |
| `order_number` | `(inherited)` |
| `coding_assistant` | `genie-code` |
| `bypass_llm` | `true` |

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Build the Silver layer — author and deploy a Spark Declarative Pipeline (SDP) with centralized data quality on top of Bronze. Before this step there is no Silver layer; after it, the Silver bundle is authored under `<DP_BUNDLE_ROOT>`, deployed, and the cleansed Silver tables are live.

This will involve the following steps:

- **Load the skills** — full `skill_ref_root`-prefixed paths.
- **Pin the Bronze column inventory** — read-only, to ground the transforms.
- **Author the Silver bundle** — SDP plus centralized data quality.
- **Write and deploy** — write the bundle files to `<DP_BUNDLE_ROOT>`, then deploy and run it from the bundle-editor page.

The steps below are the prescriptive runbook for those actions; follow them in order.

**Genie Code — this is a prescriptive runbook. Follow the steps in order. Do NOT improvise paths, do NOT use bare relative paths, do NOT use `@`-mentions, and do NOT create tables or run the pipeline by hand. Every skill is named by its full `skill_ref_root`-prefixed path; every artifact is anchored to `<DP_BUNDLE_ROOT>`; every Silver table is created by the deployed SDP pipeline — never by direct SQL.**

### 🔴 Non-negotiable execution rule (read before anything)

❌ **NEVER** run `CREATE SCHEMA` / `CREATE TABLE` / DLT logic / DQ-rules inserts / any data-loading statement directly via `executeCode` / `spark.sql` / a notebook cell. Those statements are the **body of the bundle's job and pipeline**. The bundle **is** the execution mechanism — never bypass it, even though direct SQL is faster. Creating live tables with no versioned bundle behind them is the regression this fork exists to prevent.

✅ The ONLY things you run directly are (a) **read-only** inspection (`SHOW TABLES`, `DESCRIBE`, `SELECT … FROM event_log(...)`) and (b) `databricks bundle validate` / `deploy` / `run` through `runDatabricksCli`. If `bundle deploy` is blocked, FIX the page context (open the bundle editor — Step 3) — do **not** fall back to direct SQL, the Jobs/Pipelines REST API, or the SDK.

### Step 0 — Resolve your environment (once, before anything else)

Run `skills/vibecoding-state` operation `enter` with `prompt_id: "silver_layer_sdp"` and `require_prior_gate: {prompt_id: "bronze_layer_creation", gate: "Bronze layer live"}`. It writes and echoes the `## Environment Capabilities` block. Read these resolved values and use them literally throughout:

- `client_context` = `genie_code`
- `artifact_root` = your workshop project root (e.g. `/Workspace/Users/<your-email>/vibe-coding-workshop`) — where all generated bundles/apps/docs build; the repo itself is cloned at `/Workspace/Users/<your-email>/.assistant/skills/vibe-coding-workshop` (skills load from there via `skill_ref_root`, NOT from `artifact_root`)
- `skill_ref_root` = `skills/vibe-coding-workshop` (substitute your clone folder if you cloned somewhere other than `.assistant/skills/vibe-coding-workshop`)
- `dp_bundle_root` = `<artifact_root>/{user_schema_prefix}_{use_case_slug}_dab` — the **self-contained Databricks Asset Bundle project** for the whole data-product pipeline (e.g. `…/vibe-coding-workshop/{user_schema_prefix}_booking_app_dab`). This is the SAME bundle you created for Bronze — extend it; do NOT make a new one. It is where `databricks.yml`, `src/`, and `resources/` live, and the **page you deploy from**. Referred to below as `<DP_BUNDLE_ROOT>`.
- deploy verb = `bundle deploy --target dev`, run through the `runDatabricksCli` tool

If `enter` reports the Bronze gate is not `Bronze layer live`, STOP — finish the Bronze step first. If `enter` has not run in this thread, run it now.

**On resume after a context reset:** trust the live state file over any chat summary — a prompt whose state entry shows its gate PASSED is DONE (do NOT re-run it), and before re-writing files reconcile what is already on disk with `os.listdir(...)` (NOT `listFiles`, which lags FUSE writes) against the state file's captured paths, so you resume rather than recreate.

### Step 1 — Load the required skills by their FULL `skill_ref_root`-prefixed paths

Load each skill with `readSkillFile` using its fully-qualified `<skill_ref_root>`-prefixed path — NEVER a bare `@…` mention, NEVER a repo-relative path. **The root-level `skills/` come FIRST: they are the highest-priority, always-on guardrails and govern everything below.** Skills load in two tiers to keep context lean without weakening the preflight-ack gate.

**Tier A — read in FULL now (one batched `readSkillFile` turn) and acknowledge.** These are the guardrails used while authoring in Step 2:

1. `readSkillFile("skills/vibe-coding-workshop/skills/databricks-expert-agent/SKILL.md")` — core rule: extract names from the source, never hardcode.
2. `readSkillFile("skills/vibe-coding-workshop/skills/databricks-asset-bundles/SKILL.md")` — DLT pipeline YAML, job YAML, serverless config, and the multi-user `${var.user_prefix}` "Shared Workspace Naming" pattern. **You will not write any `databricks.yml`, pipeline, or job YAML until you have read this.**
3. `readSkillFile("skills/vibe-coding-workshop/data_product_accelerator/skills/silver/00-silver-layer-setup/SKILL.md")` — the orchestrator. Follow every `See: references/…` link it names (prefix those with `skill_ref_root` too).
4. `readSkillFile("skills/vibe-coding-workshop/data_product_accelerator/skills/common/databricks-table-properties/SKILL.md")` — Silver TBLPROPERTIES (CDF, `delta.enableRowTracking`, auto-optimize, `cluster_by_auto`). **NEVER write TBLPROPERTIES without reading this.**
5. `readSkillFile("skills/vibe-coding-workshop/data_product_accelerator/skills/common/unity-catalog-constraints/SKILL.md")` — PRIMARY KEY constraint syntax for the `dq_rules` table (`(table_name, rule_name)`), and the no-`DEFAULT`-in-DDL rule. **NEVER define PK/FK without reading this.**
6. `readSkillFile("skills/vibe-coding-workshop/data_product_accelerator/skills/silver/01-dlt-expectations-patterns/SKILL.md")` and `readSkillFile("skills/vibe-coding-workshop/data_product_accelerator/skills/silver/02-dqx-patterns/SKILL.md")` — the DQ expectations + DQX worker patterns.

**Tier B — acknowledge the inlined one-line rule now; defer the full `readSkillFile` to the phase that uses it.** This only DEFERS the read (the orchestrator's per-phase Pre-Conditions force the full read at the right moment) — it does NOT skip it:

- `skills/vibe-coding-workshop/data_product_accelerator/skills/common/schema-management-patterns/SKILL.md` — rule: `CREATE SCHEMA IF NOT EXISTS` with governance metadata; enable Predictive Optimization via `ALTER SCHEMA ENABLE PREDICTIVE OPTIMIZATION` (NOT TBLPROPERTIES); schemas are NOT bundle resources. Full read when you create the Silver schema (Phase 1).
- `skills/vibe-coding-workshop/data_product_accelerator/skills/common/naming-tagging-standards/SKILL.md` — rule: snake_case, `silver_` table prefix, dual-purpose COMMENTs on every table/column, governed `class.*` PII tags inferred from column names. Full read when you name tables / write TBLPROPERTIES (Phases 2/4).
- `skills/vibe-coding-workshop/data_product_accelerator/skills/common/databricks-python-imports/SKILL.md` — rule: `dq_rules_loader.py` is PURE Python (NO `# Databricks notebook source` header); import by module name, no `sys.path` hacks. Full read when you write the loader (Phase 3).

When the orchestrator lists further **Mandatory Skill Dependencies**, load EACH the same way: take its repo-relative path and prefix it with `skill_ref_root`. Genie Code has no repo-root-relative resolution and `AGENTS.md` does not carry across threads — so always prefix with `skill_ref_root`. **Read independent Tier-A skills in one batched `readSkillFile` turn — Genie Code reads multiple skill files in parallel in a single turn, so never serialize independent reads (`genie-code-environment` §10).**

**🔴 Preflight acknowledgement (hard gate — do this BEFORE writing any file).** Echo a one-line acknowledgement for EVERY skill above — **both tiers**: for Tier A, the rule you took from the full read; for Tier B, the inlined rule above plus the phase at which you will full-read it. If you cannot state a Tier-A skill's rule, you have not actually read it — STOP and read it before writing anything. Do not author `databricks.yml`, job/pipeline YAML, notebooks, or any artifact until every listed skill (both tiers) is acknowledged — silently skipping a skill is the regression this preflight exists to prevent.

### Step 1.5 — Pin the Bronze column inventory (read-only hard gate — do this BEFORE writing any DQ rule or DLT code)

🔴 **Column names come ONLY from the live Bronze schema — never from the PRD, the schema CSV, or memory.** Before authoring `setup_dq_rules_table.py`, `silver_dimensions.py`, `silver_facts.py`, or any `constraint_sql`, run `DESCRIBE TABLE {lakehouse_default_catalog}.{bronze_schema}.<table>` for EVERY Bronze table you will read (this is read-only inspection, permitted by the rule above). Build and echo a `{table: [column, …]}` map and keep it in working memory as the **pinned inventory**.

**Invariant:** every `constraint_sql` expression, every Silver `SELECT`/column reference, and every `get_bronze_table()` column MUST use a name from this pinned map. A rule or column that references a name NOT in the pinned map is a **hard error** — fix the name (or drop the rule) before writing the file; do NOT guess a "close enough" name. This is the exact failure the Silver run hit (`price`→`base_price`, `latitude`→`property_latitude`): the PRD said "price" and "coordinates" but the live schema used prefixed names. Pinning the inventory first makes that class of bug impossible.

### Step 2 — Author the Silver bundle (SDP + centralized DQ rules). Do NOT execute anything yet.

Using the skills above, AUTHOR (write files only — no execution) the bundle resources whose job/pipeline, when run, will:

- **Generate SDP pipeline notebooks** — Spark Declarative Pipeline notebooks with incremental ingestion from Bronze via Change Data Feed (CDF), expectations, and quarantine tables.
- **Create a centralized DQ-rules table** — a configurable `dq_rules` Delta table (null checks, range validation, referential integrity), with a PK on `(table_name, rule_name)`, plus a pure-Python `dq_rules_loader.py` (no notebook header). 🔴 Author the `dq_rules` DDL EXACTLY as the `01-dlt-expectations-patterns` template shows — do NOT add columns it omits (no `is_active`) and **no `DEFAULT` column clauses** (a `DEFAULT <expr>` needs the `allowColumnDefaults` table feature, off by default, and the DDL fails; set defaults at INSERT time). This is a real regression: an invented `is_active BOOLEAN NOT NULL DEFAULT true` failed the DQ-setup job.
- **Use the 2-resource pattern** — a regular `silver_dq_setup_job` (creates/populates `dq_rules`) AND a `silver_dlt_pipeline` (reads rules from the table). The setup job MUST run before the pipeline.

IMPORTANT: Use the EXISTING catalog `{lakehouse_default_catalog}` — do NOT create a new catalog. `{lakehouse_default_catalog}` was resolved and persisted by the Bronze step (its Step 0.5 hard-stop) — read it from `## Environment Capabilities`; **never create a catalog and do not re-prompt for it.** The pipeline/job creates the Silver schema `{user_schema_prefix}_silver` and all Silver tables inside this catalog.

NOTE: The setup job checks whether `{lakehouse_default_catalog}.{user_schema_prefix}_silver` already exists and, if so, DROPs it with CASCADE and recreates it (user-specific schema — safe to drop). This DROP/CREATE runs INSIDE the job, not as a direct statement you execute.

NOTE: This is a shared workshop workspace. Put a `user_prefix` variable in every pipeline/job `name:` field (e.g. `"[${bundle.target} ${var.user_prefix}] Silver Layer Pipeline"`) to avoid `pipeline name is already used` collisions — `bundle deploy --force` does NOT resolve these (see `databricks-asset-bundles` → "Shared Workspace Naming").

### Step 3 — Write bundle files to `<DP_BUNDLE_ROOT>`, then deploy FROM that page

- Write every generated file UNDER `<DP_BUNDLE_ROOT>` — never the project root (writing at the project root is the "one level too high" bug), never `/tmp`, never a bare relative path (Genie Code's CWD is page-type-dependent):
  - `<DP_BUNDLE_ROOT>/src/{user_schema_prefix}_silver/` — `setup_dq_rules_table.py`, `dq_rules_loader.py` (pure Python), `silver_dimensions.py`, `silver_facts.py`, `data_quality_monitoring.py`
  - `<DP_BUNDLE_ROOT>/resources/silver/silver_dq_setup_job.yml` and `<DP_BUNDLE_ROOT>/resources/silver/silver_dlt_pipeline.yml`
  - extend the EXISTING `<DP_BUNDLE_ROOT>/databricks.yml` (the one from Bronze)
- **Confirm `targets.dev.presets.source_linked_deployment: false` is present** in the inherited `databricks.yml` (Bronze set it). If absent, add it — never enable source-linked deployment; it breaks file-backed `notebook_task` sources.
- **Open the bundle editor BEFORE any `bundle` command — and surface its link.** `<DP_BUNDLE_ROOT>/databricks.yml` already exists (from Bronze), so the workspace file browser shows the **"Open in bundle editor"** affordance on that folder (and an **"Open in editor"** button at the top). Its page CWD IS `<DP_BUNDLE_ROOT>` — the bundle-root page `bundle deploy`/`run` require, where Genie Code runs deploy/run pre-approved. **Do not make the operator hunt for the icon** — build a clickable link with the pre-authenticated `WorkspaceClient` (`w`) and print it:
  - `host = w.config.host`; `o = w.get_workspace_id()`
  - `file_id = w.workspace.get_status("<DP_BUNDLE_ROOT>/databricks.yml").object_id`
  - `folder_id = w.workspace.get_status("<DP_BUNDLE_ROOT>").object_id`
  - **Bundle editor:** `{host}/editor/files/{file_id}?o={o}&contextId=folder%3A{folder_id}` (plain folder: `{host}/browse/folders/{folder_id}?o={o}`)

  Tell the operator to open the **bundle-editor link**, then run every `databricks bundle …` command below from that page. Edit the EXISTING on-page `databricks.yml` — files created via the workspace API may not reach the CLI's FUSE mount.
- **File-write tiers + verify writes (Genie Code — see `genie-code-environment` §10).** Once compute is warm, write each file with `executeCode` `open(path,"w").write(...)` (one call per file; make the FIRST `executeCode` a trivial `print("ready")` to absorb the ~3–5 min serverless cold start, and never set `timeoutMinutes` below 15). The compute-free `createAsset` → `readFile` → `workspaceUpdateFile` trio also works, but `workspaceUpdateFile` only updates a file that already exists AND was read this thread — reserve it for editing the on-page `databricks.yml`. 🔴 **Verify every write with `os.path.exists(path)` (or `os.listdir(dir)`) in the SAME `executeCode` block — NOT `listFiles`:** the workspace REST API behind `listFiles` lags FUSE-written files (a live run saw `listFiles`=7 while `os.listdir`=12), so `listFiles` returns false "missing-file" negatives and you waste turns recreating files that already exist.
- 🔴 **Step 2.5 — Contract test (read-only; run AFTER the files are written, BEFORE any `bundle deploy`).** Catch the column/DDL bugs on disk, not in a failed job run. In one `executeCode` block:
  - **Dry-import the loader:** `import importlib.util` and load `<DP_BUNDLE_ROOT>/src/{user_schema_prefix}_silver/dq_rules_loader.py` — it must import with NO `ModuleNotFoundError` and NO `# Databricks notebook source` header (pure Python).
  - **Validate every rule's SQL against the live schema:** parse each `constraint_sql` out of `setup_dq_rules_table.py` and run it read-only as `SELECT <constraint_sql> FROM {lakehouse_default_catalog}.{bronze_schema}.<table> LIMIT 1`. A `LIMIT 1` SELECT executes the expression without touching the pipeline — an `[UNRESOLVED_COLUMN]` / parse error here is the exact failure that otherwise only surfaces as a failed DQ-setup/pipeline run. Also assert every column named in each `constraint_sql` is in the Step 1.5 pinned inventory.
  - **Confirm the loader's expected `dq_rules` row shape matches `setup_dq_rules_table.py`'s INSERT columns.** If any check fails, FIX the file (correct the column name, drop the bad rule, or remove a stray `DEFAULT`/invented column) and re-run this step — do NOT deploy until it is clean. This whole step is read-only inspection, permitted by the non-negotiable rule above.
- Validate → deploy → run the DQ setup job FIRST → run the pipeline through `runDatabricksCli`, **from the bundle-editor page**, each with `--target dev` (mandatory — a target-less deploy is guardrail-blocked):
  - `databricks bundle validate --target dev`
  - `databricks bundle deploy --target dev`
  - `databricks bundle run --target dev silver_dq_setup_job`  ← **must run first** (creates `dq_rules`; the pipeline fails with `Table or view not found: dq_rules` otherwise)
  - `databricks bundle run --target dev silver_dlt_pipeline`
- **🛑 If a `bundle` command is blocked or fails, STOP — do not work around it.** A `databricks.yml not found` error or a "blocked by safety guardrails" message means you are NOT on the bundle page: open the **bundle-editor link** above and retry (CONFIRMED — the same `bundle deploy`/`run` that is "blocked" from a file page succeeds from the bundle editor). If it STILL fails from the bundle editor, STOP and report the blocker. Do **NOT** create the jobs, pipeline, or tables via the Jobs/Pipelines REST API (`jobs/create`, `/api/2.0/pipelines`), the SDK, or direct SQL to "get it done" — that silently defeats the bundle (no version control, no `bundle destroy` cleanup) and FAILS the gate. The REST/SDK route is an **escape hatch available only if the operator explicitly authorizes it.**

**State-lock:** this prompt runs between an `enter` (Step 0) and an `exit`. After the gate passes, run `skills/vibecoding-state` op `exit` — params: `prompt_id: "silver_layer_sdp"`, `gate: "Silver layer live"`, `captured: {silver_schema, silver_dlt_pipeline, dq_rules_table}`. **This `enter`/`exit` pair is a mandatory ritual, not advisory.** Step 0's `enter` MUST locate — or, if this is the first prompt of the track, bootstrap-create — the canonical live state file at `<dp_bundle_root>/.vibecoding-state.md` (never the temporary `example/…` bootstrap path). The closing `exit` MUST append this prompt's Per-Step Log entry, Gate result, and `captured` vars to that file, then **re-read it and echo the appended section to prove the write landed**. **Gate completion rule:** this prompt is NOT complete until that re-read confirms the appended entry — the chat summary is NOT the state store.

**Gate:** `Silver layer live` — the DQ-rules setup job and the Silver pipeline were **created by `bundle deploy` and executed by `bundle run`** (the setup job ran first and the pipeline shows expectations evaluated in its event log), AND the Silver tables exist in `{lakehouse_default_catalog}.{user_schema_prefix}_silver` with the `dq_rules` table populated. Tables existing is **necessary but NOT sufficient** — if anything was created by direct SQL instead of the deployed bundle, the gate FAILS and you must redo it via the bundle.
```

---

## Analyze Silver Metadata

| Field | Value |
|-------|-------|
| `input_id` | `114` |
| `section_tag` | `genie_silver_metadata` |
| `order_number` | `22` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Extract and analyze comprehensive table/column metadata from Silver layer schema including comments, constraints, and tags_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

````
Extract and analyze comprehensive table and column metadata from your Silver layer schema.

This will:

- **Query table metadata** — extract table names, types, and table-level comments from `{chapter_3_lakehouse_catalog}.information_schema.tables`
- **Query column metadata** — extract column names, data types, ordinal positions, nullability, defaults, and column-level comments from `{chapter_3_lakehouse_catalog}.information_schema.columns`
- **Query constraints** — extract primary key and foreign key constraint definitions from `{chapter_3_lakehouse_catalog}.information_schema.table_constraints` and `constraint_column_usage`
- **Query column tags** — extract Unity Catalog tags from `{chapter_3_lakehouse_catalog}.information_schema.column_tags` (if available)
- **Query table tags** — extract Unity Catalog tags from `{chapter_3_lakehouse_catalog}.information_schema.table_tags` (if available)
- **Merge and save** — combine all results into an enriched metadata CSV
- **Analyze and document** — produce a Genie analysis plan based on the metadata

**Source:** `{chapter_3_lakehouse_catalog}.{chapter_3_lakehouse_schema}` (configured in the Silver Layer panel above)

Copy and paste this prompt to the AI:

```
Run the following SQL queries against {chapter_3_lakehouse_catalog}.{chapter_3_lakehouse_schema} and merge the results into a comprehensive metadata file.

---

**Query 1 — Table inventory:**
SELECT table_catalog, table_schema, table_name, table_type, comment
FROM {chapter_3_lakehouse_catalog}.information_schema.tables
WHERE table_schema = '{chapter_3_lakehouse_schema}'
ORDER BY table_name

**Query 2 — Column metadata:**
SELECT table_name, column_name, ordinal_position, data_type, is_nullable, column_default, comment
FROM {chapter_3_lakehouse_catalog}.information_schema.columns
WHERE table_schema = '{chapter_3_lakehouse_schema}'
ORDER BY table_name, ordinal_position

**Query 3 — Table constraints (PKs, FKs):**
SELECT constraint_name, table_name, constraint_type
FROM {chapter_3_lakehouse_catalog}.information_schema.table_constraints
WHERE constraint_schema = '{chapter_3_lakehouse_schema}'
ORDER BY table_name, constraint_type

**Query 4 — Constraint column usage:**
SELECT constraint_name, table_name, column_name
FROM {chapter_3_lakehouse_catalog}.information_schema.constraint_column_usage
WHERE constraint_schema = '{chapter_3_lakehouse_schema}'
ORDER BY constraint_name, table_name

**Query 5 — Column tags (may not exist — skip gracefully if error):**
SELECT table_name, column_name, tag_name, tag_value
FROM {chapter_3_lakehouse_catalog}.information_schema.column_tags
WHERE schema_name = '{chapter_3_lakehouse_schema}'
ORDER BY table_name, column_name

**Query 6 — Table tags (may not exist — skip gracefully if error):**
SELECT table_name, tag_name, tag_value
FROM {chapter_3_lakehouse_catalog}.information_schema.table_tags
WHERE schema_name = '{chapter_3_lakehouse_schema}'
ORDER BY table_name

---

**Technical reference (for AI execution):**

1. Get warehouse ID:
   databricks warehouses list --output json | jq '.[0].id'

2. Execute each SQL query via Statement Execution API:
   databricks api post /api/2.0/sql/statements --json '{
     "warehouse_id": "<WAREHOUSE_ID>",
     "statement": "<SQL_QUERY>",
     "wait_timeout": "50s",
     "format": "JSON_ARRAY"
   }' > /tmp/query_N_result.json

3. For queries 5 and 6 (tags), if the table does not exist, skip gracefully and continue.

4. Merge all results into a single enriched CSV with Python:
   - Read each query result JSON
   - Join table metadata (Query 1) with column metadata (Query 2) on table_name
   - Append constraint info (Queries 3-4) as additional columns: constraint_type, constraint_name
   - Append tag info (Queries 5-6) as additional columns: column_tags, table_tags
   - Output columns: table_name, table_type, table_comment, column_name, ordinal_position, data_type, is_nullable, column_default, column_comment, constraint_type, constraint_name, column_tags, table_tags
   - Save to: <ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Metadata.csv

5. Analyze the metadata and create docs/genie_plan.md with:
   - **Table Inventory**: List each table with its type, row purpose (inferred from table comment and column patterns), and estimated business domain
   - **Column Analysis**: Key columns per table — identify likely dimensions, measures, timestamps, and foreign keys based on data types, names, and comments
   - **Relationship Map**: Inferred relationships between tables (from FK constraints and column naming patterns like *_id)
   - **Table Relevance Assessment**: For each table, assess relevance to the use case (High/Medium/Low) with rationale
   - **Recommended Genie Space Structure**: Suggest how tables should be grouped into Genie Spaces (max 25 assets per space)
   - **Metric View Candidates**: Identify numeric columns with business context that could become Metric Views (with suggested dimensions and measures)
   - **TVF Candidates**: Suggest parameterized query patterns based on common access patterns inferred from table structure
   - **Data Lineage Notes**: Document any lineage hints from column comments or naming conventions

Known warehouse ID: <YOUR_WAREHOUSE_ID> (get via: databricks warehouses list --output json | jq '.[0].id')
```
````

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

> **Artifact root (client-aware).** Resolve `<ARTIFACT_ROOT>` via `vibecoding-state.resolve_root` (it reads `artifact_root` from `## Environment Capabilities`, or detects the active client, `artifact_root` + `skills_install_root`) and write every artifact under it. On Cursor/Copilot that is your repo root; on Databricks Genie Code it is your user project root `/Workspace/Users/<email>/<repo>` (the repo is cloned separately at `/Workspace/Users/<email>/.assistant/skills/<repo>` for skill loading only) — never the page's current working directory.

## 1️⃣ How To Apply

Copy the prompt from the Prompt tab, start a new Agent chat in your coding assistant, paste it and press Enter.

**Prerequisite:** Run this in your cloned Template Repository (see Prerequisites in Step 0). Ensure Databricks CLI is authenticated.

**Steps:** Copy the prompt → paste into your coding assistant → AI executes 6 SQL queries via Databricks CLI → merges results into enriched CSV → creates analysis document.

**Note:** The source catalog and schema are shown in the **Silver Layer** panel above this prompt. You can edit them using the Edit button.

---

## 2️⃣ What Are We Building?

This step extracts **comprehensive metadata** from your Silver layer — not just column names and types, but also table comments, column comments, constraints, and Unity Catalog tags. This enriched metadata powers the Gold layer design.

### Two Output Files

| File | Purpose |
|------|---------|
| `<ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Metadata.csv` | Enriched metadata CSV with all table/column/constraint/tag information. Fed into Gold Layer Design. |
| `docs/genie_plan.md` | Analysis document with table relevance, relationship maps, Genie Space recommendations, and metric/TVF candidates. |

### Why Enriched Metadata Matters

| Data Point | What It Tells Us |
|------------|-----------------|
| **Column comments** | Business meaning and context for each field |
| **Table comments** | Purpose and scope of each table |
| **PK/FK constraints** | Explicit relationships between tables |
| **Column tags** | Governance classifications and sensitivity levels |
| **Data types** | Dimension vs. measure classification hints |

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It''s Used Here |
|----------|-------------------|
| **Unity Catalog information_schema** | Queries the standard UC metadata catalog for comprehensive table/column metadata |
| **Constraint Discovery** | Extracts PK/FK from `table_constraints` to understand explicit relationships |
| **Tag Integration** | Pulls UC tags for governance context and data classification |
| **Graceful Degradation** | Tag queries skip gracefully if the views don''t exist |
| **Analysis-Driven Design** | The genie_plan.md provides a reasoned assessment before jumping into Gold design |

</details>

<details><summary><strong>Expected Output</strong></summary>

## Expected Deliverables

- `<ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Metadata.csv` — enriched metadata CSV
- `docs/genie_plan.md` — analysis with table relevance, relationships, Genie Space recommendations, metric/TVF candidates
- CSV contains: table_name, table_type, table_comment, column_name, data_type, is_nullable, column_comment, constraint_type, constraint_name, column_tags, table_tags

</details>

---

## Analyze Silver Metadata (Upload CSV)

| Field | Value |
|-------|-------|
| `input_id` | `121` |
| `section_tag` | `genie_silver_metadata_upload` |
| `order_number` | `8` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Upload an existing Silver layer schema CSV to create the data dictionary for your Genie Accelerator project_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

````
Save the uploaded Silver layer schema metadata CSV and validate it for the Genie Accelerator pipeline.

This will:

- **Save the CSV file** to `<ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Schema.csv`
- **Validate metadata quality** — check for missing comments, incorrect data types, and sequencing issues
- **Enrich if needed** — fill missing fields, normalize types, and add recommended columns
- **Print verification summary** — confirm table count, column count, and any fixes applied

Copy and paste this prompt to the AI:

```
Save the following CSV content to: <ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Schema.csv

--- CSV CONTENT START ---
{csv_content}
--- CSV CONTENT END ---

After saving the file, validate and enrich the metadata:

1. Validate structure:
   - Verify required columns: table_name, column_name, data_type, ordinal_position, is_nullable, comment
   - Check ordinal_position is sequential per table (1, 2, 3...) — fix gaps
   - Remove empty or duplicate rows

2. Enrich metadata:
   - Fill empty comment fields with descriptions inferred from column_name and table_name
   - Normalize data_type to Spark SQL types (VARCHAR -> STRING, INT -> INTEGER, FLOAT -> DOUBLE)
   - Add table_catalog and table_schema columns if missing (default: {chapter_3_lakehouse_schema})

3. Print verification summary:
   - Total tables found
   - Total column definitions
   - File path where CSV was saved
   - List of fixes applied (if any)

Downstream Compatibility Note:
This CSV drives the Genie Accelerator pipeline:
- Bronze Creation (Step 12) — uses schema to create tables and sample data
- Gold Design (Step 11) — reads CSV for dimensional model design
- Gold Pipeline (Step 14) — uses YAML schemas derived from this CSV
Missing comments, incorrect types, or invalid rows will cascade into errors downstream.
```
````

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

> **Artifact root (client-aware).** Resolve `<ARTIFACT_ROOT>` via `vibecoding-state.resolve_root` (it reads `artifact_root` from `## Environment Capabilities`, or detects the active client, `artifact_root` + `skills_install_root`) and write every artifact under it. On Cursor/Copilot that is your repo root; on Databricks Genie Code it is your user project root `/Workspace/Users/<email>/<repo>` (the repo is cloned separately at `/Workspace/Users/<email>/.assistant/skills/<repo>` for skill loading only) — never the page's current working directory.

## 1️⃣ How To Apply

Select the **Upload CSV** tab in the Analyze Silver Metadata step, upload your schema metadata CSV file, and click **Process & Generate**.

**Steps:**
1. Click the upload area or drag your CSV file into the upload zone
2. Wait for validation — all required columns must be present (table_name, column_name, data_type, ordinal_position, is_nullable, comment)
3. Review the preview (table count, column count, detected table names)
4. Click **Process & Generate** to create the coding assistant prompt
5. Copy the generated prompt into your coding assistant
6. The coding assistant will save the CSV to `<ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Schema.csv`

---

## 2️⃣ What Are We Building?

A **data dictionary CSV** that drives the Genie Accelerator pipeline. Instead of pointing to Silver layer tables in Databricks, you provide the CSV directly.

```
<ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Schema.csv
  → Bronze Creation (Step 12)  — uses schema to create tables and sample data
  → Gold Design (Step 11)      — reads CSV to design dimensional model
  → Gold Pipeline (Step 14)    — uses YAML schemas derived from this CSV
```

---

## 3️⃣ When to Use Upload Mode

Use this when:
- Your Silver layer data is **not in Databricks** yet (external databases, CSV exports, data catalogs)
- You have a **pre-existing data dictionary** from another tool (ERStudio, dbt, etc.)
- You want to **skip the Silver layer scan** and provide metadata directly
- Your Databricks CLI is **not configured** for the Silver catalog

The CSV must follow the `information_schema.columns` format with required columns: `table_name`, `column_name`, `data_type`, `ordinal_position`, `is_nullable`, `comment`.

</details>

<details><summary><strong>Expected Output</strong></summary>

## Expected Deliverables

- `<ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Schema.csv` file created via coding assistant
- Contains column metadata rows for all tables in your Silver layer schema
- Includes: table_name, column_name, data_type, ordinal_position, is_nullable, comment
- Ready for use as data dictionary reference
- **This CSV is the starting input for the Bronze Creation and Gold Design steps**

</details>

---

## Analyze Silver Metadata (Design from PRD)

| Field | Value |
|-------|-------|
| `input_id` | `136` |
| `section_tag` | `genie_silver_metadata_generate` |
| `order_number` | `22` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Design silver layer schema from your PRD — for when you don't have existing Silver tables or a CSV_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

````
## Design Silver Layer Schema from PRD

The business requirements are documented in @docs/design_prd.md.

---

### Instructions

Based on the PRD, design a **normalized relational silver layer schema** for the **{use_case_title}** use case and save it as an enriched metadata CSV.

Copy and paste this prompt to the AI:

```
Read the PRD at @docs/design_prd.md and design a complete silver layer database schema for the **{use_case_title}** use case.

**Output file:** <ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Metadata.csv

**Schema design requirements:**
1. Design 5-15 silver layer tables covering all entities, relationships, and transactional data described in the PRD
2. Include primary keys (BIGINT, first column per table) and foreign keys referencing related tables
3. Use Spark SQL data types: STRING, BIGINT, INT, DOUBLE, DECIMAL(precision,scale), BOOLEAN, DATE, TIMESTAMP
4. Add descriptive comments for every column explaining its business meaning
5. Include standard operational columns per table: created_at (TIMESTAMP), updated_at (TIMESTAMP), is_active (BOOLEAN)
6. Use snake_case for all table and column names
7. Design for analytics — include fact tables with numeric measures and dimension tables with descriptive attributes

**CSV format (enriched metadata compatible):**
```csv
table_name,table_type,table_comment,column_name,ordinal_position,data_type,is_nullable,column_default,column_comment,constraint_type,constraint_name,column_tags,table_tags
<table_name>,MANAGED,<table description>,<column_name>,<position>,<type>,<YES/NO>,,<column description>,<PK/FK/empty>,<constraint_name_or_empty>,,
```

One row per column, all tables included. ordinal_position restarts at 1 for each table.

**After creating the CSV, validate and enrich:**
1. Verify required columns: table_name, table_type, table_comment, column_name, data_type, ordinal_position, is_nullable, column_comment
2. Check ordinal_position is sequential per table (1, 2, 3...) — fix gaps
3. Fill empty column_comment fields with descriptions inferred from column_name and table_name
4. Fill empty table_comment fields with descriptions of the table's business purpose
5. Mark primary key columns with constraint_type=PK
6. Mark foreign key columns with constraint_type=FK and constraint_name referencing the target table
7. Normalize data_type to Spark SQL types (VARCHAR -> STRING, INT -> INTEGER, FLOAT -> DOUBLE)
8. Print verification summary: total tables, total columns, file path, fixes applied

**Then create the analysis document** at docs/genie_plan.md with:
- **Table Inventory**: List each table with its type, purpose, and business domain
- **Column Analysis**: Key columns per table — identify dimensions, measures, timestamps, and foreign keys
- **Relationship Map**: Relationships between tables (from FK constraints and naming patterns like *_id)
- **Table Relevance Assessment**: For each table, assess relevance to the use case (High/Medium/Low)
- **Recommended Genie Space Structure**: Suggest how tables should be grouped into Genie Spaces (max 25 assets per space)
- **Metric View Candidates**: Identify numeric columns that could become Metric Views (with suggested dimensions and measures)
- **TVF Candidates**: Suggest parameterized query patterns based on common access patterns

**Downstream Compatibility Note:**
This CSV drives the Genie Accelerator pipeline:
- Gold Design (Step 11) — reads CSV for dimensional model design
- Deploy Assets (Step 23) — uses schema to create and populate tables
- Optimize Genie (Step 25) — uses analysis for Genie Space configuration
```
````

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

> **Artifact root (client-aware).** Resolve `<ARTIFACT_ROOT>` via `vibecoding-state.resolve_root` (it reads `artifact_root` from `## Environment Capabilities`, or detects the active client, `artifact_root` + `skills_install_root`) and write every artifact under it. On Cursor/Copilot that is your repo root; on Databricks Genie Code it is your user project root `/Workspace/Users/<email>/<repo>` (the repo is cloned separately at `/Workspace/Users/<email>/.assistant/skills/<repo>` for skill loading only) — never the page's current working directory.

## How To Apply

1. **Prerequisite:** Complete Step 3 (PRD Generation) first — the PRD is used as input to design the schema
2. Click **Generate** to create the prompt with your PRD embedded
3. Copy the prompt into your coding assistant
4. The coding assistant reads the PRD, designs tables, and saves the CSV to `<ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Metadata.csv`
5. Review the generated schema and iterate if needed

---

## When to Use This Mode

Use **Design from PRD** when:
- You **don't have existing Silver tables** in Databricks yet
- You **don't have a CSV export** from another tool
- You want to **start from scratch** with a schema designed from your requirements
- You have a **PRD from Step 3** that describes the data entities you need

This mode works just like the Extract and Upload modes — it gives your coding assistant a detailed prompt with the PRD as context, and the AI designs the silver layer schema for you.

---

## What Happens Next

The generated CSV and analysis document drive the entire Genie Accelerator pipeline:

```
<ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Metadata.csv
  → Gold Design (Step 11)  — reads CSV to design dimensional model
  → Deploy Assets (Step 23) — uses schema to create tables
  → Optimize Genie (Step 25) — uses analysis for Genie Space config

docs/genie_plan.md
  → Genie Space recommendations, metric views, TVF candidates
```

</details>

<details><summary><strong>Expected Output</strong></summary>

## Expected Deliverables

- `<ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Metadata.csv` file created via coding assistant
- Contains 5-15 tables with enriched metadata designed from the PRD
- Includes: table_name, table_type, table_comment, column_name, ordinal_position, data_type, is_nullable, column_comment, constraint_type, constraint_name
- Every column has a descriptive business-context comment and every table has a table_comment
- `docs/genie_plan.md` — analysis with table relevance, relationships, Genie Space recommendations, metric/TVF candidates
- Ready for use as enriched metadata reference for the Genie Accelerator pipeline
- **This CSV is the starting input for the Genie Accelerator pipeline** (Gold Design, Deploy Assets, Optimize Genie all reference it)

</details>

---

## Gold Layer Design (Genie Accelerator)

| Field | Value |
|-------|-------|
| `input_id` | `115` |
| `section_tag` | `genie_gold_design` |
| `order_number` | `23` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Design Gold layer from enriched silver metadata and PRD using project skills with YAML definitions and Mermaid ERD_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
I have enriched silver layer metadata at @data_product_accelerator/context/{use_case_file_prefix}_Metadata.csv and a metadata analysis at @docs/genie_plan.md.

The business requirements are documented in @docs/design_prd.md.

Please design the Gold layer using @data_product_accelerator/skills/gold/00-gold-layer-design/SKILL.md

This skill will orchestrate the following end-to-end design workflow:

- **Parse the metadata CSV** — read the enriched metadata file (includes table comments, column comments, constraints, and tags), classify each table as a dimension, fact, or bridge, and use constraint info to map foreign key relationships
- **Cross-reference with PRD** — align the Gold design with business requirements, user personas, and use case workflows documented in the PRD
- **Cross-reference with Genie plan** — use the genie_plan.md analysis for table relevance assessments and recommended Genie Space structure
- **Design the dimensional model** — identify dimensions (with SCD Type 1/2 decisions), fact tables (with explicit grain definitions), and measures, then assign tables to business domains
- **Create ERD diagrams** — generate Mermaid Entity-Relationship Diagrams organized by table count (master ERD always, plus domain and summary ERDs for larger schemas)
- **Generate YAML schema files** — produce one YAML file per Gold table with column definitions, PK/FK constraints, table properties, lineage metadata, and dual-purpose descriptions (human + LLM readable)
- **Document column-level lineage** — trace every Gold column back through Silver with transformation type (DIRECT_COPY, AGGREGATION, DERIVATION, etc.) in both CSV and Markdown formats
- **Create business documentation** — write a Business Onboarding Guide with domain context, real-world scenarios, and role-based getting-started guides
- **Map source tables** — produce a Source Table Mapping CSV documenting which source tables are included, excluded, or planned with rationale for each
- **Validate design consistency** — cross-check YAML schemas, ERD diagrams, and lineage CSV to ensure all columns, relationships, and constraints are consistent

The orchestrator skill will automatically load its worker skills for merge patterns, deduplication, documentation standards, Mermaid ERDs, schema validation, grain validation, and YAML-driven setup.

IMPORTANT: Use the EXISTING catalog `{lakehouse_default_catalog}` -- do NOT create a new catalog. Create the Gold schema `{user_schema_prefix}_gold` and all Gold tables inside this catalog.

NOTE: Before creating the schema, check if `{lakehouse_default_catalog}.{user_schema_prefix}_gold` already exists. If it does, DROP the schema with CASCADE and recreate it from scratch. These are user-specific schemas so dropping is safe.
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## 1️⃣ How To Apply

Copy the prompt from the **Prompt** tab, start a **new Agent chat** in your coding assistant, paste it, and press Enter.

---

### Prerequisite

**Run this in your cloned Template Repository** (see Prerequisites in Step 0).

Ensure you have:
- ✅ `data_product_accelerator/context/{use_case_file_prefix}_Metadata.csv` - Your enriched silver metadata (from Analyze Silver Metadata step)
- ✅ `docs/genie_plan.md` - Metadata analysis with table relevance and Genie recommendations
- ✅ `docs/design_prd.md` - Product Requirements Document (from PRD Generation step)
- ✅ `data_product_accelerator/skills/gold/00-gold-layer-design/SKILL.md` - The Gold layer design orchestrator skill

---

### Steps to Apply

1. **Start new Agent thread** — start a new Agent thread in your coding assistant for clean context
2. **Copy and paste the prompt** — Use the copy button, paste into your coding assistant; the AI will read your metadata, PRD, genie plan, and the orchestrator skill
3. **Review generated design** — The AI creates `gold_layer_design/` with ERD diagrams, YAML schema files, and lineage documentation
4. **Validate the design** — Check grain, SCD type, relationships, and lineage for each fact/dimension
5. **Verify PRD alignment** — Ensure the Gold design supports the business requirements from the PRD

---

## 2️⃣ What Are We Building?

This is the **Genie Accelerator variant** of Gold Layer Design. Unlike the standard path that starts from raw schema CSV, this version uses:

| Input | What It Provides |
|-------|-----------------|
| **Enriched Metadata CSV** | Table/column comments, constraints, and tags from the Silver layer |
| **Genie Plan (genie_plan.md)** | Pre-analyzed table relevance, relationship maps, and Genie Space recommendations |
| **PRD (design_prd.md)** | Business requirements, user personas, and success criteria |

This triple-input approach produces a Gold design that is **already optimized for Genie Space consumption** — with the right dimensions, measures, and TVF patterns identified upfront.

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It''s Used Here |
|----------|-------------------|
| **Metadata-Driven Design** | Uses enriched metadata (comments, constraints, tags) instead of raw column lists — producing more accurate table classifications |
| **PRD Alignment** | Cross-references business requirements to ensure Gold tables serve actual use cases |
| **Genie-Optimized** | The genie_plan.md pre-identifies metric view and TVF candidates, so the Gold design accounts for downstream semantic layer needs |
| **YAML-Driven Dimensional Modeling** | Gold schemas defined as YAML files — reviewable, version-controlled, machine-readable |
| **Dual-Purpose COMMENTs** | Table and column COMMENTs serve both business users AND Genie/LLMs |

</details>

<details><summary><strong>Expected Output</strong></summary>

## Expected Deliverables

- `gold_layer_design/` folder with:
  - ERD diagrams (Mermaid) — master + domain ERDs
  - YAML schema files — one per Gold table
  - COLUMN_LINEAGE.csv — Silver-to-Gold column mappings
  - SOURCE_TABLE_MAPPING.csv — table inclusion/exclusion rationale
  - BUSINESS_ONBOARDING_GUIDE.md — stakeholder documentation
- Gold design aligned with PRD requirements and Genie plan recommendations

</details>

---

## Gold Layer Design (PRD-aligned)

| Field | Value |
|-------|-------|
| `input_id` | `6` |
| `section_tag` | `gold_layer_design` |
| `order_number` | `9` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Design Gold layer using project skills with YAML definitions and Mermaid ERD_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
I have a customer schema at @data_product_accelerator/context/{use_case_file_prefix}_Schema.csv.

Please design the Gold layer using @data_product_accelerator/skills/gold/00-gold-layer-design/SKILL.md

This skill will orchestrate the following end-to-end design workflow:

- **Parse the schema CSV** — read the source schema file, classify each table as a dimension, fact, or bridge, and infer foreign key relationships from column names and comments
- **Design the dimensional model** — identify dimensions (with SCD Type 1/2 decisions), fact tables (with explicit grain definitions), and measures, then assign tables to business domains
- **Persist design decisions** — write `<ARTIFACT_ROOT>/gold_layer_design/DESIGN_DECISIONS.md` before generating YAML so every YAML file shares one FK format, description format, and transformation enum
- **Create ERD diagrams** — generate Mermaid Entity-Relationship Diagrams organized by table count (master ERD always, plus domain and summary ERDs for larger schemas)
- **Generate YAML schema files** — produce one YAML file per Gold table with column definitions, PK/FK constraints, table properties, lineage metadata, and dual-purpose descriptions (human + LLM readable)
- **Document column-level lineage** — trace every Gold column back through Silver to Bronze with transformation type (DIRECT_COPY, AGGREGATION, DERIVATION, etc.) in both CSV and Markdown formats
- **Create business documentation** — write a Business Onboarding Guide with domain context, real-world scenarios, and role-based getting-started guides
- **Map source tables** — produce a Source Table Mapping CSV documenting which source tables are included, excluded, or planned with rationale for each
- **Validate design consistency** — cross-check YAML schemas, ERD diagrams, and lineage CSV to ensure all columns, relationships, and constraints are consistent

The orchestrator skill will automatically load its worker skills for merge patterns, deduplication, documentation standards, Mermaid ERDs, schema validation, grain validation, and YAML-driven setup.
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

> **Artifact root (client-aware).** Resolve the data-product bundle root via `vibecoding-state` (`dp_bundle_root` in `## Environment Capabilities`, = `<artifact_root>/{user_schema_prefix}_<use_case_slug>_dab`) and write **every Gold-design artifact under `{user_schema_prefix}_<use_case_slug>_dab/gold_layer_design/`** — NOT the bare repo/project root. This is the same dedicated bundle folder the Bronze→Silver→Gold pipeline builds into, so the Gold pipeline (Step 12) can `sync` `gold_layer_design/yaml/**` from right beside the bundle. The shape is identical on every client: on Cursor/Copilot it is `<repo-root>/{user_schema_prefix}_<use_case_slug>_dab/`; on Databricks Genie Code it is `<project-root>/{user_schema_prefix}_<use_case_slug>_dab/` (your user project root `/Workspace/Users/<email>/<repo>`, NOT the skills clone) — never the page's current working directory.

## 1️⃣ How To Apply

Copy the prompt from the **Prompt** tab, start a **new Agent chat** in your coding assistant, paste it, and press Enter.

---

### Prerequisite

**Run this in your cloned Template Repository** (see Prerequisites in Step 0).

Ensure you have:
- ✅ `<ARTIFACT_ROOT>/data_product_accelerator/context/{use_case_file_prefix}_Schema.csv` - Your source schema file (from Bronze/Silver)
- ✅ `data_product_accelerator/skills/gold/00-gold-layer-design/SKILL.md` - The Gold layer design orchestrator skill

---

### Steps to Apply

1. **Start new Agent thread** — start a new Agent thread in your coding assistant for clean context
2. **Copy and paste the prompt** — Use the copy button, paste into your coding assistant; the AI will read your schema and the orchestrator skill (which automatically loads all worker skills)
3. **Review generated design** — The AI creates `gold_layer_design/` with ERD diagrams, YAML schema files, and lineage documentation
4. **Validate the design** — Check grain, SCD type, relationships, and lineage for each fact/dimension
5. **Get stakeholder sign-off** — Share the ERD and design summary with business stakeholders before implementation

---

## 2️⃣ What Are We Building?

### What is the Gold Layer?

The Gold Layer is the **business-ready** analytics layer that transforms Silver data into dimensional models optimized for reporting, dashboards, and AI/ML consumption.

### Why Design Before Implementation?

| Principle | Benefit |
|-----------|---------|
| **Design First** | Catch errors before writing code |
| **YAML as Source of Truth** | Schema changes are reviewable diffs |
| **ERD Documentation** | Visual communication with stakeholders |
| **Documented Grain** | Prevents incorrect aggregations |
| **Lineage Tracking** | Know where every column comes from |

### Gold Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GOLD LAYER DESIGN                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        DIMENSIONAL MODEL                            │   │
│  │                                                                     │   │
│  │   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    │   │
│  │   │dim_store │    │dim_product│   │dim_date  │    │dim_host  │    │   │
│  │   │ (SCD2)   │    │ (SCD1)   │    │ (Static) │    │ (SCD2)   │    │   │
│  │   └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘    │   │
│  │        │               │               │               │          │   │
│  │        └───────────────┴───────┬───────┴───────────────┘          │   │
│  │                                │                                   │   │
│  │                        ┌───────▼───────┐                          │   │
│  │                        │ fact_bookings │                          │   │
│  │                        │   (Daily)     │                          │   │
│  │                        └───────────────┘                          │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Design Artifacts:                                                          │
│  • ERD Diagrams (Mermaid)      • YAML Schema Files                         │
│  • Column Lineage              • Business Documentation                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It's Used Here |
|----------|-------------------|
| **YAML-Driven Dimensional Modeling** | Gold schemas defined as YAML files — reviewable, version-controlled, machine-readable. No embedded DDL strings in Python. |
| **Star Schema with Surrogate Keys** | Dimensions use surrogate keys (BIGINT) as PRIMARY KEYs, not business keys. Facts reference surrogate PKs via FOREIGN KEY constraints. |
| **SCD Type 1 / Type 2 Classification** | Every dimension is classified: SCD1 (overwrite, e.g., `dim_destination`) or SCD2 (versioned with `is_current`/`valid_from`/`valid_to`, e.g., `dim_property`). |
| **Dual-Purpose COMMENTs** | Table and column COMMENTs serve both business users AND Genie/LLMs — written to be human-readable and machine-parseable simultaneously. |
| **Mermaid ERDs for Documentation** | Entity-Relationship Diagrams use Mermaid syntax — renderable in Databricks notebooks, GitHub, and any Markdown viewer. |
| **Column-Level Lineage** | Every Gold column traces back to its Silver source table and column with transformation type (DIRECT_COPY, AGGREGATION, DERIVATION). |
| **Grain Documentation** | Every fact table has an explicit grain statement (e.g., "One row per booking transaction") — prevents incorrect aggregations and joins. |

---

## 4️⃣ What Happens Behind the Scenes?

This framework uses a **skills-first architecture** with an **orchestrator/worker pattern**:

1. You paste **one prompt** referencing the orchestrator: `@data_product_accelerator/skills/gold/00-gold-layer-design/SKILL.md`
2. The AI reads the orchestrator skill, which lists **mandatory dependencies** (worker skills + common skills)
3. The AI automatically loads each worker skill as needed during the workflow
4. You never need to reference individual worker skills — the orchestrator handles it

### 9-Phase Workflow

| Phase | What Happens | Key Output |
|-------|-------------|------------|
| **Phase 0** | Parse schema CSV, classify tables (dim/fact/bridge), infer FKs | Table inventory |
| **Phase 1** | Gather project requirements (domain, use cases, stakeholders) | Project context |
| **Phase 2** | Design dimensional model (dimensions, facts, grain, SCD types) | Model blueprint → writes `<ARTIFACT_ROOT>/gold_layer_design/DESIGN_DECISIONS.md` |
| **Phase 3** | Create ERD diagrams using Mermaid syntax | `erd_master.md` + domain ERDs |
| **Phase 4** | Generate YAML schema files with lineage and descriptions | `yaml/{domain}/{table}.yaml` |
| **Phase 5** | Document column-level lineage (Bronze → Silver → Gold) | `COLUMN_LINEAGE.csv` |
| **Phase 6** | Write Business Onboarding Guide with real-world scenarios | `BUSINESS_ONBOARDING_GUIDE.md` |
| **Phase 7** | Map source tables with inclusion/exclusion rationale | `SOURCE_TABLE_MAPPING.csv` |
| **Phase 8** | Validate design consistency (YAML ↔ ERD ↔ Lineage) | Validation report (structural + semantic) |

### Orchestrator / Worker Pattern

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ORCHESTRATOR / WORKER PATTERN                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  YOUR PROMPT                                                                │
│  "@data_product_accelerator/skills/gold/00-gold-layer-design/SKILL.md"                              │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────┐                                   │
│  │  ORCHESTRATOR (00-gold-layer-design)│                                   │
│  │  Manages the full design workflow   │                                   │
│  └──────────────┬──────────────────────┘                                   │
│                 │  automatically loads                                      │
│    ┌────────────┼────────────┬────────────┐                                │
│    ▼            ▼            ▼            ▼                                 │
│  ┌──────┐  ┌──────┐   ┌──────┐   ┌──────┐   + 3 more workers             │
│  │ 01-  │  │ 02-  │   │ 05-  │   │ 07-  │                                 │
│  │Grain │  │ Dims │   │ ERD  │   │Valid │                                 │
│  └──────┘  └──────┘   └──────┘   └──────┘                                 │
│                                                                             │
│  + Common Skills: naming-tagging-standards, databricks-expert-agent        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Design Worker Skills (Loaded Automatically by Orchestrator)

| Worker Skill | Path | Purpose |
|-----------|------|---------|
| `01-grain-definition` | `data_product_accelerator/skills/gold/design-workers/01-*/SKILL.md` | Grain definition patterns for fact tables |
| `02-dimension-patterns` | `data_product_accelerator/skills/gold/design-workers/02-*/SKILL.md` | Dimension design (SCD1, SCD2, conformed) |
| `03-fact-table-patterns` | `data_product_accelerator/skills/gold/design-workers/03-*/SKILL.md` | Fact table design (transactional, periodic, accumulating) |
| `04-conformed-dimensions` | `data_product_accelerator/skills/gold/design-workers/04-*/SKILL.md` | Cross-domain conformed dimension patterns |
| `05-erd-diagrams` | `data_product_accelerator/skills/gold/design-workers/05-*/SKILL.md` | Mermaid ERD diagram syntax and organization |
| `06-table-documentation` | `data_product_accelerator/skills/gold/design-workers/06-*/SKILL.md` | Dual-purpose (business + technical) documentation standards |
| `07-design-validation` | `data_product_accelerator/skills/gold/design-workers/07-*/SKILL.md` | Design consistency validation (YAML, ERD, lineage cross-check) |

</details>

<details><summary><strong>Expected Output</strong></summary>

## Expected Deliverables

### 📁 Generated Folder Structure

```
gold_layer_design/
├── README.md                           # Navigation hub
├── DESIGN_DECISIONS.md                 # ⭐ Per-run contract (FK format, transformation enum, description format)
├── erd_master.md                       # Complete ERD (ALWAYS)
├── erd_summary.md                      # Domain overview (if 20+ tables)
├── erd/                                # Domain ERDs (if 9+ tables)
│   ├── erd_booking.md
│   ├── erd_property.md
│   └── erd_host.md
├── yaml/                               # YAML schemas by domain
│   ├── booking/
│   │   ├── dim_booking.yaml
│   │   └── fact_booking_daily.yaml
│   ├── property/
│   │   ├── dim_property.yaml
│   │   └── dim_destination.yaml
│   └── host/
│       └── dim_host.yaml
├── docs/
│   └── BUSINESS_ONBOARDING_GUIDE.md    # ⭐ Business context and stories
├── COLUMN_LINEAGE.csv                  # ⭐ Machine-readable lineage
├── COLUMN_LINEAGE.md                   # Human-readable lineage
├── SOURCE_TABLE_MAPPING.csv            # ⭐ Source table rationale
├── DESIGN_SUMMARY.md                   # Grain, SCD, decisions
└── DESIGN_GAP_ANALYSIS.md             # Coverage analysis
```

---

### 📊 ERD Organization (Based on Table Count)

| Total Tables | ERD Strategy |
|--------------|--------------|
| **1-8 tables** | Master ERD only |
| **9-20 tables** | Master ERD + Domain ERDs |
| **20+ tables** | Master ERD + Summary ERD + Domain ERDs |

---

### 📝 YAML Schema Example

```yaml
# gold_layer_design/yaml/booking/fact_booking_daily.yaml
table_name: fact_booking_daily
domain: booking
grain: "One row per property-date combination"

primary_key:
  columns: ['property_id', 'check_in_date']
  composite: true

foreign_keys:
  - columns: ['property_id']
    references: dim_property(property_id)
    nullable: true
  - columns: ['host_id']
    references: dim_host(host_id)
    nullable: true

columns:
  - name: property_id
    type: BIGINT
    nullable: false
    description: >
      Property identifier.
      Business: Links to property dimension.
      Technical: FK to dim_property.property_id.
    lineage:
      silver_table: silver_bookings
      silver_column: property_id
      transformation: "DIRECT_COPY"
```

**Dimensions referenced by `nullable: true` FKs declare an `unknown_member:` block** (sentinel row for NULL/missing references):

```yaml
# gold_layer_design/yaml/property/dim_property.yaml (excerpt)
unknown_member:
  description: "Sentinel row for NULL or missing FK references from fact tables."
  key_value: "-1"
  business_key_value: -1
  attribute_defaults:
    name: "Unknown"
    status: "Not Applicable"
```

---

### ✅ Success Criteria Checklist

**ERD Artifacts:**
- [ ] Master ERD created with all tables
- [ ] Domain ERDs created (if 9+ tables)
- [ ] All relationships shown with cardinality

**YAML Schemas:**
- [ ] One YAML file per table
- [ ] Organized by domain folders
- [ ] Primary keys defined
- [ ] Foreign keys defined
- [ ] Column lineage documented

**Mandatory Documentation:**
- [ ] COLUMN_LINEAGE.csv created
- [ ] SOURCE_TABLE_MAPPING.csv created
- [ ] BUSINESS_ONBOARDING_GUIDE.md created
- [ ] DESIGN_SUMMARY.md created

**Validation:**
- [ ] Grain explicitly stated for each fact
- [ ] SCD type specified for each dimension
- [ ] All columns trace back to source
- [ ] `DESIGN_DECISIONS.md` exists and was written before any YAML
- [ ] All transformation types from standard 15-type enum (no invented values)
- [ ] `unknown_member` documented for each dimension referenced by a `nullable: true` FK
- [ ] Stakeholder sign-off obtained

</details>

#### Fork — `coding_assistant = genie-code`  (input_id 903)

> Fork rows override only `input_template`, `system_prompt`, and `bypass_llm`. All display fields are inherited from the default row above.

| Field | Value |
|-------|-------|
| `input_id` | `903` |
| `section_tag` | `gold_layer_design` |
| `order_number` | `(inherited)` |
| `coding_assistant` | `genie-code` |
| `bypass_llm` | `true` |

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Design the Gold layer — run the design workflow to produce the dimensional model, ERDs, and YAML schemas. Before this step there is no Gold design; after it, every design artifact is written under `<DP_BUNDLE_ROOT>/gold_layer_design/`.

This will involve the following steps:

- **Load the design skills** — full `skill_ref_root`-prefixed paths.
- **Run the design workflow** — drive it from the orchestrator.
- **Write the artifacts** — the dimensional model, ERDs, and YAML schemas under `<DP_BUNDLE_ROOT>/gold_layer_design/`.

The steps below are the prescriptive runbook for those actions; follow them in order.

**Genie Code — this is a prescriptive runbook. Follow the steps in order. Do NOT improvise paths, do NOT use bare relative paths, do NOT use `@`-mentions. This is a DESIGN-ONLY step: you WRITE design artifacts (YAML, ERDs, lineage, docs) — you do NOT create schemas/tables, run SQL, or deploy anything. Every skill is named by its full `skill_ref_root`-prefixed path; every artifact is anchored to `<DP_BUNDLE_ROOT>/gold_layer_design/`.**

### 🔴 Non-negotiable rules (read before anything)

❌ **NEVER** create a catalog/schema/table, run `CREATE`/`MERGE`/DDL, or build/deploy an Asset Bundle in this step — that is the Gold *pipeline* step (step 12), not design. Design produces FILES only.

❌ **NEVER** write the design to the bare project root, `/tmp`, the page's current working directory, or a bare relative path. Genie Code's CWD is page-type-dependent, so a bare `gold_layer_design/` lands in the wrong place.

✅ Write **every** design artifact under `<DP_BUNDLE_ROOT>/gold_layer_design/` — the SAME data-product bundle folder the Lakehouse steps (Bronze → Silver → Gold pipeline) build into. Co-locating the design here is what lets the Gold pipeline's `databricks.yml` later sync `gold_layer_design/yaml/**` from right beside it.

### Step 0 — Resolve your environment (once, before anything else)

Run `skills/vibecoding-state` operation `enter` (params: `prompt_id: "gold_layer_design"`). This is the **FIRST data-product step**, so `enter` **bootstrap-creates** the canonical live state file at `<dp_bundle_root>/.vibecoding-state.md` from the template if absent (copying Workshop Choices from the prior `example/…` bootstrap file). Read these resolved values and use them literally throughout:

- `client_context` = `genie_code`
- `artifact_root` = your workshop project root (e.g. `/Workspace/Users/<your-email>/vibe-coding-workshop`) — where all generated bundles/apps/docs build; the repo itself is cloned at `/Workspace/Users/<your-email>/.assistant/skills/vibe-coding-workshop` (skills load from there via `skill_ref_root`, NOT from `artifact_root`)
- `skill_ref_root` = `skills/vibe-coding-workshop` (substitute your clone folder if you cloned somewhere other than `.assistant/skills/vibe-coding-workshop`)
- `dp_bundle_root` = `<artifact_root>/{user_schema_prefix}_<use_case_slug>_dab` — the **self-contained data-product Asset Bundle project** the whole pipeline builds into (e.g. `…/vibe-coding-workshop/{user_schema_prefix}_booking_app_dab`). Referred to below as `<DP_BUNDLE_ROOT>`. This step writes the design INTO `<DP_BUNDLE_ROOT>/gold_layer_design/`. The folder may not exist yet (the Bronze step creates the bundle's `databricks.yml` later) — that's fine, writing the files creates it. Use the SAME `{user_schema_prefix}_<use_case_slug>_dab` name the Lakehouse steps use, so the design and the bundle stay in one folder.

Your source schema is `<artifact_root>/data_product_accelerator/context/{use_case_file_prefix}_Schema.csv`.

### Step 1 — Load the required skills by their FULL `skill_ref_root`-prefixed paths

Load each skill with `readSkillFile` using its fully-qualified `<skill_ref_root>`-prefixed path — NEVER a bare `@…` mention, NEVER a repo-relative path. **The root-level `skills/` come FIRST: they are the highest-priority, always-on guardrails and govern everything below.**

1. `readSkillFile("skills/vibe-coding-workshop/skills/databricks-expert-agent/SKILL.md")` — core rule: extract names from the source schema CSV, never hardcode or hallucinate table/column names.

Then the Gold design orchestrator and its common skill (load in this order):

2. `readSkillFile("skills/vibe-coding-workshop/data_product_accelerator/skills/gold/00-gold-layer-design/SKILL.md")` — the design orchestrator. Drive the full 9-phase design workflow from it.
3. `readSkillFile("skills/vibe-coding-workshop/data_product_accelerator/skills/common/naming-tagging-standards/SKILL.md")` — naming prefixes (`dim_`/`fact_`), dual-purpose (human + Genie/LLM) COMMENTs, governed PII tags. **NEVER name a table/column or write a description without reading this.**

The orchestrator also lists **Mandatory Skill Dependencies** — its design workers (grain definition, dimension patterns, fact-table patterns, conformed dimensions, ERD diagrams, table documentation, design validation). Load EACH the same way: take its repo-relative path and prefix it with `skill_ref_root`. Genie Code has no repo-root-relative resolution and `AGENTS.md` does not carry across threads — so always prefix with `skill_ref_root`.

🔴 **Do NOT batch-read the design workers upfront. Load each worker just-in-time, at the start of the phase that needs it**, following the orchestrator's per-phase reading table (`00-gold-layer-design/SKILL.md`, "Skill reading strategy"): Phase 0 = schema-intake; Phase 2 = dimension-patterns + fact-patterns; Phase 3 = erd-patterns; Phase 4 = yaml-schema-patterns + table-documentation; Phase 8 = design-validation. **This deliberately overrides the general Genie Code "batch parallel reads" heuristic (`genie-code-environment` §10) for design workers only** — the orchestrator found that pre-loading every worker pushes the active phase's rules out of the attention window and produces YAML format divergence across tables, so here quality wins over the context-savings of batching. The Tier-A skills above (Steps 1–3: databricks-expert-agent, the orchestrator, naming-tagging-standards) still load together as one batch; only the design workers are staged per phase.

**🔴 Preflight acknowledgement (hard gate).** Echo a one-line acknowledgement for EACH skill the moment you load it — its full `<skill_ref_root>`-prefixed path + the single rule you will apply from it. For Tier-A, acknowledge all three before writing any file. For each design worker, acknowledge it as its phase begins, before producing that phase's artifacts. If you cannot state the rule, you have not actually read the skill — STOP and read it before continuing. Silently skipping a skill read is the regression this preflight exists to prevent.

### Step 2 — Run the design workflow, writing every artifact under `<DP_BUNDLE_ROOT>/gold_layer_design/`

Drive the orchestrator's end-to-end design workflow against `<artifact_root>/data_product_accelerator/context/{use_case_file_prefix}_Schema.csv`:

- Parse the schema CSV; classify each table as dimension / fact / bridge; infer FK relationships from column names + comments.
- Design the dimensional model — SCD Type 1/2 decisions per dimension, explicit grain per fact, measures, and business domains.
- **Write `<DP_BUNDLE_ROOT>/gold_layer_design/DESIGN_DECISIONS.md` BEFORE any YAML** so every YAML shares one FK format, description format, and transformation enum.
- Generate Mermaid ERDs, one YAML schema file per Gold table, column-level lineage (Bronze → Silver → Gold), the Business Onboarding Guide, the Source Table Mapping, and the design-consistency validation report.
- **Tag generated dimensions.** Any dimension with no Silver source (e.g. `dim_date`, `dim_time`) MUST carry `population_strategy: generate_sequence` in its YAML; every Silver-sourced table carries `population_strategy: merge_from_silver`. This tells the Gold pipeline step (12) to INSERT `dim_date` from a generated sequence instead of trying to MERGE from a non-existent Silver source. Record the `dim_date` exception in `DESIGN_DECISIONS.md`.
- **Upstream cross-reference is mandatory when Silver exists.** After generating the YAML, check whether Silver tables exist (`spark.catalog.tableExists(...)`); if they do, run the orchestrator's `cross_reference_silver_at_design_time()` to validate every YAML `silver_column` against the live Silver schema via `DESCRIBE`, fix any mismatches, and write the resulting mismatch count (target: 0) into the validation report. Do not treat this as optional when Silver is present — it is the external check that catches systematic column errors the self-consistency checks cannot.

Anchor EVERY output to `<DP_BUNDLE_ROOT>/gold_layer_design/` — never the bare project root, never the page CWD. The key paths:

- `<DP_BUNDLE_ROOT>/gold_layer_design/DESIGN_DECISIONS.md`  ← written first
- `<DP_BUNDLE_ROOT>/gold_layer_design/erd_master.md` (+ per-domain ERDs under `…/gold_layer_design/erd/` for larger schemas)
- `<DP_BUNDLE_ROOT>/gold_layer_design/yaml/{domain}/{table}.yaml`  ← the Gold pipeline (step 12) reads these, and its bundle syncs `gold_layer_design/yaml/**`
- `<DP_BUNDLE_ROOT>/gold_layer_design/COLUMN_LINEAGE.csv` and `COLUMN_LINEAGE.md`
- `<DP_BUNDLE_ROOT>/gold_layer_design/SOURCE_TABLE_MAPPING.csv`, `DESIGN_SUMMARY.md`, and `docs/BUSINESS_ONBOARDING_GUIDE.md`
- `<DP_BUNDLE_ROOT>/gold_layer_design/DESIGN_GAP_ANALYSIS.md` (coverage analysis) and `README.md` (navigation hub) — both are MANDATORY per the orchestrator's deliverables checklist; do not skip them

Use `createAsset`/the workspace file APIs to write these files under `<DP_BUNDLE_ROOT>/gold_layer_design/`. If a path-resolution tool reports the parent folder does not exist, create it (the bundle folder is built up across steps) — do not retarget to the project root.

**Genie Code execution notes — this is a heavy, compute-bound phase; heed these (see `genie-code-environment` §10):**

- **Warm up, then budget generously.** This phase does real Python work — parsing the schema CSV, generating one YAML per Gold table, building ERDs, and running cross-table validation. Make the FIRST `executeCode` call a trivial `print("ready")` to absorb the ~3–5 min serverless cold start once, then set `timeoutMinutes` **≥ 20** on every subsequent `executeCode`. **Never set `timeoutMinutes` below 15** — a smaller budget only buys a cold-start timeout and a wasted retry.
- **Write files through warm compute.** Once compute is warm, write each artifact with `executeCode` `open(path,"w").write(...)` (one call per file, creates it directly). The compute-free trio `createAsset` → `readFile` → `workspaceUpdateFile` works too, but it is 3 calls and `workspaceUpdateFile` can only update a file that already exists AND was read in this thread — reserve it for single updates, not bulk generation. 🔴 **Verify every write with `os.path.exists(path)` (or `os.listdir(dir)`) in the SAME `executeCode` block — NOT `listFiles`:** the workspace REST API behind `listFiles` lags FUSE-written files (a live run saw `listFiles`=7 while `os.listdir`=12), so `listFiles` returns false "missing-file" negatives and you waste turns recreating files that already exist.

**State-lock:** this prompt runs between an `enter` (Step 0) and an `exit`. After the gate passes, run `skills/vibecoding-state` op `exit` — params: `prompt_id: "gold_layer_design"`, `gate: "Gold design complete"`, `captured: {gold_design_path}`. **This `enter`/`exit` pair is a mandatory ritual, not advisory.** Step 0's `enter` MUST locate — or, if this is the first prompt of the track, bootstrap-create — the canonical live state file at `<dp_bundle_root>/.vibecoding-state.md` (never the temporary `example/…` bootstrap path). The closing `exit` MUST append this prompt's Per-Step Log entry, Gate result, and `captured` vars to that file, then **re-read it and echo the appended section to prove the write landed**. **Gate completion rule:** this prompt is NOT complete until that re-read confirms the appended entry — the chat summary is NOT the state store.

**Gate:** `Gold design complete` — `<DP_BUNDLE_ROOT>/gold_layer_design/` contains the FULL mandatory deliverables set from the orchestrator's deliverables checklist: `DESIGN_DECISIONS.md` (written before any YAML), one YAML per Gold table under `yaml/{domain}/`, the master ERD, `COLUMN_LINEAGE.csv` (+ `COLUMN_LINEAGE.md`), `SOURCE_TABLE_MAPPING.csv`, `DESIGN_SUMMARY.md`, `docs/BUSINESS_ONBOARDING_GUIDE.md`, **`DESIGN_GAP_ANALYSIS.md`, and `README.md`** — all under the data-product bundle folder so the Gold pipeline can sync them in place. **Upstream cross-reference:** if Silver tables exist, the YAML-lineage-vs-live-Silver `DESCRIBE` check ran and its mismatch count (target: 0) is recorded in the validation report — this is a hard part of the gate, not optional. No schema/table was created and nothing was deployed (that is step 12).
```

---

## Gold Layer Pipeline (YAML-Driven)

| Field | Value |
|-------|-------|
| `input_id` | `9` |
| `section_tag` | `gold_layer_pipeline` |
| `order_number` | `12` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Build Gold layer by reading YAML schemas, creating tables with PK/FK constraints (NOT ENFORCED), and merging from Silver with deduplication_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Implement the Gold layer using @data_product_accelerator/skills/gold/01-gold-layer-setup/SKILL.md

**Bundle root:** Extend the SAME data-product bundle created in Bronze — its dedicated top-level folder `{user_schema_prefix}_{use_case_slug}_dab/` at the repo root (`dp_bundle_root`). All relative paths below (`src/`, `resources/`, `gold_layer_design/`, `databricks.yml`) resolve UNDER `{user_schema_prefix}_{use_case_slug}_dab/`, never the bare repo root. Same folder on every coding agent.

This will involve the following steps:

- **Read YAML schemas** — use the Gold layer design YAML files (from Step 9) as the single source of truth for all table definitions, columns, and constraints
- **Create Gold tables** — generate CREATE TABLE DDL from YAML, add PRIMARY KEY constraints, then add FOREIGN KEY constraints (NOT ENFORCED) in dependency order
- **Merge data from Silver** — deduplicate Silver records before MERGE, map columns using YAML lineage metadata, merge dimensions first (SCD1/SCD2) then facts (FK dependency order)
- **Deploy 2-job architecture** — gold_setup_job (2 tasks: create tables + add FK constraints) and gold_merge_job (populate data from Silver)
- **Validate results** — verify table creation, PK/FK constraints, row counts, SCD2 history, and fact-dimension joins

Use the gold layer design YAML files as the target destination, and the silver layer tables as source.

Limit pipelines to only 5 core tables for purposes of this exercise.

IMPORTANT: Use the EXISTING catalog `{lakehouse_default_catalog}` -- do NOT create a new catalog. Create the Gold schema `{user_schema_prefix}_gold` and all Gold tables inside this catalog.

NOTE: Before creating the schema, check if `{lakehouse_default_catalog}.{user_schema_prefix}_gold` already exists. If it does, DROP the schema with CASCADE and recreate it from scratch. These are user-specific schemas so dropping is safe.

**State-lock (`skills/vibecoding-state`) — run this prompt between an `enter` and an `exit` so workshop state is resolved and locked:**

1. **Phase 0 — first, before any step below:** `skills/vibecoding-state` op `enter` — params: `prompt_id: "gold_layer_pipeline"`, `require_prior_gate: {prompt_id: "silver_layer_sdp", gate: "Silver layer live"}`. `enter` resolves the `## Environment Capabilities` triple (deploy verb, CLI channel, `state_file_root`) so every deploy/run step below uses the resolved channel — `runDatabricksCli` on Genie Code — and writes state under `state_file_root`, never a bare-local assumption.
2. **Final — after the step succeeds:** `skills/vibecoding-state` op `exit` — params: `prompt_id: "gold_layer_pipeline"`, `gate: "Gold layer live"`, `captured: {gold_schema, gold_setup_job, gold_merge_job}`.

**Gate:** `Gold layer live` — the Gold setup and merge jobs complete and the PK/FK constraints are present.
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## 1️⃣ How To Apply

Copy the prompt above, start a **new Agent chat** in your coding assistant, and paste it. The AI will read YAML files and generate implementation code.

### Prerequisite

**Run this in your cloned Template Repository** (see Prerequisites in Step 0).

Ensure you have:
- ✅ Gold Layer Design completed (Step 9) with YAML files in `gold_layer_design/yaml/`
- ✅ Column lineage documentation in `gold_layer_design/COLUMN_LINEAGE.csv` (Silver→Gold column mappings)
- ✅ Silver Layer populated (Step 11) with data in Silver tables
- ✅ `data_product_accelerator/skills/gold/01-gold-layer-setup/SKILL.md` — The Gold implementation orchestrator (auto-loads 7 worker + 8 common skills)

### Steps to Apply

**Step 1: Start New Agent Thread** — start a new Agent thread in your coding assistant for clean context.

**Step 2: Copy and Paste the Prompt** — Copy the prompt using the copy button, paste it into your coding assistant. The AI will read YAML files and generate implementation code.

**Step 3: Review Generated Code** — The AI will create:
- `setup_tables.py` — reads YAML → CREATE TABLE + PKs
- `add_fk_constraints.py` — reads YAML → ALTER TABLE ADD FK (NOT ENFORCED)
- `merge_gold_tables.py` — dedup Silver → map columns → MERGE (SCD1/SCD2/fact)
- `gold_setup_job.yml` — 2-task job (setup → FK via `depends_on`)
- `gold_merge_job.yml` — merge job (scheduled, PAUSED in dev)

**Step 4: Validate the Bundle**

> **Client note:** IDE runs these in a terminal; Genie Code runs the `databricks bundle …` commands via `runDatabricksCli` (be on the bundle's page; resolved channel in `## Environment Capabilities`). See `genie-code-environment`.

```bash
# Validate bundle configuration
databricks bundle validate -t dev

# Expected: No errors, all resources validated
```

**Step 5: Deploy the Bundle**

```bash
# Deploy to Databricks workspace
databricks bundle deploy -t dev

# Expected: Jobs created successfully
```

**Step 6: Run the Gold Setup Job (Tables + PKs + FKs)**

```bash
# Run Gold setup (creates tables, adds PKs, then adds FKs)
databricks bundle run -t dev gold_setup_job

# This job has TWO tasks:
#   Task 1: setup_tables (creates tables from YAML + adds PKs)
#   Task 2: add_fk_constraints (depends_on Task 1)
#
# FKs are added here (before data) because UC constraints are
# NOT ENFORCED — they're informational only, no data validation needed.
```

**Step 7: Run the Gold Merge Job**

```bash
# Run Gold merge (populates tables from Silver)
databricks bundle run -t dev gold_merge_job

# Merges dimensions FIRST (SCD1/SCD2), then facts (FK dependency order)
```

**Step 8: Verify in Databricks UI**

After all jobs complete:

```sql
-- 1. List Gold tables
SHOW TABLES IN {lakehouse_default_catalog}.{user_schema_prefix}_gold;

-- 2. Check Primary Key constraints
SELECT * FROM information_schema.table_constraints 
WHERE table_schema = '{user_schema_prefix}_gold' AND constraint_type = 'PRIMARY KEY';

-- 3. Check Foreign Key constraints
SELECT * FROM information_schema.table_constraints 
WHERE table_schema = '{user_schema_prefix}_gold' AND constraint_type = 'FOREIGN KEY';

-- 4. Verify row counts
SELECT 'dim_property' as tbl, COUNT(*) as cnt FROM {lakehouse_default_catalog}.{user_schema_prefix}_gold.dim_property
UNION ALL SELECT 'dim_destination', COUNT(*) FROM {lakehouse_default_catalog}.{user_schema_prefix}_gold.dim_destination
UNION ALL SELECT 'dim_user', COUNT(*) FROM {lakehouse_default_catalog}.{user_schema_prefix}_gold.dim_user
UNION ALL SELECT 'dim_host', COUNT(*) FROM {lakehouse_default_catalog}.{user_schema_prefix}_gold.dim_host
UNION ALL SELECT 'fact_booking_detail', COUNT(*) FROM {lakehouse_default_catalog}.{user_schema_prefix}_gold.fact_booking_detail;

-- 5. Preview fact with dimension lookups
SELECT 
    f.booking_id,
    p.property_name,
    d.destination_name,
    u.first_name || ' ' || u.last_name as guest_name,
    f.total_amount
FROM {lakehouse_default_catalog}.{user_schema_prefix}_gold.fact_booking_detail f
JOIN {lakehouse_default_catalog}.{user_schema_prefix}_gold.dim_property p ON f.property_id = p.property_id AND p.is_current = true
JOIN {lakehouse_default_catalog}.{user_schema_prefix}_gold.dim_destination d ON f.destination_id = d.destination_id
JOIN {lakehouse_default_catalog}.{user_schema_prefix}_gold.dim_user u ON f.user_id = u.user_id AND u.is_current = true
LIMIT 5;
```

---

## 2️⃣ What Are We Building?

### 📚 What is the Gold Layer Pipeline?

The Gold Layer Pipeline **implements** the Gold Layer Design by:
1. Reading YAML schema files (single source of truth)
2. Creating dimension and fact tables with proper constraints
3. Merging data incrementally from Silver layer

### Design vs Implementation

| Step | What Happens | Output |
|------|--------------|--------|
| **Step 9: Design** | Define schemas, ERDs, lineage | `gold_layer_design/` folder |
| **Step 12: Implementation** | Create tables, run merges | Populated Gold tables |

### 🎯 Core Philosophy: Extract, Don't Generate

**ALWAYS prefer scripting techniques to extract names from existing source files over generating them from scratch.**

| Approach | Result |
|----------|--------|
| ❌ **Generate from scratch** | Hallucinations, typos, schema mismatches |
| ✅ **Extract from YAML** | 100% accuracy, consistency, no hallucinations |

### What "Extract" Means

```python
# ❌ WRONG: Hardcode table names (might be wrong!)
tables = ["dim_property", "dim_destination", "fact_booking"]

# ✅ CORRECT: Extract from YAML files
import yaml
from pathlib import Path

def get_gold_table_names():
    yaml_dir = Path("gold_layer_design/yaml")
    tables = []
    for yaml_file in yaml_dir.rglob("*.yaml"):
        with open(yaml_file) as f:
            config = yaml.safe_load(f)
            tables.append(config['table_name'])
    return tables
```

**Benefits:**
- ✅ 100% accuracy (names come from actual schemas)
- ✅ No hallucinations (only existing entities referenced)
- ✅ Consistency across layers
- ✅ Immediate detection of schema changes

### 🏗️ Gold Layer Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      GOLD LAYER PIPELINE FLOW (2 Jobs)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  INPUTS                          PROCESS                       OUTPUT      │
│                                                                             │
│  ┌─────────────────┐   ┌───────────────────────────────────────────────┐  │
│  │ Gold Layer      │   │ gold_setup_job                                │  │
│  │ Design YAML     │──▶│                                               │  │
│  │ (Schema Source) │   │  Task 1: setup_tables.py                     │  │
│  └─────────────────┘   │    • CREATE TABLE from YAML                  │  │
│                         │    • ALTER TABLE ADD PRIMARY KEY              │  │
│  ┌─────────────────┐   │         ↓ depends_on                         │  │
│  │ COLUMN_LINEAGE  │   │  Task 2: add_fk_constraints.py               │  │
│  │ .csv            │   │    • ALTER TABLE ADD FOREIGN KEY (NOT ENFORCED)│  │
│  └─────────────────┘   └───────────────────────────────────────────────┘  │
│                                          ↓                                 │
│  ┌─────────────────┐   ┌───────────────────────────────────────────────┐  │
│  │ Silver Layer    │   │ gold_merge_job                                │  │
│  │ Tables          │──▶│                                               │  │
│  │ (Data Source)   │   │  1. Deduplicate Silver (business_key)         │  │
│  └─────────────────┘   │  2. Map columns (YAML lineage / CSV)         │  │
│                         │  3. Merge dims first (SCD1/SCD2)             │  │
│                         │  4. Merge facts last (FK order)              │  │
│                         └───────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 🎯 Workshop Scope: 5 Tables

For this exercise, we limit to **5 key tables**:

| Table | Type | Description |
|-------|------|-------------|
| `dim_property` | Dimension (SCD2) | Vacation rental property details |
| `dim_destination` | Dimension (SCD1) | Travel destinations/locations |
| `dim_user` | Dimension (SCD2) | Platform users (guests) |
| `dim_host` | Dimension (SCD2) | Property host profiles |
| `fact_booking_detail` | Fact | Individual booking transactions |

**Why 5 tables?**
- ✅ Demonstrates all patterns (SCD1, SCD2, Fact)
- ✅ Shows FK relationships (Fact → Dimensions)
- ✅ Completes in reasonable time for workshop
- ✅ Full pattern coverage without complexity overload

### 🔑 Constraint Application Order

```
┌────────────────────────────────────────────────────────────┐
│  gold_setup_job (2 tasks)                                  │
│                                                            │
│  Task 1: setup_tables.py                                   │
│    • CREATE OR REPLACE TABLE ... (from YAML)               │
│    • ALTER TABLE ... ADD CONSTRAINT pk_ PRIMARY KEY        │
│           ↓ (depends_on)                                   │
│  Task 2: add_fk_constraints.py                             │
│    • ALTER TABLE ... ADD CONSTRAINT fk_ FOREIGN KEY        │
│    • FK references PK → PK must exist first                │
│                                                            │
└────────────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────────────┐
│  gold_merge_job                                            │
│    • Merge dimensions first (SCD1/SCD2)                    │
│    • Merge facts last (FK dependency order)                │
└────────────────────────────────────────────────────────────┘
```

### ⚠️ Why FKs BEFORE Data?

Unity Catalog constraints are **NOT ENFORCED** — they are **informational only**:
- They do NOT reject invalid data on INSERT/MERGE
- They DO tell BI tools (Genie, Power BI, Tableau) how tables relate
- They DO improve query optimizer join planning
- Data does NOT need to exist for constraints to be applied

This is a key Databricks concept: PK/FK in Unity Catalog are for **metadata enrichment and BI tool discovery**, not data integrity enforcement.

**Serverless limitation:** In serverless compute, FK references must target PRIMARY KEY columns (UNIQUE constraints are unavailable). If a YAML FK references a non-PK column (e.g., a business key instead of a surrogate key), the FK script will log a warning and skip that constraint — this is expected behavior, not an error.

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It's Used Here |
|----------|-------------------|
| **Surrogate Keys as PRIMARY KEYs** | Dimensions use surrogate BIGINT keys (not business keys) as PKs — informational constraints in Unity Catalog for BI tool discovery |
| **FOREIGN KEY Constraints** | Fact tables declare FK relationships to dimensions — enables Genie, Power BI, and Tableau to auto-discover joins |
| **SCD Type 1 (Overwrite)** | Reference dimensions like `dim_destination` use SCD1 — MERGE replaces old values with current values |
| **SCD Type 2 (Versioned History)** | Tracking dimensions like `dim_property`, `dim_host` use SCD2 — `is_current`, `valid_from`, `valid_to` columns preserve history |
| **Delta MERGE with Deduplication** | Pre-deduplicates source rows before MERGE to prevent `DELTA_MULTIPLE_SOURCE_ROW_MATCHING_TARGET_ROW_IN_MERGE` errors. Dedup key = `business_key` from YAML. |
| **2-Job Architecture** | `gold_setup_job` (2 tasks: create tables + add FKs) → `gold_merge_job` (populate data). FKs applied before data because constraints are NOT ENFORCED. |
| **NOT ENFORCED Constraints** | UC PK/FK are informational — they help BI tools discover relationships and improve query planning, but don't reject invalid data |
| **Dual-Purpose COMMENTs** | Every table and column has a COMMENT serving both business users ("Property name for display") and technical users/Genie ("FK to dim_property.property_sk") |
| **Row Tracking** | `delta.enableRowTracking = true` on every Gold table — required for downstream Materialized View incremental refresh |
| **CLUSTER BY AUTO** | Gold tables use automatic liquid clustering — Databricks chooses optimal columns based on actual query patterns |
| **Predictive Optimization Ready** | Gold tables are structured for Databricks Predictive Optimization — auto-OPTIMIZE, auto-VACUUM, auto-ANALYZE |
| **YAML as Single Source of Truth** | Table schemas live in version-controlled YAML files, not in scattered SQL scripts — enables schema diff reviews in PRs |
| **PyYAML + YAML Sync** | `pyyaml>=6.0` in job environment; YAML files synced in `databricks.yml` — without sync, `setup_tables.py` can't find schemas in workspace |
| **Variable Shadowing Prevention** | Never name variables `count`, `sum`, `min`, `max` — shadows PySpark functions. Use `spark_sum = F.sum`, `record_count = df.count()` |
| **Column Mapping from Lineage** | Silver→Gold column renames extracted from YAML `lineage.source_column` or `COLUMN_LINEAGE.csv` — never guessed or assumed |

---

## 4️⃣ What Happens Behind the Scenes?

When you paste the prompt, the AI reads `@data_product_accelerator/skills/gold/01-gold-layer-setup/SKILL.md` — the **Gold implementation orchestrator**. Behind the scenes:

1. **YAML-driven approach** — the orchestrator reads your `gold_layer_design/yaml/` files (from Step 9) as the **single source of truth**. Table names, columns, types, PKs, FKs are all extracted from YAML — never generated from scratch.
2. **Pipeline worker skills auto-loaded:**
   - `01-yaml-table-setup` — reads YAML schemas and generates CREATE TABLE DDL with PKs
   - `02-merge-patterns` — SCD Type 1/2 dimensions, fact table MERGE operations
   - `03-deduplication` — prevents DELTA_MULTIPLE_SOURCE_ROW_MATCHING errors by deduplicating Silver before MERGE
   - `04-grain-validation` — validates grain before populating fact tables
   - `05-schema-validation` — validates schemas before deployment
3. **Common skills auto-loaded (8 total):**
   - `databricks-expert-agent` — core "Extract, Don't Generate" principle applied to EVERY YAML read
   - `databricks-asset-bundles` — generates 2 jobs (setup+FK combined, merge separate), `notebook_task` + `base_parameters`
   - `databricks-table-properties` — Gold TBLPROPERTIES (CDF, row tracking, auto-optimize, `layer=gold`)
   - `unity-catalog-constraints` — surrogate keys as PKs (NOT NULL), FK via ALTER TABLE (NOT ENFORCED)
   - `schema-management-patterns` — `CREATE SCHEMA IF NOT EXISTS` with governance metadata
   - `databricks-python-imports` — pure Python modules for shared config (avoids `sys.path` issues)
   - `naming-tagging-standards` — enterprise naming and dual-purpose COMMENTs
   - `databricks-autonomous-operations` — self-healing deploy loop if jobs fail

**Key principle: "Extract, Don't Generate"** — every table name, column name, and type comes from YAML. The AI never hallucinates schema elements.

</details>

<details><summary><strong>Expected Output</strong></summary>

## Expected Deliverables

### 📁 Generated Asset Bundle Structure

```
{user_schema_prefix}_{use_case_slug}_dab/                       # data-product bundle root (dp_bundle_root) — same folder Bronze + Silver use
├── databricks.yml                          # Bundle config (MUST sync YAML files!)
├── src/
│   └── {project}_gold/
│       ├── setup_tables.py                 # Creates Gold tables from YAML + adds PKs
│       ├── add_fk_constraints.py           # Adds FK constraints (separate script)
│       └── merge_gold_tables.py            # Merges Silver → Gold (dedup + map + merge)
├── resources/
│   └── gold/
│       ├── gold_setup_job.yml              # 2 tasks: setup_tables → add_fk_constraints
│       └── gold_merge_job.yml              # Merge job (scheduled, PAUSED in dev)
└── gold_layer_design/                      # Source of truth (from Step 9 design)
    ├── COLUMN_LINEAGE.csv                  # Silver→Gold column mappings
    └── yaml/
        ├── property/
        │   ├── dim_property.yaml
        │   └── dim_destination.yaml
        ├── user/
        │   ├── dim_user.yaml
        │   └── dim_host.yaml
        └── booking/
            └── fact_booking_detail.yaml
```

> **Critical:** `databricks.yml` must include a sync rule for `gold_layer_design/yaml/**/*.yaml` — without it, the scripts can't find YAML schemas in the workspace. The environment must also include `pyyaml>=6.0`.

---

### 🔄 What Each Script Does

#### `setup_tables.py` - Table Creation

```python
# Reads YAML → Generates DDL → Creates Tables
for yaml_file in gold_yaml_files:
    config = yaml.safe_load(yaml_file)
    
    # Extract schema from YAML (don't hardcode!)
    table_name = config['table_name']
    columns = config['columns']
    primary_key = config['primary_key']
    
    # Generate and execute DDL
    ddl = generate_create_table(table_name, columns, primary_key)
    spark.sql(ddl)
```

#### `merge_gold_tables.py` - Data Population

```python
# For each table: Deduplicate → Map Columns → Validate → Merge
for table_name, meta in inventory.items():
    silver_df = spark.table(f"{lakehouse_default_catalog}.{user_schema_prefix}_silver.{meta['source_table']}")
    
    # 1. ALWAYS deduplicate Silver before MERGE (mandatory!)
    deduped_df = silver_df.orderBy(col("processed_timestamp").desc()) \
                          .dropDuplicates(meta["business_key"])
    
    # 2. Map columns (Silver names → Gold names from COLUMN_LINEAGE.csv)
    for gold_col, silver_col in meta["column_mappings"].items():
        deduped_df = deduped_df.withColumn(gold_col, col(silver_col))
    
    # 3. Merge (SCD1 or SCD2 based on YAML scd_type)
    merge_condition = build_merge_condition(meta["pk_columns"])
    merge_into_gold(deduped_df, table_name, merge_condition, meta)

# Note: uses spark_sum = F.sum (never shadow Python builtins)
```

#### `add_fk_constraints.py` - Foreign Keys

```python
# Reads FK definitions from YAML → Adds constraints
for yaml_file in gold_yaml_files:
    config = yaml.safe_load(yaml_file)
    
    for fk in config.get('foreign_keys', []):
        # Add FK constraint (NOT ENFORCED for performance)
        spark.sql(f"""
            ALTER TABLE {table_name}
            ADD CONSTRAINT fk_{table}_{ref_table}
            FOREIGN KEY ({fk_columns})
            REFERENCES {ref_table}({ref_columns})
            NOT ENFORCED
        """)
```

---

### 📊 Tables Created with Constraints

| Table | Type | Primary Key | Foreign Keys |
|-------|------|-------------|--------------|
| `dim_property` | Dimension (SCD2) | `property_key` | None |
| `dim_destination` | Dimension (SCD1) | `destination_id` | None |
| `dim_user` | Dimension (SCD2) | `user_key` | None |
| `dim_host` | Dimension (SCD2) | `host_key` | None |
| `fact_booking_detail` | Fact | `booking_id` | → dim_property, dim_destination, dim_user, dim_host |

---

### 🔀 Merge Strategies by Table Type

| Table Type | Merge Strategy | What Happens |
|------------|----------------|--------------|
| **Dimension (SCD1)** | Overwrite | Old values replaced with new |
| **Dimension (SCD2)** | Track History | Old record marked `is_current=false`, new record inserted |
| **Fact** | Upsert | INSERT new, UPDATE existing on PK match |

---

### ✅ Verification Queries

After all jobs complete:

```sql
-- 1. Verify table creation
SHOW TABLES IN {lakehouse_default_catalog}.{user_schema_prefix}_gold;

-- 2. Verify Primary Key constraints
SHOW CONSTRAINTS ON {lakehouse_default_catalog}.{user_schema_prefix}_gold.dim_property;

-- 3. Verify Foreign Key constraints
SHOW CONSTRAINTS ON {lakehouse_default_catalog}.{user_schema_prefix}_gold.fact_booking_detail;

-- 4. Verify SCD2 history (multiple versions for same entity)
SELECT property_id, is_current, effective_from, effective_to
FROM {lakehouse_default_catalog}.{user_schema_prefix}_gold.dim_property
WHERE property_id = 123
ORDER BY effective_from;

-- 5. Verify non-negotiable table properties
SHOW TBLPROPERTIES {lakehouse_default_catalog}.{user_schema_prefix}_gold.dim_property;
-- Look for: delta.enableChangeDataFeed=true, delta.enableRowTracking=true,
--           delta.autoOptimize.autoCompact=true, layer=gold

-- 6. Verify SCD2: exactly one is_current=true per business key
SELECT property_id, COUNT(*) as current_versions
FROM {lakehouse_default_catalog}.{user_schema_prefix}_gold.dim_property
WHERE is_current = true
GROUP BY property_id
HAVING COUNT(*) > 1;
-- Expected: ZERO rows (any results = SCD2 bug)

-- 7. Verify fact-dimension joins work (no orphan records)
SELECT 
    f.booking_id,
    p.property_name,
    h.host_name,
    f.total_amount
FROM {lakehouse_default_catalog}.{user_schema_prefix}_gold.fact_booking_detail f
JOIN {lakehouse_default_catalog}.{user_schema_prefix}_gold.dim_property p 
    ON f.property_id = p.property_id AND p.is_current = true
JOIN {lakehouse_default_catalog}.{user_schema_prefix}_gold.dim_host h 
    ON f.host_id = h.host_id AND h.is_current = true
LIMIT 10;
```

---

### ✅ Success Criteria Checklist

**Bundle Deployment:**
- [ ] `databricks bundle validate -t dev` passes (no errors)
- [ ] `databricks bundle deploy -t dev` completes
- [ ] 2 jobs appear in Workflows UI (`gold_setup_job`, `gold_merge_job`)
- [ ] YAML files synced to workspace (verify `gold_layer_design/yaml/` exists)
- [ ] PyYAML dependency present in job environment (`pyyaml>=6.0`)

**Gold Setup Job (2 tasks):**
- [ ] Task 1: All 5 tables created from YAML (no hardcoded DDL)
- [ ] Primary keys added to dimension tables (via `ALTER TABLE`)
- [ ] Task 2: Foreign key constraints attempted (runs after Task 1 via `depends_on`) — some may be skipped in serverless if they reference non-PK columns
- [ ] FK constraint script completes without crashing (warnings OK, errors not OK)
- [ ] PK constraints visible in `information_schema.table_constraints` (FK constraints may be partial)

**Table Properties (non-negotiable):**
- [ ] `CLUSTER BY AUTO` on every table (never specific columns)
- [ ] `delta.enableChangeDataFeed = true` (required for incremental propagation)
- [ ] `delta.enableRowTracking = true` (required for downstream MV refresh)
- [ ] `delta.autoOptimize.autoCompact = true`
- [ ] `delta.autoOptimize.optimizeWrite = true`
- [ ] `layer = gold` in TBLPROPERTIES

**Gold Merge Job:**
- [ ] Dimensions merged BEFORE facts (FK dependency order)
- [ ] Every MERGE deduplicates Silver first (key from YAML `business_key`)
- [ ] Column mappings extracted from YAML/`COLUMN_LINEAGE.csv` (not hardcoded)
- [ ] No variable names shadow PySpark functions (`count`, `sum`, etc.)
- [ ] Row counts match expectations
- [ ] SCD2 dimensions: exactly one `is_current = true` per business key
- [ ] Fact-to-dimension joins resolve correctly (no orphan records)

**Job Configuration:**
- [ ] Jobs use `notebook_task` (never `python_task`)
- [ ] Parameters use `base_parameters` dict (never CLI-style `parameters`)
- [ ] Serverless: `environments` block with `environment_version: "4"`
- [ ] Tags applied: `environment`, `layer=gold`, `job_type`

</details>

#### Fork — `coding_assistant = genie-code`  (input_id 904)

> Fork rows override only `input_template`, `system_prompt`, and `bypass_llm`. All display fields are inherited from the default row above.

| Field | Value |
|-------|-------|
| `input_id` | `904` |
| `section_tag` | `gold_layer_pipeline` |
| `order_number` | `(inherited)` |
| `coding_assistant` | `genie-code` |
| `bypass_llm` | `true` |

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Build the Gold layer — author and deploy the YAML-driven dimensional pipeline on top of Silver. Before this step there is no Gold layer; after it, the Gold bundle is authored under `<DP_BUNDLE_ROOT>`, deployed, and the Gold tables are live.

This will involve the following steps:

- **Load the skills** — full `skill_ref_root`-prefixed paths.
- **Pin the Silver column inventory** — read-only, to ground the joins.
- **Author the Gold bundle** — the YAML-driven 2-job architecture.
- **Write and deploy** — write the bundle files to `<DP_BUNDLE_ROOT>`, then deploy and run it from the bundle-editor page.

The steps below are the prescriptive runbook for those actions; follow them in order.

**Genie Code — this is a prescriptive runbook. Follow the steps in order. Do NOT improvise paths, do NOT use bare relative paths, do NOT use `@`-mentions, and do NOT create tables, constraints, or merges by hand. Every skill is named by its full `skill_ref_root`-prefixed path; every artifact is anchored to `<DP_BUNDLE_ROOT>`; every Gold table, PK, FK, and MERGE is created by a deployed bundle job — never by direct SQL.**

### 🔴 Non-negotiable execution rule (read before anything)

❌ **NEVER** run `CREATE SCHEMA` / `CREATE TABLE` / `ALTER TABLE … ADD CONSTRAINT` (PK or FK) / `MERGE` / any data-loading statement directly via `executeCode` / `spark.sql` / a notebook cell. Those statements are the **body of the bundle's jobs** (`gold_setup_job`, `gold_merge_job`). The bundle **is** the execution mechanism — never bypass it, even though direct SQL is faster. Creating live tables/constraints with no versioned bundle behind them is the regression this fork exists to prevent.

❌ **NEVER load Gold data with a full-table replace.** `merge_gold_tables.py` MUST use Delta `MERGE` (`whenMatchedUpdateAll` / `whenNotMatchedInsertAll`) into the EXISTING table. `.write.mode("overwrite").option("overwriteSchema","true").saveAsTable(...)`, `.saveAsTable(..., mode="overwrite")`, `CREATE OR REPLACE TABLE … AS SELECT`, and any other full-table replace are **FORBIDDEN** — an overwrite silently WIPES the PRIMARY KEY / FOREIGN KEY / NOT NULL constraints, `CLUSTER BY`, and `TBLPROPERTIES` (CDF, row-tracking) that `gold_setup_job` created. Merge into the table `gold_setup_job` built; never recreate or replace it. (This was a live regression: a `saveAsTable` overwrite passed "tables exist" but dropped every constraint.)

✅ The ONLY things you run directly are (a) **read-only** inspection (`SHOW TABLES`, `SHOW CONSTRAINTS`, `DESCRIBE`, `SELECT … FROM information_schema …`, `SELECT COUNT(*)`) and (b) `databricks bundle validate` / `deploy` / `run` through `runDatabricksCli`. If `bundle deploy` is blocked, FIX the page context (open the bundle editor — Step 3) — do **not** fall back to direct SQL, the Jobs REST API, or the SDK.

### Step 0 — Resolve your environment (once, before anything else)

Run `skills/vibecoding-state` operation `enter` with `prompt_id: "gold_layer_pipeline"` and `require_prior_gate: {prompt_id: "silver_layer_sdp", gate: "Silver layer live"}`. It writes and echoes the `## Environment Capabilities` block. Read these resolved values and use them literally throughout:

- `client_context` = `genie_code`
- `artifact_root` = your workshop project root (e.g. `/Workspace/Users/<your-email>/vibe-coding-workshop`) — where all generated bundles/apps/docs build; the repo itself is cloned at `/Workspace/Users/<your-email>/.assistant/skills/vibe-coding-workshop` (skills load from there via `skill_ref_root`, NOT from `artifact_root`)
- `skill_ref_root` = `skills/vibe-coding-workshop` (substitute your clone folder if you cloned somewhere other than `.assistant/skills/vibe-coding-workshop`)
- `dp_bundle_root` = `<artifact_root>/{user_schema_prefix}_{use_case_slug}_dab` — the **SAME self-contained Asset Bundle** you built for Bronze + Silver (e.g. `…/vibe-coding-workshop/{user_schema_prefix}_booking_app_dab`). EXTEND it; do NOT make a new one. `databricks.yml`, `src/`, and `resources/` live here, and it is the **page you deploy from**. Referred to below as `<DP_BUNDLE_ROOT>`. Your Gold design YAML (from step 9) lives at `<DP_BUNDLE_ROOT>/gold_layer_design/yaml/` — read it from there.
- deploy verb = `bundle deploy --target dev`, run through the `runDatabricksCli` tool

If `enter` reports the Silver gate is not `Silver layer live`, STOP — finish the Silver step first. If `enter` has not run in this thread, run it now.

**On resume after a context reset:** trust the live state file over any chat summary — a prompt whose state entry shows its gate PASSED is DONE (do NOT re-run it), and before re-writing files reconcile what is already on disk with `os.listdir(...)` (NOT `listFiles`, which lags FUSE writes) against the state file's captured paths, so you resume rather than recreate.

### Step 1 — Load the required skills by their FULL `skill_ref_root`-prefixed paths

Load each skill with `readSkillFile` using its fully-qualified `<skill_ref_root>`-prefixed path — NEVER a bare `@…` mention, NEVER a repo-relative path. **The root-level `skills/` come FIRST: they are the highest-priority, always-on guardrails and govern everything below.** Skills load in two tiers to keep context lean without weakening the preflight-ack gate.

**Tier A — read in FULL now (one batched `readSkillFile` turn) and acknowledge.** These are the guardrails used while authoring in Step 2:

1. `readSkillFile("skills/vibe-coding-workshop/skills/databricks-expert-agent/SKILL.md")` — core rule: extract every table/column/PK/FK from the YAML, never hardcode or hallucinate ("Extract, Don't Generate").
2. `readSkillFile("skills/vibe-coding-workshop/skills/databricks-asset-bundles/SKILL.md")` — 2-job YAML, Environments V4, `notebook_task`, `base_parameters`, the **`sync` mapping** for `gold_layer_design/yaml/**` + `pyyaml>=6.0`, and the multi-user `${var.user_prefix}` "Shared Workspace Naming" pattern. **You will not write any `databricks.yml` or job YAML until you have read this.**
3. `readSkillFile("skills/vibe-coding-workshop/data_product_accelerator/skills/gold/01-gold-layer-setup/SKILL.md")` — the orchestrator (YAML-driven setup → PKs → FKs → merge). Follow every `See: references/…` link it names (prefix those with `skill_ref_root` too).
4. `readSkillFile("skills/vibe-coding-workshop/data_product_accelerator/skills/common/databricks-table-properties/SKILL.md")` — Gold TBLPROPERTIES (CDF, `delta.enableRowTracking`, auto-optimize, `CLUSTER BY AUTO`, `layer=gold`), and the no-`DEFAULT`-in-DDL rule. **NEVER write TBLPROPERTIES without reading this.**
5. `readSkillFile("skills/vibe-coding-workshop/data_product_accelerator/skills/common/unity-catalog-constraints/SKILL.md")` — surrogate keys as PKs (NOT NULL), FK via `ALTER TABLE … NOT ENFORCED`, the serverless rule that FKs must target PK columns, and the no-`DEFAULT`-in-DDL rule. **NEVER define PK/FK without reading this.**

**Tier B — acknowledge the inlined one-line rule now; defer the full `readSkillFile` to the phase that uses it.** This only DEFERS the read (the orchestrator's per-phase Pre-Conditions force the full read at the right moment) — it does NOT skip it:

- `skills/vibe-coding-workshop/data_product_accelerator/skills/common/schema-management-patterns/SKILL.md` — rule: `CREATE SCHEMA IF NOT EXISTS` with governance metadata; enable Predictive Optimization via `ALTER SCHEMA ENABLE PREDICTIVE OPTIMIZATION` (NOT TBLPROPERTIES); schemas are NOT bundle resources. Full read when you create the Gold schema.
- `skills/vibe-coding-workshop/data_product_accelerator/skills/common/naming-tagging-standards/SKILL.md` — rule: snake_case, `dim_`/`fact_` prefixes, dual-purpose COMMENTs on every table/column, governed `class.*` PII tags inferred from column names. Full read when you name tables / write TBLPROPERTIES.
- `skills/vibe-coding-workshop/data_product_accelerator/skills/common/databricks-python-imports/SKILL.md` — rule: shared-config module is PURE Python (no notebook header); use the `rsplit` path pattern, import by module name, no `sys.path` hacks. Full read when you write the shared module.

When the orchestrator lists further **Mandatory Skill Dependencies**, load EACH the same way: take its repo-relative path and prefix it with `skill_ref_root`. Genie Code has no repo-root-relative resolution and `AGENTS.md` does not carry across threads — so always prefix with `skill_ref_root`. **Read independent Tier-A skills in one batched `readSkillFile` turn — Genie Code reads multiple skill files in parallel in a single turn, so never serialize independent reads (`genie-code-environment` §10).**

**🔴 Preflight acknowledgement (hard gate — do this BEFORE writing any file).** Echo a one-line acknowledgement for EVERY skill above — **both tiers**: for Tier A, the rule you took from the full read; for Tier B, the inlined rule above plus the phase at which you will full-read it. If you cannot state a Tier-A skill's rule, you have not actually read it — STOP and read it before writing anything. Do not author `databricks.yml`, job/pipeline YAML, notebooks, or any artifact until every listed skill (both tiers) is acknowledged — silently skipping a skill is the regression this preflight exists to prevent.

### Step 1.5 — Pin the Silver column inventory (read-only hard gate — do this BEFORE writing `merge_gold_tables.py`)

🔴 **Silver→Gold column mappings come ONLY from the live Silver schema + the Gold YAML — never from memory.** Before authoring `merge_gold_tables.py`, run `DESCRIBE TABLE {lakehouse_default_catalog}.{user_schema_prefix}_silver.<table>` for every Silver source you will read, and echo the `{table: [column, …]}` map (the **pinned inventory**). Every Silver column referenced in the merge's `SELECT`, dedup `business_key`, and Silver→Gold lineage map MUST use a name from this pinned map AND resolve against the Gold YAML target columns — a Silver column absent from the live `DESCRIBE` is a hard error, not a guess. This pairs with the post-merge `validate_gold` task: pin the inputs up front, validate the outputs after.

### Step 2 — Author the Gold bundle (YAML-driven 2-job architecture). Do NOT execute anything yet.

Using the skills above, AUTHOR (write files only — no execution) the bundle resources whose jobs, when run, will:

- **Read the Gold design YAML as the single source of truth** — extract table names, columns, types, PKs, and FKs from `<DP_BUNDLE_ROOT>/gold_layer_design/yaml/**/*.yaml` (from step 9). Never hardcode or hallucinate schema elements.
- **`gold_setup_job` (2 tasks)** — Task 1 `setup_tables.py`: `CREATE` Gold tables from YAML + add PRIMARY KEYs; Task 2 `add_fk_constraints.py` (`depends_on` Task 1): `ALTER TABLE … ADD FOREIGN KEY … NOT ENFORCED` in dependency order. FKs are added before data because UC constraints are informational, not enforced. 🔴 **No `DEFAULT` column clauses** in `setup_tables.py` DDL — a `DEFAULT <expr>` needs the `allowColumnDefaults` table feature (off by default) and the `CREATE TABLE` fails; declare columns without `DEFAULT` and set values at INSERT/MERGE time (see `common/unity-catalog-constraints` → "Never Use `DEFAULT` Column Clauses in DDL").
- **`gold_merge_job` Task 1 — `merge_gold_tables.py`**: deduplicate Silver on the YAML `business_key`, map Silver→Gold columns from YAML lineage / `COLUMN_LINEAGE.csv`, then MERGE dimensions first (SCD1/SCD2) and facts last (FK dependency order). Never name variables `count`/`sum`/`min`/`max` (they shadow PySpark functions).
- **`gold_merge_job` Task 2 — `validate_gold.py`** (`depends_on` the merge task, in the SAME job — do NOT add a third job; keep the proven setup-job / merge-job split): post-merge guardrail that **fails the task** (raise) on any violation, so a green merge that wiped constraints cannot pass. Assert, per Gold table: (a) the PRIMARY KEY constraint is still present (query `information_schema.table_constraints`); (b) declared FOREIGN KEYs are still present; (c) NOT NULL on every surrogate/PK column preserved; (d) `delta.enableChangeDataFeed` + `delta.enableRowTracking` still `true` (the overwrite-wipe tell); (e) each table's row count is `> 0` and within an expected ratio of its Silver source. Keep `gold_setup_job` and `gold_merge_job` as two separate jobs — `validate_gold.py` is a second TASK of the merge job, not a new job.
- **Limit to the 5 core tables** for this exercise: `dim_property` (SCD2), `dim_destination` (SCD1), `dim_user` (SCD2), `dim_host` (SCD2), `fact_booking_detail` (Fact).

🔴 **CRITICAL bundle wiring (without it the jobs cannot find the schemas):** the EXISTING `<DP_BUNDLE_ROOT>/databricks.yml` MUST gain (a) a `sync` rule that includes `gold_layer_design/yaml/**/*.yaml` so the YAML reaches the workspace, and (b) `pyyaml>=6.0` in the job environment. Because the design YAML already lives under `<DP_BUNDLE_ROOT>/gold_layer_design/`, the sync path is relative and in place.

IMPORTANT: Use the EXISTING catalog `{lakehouse_default_catalog}` — do NOT create a new catalog. `{lakehouse_default_catalog}` was resolved and persisted by the Bronze step (its Step 0.5 hard-stop) — read it from `## Environment Capabilities`; **never create a catalog and do not re-prompt for it.** The job creates the Gold schema `{user_schema_prefix}_gold` and all Gold tables inside this catalog.

NOTE: The setup job checks whether `{lakehouse_default_catalog}.{user_schema_prefix}_gold` already exists and, if so, DROPs it with CASCADE and recreates it (user-specific schema — safe to drop). This DROP/CREATE runs INSIDE the job, not as a direct statement you execute.

NOTE: This is a shared workshop workspace. Put a `user_prefix` variable in every job `name:` field (e.g. `"[${bundle.target} ${var.user_prefix}] Gold Setup Job"`) to avoid name collisions — `bundle deploy --force` does NOT resolve these (see `databricks-asset-bundles` → "Shared Workspace Naming").

### Step 3 — Write bundle files to `<DP_BUNDLE_ROOT>`, then deploy FROM that page

- Write every generated file UNDER `<DP_BUNDLE_ROOT>` — never the project root (writing at the project root is the "one level too high" bug), never `/tmp`, never a bare relative path (Genie Code's CWD is page-type-dependent):
  - `<DP_BUNDLE_ROOT>/src/{user_schema_prefix}_gold/` — `setup_tables.py`, `add_fk_constraints.py`, `merge_gold_tables.py`, `validate_gold.py`
  - `<DP_BUNDLE_ROOT>/resources/gold/gold_setup_job.yml` and `<DP_BUNDLE_ROOT>/resources/gold/gold_merge_job.yml` (the merge job has two tasks: `merge` then `validate_gold` via `depends_on`)
  - extend the EXISTING `<DP_BUNDLE_ROOT>/databricks.yml` (the one from Bronze + Silver) — add the Gold resources AND the `gold_layer_design/yaml/**` sync rule + `pyyaml>=6.0`
- **`notebook_path` depth reminder:** each `notebook_task.notebook_path` in `resources/gold/*.yml` is resolved **relative to that resource YAML file**, so from `resources/gold/` back to the source it is `../../src/{user_schema_prefix}_gold/<file>` (TWO levels up). A wrong depth is the classic "notebook not found" deploy failure — count the `../` from `resources/gold/`, not from the bundle root.
- **Confirm `targets.dev.presets.source_linked_deployment: false` is present** in the inherited `databricks.yml` (Bronze set it). If absent, add it — never enable source-linked deployment; it breaks file-backed `notebook_task` sources.
- **Open the bundle editor BEFORE any `bundle` command — and surface its link.** `<DP_BUNDLE_ROOT>/databricks.yml` already exists (from Bronze + Silver), so the workspace file browser shows the **"Open in bundle editor"** affordance on that folder (and an **"Open in editor"** button at the top). Its page CWD IS `<DP_BUNDLE_ROOT>` — the bundle-root page `bundle deploy`/`run` require, where Genie Code runs deploy/run pre-approved. **Do not make the operator hunt for the icon** — build a clickable link with the pre-authenticated `WorkspaceClient` (`w`) and print it:
  - `host = w.config.host`; `o = w.get_workspace_id()`
  - `file_id = w.workspace.get_status("<DP_BUNDLE_ROOT>/databricks.yml").object_id`
  - `folder_id = w.workspace.get_status("<DP_BUNDLE_ROOT>").object_id`
  - **Bundle editor:** `{host}/editor/files/{file_id}?o={o}&contextId=folder%3A{folder_id}` (plain folder: `{host}/browse/folders/{folder_id}?o={o}`)

  Tell the operator to open the **bundle-editor link**, then run every `databricks bundle …` command below from that page. Edit the EXISTING on-page `databricks.yml` — files created via the workspace API may not reach the CLI's FUSE mount.
- **File-write tiers + verify writes (Genie Code — see `genie-code-environment` §10).** Once compute is warm, write each file with `executeCode` `open(path,"w").write(...)` (one call per file; make the FIRST `executeCode` a trivial `print("ready")` to absorb the ~3–5 min serverless cold start, and never set `timeoutMinutes` below 15). The compute-free `createAsset` → `readFile` → `workspaceUpdateFile` trio also works, but `workspaceUpdateFile` only updates a file that already exists AND was read this thread — reserve it for editing the on-page `databricks.yml`. 🔴 **Verify every write with `os.path.exists(path)` (or `os.listdir(dir)`) in the SAME `executeCode` block — NOT `listFiles`:** the workspace REST API behind `listFiles` lags FUSE-written files (a live run saw `listFiles`=7 while `os.listdir`=12), so `listFiles` returns false "missing-file" negatives and you waste turns recreating files that already exist.
- Validate → deploy → run the setup job FIRST → run the merge job through `runDatabricksCli`, **from the bundle-editor page**, each with `--target dev` (mandatory — a target-less deploy is guardrail-blocked):
  - `databricks bundle validate --target dev`
  - `databricks bundle deploy --target dev`
  - `databricks bundle run --target dev gold_setup_job`  ← **must run first** (Task 1 creates tables + PKs, Task 2 adds FKs via `depends_on`)
  - `databricks bundle run --target dev gold_merge_job`  ← runs `merge_gold_tables.py` THEN `validate_gold.py` (`depends_on`); if `validate_gold` fails, the constraints were wiped — fix `merge_gold_tables.py` to use Delta `MERGE` (not `saveAsTable`) and redeploy
- **🛑 If a `bundle` command is blocked or fails, STOP — do not work around it.** A `databricks.yml not found` error or a "blocked by safety guardrails" message means you are NOT on the bundle page: open the **bundle-editor link** above and retry (CONFIRMED — the same `bundle deploy`/`run` that is "blocked" from a file page succeeds from the bundle editor). If it STILL fails from the bundle editor, STOP and report the blocker. Do **NOT** create the jobs, tables, constraints, or merges via the Jobs/Pipelines REST API (`jobs/create`, `/api/2.0/pipelines`), the SDK, or direct SQL to "get it done" — that silently defeats the bundle (no version control, no `bundle destroy` cleanup) and FAILS the gate. The REST/SDK route is an **escape hatch available only if the operator explicitly authorizes it.**

**State-lock:** this prompt runs between an `enter` (Step 0) and an `exit`. After the gate passes, run `skills/vibecoding-state` op `exit` — params: `prompt_id: "gold_layer_pipeline"`, `gate: "Gold layer live"`, `captured: {gold_schema, gold_setup_job, gold_merge_job}`. **This `enter`/`exit` pair is a mandatory ritual, not advisory.** Step 0's `enter` MUST locate — or, if this is the first prompt of the track, bootstrap-create — the canonical live state file at `<dp_bundle_root>/.vibecoding-state.md` (never the temporary `example/…` bootstrap path). The closing `exit` MUST append this prompt's Per-Step Log entry, Gate result, and `captured` vars to that file, then **re-read it and echo the appended section to prove the write landed**. **Gate completion rule:** this prompt is NOT complete until that re-read confirms the appended entry — the chat summary is NOT the state store.

**Gate:** `Gold layer live` — `gold_setup_job` (both tasks) and `gold_merge_job` (both tasks — `merge` then `validate_gold`) were **created by `bundle deploy` and executed by `bundle run`** (the setup job ran first and the merge job populated data), the `validate_gold` task PASSED (PKs/FKs/NOT NULL/CDF/row-tracking all still present after the merge — i.e. data was loaded by `MERGE`, never a `saveAsTable` overwrite), AND the 5 Gold tables exist in `{lakehouse_default_catalog}.{user_schema_prefix}_gold` with PRIMARY KEY constraints present (FK constraints may be partial in serverless — that is expected). Tables existing is **necessary but NOT sufficient** — if anything was created by direct SQL instead of the deployed bundle, or `validate_gold` reports wiped constraints, the gate FAILS and you must redo it via the bundle.
```

---

## Deploy Lakehouse Assets (Bronze → Silver → Gold)

| Field | Value |
|-------|-------|
| `input_id` | `116` |
| `section_tag` | `deploy_lakehouse_assets` |
| `order_number` | `23` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Validate, deploy, and run all Bronze, Silver, and Gold layer jobs in dependency order using Asset Bundles with autonomous operations_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

````
Deploy and run all Bronze, Silver, and Gold layer jobs end-to-end using @data_product_accelerator/skills/common/databricks-asset-bundles/SKILL.md and @data_product_accelerator/skills/common/databricks-autonomous-operations/SKILL.md

This is a **deployment checkpoint** — it validates and runs the complete Lakehouse pipeline in dependency order.

**Bundle root:** Run every `bundle` command from the SAME data-product bundle folder the Lakehouse steps built — its dedicated top-level directory `{user_schema_prefix}_{use_case_slug}_dab/` at the repo root (`dp_bundle_root`). `databricks.yml`, `src/`, and `resources/` all live UNDER `{user_schema_prefix}_{use_case_slug}_dab/`; `cd` there before deploying (on Genie Code, be on that folder's bundle-editor page). Same folder on every coding agent.

## Deployment Order (Mandatory)

Run these commands in strict sequence — each stage depends on the previous one:

> **Client note:** IDE runs these in a terminal; Genie Code runs the `databricks bundle …` commands via `runDatabricksCli` (be on the bundle's page; resolved channel in `## Environment Capabilities`). See `genie-code-environment`.

```bash
# 1. Validate the bundle (catches config errors before deploy)
databricks bundle validate -t dev

# 2. Deploy all assets to workspace
databricks bundle deploy -t dev

# 3. Run Bronze clone job (creates Bronze tables from source)
databricks bundle run -t dev bronze_clone_job

# 4. Run Silver DQ setup job FIRST (creates dq_rules table — must exist before pipeline)
databricks bundle run -t dev silver_dq_setup_job

# 5. Run Silver DLT pipeline (reads from Bronze via CDF, applies DQ rules)
databricks bundle run -t dev silver_dlt_pipeline

# 6. Run Gold setup job (creates tables from YAML + adds PK/FK constraints)
databricks bundle run -t dev gold_setup_job

# 7. Run Gold merge job (deduplicates Silver → merges into Gold)
databricks bundle run -t dev gold_merge_job
```

If any job fails, use the autonomous operations skill to diagnose and fix:
- Get the failed task `run_id` (not the parent job `run_id`)
- Run `databricks runs get-run-output --run-id <TASK_RUN_ID>` to diagnose
- Apply fix and redeploy (max 3 iterations before escalation)

## Verification Queries

After all jobs complete successfully, verify end-to-end:

```sql
-- Bronze: verify tables and CDF
SHOW TABLES IN {lakehouse_default_catalog}.{user_schema_prefix}_bronze;

-- Silver: verify DQ rules and cleaned tables
SELECT COUNT(*) FROM {lakehouse_default_catalog}.{user_schema_prefix}_silver.dq_rules;
SHOW TABLES IN {lakehouse_default_catalog}.{user_schema_prefix}_silver;

-- Gold: verify tables, constraints, and row counts
SHOW TABLES IN {lakehouse_default_catalog}.{user_schema_prefix}_gold;
SELECT * FROM {lakehouse_default_catalog}.information_schema.table_constraints
WHERE table_schema = '{user_schema_prefix}_gold';
```

Target catalog: `{lakehouse_default_catalog}`
Target schemas: `{user_schema_prefix}_bronze`, `{user_schema_prefix}_silver`, `{user_schema_prefix}_gold`

**State-lock (`skills/vibecoding-state`) — run this prompt between an `enter` and an `exit` so workshop state is resolved and locked:**

1. **Phase 0 — first, before any step below:** `skills/vibecoding-state` op `enter` — params: `prompt_id: "deploy_lakehouse_assets"`. `enter` resolves the `## Environment Capabilities` triple (deploy verb, CLI channel, `state_file_root`) so every deploy/run step below uses the resolved channel — `runDatabricksCli` on Genie Code — and writes state under `state_file_root`, never a bare-local assumption.
2. **Final — after the step succeeds:** `skills/vibecoding-state` op `exit` — params: `prompt_id: "deploy_lakehouse_assets"`, `gate: "Lakehouse assets deployed"`, `captured: {bronze_schema, silver_schema, gold_schema}`.

**Gate:** `Lakehouse assets deployed` — Bronze, Silver DQ, Silver DLT, Gold setup, and Gold merge all complete end-to-end.
````

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## 1️⃣ How To Apply

Copy the prompt from the **Prompt** tab, start a **new Agent chat** in your coding assistant, paste it, and press Enter.

---

### Prerequisite

**Run this in your cloned Template Repository** (see Prerequisites in Step 0).

Ensure you have:
- ✅ Bronze layer code generated (Step 10): `src/{project}_bronze/`, `resources/bronze/`
- ✅ Silver layer code generated (Step 11): `src/{project}_silver/`, `resources/silver/`
- ✅ Gold layer code generated (Step 12): `src/{project}_gold/`, `resources/gold/`, `gold_layer_design/yaml/`
- ✅ `databricks.yml` bundle configuration file (created/updated in Steps 10-12)
- ✅ Databricks CLI installed and authenticated (`databricks auth login`)

---

### Steps to Apply

**Step 1: Start New Agent Thread** — start a new Agent thread in your coding assistant for clean context.

**Step 2: Copy and Paste the Prompt** — Use the copy button, paste it into your coding assistant. The AI reads both the Asset Bundles skill and the Autonomous Operations skill.

**Step 3: Validate** — The AI runs `databricks bundle validate -t dev` to catch config errors before deploying.

**Step 4: Deploy** — The AI runs `databricks bundle deploy -t dev` to push all assets to your workspace.

**Step 5: Run Jobs in Dependency Order** — The AI runs each job in sequence:

```
Bronze clone job
    ↓
Silver DQ setup job (creates dq_rules table)
    ↓
Silver DLT pipeline (reads Bronze via CDF)
    ↓
Gold setup job (2 tasks: create tables → add FK constraints)
    ↓
Gold merge job (dedup Silver → merge into Gold)
```

**Step 6: Diagnose Failures (if any)** — If a job fails, the autonomous operations skill kicks in:
1. Get failed task `run_id` from the job run
2. Run `databricks runs get-run-output --run-id <TASK_RUN_ID>`
3. Match error against known patterns, apply fix, redeploy
4. Max 3 iterations before escalation

**Step 7: Verify End-to-End** — Run the verification queries to confirm all layers are populated.

---

## 2️⃣ What Are We Building?

This is a **deployment checkpoint** that validates the entire Lakehouse pipeline works end-to-end before moving to the Data Intelligence layer.

### Asset Bundle Structure (Built in Steps 10-12)

```
{user_schema_prefix}_{use_case_slug}_dab/                     # data-product bundle root (dp_bundle_root) — the one folder all layers share
├── databricks.yml                        # Bundle configuration (all layers)
├── src/
│   ├── {project}_bronze/                # Bronze notebooks (clone/generate)
│   │   └── clone_samples.py
│   ├── {project}_silver/                # Silver notebooks (DLT + DQ)
│   │   ├── setup_dq_rules_table.py
│   │   ├── dq_rules_loader.py           # Pure Python (NO notebook header)
│   │   ├── silver_dimensions.py
│   │   ├── silver_facts.py
│   │   └── data_quality_monitoring.py
│   └── {project}_gold/                   # Gold notebooks (YAML-driven)
│       ├── setup_tables.py
│       ├── add_fk_constraints.py
│       └── merge_gold_tables.py
├── resources/
│   ├── bronze/
│   │   └── bronze_clone_job.yml
│   ├── silver/
│   │   ├── silver_dq_setup_job.yml
│   │   └── silver_dlt_pipeline.yml
│   └── gold/
│       ├── gold_setup_job.yml
│       └── gold_merge_job.yml
└── gold_layer_design/yaml/               # YAML schemas (synced to workspace)
```

### Deployment Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LAKEHOUSE DEPLOYMENT CHECKPOINT                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Step 1: VALIDATE                                                           │
│  databricks bundle validate -t dev                                          │
│         ↓                                                                   │
│  Step 2: DEPLOY                                                             │
│  databricks bundle deploy -t dev                                            │
│         ↓                                                                   │
│  Step 3: RUN IN ORDER                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐     │
│  │   Bronze    │→ │ Silver DQ    │→ │ Silver DLT  │→ │  Gold Setup  │     │
│  │  clone_job  │  │ setup_job    │  │  pipeline   │  │  (2 tasks)   │     │
│  └─────────────┘  └──────────────┘  └─────────────┘  └──────┬───────┘     │
│                                                              ↓              │
│                                                      ┌──────────────┐      │
│                                                      │  Gold Merge  │      │
│                                                      │    job       │      │
│                                                      └──────────────┘      │
│         ↓                                                                   │
│  Step 4: VERIFY                                                             │
│  SHOW TABLES / row counts / constraints / CDF checks                       │
│                                                                             │
│  ON FAILURE → Autonomous Operations (diagnose → fix → redeploy, max 3x)   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It''s Used Here |
|----------|-------------------|
| **Asset Bundles** | Single `databricks.yml` manages all notebooks, pipelines, and jobs as a versioned, deployable unit |
| **Serverless Compute** | Every job uses `environments` with `environment_version: "4"` — no cluster management |
| **Dependency-Ordered Execution** | Bronze → Silver DQ → Silver DLT → Gold Setup → Gold Merge — each stage depends on the previous |
| **Autonomous Operations** | Deploy → Poll → Diagnose → Fix → Redeploy loop with max 3 iterations before escalation |
| **Idempotent Deploys** | `databricks bundle deploy` is safe to run multiple times — no duplicates |
| **Task-Level Diagnostics** | Failed task `run_id` (not parent job `run_id`) used for `get-run-output` — provides actionable error details |
| **notebook_task** | All jobs use `notebook_task` (never `python_task`) with `base_parameters` dict (never CLI-style `parameters`) |
| **Environment Separation** | Bundle targets (`-t dev`, `-t staging`, `-t prod`) for multi-environment deployments from the same config |

---

## 4️⃣ What Happens Behind the Scenes?

When you paste the prompt, the AI reads two skills:

1. **`@data_product_accelerator/skills/common/databricks-asset-bundles/SKILL.md`** — validates bundle structure, ensures serverless environments, proper task types, and parameter patterns
2. **`@data_product_accelerator/skills/common/databricks-autonomous-operations/SKILL.md`** — provides the deploy-poll-diagnose-fix loop for self-healing when jobs fail

The autonomous operations skill follows this protocol:
1. Run `databricks bundle run` and capture the RUN_ID from the output URL
2. Poll with exponential backoff (30s → 60s → 120s) until terminal state
3. On SUCCESS: verify all tasks completed, report run URL
4. On FAILURE: get failed task `run_id`, run `get-run-output`, match error pattern, apply fix
5. Redeploy and re-run (max 3 iterations before escalation with full error context)

</details>

<details><summary><strong>Expected Output</strong></summary>

## Expected Deliverables

### ✅ Deployment Verification

**Bundle:**
- [ ] `databricks bundle validate -t dev` passes with no errors
- [ ] `databricks bundle deploy -t dev` completes successfully
- [ ] All 5 jobs appear in Databricks Workflows UI

**Bronze Layer:**
- [ ] `bronze_clone_job` completes successfully
- [ ] All tables visible in `{lakehouse_default_catalog}.{user_schema_prefix}_bronze`
- [ ] CDF enabled on all Bronze tables (`delta.enableChangeDataFeed = true`)

**Silver Layer:**
- [ ] `silver_dq_setup_job` creates `dq_rules` table in Silver schema
- [ ] `silver_dlt_pipeline` completes with Expectations evaluated
- [ ] Silver tables populated with cleaned data
- [ ] Row tracking enabled (`delta.enableRowTracking = true`)

**Gold Layer:**
- [ ] `gold_setup_job` creates all Gold tables with PK constraints (Task 1) and FK constraints (Task 2)
- [ ] `gold_merge_job` populates Gold tables from Silver
- [ ] PK/FK constraints visible in `information_schema.table_constraints`
- [ ] Fact-to-dimension joins resolve correctly (no orphan records)

**End-to-End:**
- [ ] Data flows from Bronze → Silver → Gold without errors
- [ ] Row counts are reasonable across all layers
- [ ] Ready for Data Intelligence layer (Genie, Dashboards)

</details>

#### Fork — `coding_assistant = genie-code`  (input_id 905)

> Fork rows override only `input_template`, `system_prompt`, and `bypass_llm`. All display fields are inherited from the default row above.

| Field | Value |
|-------|-------|
| `input_id` | `905` |
| `section_tag` | `deploy_lakehouse_assets` |
| `order_number` | `(inherited)` |
| `coding_assistant` | `genie-code` |
| `bypass_llm` | `true` |

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Deploy and run the whole medallion pipeline from the bundle editor, then verify end-to-end. Before this step the bundles are authored but not run together; after it, the lakehouse assets are deployed, the jobs have run, and the layers are verified.

This will involve the following steps:

- **Load the skills** — full `skill_ref_root`-prefixed paths.
- **Deploy and run the pipeline** — from the bundle-editor page.
- **Verify end-to-end** — read-only.

The steps below are the prescriptive runbook for those actions; follow them in order.

**Genie Code — this is a prescriptive runbook. Follow the steps in order. Do NOT improvise paths, do NOT use bare relative paths, do NOT use `@`-mentions, and do NOT create or repair tables/jobs by hand. This is an end-to-end DEPLOY + RUN checkpoint for the bundle you already authored in steps 10–12: every job runs via the deployed bundle, from the bundle-editor page — never by direct SQL, the REST API, or the SDK.**

### 🔴 Non-negotiable execution rule (read before anything)

❌ **NEVER** create/repair tables, schemas, jobs, or pipelines directly via `executeCode` / `spark.sql` / `jobs/create` / `/api/2.0/pipelines` / the SDK / a notebook cell. The five jobs (`bronze_clone_job`, `silver_dq_setup_job`, `silver_dlt_pipeline`, `gold_setup_job`, `gold_merge_job`) ALREADY exist as resources in the bundle's `databricks.yml`. The bundle **is** the execution mechanism — you only `validate` / `deploy` / `run` it.

✅ The ONLY things you run directly are (a) **read-only** inspection (`SHOW TABLES`, `SHOW CONSTRAINTS`, `DESCRIBE`, `SELECT … FROM information_schema …`, `SELECT COUNT(*)`) and (b) `databricks bundle validate` / `deploy` / `run` through `runDatabricksCli`. If a `bundle` command is blocked, FIX the page context (open the bundle editor — Step 2) — do **not** fall back to direct SQL, the Jobs/Pipelines REST API, or the SDK.

### Step 0 — Resolve your environment (once, before anything else)

Run `skills/vibecoding-state` operation `enter` with `prompt_id: "deploy_lakehouse_assets"`. It writes and echoes the `## Environment Capabilities` block. Read these resolved values and use them literally throughout:

- `client_context` = `genie_code`
- `artifact_root` = your workshop project root (e.g. `/Workspace/Users/<your-email>/vibe-coding-workshop`) — where all generated bundles/apps/docs build; the repo itself is cloned at `/Workspace/Users/<your-email>/.assistant/skills/vibe-coding-workshop` (skills load from there via `skill_ref_root`, NOT from `artifact_root`)
- `skill_ref_root` = `skills/vibe-coding-workshop` (substitute your clone folder if you cloned somewhere other than `.assistant/skills/vibe-coding-workshop`)
- `dp_bundle_root` = `<artifact_root>/{user_schema_prefix}_{use_case_slug}_dab` — the SAME self-contained Asset Bundle you built across Bronze + Silver + Gold (e.g. `…/vibe-coding-workshop/{user_schema_prefix}_booking_app_dab`). Its `databricks.yml` already defines all 5 layer resources. This is the **page you deploy from**. Referred to below as `<DP_BUNDLE_ROOT>`.
- deploy verb = `bundle deploy --target dev`, run through the `runDatabricksCli` tool

**Precondition:** `<DP_BUNDLE_ROOT>/databricks.yml` must already define `bronze_clone_job`, `silver_dq_setup_job`, `silver_dlt_pipeline`, `gold_setup_job`, and `gold_merge_job` (authored in steps 10–12). If a resource is missing, STOP and go back to the layer step that creates it — do NOT hand-create it here. If `enter` has not run in this thread, run it now.

**Catalog:** `{lakehouse_default_catalog}` was resolved and persisted by the Bronze step (its Step 0.5 hard-stop) — read it from `## Environment Capabilities`; **never create a catalog and do not re-prompt for it.** This step only deploys + runs the jobs that populate schemas inside that existing catalog.

### Step 1 — Load the required skills by their FULL `skill_ref_root`-prefixed paths

Load each skill with `readSkillFile` using its fully-qualified `<skill_ref_root>`-prefixed path — NEVER a bare `@…` mention, NEVER a repo-relative path. **The root-level `skills/` come FIRST: they are the highest-priority, always-on guardrails and govern everything below.**

1. `readSkillFile("skills/vibe-coding-workshop/skills/databricks-expert-agent/SKILL.md")` — core operating rules.
2. `readSkillFile("skills/vibe-coding-workshop/skills/databricks-asset-bundles/SKILL.md")` — `bundle validate`/`deploy`/`run` semantics, `--target dev`, and the multi-user `${var.user_prefix}` "Shared Workspace Naming" pattern.

Then the autonomous-operations worker (for the diagnose → fix → redeploy loop):

3. `readSkillFile("skills/vibe-coding-workshop/data_product_accelerator/skills/common/databricks-autonomous-operations/SKILL.md")` — the deploy → poll → diagnose → fix → redeploy protocol for job failures. **NEVER hand-patch a live job; fix the bundle source and redeploy.**

When any skill lists further **Mandatory Skill Dependencies**, load EACH the same way: take its repo-relative path and prefix it with `skill_ref_root`. Genie Code has no repo-root-relative resolution and `AGENTS.md` does not carry across threads — so always prefix with `skill_ref_root`. **Read them in one batched `readSkillFile` turn — Genie Code reads multiple skill files in parallel in a single turn, so never serialize independent reads (`genie-code-environment` §10).**

**🔴 Preflight acknowledgement (hard gate — do this BEFORE writing any file).** After the batched `readSkillFile` returns, echo a one-line acknowledgement for EACH skill you loaded — its full `<skill_ref_root>`-prefixed path + the single rule you will apply from it. If you cannot state the rule, you have not actually read the skill — STOP and read it before writing anything. Do not author `databricks.yml`, job/pipeline YAML, notebooks, or any artifact until every listed skill is acknowledged — silently skipping a skill read is the regression this preflight exists to prevent.

### Step 2 — Deploy and run the whole pipeline FROM the bundle editor

- **Open the bundle editor BEFORE any `bundle` command — and surface its link.** `<DP_BUNDLE_ROOT>/databricks.yml` already exists, so the workspace file browser shows the **"Open in bundle editor"** affordance on that folder (and an **"Open in editor"** button at the top). Its page CWD IS `<DP_BUNDLE_ROOT>` — the bundle-root page `bundle deploy`/`run` require, where Genie Code runs deploy/run pre-approved. **Do not make the operator hunt for the icon** — build a clickable link with the pre-authenticated `WorkspaceClient` (`w`) and print it:
  - `host = w.config.host`; `o = w.get_workspace_id()`
  - `file_id = w.workspace.get_status("<DP_BUNDLE_ROOT>/databricks.yml").object_id`
  - `folder_id = w.workspace.get_status("<DP_BUNDLE_ROOT>").object_id`
  - **Bundle editor:** `{host}/editor/files/{file_id}?o={o}&contextId=folder%3A{folder_id}` (plain folder: `{host}/browse/folders/{folder_id}?o={o}`)

  Tell the operator to open the **bundle-editor link**, then run every `databricks bundle …` command below from that page.
- **Confirm `targets.dev.presets.source_linked_deployment: false` is present** in the bundle's `databricks.yml` (set by Bronze) — `bundle validate --target dev` must report no source-linked warning. Never enable it; it breaks file-backed `notebook_task` sources.
- Validate → deploy → run all five jobs **in strict dependency order** through `runDatabricksCli`, **from the bundle-editor page**, each with `--target dev` (mandatory — a target-less deploy is guardrail-blocked):
  - `databricks bundle validate --target dev`
  - `databricks bundle deploy --target dev`
  - `databricks bundle run --target dev bronze_clone_job`
  - `databricks bundle run --target dev silver_dq_setup_job`  ← **must run before the DLT pipeline** (creates `dq_rules`)
  - `databricks bundle run --target dev silver_dlt_pipeline`
  - `databricks bundle run --target dev gold_setup_job`  ← 2 tasks: create tables + PKs, then add FKs
  - `databricks bundle run --target dev gold_merge_job`
- **🛑 If a `bundle` command is blocked, STOP — do not work around it.** A `databricks.yml not found` error or a "blocked by safety guardrails" message means you are NOT on the bundle page: open the **bundle-editor link** above and retry (CONFIRMED — the same `bundle deploy`/`run` that is "blocked" from a file page succeeds from the bundle editor). If it STILL fails from the bundle editor, STOP and report the blocker. Do **NOT** create the jobs, pipeline, tables, or merges via the Jobs/Pipelines REST API (`jobs/create`, `/api/2.0/pipelines`), the SDK, or direct SQL to "get it done" — that silently defeats the bundle (no version control, no `bundle destroy` cleanup) and FAILS the gate. The REST/SDK route is an **escape hatch available only if the operator explicitly authorizes it.**
- **If a deployed job FAILS (vs. is blocked), use the autonomous-operations loop — still inside the bundle:** get the failed **task** `run_id` (not the parent job run_id), `databricks runs get-run-output --run-id <TASK_RUN_ID>` to diagnose, fix the offending **bundle source file** under `<DP_BUNDLE_ROOT>`, then `bundle deploy --target dev` + `bundle run …` again (max 3 iterations before escalating). Never patch the live job via the API/UI — fix the source and redeploy.
- **When you rewrite a bundle source file during a fix (Genie Code — see `genie-code-environment` §10):** write it with `executeCode` `open(path,"w").write(...)` (warm compute) or the `createAsset` → `readFile` → `workspaceUpdateFile` trio, and 🔴 **verify the write with `os.path.exists(path)` in the SAME `executeCode` block — NOT `listFiles`** (the workspace REST API behind `listFiles` lags FUSE-written files, so it reports false "missing-file" negatives and you re-create files that already exist).

### Step 3 — Verify end-to-end (read-only)

Use **read-only** `executeCode`/SQL to confirm the deployed jobs produced the data — never to create it:

- `SHOW TABLES IN {lakehouse_default_catalog}.{user_schema_prefix}_bronze;` (and `DESCRIBE EXTENDED` to confirm CDF)
- `SELECT COUNT(*) FROM {lakehouse_default_catalog}.{user_schema_prefix}_silver.dq_rules;` and `SHOW TABLES IN {lakehouse_default_catalog}.{user_schema_prefix}_silver;`
- `SHOW TABLES IN {lakehouse_default_catalog}.{user_schema_prefix}_gold;` and `SELECT * FROM {lakehouse_default_catalog}.information_schema.table_constraints WHERE table_schema = '{user_schema_prefix}_gold';`

**State-lock:** this prompt runs between an `enter` (Step 0) and an `exit`. After the gate passes, run `skills/vibecoding-state` op `exit` — params: `prompt_id: "deploy_lakehouse_assets"`, `gate: "Lakehouse assets deployed"`, `captured: {bronze_schema, silver_schema, gold_schema}`. **This `enter`/`exit` pair is a mandatory ritual, not advisory.** Step 0's `enter` MUST locate — or, if this is the first prompt of the track, bootstrap-create — the canonical live state file at `<dp_bundle_root>/.vibecoding-state.md` (never the temporary `example/…` bootstrap path). The closing `exit` MUST append this prompt's Per-Step Log entry, Gate result, and `captured` vars to that file, then **re-read it and echo the appended section to prove the write landed**. **Gate completion rule:** this prompt is NOT complete until that re-read confirms the appended entry — the chat summary is NOT the state store.

**Gate:** `Lakehouse assets deployed` — all five jobs (`bronze_clone_job`, `silver_dq_setup_job`, `silver_dlt_pipeline`, `gold_setup_job`, `gold_merge_job`) were **deployed by `bundle deploy` and executed by `bundle run`** in dependency order end-to-end, AND the Bronze/Silver/Gold schemas in `{lakehouse_default_catalog}` are populated (`dq_rules` present, Gold PK constraints present). Tables existing is **necessary but NOT sufficient** — if anything was created or repaired by direct SQL / REST API / SDK instead of the deployed bundle, the gate FAILS and you must redo it via the bundle.
```

---
