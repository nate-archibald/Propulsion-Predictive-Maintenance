# Genie / Agent Skills Authoring

Author reusable skills for Genie/agents: install & explore, define strategy, write SKILL.md, apply contracts, and certify tables.

> Auto-generated from `02_seed_section_input_prompts.sql`. Each section below corresponds to one `section_tag` in the workshop builder's `section_input_prompts` table.

## Sections in this category

| Step (order) | Section | `section_tag` | Forks |
|---|---|---|---|
| 26 | [Explore Existing Skills](#explore-existing-skills) | `skill_install_explore` | — |
| 27 | [Define Skill Strategy](#define-skill-strategy) | `skill_define_strategy` | — |
| 28 | [Create SKILL.md](#create-skill-md) | `skill_create_skillmd` | — |
| 29 | [Apply & Test Skill](#apply-test-skill) | `skill_apply_contracts` | — |
| 30 | [Validate & Automate](#validate-automate) | `skill_certify_tables` | — |

---

## Explore Existing Skills

| Field | Value |
|-------|-------|
| `input_id` | `130` |
| `section_tag` | `skill_install_explore` |
| `order_number` | `26` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Navigate the template repo skills and identify the gap your new skill will fill_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

````
## Step 1: Explore Existing Skills in Your Template Repository

Now that you have cloned the workshop template repository (from Step 2), let's explore the existing Agent Skills that ship with it and identify the gap your new skill will fill.

### Your Use Case: {use_case_title}
{use_case_description}

### Navigate to the Skills Directory

Open your cloned repository and explore these two key skills:

```
data_product_accelerator/skills/common/naming-tagging-standards/SKILL.md
data_product_accelerator/skills/admin/create-agent-skill/SKILL.md
```

### What to Look For

**In `naming-tagging-standards/SKILL.md`:**
- How tags are defined (naming conventions, owner, domain)
- The SET TAGS SQL patterns used
- What governance tags are currently covered
- What capabilities are **missing** that your use case requires

**In `create-agent-skill/SKILL.md`:**
- The standard folder structure for new skills (SKILL.md, assets/, references/)
- How instructions are organized as numbered steps
- How references and assets are declared
- The agentskills.io specification patterns

### Identify the Gap

Review the **Measures / Rules** and **Extends** sections from your use case description above. The existing skills provide a foundation, but they do **not** address the specific capabilities your new skill needs.

### Your Target Assets

{gold_table_target}

### Deliverables

After exploring, you should understand:
- [ ] How existing skills are structured (SKILL.md + references/ + assets/)
- [ ] What the existing skills already cover
- [ ] What specific gap your new skill ({use_case_title}) will fill
- [ ] Which target assets (tables, schemas) you will work with
````

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## How to Apply

1. Open your cloned workshop template repository in your coding assistant
2. Navigate to `data_product_accelerator/skills/common/naming-tagging-standards/SKILL.md`
3. Read through the existing tagging patterns and note what governance capabilities exist
4. Navigate to `data_product_accelerator/skills/admin/create-agent-skill/SKILL.md`
5. Study the skill creation template and folder structure
6. Compare what exists against the **Measures / Rules** in your use case description
7. Note which capabilities are missing — this is the gap your new skill will fill
8. Confirm your target assets for use in subsequent steps

</details>

<details><summary><strong>Expected Output</strong></summary>

## Expected Output

After exploring, you should have:

### Understanding Checklist
- [ ] Read `naming-tagging-standards/SKILL.md` and noted existing patterns
- [ ] Read `create-agent-skill/SKILL.md` and understood the skill template structure
- [ ] Identified the specific gap your new skill will address
- [ ] Confirmed your target assets

### Key Observations
- The existing naming-tagging skill uses `ALTER TABLE ... SET TAGS` syntax
- Skills follow a standard structure: SKILL.md + assets/ + references/
- The `create-agent-skill` template provides the scaffolding for new skills
- Your use case describes capabilities not covered by existing skills

</details>

---

## Define Skill Strategy

| Field | Value |
|-------|-------|
| `input_id` | `131` |
| `section_tag` | `skill_define_strategy` |
| `order_number` | `27` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `false` |

_Generate a comprehensive strategy for your Agent Skill based on your use case specification_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Generate a comprehensive **Skill Strategy** document for the **{use_case_title}** skill in a {industry_name} data platform.

## Use Case Specification
{use_case_description}

## Target Assets
{gold_table_target}

## Exploration Findings (from previous step)
{exploration_findings}

## Requirements

Using the **Measures / Rules**, **Validation Approach**, and **Certification Criteria** sections from the use case specification above, generate a complete strategy document that covers:

### 1. Measures & Rules
For each measure/rule defined in the use case specification:
- **Tag key** and **value format** (with examples)
- **Description** of what it enforces
- **Default value** for new assets

### 2. Validation SQL
For each measure, provide a SQL query that validates compliance. The SQL should:
- Query `system.information_schema` or the target asset itself
- Return a boolean pass/fail result
- Be parameterizable for any table/asset name

### 3. Success / Certification Criteria
Define the rules from the use case specification for when an asset is considered compliant:
- Which measures must pass
- Grace periods for newly created assets
- What happens when compliance fails

### 4. Scheduling & Automation Recommendations
- How often should validation run?
- Should it run as a Databricks Job or Lakehouse Monitor?
- Alert/notification strategy for failures

## Output Format
Structure the strategy as a clear, actionable document with sections for each area above. Use code blocks for SQL examples. Tailor all content to the specific use case described above.
```

**System Prompt:**

```
You are an expert in Databricks data governance, Unity Catalog, and data quality best practices. Generate a comprehensive skill strategy based on the provided use case specification. The strategy should define measures as Unity Catalog tags, provide validation SQL for each measure, and specify success/certification criteria. The strategy should be practical, follow Databricks best practices, and be ready to implement as an Agent Skill following the agentskills.io standard.
```

---

## Create SKILL.md

| Field | Value |
|-------|-------|
| `input_id` | `132` |
| `section_tag` | `skill_create_skillmd` |
| `order_number` | `28` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `false` |

_Generate the complete SKILL.md package with references and assets based on your skill strategy_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Generate a complete **Agent Skill package** for **{use_case_title}**, following the agentskills.io SKILL.md standard.

## Use Case Specification
{use_case_description}

## Skill Strategy (from previous step)
{skill_strategy}

## Target Assets
{gold_table_target}

## Requirements

Using the **Skill Identity** and **Skill Artifacts** sections from the use case specification, plus the detailed strategy from the previous step, generate a complete Agent Skill package.

### File 1: `<skill-name>/SKILL.md`

The primary skill file following the agentskills.io standard with:
- **Name**: from the Skill Identity section
- **Description**: One-line summary of what the skill does
- **Triggers**: from the Skill Identity section — when should this skill activate
- **Instructions**: Numbered step-by-step instructions the AI agent should follow, derived from the strategy
- **References**: List any reference files
- **Assets**: List any asset files (configs, templates)

### File 2: `<skill-name>/references/<reference-doc>.md`

A reference document containing:
- Validation or execution patterns (SQL, code, etc.) from the strategy
- Example outputs showing pass/fail or expected results
- Parameterized patterns that work with any target asset name

### File 3: `<skill-name>/assets/<config-file>.yaml`

A YAML configuration file defining:
- All measures/rules with their keys, value formats, and defaults
- Success/certification criteria
- Scheduling or automation defaults
- Asset filter patterns (which tables/objects to include/exclude)

## Output Format
Generate all files with clear file path headers. Use proper markdown for SKILL.md, standard markdown for the reference doc, and valid YAML for the config file. Derive all file names, folder names, and content from the use case specification.
```

**System Prompt:**

```
You are an expert Agent Skills author following the agentskills.io specification. Generate a complete, production-ready Agent Skill package based on the provided use case specification and skill strategy. The SKILL.md must be clear, actionable, and follow the standard structure. All patterns must use real Databricks SQL syntax where applicable. Config files must be valid YAML. Derive the skill name, folder structure, and all content from the use case specification.
```

---

## Apply & Test Skill

| Field | Value |
|-------|-------|
| `input_id` | `133` |
| `section_tag` | `skill_apply_contracts` |
| `order_number` | `29` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Save your generated skill to the project and test it against your target assets_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

````
## Step 4: Apply & Test Your New Skill

Now that you have your complete Agent Skill package (SKILL.md + references + assets), it's time to save it to your project and test it against your target assets.

### Your Use Case: {use_case_title}

### Save the Skill to Your Project

Copy the generated files into your project using the folder structure from the SKILL.md output:

```
data_product_accelerator/skills/common/<your-skill-name>/
├── SKILL.md
├── references/
│   └── <reference-doc>.md
└── assets/
    └── <config-file>.yaml
```

Use the exact file names and folder structure from the previous step's output.

### Test the Skill

Ask your AI assistant to use the new skill against your target assets:

Target: **{gold_table_target}**

**IMPORTANT: These are EXISTING gold-layer tables. Do NOT create new schemas or tables. Your skill should read and apply governance to the tables already in this schema.**

For example, ask:
> "Use the <skill-name> skill to apply [your measures/rules] to the existing tables in my target schema"

### Verify the Results

After the agent executes the skill, verify the results. For Unity Catalog tags:

```sql
SHOW TAGS ON TABLE <catalog>.<schema>.<table_name>;
```

For other asset types, use the verification approach described in your use case specification.

### Deliverables

- [ ] All skill files saved to the correct folder structure
- [ ] Skill applied to at least one target asset
- [ ] Results verified using the appropriate verification method
- [ ] No errors during skill execution
````

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## How to Apply

1. Create the skill folder structure in your project:
   ```
   data_product_accelerator/skills/common/<your-skill-name>/
   ```
2. Save all generated files (SKILL.md, references, assets) from the previous step
3. Open your AI assistant and ask it to use the new skill
4. Review the commands/queries the agent generates
5. Verify the results were applied correctly

</details>

<details><summary><strong>Expected Output</strong></summary>

## Expected Output

### Applied Results
Your target assets should now have the measures/rules applied as defined in your skill strategy.

### Verification
Run the appropriate verification query or check for your use case:
```sql
-- For Unity Catalog tags:
SHOW TAGS ON TABLE <catalog>.<schema>.<table_name>;
```

### File Structure
Confirm your skill folder matches the expected structure from your SKILL.md output.

</details>

---

## Validate & Automate

| Field | Value |
|-------|-------|
| `input_id` | `134` |
| `section_tag` | `skill_certify_tables` |
| `order_number` | `30` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Build a validation notebook and scheduled job to automate compliance checking for your skill_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
## Step 5: Build a Validation & Automation Pipeline

The final step is to automate the validation and compliance workflow for your **{use_case_title}** skill so it runs continuously.

### What to Build

**IMPORTANT: The target assets below are EXISTING gold-layer tables. Do NOT create new schemas or tables. Your validation should query the tables already in this schema.**

Ask your AI assistant to create two files:

#### 1. Validation Notebook: `skill_validator.py`

A Databricks notebook that:
- Lists all target assets ({gold_table_target})
- For each asset, reads its current tags/state via the appropriate method
- Runs the validation checks from your skill's reference document
- Collects pass/fail results for each measure/rule
- Updates the asset's status based on results (e.g., applies or removes compliance tags)
- Outputs a summary report of which assets passed/failed and why

Use the **Validation Approach** and **Certification Criteria** from your use case specification to drive the logic.

#### 2. Job Configuration: `skill_validation_job.yml`

A Databricks Asset Bundle (DAB) job YAML that:
- Runs `skill_validator.py` on a schedule (from the use case specification's scheduling recommendations)
- Uses the default SQL warehouse: `{default_warehouse}`
- Sends email alerts on failure
- Tags the job with a descriptive purpose tag

### Running the Validation

After creating the files:
1. Deploy using `databricks bundle deploy`
2. Run the validation job manually first: `databricks bundle run skill_validation_job`
3. Check the results in the notebook output
4. Verify the compliance status on your target assets

### Deliverables

- [ ] `skill_validator.py` notebook created and tested
- [ ] `skill_validation_job.yml` DAB config created
- [ ] Validation job deployed and run successfully
- [ ] At least one target asset shows the expected compliance status
- [ ] Summary report showing pass/fail results
- [ ] Job scheduled for recurring validation
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## How to Apply

1. Ask your AI assistant to create `skill_validator.py` using the validation patterns from your skill's reference document
2. Ask it to create `skill_validation_job.yml` for scheduled execution
3. Deploy with `databricks bundle deploy`
4. Run the job: `databricks bundle run skill_validation_job`
5. Check the output notebook for validation results
6. Verify the compliance status on your target assets

</details>

<details><summary><strong>Expected Output</strong></summary>

## Expected Output

### Validation Results (example)
```
Asset                    | Measures Pass | Status
-------------------------|---------------|----------
asset_1                  | 6/6           | COMPLIANT
asset_2                  | 6/6           | COMPLIANT
asset_3                  | 5/6           | FAILED
asset_4                  | 6/6           | COMPLIANT
```

### Files Created
- [ ] `skill_validator.py` -- Validation notebook
- [ ] `skill_validation_job.yml` -- DAB job config
- [ ] Job deployed and running on schedule

</details>

---
