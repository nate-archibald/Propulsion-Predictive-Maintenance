# Workshop Section Prompts

Human-readable, categorized export of the workshop builder's **section input prompts**, parsed from `02_seed_section_input_prompts.sql`.

- **93** prompt records total (**62** distinct `section_tag`s, **31** `genie-code` fork variants)
- Organized into **10** category files below

Each record maps to a row in the `section_input_prompts` table. Default rows carry the user-facing fields (`section_title`, `section_description`, `how_to_apply`, `expected_output`); fork rows (e.g. `genie-code`) override only `input_template`, `system_prompt`, and `bypass_llm`.

## Categories

| # | Category | File | Sections |
|---|---|---|---|
| 0 | Foundation — Requirements & PRD | [`00-foundation-prd.md`](00-foundation-prd.md) | 1 |
| 1 | Chapter 1 — Databricks App: UI Design & Deploy | [`01-app-ui-design-and-deploy.md`](01-app-ui-design-and-deploy.md) | 4 |
| 2 | Chapter 2 — Lakebase (OLTP) | [`02-lakebase-oltp.md`](02-lakebase-oltp.md) | 3 |
| 3 | Chapter 3 — Lakehouse (Bronze / Silver / Gold) | [`03-lakehouse-medallion.md`](03-lakehouse-medallion.md) | 13 |
| 4 | Chapter 4 — Data Intelligence (Dashboard / Genie / Agent) | [`04-data-intelligence.md`](04-data-intelligence.md) | 7 |
| 5 | Activation — Reverse ETL | [`05-activation-reverse-etl.md`](05-activation-reverse-etl.md) | 6 |
| 6 | Agent Bricks & Agent App Track | [`06-agent-bricks-and-app-track.md`](06-agent-bricks-and-app-track.md) | 10 |
| 7 | MLflow — Tracing, Evaluation & Deployment | [`07-mlflow-observability-and-eval.md`](07-mlflow-observability-and-eval.md) | 9 |
| 8 | Genie / Agent Skills Authoring | [`08-genie-agent-skills.md`](08-genie-agent-skills.md) | 5 |
| 9 | Refinement & Clean Up | [`09-refinement-and-cleanup.md`](09-refinement-and-cleanup.md) | 4 |

## All sections (flat index)

| Category | Step | Section | `section_tag` | Forks |
|---|---|---|---|---|
| [Foundation](00-foundation-prd.md) | 3 | Product Requirements Document (PRD) | `prd_generation` | — |
| [Chapter 1](01-app-ui-design-and-deploy.md) | 4 | Figma UI Design | `figma_ui_design` | — |
| [Chapter 1](01-app-ui-design-and-deploy.md) | 4 | Scaffold, Build, and Test Locally | `cursor_copilot_ui_design` | genie-code |
| [Chapter 1](01-app-ui-design-and-deploy.md) | 8 | Deploy and E2E Test with Lakebase | `workspace_setup_deploy` | — |
| [Chapter 1](01-app-ui-design-and-deploy.md) | 5 | Deploy to Databricks Apps | `deploy_databricks_app` | genie-code |
| [Chapter 2](02-lakebase-oltp.md) | 6 | Setup Lakebase | `setup_lakebase` | genie-code |
| [Chapter 2](02-lakebase-oltp.md) | 7 | Wire AppKit App to Lakebase | `wire_ui_lakebase` | genie-code |
| [Chapter 2](02-lakebase-oltp.md) | 9 | Register Lakebase in Unity Catalog | `sync_from_lakebase` | genie-code |
| [Chapter 3](03-lakehouse-medallion.md) | 8 | Table Metadata & Data Dictionary | `bronze_table_metadata` | — |
| [Chapter 3](03-lakehouse-medallion.md) | 8 | Table Metadata & Data Dictionary (Upload CSV) | `bronze_table_metadata_upload` | — |
| [Chapter 3](03-lakehouse-medallion.md) | 8 | Table Metadata & Data Dictionary (Design from PRD) | `bronze_table_metadata_generate` | — |
| [Chapter 3](03-lakehouse-medallion.md) | 10 | Bronze Layer Creation (Approach C) | `bronze_layer_creation` | genie-code |
| [Chapter 3](03-lakehouse-medallion.md) | 10 | Bronze Layer Creation (from CSV) | `bronze_layer_creation_upload` | — |
| [Chapter 3](03-lakehouse-medallion.md) | 11 | Silver Layer Pipelines (SDP) | `silver_layer_sdp` | genie-code |
| [Chapter 3](03-lakehouse-medallion.md) | 22 | Analyze Silver Metadata | `genie_silver_metadata` | — |
| [Chapter 3](03-lakehouse-medallion.md) | 8 | Analyze Silver Metadata (Upload CSV) | `genie_silver_metadata_upload` | — |
| [Chapter 3](03-lakehouse-medallion.md) | 22 | Analyze Silver Metadata (Design from PRD) | `genie_silver_metadata_generate` | — |
| [Chapter 3](03-lakehouse-medallion.md) | 23 | Gold Layer Design (Genie Accelerator) | `genie_gold_design` | — |
| [Chapter 3](03-lakehouse-medallion.md) | 9 | Gold Layer Design (PRD-aligned) | `gold_layer_design` | genie-code |
| [Chapter 3](03-lakehouse-medallion.md) | 12 | Gold Layer Pipeline (YAML-Driven) | `gold_layer_pipeline` | genie-code |
| [Chapter 3](03-lakehouse-medallion.md) | 23 | Deploy Lakehouse Assets (Bronze → Silver → Gold) | `deploy_lakehouse_assets` | genie-code |
| [Chapter 4](04-data-intelligence.md) | 13 | Create Use-Case Plan | `usecase_plan` | genie-code |
| [Chapter 4](04-data-intelligence.md) | 14 | Build AI/BI Dashboard | `aibi_dashboard` | genie-code |
| [Chapter 4](04-data-intelligence.md) | 15 | Build Genie Space [Metric Views/TVFs] | `genie_space` | genie-code |
| [Chapter 4](04-data-intelligence.md) | 16 | Build & Deploy Agent | `agent_framework` | genie-code |
| [Chapter 4](04-data-intelligence.md) | 17 | Wire Agent to AppKit UI | `wire_ui_agent` | genie-code |
| [Chapter 4](04-data-intelligence.md) | 24 | Deploy Semantic Layer Assets (TVFs → Metric Views → Genie → Dashboard) | `deploy_di_assets` | genie-code |
| [Chapter 4](04-data-intelligence.md) | 25 | Optimize Genie Space (Benchmark-Driven) | `optimize_genie` | — |
| [Activation](05-activation-reverse-etl.md) | 32 | Plan Synced Tables | `activation_table_design` | genie-code |
| [Activation](05-activation-reverse-etl.md) | 33 | Create Synced Tables | `activation_reverse_sync` | genie-code |
| [Activation](05-activation-reverse-etl.md) | 34 | Design Analytics App | `activation_app_design` | genie-code |
| [Activation](05-activation-reverse-etl.md) | 35 | Build Analytics App | `activation_build_wire` | genie-code |
| [Activation](05-activation-reverse-etl.md) | 36 | Wire to Lakebase | `activation_wire_lakebase` | genie-code |
| [Activation](05-activation-reverse-etl.md) | 37 | Deploy & Validate | `activation_deploy_validate` | genie-code |
| [Agent Bricks & Agent App Track](06-agent-bricks-and-app-track.md) | 38 | Agent Spec Design | `agent_spec_design` | — |
| [Agent Bricks & Agent App Track](06-agent-bricks-and-app-track.md) | 39 | Agent Tool Selection | `agent_tool_selection` | — |
| [Agent Bricks & Agent App Track](06-agent-bricks-and-app-track.md) | 40 | Phase 1 / Agent Foundation — UC Resources Foundation | `uc_resources_foundation` | — |
| [Agent Bricks & Agent App Track](06-agent-bricks-and-app-track.md) | 42 | Phase 1 / Agent Foundation — Create Knowledge Assistant | `knowledge_assistant_create` | genie-code |
| [Agent Bricks & Agent App Track](06-agent-bricks-and-app-track.md) | 43 | Phase 2 / Agent Build — Clone + Framework | `track_a_agent_app_clone_framework` | genie-code |
| [Agent Bricks & Agent App Track](06-agent-bricks-and-app-track.md) | 44 | Phase 2 / Agent Build - Wire Selected Tools and MCP | `track_a_agent_ka_genie_tools` | genie-code |
| [Agent Bricks & Agent App Track](06-agent-bricks-and-app-track.md) | 45 | Phase 2 / Agent Build — Auth + Lakebase Memory | `track_a_agent_auth_memory` | genie-code |
| [Agent Bricks & Agent App Track](06-agent-bricks-and-app-track.md) | 46 | Phase 2 / Agent Build — Smoke Eval + Deploy | `track_a_agent_eval_deploy` | genie-code |
| [Agent Bricks & Agent App Track](06-agent-bricks-and-app-track.md) | 47 | Phase 3 / AppKit Integration — AppKit ↔ Agent App Proxy (streaming chat) | `appkit_agent_app_proxy_chat` | genie-code |
| [Agent Bricks & Agent App Track](06-agent-bricks-and-app-track.md) | 48 | Phase 3 / AppKit Integration — Chatbot Feedback → MLflow Trace Assessments (Expert-in-the-Loop, End-User) | `appkit_chat_feedback_mlflow` | genie-code |
| [MLflow](07-mlflow-observability-and-eval.md) | 41 | Phase 1 / Agent Foundation — MLflow Tracing + UC OTel Storage | `mlflow_agent_tracing_uc` | — |
| [MLflow](07-mlflow-observability-and-eval.md) | 49 | Phase 1 / Build the Quality Suite — Register Prompts in Unity Catalog | `mlflow_prompt_registry` | — |
| [MLflow](07-mlflow-observability-and-eval.md) | 50 | Phase 1 / Build the Quality Suite — Evaluation Dataset | `mlflow_evaluation_datasets` | — |
| [MLflow](07-mlflow-observability-and-eval.md) | 51 | Phase 1 / Build the Quality Suite — Scorers and Judges | `mlflow_scorers_and_judges` | — |
| [MLflow](07-mlflow-observability-and-eval.md) | 52 | Phase 1 / Build the Quality Suite — First Scored Eval + Iteration Entry | `mlflow_evaluation_runs_and_iteration` | — |
| [MLflow](07-mlflow-observability-and-eval.md) | 53 | Phase 2 / Human Review — Labeling + Stakeholder Sign-Off (Expert-in-the-Loop) | `mlflow_human_review_and_signoff` | — |
| [MLflow](07-mlflow-observability-and-eval.md) | 54 | Phase 3 / Promote with Governance — Logged Model + UC Registration | `mlflow_logged_model_uc_registration` | — |
| [MLflow](07-mlflow-observability-and-eval.md) | 55 | Optional Hardening — Pre-Provisioned AI Gateway + Asset-Bundle Deployment | `mlflow_gateway_and_deployment` | genie-code |
| [MLflow](07-mlflow-observability-and-eval.md) | 56 | Phase 4 / Operate in Production — Monitoring and Agent-as-Judge Debugging | `mlflow_production_monitoring_and_debugging` | genie-code |
| [Genie / Agent Skills Authoring](08-genie-agent-skills.md) | 26 | Explore Existing Skills | `skill_install_explore` | — |
| [Genie / Agent Skills Authoring](08-genie-agent-skills.md) | 27 | Define Skill Strategy | `skill_define_strategy` | — |
| [Genie / Agent Skills Authoring](08-genie-agent-skills.md) | 28 | Create SKILL.md | `skill_create_skillmd` | — |
| [Genie / Agent Skills Authoring](08-genie-agent-skills.md) | 29 | Apply & Test Skill | `skill_apply_contracts` | — |
| [Genie / Agent Skills Authoring](08-genie-agent-skills.md) | 30 | Validate & Automate | `skill_certify_tables` | — |
| [Refinement & Clean Up](09-refinement-and-cleanup.md) | 18 | Iterate & Enhance App | `iterate_enhance` | — |
| [Refinement & Clean Up](09-refinement-and-cleanup.md) | 19 | Redeploy & Test Application | `redeploy_test` | — |
| [Refinement & Clean Up](09-refinement-and-cleanup.md) | 31 | Workspace Clean Up | `workspace_cleanup` | — |
| [Refinement & Clean Up](09-refinement-and-cleanup.md) | 99 | Default Section | `default` | — |
