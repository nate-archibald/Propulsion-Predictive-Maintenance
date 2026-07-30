# MLflow — Tracing, Evaluation & Deployment

Instrument agents with MLflow: tracing, prompt registry, evaluation datasets, scorers/judges, eval runs, human review, UC model registration, gateway deployment, and production monitoring.

> Auto-generated from `02_seed_section_input_prompts.sql`. Each section below corresponds to one `section_tag` in the workshop builder's `section_input_prompts` table.

## Sections in this category

| Step (order) | Section | `section_tag` | Forks |
|---|---|---|---|
| 41 | [Phase 1 / Agent Foundation — MLflow Tracing + UC OTel Storage](#phase-1-agent-foundation-mlflow-tracing-uc-otel-storage) | `mlflow_agent_tracing_uc` | — |
| 49 | [Phase 1 / Build the Quality Suite — Register Prompts in Unity Catalog](#phase-1-build-the-quality-suite-register-prompts-in-unity-catalog) | `mlflow_prompt_registry` | — |
| 50 | [Phase 1 / Build the Quality Suite — Evaluation Dataset](#phase-1-build-the-quality-suite-evaluation-dataset) | `mlflow_evaluation_datasets` | — |
| 51 | [Phase 1 / Build the Quality Suite — Scorers and Judges](#phase-1-build-the-quality-suite-scorers-and-judges) | `mlflow_scorers_and_judges` | — |
| 52 | [Phase 1 / Build the Quality Suite — First Scored Eval + Iteration Entry](#phase-1-build-the-quality-suite-first-scored-eval-iteration-entry) | `mlflow_evaluation_runs_and_iteration` | — |
| 53 | [Phase 2 / Human Review — Labeling + Stakeholder Sign-Off (Expert-in-the-Loop)](#phase-2-human-review-labeling-stakeholder-sign-off-expert-in-the-loop) | `mlflow_human_review_and_signoff` | — |
| 54 | [Phase 3 / Promote with Governance — Logged Model + UC Registration](#phase-3-promote-with-governance-logged-model-uc-registration) | `mlflow_logged_model_uc_registration` | — |
| 55 | [Optional Hardening — Pre-Provisioned AI Gateway + Asset-Bundle Deployment](#optional-hardening-pre-provisioned-ai-gateway-asset-bundle-deployment) | `mlflow_gateway_and_deployment` | genie-code |
| 56 | [Phase 4 / Operate in Production — Monitoring and Agent-as-Judge Debugging](#phase-4-operate-in-production-monitoring-and-agent-as-judge-debugging) | `mlflow_production_monitoring_and_debugging` | genie-code |

---

## Phase 1 / Agent Foundation — MLflow Tracing + UC OTel Storage

| Field | Value |
|-------|-------|
| `input_id` | `201` |
| `section_tag` | `mlflow_agent_tracing_uc` |
| `order_number` | `41` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Install MLflow, enable autolog, create experiment, route traces into UC OTel Delta tables_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Stand up MLflow tracing and the Unity Catalog OTel sink for the **{use_case_slug}** agent so every agent run, tool call, LLM span, and retrieval is observable in MLflow and queryable in UC Delta tables. Today the agent runs without any trace plumbing; after this prompt runs, autolog is on, the experiment exists at `{mlflow_experiment_path}`, and 4 OTel Delta tables are landing spans under `{lakehouse_default_catalog}.{db_schema}_agent`.

**Experiment-path derivation (REQUIRED — do not deviate).** `{mlflow_experiment_path}` MUST be `/Users/<user_email>/mlflow/{user_app_name}-agent`, where `<user_email>` is the operator's email (read from `Global Variables.User email` in `.vibecoding-state.md`) and `{user_app_name}` is the same `${FIRSTNAME}-${LASTINITIAL}-${use_case_slug}` identity that backs `APP_NAME` (e.g. `/Users/jane.doe@example.com/mlflow/jane-d-stayfinder-agent`). This guarantees concurrent attendees on a shared workspace cannot collide on a single experiment, and the MLflow UI never lists a generic `Tracing` / `traces` / `Default` entry. Read the pinned value from `state://Resources.mlflow_experiment_path` if `vibecoding-state.migrate_canonical` has already populated it; otherwise derive it here using the formula above and capture the resolved path back into state. Forbidden leaves (HARD STOP if encountered): `Tracing`, `traces`, `tracing`, `Default`, `my-agent`, `my-data-agent`, or any leaf not suffixed with `{user_app_name}-`.

This will involve the following steps:

- **Install MLflow + autolog** — install `mlflow[databricks] >= 3.10.1` and enable `mlflow.openai.autolog()` so every LLM/Tool/Retriever span is captured without per-call decorators
- **Detect the environment** — export a `detect_environment()` helper so the same instrumentation code runs in local dev, notebooks, Databricks Apps, and Model Serving without branching
- **Create the experiment** — provision `{mlflow_experiment_path}` with the required experiment tags (e.g. `mlflow.promptRegistryLocation`) so the prompt-registry phase can attach
- **Wire the UC OTel sink** — provision 4 OTel Delta tables prefixed with `{agent_resource_prefix}_otel` in `{lakehouse_default_catalog}.{db_schema}_agent` and emit grant SQL
- **Smoke-test the trace pipe** — emit a test trace and verify it lands in BOTH the MLflow UI and the UC OTel tables, then capture `mlflow_experiment_path` as state

**How this prompt chains with the prior step (skill invocations):**

**Invoke skills (in order):**

1. `skills/vibecoding-state` op `enter` — params: `prompt_id: "mlflow_agent_tracing_uc"`, `require_prior_gate: {prompt_id: "uc_resources_foundation", gate: "UC resources ready"}`.
2. @genai-agents/foundation/01-mlflow-genai-foundation/SKILL.md — params:
   - `agent_name: "{agent_app_name}"`
   - `mlflow_min_version: "3.10.1"`
   - `enable_openai_autolog: true`
   - `workspace_client_pool: true`
   - `detect_environment_helper: true`
   - `environments: ["local_dev", "databricks_apps", "model_serving", "notebook"]`
3. @genai-agents/foundation/02-experiment-tracing-and-uc-storage/SKILL.md — params:
   - `agent_name: "{agent_app_name}"`
   - `experiment_path: "{mlflow_experiment_path}"`
   - `uc_catalog: "{lakehouse_default_catalog}"`
   - `uc_schema: "{db_schema}_agent"`
   - `warehouse_id: "{default_warehouse}"`
   - `otel_table_prefix: "{agent_resource_prefix}_otel"`
   - `enable_trace_decorator: true`
   - `experiment_tags: ["mlflow.promptRegistryLocation"]`
   - `emit_grant_sql: true`
   - `verification: {test_trace_visible_in_uc: true, otel_tables_count: 4}`
4. `skills/vibecoding-state` op `exit` — params: `prompt_id: "mlflow_agent_tracing_uc"`, `gate: "Tracing live; UC OTel tables ready"`, `captured: {mlflow_experiment_path}`.

**Gate:** `Tracing live; UC OTel tables ready` — `mlflow[databricks] >= 3.10.1` installed, autolog enabled, experiment visible at `{mlflow_experiment_path}`, 4 UC OTel Delta tables created in `{lakehouse_default_catalog}.{db_schema}_agent`, test trace visible in UC.
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## 1️⃣ How To Apply

Open a **new Agent thread in your Coding Assistant** and paste the prompt above. This is the **tracing foundation phase** of the SDLC story arc — the moment your locally-working GenAI app gets observability that survives across deploy targets and into governed UC storage.

### Prerequisite
- `UC resources ready` gate captured in state
- `{lakehouse_default_catalog}` and `{db_schema}_agent` UC schema usable
- A SQL warehouse (`{default_warehouse}`) for OTel ingest
- `agent_app_name` and `agent_resource_prefix` captured by `uc_resources_foundation`

### Steps to Apply
1. New thread in your Coding Assistant, paste prompt.
2. AI installs/upgrades `mlflow[databricks] >= 3.10.1`, enables autolog, exports a `detect_environment()` helper.
3. AI creates the experiment at `{mlflow_experiment_path}` and the 4 UC OTel Delta tables under `{lakehouse_default_catalog}.{db_schema}_agent`.
4. AI emits a quick test trace and verifies it lands in both the MLflow UI and the UC tables.

---

## 2️⃣ What Are We Building?

We are wiring **MLflow tracing** into the agent code and routing every trace into **4 UC Delta tables** so production traces inherit catalog RBAC, retention, and lineage — not an opaque MLflow blob store.

```
Agent code (@invoke / @stream)
        │
        ▼
mlflow.openai.autolog()    ◀── 1-line activation
        │
        ▼
MLflow experiment at {mlflow_experiment_path}    ─────► MLflow UI (interactive)
        │
        ▼ OTel exporter
{lakehouse_default_catalog}.{db_schema}_agent.<otel_*> (4 Delta tables)
        │
        ▼ joinable, governable, retained
   Genie / SQL / Dashboards / Continuous-eval / agent-as-judge debug
```

### Key Concepts

| Concept | What It Means | Why It Matters |
|---------|---------------|----------------|
| **`mlflow.openai.autolog()`** | One-line activation that instruments the OpenAI SDK (or framework-equivalent) so every chat completion is traced | No per-call decorators; the agent code stays clean and traces are uniform across local + serving |
| **MLflow experiment** | Logical container at `{mlflow_experiment_path}` where MLflow UI surfaces traces interactively | Developer-loop introspection; MLflow tags (e.g. `mlflow.promptRegistryLocation`) attach here |
| **UC OTel Delta tables** | 4 Delta tables in `{lakehouse_default_catalog}.{db_schema}_agent` populated by an OpenTelemetry exporter | Traces become first-class queryable artifacts under UC governance — joinable with benchmarks, scorers, sign-off |
| **`detect_environment()`** | Helper that picks the right tracking URI for local dev, notebooks, Databricks Apps, or Model Serving | Same instrumentation code runs in every deploy target; no env-specific branching in agent logic |
| **Span hierarchy** | `AGENT` (root) → `LLM` → `TOOL` → `RETRIEVER` spans, each auto-capturing inputs/outputs/latency/tokens | Continuous-eval, agent-as-judge, and the 50–53 quality suite all join on this hierarchy |

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It's Used Here |
|----------|--------------------|
| **One line of autolog** | `mlflow.openai.autolog()` (or framework-equivalent) instruments the SDK once at module import; no per-call decorators are needed and every LLM/Tool/Retriever span is captured automatically. |
| **`detect_environment()` helper** | The same agent code runs locally, in notebooks, in Databricks Apps, and in Model Serving — the helper picks the right tracking URI per environment so the developer never branches on `os.environ`. |
| **UC OTel for governance** | Traces land as Delta tables under UC, so they inherit RBAC, retention policies, and lineage — not just an opaque MLflow store. The 4 OTel tables are queryable from Genie/SQL/Dashboards out of the box. |
| **Joinable history** | Production traces (in OTel tables) join against benchmark tables and assessment tables for continuous eval (Phase 6). The OTel `trace_id` is the join key the entire SDLC stack uses. |
| **Workspace client pool** | Long-running agents reuse a pooled `WorkspaceClient` instead of constructing one per request — avoiding token-refresh storms under load. |

---

## 4️⃣ What Happens Behind the Scenes?

The two skills (`01-mlflow-genai-foundation` then `02-experiment-tracing-and-uc-storage`) walk a 7-phase activation:

| Phase | What Happens | Key Output |
|-------|--------------|------------|
| **Phase 0** | `vibecoding-state` op `enter` confirms the prior `UC resources ready` gate | Foundation context |
| **Phase 1** | Install/upgrade `mlflow[databricks] >= 3.10.1`; export pooled `WorkspaceClient` | MLflow installed |
| **Phase 2** | Wire `mlflow.openai.autolog()` and the `detect_environment()` helper | Autolog active |
| **Phase 3** | Create the MLflow experiment at `{mlflow_experiment_path}` with required tags (e.g. `mlflow.promptRegistryLocation`) | Experiment ready |
| **Phase 4** | Provision the 4 UC OTel Delta tables in `{lakehouse_default_catalog}.{db_schema}_agent` with prefix `{agent_resource_prefix}_otel` | OTel tables created |
| **Phase 5** | Emit grant SQL for `_otel*` tables; verify a test trace appears in both MLflow UI and UC | Trace round-trip verified |
| **Phase 6** | Span hierarchy lights up: `AGENT span` (root) → `LLM spans` → `TOOL spans` → `RETRIEVER spans`, each auto-capturing inputs/outputs/latency/token counts | Hierarchy live |

### Gate Contract

| Reads gate | Produces gate | Captured state |
|------------|---------------|----------------|
| `UC resources ready` (from `uc_resources_foundation`) | `Tracing live; UC OTel tables ready` (consumed by 43 and the entire SDLC quality suite) | `mlflow_experiment_path` |

</details>

<details><summary><strong>Expected Output</strong></summary>

### Resources Created
- [ ] `mlflow[databricks] >= 3.10.1` installed
- [ ] `mlflow.openai.autolog()` (or framework-equivalent) enabled
- [ ] `detect_environment()` helper exported
- [ ] MLflow experiment at `{mlflow_experiment_path}` created
- [ ] 4 UC OTel Delta tables in `{lakehouse_default_catalog}.{db_schema}_agent`
- [ ] Test trace visible in both MLflow UI and UC

</details>

---

## Phase 1 / Build the Quality Suite — Register Prompts in Unity Catalog

| Field | Value |
|-------|-------|
| `input_id` | `209` |
| `section_tag` | `mlflow_prompt_registry` |
| `order_number` | `49` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Register the agent's prompts as UC-governed assets with @production / @staging aliases (upstream of eval datasets and scorers)_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Register every prompt the **{agent_app_name}** agent loads as a governed Unity Catalog asset with git-style aliases. Today the agent uses inline prompt strings; after this prompt runs, the agent loads via `prompts://...@production` and a release becomes an alias move (no code change). This step opens the MLflow SDLC ("Agents 201") arc — every later step (eval datasets at 50, scorers at 51, eval runs at 52, sign-off at 53, promotion at 54) reads prompts back through `prompts://...@alias`.

This will involve the following steps:

- **Enumerate inline prompts** — find every prompt the agent loads (`agent.system_prompt`, `agent.must_do[]`, `agent.must_not_do[]`) by reading `docs/agent_spec.yaml`
- **Register each as a UC asset** — create `{lakehouse_default_catalog}.{db_schema}_agent.<prompt_name>` for each one, version 1
- **Pin `@production` alias** — alias the current versions so the agent's runtime loader resolves them
- **Reserve `@staging` alias** — leave it free for the next iteration's candidate version
- **Verify the loader** — boot the agent against `prompts://...@production` and assert it loads cleanly (no silent fallback to inline strings)
- **Tag the experiment** — record `mlflow.promptRegistryLocation` so future eval runs trace back to the exact prompt versions

**How this prompt chains with the prior step (skill invocations):**

**Invoke skills (in order):**

1. `skills/vibecoding-state` op `enter` — params: `prompt_id: "mlflow_prompt_registry"`, `require_prior_gate: {prompt_id: "mlflow_agent_tracing_uc", gate: "Tracing live; UC OTel tables ready"}`.
2. @genai-agents/sdlc/01-prompt-registry/SKILL.md — params:
   - `agent_name: "{agent_app_name}"`
   - `uc_catalog: "{lakehouse_default_catalog}"`
   - `uc_schema: "{db_schema}_agent"`
   - `aliases: ["@production", "@staging"]`
   - `verify_loader: "prompts://"`
3. `skills/vibecoding-state` op `exit` — params: `prompt_id: "mlflow_prompt_registry"`, `gate: "Prompts registered in UC; @production and @staging aliases set"`.

**Gate:** `Prompts registered in UC; @production and @staging aliases set` — every prompt the agent loads is now governed in UC and addressable via `prompts://...@alias` instead of inline strings.

> **Genie Code execution.** These are pure MLflow SDK operations — on Genie Code run them directly via `executeCode` on serverless (the full `mlflow`/`mlflow.genai` Python SDK), exactly as the IDE/CLI flow runs them in‑session. **No job, no bundle.** Call `mlflow.set_experiment("{mlflow_experiment_path}")` first so registrations and traces land in the agent's experiment. Verify with the native `search_prompts` / `get_prompt_details` tools rather than re‑deriving. Run any incidental CLI step through `runDatabricksCli` (pre‑authenticated). Use full clone‑rooted skill paths (`skills/...`), never bare `@`-mentions. See `skills/genie-code-environment`.
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## 1️⃣ How To Apply

Open a **new Agent thread in your Coding Assistant** and paste the prompt above. This is the entry point for the quality and scoring suite phase — every downstream step (datasets, scorers, eval runs, sign-off, promotion) reads prompts back via `prompts://...@alias`.

### Prerequisite
- `Tracing live; UC OTel tables ready` gate captured in state (input_id 201)
- UC catalog `{lakehouse_default_catalog}` and schema `{db_schema}_agent` already exist

### Steps to Apply
1. New Coding Assistant thread, paste prompt.
2. AI registers each prompt the agent loads into UC under `{lakehouse_default_catalog}.{db_schema}_agent.*`.
3. AI sets the `@production` and `@staging` aliases on the current versions.
4. AI verifies the agent boots cleanly when reading prompts via `prompts://...@production`.

---

## 2️⃣ What Are We Building?

This prompt opens the MLflow SDLC ("Agents 201") arc. The arc has four phases — **Build the Quality Suite** (49–52), **Human Review** (53), **Promote** (54–55), **Operate** (56) — and every later prompt references back to this arc as its mental map.

### MLflow SDLC Arc

```
PHASE 1: Build the Quality Suite      PHASE 2: Human Review     PHASE 3: Promote      PHASE 4: Operate
┌────────────────────────────────┐    ┌────────────────────┐    ┌────────────────┐    ┌────────────────────┐
│ 49 Prompt registry  ◀── here   │    │ 53 Labeling +      │    │ 54 Logged model│    │ 56 Continuous-eval │
│ 50 Evaluation datasets         │ ─► │    stakeholder     │ ─► │  + UC @champion│ ─► │    + ≥4 SQL        │
│ 51 Scorers + judges            │    │    sign-off        │    │ 55 (opt) AI    │    │    alerts +        │
│ 52 First scored eval +         │    │   (Decision:       │    │    Gateway     │    │    agent-as-judge  │
│    iteration routing           │    │    APPROVED)       │    │    + DAB       │    │    debug           │
└────────────────────────────────┘    └────────────────────┘    └────────────────┘    └────────────────────┘
```

### Prompt-Alias Diagram (this prompt's specific output)

The prompt registry stores each prompt as a UC asset with **git-style aliases** (`@production`, `@staging`). The agent loads via `prompts://catalog.schema.name@alias`, so a release becomes an alias move — no code change.

```
docs/agent_spec.yaml                    UC: {lakehouse_default_catalog}.{db_schema}_agent
  agent.system_prompt        ─────►     ┌────────────────────────────────────────┐
  agent.must_do[]                       │ system_instructions (prompt asset)     │
  agent.must_not_do[]                   │   v1 ─────────── @production           │
                                        │   v2 ─────────── @staging              │
                                        │                                        │
                                        │ Loaded via: prompts://...@production   │
                                        │ Updated via: alias move (no code chg)  │
                                        └────────────────────────────────────────┘
```

### Key Concepts

| Concept | What It Means | Why It Matters |
|---------|---------------|----------------|
| **Prompt as UC asset** | Each prompt is a versioned, RBAC'd Unity Catalog object | Lineage, audit, governance — same controls as Delta tables and registered models |
| **`prompts://` URI** | The loader URI used by the agent at runtime | Decouples the agent from inline strings; release = alias move |
| **`@production` alias** | Pointer to the version users are running today | The single canonical answer to "what prompt is in prod right now?" |
| **`@staging` alias** | Pointer to the next candidate version | Lets eval runs compare candidates without affecting prod traffic |
| **Loader verification** | Agent boots against `prompts://...@production` and fails fast if missing | Prevents silent fallback to inline strings — registry must be the source of truth |
| **Experiment tag** | `mlflow.promptRegistryLocation` tagged on every eval run | Audit trail joins eval scores to the exact prompt version that produced them |

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It's Used Here |
|----------|--------------------|
| **Prompts as UC assets** | Versioned, RBAC'd, lineage-tracked, addressable via `prompts://catalog.schema.name@alias` — the same governance surface as Delta tables and registered models. |
| **Git-style aliases** | `@production` (live) and `@staging` (next release) decouple deploy timing from prompt iteration; promotion is an alias move, not a redeploy. |
| **Loader verification** | Agent boots with `prompts://...@production`; if the alias is missing, boot fails fast — no silent fallback to inline strings. |
| **Foundation for iteration** | Every later step (eval datasets at 50, scorers at 51, eval runs at 52, hand-authored iteration in Skill 08b) assumes prompts are addressable through the registry. |
| **Audit by experiment tag** | `mlflow.promptRegistryLocation` experiment tag links each evaluation back to the exact prompt versions it scored — provenance for any post-hoc investigation. |

---

## 4️⃣ What Happens Behind the Scenes?

When you paste the prompt, the AI walks four phases against UC:

| Phase | What the AI Does | Where It Writes |
|-------|------------------|-----------------|
| 1. Enumerate | Find every inline prompt the agent loads (`agent.system_prompt`, `agent.must_do[]`, `agent.must_not_do[]`) | Reads from `docs/agent_spec.yaml` |
| 2. Register | Create each as a UC prompt asset under `{lakehouse_default_catalog}.{db_schema}_agent.*` | UC schema |
| 3. Alias | Pin the new versions as `@production`; reserve `@staging` for next release | UC alias table |
| 4. Verify loader | Boot agent against `prompts://...@production`; assert it loads cleanly | Agent runtime |

### Gate Contract

| Reads gate | Produces gate | Captured state |
|------------|---------------|----------------|
| `Tracing live; UC OTel tables ready` (from `mlflow_agent_tracing_uc`) | `Prompts registered in UC; @production and @staging aliases set` | UC prompt assets at `{lakehouse_default_catalog}.{db_schema}_agent.*` |

</details>

<details><summary><strong>Expected Output</strong></summary>

### Resources Created
- [ ] All agent prompts registered at `{lakehouse_default_catalog}.{db_schema}_agent.*`
- [ ] `@production` alias pinned on the current versions
- [ ] `@staging` alias available for future promotion
- [ ] Agent loader confirmed working against `prompts://...@production`

</details>

---

## Phase 1 / Build the Quality Suite — Evaluation Dataset

| Field | Value |
|-------|-------|
| `input_id` | `210` |
| `section_tag` | `mlflow_evaluation_datasets` |
| `order_number` | `50` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Generate ≥ 20 benchmark rows that cover every coverage bucket and user journey from the AgentSpec_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Build the **{agent_app_name}** agent's evaluation dataset — the canonical question-set every downstream prompt / model / agent change is graded against. Today there is no benchmark table; after this prompt runs, `{lakehouse_default_catalog}.{db_schema}_agent.{agent_resource_prefix}_benchmarks` exists with ≥ 20 rows, every coverage bucket and user journey is covered, and `expectations` + `human_assessments` columns are ready for sync-back from labeling sessions.

This will involve the following steps:

- **Pull seed cases from the Spec (generic)** — read `agent.benchmark_seeds.coverage_buckets[]`, `agent.benchmark_seeds.seed_examples[]`, and `ui.user_journeys[]` from state. These are use-case shaped, NOT tool-shaped.
- **Sample real production traces** — optionally mine the OTel trace tables for representative real-world inputs to add to the seed set
- **Expand into ≥ 20 benchmark rows** — synthesize across seeds × buckets × journeys, LLM-augmented where the seed set is thin
- **Append tool-shaped rows from the Plan** — read `docs/agent_tool_plan.yaml.verification.tool_smoke_tests[]` and APPEND ≥1 row per entry. KA absent in `selected_tools[]` ⇒ no KA-shaped rows; Genie absent ⇒ no Genie-shaped rows; SQL MCP absent ⇒ no SQL rows. The append is mechanical — no defaulting.
- **Author expected outputs** — populate the `expectations` column with per-row reference behavior so judges and scorers have ground truth to grade against
- **Enforce the coverage contract** — assert every coverage bucket has ≥ 1 row, every UI user journey has ≥ 1 row, AND every entry in `verification.tool_smoke_tests[]` has ≥ 1 row before writing
- **Register the dataset table** — write to `{lakehouse_default_catalog}.{db_schema}_agent.{agent_resource_prefix}_benchmarks` with `expectations` + `human_assessments` columns ready for the labeling sessions in 53

**How this prompt chains with the prior step (skill invocations):**

**Invoke skills (in order):**

1. `skills/vibecoding-state` op `enter` — params: `prompt_id: "mlflow_evaluation_datasets"`, `require_prior_gate: {prompt_id: "mlflow_prompt_registry", gate: "Prompts registered in UC; @production and @staging aliases set"}`.
2. @genai-agents/sdlc/02-evaluation-datasets/SKILL.md — params:
   - `agent_name: "{agent_app_name}"`
   - `agent_spec_ref: "state://AgentSpec"`
   - `agent_tool_plan_ref: "docs/agent_tool_plan.yaml"`
   - `app_spec_ref: "state://AppSpec"`
   - `target_table: "{lakehouse_default_catalog}.{db_schema}_agent.{agent_resource_prefix}_benchmarks"`
   - `min_rows: 20`
   - The skill reads `agent.benchmark_seeds.coverage_buckets[]`, `agent.benchmark_seeds.seed_examples[]`, and `ui.user_journeys[]` (every journey must have at least one benchmark row), AND `docs/agent_tool_plan.yaml.verification.tool_smoke_tests[]` (one tool-shaped row appended per entry; tool families with `selected: false` contribute zero rows).
3. `skills/vibecoding-state` op `exit` — params: `prompt_id: "mlflow_evaluation_datasets"`, `gate: "≥ 20 benchmark rows; every user journey covered"`.

**Gate:** `≥ 20 benchmark rows; every user journey covered` — the benchmark table at `{lakehouse_default_catalog}.{db_schema}_agent.{agent_resource_prefix}_benchmarks` is the single source of truth for scorers (input_id 211) and eval runs (input_id 212). Coverage assertion holds across THREE axes: every `agent.benchmark_seeds.coverage_buckets[]`, every `ui.user_journeys[]`, AND every `verification.tool_smoke_tests[]` entry from the Tool Plan has ≥ 1 row.

> **Genie Code execution.** These are pure MLflow GenAI SDK operations — on Genie Code run them directly via `executeCode` on serverless (`mlflow.genai.datasets`), exactly as the IDE/CLI flow runs them in‑session. **No job, no bundle.** Call `mlflow.set_experiment("{mlflow_experiment_path}")` first. Verify the dataset with the native `list_datasets` / `get_dataset_records` tools rather than re‑deriving. Run any incidental CLI step through `runDatabricksCli` (pre‑authenticated). Use full clone‑rooted skill paths (`skills/...`), never bare `@`-mentions. See `skills/genie-code-environment`.
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## 1️⃣ How To Apply

Open a **new Agent thread in your Coding Assistant** and paste the prompt above. The benchmark table populated here is the substrate the scorers (input_id 211) and the first scored eval (input_id 212) read against.

### Prerequisite
- `Prompts registered in UC; @production and @staging aliases set` gate captured in state (input_id 209)
- `state://AgentSpec.agent.benchmark_seeds.coverage_buckets[]` populated
- `state://AgentSpec.agent.benchmark_seeds.seed_examples[]` populated
- `state://AppSpec.ui.user_journeys[]` populated

### Steps to Apply
1. New Coding Assistant thread, paste prompt.
2. AI generates ≥ 20 benchmark rows into `{lakehouse_default_catalog}.{db_schema}_agent.{agent_resource_prefix}_benchmarks`.
3. AI verifies every coverage bucket has at least one row AND every user journey has at least one benchmark.

---

## 2️⃣ What Are We Building?

This is the second step of the **Build the Quality Suite** phase of the MLflow SDLC arc (introduced in 49). We are generating the benchmark dataset — the single source of truth that scorers (51) and eval runs (52) grade against. The dataset is the **product** of three inputs from the AgentSpec/AppSpec: coverage buckets (product semantics), user journeys (UI flows), and seed examples (concrete I/O pairs).

```
state://AgentSpec.agent.benchmark_seeds.coverage_buckets[]
   - "trip planning"
   - "policy compliance"
   - "edge case: empty input"
        │
        ▼
state://AgentSpec.agent.benchmark_seeds.seed_examples[]   ──┐
   - {input, expectations}                                  │
        │                                                   ▼
        ▼                                                ≥ 20 rows
state://AppSpec.ui.user_journeys[]                       ┌────────────────────────────────┐
   - "first-time user signup → first booking"            │ {lakehouse_default_catalog}    │
   - "agent host responds to support escalation"         │ .{db_schema}_agent             │
        │                                                │ .{agent_resource_prefix}_      │
        └─────► every journey × ≥1 row covered  ──────►  │   benchmarks                   │
                every coverage bucket × ≥1 row covered   │  (expectations,                │
                                                         │   human_assessments columns    │
                                                         │   ready for sync-back)         │
                                                         └────────────────────────────────┘
```

### Key Concepts

| Concept | What It Means | Why It Matters |
|---------|---------------|----------------|
| **Coverage bucket** | A product-semantics label (e.g. "policy compliance", "edge case") | Anchors the dataset to the use case, not generic NLP categories |
| **User journey** | A UI flow from `state://AppSpec.ui.user_journeys[]` | Every journey **must** have ≥1 benchmark row — that is the coverage contract |
| **Seed example** | An `{input, expectations}` pair authored ahead of time | Concrete starting points before LLM-augmented synthesis |
| **`expectations` column** | Per-row reference behavior the agent should produce | Read by judges and SME labels; the column is created empty if needed |
| **`human_assessments` column** | Sync-back target for SME labels in 53 | Means the dataset is built ready for ground-truth growth on day one |
| **≥ 20 row floor** | Minimum benchmark size before scorer means become trustworthy | Below this, run-to-run variance dominates; iteration loops can't tell signal from noise |

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It's Used Here |
|----------|--------------------|
| **Coverage buckets are product semantics** | Buckets come from the use-case spec (e.g. "policy compliance", "edge case"), not from generic NLP categories — the dataset is graded against the product, not abstract benchmarks. |
| **User-journey coverage is non-negotiable** | Every journey in `state://AppSpec.ui.user_journeys[]` must have ≥ 1 benchmark row; any uncovered journey is a coverage gap, not a bug-class to defer. |
| **Schema includes `expectations` + `human_assessments`** | Columns the SME labeling session writes back into during 53; the dataset is built ready for ground-truth growth without a future schema migration. |
| **≥ 20 rows minimum** | Below this, scorer-mean variance dominates trend analysis; growth is expected during 53 (issue-focused subsets), but the floor must hold from day one. |
| **Dataset is the gate** | Scorers (51) and eval runs (52) read from this single table; changes to this table propagate to all downstream eval — there is no second benchmark set to drift. |

---

## 4️⃣ What Happens Behind the Scenes?

When you paste the prompt, the AI walks four phases:

| Phase | What the AI Does | Where It Writes |
|-------|------------------|-----------------|
| 1. Read inputs | Pull coverage buckets, seed examples, and user journeys from state | Reads `state://AgentSpec.agent.benchmark_seeds.*` and `state://AppSpec.ui.user_journeys[]` |
| 2. Generate rows | Expand seeds × buckets × journeys into ≥ 20 rows | Synthesizer pipeline (LLM-augmented) |
| 3. Enforce coverage | Assert every bucket has ≥ 1 row AND every journey has ≥ 1 row | Validation step before write |
| 4. Emit table | Write to `{lakehouse_default_catalog}.{db_schema}_agent.{agent_resource_prefix}_benchmarks` with `expectations` + `human_assessments` columns | UC table |

### Gate Contract

| Reads gate | Produces gate | Captured state |
|------------|---------------|----------------|
| `Prompts registered in UC; @production and @staging aliases set` (from `mlflow_prompt_registry`) | `≥ 20 benchmark rows; every user journey covered` | Benchmark table at `{lakehouse_default_catalog}.{db_schema}_agent.{agent_resource_prefix}_benchmarks` |

</details>

<details><summary><strong>Expected Output</strong></summary>

### Resources Created
- [ ] Table `{lakehouse_default_catalog}.{db_schema}_agent.{agent_resource_prefix}_benchmarks` with ≥ 20 rows
- [ ] Every `agent.benchmark_seeds.coverage_buckets[]` value covered
- [ ] Every `ui.user_journeys[]` covered by ≥ 1 benchmark row
- [ ] Every `docs/agent_tool_plan.yaml.verification.tool_smoke_tests[]` entry has ≥ 1 corresponding tool-shaped benchmark row (KA-shaped only if KA selected, Genie-shaped only if Genie selected, SQL-shaped only if SQL MCP selected)
- [ ] Schema includes `expectations` and `human_assessments` columns ready for sync-back from labeling sessions

</details>

---

## Phase 1 / Build the Quality Suite — Scorers and Judges

| Field | Value |
|-------|-------|
| `input_id` | `211` |
| `section_tag` | `mlflow_scorers_and_judges` |
| `order_number` | `51` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Register builtin scorers, Guidelines, custom code scorers, and LLM judges with thresholds (judge calls route via llm_judge_default role)_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Define the scorer suite for the **{agent_app_name}** agent — built-in scorers (Correctness, Safety, Guidelines, RetrievalGroundedness) plus custom `@scorer` functions and LLM judges aligned to the governance rules captured in the Agent Spec. Today there is no scoring stack; after this prompt runs, every scorer needed to grade a benchmark row is registered against `{mlflow_experiment_path}` with explicit thresholds, and every `make_judge` call routes through the resolved `llm_judge_default` role binding (never the raw `{llm_endpoint}`).

This will involve the following steps:

- **Import built-in scorers** — register `safety` (threshold 0.95, 100% sampling), `relevance` (threshold 0.8), and any other first-party scorers the use case needs
- **Author custom `@scorer` functions** — materialize deterministic checks (schema validation, regex, currency-code matching) from `agent.must_do[]` and `agent.must_not_do[]` rules and `governance.scorer_suite.custom_scorer_rules[]`
- **Convert Guidelines into judges** — turn each free-text guideline in `governance.scorer_suite.guidelines[]` into a Guidelines scorer
- **Configure LLM judges** — convert `governance.scorer_suite.judge_questions[]` into `make_judge` scorers routed through `{llm_role_endpoints.llm_judge_default.endpoint}` (per `runtime_config.llm_role_endpoints`)
- **Register tool-shaped scorers from the Plan** — read `docs/agent_tool_plan.yaml.runtime_guardrails.tool_shaped_scorers[]` and register each entry as an additional scorer. KA absent in `selected_tools[]` ⇒ no `ka_citation_present`, no `RetrievalGroundedness`. Genie absent ⇒ no `genie_sql_correctness`. SQL MCP absent ⇒ no `sql_readonly_compliance`. The union is deduped — `RetrievalGroundedness` only registers once even if both KA and Vector Search are selected.
- **Bind scorers to the eval dataset** — attach the unioned scorer suite (Spec generic ∪ Plan tool-shaped) to the benchmark dataset from prompt 50 so the first scored eval can pick it up
- **Smoke-test each scorer** — run each scorer against a known-good and known-bad example to confirm thresholds fire as expected

**How this prompt chains with the prior step (skill invocations):**

**Invoke skills (in order):**

1. `skills/vibecoding-state` op `enter` — params: `prompt_id: "mlflow_scorers_and_judges"`, `require_prior_gate: {prompt_id: "mlflow_evaluation_datasets", gate: "≥ 20 benchmark rows; every user journey covered"}`.
2. @genai-agents/sdlc/03-scorers-and-judges/SKILL.md — params:
   - `agent_name: "{agent_app_name}"`
   - `agent_spec_ref: "state://AgentSpec"`
   - `agent_tool_plan_ref: "docs/agent_tool_plan.yaml"`
   - `mlflow_experiment_path: "{mlflow_experiment_path}"`
   - `judge_endpoint: "{llm_role_endpoints.llm_judge_default.endpoint}"` (every `make_judge` call routes through the resolved `llm_judge_default` role binding — never the raw `{llm_endpoint}`)
   - `builtins: [{name: "safety", sampling: 1.0, threshold: 0.95}, {name: "relevance", threshold: 0.8}]`
   - The skill reads the GENERIC suite from `governance.scorer_suite.guidelines[]`, `governance.scorer_suite.custom_scorer_rules[]`, `governance.scorer_suite.judge_questions[]` (use-case shaped, tool-agnostic) AND the TOOL-SHAPED suite from `docs/agent_tool_plan.yaml.runtime_guardrails.tool_shaped_scorers[]` (derived mechanically from `selected_tools[]`). The two are unioned and deduped.
   - `RetrievalGroundedness` is registered ONLY if KA or Vector Search appears in `selected_tools[]`. `ka_citation_present` only if KA selected. `genie_sql_correctness` and `genie_response_grounded_in_table` only if Genie selected. `sql_readonly_compliance` and `sql_fully_qualified_names` only if SQL MCP selected. `uc_function_signature_match` only if UC Functions selected. There is NO defaulting for tool families absent from `selected_tools[]`.
3. `skills/vibecoding-state` op `exit` — params: `prompt_id: "mlflow_scorers_and_judges"`, `gate: "Scorer suite registered with thresholds"`.

**Gate:** `Scorer suite registered with thresholds` — every scorer the use case needs (builtins + Guidelines + custom code scorers + LLM judges from the Spec) UNIONED with every tool-shaped scorer hint from `docs/agent_tool_plan.yaml.runtime_guardrails.tool_shaped_scorers[]` is registered against `{mlflow_experiment_path}` with explicit thresholds. No `RetrievalGroundedness` / `ka_citation_present` / `genie_*` / `sql_*` scorer registers unless its tool family is in `selected_tools[]`. Ready for the first scored eval (input_id 212).

> **Genie Code execution.** These are pure MLflow GenAI SDK operations — on Genie Code register scorers/judges directly via `executeCode` on serverless (full `mlflow.genai.scorers` SDK; `scorer.register()`/`.start()` for scheduled scorers), exactly as the IDE/CLI flow runs them in‑session. **No job, no bundle.** Call `mlflow.set_experiment("{mlflow_experiment_path}")` first so scorers bind to the agent's experiment. Verify with the native `get_scheduled_scorers` tool rather than re‑deriving. Every `make_judge` call routes through the resolved `llm_judge_default` role binding. Run any incidental CLI step through `runDatabricksCli`. Use full clone‑rooted skill paths (`skills/...`), never bare `@`-mentions. See `skills/genie-code-environment`.
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## 1️⃣ How To Apply

Open a **new Agent thread in your Coding Assistant** and paste the prompt above. The scorer suite registered here is what input_id 212's first scored eval grades against.

### Prerequisite
- `≥ 20 benchmark rows; every user journey covered` gate captured in state (input_id 210)
- `state://AgentSpec.governance.scorer_suite.guidelines[]` populated
- `state://AgentSpec.governance.scorer_suite.custom_scorer_rules[]` populated
- `state://AgentSpec.governance.scorer_suite.judge_questions[]` populated
- `{llm_role_endpoints.llm_judge_default.endpoint}` resolved

### Steps to Apply
1. New Coding Assistant thread, paste prompt.
2. AI registers builtin scorers (`safety`, `relevance`) with thresholds.
3. AI registers Guidelines from `governance.scorer_suite.guidelines[]`.
4. AI registers custom code-level scorers from `governance.scorer_suite.custom_scorer_rules[]`.
5. AI registers LLM judges from `governance.scorer_suite.judge_questions[]` — every `make_judge` call routes through the resolved `llm_judge_default` role binding.

---

## 2️⃣ What Are We Building?

This is the third step of the **Build the Quality Suite** phase of the MLflow SDLC arc (introduced in 49). We are registering the **scorer suite** — four families of scorers, each with explicit thresholds — that will grade every benchmark row produced in 50. Each family answers a different question and is implemented differently.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SCORER SUITE                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1) Builtin (Safety, Relevance, RetrievalGroundedness, Correctness)         │
│      │  fixed implementation, configurable threshold + sampling rate        │
│      │  e.g. safety: threshold 0.95, sampling 1.0                           │
│                                                                             │
│  2) Guidelines (free-text rules → judge prompt under the hood)              │
│      │  governance.scorer_suite.guidelines[] strings                        │
│      │  e.g. "Always include a citation when answering policy questions"    │
│                                                                             │
│  3) Custom code-level (deterministic Python @scorer)                        │
│      │  governance.scorer_suite.custom_scorer_rules[]                       │
│      │  e.g. assert response contains valid_currency_code                   │
│                                                                             │
│  4) LLM judges (make_judge -> routed via llm_judge_default role)            │
│      │  governance.scorer_suite.judge_questions[]                           │
│      │  e.g. "Does the response correctly resolve the user's intent?"       │
│      │  ALWAYS routed via {llm_role_endpoints.llm_judge_default.endpoint}   │
│      │   - NEVER raw {llm_endpoint}                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Concepts

| Concept | What It Means | Why It Matters |
|---------|---------------|----------------|
| **Builtin scorer** | First-party MLflow scorer (Safety, Relevance, RetrievalGroundedness, Correctness) | Battle-tested implementation; you only configure threshold + sampling |
| **Guidelines scorer** | Free-text English rule that becomes a judge prompt under the hood | Fastest path from a product policy to an enforced check |
| **Custom code scorer** | Deterministic Python `@scorer` function | Best for schema validation, regex, numeric ranges — no LLM needed |
| **LLM judge** | `make_judge` over a use-case-specific question | Best for nuanced quality questions ("did this resolve the user's intent?") |
| **`llm_judge_default` role** | Endpoint role binding that all judges route through | Lets you swap the judge model without touching any scorer code |
| **Threshold** | Numeric floor a scorer mean must clear | The first scored eval (52) compares means to thresholds to fire pass/regress gates |

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It's Used Here |
|----------|--------------------|
| **Builtin first** | Start with `safety` (threshold 0.95, 100% sampling) and `relevance` (threshold 0.8) before any custom work — they cover the L1 quality floor with zero implementation cost. |
| **Judge endpoint is a role, not a model** | `make_judge` routes via the `llm_judge_default` role binding; the actual model can change without rewriting scorers — same swap-without-redeploy story as `@production` aliases. |
| **Guidelines for fast wins** | Free-text rules from `governance.scorer_suite.guidelines[]` become judges automatically; faster than hand-coding a judge prompt for every product policy. |
| **Custom code for deterministic checks** | Schema validations, string matching, numeric ranges live as Python `@scorer` functions — never as LLM judges, where they would be slower and non-deterministic. |
| **Thresholds are gates** | Every scorer registers with an explicit threshold; the first scored eval (52) compares means against thresholds to fire pass/regress gates. |

---

## 4️⃣ What Happens Behind the Scenes?

When you paste the prompt, the AI walks five phases against `{mlflow_experiment_path}`:

| Phase | What the AI Does | Where It Writes |
|-------|------------------|-----------------|
| 1. Builtins | Register `safety` (0.95, 100% sampling) and `relevance` (0.8) | MLflow experiment scorer registry |
| 2. Guidelines | Convert `governance.scorer_suite.guidelines[]` strings into Guideline scorers | MLflow experiment scorer registry |
| 3. Custom code | Materialize `governance.scorer_suite.custom_scorer_rules[]` as `@scorer` functions | Agent codebase + scorer registry |
| 4. LLM judges | Convert `governance.scorer_suite.judge_questions[]` into `make_judge` scorers routed via `llm_judge_default` | MLflow experiment scorer registry |
| 5. Verify | Confirm every scorer is attached to `{mlflow_experiment_path}` with a threshold | Lint pass before gate exit |

### Gate Contract

| Reads gate | Produces gate | Captured state |
|------------|---------------|----------------|
| `≥ 20 benchmark rows; every user journey covered` (from `mlflow_evaluation_datasets`) | `Scorer suite registered with thresholds` | Scorers registered against `{mlflow_experiment_path}`; judges routed through `llm_judge_default` role |

</details>

<details><summary><strong>Expected Output</strong></summary>

### Resources Created
- [ ] All scorers from `governance.scorer_suite.*` registered against `{mlflow_experiment_path}` with thresholds
- [ ] Builtin `safety` scorer registered with threshold 0.95 and 100% sampling
- [ ] Builtin `relevance` scorer registered with threshold 0.8
- [ ] Every LLM judge call routes through the `llm_judge_default` role binding (NOT raw `{llm_endpoint}`)
- [ ] Tool-shaped scorers from `docs/agent_tool_plan.yaml.runtime_guardrails.tool_shaped_scorers[]` are registered conditionally — `RetrievalGroundedness` only with KA or Vector Search selected; `ka_citation_present` only with KA selected; `genie_*` only with Genie selected; `sql_*` only with SQL MCP selected; `uc_function_signature_match` only with UC Functions selected
- [ ] No tool-shaped scorer is registered for a tool family absent from `selected_tools[]`
- [ ] Scorers ready for the first scored eval at input_id 212

</details>

---

## Phase 1 / Build the Quality Suite — First Scored Eval + Iteration Entry

| Field | Value |
|-------|-------|
| `input_id` | `212` |
| `section_tag` | `mlflow_evaluation_runs_and_iteration` |
| `order_number` | `52` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Run mlflow.genai.evaluate against the benchmark table; capture failure-shape classification + routing decision (owns System Prompt Review preflight contract)_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

````
Run the first scored eval for the **{agent_app_name}** agent against the registered prompts + dataset + scorer suite, then route failures to the right iteration track (instruction → prompt iteration; retrieval → retrieval tuning; tool → fix). Today the agent has no scored eval signal; after this prompt runs, `mlflow.genai.evaluate()` has scored every benchmark row at `{lakehouse_default_catalog}.{db_schema}_agent.{agent_resource_prefix}_benchmarks`, the run is logged at `{mlflow_experiment_path}` with `mlflow.promptRegistryLocation` tagged, the per-scorer pass/fail table is captured, and the failure-shape classification routes the next iteration cycle.

This will involve the following steps:

- **Populate the System Prompt Review preflight** — author a worked example for every `agent.must_do[]` / `agent.must_not_do[]` clause and stamp `complete: true` BEFORE any benchmark runs
- **Run the scored eval** — call `mlflow.genai.evaluate()` against the benchmark table using the registered scorer suite from prompt 51 (which is itself the union of generic Spec scorers + tool-shaped Plan scorers — KA absent ⇒ no KA scorer ran)
- **Tag the run for traceability** — log the run under `{mlflow_experiment_path}` with `mlflow.promptRegistryLocation` so the eval can be tied back to the exact prompt versions
- **Classify the failure shape** — compute `failure_shape_classification.primary_shape` (instruction / tool_call_empty / retrieval / safety / other) and `safety_buffer` per scorer. `tool_call_empty` ONLY fires for tools present in `docs/agent_tool_plan.yaml.selected_tools[]`; tools absent from `selected_tools[]` cannot be the cause of a `tool_call_empty` failure (they were never wired)
- **Route the next iteration** — instruction-shape (no L1 failure) → Skill 08b prompt hand-authoring; tool-call-empty → Track A Skill 08 direct trace debug, scoped to the SPECIFIC selected tool that returned empty (not generic "tool failed"); retrieval → retrieval tuning ONLY if KA or Vector Search is in `selected_tools[]`; L1 floor breach → architecture redesign
- **Fire the either-or gate** — emit `Eval thresholds met` OR `Eval regressed — iterate` with the routing branch and full failure-shape schema captured into state

**How this prompt chains with the prior step (skill invocations):**

**Invoke skills (in order):**

1. `skills/vibecoding-state` op `enter` — params: `prompt_id: "mlflow_evaluation_runs_and_iteration"`, `require_prior_gate: {prompt_id: "mlflow_scorers_and_judges", gate: "Scorer suite registered with thresholds"}`.
   This prompt maps to the canonical `first_scored_eval` role. Before any benchmark run, `enter` MUST evaluate the following preflight checks (a halt unblocks only via a `state_overrides[]` entry with `gate_type: preflight_check` whose `affected_state_field` matches the failing clause):
   ```yaml
   preflight_checks:
     - system_prompt_review.complete == true
     - count(system_prompt_review.must_do_worked_examples) >= count(agent.must_do)
     - count(system_prompt_review.must_not_do_worked_examples) >= count(agent.must_not_do)
   ```
   The `## System Prompt Review` block in the live state file is populated by THIS prompt: read every `agent.must_do[]` clause and append a `must_do_worked_examples[]` entry with `rule`, `positive_example`, and `expected_behavior`; do the same for every `agent.must_not_do[]` clause into `must_not_do_worked_examples[]` with `rule`, `negative_example`, and `refusal_or_correction`. Set `complete: true`, stamp `reviewed_at` (ISO8601 UTC), and write `reviewed_by` (operator email). The audit MUST happen BEFORE step 2 (`@genai-agents/sdlc/04-evaluation-runs/SKILL.md`) runs.
2. @genai-agents/sdlc/04-evaluation-runs/SKILL.md — params:
   - `agent_name: "{agent_app_name}"`
   - `agent_tool_plan_ref: "docs/agent_tool_plan.yaml"`
   - `mlflow_experiment_path: "{mlflow_experiment_path}"`
   - `benchmarks_table: "{lakehouse_default_catalog}.{db_schema}_agent.{agent_resource_prefix}_benchmarks"`
   - `predict_fn_from_prompt: "track_a_agent_auth_memory"`
   - `scorer_suite_from_prompt: "mlflow_scorers_and_judges"`
   - `record_per_scorer_table: true`
   - The skill reads `docs/agent_tool_plan.yaml.selected_tools[]` to scope failure-shape classification — `primary_shape: tool_call_empty` and the `tool_call_empty` routing branch only fire for tools present in `selected_tools[]`. Tools that were never wired cannot fail.
3. `skills/vibecoding-state` op `exit` — params: `prompt_id: "mlflow_evaluation_runs_and_iteration"`, `gate: "<Eval thresholds met | Eval regressed — iterate>"`, `captured: {per_scorer_pass_fail_table, failing_scorers_if_regressed, failure_shape_classification, safety_buffer, predict_fn_exception_count, predict_fn_sentinel_count_per_run, judges_with_silent_aggregation_dropouts, mlflow_eval_predict_fn_signature}`.

**Captured failure-shape schema (mandatory in `captured` at `exit`):**

```yaml
failure_shape_classification:
  primary_shape: enum                # one of: instruction | tool_call_empty | retrieval | safety | other
  failing_scorers_if_regressed: [string]
  l1_failures: [string]              # L1 scorer names below floor (e.g. safety, relevance, correctness)
  failing_trace_ids:
    - trace_id: string
      failing_scorers: [string]
      predict_fn_status: string      # ok | exception | sentinel | dropout
safety_buffer:
  <scorer_name>: float               # mean - threshold (signed; negative = below floor)
predict_fn_exception_count: integer
predict_fn_sentinel_count_per_run: integer
judges_with_silent_aggregation_dropouts: [string]
mlflow_eval_predict_fn_signature: string
```

**Iteration routing (decision tree at `exit` when Gate is `Eval regressed — iterate`):**

1. If `l1_failures` is non-empty → route to **architecture / system-prompt redesign** (do NOT route to Skill 08b — instruction-only iteration cannot recover an L1 scorer that is below floor). Open the failure-shape redesign loop instead.
2. Else if `primary_shape == "instruction"` AND `l1_failures` is empty → route to @genai-agents/sdlc/08b-prompt-handauthoring/SKILL.md (the next prompt, `mlflow_logged_model_uc_registration`, gates step 2 on exactly this branch).
3. Else if `primary_shape == "tool_call_empty"` → route to @genai-agents/tracks/A-custom-agent-apps/08-debugging/SKILL.md (direct trace debugging), scoped to the specific tool from `selected_tools[]` that returned empty (the `failing_trace_ids[].failing_scorers` and `selected_tools[]` together identify which tool to debug — never "tool failed" in the generic).
4. Else if `primary_shape == "retrieval"` → route to **retrieval tuning** (chunking / embedding / top-k / filters in the KA tool or vector index). This route ONLY exists when KA or Vector Search is in `selected_tools[]`; if neither retrieval tool was selected, `primary_shape` cannot be `retrieval` and this branch never fires.
5. Else (`safety`, `other`) → escalate to the agent owner; do NOT auto-iterate.

**Gate:** either `Eval thresholds met` OR `Eval regressed — iterate` — record which scorers failed AND the routing branch fired (via `failure_shape_classification.primary_shape` and `l1_failures`); the next prompt (`mlflow_logged_model_uc_registration`) gates only the instruction-shaped, no-L1-failure branch via Skill 08b — direct tool/retrieval debugging or architecture redesign handles the rest.

> **Genie Code execution.** `mlflow.genai.evaluate()` runs via the MLflow SDK on serverless — on Genie Code invoke it directly via `executeCode`, exactly as the IDE/CLI flow runs it in‑session. **No job, no bundle.** Call `mlflow.set_experiment("{mlflow_experiment_path}")` first so the eval run + traces land in the agent's experiment. Inspect the run and per‑row traces with the native `search_runs` (`mlflow.runType = 'evaluation'`) / `get_trace` / `get_assessments` tools rather than re‑deriving. Run any incidental CLI step through `runDatabricksCli`. Use full clone‑rooted skill paths (`skills/...`), never bare `@`-mentions. See `skills/genie-code-environment`.
````

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## 1️⃣ How To Apply

Open a **new Agent thread in your Coding Assistant** and paste the prompt above. This is the entry point to the **iteration phase** of the SDLC arc — it grades the agent against the benchmark table, then either green-lights human review or hands off to the right iteration loop based on the captured `failure_shape_classification`.

### Prerequisite
- `Scorer suite registered with thresholds` gate captured in state (input_id 211)
- `## System Prompt Review` block in the state file ready to be populated (this prompt populates it)
- `state://AgentSpec.agent.must_do[]` and `state://AgentSpec.agent.must_not_do[]` populated

### Steps to Apply
1. New Coding Assistant thread, paste prompt.
2. AI populates the `## System Prompt Review` block with worked examples for every `agent.must_do[]` and `agent.must_not_do[]` clause, sets `complete: true`, stamps `reviewed_at` and `reviewed_by`.
3. Preflight checks gate the run: `system_prompt_review.complete == true` AND `count(must_do_worked_examples) >= count(agent.must_do)` AND `count(must_not_do_worked_examples) >= count(agent.must_not_do)`.
4. AI runs `mlflow.genai.evaluate` against `{lakehouse_default_catalog}.{db_schema}_agent.{agent_resource_prefix}_benchmarks` with the scorers from input_id 211; writes per-scorer pass/fail results.
5. AI captures `failure_shape_classification` + `safety_buffer` + `predict_fn_exception_count` + the rest of the failure-shape schema into state.
6. AI fires either `Eval thresholds met` (proceed to human review at input_id 213) OR `Eval regressed — iterate` (route via decision tree).

---

## 2️⃣ What Are We Building?

This is the closing step of the **Build the Quality Suite** phase of the MLflow SDLC arc (introduced in 49) and the entry to the iteration phase. We are running the first scored eval, then **classifying the failure shape** so the team enters the right iteration loop. Different shapes need different fixes — the routing decision tree below prevents wasted effort on the wrong loop.

```
First scored eval (mlflow.genai.evaluate vs benchmarks_table)
                     │
                     ▼
   ┌──────────────────────────────────────┐
   │ Per-scorer pass/fail table           │
   │ failure_shape_classification:        │
   │   primary_shape: instruction|        │
   │     tool_call_empty|retrieval|safety │
   │   l1_failures: [...]                 │
   │   safety_buffer: {scorer: mean - thr}│
   └────────────────────┬─────────────────┘
                        ▼
   ┌──────────────────────────────────────┐
   │ Routing decision tree (at exit):     │
   │                                      │
   │ if l1_failures non-empty:            │
   │   -> architecture / system-prompt    │
   │      redesign  (NOT 08b!)            │
   │                                      │
   │ elif primary_shape == instruction    │
   │   AND no L1 failure:                 │
   │   -> 08b prompt hand-authoring       │
   │                                      │
   │ elif primary_shape == tool_call_empty│
   │   -> Track A 08 direct trace debug   │
   │                                      │
   │ elif primary_shape == retrieval:     │
   │   -> retrieval tuning (chunking,     │
   │      embeddings, top-k, filters)     │
   │                                      │
   │ else (safety/other):                 │
   │   -> escalate to agent owner         │
   └──────────────────────────────────────┘
```

### Key Concepts

| Concept | What It Means | Why It Matters |
|---------|---------------|----------------|
| **System Prompt Review** | Preflight contract: every `must_do` / `must_not_do` clause has a worked example | Fails closed if missing — eval can't run on a half-specified system prompt |
| **`failure_shape_classification`** | Captured enum (`instruction / tool_call_empty / retrieval / safety / other`) | Routes the team to the loop that can actually fix the failure |
| **L1 failure** | Any L1 scorer (Safety / Relevance / Correctness) below its registered floor | Cannot be fixed by prompt iteration alone — escapes the 08b loop |
| **`safety_buffer`** | Map of `mean - threshold` per scorer (signed) | Negative values = below floor; positive values = headroom |
| **`predict_fn_exception_count`** | Hard exceptions raised by the agent during eval | Must be zero before drawing any quality conclusions |
| **Either-or gate** | `Eval thresholds met` OR `Eval regressed — iterate` | Only the first feeds promotion (54); the second loops via the decision tree |

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It's Used Here |
|----------|--------------------|
| **System-Prompt Review preflight** | Before any benchmark run, every `must_do[]` and `must_not_do[]` clause must have a worked example; preflight fails closed if missing — no benchmark on undertested intent. |
| **Failure shape determines the loop** | Instruction-shaped, tool-empty, retrieval, and safety failures need different fixes; routing prevents wasted iteration on the wrong loop. |
| **L1 failures escape 08b** | No amount of prompt hand-authoring fixes a Safety/Relevance/Correctness scorer that's *below* its registered floor; redesign is required, and the routing tree forces it. |
| **Captured failure-shape schema** | `failure_shape_classification`, `safety_buffer`, `predict_fn_exception_count` all land in state; later promotion gates read them rather than re-deriving. |
| **Either-or gate** | `Eval thresholds met` OR `Eval regressed — iterate`; the next prompt (54) gates promotion only on the first, so a regression cannot quietly slip into `@champion`. |

---

## 4️⃣ What Happens Behind the Scenes?

When you paste the prompt, the AI walks five phases:

| Phase | What the AI Does | Where It Writes |
|-------|------------------|-----------------|
| 1. System Prompt Review | Author worked examples for every `must_do[]` / `must_not_do[]` clause | `## System Prompt Review` block in `.vibecoding-state.md` |
| 2. Preflight checks | Assert `complete: true` AND example counts cover both lists | Hard halt if missing |
| 3. Scored eval | Run `mlflow.genai.evaluate` against `{benchmarks_table}` with scorers from 51 | `{mlflow_experiment_path}` per-scorer pass/fail table |
| 4. Capture shape | Compute `failure_shape_classification`, `safety_buffer`, exception counts | Captured state |
| 5. Fire gate | Emit `Eval thresholds met` OR `Eval regressed — iterate` (with route) | State exit + routing branch recorded |

### Gate Contract

| Reads gate | Produces gate | Captured state |
|------------|---------------|----------------|
| `Scorer suite registered with thresholds` (from `mlflow_scorers_and_judges`) | `Eval thresholds met` OR `Eval regressed — iterate` (with routing branch recorded) | `failure_shape_classification`, `safety_buffer`, `predict_fn_exception_count`, per-scorer pass/fail table |

</details>

<details><summary><strong>Expected Output</strong></summary>

### Resources Created
- [ ] `## System Prompt Review` block in state populated (`complete: true`, worked examples for every must_do / must_not_do clause)
- [ ] Per-scorer pass/fail table written under `{mlflow_experiment_path}`
- [ ] `failure_shape_classification.primary_shape` captured (`instruction | tool_call_empty | retrieval | safety | other`)
- [ ] `safety_buffer` map captured per scorer (mean − threshold, signed)
- [ ] `predict_fn_exception_count`, `predict_fn_sentinel_count_per_run`, `judges_with_silent_aggregation_dropouts` captured
- [ ] Gate fired: either `Eval thresholds met` OR `Eval regressed — iterate` with the routing branch recorded

</details>

---

## Phase 2 / Human Review — Labeling + Stakeholder Sign-Off (Expert-in-the-Loop)

| Field | Value |
|-------|-------|
| `input_id` | `213` |
| `section_tag` | `mlflow_human_review_and_signoff` |
| `order_number` | `53` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_SME labeling session syncs into benchmarks; stakeholder sign-off gate decides promotion (Decision: APPROVED hard-asserts downstream)_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Open the Human Review phase for the **{agent_app_name}** agent: stakeholders label/grade traces in MLflow's review UI, the sign-off `Decision: APPROVED` (or `REJECTED`) tag is set on the eval run at `{mlflow_experiment_path}`, and that decision becomes the gate to promote the candidate prompt versions. Today there is no human-graded signal beyond automated scorers; after this prompt runs, ≥ 10 production traces are SME-labeled, the labels sync back into `{lakehouse_default_catalog}.{db_schema}_agent.{agent_resource_prefix}_benchmarks`, and `{signoff_decision}` is captured into state from a stakeholder-signed `decision.md` at the ops volume.

This will involve the following steps:

- **Configure the labeling schema** — pre-fill reviewer role from `agent.reviewer_role` and bind the labeling session to `{mlflow_experiment_path}`
- **Send traces to stakeholders** — sample 15 production traces and route them through the MLflow labeling-session UI for SME pass/fail + `expectations` + `human_assessments`
- **Sync labels back into benchmarks** — write the SME labels into the benchmark table at `{lakehouse_default_catalog}.{db_schema}_agent.{agent_resource_prefix}_benchmarks` so the dataset grows
- **Materialize the regression subset** — tag the failing-trace subset `provenance: issue_failing_trace`, `regression_pass_rate: 1.0` so future evals never re-regress
- **Run the stakeholder sign-off gate** — generate the one-page metrics report + 5 failing / 5 passing walkthrough rows + compliance checklist
- **Aggregate into a `Decision: APPROVED | REJECTED` tag** — write `/Volumes/{lakehouse_default_catalog}/{db_schema}_ops/signoffs/v1/decision.md` with `rollback_trigger`
- **Capture sign-off as state** — persist `{signoff_decision}` for the promotion hard-assert in 54

**How this prompt chains with the prior step (skill invocations):**

**Invoke skills (in order):**

1. `skills/vibecoding-state` op `enter` — params: `prompt_id: "mlflow_human_review_and_signoff"`, `require_prior_gate: {prompt_id: "mlflow_evaluation_runs_and_iteration", gate: "Eval thresholds met | Eval regressed — iterate"}`.
2. @genai-agents/sdlc/04-evaluation-runs/SKILL.md op `labeling_session` — params:
   - `agent_name: "{agent_app_name}"`
   - `agent_spec_ref: "state://AgentSpec"`
   - `mlflow_experiment_path: "{mlflow_experiment_path}"`
   - `trace_sample_size: 15`
   - `sync_back_into: "{lakehouse_default_catalog}.{db_schema}_agent.{agent_resource_prefix}_benchmarks"`
   - `sync_fields: ["expectations", "human_assessments"]`
   - The skill reads `agent.reviewer_role` to pre-fill the labeling-session reviewer-role field.
3. @genai-agents/sdlc/02-evaluation-datasets/references/benchmark-generation.md section `11-issue-focused-subset` — params:
   - `source: "negative_feedback_traces"`
   - `tag: {provenance: "issue_failing_trace"}`
   - `regression_pass_rate: 1.0`
4. @genai-agents/sdlc/04b-stakeholder-signoff/SKILL.md — params:
   - `agent_name: "{agent_app_name}"`
   - `agent_spec_ref: "state://AgentSpec"`
   - `one_page_metrics_report: true`
   - `walkthrough_rows: {failing: 5, passing: 5, source: "latest_eval_run"}`
   - `compliance_checklist: true`
   - `decision_record_path: "/Volumes/{lakehouse_default_catalog}/{db_schema}_ops/signoffs/v1/decision.md"`
   - `required_fields: ["Decision: APPROVED", "rollback_trigger"]`
   - `capture_into_state: ["signoff_decision"]`
   - The skill reads `governance.monitoring.rollback_trigger_example` for the hint wording.
5. `skills/vibecoding-state` op `exit` — params: `prompt_id: "mlflow_human_review_and_signoff"`, `gate: "<Signoff APPROVED | Signoff REJECTED — block promotion>"`, `captured: {signoff_decision}`.

**Gate:** `Signoff APPROVED` (or `Signoff REJECTED — block promotion`) — decision markdown committed to the UC volume; CI promotion gates on `Decision: APPROVED`.

> **Genie Code execution.** The labeling setup + sync run via the MLflow SDK (`mlflow.genai.labeling` — confirmed available on Genie Code), but labeling itself is a **human step**. On Genie Code: (1) via `executeCode`, build the label schemas and call `create_labeling_session(name=..., label_schemas=[...])` (the `label_schemas` arg is REQUIRED), then `session.add_traces(<pandas DataFrame with a `trace_id` column>)` — a bare list silently no‑ops; (2) surface the **Review App URL** via `openAsset` and then **STOP** — the SME labels in the Review App UI; the agent does NOT label and does NOT proceed to sync until the operator confirms labeling is complete; (3) resume via `executeCode` with `session.sync(to_dataset=...)` then `merge_records_from_session(...)`. Pin the trace destination to `{mlflow_experiment_path}` so `add_traces` sees the right traces. Verify the session/schemas with the native `readAssetById(mlflowLabelingSchema)` / `list_labeling_sessions` tools. The `decision.md` write is an ordinary UC‑volume file write. **No job, no bundle.** Use full clone‑rooted skill paths (`skills/...`), never bare `@`-mentions. See `skills/genie-code-environment`.
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## 1️⃣ How To Apply

Open a **new Agent thread in your Coding Assistant** and paste the prompt above. The **expert-in-the-loop phase** of the SDLC story arc lands as two passes in one thread: SME labeling first, then the sign-off gate.

### Prerequisite
- `mlflow_evaluation_runs_and_iteration` gate captured in state (thresholds met or regression logged)
- ≥ 15 production traces accumulated at `{mlflow_experiment_path}`
- UC volume `/Volumes/{lakehouse_default_catalog}/{db_schema}_ops/signoffs/v1/` created (writable)

### Steps to Apply
1. New Coding Assistant thread, paste prompt.
2. AI launches the labeling session UI, samples 15 traces, hands off to the SME for labels.
3. AI syncs labels back into the benchmark table, materializes the issue-focused regression subset (`provenance: issue_failing_trace`).
4. AI generates the one-page metrics report + 10 walkthrough rows + compliance checklist; opens a review session.
5. Stakeholder writes the decision markdown to `/Volumes/{lakehouse_default_catalog}/{db_schema}_ops/signoffs/v1/decision.md` with `Decision: APPROVED` or `Decision: REJECTED`.

---

## 2️⃣ What Are We Building?

This is the **Human Review** phase of the MLflow SDLC arc (introduced in 49). One thread carries two sequential passes: the SME labeling session (which **grows the benchmark dataset**) and the stakeholder review (which **issues a sign-off artifact** that downstream promotion hard-asserts on).

```
Production traces from {mlflow_experiment_path}                 SME (labeling session UI)
       │                                                        ┌────────────────────┐
       ▼  sample 15                                             │ pass/fail          │
   ┌──────────────────────┐                                     │ expectations       │
   │ Labeling Session     │ ◀──── reviewer_role from spec ────  │ human_assessments  │
   └──────────────────────┘                                     └────────────────────┘
       │                                                                  │
       │ sync labels back into                                            │
       ▼                                                                  │
{lakehouse_default_catalog}.{db_schema}_agent.<benchmarks>                 │
   (expectations, human_assessments columns)                              │
       │                                                                  │
       │ + materialize regression subset                                  │
       ▼   (provenance: issue_failing_trace, regression_pass_rate: 1.0)   │
                                                                          │
                                                                          ▼
                                                            ┌────────────────────────────────┐
                                                            │ Stakeholder Review             │
                                                            │  - One-page metrics report     │
                                                            │  - 5 failing + 5 passing       │
                                                            │    walkthrough rows            │
                                                            │  - Compliance checklist        │
                                                            └────────────────────────────────┘
                                                                          │
                                                                          ▼
                                          /Volumes/{...}_ops/signoffs/v1/decision.md
                                          required:  Decision: APPROVED | REJECTED
                                                     rollback_trigger: <one line>
                                                                          │
                                                                          ▼
                                            Promotion (54) hard-asserts on
                                            Decision: APPROVED
```

### Key Concepts

| Concept | What It Means | Why It Matters |
|---------|---------------|----------------|
| **Labeling session** | SME-facing UI where 15 sampled traces are labeled with pass/fail + expectations | Labels write back into the benchmark table — the dataset grows automatically |
| **Regression subset** | Rows tagged `provenance: issue_failing_trace`, `regression_pass_rate: 1.0` | The "do not regress" contract — these must always pass on every future eval |
| **Stakeholder review** | One-page metrics + 10 walkthrough rows + compliance checklist | Forces a structured decision instead of a hallway "looks fine" |
| **`decision.md`** | Markdown artifact at `/Volumes/{...}_ops/signoffs/v1/decision.md` | CI hard-asserts on `Decision: APPROVED`; meeting notes don't gate prod |
| **`rollback_trigger`** | One-line condition (e.g. "safety < 0.90 for 3 evals") | Becomes a SQL alert in 56 — sign-off and monitoring share the same trigger language |
| **Two roles, one thread** | SME labels first, stakeholder signs second | Sequential passes in a single thread keep context tight |

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It's Used Here |
|----------|--------------------|
| **Labels grow the dataset** | SME labels write back into the same benchmark table from 50; the next eval run grades on the enriched dataset — no second labels store. |
| **Regression subset = "do not regress"** | Rows tagged `provenance: issue_failing_trace` must always pass (`regression_pass_rate: 1.0`); this is the contract that the team will never re-introduce known issues. |
| **Stakeholder sign-off is an artifact, not a meeting** | `decision.md` is committed to UC volume so CI can hard-assert on `Decision: APPROVED` — a meeting doesn't gate promotion. |
| **Rollback trigger is mandatory** | `rollback_trigger` is a one-line condition (e.g. "safety scorer mean drops below 0.90 for 3 consecutive evaluations") that the monitoring phase (56) wires as a SQL alert. |
| **Two roles, one thread** | SME labels first, stakeholder signs second; same prompt, sequential passes — the thread keeps the labels and the sign-off context together. |

---

## 4️⃣ What Happens Behind the Scenes?

When you paste the prompt, the AI walks seven phases across two roles:

| Phase | What the AI Does | Where It Writes |
|-------|------------------|-----------------|
| 1. Sample traces | Pull 15 traces from `{mlflow_experiment_path}` | Labeling session input |
| 2. SME labels | Run the labeling UI; SME applies pass/fail + expectations | Labels captured in MLflow |
| 3. Sync benchmarks | Write `expectations` + `human_assessments` back into benchmark table | `{...}_agent.{...}_benchmarks` |
| 4. Regression subset | Materialize rows with `provenance: issue_failing_trace` | Same benchmark table, tagged |
| 5. Stakeholder review | Generate one-page metrics + 5 failing + 5 passing rows + compliance checklist | Review session UI |
| 6. Write `decision.md` | Stakeholder commits `Decision: APPROVED|REJECTED` + `rollback_trigger` | `/Volumes/{lakehouse_default_catalog}/{db_schema}_ops/signoffs/v1/decision.md` |
| 7. Capture state | Persist `signoff_decision` for the promotion hard-assert in 54 | State file |

### Gate Contract

| Reads gate | Produces gate | Captured state |
|------------|---------------|----------------|
| `Eval thresholds met` OR `Eval regressed — iterate` (from `mlflow_evaluation_runs_and_iteration`) | `Signoff APPROVED` OR `Signoff REJECTED — block promotion` | `signoff_decision`; `decision.md` at the UC volume; regression subset tagged in benchmarks |

</details>

<details><summary><strong>Expected Output</strong></summary>

### Resources Created
- [ ] ≥ 10 traces SME-labeled; labels synced into benchmark table
- [ ] Regression subset created with `provenance: issue_failing_trace`
- [ ] One-page metrics report generated
- [ ] 5 failing + 5 passing walkthrough rows captured
- [ ] Sign-off decision markdown at `/Volumes/{lakehouse_default_catalog}/{db_schema}_ops/signoffs/v1/decision.md`
- [ ] `signoff_decision` captured in state

</details>

---

## Phase 3 / Promote with Governance — Logged Model + UC Registration

| Field | Value |
|-------|-------|
| `input_id` | `214` |
| `section_tag` | `mlflow_logged_model_uc_registration` |
| `order_number` | `54` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Optional 08b hand-author iteration on instruction-shaped failures, then log + register the agent at @champion in UC (gated on signoff_decision == APPROVED)_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Log the approved **{agent_app_name}** agent (binding of registered prompts + scorer suite + tool plan) as an MLflow model in Unity Catalog and pin the `@champion` alias. The logged model is the unit of promotion — every later environment promotes by alias move, not by re-deploying code. Today there is no UC-registered agent; after this prompt runs, `{lakehouse_default_catalog}.{db_schema}_agent.{agent_resource_prefix}` is registered, the `@champion` alias is set IFF eval scores match-or-beat the prior champion, and `{prompt_iteration_ran}` is captured (if the conditional Skill 08b hand-authoring branch fired).

This will involve the following steps:

- **Hard-assert sign-off** — refuse to advance unless `signoff_decision == APPROVED` from the prior human-review gate
- **(Optional) Run hand-authored prompt iteration** — if the prior eval was instruction-shaped with no L1 failure, run Skill 08b against the full eval dataset and promote `@staging` → `@production` IFF all target scorer means meet-or-beat baseline
- **Snapshot the agent code + dependencies** — capture the current code state (prompts, tools, scorer bindings) for reproducible logging
- **Log via `mlflow.pyfunc.log_model`** — log the agent with prompt-registry references and tool-plan refs in `metadata` so the model is self-describing
- **Register to UC** — register at `{lakehouse_default_catalog}.{db_schema}_agent.{agent_resource_prefix}` with `{llm_endpoint}` recorded in `metadata`
- **Pin `@champion` alias** — move the alias to the new version only when eval scores meet-or-beat the prior champion (promote-if-better, never blind)
- **Smoke-load from UC** — load the UC-registered model in a fresh thread to confirm the alias resolves and the model boots cleanly

If the prior scored eval (input_id 212) produced `Eval regressed — iterate` and the failure shape is *instruction-shaped*, run hand-authored prompt iteration first (Skill 08b against the full eval dataset). The default flow no longer routes to GEPA — Skill 08 (`08-prompt-optimization`) is an optional/advanced path retained only for operators who explicitly declare `prompt_iteration_strategy: gepa`.

**How this prompt chains with the prior step (skill invocations):**

**Invoke skills (in order):**

1. `skills/vibecoding-state` op `enter` — params: `prompt_id: "mlflow_logged_model_uc_registration"`, `require_prior_gate: {prompt_id: "mlflow_human_review_and_signoff", gate: "Signoff APPROVED"}`, `hard_assert: {var: "signoff_decision", equals: "APPROVED"}`.

2. **(Optional, only if `failing_scorers_if_regressed` is non-empty AND `failure_shape == instruction` AND no L1 scorer failure)** @genai-agents/sdlc/08b-prompt-handauthoring/SKILL.md — params:
   - `agent_spec_ref: "state://AgentSpec"`
   - `prompt_ref: "prompts:/{lakehouse_default_catalog}.{db_schema}_agent.system_instructions@production"`
   - `target_scorers: <from first_scored_eval failing_scorers_if_regressed>`
   - `rerun_prompt_role: "first_scored_eval"`
   - `write_alias: "@staging"`
   - `promote_if: "all_target_scorers_meet_or_beat_baseline_on_full_dataset"`
   - `promote_from: "@staging"`
   - `promote_to: "@production"`
   - `reflection_lm_role: "reflection_lm"`
   - `reflection_lm_endpoint: "{llm_role_endpoints.reflection_lm.endpoint}"` (the diff-summary helper routes through the resolved `reflection_lm` role binding — never the raw `{llm_endpoint}`)
   - `preflight_checks: ["reflection_lm_large_context_probe"]`
   - `capture_into_state: ["prompt_iteration_ran", "prompt_handauthoring_iterations", "prompt_handauthoring_template_diff_summaries"]`

3. @genai-agents/sdlc/05-logged-model-and-uc-registration/SKILL.md — params:
   - `agent_name: "{agent_app_name}"`
   - `uc_model: "{lakehouse_default_catalog}.{db_schema}_agent.{agent_resource_prefix}"`
   - `promotion_alias: "@champion"`
   - `promote_if: "eval_scores_ge_prior_champion"`

4. `skills/vibecoding-state` op `exit` — params: `prompt_id: "mlflow_logged_model_uc_registration"`, `gate: "@champion set"`, `captured: {prompt_iteration_ran}`.

**Gate:** `@champion set` — the agent is logged via `mlflow.models.log_model`, registered at `{lakehouse_default_catalog}.{db_schema}_agent.{agent_resource_prefix}`, and the `@champion` alias is moved to the new version IFF eval scores are ≥ the prior champion. Promotion is hard-asserted on `signoff_decision == APPROVED` from input_id 213.

> **Genie Code execution.** Logging + UC registration run via the MLflow SDK — on Genie Code run `mlflow.models.log_model` / `register_model` (+ `@champion` alias) directly via `executeCode` on serverless, exactly as the IDE/CLI flow runs them in‑session. **No job, no bundle resource required** (the native `register_model_to_uc` tool is also available). Call `mlflow.set_experiment("{mlflow_experiment_path}")` first; the UC model lands under the per‑user prefixed `{lakehouse_default_catalog}.{db_schema}_agent.{agent_resource_prefix}`. Verify with `list_artifacts` / `search_runs`. Run any incidental CLI step through `runDatabricksCli`. Use full clone‑rooted skill paths (`skills/...`), never bare `@`-mentions. See `skills/genie-code-environment`.
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## 1️⃣ How To Apply

Open a **new Agent thread in your Coding Assistant** and paste the prompt above. This carries the **iteration phase conclusion** (optional Skill 08b for instruction-shaped failures) plus the **logged model registration** at `@champion`. Hard-gated on `signoff_decision == APPROVED` from input_id 213.

### Prerequisite
- `Signoff APPROVED` gate captured in state from `mlflow_human_review_and_signoff` (input_id 213)
- `signoff_decision == APPROVED` populated in state (hard-asserted)
- UC volume `/Volumes/{lakehouse_default_catalog}/{db_schema}_ops/signoffs/v1/decision.md` exists with `Decision: APPROVED`
- `failure_shape_classification` captured from input_id 212 (drives the conditional Skill 08b branch)

### Steps to Apply
1. New Coding Assistant thread, paste prompt.
2. **(Conditional)** AI invokes hand-authored prompt iteration (Skill 08b) only if the prior scored eval left `failing_scorers_if_regressed` non-empty, the failure is instruction-shaped, and no L1 scorer failures are present; promotes from `@staging` to `@production` only if a full-dataset re-eval shows all target scorer means meet or beat baseline.
3. AI logs the model via `mlflow.models.log_model` and registers it at `@champion` in UC.
4. AI moves `@champion` alias only if eval scores meet or exceed the prior champion.

---

## 2️⃣ What Are We Building?

This is the opening step of the **Promote** phase of the MLflow SDLC arc (introduced in 49). Two things happen in one thread: (1) **conditional Skill 08b** prompt hand-authoring, only when the prior eval was instruction-shaped AND no L1 scorer failed, and (2) **UC `@champion` promotion**, hard-gated on `signoff_decision == APPROVED` from 53. Promotion is automatic when conditions hold but never blind — `@champion` only moves if eval scores match-or-beat the prior champion.

```
                       Eval regressed?
                              │
              ┌───────────────┴────────────────┐
              ▼ YES                            ▼ NO (Eval thresholds met)
      failure_shape == instruction
      AND no L1 failure?
              │
      ┌───────┴────────┐
      ▼ YES            ▼ NO
   Run Skill 08b   Skip 08b
   (hand-author    (architecture
    prompt iter,    redesign /
    promote          retrieval tuning /
    @staging ->      escalate per 52
    @production      decision tree)
    if all target
    scorers >=
    baseline)
      │                  │
      └──────────┬───────┘
                 ▼
   hard_assert: signoff_decision == APPROVED  (from 53)
                 │
                 ▼
   mlflow.models.log_model(...)
                 │
                 ▼
   register at {lakehouse_default_catalog}.{db_schema}_agent.{agent_resource_prefix}
                 │
                 ▼
   Move @champion alias IFF eval scores >= prior champion
```

### Key Concepts

| Concept | What It Means | Why It Matters |
|---------|---------------|----------------|
| **Conditional Skill 08b** | Prompt hand-authoring iteration, only on instruction-shaped failure with no L1 failure | Default iteration path; explainable diffs the team can review |
| **`signoff_decision == APPROVED`** | Hard-asserted gate value from 53's decision.md | Promotion refuses to advance on any other value, regardless of scorer means |
| **`mlflow.models.log_model(...)`** | Standard MLflow logging call, this time on the agent | Logged model is the artifact UC registers, the same surface as classical ML |
| **UC registration path** | `{lakehouse_default_catalog}.{db_schema}_agent.{agent_resource_prefix}` | Single canonical name across dev / staging / prod — version is what changes |
| **`@champion` alias** | Movable pointer to "the version live in production" | Promotion = alias move; rollback is one alias move back |
| **Promote-if-better** | `@champion` only moves when new version's eval scores ≥ prior champion's | Even after sign-off, no regression slips into prod |
| **`reflection_lm` role** | Endpoint role for the diff-summary helper used inside 08b | Same role-binding pattern as the eval judge; model swap is transparent |

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It's Used Here |
|----------|--------------------|
| **Sign-off hard-asserted** | `signoff_decision == APPROVED` is checked at gate enter; any other value blocks promotion regardless of scorer means — sign-off is the law, not a suggestion. |
| **08b is opt-in, not default** | Only fires when the prior eval was instruction-shaped AND no L1 scorer failed; otherwise the failure routes elsewhere (architecture, retrieval, escalate). |
| **Promote-if-better** | `@champion` only moves when new version's eval scores ≥ prior champion's; promotion is automatic when conditions are met but never blind. |
| **GEPA is opt-in only** | Skill 08 (`08-prompt-optimization`) is retained for advanced use; default flow uses hand-authoring (Skill 08b) for explainable diffs the team can read in review. |
| **`reflection_lm` role** | Diff-summary helper routes through the resolved `reflection_lm` role binding, never the raw `{llm_endpoint}` — same swap-without-redeploy story as judges. |

---

## 4️⃣ What Happens Behind the Scenes?

When you paste the prompt, the AI walks five phases:

| Phase | What the AI Does | Where It Writes |
|-------|------------------|-----------------|
| 1. Gate enter | Hard-assert `signoff_decision == APPROVED`; refuse if not | State entry check |
| 2. Conditional 08b | If instruction-shaped + no L1 failure: run prompt hand-authoring, promote `@staging` → `@production` IFF all target scorer means ≥ baseline on full dataset | UC prompt aliases |
| 3. Log model | `mlflow.models.log_model(...)` on the current agent | MLflow logged-model artifact |
| 4. Register at UC path | Register at `{lakehouse_default_catalog}.{db_schema}_agent.{agent_resource_prefix}` | UC model registry |
| 5. Move `@champion` | Move alias IFF new eval scores ≥ prior champion | UC model alias |

### Gate Contract

| Reads gate | Produces gate | Captured state |
|------------|---------------|----------------|
| `Signoff APPROVED` (hard-asserted; from `mlflow_human_review_and_signoff`) | `@champion set` | `prompt_iteration_ran`, `prompt_handauthoring_iterations`, `prompt_handauthoring_template_diff_summaries` (if 08b ran); UC `@champion` alias on the new version |

</details>

<details><summary><strong>Expected Output</strong></summary>

### Resources Created
- [ ] (If applicable) Hand-authored prompt iteration run (Skill 08b) with full-dataset re-eval; `@staging` promoted to `@production` only if all target scorer means meet or beat baseline
- [ ] `prompt_iteration_ran` captured in state
- [ ] `prompt_handauthoring_iterations` and `prompt_handauthoring_template_diff_summaries` captured (if Skill 08b ran)
- [ ] Model registered at `{lakehouse_default_catalog}.{db_schema}_agent.{agent_resource_prefix}@champion`
- [ ] `@champion` alias moved IFF eval scores meet or exceed prior champion

</details>

---

## Optional Hardening — Pre-Provisioned AI Gateway + Asset-Bundle Deployment

| Field | Value |
|-------|-------|
| `input_id` | `215` |
| `section_tag` | `mlflow_gateway_and_deployment` |
| `order_number` | `55` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Optional future governance layer: use a pre-provisioned AI Gateway endpoint or public admin APIs when available; core Track A does not depend on this step_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Front the **{agent_app_name}** agent's model endpoint with a pre-provisioned **AI Gateway** (PII + safety guardrails, rate limits, inference tables under `{lakehouse_default_catalog}.{db_schema}_ops.gw_*`) and deploy the whole agent app via Databricks Asset Bundles in one shot — `databricks bundle validate` + `databricks bundle deploy`. **This step is optional. Core Track A does not depend on this step** — run it only when a Gateway endpoint has been pre-provisioned by an admin or when public AI Gateway admin APIs are available. Today the agent calls the backing model endpoint directly via `runtime_config.llm`; after this prompt runs (when a Gateway is available), the agent routes through `{ai_gateway_endpoint}`, gateway inference tables capture every call joinable to MLflow traces via `databricks_request_id`, and DAB has materialized the deploy. If no Gateway is available, this prompt cleanly records `skipped_unavailable` and Track A continues on the raw model route.

This will involve the following steps:

- **Hard-assert sign-off** — refuse to deploy unless `decision.md` reads `Decision: APPROVED` from the human-review gate
- **Define the Gateway endpoint configuration** — set guardrails (PII + safety), per-user / per-endpoint rate limits, and inference-table targets under `{db_schema}_ops.gw_*`
- **Point `runtime_config.llm` at the Gateway** — update the agent's model route to `{ai_gateway_endpoint}` so no agent code changes are needed
- **Update `databricks.yml` resources** — declare the Gateway resource and the `{default_warehouse}` SQL warehouse needed for inference-table queries
- **Propagate the request-id header** — wire `databricks_request_id` from MLflow trace through Gateway inference tables for correlation
- **Validate + bundle-deploy** — run `databricks bundle validate` then `bundle deploy`; smoke-test the deployed endpoint behind the Gateway

**How this prompt chains with the prior step (skill invocations):**

**Invoke skills (in order):**

1. `skills/vibecoding-state` op `enter` — params: `prompt_id: "mlflow_gateway_and_deployment"`, `require_prior_gate: {prompt_id: "mlflow_logged_model_uc_registration", gate: "@champion set"}`, `hard_assert: {var: "signoff_decision", equals: "APPROVED"}`.

2. @genai-agents/foundation/04-ai-gateway/SKILL.md — params:
   - `mode: "preprovisioned_or_skip"`
   - `gateway_name: "{agent_app_name}-gateway"`
   - `backing_model: "{llm_role_endpoints.agent_chat.endpoint}"`
   - `required_precondition: "AI Gateway endpoint already exists OR public admin API is available"`
   - `skip_if_unavailable: true`
   - `capture_into_state: ["ai_gateway_endpoint", "ai_gateway_status"]`

3. @genai-agents/sdlc/06-deployment-and-automation/SKILL.md — params:
   - `agent_name: "{agent_app_name}"`
   - `tool: "databricks_asset_bundles"`
   - `customize: ["databricks.yml", "app.yaml"]`
   - `env: {MLFLOW_ACTIVE_MODEL_ID: "auto", LLM_GATEWAY_BASE_URL: "{ai_gateway_endpoint}", LLM_GATEWAY_MODEL: "{agent_app_name}-gateway"}`
   - `propagate_header: {name: "databricks_request_id", source: "mlflow_trace_request_id"}`
   - `block_promotion_if_missing: "/Volumes/{lakehouse_default_catalog}/{db_schema}_ops/signoffs/v1/decision.md :: 'Decision: APPROVED'"`
   - `warehouse_id: "{default_warehouse}"`

4. `skills/vibecoding-state` op `exit` — params: `prompt_id: "mlflow_gateway_and_deployment"`, `gate: "Optional gateway route configured or skipped"`, `captured: {ai_gateway_endpoint, ai_gateway_status, agent_app_url, agent_app_name}`.

**Gate:** `Optional gateway route configured or skipped` — if a pre-provisioned AI Gateway endpoint exists, the agent app is configured to use it and `ai_gateway_endpoint` is captured. If no endpoint or public admin API is available, the prompt records `ai_gateway_status: "skipped_unavailable"` and leaves the core Track A raw model route intact.

> **Genie Code execution.** This is a **deploy** step. On Genie Code follow the `99-mlflow_gateway_and_deployment.genie-code.md` fork (input_id 920): patch `databricks.yml` / `app.yaml` under `$AGENT_APP_ROOT`, then run `bundle deploy` via `runDatabricksCli` **from the bundle‑editor page** — the gateway resource + grants are the body of the bundle; never hand‑create them via `executeCode`/`spark.sql` or the REST API. SDK probes (endpoint reachability) run via `executeCode`. Use full clone‑rooted skill paths (`skills/...`), never bare `@`-mentions. See `skills/genie-code-environment`.
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## 1️⃣ How To Apply

Open a **new Agent thread in your Coding Assistant** and paste the prompt above. This wraps the registered agent in an AI Gateway and automates promotion via Databricks Asset Bundles. Promotion is hard-blocked unless the captured `signoff_decision` is `APPROVED`.

### Prerequisite
- `@champion set` gate captured in state from `mlflow_logged_model_uc_registration` (input_id 214)
- `signoff_decision == APPROVED` populated in state (hard-asserted)
- UC volume `/Volumes/{lakehouse_default_catalog}/{db_schema}_ops/signoffs/v1/decision.md` exists with `Decision: APPROVED`
- Default SQL warehouse ID resolved into `{default_warehouse}`

### Steps to Apply
1. New Coding Assistant thread, paste prompt.
2. AI provisions the AI Gateway endpoint with PII + safety guardrails and per-user rate limits.
3. AI customizes `databricks.yml` + `app.yaml` to point the agent at the gateway and propagate `databricks_request_id` for trace correlation.
4. AI verifies the deployment promotion is gated on the sign-off `decision.md`.

---

## 2️⃣ What Are We Building?

This is the **optional / future-facing** half of the **Promote** phase of the MLflow SDLC arc (introduced in 49). Core Track A works **without** AI Gateway — the agent calls the configured Model Serving endpoint directly. This prompt layers Gateway in only when an admin-provisioned endpoint or public admin APIs are available; otherwise it records `skipped_unavailable` and Track A continues unchanged.

```
                           Without AI Gateway (core Track A path)
                           ┌──────────────────────────────────────┐
                           │ Agent App                            │
                           │   config.yml: llm_endpoint =         │
                           │     databricks-claude-sonnet-4-6     │
                           │   ->  Direct Model Serving call      │
                           └──────────────────────────────────────┘

                           With AI Gateway (this prompt - optional)
                           ┌──────────────────────────────────────┐
                           │ Agent App                            │
                           │   config.yml: llm_endpoint =         │
                           │     {agent_app_name}-gateway         │
                           │   ->  AI Gateway endpoint            │
                           │              |                       │
                           │   Guardrails  (PII, safety = both)   │
                           │   Rate limits (120/min, 20/min/user) │
                           │   Inference tables under             │
                           │     {db_schema}_ops.gw_*             │
                           │              |                       │
                           │   ->  Backing model serving endpoint │
                           └──────────────────────────────────────┘

                           Switching: change runtime_config.llm.provider /
                                      endpoint / api_base_url; no agent code change.
```

### Key Concepts

| Concept | What It Means | Why It Matters |
|---------|---------------|----------------|
| **Optional / pre-provisioned** | Step runs only if Gateway endpoint or public admin API exists | Core Track A is unaffected — the gate emits `skipped_unavailable` and continues |
| **PII + safety guardrails** | Gateway-side filters (`mode: both`) on input and output | Pre-trained protections without re-implementing them in the agent |
| **Rate limits** | Endpoint cap (120/min) + per-user cap (20/min) | Bounds blast radius if a tool loops; protects backing model from runaway costs |
| **Inference tables** | Delta tables `{db_schema}_ops.gw_*` recording every request/response | Joinable to MLflow traces for governance and audit |
| **`databricks_request_id`** | Header propagated from MLflow trace through the Gateway | Single request id joins traces and gateway logs without custom plumbing |
| **DAB deploy** | Databricks Asset Bundles promote the app + gateway as one bundle | `databricks.yml` + `app.yaml` is the deploy contract — no inline edits |
| **Sign-off enforcement** | Bundle deploy step refuses unless `decision.md` reads `Decision: APPROVED` | Same hard-assert as 54 — sign-off enforces twice on the way to prod |

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It's Used Here |
|----------|--------------------|
| **Optional / pre-provisioned** | This prompt requires either an admin-provisioned Gateway endpoint or public admin APIs; if neither exists, it records `skipped_unavailable` and core Track A continues unchanged. |
| **Promotion blocked by sign-off** | DAB deploy step hard-blocks unless `decision.md` reads `Decision: APPROVED` — the same hard-assert as 54 enforces twice on the way to prod. |
| **Trace correlation header** | `databricks_request_id` propagates from the MLflow trace through Gateway inference tables, so a single request id joins traces and gateway logs. |
| **`databricks.yml` + `app.yaml` are the deploy contract** | Env vars, resources, and gateway URL all flow from the bundle; no inline edits in the deployed app — config drift can't sneak in. |
| **Inference tables for governance** | Every Gateway request lands in `{db_schema}_ops.gw_*` Delta tables, joinable to MLflow traces and benchmark labels for full auditability. |

---

## 4️⃣ What Happens Behind the Scenes?

When you paste the prompt, the AI walks six phases (with a short-circuit if Gateway is unavailable):

| Phase | What the AI Does | Where It Writes |
|-------|------------------|-----------------|
| 1. Gate enter | Hard-assert `signoff_decision == APPROVED`; refuse otherwise | State entry check |
| 2. Provision or skip | Use pre-provisioned Gateway OR record `ai_gateway_status: skipped_unavailable` | State capture |
| 3. Patch `databricks.yml` | Add Gateway resource, env, permissions | `$AGENT_APP_ROOT/databricks.yml` |
| 4. Patch `app.yaml` | Inject `LLM_GATEWAY_BASE_URL`, `LLM_GATEWAY_MODEL` | `$AGENT_APP_ROOT/app.yaml` |
| 5. Propagate request id | Wire `databricks_request_id` header from MLflow trace through Gateway | Agent-side header forwarding |
| 6. DAB deploy + verify | `databricks bundle deploy`; verify trace ↔ gateway correlation | Bundle deploy log |

### Gate Contract

| Reads gate | Produces gate | Captured state |
|------------|---------------|----------------|
| `@champion set` (from `mlflow_logged_model_uc_registration`) AND `signoff_decision == APPROVED` (hard-asserted) | `Optional gateway route configured or skipped` | `ai_gateway_endpoint`, `ai_gateway_status`, `agent_app_url`, `agent_app_name` |

</details>

<details><summary><strong>Expected Output</strong></summary>

### Resources Created
- [ ] AI Gateway `{agent_app_name}-gateway` live with inference-table rows under `{lakehouse_default_catalog}.{db_schema}_ops.gw_*`
- [ ] PII + safety guardrails enabled (`both`); rate limits 120/min endpoint, 20/min per-user
- [ ] DAB-driven deployment with `LLM_GATEWAY_BASE_URL` env wired
- [ ] `databricks_request_id` header propagated for trace ↔ gateway correlation
- [ ] Promotion hard-blocked unless `decision.md` reads `Decision: APPROVED`
- [ ] `ai_gateway_endpoint`, `agent_app_url`, `agent_app_name` captured in state

</details>

#### Fork — `coding_assistant = genie-code`  (input_id 920)

> Fork rows override only `input_template`, `system_prompt`, and `bypass_llm`. All display fields are inherited from the default row above.

| Field | Value |
|-------|-------|
| `input_id` | `920` |
| `section_tag` | `mlflow_gateway_and_deployment` |
| `order_number` | `(inherited)` |
| `coding_assistant` | `genie-code` |
| `bypass_llm` | `true` |

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Optionally front the agent's model route with a pre-provisioned AI Gateway and DAB-deploy the agent. Before this step the agent calls the model directly; after it, the gateway route is configured (or cleanly skipped) and the bundle is deployed.

This will involve the following steps:

- **Load the skills** — full `skill_ref_root`-prefixed paths.
- **Configure the gateway route or skip cleanly** — then patch the bundle (write files only).
- **DAB deploy** — from the bundle-editor page (only when not skipped).

The steps below are the prescriptive runbook for those actions; follow them in order.

**Genie Code — this is a prescriptive runbook. Follow the steps in order. Do NOT improvise paths, do NOT use bare relative paths, do NOT use `@`-mentions. This OPTIONAL step fronts the agent's model route with a PRE-PROVISIONED AI Gateway and DAB-deploys the agent app under `<AGENT_APP_ROOT>`. If no Gateway endpoint / public admin API exists, record `skipped_unavailable` and leave the raw route intact. Promotion is hard-blocked unless sign-off is APPROVED.**

### 🔴 Non-negotiable execution rules (read before anything)

❌ **NEVER provision an AI Gateway from scratch here** — this step is `preprovisioned_or_skip`. If neither a pre-provisioned Gateway endpoint nor a public admin API is available, capture `ai_gateway_status: "skipped_unavailable"` and exit cleanly. Core Track A is unaffected.

❌ **NEVER deploy by hand or via the Jobs/Permissions REST API, and NEVER apply the gateway/grants via `executeCode` or `spark.sql`.** The gateway resource + grants are the **body of the bundle** — `bundle deploy` IS the mechanism. Hand-applying them is an un-versioned drift that FAILS the gate. The DAB deploy runs `databricks bundle validate/deploy --target dev` via `runDatabricksCli` **only from the bundle-editor page** for `<AGENT_APP_ROOT>` (its `databricks.yml` makes that folder the `bundle deploy` page-context root). *blocked ≠ impossible — open the bundle editor and retry.* Those hand-apply routes are an **escape hatch available only if the operator explicitly authorizes it.**

✅ The things you run directly are (a) patching `<AGENT_APP_ROOT>/databricks.yml` + `app.yaml`, (b) `databricks bundle validate/deploy --target dev` via `runDatabricksCli` from the bundle-editor page, and (c) read-only trace↔gateway correlation checks.

### Step 0 — Resolve your environment (once, before anything else)

Run `skills/vibecoding-state` operation `enter` with `prompt_id: "mlflow_gateway_and_deployment"`, `require_prior_gate: {prompt_id: "mlflow_logged_model_uc_registration", gate: "@champion set"}`, and `hard_assert: {var: "signoff_decision", equals: "APPROVED"}`. Read these resolved values and use them literally:

- `client_context` = `genie_code`
- `artifact_root` = your workshop project root (e.g. `/Workspace/Users/<your-email>/vibe-coding-workshop`) — where all generated bundles/apps/docs build; the repo itself is cloned at `/Workspace/Users/<your-email>/.assistant/skills/vibe-coding-workshop` (skills load from there via `skill_ref_root`, NOT from `artifact_root`)
- `skill_ref_root` = `skills/vibe-coding-workshop` (substitute your clone folder if different)
- `agent_app_root` = `<artifact_root>/{agent_app_name}` — the top-level Track A agent app dir; its `databricks.yml` makes it the `bundle deploy` page-context root. Referred to below as `<AGENT_APP_ROOT>`.
- `bundle_deploy.verb` = `bundle deploy --target dev` (run via `runDatabricksCli` from the bundle-editor page)
- `default_warehouse` = `{default_warehouse}`
- Workspace: `{workspace_url}`

If `enter`'s `hard_assert` shows `signoff_decision != APPROVED`, STOP — promotion is blocked until the human-review gate approves. If `enter` has not run in this thread, run it now.

### Step 1 — Load the required skills by their FULL `skill_ref_root`-prefixed paths

Load each with `readSkillFile` using its `<skill_ref_root>`-prefixed path — NEVER a bare `@…` mention. **The root-level `skills/` come FIRST as the highest-priority guardrails.**

1. `readSkillFile("skills/vibe-coding-workshop/skills/genie-code-environment/SKILL.md")` — §4 (server-side build) + §8 (bundle-editor page-context deploy). Loading this flips the manifest-load gate.
2. `readSkillFile("skills/vibe-coding-workshop/skills/databricks-asset-bundles/SKILL.md")` — serverless YAML, `--target dev`, bundle-editor page-context rule. **You will not run any `bundle` command until you have read this.**
3. `readSkillFile("skills/vibe-coding-workshop/genai-agents/foundation/04-ai-gateway/SKILL.md")` — `mode: preprovisioned_or_skip`; capture `ai_gateway_endpoint` / `ai_gateway_status`.
4. `readSkillFile("skills/vibe-coding-workshop/genai-agents/sdlc/06-deployment-and-automation/SKILL.md")` — DAB customize of `databricks.yml`/`app.yaml`, the `databricks_request_id` header propagation, and the `decision.md :: Decision: APPROVED` promotion block.

Load every further reference the skills name the same way (prefix with `skill_ref_root`). `AGENTS.md` root context does not carry across Genie Code threads.

### Step 2 — Gateway route or clean skip, then patch the bundle (write files only)

- If a pre-provisioned Gateway endpoint (or public admin API) exists: point `runtime_config.llm` at `{ai_gateway_endpoint}`; patch `<AGENT_APP_ROOT>/databricks.yml` to declare the Gateway resource + the `{default_warehouse}` SQL warehouse; patch `<AGENT_APP_ROOT>/app.yaml` with `LLM_GATEWAY_BASE_URL` / `LLM_GATEWAY_MODEL` and the `databricks_request_id` header propagation. Capture `ai_gateway_endpoint` + `ai_gateway_status`.
- If none is available: capture `ai_gateway_status: "skipped_unavailable"`, change nothing else, and skip to the exit.

### Step 3 — DAB deploy from the bundle-editor page (only when not skipped)

`<AGENT_APP_ROOT>/databricks.yml` already exists, so surface the **bundle-editor link** and open it BEFORE any `bundle` command (build it with the pre-authenticated `w`: `host=w.config.host`, `o=w.get_workspace_id()`, `file_id=w.workspace.get_status("<AGENT_APP_ROOT>/databricks.yml").object_id`, `folder_id=w.workspace.get_status("<AGENT_APP_ROOT>").object_id` → `{host}/editor/files/{file_id}?o={o}&contextId=folder%3A{folder_id}`). From that page, via `runDatabricksCli` (omit `--profile`; do NOT `databricks sync`):
- `databricks bundle validate --target dev`
- `databricks bundle deploy --target dev`

Then verify (read-only) the trace↔gateway correlation: a `databricks_request_id` from an MLflow trace appears in the Gateway inference tables under `{lakehouse_default_catalog}.{db_schema}_ops.gw_*`.

**🛑 If a `bundle` command is blocked or fails**, you are NOT on the bundle page. A `databricks.yml not found` error or a "blocked by safety guardrails" message means the page CWD is wrong — open the bundle-editor link and retry (CONFIRMED: the same `bundle deploy` that is "blocked" from a file page succeeds from the bundle editor). **Do not fall back to direct SQL** or hand-apply the gateway/grants. If it STILL fails from the bundle editor, STOP and report. The hand-apply / REST routes are an **escape hatch available only if the operator explicitly authorizes it.**

**State-lock:** this prompt runs between an `enter` (Step 0) and an `exit`. After the gate passes, run `skills/vibecoding-state` op `exit` — params: `prompt_id: "mlflow_gateway_and_deployment"`, `gate: "Optional gateway route configured or skipped"`, `captured: {ai_gateway_endpoint, ai_gateway_status, agent_app_url, agent_app_name}`. **This `enter`/`exit` pair is a mandatory ritual, not advisory.** Step 0's `enter` MUST locate — or, if this is the first prompt of the track, bootstrap-create — the canonical live state file at `<agent_app_root>/.vibecoding-state.md` (never the temporary `example/…` bootstrap path). The closing `exit` MUST append this prompt's Per-Step Log entry, Gate result, and `captured` vars to that file, then **re-read it and echo the appended section to prove the write landed**. **Gate completion rule:** this prompt is NOT complete until that re-read confirms the appended entry — the chat summary is NOT the state store.

**Gate:** `Optional gateway route configured or skipped` — if a pre-provisioned Gateway exists, the agent routes through `{ai_gateway_endpoint}`, the DAB deploy ran via `bundle deploy` from the bundle-editor page, and `databricks_request_id` correlates traces to Gateway inference tables; otherwise `ai_gateway_status: "skipped_unavailable"` is recorded and the raw Track A route is left intact. When a gateway IS configured, the gateway/grants existing is **necessary but NOT sufficient** — if they were hand-applied (REST/`spark.sql`) instead of by `bundle deploy` from the bundle-editor page, the gate FAILS and you redo it via the bundle. Promotion proceeded only because `signoff_decision == APPROVED`.
```

---

## Phase 4 / Operate in Production — Monitoring and Agent-as-Judge Debugging

| Field | Value |
|-------|-------|
| `input_id` | `216` |
| `section_tag` | `mlflow_production_monitoring_and_debugging` |
| `order_number` | `56` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Configure continuous-eval sampling, ≥ 4 SQL alerts, and agent-as-judge auto-categorization that routes failure clusters to the right iteration track_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Stand up production monitoring + agent-as-judge debugging for the deployed **{agent_app_name}** agent. After this prompt runs, continuous-eval scorers sample production traces against the production scorer suite, ≥ 4 SQL alerts watch quality drift, and `agent_failure_root_cause` annotations are written automatically on low-scoring traces — closing the SDLC arc by routing each failure cluster to the right iteration track.

This will involve the following steps:

- **Configure continuous-eval sampling** — sample production OTel traces under `{lakehouse_default_catalog}.{db_schema}_ops.{agent_resource_prefix}_otel_*` against the `production_scorers[]` from `governance.scorer_suite`
- **Wire ≥ 4 SQL alerts** — materialize alerts from `governance.monitoring.required_alerts[]` plus the section 6b recipes in `references/monitoring-dashboard-queries.md` so quality drift surfaces within minutes
- **Run the agent-as-judge categorizer** — filter trace assessments at `value < 0.7` over a 7d window, write `agent_failure_root_cause` annotations through the `failure_categorizer` role (never raw `{llm_endpoint}`)
- **Cluster the top 5 failure shapes** — group annotations into clusters and pick the top 5 by frequency
- **Route each cluster to its follow-up track** — instruction → queue_prompt_optimization; retrieval → queue_retrieval_tuning; tool → queue_tool_fix
- **Capture observed alert + annotation state** — record `production_alerts_configured` and `agent_failure_root_cause_writes_observed` so the SDLC arc closes with verifiable monitoring on

**How this prompt chains with the prior step (skill invocations):**

**Invoke skills (in order):**

1. `skills/vibecoding-state` op `enter` — params: `prompt_id: "mlflow_production_monitoring_and_debugging"`, `require_prior_gate: {prompt_id: "mlflow_gateway_and_deployment", gate: "gateway live; DAB-deployed"}`.

2. @genai-agents/sdlc/07-production-monitoring/SKILL.md — params:
   - `agent_name: "{agent_app_name}"`
   - `agent_spec_ref: "state://AgentSpec"`
   - `otel_prefix: "{lakehouse_default_catalog}.{db_schema}_ops.{agent_resource_prefix}_otel_"`
   - `alerts_from_reference: {path: "references/monitoring-dashboard-queries.md", section: "6b"}`
   - The skill reads `governance.scorer_suite.production_scorers[]` for continuous-eval sampling and `governance.monitoring.required_alerts[]` for the alert set.

3. @genai-agents/tracks/A-custom-agent-apps/08-debugging/SKILL.md section `agent-as-judge-debugging` — params:
   - `agent_name: "{agent_app_name}"`
   - `agent_spec_ref: "state://AgentSpec"`
   - `categorizer_endpoint: "{llm_role_endpoints.failure_categorizer.endpoint}"` (the `make_judge` failure-categorizer call routes through the resolved `failure_categorizer` role binding — never the raw `{llm_endpoint}`)
   - `otel_annotations_table: "{lakehouse_default_catalog}.{db_schema}_ops.{agent_resource_prefix}_otel_annotations"`
   - `filter: {value_lt: 0.7, window: "7d"}`
   - `write_assessment: "agent_failure_root_cause"`
   - `cluster_top_n: 5`
   - `action_routing: {instruction: "queue_prompt_optimization", retrieval: "queue_retrieval_tuning", tool: "queue_tool_fix"}`
   - The skill reads `governance.scorer_suite.primary_scorer` to set `filter.assessment_name`.

4. `skills/vibecoding-state` op `exit` — params: `prompt_id: "mlflow_production_monitoring_and_debugging"`, `gate: "alerts wired; agent-as-judge running"`, `captured: {production_alerts_configured, agent_failure_root_cause_writes_observed}`.

**Gate:** `alerts wired; agent-as-judge running` — continuous-eval scorers sampling production traces against `governance.scorer_suite.production_scorers[]`, ≥ 4 SQL alerts configured (drawn from `governance.monitoring.required_alerts[]` and the `references/monitoring-dashboard-queries.md` section `6b` recipes), and `agent_failure_root_cause` rows being written to `{lakehouse_default_catalog}.{db_schema}_ops.{agent_resource_prefix}_otel_annotations` on low-scoring traces, with each cluster dispatched to the correct follow-up track (instruction → prompt iteration; retrieval → retrieval tuning; tool → tool fix).

> **Genie Code execution.** **Hybrid step** (SDK scorers + a bundle‑deployed monitoring job). On Genie Code follow the `99-mlflow_production_monitoring_and_debugging.genie-code.md` fork (input_id 921): the continuous‑eval scorers and agent‑as‑judge categorizer register via `executeCode` (verify with `get_scheduled_scorers`), but the periodic **trace‑archival / backfill job** is a bundle `jobs` resource — deploy it via `runDatabricksCli` `bundle deploy` **from the bundle‑editor page**, never hand‑create it. Inspect production traces with `search_traces` / `get_trace_metrics` / `get_assessments`. See `skills/genie-code-environment`.
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## 1️⃣ How To Apply

Open a **new Agent thread in your Coding Assistant** and paste the prompt above. This stands up production monitoring and agent-as-judge debugging on the deployed agent. The agent SDLC story arc loops back from here — debugging clusters route directly into the iteration track that fits the failure shape (prompt iteration, retrieval tuning, or tool fix).

### Prerequisite
- `gateway live; DAB-deployed` gate captured in state from `mlflow_gateway_and_deployment` (input_id 215)
- `state://AgentSpec.governance.scorer_suite.production_scorers[]` populated
- `state://AgentSpec.governance.scorer_suite.primary_scorer` populated
- `state://AgentSpec.governance.monitoring.required_alerts[]` populated
- `references/monitoring-dashboard-queries.md` section `6b` available for SQL alert recipes
- Production traffic flowing through the gateway-fronted endpoint (so OTel tables have rows to score)

### Steps to Apply
1. New Coding Assistant thread, paste prompt.
2. AI configures continuous-eval sampling against `production_scorers[]`.
3. AI generates ≥ 4 SQL alerts from the `required_alerts[]` list and the section `6b` recipes.
4. AI stands up agent-as-judge debugging that writes `agent_failure_root_cause` rows to OTel annotations on failing production traces and dispatches each cluster to the right follow-up track.

---

## 2️⃣ What Are We Building?

This is the **Operate in Production** phase of the MLflow SDLC arc (introduced in 49) — and it loops back to the iteration phase. Production traffic flows into OTel tables; three things consume those tables in parallel: continuous-eval scorer sampling, ≥ 4 SQL alerts, and **agent-as-judge** debugging that auto-classifies low-scoring traces into clusters and routes each cluster back into the right iteration track.

```
Production traffic ──> OTel tables in {db_schema}_ops.<otel_*>
                              │
              ┌───────────────┼───────────────────┐
              ▼               ▼                   ▼
   Continuous-eval    SQL Alerts (>=4)    Agent-as-judge debug
   sampling against   from required_      (filter: value < 0.7,
   production_        alerts[] +          window: 7d)
   scorers[]          section 6b recipes         │
              │               │                   ▼
              │               │         Categorizer judge
              │               │         (failure_categorizer role)
              │               │                   │
              │               │                   ▼
              │               │         agent_failure_root_cause
              │               │         rows in <otel_*_annotations>
              │               │                   │
              │               │                   ▼
              │               │         Cluster top N + route:
              │               │           instruction -> queue prompt iter
              │               │           retrieval   -> queue retrieval tuning
              │               │           tool        -> queue tool fix
              ▼               ▼                   │
        MLflow trace UI / dashboards / alerts <───┘
                          │
                          ▼ on regression
                Trigger rollback per
                rollback_trigger from 53
```

### Key Concepts

| Concept | What It Means | Why It Matters |
|---------|---------------|----------------|
| **Continuous-eval sampling** | Production traces sampled against `production_scorers[]` on a rolling basis | Same scorer suite as 51, now grading prod — alerts fire on rolling means |
| **`required_alerts[]`** | List of mandatory SQL alerts from the AgentSpec | Source of truth for "what must be alerted on" — not optional |
| **Section 6b recipes** | Reference SQL templates from `monitoring-dashboard-queries.md` | Battle-tested alert queries — copy-paste, don't invent |
| **Agent-as-judge** | A judge that categorizes the *cause* of a failing trace | Replaces human-triages-everything with auto-clustering + routing |
| **`failure_categorizer` role** | Endpoint role binding the categorizer judge resolves through | Same model-swap discipline as eval judges; no raw `{llm_endpoint}` |
| **`agent_failure_root_cause`** | Annotation rows written to OTel annotation table | Cluster + route input; queryable like any other Delta table |
| **`rollback_trigger`** | One-line condition from 53's `decision.md` | Wired here as a SQL alert; if it fires, deployment auto-rolls back |

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It's Used Here |
|----------|--------------------|
| **Continuous eval ≠ one-shot** | Production traces are sampled against `production_scorers[]` continuously, not in batches; alerts fire on rolling means so regressions surface within minutes, not days. |
| **≥ 4 SQL alerts mandatory** | Drawn from `governance.monitoring.required_alerts[]` plus the section 6b recipes in `monitoring-dashboard-queries.md` — every prod agent gets the same minimum coverage. |
| **Agent-as-judge for triage** | Instead of humans triaging every low-score trace, a categorizer judge auto-classifies failure clusters and routes each cluster to the right loop (instruction / retrieval / tool). |
| **Categorizer is a role binding** | `failure_categorizer` role, NEVER raw `{llm_endpoint}`; same model-swap discipline as the eval judges in 51. |
| **Rollback trigger is real** | The `rollback_trigger` line from the 53 sign-off becomes a configured SQL alert; if it fires, deployment auto-rolls back to the prior `@champion`. |

---

## 4️⃣ What Happens Behind the Scenes?

When you paste the prompt, the AI walks six phases:

| Phase | What the AI Does | Where It Writes |
|-------|------------------|-----------------|
| 1. Sample production scorers | Configure continuous-eval sampling against `production_scorers[]` | MLflow scorer scheduler |
| 2. Configure ≥ 4 SQL alerts | Materialize alerts from `required_alerts[]` + section 6b recipes | Databricks SQL alerts |
| 3. Stand up agent-as-judge | Wire `failure_categorizer` role with filter `value < 0.7` over 7d window | OTel annotation pipeline |
| 4. Write `agent_failure_root_cause` | Categorizer writes rows to `{...}_ops.{...}_otel_annotations` on failing traces | OTel annotation table |
| 5. Cluster top N | Group annotations into clusters, pick top 5 | Cluster summary table |
| 6. Dispatch | Route per cluster: instruction → queue_prompt_optimization, retrieval → queue_retrieval_tuning, tool → queue_tool_fix | Iteration queues |

### Gate Contract

| Reads gate | Produces gate | Captured state |
|------------|---------------|----------------|
| `gateway live; DAB-deployed` (from `mlflow_gateway_and_deployment`) | `alerts wired; agent-as-judge running` | `production_alerts_configured`, `agent_failure_root_cause_writes_observed` |

</details>

<details><summary><strong>Expected Output</strong></summary>

### Resources Created
- [ ] Continuous-eval scorers sampling production traces against `production_scorers[]`
- [ ] ≥ 4 SQL alerts configured for production scorers (from `required_alerts[]` and section `6b` recipes)
- [ ] `agent_failure_root_cause` rows being written to `{lakehouse_default_catalog}.{db_schema}_ops.{agent_resource_prefix}_otel_annotations`
- [ ] Failure clusters routed: instruction → queue_prompt_optimization, retrieval → queue_retrieval_tuning, tool → queue_tool_fix
- [ ] `production_alerts_configured`, `agent_failure_root_cause_writes_observed` captured in state

</details>

#### Fork — `coding_assistant = genie-code`  (input_id 921)

> Fork rows override only `input_template`, `system_prompt`, and `bypass_llm`. All display fields are inherited from the default row above.

| Field | Value |
|-------|-------|
| `input_id` | `921` |
| `section_tag` | `mlflow_production_monitoring_and_debugging` |
| `order_number` | `(inherited)` |
| `coding_assistant` | `genie-code` |
| `bypass_llm` | `true` |

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Operate the deployed agent — wire continuous evaluation, trace archival, and alerts. Before this step the agent has no production observability; after it, SDK scorers plus an agent-as-judge run, a trace-archival job is deployed, and at least four SQL alerts are wired.

This will involve the following steps:

- **Load the skills** — full `skill_ref_root`-prefixed paths.
- **Run SDK scorers and agent-as-judge** — via `executeCode`.
- **Deploy the trace-archival / backfill job** — from the bundle-editor page.
- **Wire SQL alerts** — at least four, via `runDatabricksCli`.

The steps below are the prescriptive runbook for those actions; follow them in order.

**Genie Code — this is a prescriptive runbook. Follow the steps in order. Do NOT improvise paths, do NOT use bare relative paths, do NOT use `@`-mentions. This is the Operate phase for the deployed **{agent_app_name}** agent. It is HYBRID: the continuous-eval scorers and the agent-as-judge categorizer register via the in-session MLflow SDK (`executeCode`), but the periodic trace-archival / backfill job is a bundle `jobs` resource that deploys via `bundle deploy` from the bundle-editor page.**

### 🔴 Non-negotiable execution rules (read before anything)

❌ **The scorers and the categorizer are SDK objects — register them via `executeCode`** (`scorer.register()`/`.start()`, `make_judge`). Set `mlflow.set_experiment("{mlflow_experiment_path}")` first. Verify them with the native `get_scheduled_scorers` tool. Every `make_judge` failure-categorizer call routes through the resolved `failure_categorizer` role binding — **never** the raw `{llm_endpoint}`.

❌ **NEVER hand-create the trace-archival / backfill job, and NEVER apply it via `executeCode` or `spark.sql`.** The job is the **body of the bundle** — `bundle deploy` IS the mechanism that creates it. Hand-creating it (Jobs REST, `executeCode`, `spark.sql`) is an un-versioned drift with no `bundle destroy` cleanup and FAILS the gate. **Do not fall back to direct SQL** to fake the job. That route is an **escape hatch available only if the operator explicitly authorizes it.**

✅ The things you run directly are (a) `executeCode` for the SDK scorers + agent-as-judge categorizer, (b) patching `<AGENT_APP_ROOT>/databricks.yml` to declare the archival `jobs` resource, (c) `databricks bundle validate/deploy --target dev` via `runDatabricksCli` from the bundle-editor page, (d) the ≥ 4 SQL alerts via `runDatabricksCli`, and (e) read-only trace inspection.

### Step 0 — Resolve your environment (once, before anything else)

Run `skills/vibecoding-state` operation `enter` with `prompt_id: "mlflow_production_monitoring_and_debugging"`, `require_prior_gate: {prompt_id: "mlflow_gateway_and_deployment", gate: "Optional gateway route configured or skipped"}`. Read these resolved values and use them literally:

- `client_context` = `genie_code`
- `artifact_root` = your workshop project root (e.g. `/Workspace/Users/<your-email>/vibe-coding-workshop`) — where all generated bundles/apps/docs build; the repo itself is cloned at `/Workspace/Users/<your-email>/.assistant/skills/vibe-coding-workshop` (skills load from there via `skill_ref_root`, NOT from `artifact_root`)
- `skill_ref_root` = `skills/vibe-coding-workshop` (substitute your clone folder if different)
- `agent_app_root` = `<artifact_root>/{agent_app_name}` — the top-level Track A agent app dir; its `databricks.yml` makes it the `bundle deploy` page-context root. Referred to below as `<AGENT_APP_ROOT>`.
- `mlflow_experiment_path` = `{mlflow_experiment_path}` (set this before any SDK scorer call)
- `otel_prefix` = `{lakehouse_default_catalog}.{db_schema}_ops.{agent_resource_prefix}_otel_`
- `bundle_deploy.verb` = `bundle deploy --target dev` (run via `runDatabricksCli` from the bundle-editor page)
- Workspace: `{workspace_url}`

If `enter` has not run in this thread, run it now.

### Step 1 — Load the required skills by their FULL `skill_ref_root`-prefixed paths

Load each with `readSkillFile` using its `<skill_ref_root>`-prefixed path — NEVER a bare `@…` mention. **The root-level `skills/` come FIRST as the highest-priority guardrails.**

1. `readSkillFile("skills/vibe-coding-workshop/skills/genie-code-environment/SKILL.md")` — §4 (server-side build) + §8 (bundle-editor page-context deploy). Loading this flips the manifest-load gate.
2. `readSkillFile("skills/vibe-coding-workshop/skills/databricks-asset-bundles/SKILL.md")` — serverless `jobs` YAML, `--target dev`, bundle-editor page-context rule. **You will not run any `bundle` command until you have read this.**
3. `readSkillFile("skills/vibe-coding-workshop/genai-agents/sdlc/07-production-monitoring/SKILL.md")` — continuous-eval sampling against `governance.scorer_suite.production_scorers[]`, the ≥ 4 SQL alerts from `governance.monitoring.required_alerts[]` + the `references/monitoring-dashboard-queries.md` section `6b` recipes, and the trace-archival/backfill `jobs` bundle resource.
4. `readSkillFile("skills/vibe-coding-workshop/genai-agents/tracks/A-custom-agent-apps/08-debugging/SKILL.md")` section `agent-as-judge-debugging` — the `failure_categorizer` judge, `filter {value_lt: 0.7, window: "7d"}`, `agent_failure_root_cause` writes to `{lakehouse_default_catalog}.{db_schema}_ops.{agent_resource_prefix}_otel_annotations`, top-5 clustering, and the `{instruction: queue_prompt_optimization, retrieval: queue_retrieval_tuning, tool: queue_tool_fix}` routing.

Load every further reference the skills name the same way (prefix with `skill_ref_root`). `AGENTS.md` root context does not carry across Genie Code threads.

### Step 2 — SDK scorers + agent-as-judge categorizer (run via `executeCode`)

- Configure continuous-eval sampling of production OTel traces under `{lakehouse_default_catalog}.{db_schema}_ops.{agent_resource_prefix}_otel_*` against `governance.scorer_suite.production_scorers[]`; register/schedule the scorers with `scorer.register()`/`.start()`. Verify with the native `get_scheduled_scorers` tool.
- Stand up the agent-as-judge categorizer: a `make_judge` routed through `{llm_role_endpoints.failure_categorizer.endpoint}` (never raw `{llm_endpoint}`), filtering trace assessments at `value < 0.7` over a 7d window, writing `agent_failure_root_cause` annotations to `{lakehouse_default_catalog}.{db_schema}_ops.{agent_resource_prefix}_otel_annotations`, clustering the top 5 failure shapes, and routing each cluster (instruction → queue_prompt_optimization; retrieval → queue_retrieval_tuning; tool → queue_tool_fix).

### Step 3 — Deploy the trace-archival / backfill job from the bundle-editor page

Patch `<AGENT_APP_ROOT>/databricks.yml` to declare the periodic trace-archival / backfill **`jobs`** resource (write the file only). `<AGENT_APP_ROOT>/databricks.yml` already exists, so surface the **bundle-editor link** and open it BEFORE any `bundle` command (build it with the pre-authenticated `w`: `host=w.config.host`, `o=w.get_workspace_id()`, `file_id=w.workspace.get_status("<AGENT_APP_ROOT>/databricks.yml").object_id`, `folder_id=w.workspace.get_status("<AGENT_APP_ROOT>").object_id` → `{host}/editor/files/{file_id}?o={o}&contextId=folder%3A{folder_id}`). From that page, via `runDatabricksCli` (omit `--profile`; do NOT `databricks sync`):
- `databricks bundle validate --target dev`
- `databricks bundle deploy --target dev`

**🛑 If a `bundle` command is blocked or fails**, you are NOT on the bundle page. A `databricks.yml not found` error or a "blocked by safety guardrails" message means the page CWD is wrong — open the bundle-editor link and retry (CONFIRMED: the same `bundle deploy` that is "blocked" from a file page succeeds from the bundle editor). **Do not fall back to direct SQL** or hand-create the job. If it STILL fails from the bundle editor, STOP and report. The hand-create / Jobs-REST routes are an **escape hatch available only if the operator explicitly authorizes it.**

### Step 4 — SQL alerts (≥ 4) via `runDatabricksCli`

Materialize ≥ 4 SQL alerts from `governance.monitoring.required_alerts[]` plus the section `6b` recipes in `references/monitoring-dashboard-queries.md` (including the `rollback_trigger` from the 53 sign-off). Inspect production traces read-only with the native `search_traces` / `get_trace_metrics` / `get_assessments` tools to confirm the scorers and annotations are landing.

**State-lock:** this prompt runs between an `enter` (Step 0) and an `exit`. After the gate passes, run `skills/vibecoding-state` op `exit` — params: `prompt_id: "mlflow_production_monitoring_and_debugging"`, `gate: "alerts wired; agent-as-judge running"`, `captured: {production_alerts_configured, agent_failure_root_cause_writes_observed}`. **This `enter`/`exit` pair is a mandatory ritual, not advisory.** Step 0's `enter` MUST locate — or, if this is the first prompt of the track, bootstrap-create — the canonical live state file at `<agent_app_root>/.vibecoding-state.md` (never the temporary `example/…` bootstrap path). The closing `exit` MUST append this prompt's Per-Step Log entry, Gate result, and `captured` vars to that file, then **re-read it and echo the appended section to prove the write landed**. **Gate completion rule:** this prompt is NOT complete until that re-read confirms the appended entry — the chat summary is NOT the state store.

**Gate:** `alerts wired; agent-as-judge running` — continuous-eval scorers (registered via `executeCode`, confirmed via `get_scheduled_scorers`) sample production traces against `governance.scorer_suite.production_scorers[]`; ≥ 4 SQL alerts are configured; the trace-archival/backfill job was deployed via `bundle deploy` from the bundle-editor page; and `agent_failure_root_cause` rows are written to `{lakehouse_default_catalog}.{db_schema}_ops.{agent_resource_prefix}_otel_annotations` on low-scoring traces, each cluster dispatched to the right track. The job/alerts existing is **necessary but NOT sufficient** — if the archival job was hand-created (REST/`spark.sql`/`executeCode`) instead of by `bundle deploy` from the bundle-editor page, the gate FAILS and you redo it via the bundle.
```

---
