# Agent Bricks & Agent App Track

Spec and build agents: Agent Bricks (Knowledge Assistant), UC resource foundation, the Track-A agent app, and the AppKit chat surface.

> Auto-generated from `02_seed_section_input_prompts.sql`. Each section below corresponds to one `section_tag` in the workshop builder's `section_input_prompts` table.

## Sections in this category

| Step (order) | Section | `section_tag` | Forks |
|---|---|---|---|
| 38 | [Agent Spec Design](#agent-spec-design) | `agent_spec_design` | — |
| 39 | [Agent Tool Selection](#agent-tool-selection) | `agent_tool_selection` | — |
| 40 | [Phase 1 / Agent Foundation — UC Resources Foundation](#phase-1-agent-foundation-uc-resources-foundation) | `uc_resources_foundation` | — |
| 42 | [Phase 1 / Agent Foundation — Create Knowledge Assistant](#phase-1-agent-foundation-create-knowledge-assistant) | `knowledge_assistant_create` | genie-code |
| 43 | [Phase 2 / Agent Build — Clone + Framework](#phase-2-agent-build-clone-framework) | `track_a_agent_app_clone_framework` | genie-code |
| 44 | [Phase 2 / Agent Build - Wire Selected Tools and MCP](#phase-2-agent-build-wire-selected-tools-and-mcp) | `track_a_agent_ka_genie_tools` | genie-code |
| 45 | [Phase 2 / Agent Build — Auth + Lakebase Memory](#phase-2-agent-build-auth-lakebase-memory) | `track_a_agent_auth_memory` | genie-code |
| 46 | [Phase 2 / Agent Build — Smoke Eval + Deploy](#phase-2-agent-build-smoke-eval-deploy) | `track_a_agent_eval_deploy` | genie-code |
| 47 | [Phase 3 / AppKit Integration — AppKit ↔ Agent App Proxy (streaming chat)](#phase-3-appkit-integration-appkit-agent-app-proxy-streaming-chat) | `appkit_agent_app_proxy_chat` | genie-code |
| 48 | [Phase 3 / AppKit Integration — Chatbot Feedback → MLflow Trace Assessments (Expert-in-the-Loop, End-User)](#phase-3-appkit-integration-chatbot-feedback-mlflow-trace-assessments-expert-in-the-loop-end-user) | `appkit_chat_feedback_mlflow` | genie-code |

---

## Agent Spec Design

| Field | Value |
|-------|-------|
| `input_id` | `217` |
| `section_tag` | `agent_spec_design` |
| `order_number` | `38` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Generate docs/agent_spec.yaml from docs/design_prd.md with optional MCP web research_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
## Your Task

You are a Databricks GenAI agent designer. Author the **Agent Spec** for the **{use_case_slug}** agent — a YAML design artifact at `docs/agent_spec.yaml` that captures intent (purpose, personas, capabilities, model endpoint, MCPs, eval seeds, governance) before any code is written.

**First:** Read `$APP_ROOT/.vibecoding-state.md` if it exists — it contains resolved issues and variable values from prior phases.

## IMPORTANT - READ FIRST

Your ONLY task is to create `docs/agent_spec.yaml`. Do NOT generate application code, create Databricks resources, install MCP servers, create UC connections, wire tools into an agent, deploy anything, modify app code, modify SQL seed files, or create/configure AI Gateway endpoints.

**DO NOT predict tool selections.** Tools are not chosen at this step — that's prompt 39. Therefore:

- ❌ DO NOT author tool-shaped scorers (`ka_citation_present`, `RetrievalGroundedness`, `genie_sql_correctness`, `sql_readonly_compliance`, `genie_response_grounded_in_table`, `uc_function_signature_match`).
- ❌ DO NOT add tool-specific assertions to `agent.benchmark_seeds.seed_examples[]` or `governance.verification.smoke_test_cases[]` (no "use Genie to look up X", no "expect a KA citation").
- ❌ DO NOT add Genie-shaped, KA-shaped, Vector-Search-shaped, or SQL-shaped buckets to `agent.benchmark_seeds.coverage_buckets[]`. Buckets are use-case categories ("policy compliance", "edge case: empty input"), not tool categories.
- ✅ Author only domain-shaped content from the use-case context (`{industry_name}`, `{use_case_title}`, personas, journeys, capabilities). Tool-shaped content lives in `docs/agent_tool_plan.yaml` and is appended by prompt 39.

You MUST:
- Read `docs/design_prd.md` (step 03 — business intent); compute its sha256 and record both path and digest as `source_prd`
- Read `docs/ui_design.md` (step 04 — pages, personas, navigation, user journeys); align Agent Spec personas with this UI
- Read `$APP_ROOT/.vibecoding-state.md` (steps 04-07 — APP_NAME, app URL, workspace URL, DB_SCHEMA, API routes, frontend pages)
- Use `genai-agents/foundation/00b-agent-spec-and-tool-plan/SKILL.md` as the contract
- Set `agent.model` to `{agent_model}`. If `{agent_model}` is blank, missing, or still a literal `{agent_model}` placeholder, default to `databricks-claude-sonnet-4-6`. Never record vague labels like "Claude" or "best model".
- Bronze, Gold, Genie, and Data Intelligence artifacts are NOT prerequisites. If external structured data is needed, record it as optional `mcp_research` candidates and let the Tool Plan (step 39) decide.
- Create ONLY `docs/agent_spec.yaml` and STOP

## Use Case Context

- **Industry:** {industry_name}
- **Use Case:** {use_case_title}
- **Description:** {use_case_description}

Use the same neutral product naming conventions used in `docs/design_prd.md`.

## Required `docs/agent_spec.yaml` Sections

All field paths below are tool-agnostic — shaped only by the use case (industry, capabilities, personas, journeys). Tool-shaped extensions are added later by prompt 39 into `docs/agent_tool_plan.yaml`.

- `source_prd` — `path` + `sha256` of `docs/design_prd.md`
- `agent.purpose`, `agent.target_personas[]`, `agent.capabilities[]`, `agent.system_prompt` (first-pass draft), `agent.auth_mode`, `agent.memory`
- `agent.model` — raw Databricks Model Serving endpoint name (see MUST rule above)
- `agent.must_do[]` — domain rules the agent must follow (free-text strings, use-case shaped)
- `agent.must_not_do[]` — domain rules the agent must refuse (free-text strings, use-case shaped)
- `agent.benchmark_seeds.coverage_buckets[]` — domain coverage labels (e.g. "policy compliance", "edge case: empty input"). NOT tool-shaped.
- `agent.benchmark_seeds.seed_examples[]` — `{input, expectations}` per persona × user-journey crossing. The `input` is a natural-language prompt; the `expectations` describes the reference behavior. NO tool-specific assertions here.
- `mcp_recommendations` — managed Databricks MCPs: `sql`, `genie`, `vector_search`, `uc_functions`, plus optional Knowledge Assistant. These are *recommendations*, not selections.
- `mcp_research.candidates[]` — only if you enable web research (see below); each candidate needs `name`, `provider`, `registry_name`, `registry_status`, `registry_version`, `source_url`, `registry_url`, `integration_method`, `auth_model`, `required_scopes`, `databricks_compatibility`, `confidence`
- `governance.scorer_suite.guidelines[]` — domain rules → become Guidelines scorers in 51 (each entry: `{name, text, threshold}`)
- `governance.scorer_suite.custom_scorer_rules[]` — deterministic Python `@scorer` checks (regex / numeric / schema validations) — each entry: `{name, rule}`
- `governance.scorer_suite.judge_questions[]` — domain quality questions evaluated by LLM judges (each entry: `{name, question, threshold}`). Reference the use-case domain — NOT generic NLP.
- `governance.verification.smoke_test_cases[]` — 3–5 domain smoke flows consumed by section 46's smoke gate. Each entry: `{input, expectations}`. NO tool-specific assertions.
- `governance.llm_role_endpoints.llm_judge_default.endpoint` — the Databricks serving endpoint role binding judges route through (default `databricks-claude-sonnet-4-6`).

## Optional MCP Web Research

If you want external MCP suggestions, set `mcp_research_mode: web_research` and query the official MCP Registry first (`https://registry.modelcontextprotocol.io`, REST API at `https://modelcontextprotocol.io/registry/registry-aggregators#consuming-the-mcp-registry-rest-api`). Skip `status: deleted` entries; mark `status: deprecated` as `confidence: low`. Use broader web search only to enrich registry candidates. NEVER install or configure any MCP connection during spec creation.

Save it to: docs/agent_spec.yaml
STOP after saving. Do NOT create code, install MCPs, create UC connections, or proceed with other tasks.
```

**System Prompt:**

```
You are a Databricks GenAI agent designer. Your task is to author the Agent Spec — a YAML design artifact at `docs/agent_spec.yaml` — that captures the agent's intent before any code or Databricks resource is created.

Key requirements:

- Read `docs/design_prd.md`, `docs/ui_design.md`, and `$APP_ROOT/.vibecoding-state.md` for context
- Use `genai-agents/foundation/00b-agent-spec-and-tool-plan/SKILL.md` as the spec contract
- Set `agent.model` to a raw Databricks Model Serving endpoint name (default `databricks-claude-sonnet-4-6`) — never a vague label like "Claude" or "best model"
- Recommend managed Databricks MCPs (Genie, SQL, Vector Search, UC Functions) plus an optional Knowledge Assistant
- Author tool-AGNOSTIC eval + governance: `agent.benchmark_seeds.{coverage_buckets, seed_examples}`, `governance.scorer_suite.{guidelines, custom_scorer_rules, judge_questions}`, `governance.verification.smoke_test_cases[]`, `agent.must_do[]`, `agent.must_not_do[]`
- DO NOT predict tool selections — no `ka_citation_present`, `RetrievalGroundedness`, `genie_*`, `sql_*` scorers; no tool-shaped buckets or assertions. Tool-shaped content lives in `docs/agent_tool_plan.yaml` and is appended by prompt 39
- Do NOT generate application code, create Databricks resources, install MCPs, create UC connections, wire tools, or deploy
- Bronze, Gold, Genie, and Data Intelligence artifacts are NOT prerequisites — they become optional tool backends in the Tool Plan (step 39)

This prompt is returned as-is for direct use in Cursor/Copilot. No LLM processing.
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## 1️⃣ How To Apply

### Prerequisite

The Agents Accelerator visible path runs steps 03-07 first; this prompt inherits their outputs.

#### Prior App Context to Inherit (from steps 03-07)

The Agent Spec inherits context from the visible upstream Agents Accelerator path, not from Lakehouse or Data Intelligence steps:

- **PRD (step 03)** — `docs/design_prd.md` is the source of business intent, personas, and goals; recorded as `source_prd` (path + sha256).
- **UI design (step 04)** — `docs/ui_design.md` defines pages, personas, navigation, and user journeys. The Agent Spec personas align with this UI.
- **Deployed AppKit app (step 05)** — `$APP_ROOT/.vibecoding-state.md` carries `APP_NAME`, app URL, and workspace URL.
- **Lakebase setup + wiring (steps 06-07)** — the same state file carries `DB_SCHEMA`, app API routes, frontend pages, and any live/mock endpoint notes.

Required upstream artifacts:

- [ ] `docs/design_prd.md` exists (step 03 — PRD generation).
- [ ] `docs/ui_design.md` exists (step 04 — AppKit UI design).
- [ ] AppKit app deployed (step 05) — `APP_NAME`, app URL, and workspace URL recorded in `$APP_ROOT/.vibecoding-state.md`.
- [ ] Lakebase set up and wired (steps 06-07) — `DB_SCHEMA`, app API routes, frontend pages, and live/mock endpoint notes recorded in the same state file.

Bronze layer, Gold layer, Genie Space, and any other Data Intelligence artifacts are NOT required for the Agent Spec. They can be selected later as optional bring-your-own tool backends in `docs/agent_tool_plan.yaml`.

### Steps to Apply

1. **Copy the generated prompt** using the copy button.
2. **Paste it into a new Agent thread** in your Coding Assistant.
3. **Optionally request MCP web research** - if you want the assistant to suggest relevant external MCP servers, tell it to set `mcp_research_mode: web_research` before searching.
4. **Let the AI generate the Agent Spec** - it will create `docs/agent_spec.yaml` and stop.
5. **Review the generated spec** - confirm tool recommendations match your use case before moving to Tool Selection.

**IMPORTANT:** This step ONLY creates `docs/agent_spec.yaml`. No code, MCP installs, or Databricks resources are produced.

---

## 2️⃣ What Are We Building?

We are writing the **first design artifact** of the Track A "Agents 101" arc — `docs/agent_spec.yaml`. The Agent Spec is the head of a 9-step pipeline; every later prompt reads from it (or from the Tool Plan it spawns) and extends the captured state along the chain.

```
PHASE 1: FOUNDATION                      PHASE 2: BUILD              PHASE 3: APPKIT
┌─────────────────────────┐              ┌────────────────────┐      ┌────────────────┐
│ 38 Agent Spec   ◀─here  │              │ 43 Clone+Framework │      │ 47 Proxy chat  │
│ 39 Tool Plan            │  state ───►  │ 44 Wire tools      │ ───► │ 48 Feedback    │
│ 40 UC Foundation        │              │ 45 Auth+Memory     │      │                │
│ 41 MLflow Tracing       │              │ 46 Eval+Deploy     │      │                │
│ 42 Knowledge Assistant  │              └────────────────────┘      └────────────────┘
└─────────────────────────┘
        gates chained via $APP_ROOT/.vibecoding-state.md
```

### Key Concepts

| Concept | What It Means | Why It Matters |
|---------|---------------|----------------|
| **Agent Spec** | YAML design artifact (`docs/agent_spec.yaml`) describing purpose, personas, capabilities, model endpoint, MCP recommendations, eval seeds, governance | Decouples *intent* from *implementation*; the same spec drives Tool Plan, UC Foundation, KA, and the Track A build |
| **`source_prd`** | Path + `sha256` of `docs/design_prd.md` recorded at the time of spec authoring | Makes the spec reproducible — a future spec regen against the same PRD revision must produce equivalent intent |
| **`agent.model`** | Raw Databricks Model Serving endpoint name (e.g. `databricks-claude-sonnet-4-6`) — never a vague label like "Claude" or "best model" | Endpoint name is the contract that 39 lifts into `runtime_config.llm` and 44 grants `CAN_QUERY` on |
| **`mcp_research`** | Optional web-research record of external MCP candidates sourced from the official MCP Registry | Captures provenance (registry URL, version/status, confidence) so 39 can ground tool selection in real, current servers |
| **`agent.benchmark_seeds`** | `coverage_buckets[]` (domain labels) + `seed_examples[]` (`{input, expectations}` per persona × journey) | Section 50 expands these into ≥20 benchmark rows. Both fields are use-case-shaped — never tool-shaped. |
| **`governance.scorer_suite`** | `guidelines[]` + `custom_scorer_rules[]` + `judge_questions[]` — three families of scorers, all domain-shaped | Section 51 registers these as the GENERIC scorer suite. Tool-shaped scorers (KA citation, RetrievalGroundedness, etc.) are added separately by 39 from the Tool Plan. |
| **Tool-agnostic at this step** | The Spec contains no tool predictions. Tool families with `selected: false` in the Plan contribute zero downstream artifacts. | Lets the same Spec drive different Tool Plans — KA-only, SQL-only, full stack — without needing a re-author. |
| **Coding-assistant-only step** | `bypass_llm: true`; the Input Template is the literal prompt the user pastes into your coding assistant — no meta-LLM rewriting | This step never touches Databricks — no schemas, no installs, no deploy. Pure design. |

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It's Used Here |
|----------|--------------------|
| **Spec before code** | The Agent Spec is a design artifact (`docs/agent_spec.yaml`), not implementation. It precedes the Tool Plan and any Databricks resource creation, so the team aligns on intent before anyone writes Python or runs `bundle deploy`. |
| **PRD as ground truth** | `source_prd.path + sha256` is recorded in the spec. The spec is reproducible from a known PRD revision — a future regen can confirm the same input produced equivalent intent. |
| **Model endpoint, not vague labels** | `agent.model` records the raw Databricks Model Serving endpoint name (e.g. `databricks-claude-sonnet-4-6`), never `Claude` or `best model`. Vague labels would break the 39 → 44 grant chain. |
| **Gateway-ready by deferral** | `agent.model` records the *backing* model endpoint. AI Gateway is introduced later via the Tool Plan's `runtime_config.llm`, never by replacing `agent.model` here. The core Track A path stays Gateway-optional. |
| **MCP Registry first** | When `mcp_research_mode: web_research` is enabled, candidate MCPs are sourced from the official MCP Registry (`https://registry.modelcontextprotocol.io`) before vendor docs. Registry metadata (`status`, `version`, `confidence`) is captured per candidate. |

---

## 4️⃣ What Happens Behind the Scenes?

The generated prompt drives the coding assistant through a deterministic 7-phase walk that ends with a single saved YAML file:

| Phase | What Happens | Key Output |
|-------|--------------|------------|
| **Phase 0** | Read `docs/design_prd.md`, compute `sha256`, capture as `source_prd` | PRD reference |
| **Phase 1** | Draft `purpose`, `personas[]`, `capabilities[]`, `system_prompt` | Spec head |
| **Phase 2** | Confirm or default `agent.model` to `databricks-claude-sonnet-4-6` | Model endpoint |
| **Phase 3** | Recommend managed MCPs (Genie, SQL, Vector Search, UC Functions) + optional KA | `mcp_recommendations` |
| **Phase 4** | (Optional) MCP Registry research — record candidates with `registry_status`, `registry_version`, `confidence` | `mcp_research.candidates[]` |
| **Phase 5** | Author tool-agnostic eval + governance: `agent.must_do[]`, `agent.must_not_do[]`, `agent.benchmark_seeds.{coverage_buckets, seed_examples}`, `governance.scorer_suite.{guidelines, custom_scorer_rules, judge_questions}`, `governance.verification.smoke_test_cases[]` | Eval + governance (use-case shaped) |
| **Phase 6** | Save `docs/agent_spec.yaml`, STOP | Design artifact ready |

### Gate Contract

| Reads gate | Produces gate | Captured state |
|------------|---------------|----------------|
| (none — first prompt in the Track A arc; coding-assistant-side only) | (no state hand-off; `bypass_llm: true`) | `docs/agent_spec.yaml` (consumed by 39) |

</details>

<details><summary><strong>Expected Output</strong></summary>

- [ ] `docs/agent_spec.yaml` exists
- [ ] Agent purpose, personas, capabilities, system prompt, tool recommendations, MCP research, KA recommendation, eval seeds, and governance rules are populated
- [ ] `docs/agent_spec.yaml.agent.model` is populated with a Databricks serving endpoint name
- [ ] No code or Databricks resources are created

</details>

---

## Agent Tool Selection

| Field | Value |
|-------|-------|
| `input_id` | `218` |
| `section_tag` | `agent_tool_selection` |
| `order_number` | `39` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Select final MCPs and tool backends, including dynamic SQL MCP catalog/schema, and save docs/agent_tool_plan.yaml_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

````
## Your Task

You are a Databricks GenAI agent designer. Author the **Agent Tool Plan** for the **{use_case_slug}** agent — a YAML design artifact at `docs/agent_tool_plan.yaml` that pins the user-confirmed tool backends (managed MCPs, optional Knowledge Assistant, dynamic SQL MCP) and preserves the Agent Spec's `agent.model` under a Gateway-ready runtime route.

**First:** Read `$APP_ROOT/.vibecoding-state.md` if it exists — it contains resolved issues and variable values from prior phases.

## IMPORTANT - READ FIRST

Your ONLY task is to create `docs/agent_tool_plan.yaml`. Do NOT generate application code, create Databricks resources, install MCP servers, create UC connections, wire tools into an agent, or deploy anything.

### Placeholder Handling

The Tool Plan MUST NEVER contain placeholder literals (anything matching `^\{[a-z_]+\}$`). The names `agent_sql_catalog`, `agent_sql_schema`, `agent_sql_table_allowlist`, `genie_space_id`, `vs_endpoint`, and `vs_index` may arrive still wrapped in `{...}`. Treat any value that is blank, missing, or still wrapped in `{...}` as a question for the user.

You MUST:
- Read `docs/agent_spec.yaml` — inherit the agent's purpose, model endpoint, and recommended tools
- Use `genai-agents/foundation/00b-agent-spec-and-tool-plan/SKILL.md` as the contract
- ASK ME for any value that is blank, missing, or still wrapped in `{...}` (for example `{agent_sql_catalog}`, `{agent_sql_schema}`, `{agent_sql_table_allowlist}`, `{genie_space_id}`, `{vs_endpoint}`, `{vs_index}`) before writing the Tool Plan. NEVER write a placeholder literal (regex `^\{[a-z_]+\}$`) into `docs/agent_tool_plan.yaml` under any circumstance.
- If a tool family is not selected, OMIT its keys from `selected_mcp_servers[]` and `selected_tools[]` entirely instead of writing placeholder strings, `"n/a"`, or empty scope fields.
- Copy the SCALAR value of `docs/agent_spec.yaml.agent.model` into `runtime_config.llm.endpoint` AND into every `resource_grants.databricks_yml.serving_endpoints[].name`. NEVER write the YAML-path string `docs/agent_spec.yaml.agent.model` as the endpoint value — that string is a documentation reference, never the value itself. Writing it verbatim would cause DAB to attempt `CAN_QUERY` against a serving endpoint with that literal name and fail.
- If `docs/agent_spec.yaml.agent.model` is empty, missing, or still wrapped in `{...}`, ASK ME for the endpoint name before writing the Tool Plan. Do not invent a default here — the Agent Spec already defaulted it to `databricks-claude-sonnet-4-6` if it was unset.
- Do NOT create or configure AI Gateway in this step. The runtime route is intentionally Gateway-ready so a future pre-provisioned Gateway endpoint can be introduced by changing only `provider`, `endpoint`, and `api_base_url` without changing agent code.
- Create ONLY `docs/agent_tool_plan.yaml` and STOP

## Use Case Context

- **Industry:** {industry_name}
- **Use Case:** {use_case_title}

## Dynamic SQL MCP Inputs

If SQL MCP is selected, use these values:

- `agent_sql_catalog`: {agent_sql_catalog}
- `agent_sql_schema`: {agent_sql_schema}
- `agent_sql_warehouse_id`: {default_warehouse}
- `agent_sql_table_allowlist`: {agent_sql_table_allowlist}

If `agent_sql_catalog`, `agent_sql_schema`, or `agent_sql_table_allowlist` arrive as literal `{...}` tokens, ASK ME for the values before proceeding. Do NOT write `{agent_sql_catalog}` or any other placeholder literal into the Tool Plan.

Default SQL MCP policy:

- `readonly: true`
- allowed statements: `SELECT`, `DESCRIBE`, `EXPLAIN`
- forbidden statements: `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `MERGE`, `TRUNCATE`
- require fully qualified table names as `catalog.schema.table`

## Runtime Model Route (Gateway-Ready)

COPY the SCALAR value of `docs/agent_spec.yaml.agent.model` into:

- `runtime_config.llm.endpoint`
- every entry in `resource_grants.databricks_yml.serving_endpoints[].name` that represents the model route

Concrete example, assuming `docs/agent_spec.yaml` has `agent.model: "databricks-claude-sonnet-4-6"`:

```yaml
runtime_config:
  llm:
    provider: "databricks"
    endpoint: "databricks-claude-sonnet-4-6"   # copied from agent.model
    api_base_url: null
    api_mode: "databricks_openai_compatible"
    model_config:
      endpoint_key: "llm_endpoint"
      api_base_url_key: "llm_api_base_url"
      api_mode_key: "llm_api_mode"
resource_grants:
  databricks_yml:
    serving_endpoints:
      - name: "databricks-claude-sonnet-4-6"   # same scalar value as runtime_config.llm.endpoint
        permission: "CAN_QUERY"
```

## Tool-Shaped Derivation (mechanical)

The Tool Plan adds **tool-shaped** content that the Spec deliberately omits (the Spec is tool-agnostic — tools are not selected until this step). For every entry in `selected_tools[]`, walk the table below and emit the corresponding `verification.tool_smoke_tests[]` entry and `runtime_guardrails.tool_shaped_scorers[]` hints. Tool families absent from `selected_tools[]` (or with `selected: false`) contribute zero entries.

| Selected tool family | `runtime_guardrails.tool_shaped_scorers[]` to add (deduped) | `verification.tool_smoke_tests[]` prompt shape |
|---|---|---|
| Knowledge Assistant (`ka_endpoint_name` present) | `ka_citation_present`, `RetrievalGroundedness` | "What does the {use_case_title} policy say about <X>?" — `expected_signal`: KA span + cited document |
| Vector Search (managed MCP) | `RetrievalGroundedness` (dedup if KA already added it) | "Find similar past <case> in the corpus" — `expected_signal`: VS span + ≥1 hit returned |
| Genie | `genie_sql_correctness`, `genie_response_grounded_in_table` | "Show me <metric> for <segment> over the last quarter" — `expected_signal`: Genie span + SQL referencing an allowed table |
| SQL MCP | `sql_readonly_compliance`, `sql_fully_qualified_names` | "Run a SELECT on `{agent_sql_catalog}.{agent_sql_schema}.<table>` for the top 5 rows" — `expected_signal`: SELECT-only SQL with fully-qualified table names |
| UC Functions | `uc_function_signature_match` | "Call `<uc_function_name>` with arguments <args>" — `expected_signal`: function call signature matches |
| External MCP (per high-confidence descriptor) | one entry per `mcp_research.candidates[].confidence == high` selected | use-case query that exercises the specific external MCP — `expected_signal` from descriptor |

Each emitted `verification.tool_smoke_tests[]` entry has the shape `{tool_name, prompt, expected_signal}`. Use the use-case context (`{industry_name}`, `{use_case_title}`, capabilities, schema names) to keep prompts domain-relevant — never write generic placeholders like "list 5 rows from a table".

**Worked example.** If `selected_tools[]` contains only SQL MCP (Knowledge Assistant `selected: false`, Genie not selected, Vector Search not selected), then:

- `verification.tool_smoke_tests[]` has exactly ONE entry (the SQL one).
- `runtime_guardrails.tool_shaped_scorers[]` is `["sql_readonly_compliance", "sql_fully_qualified_names"]`.
- No `ka_citation_present`, no `RetrievalGroundedness`, no `genie_*`, no `uc_function_signature_match`.

The downstream prompts (50/51/52/46) read these arrays directly — there is no defaulting or fallback for tools the user didn't select.

## Tool Plan Decisions to Record

- Managed Databricks MCPs: Genie, Vector Search, SQL, UC Functions (each with explicit `selected: true|false`)
- Optional external MCPs from `docs/agent_spec.yaml.mcp_research.candidates[]`
- Knowledge Assistant — either selected with `creation_required: true` and `ka_source`, or skipped with `selected: false`
- Resource grants for `databricks.yml` and `app.yaml` OAuth scopes
- Runtime guardrails (SQL read-only default, citation requirements) PLUS `runtime_guardrails.tool_shaped_scorers[]` derived from `selected_tools[]`
- `verification.tool_smoke_tests[]` — one entry per `selected_tools[]` entry, prompt + expected_signal use-case shaped (no entries for unselected tool families)
- Runtime model route from `docs/agent_spec.yaml.agent.model` into `runtime_config.llm`

For SQL MCP specifically, ensure the plan includes:

- `selected_mcp_servers[].meta.warehouse_id` set to `{default_warehouse}`
- `selected_mcp_servers[].scope.catalog` set to `{agent_sql_catalog}`
- `selected_mcp_servers[].scope.schema` set to `{agent_sql_schema}`
- `selected_mcp_servers[].scope.allowed_tables` populated from `{agent_sql_table_allowlist}` (empty list = full schema with read-only guardrails)
- `selected_tools[].guardrails.allowed_statements` = `["SELECT", "DESCRIBE", "EXPLAIN"]`
- `selected_tools[].guardrails.forbidden_statements` = `["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "MERGE", "TRUNCATE"]`
- `selected_tools[].guardrails.require_fully_qualified_names` = `true`

Save it to: docs/agent_tool_plan.yaml
STOP after saving. Do not generate any code, install MCPs, create UC connections, or proceed with other tasks.
````

**System Prompt:**

```
You are a Databricks GenAI agent designer. Your task is to author the Agent Tool Plan — a YAML design artifact at `docs/agent_tool_plan.yaml` — that pins the user-confirmed tool backends and preserves the Agent Spec's `agent.model` under a Gateway-ready runtime route.

Key requirements:

- Read `docs/agent_spec.yaml` and use it (plus `genai-agents/foundation/00b-agent-spec-and-tool-plan/SKILL.md`) as the contract
- Confirm managed Databricks MCPs (Genie, SQL, Vector Search, UC Functions) and the optional Knowledge Assistant
- Bind dynamic SQL MCP inputs (`agent_sql_catalog`, `agent_sql_schema`, `agent_sql_warehouse_id`, `agent_sql_table_allowlist`) with the readonly SELECT/DESCRIBE/EXPLAIN policy
- Copy the SCALAR value of `docs/agent_spec.yaml.agent.model` into `runtime_config.llm.endpoint` AND every `resource_grants.databricks_yml.serving_endpoints[].name` — never the literal YAML-path string
- Derive `verification.tool_smoke_tests[]` mechanically from `selected_tools[]` — one entry per selected tool, prompt + expected_signal use-case shaped
- Derive `runtime_guardrails.tool_shaped_scorers[]` mechanically from `selected_tools[]` per the Tool-shaped Derivation Rules in `references/tool-plan-schema.md`. Tool families with `selected: false` contribute nothing
- ASK the user for any value that arrives blank, missing, or still wrapped in `{...}`; never write placeholder literals into the Tool Plan
- Do NOT generate code, create Databricks resources, install MCPs, create UC connections, wire tools, or deploy

This prompt is returned as-is for direct use in Cursor/Copilot. No LLM processing.
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## 1️⃣ How To Apply

### Prerequisite

`docs/agent_spec.yaml` must already exist (created by the Agent Spec Design prompt). Tool Selection turns the spec's recommendations into the final selected runtime contract.

### Steps to Apply

1. **Decide tool inputs** - if you want SQL MCP over an existing Unity Catalog schema, gather your `agent_sql_catalog`, `agent_sql_schema`, warehouse id, and (optionally) `agent_sql_table_allowlist`.
2. **Copy the generated prompt** using the copy button.
3. **Paste it into a new Agent thread** in your Coding Assistant.
4. **Answer the assistant's clarifying questions** about which managed and external MCPs to wire, and whether KA is required.
5. **Review `docs/agent_tool_plan.yaml`** - confirm SQL MCP guardrails, KA selection, and smoke tests before continuing to UC Resources Foundation.

**IMPORTANT:** This step ONLY creates `docs/agent_tool_plan.yaml`. No code or Databricks resources are produced.

---

## 2️⃣ What Are We Building?

We are turning the Agent Spec's *recommendations* into a final, runtime-shaped contract: `docs/agent_tool_plan.yaml`. The Tool Plan is what every later prompt actually executes against — it carries selected MCPs, resource grants, runtime LLM route, and per-tool smoke tests.

```
docs/agent_spec.yaml                                docs/agent_tool_plan.yaml
┌─────────────────────┐                            ┌──────────────────────────┐
│ Recommended MCPs    │                            │ selected_mcp_servers[]   │
│  - Genie            │   confirm + ground         │  - Genie (with id)       │
│  - Vector Search    │  ────────────────────►     │  - SQL (catalog/schema)  │
│  - SQL              │                            │ selected_tools[]         │
│  - UC Functions     │                            │ resource_grants          │
│ Recommended KA      │                            │ runtime_config.llm       │
│ External MCPs       │                            │ smoke_tests              │
└─────────────────────┘                            └──────────────────────────┘
```

### Key Concepts

| Concept | What It Means | Why It Matters |
|---------|---------------|----------------|
| **`selected_mcp_servers[]`** | The concrete MCP servers the agent will call (Genie, SQL, Vector Search, UC Functions, plus optional external) — each with the IDs/scope/warehouse needed at runtime | The Agent Spec's MCP *recommendations* become *bindings* here; 44 walks this list to generate `@function_tool` decorators |
| **`selected_tools[]`** | One row per tool surfaced to the agent, each pointing at a `mcp_server_ref` plus per-tool guardrails | Closes the loop between Agent Spec capabilities and runtime SDK calls; the smoke-test list is keyed off this collection |
| **`resource_grants`** | The `databricks.yml` resources + `app.yaml` OAuth scopes the agent needs (serving endpoints, Genie space, SQL warehouse, UC connections) | DAB-driven deploy is non-negotiable on Databricks Apps; declaring grants here means 43/44 never inline-create resources |
| **`runtime_config.llm`** | Gateway-ready route carrying `provider`, `endpoint`, `api_base_url`, `api_mode` — backed by `docs/agent_spec.yaml.agent.model` | Switching to AI Gateway later changes only those four fields; 43 lifts them into `config.yml` so Python never hardcodes the endpoint |
| **Skip vs. fail** | Tool families not chosen (e.g. KA when `selected: false`) are recorded with explicit `selected: false`, not silently dropped | 42, 44, and 46 read these flags so "Skipped — KA not selected" is a clean state, not a missing-key error |

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It's Used Here |
|----------|--------------------|
| **Read-only SQL by default** | Every SQL MCP entry pins `allowed_statements: SELECT, DESCRIBE, EXPLAIN` and `forbidden: INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, MERGE, TRUNCATE`. Fully-qualified `catalog.schema.table` names are required so an agent prompt cannot exfil-write to the wrong namespace. |
| **Resource grants are part of the contract** | `databricks.yml` resources + `app.yaml` OAuth scopes are written by the Tool Plan, not invented by the Agent Build phase. The build prompts (43–46) inherit these grants via `valueFrom` and never call `WorkspaceClient.create_*` directly. |
| **Runtime model route is Gateway-ready** | `runtime_config.llm` carries `provider`, `endpoint`, `api_base_url`, `api_mode`. Switching to AI Gateway later changes only those four fields — the Tool Plan stays valid, and no Python edits are needed. |
| **Smoke tests per tool** | Every selected tool ships with at least one smoke query the agent must pass during the eval phase. Smoke gaps are detected before deploy, not in production. |
| **Skip ≠ fail** | Tool families not selected (KA when `selected: false`, Genie when not chosen) are explicitly skipped during the wire-tools phase, not silently absent. The wire-tools prompt logs the skip and the gate accepts it as a valid terminal state. |

---

## 4️⃣ What Happens Behind the Scenes?

The generated prompt walks the coding assistant through 7 ordered decisions before saving the Tool Plan:

| Phase | What Happens | Key Output |
|-------|--------------|------------|
| **Phase 0** | Read `docs/agent_spec.yaml` (preserve `agent.model`) and any `mcp_research.candidates[]` | Spec context |
| **Phase 1** | Confirm managed MCPs (Genie, Vector Search, SQL, UC Functions) | `selected_mcp_servers[]` |
| **Phase 2** | If SQL MCP, attach `meta.warehouse_id`, `scope.catalog`, `scope.schema`, `scope.allowed_tables` from inputs | SQL MCP scope |
| **Phase 3** | Confirm Knowledge Assistant: either select with `creation_required: true` + `ka_source`, or skip with `selected: false` | KA decision |
| **Phase 4** | (Optional) Promote external MCP candidates that passed registry research | External MCPs |
| **Phase 5** | Author per-tool guardrails + smoke_tests (read-only SQL, citation requirements, fully-qualified names) | `selected_tools[]` |
| **Phase 6** | Compose `runtime_config.llm` (provider/endpoint/api_base_url/api_mode) by COPYING the scalar value of `docs/agent_spec.yaml.agent.model` into `endpoint`, plus mirror that same scalar into every `resource_grants.databricks_yml.serving_endpoints[].name` granting `CAN_QUERY` | Gateway-ready route |
| **Phase 7** | Save `docs/agent_tool_plan.yaml`, STOP | Tool plan ready |

### Gate Contract

| Reads gate | Produces gate | Captured state |
|------------|---------------|----------------|
| (none — coding-assistant-side, preceded by 38) | `Agent tool plan ready` (consumed by 40, 42, 43, 44) | `docs/agent_tool_plan.yaml` |

</details>

<details><summary><strong>Expected Output</strong></summary>

- [ ] docs/agent_tool_plan.yaml exists
- [ ] Every selected_tools[].mcp_server_ref resolves to selected_mcp_servers[].name
- [ ] SQL MCP includes catalog, schema, warehouse_id, readonly guardrails
- [ ] Knowledge Assistant is either selected with creation_required: true or skipped with selected: false
- [ ] `verification.tool_smoke_tests[]` has exactly one entry per `selected_tools[]` entry; each `prompt` is use-case-shaped, each `expected_signal` is observable (TOOL span / citation / SQL shape)
- [ ] `runtime_guardrails.tool_shaped_scorers[]` is derived mechanically from `selected_tools[]` per the Tool-shaped Derivation table; tool families with `selected: false` contributed zero entries
- [ ] No `RetrievalGroundedness` / `ka_citation_present` / `genie_*` / `uc_function_*` entries appear unless the corresponding tool family is in `selected_tools[]`
- [ ] runtime_config.llm uses provider `databricks`, `endpoint` set to the SCALAR value copied from `docs/agent_spec.yaml.agent.model` (never the literal YAML-path string), `api_base_url: null`, and `api_mode: databricks_openai_compatible`
- [ ] resource_grants.databricks_yml.serving_endpoints grants CAN_QUERY on the same scalar endpoint name (never the literal YAML-path string)
- [ ] No value in docs/agent_tool_plan.yaml is a placeholder literal of the form `{some_name}`

</details>

---

## Phase 1 / Agent Foundation — UC Resources Foundation

| Field | Value |
|-------|-------|
| `input_id` | `200` |
| `section_tag` | `uc_resources_foundation` |
| `order_number` | `40` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Create the agent + ops UC schemas and managed volumes once for any downstream skill (MLflow OTeL, KA, memory, benchmarks, monitoring)_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

````
Provision the Unity Catalog **schemas + managed volumes** that every downstream agent skill assumes (MLflow OTel tables, Knowledge Assistant, agent memory, benchmark persistence, monitoring) for the **{use_case_slug}** agent. Today the workspace has no agent-scoped UC homes; after this prompt runs, two schemas (`{db_schema}_agent` and `{db_schema}_ops`) and the canonical managed volumes exist and are ready to consume.

This will involve the following steps:

- **Derive user-scoped names** — compute `APP_NAME`, `DB_SCHEMA`, `AGENT_APP_NAME`, and `AGENT_RESOURCE_PREFIX` from your Databricks identity so multiple workshop attendees never collide
- **Create the agent + ops schemas** — `CREATE SCHEMA IF NOT EXISTS` for `{lakehouse_default_catalog}.{db_schema}_agent` and `{lakehouse_default_catalog}.{db_schema}_ops`
- **Provision managed volumes** — create the canonical `knowledge_sources` and `agent_outputs` volumes in the agent schema, plus any extras from `docs/agent_tool_plan.yaml.resource_grants.required_volumes[]`
- **Stay idempotent** — every operation tolerates pre-existing schemas/volumes (warm workspaces from earlier runs are fine)
- **Capture state for downstream skills** — emit the volume map + convenience paths (`knowledge_source_path`, `agent_outputs_path`) so MLflow tracing, KA, memory, benchmarks, and monitoring can resolve them

**First:** Read `$APP_ROOT/.vibecoding-state.md` if it exists — it contains resolved issues and variable values from prior phases.

**How this prompt chains with the prior step (skill invocations):**

### Step 1: Derive User-Scoped Names

Use the same identity-derived naming pattern as the AppKit and Lakebase prompts. These values keep AppKit apps, Lakebase schemas, UC schemas, volumes, and the Track A Agent App isolated per user and use case.

```bash
PROFILE="{databricks_cli_profile}"  # From Session Settings → Profile (default DEFAULT)
USER_JSON=$(databricks current-user me --profile $PROFILE --output json)
EMAIL=$(echo "$USER_JSON" | jq -r '.userName')
FIRSTNAME=$(echo "$EMAIL" | cut -d'@' -f1 | cut -d'.' -f1)
LASTINITIAL=$(echo "$EMAIL" | cut -d'@' -f1 | cut -d'.' -f2 | cut -c1)
APP_PREFIX="${FIRSTNAME}-${LASTINITIAL}"
APP_NAME="${APP_PREFIX}-{use_case_slug}"

if [ ${#APP_NAME} -gt 26 ]; then
  APP_NAME=$(echo "$APP_NAME" | cut -c1-26 | sed 's/-$//')
  echo "Truncated AppKit app name to: $APP_NAME"
fi

DB_SCHEMA=$(echo "$APP_NAME" | tr '-' '_')
AGENT_APP_NAME="${APP_NAME}-agent"

if [ ${#AGENT_APP_NAME} -gt 26 ]; then
  AGENT_APP_NAME="$(echo "$APP_NAME" | cut -c1-22 | sed 's/-$//')-agt"
  echo "Truncated agent app name to: $AGENT_APP_NAME"
fi

AGENT_RESOURCE_PREFIX=$(echo "$AGENT_APP_NAME" | tr '-' '_')
echo "APP_NAME=$APP_NAME  DB_SCHEMA=$DB_SCHEMA  AGENT_APP_NAME=$AGENT_APP_NAME"
```

Use the resolved values as `{app_name}`, `{db_schema}`, `{agent_app_name}`, and `{agent_resource_prefix}` in the skill parameters below.

**Invoke skills (in order):**

1. `skills/vibecoding-state` op `enter` — params: `prompt_id: "uc_resources_foundation"`, `require_prior_gate: [{prompt_id: "workspace_setup_deploy", gate: "Infrastructure healthy"}, {prompt_id: "agent_tool_selection", gate: "Agent tool plan ready"}]` (accepts `"Infrastructure healthy with warnings"`).
2. `skills/vibecoding-state` op `hydrate_from_files` — params: `agent_spec_yaml: "docs/agent_spec.yaml"`, `agent_tool_plan_yaml: "docs/agent_tool_plan.yaml"`, `ui_design_md: "docs/ui_design.md"`, `prd_path: "docs/design_prd.md"`, `state_path: "$APP_ROOT/.vibecoding-state.md"`. This populates `state://AgentSpec`, `state://AppSpec` (UI), and `state://Spec Provenance` from the design pair so downstream MLflow SDLC prompts (50–56) can keep reading `state://AgentSpec.*` / `state://AppSpec.*` without rewrites. `state://DataSpec` is stamped `optional: true` when no Lakehouse track has populated it. The operation is idempotent: re-running with the same YAML files is a no-op (the `resolved_at` timestamp may drift). It halts only if a required input file is missing, if `agent_spec.yaml.agent.model` is empty, or if any value in the design pair is still wrapped in `{...}` — in those cases re-run prompts 38 / 39 with real values.
3. @genai-agents/foundation/00-uc-resources-foundation/SKILL.md — params:
   - `uc_catalog: "{lakehouse_default_catalog}"`
   - `agent_schema: "{db_schema}_agent"`
   - `ops_schema: "{db_schema}_ops"`
   - `warehouse_id: "{default_warehouse}"`
   - `required_volumes:` default list, extended by `docs/agent_tool_plan.yaml.resource_grants.required_volumes[]` after applying the same `{db_schema}_` prefix to each extra volume name.
     - `{ name: "{db_schema}_knowledge_sources", schema: "agent", comment: "KA + retrieval source files" }`
     - `{ name: "{db_schema}_agent_outputs",     schema: "agent", comment: "Tool-generated artifacts (CSV, charts)" }`
   - **Returns:** `agent_schema`, `ops_schema`, `uc_volumes` (map of actual volume name → `/Volumes/...` path), and convenience aliases `knowledge_source_path` (= `/Volumes/{lakehouse_default_catalog}/{db_schema}_agent/{db_schema}_knowledge_sources`) and `agent_outputs_path` (= `/Volumes/{lakehouse_default_catalog}/{db_schema}_agent/{db_schema}_agent_outputs`).
   - **Idempotency contract:** every operation is idempotent — `CREATE SCHEMA IF NOT EXISTS`, and `WorkspaceClient.volumes.create(...)` wrapped to treat `databricks.sdk.errors.AlreadyExists` as success. Pre-existing schemas/volumes (whether created by a prior run, by a use-case asset bundle, or by another user) MUST NOT cause a failure. The skill MUST always emit the captured map even on a warm workspace where every resource already exists.
4. `skills/vibecoding-state` op `exit` — params: `prompt_id: "uc_resources_foundation"`, `gate: "UC resources ready"`, `captured: {app_name, db_schema, agent_app_name, agent_resource_prefix, agent_schema, ops_schema, uc_volumes, knowledge_source_path, agent_outputs_path, hydrated_from_files: true, resolver_version: "3.0"}`.

**Gate:** `UC resources ready` — both schemas exist (`SHOW SCHEMAS IN {lakehouse_default_catalog}` lists them), every entry in `uc_volumes` is reachable via `WorkspaceClient.volumes.read(...)`, and `knowledge_source_path` points to `/Volumes/{lakehouse_default_catalog}/{db_schema}_agent/{db_schema}_knowledge_sources`. Pre-existing resources are explicitly acceptable — the gate proves *existence*, not *first-time creation*.

If a PRD exists at @docs/design_prd.md, reference it for business requirements, user personas, and workflows.
````

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## 1️⃣ How To Apply

Copy the prompt above, start a **new Agent thread** in your Coding Assistant, and paste it. The agent will load `genai-agents/foundation/00-uc-resources-foundation/SKILL.md` and create the agent + ops schemas plus the canonical managed volumes for this `{use_case_slug}`.

### Upstream Prerequisites

This is the first prompt in the **Agent Foundation** phase. It depends only on the workspace preflight, the Agent Spec / Tool Plan design pair, and the AppKit + Lakebase steps that precede this section. Confirm each is complete before pasting:

Required:
- [ ] `workspace_setup_deploy` (input_id 4) — `{lakehouse_default_catalog}` and `{default_warehouse}` resolved. The `Infrastructure healthy` gate (or `Infrastructure healthy with warnings`) is the explicit prior-gate this prompt requires.
- [ ] `agent_spec_design` (input_id 217) — `docs/agent_spec.yaml` exists (the Agent Spec drives Tool Plan selection).
- [ ] `agent_tool_selection` (input_id 218) — `docs/agent_tool_plan.yaml` exists with the gate `Agent tool plan ready`.
- [ ] AppKit + Lakebase context from steps 04-07 — `$APP_ROOT/.vibecoding-state.md` carries `APP_NAME`, `DB_SCHEMA`, app URL, workspace URL, app API routes, and Lakebase wiring notes.

Optional bring-your-own tool inputs (only required when the corresponding tool family is selected in `docs/agent_tool_plan.yaml.selected_tools[]`):
- SQL MCP — provide `agent_sql_catalog`, `agent_sql_schema`, optional table allowlist, and a SQL warehouse the agent can read with read-only guardrails.
- Genie — provide an existing `genie_space_id` if you want the agent to call Genie; this prompt does not provision a Genie Space.
- Vector Search — provide an existing endpoint + index name.
- UC Functions — provide fully qualified function names the agent should call.

Bronze metadata, Bronze layer creation, and Genie Space creation are **not** prerequisites for this prompt. They are optional backends, not gates.

### Prerequisite

`workspace_setup_deploy` (input_id 4) completed: catalog + warehouse resolved as `{lakehouse_default_catalog}` and `{default_warehouse}`. `agent_tool_selection` (input_id 218) completed so `docs/agent_tool_plan.yaml` is available. Do **not** run this prompt before the workspace preflight or before the Tool Plan exists.

### Steps to Apply

**Step 1: Start New Agent Thread** — open your Coding Assistant, start a new Agent thread.

**Step 2: Paste the Prompt** — paste this entire prompt; the AI will invoke the foundation 00 skill and create resources idempotently.

**Step 3: Verify** — `databricks volumes list {lakehouse_default_catalog} {db_schema}_agent --output json | jq '.volumes[].full_name'` should list `{db_schema}_knowledge_sources` and `{db_schema}_agent_outputs`. `databricks unity-catalog schemas list --catalog-name {lakehouse_default_catalog} --output json | jq '.schemas[] | select(.name | endswith("_agent") or endswith("_ops")) | .full_name'` should list both schemas.

---

## 2️⃣ What Are We Building?

We are provisioning the **two UC schemas + canonical managed volumes** that every later Track A and SDLC prompt assumes already exists. This is the foundation-of-foundations: idempotent, user-scoped, and consumed by KA, MLflow tracing, agent runtime, sign-off, monitoring, and benchmarks.

```
{lakehouse_default_catalog}
├── {db_schema}_agent                    (consumed by KA, MLflow tracing, agent runtime)
│   ├── {db_schema}_knowledge_sources    (volume — KA source files)
│   └── {db_schema}_agent_outputs        (volume — tool-generated artifacts)
└── {db_schema}_ops                      (consumed by sign-off, monitoring, alerts)
    ├── otel_*  (4 Delta tables — written by 41 MLflow Tracing)
    ├── signoffs/v1/decision.md          (written by 53 Human Review)
    └── benchmarks                       (written by 50 Eval Datasets)
```

### Key Concepts

| Concept | What It Means | Why It Matters |
|---------|---------------|----------------|
| **`{db_schema}_agent`** | Runtime-resource schema: Knowledge Assistant source volume, agent_outputs volume, MLflow OTel tables | One namespace for everything the running agent reads/writes |
| **`{db_schema}_ops`** | Governance/observability schema: sign-offs, benchmarks, monitoring artifacts | RBAC differs from runtime — operators can grant `_ops` access without exposing live tools |
| **MANAGED volumes** | UC-managed storage paths (`/Volumes/{catalog}/{schema}/{volume}`) | Agent code never sees a raw cloud path; UC handles encryption, lineage, retention |
| **`AGENT_RESOURCE_PREFIX`** | Identity-derived prefix (`{firstname}_{lastinitial}_{slug}`) used for all agent-scoped names | Keeps every learner's agent isolated; the 26-char Databricks Apps name limit is enforced via truncation |
| **Idempotency contract** | Every `CREATE` is `IF NOT EXISTS`; `volumes.create()` treats `AlreadyExists` as success | Running this prompt twice produces zero new resources and zero errors — a warm workspace is a valid terminal state |

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It's Used Here |
|----------|--------------------|
| **User-scoped naming** | `{firstname}-{lastinitial}-{use_case_slug}` keeps every learner's agent isolated; truncated to ≤26 chars (Databricks Apps limit) before being lowercased and underscored into `{db_schema}`. |
| **Two schemas, not one** | `_agent` (runtime resources) is separated from `_ops` (governance/observability) so RBAC differs cleanly — operators get `_ops` without seeing live KA/agent tool storage. |
| **MANAGED volumes** | UC manages storage; the agent never sees a raw cloud path. Encryption, lineage, and retention are inherited from the catalog policy. |
| **Idempotency contract** | Every `CREATE` is `IF NOT EXISTS` and the skill treats `AlreadyExists` as success. Running this prompt twice produces zero new resources — pre-existing schemas/volumes are explicitly acceptable. |
| **Foundation-of-foundations** | Every later skill reads the captured `agent_schema`, `ops_schema`, `knowledge_source_path`, `agent_outputs_path` from state instead of recomputing them — there is exactly one source of truth for these values. |

---

## 4️⃣ What Happens Behind the Scenes?

The skill executes a deterministic 8-phase walk with idempotent guards at every step:

| Phase | What Happens | Key Output |
|-------|--------------|------------|
| **Phase 0** | Read `$APP_ROOT/.vibecoding-state.md`; pull captured values from earlier phases | Prior state |
| **Phase 0.5 (hydrate)** | `vibecoding-state` op `hydrate_from_files` reads `docs/agent_spec.yaml`, `docs/agent_tool_plan.yaml`, `docs/ui_design.md`, and `docs/design_prd.md` and writes `## Agent`, `## UI`, `## Spec Provenance` (and `## Resources` as `optional: true` if no Lakehouse track ran). Stamps `resolver_version: "3.0"` and `hydrated_from_files: true`. Idempotent on rerun. | Hydrated state objects |
| **Phase 1** | Resolve identity from `databricks current-user me` → derive `APP_NAME`, `DB_SCHEMA`, `AGENT_APP_NAME`, `AGENT_RESOURCE_PREFIX` | Identity-scoped names |
| **Phase 2** | `CREATE SCHEMA IF NOT EXISTS {catalog}.{db_schema}_agent` | Agent schema |
| **Phase 3** | `CREATE SCHEMA IF NOT EXISTS {catalog}.{db_schema}_ops` | Ops schema |
| **Phase 4** | `volumes.create(...)` for `{db_schema}_knowledge_sources` (KA source files) — wrap `AlreadyExists` as success | KA volume |
| **Phase 5** | `volumes.create(...)` for `{db_schema}_agent_outputs` (tool-generated artifacts) — same idempotent wrap | Outputs volume |
| **Phase 6** | Plus any extra volumes from `docs/agent_tool_plan.yaml.resource_grants.required_volumes[]`, prefixed with `{db_schema}_` | Optional volumes |
| **Phase 7** | `vibecoding-state` op `exit` captures `app_name`, `db_schema`, `agent_app_name`, `agent_resource_prefix`, `agent_schema`, `ops_schema`, `uc_volumes`, `knowledge_source_path`, `agent_outputs_path`, `hydrated_from_files: true`, and `resolver_version: "3.0"` | State hand-off |

### Gate Contract

| Reads gate | Produces gate | Captured state |
|------------|---------------|----------------|
| `Infrastructure healthy` (from `workspace_setup_deploy`, accepts `Infrastructure healthy with warnings`) AND `Agent tool plan ready` (from `agent_tool_selection`) | `UC resources ready` (consumed by 41, 42, 43, 44, 45, 46) | `app_name`, `db_schema`, `agent_app_name`, `agent_resource_prefix`, `agent_schema`, `ops_schema`, `uc_volumes`, `knowledge_source_path`, `agent_outputs_path` |

</details>

<details><summary><strong>Expected Output</strong></summary>

### Resources Created (or Pre-existing — Both Acceptable)
- [ ] UC schema `{lakehouse_default_catalog}.{db_schema}_agent` exists (created or already there)
- [ ] UC schema `{lakehouse_default_catalog}.{db_schema}_ops` exists (created or already there)
- [ ] MANAGED volume `/Volumes/{lakehouse_default_catalog}/{db_schema}_agent/{db_schema}_knowledge_sources` exists (empty is OK — F5 stages content later; an already-populated volume is also OK)
- [ ] MANAGED volume `/Volumes/{lakehouse_default_catalog}/{db_schema}_agent/{db_schema}_agent_outputs` exists
- [ ] `app_name`, `db_schema`, `agent_app_name`, `agent_schema`, `ops_schema`, `uc_volumes`, `knowledge_source_path`, and `agent_outputs_path` all captured
- [ ] All consuming skills (F2, F5, Track A 05, SDLC 02/04/07) can now assume these resources exist
- [ ] **State hydration:** `$APP_ROOT/.vibecoding-state.md` now contains populated `## Agent`, `## UI`, and `## Spec Provenance` sections sourced from `docs/agent_spec.yaml`, `docs/agent_tool_plan.yaml`, `docs/ui_design.md`, and `docs/design_prd.md`. `## Spec Provenance.resolver_version` reads `"3.0"` and `## Spec Provenance.hydrated_from_files` reads `true`. `## Resources` is either populated (Lakehouse track present) or stamped `optional: true` (Agents-only path).
- [ ] **Downstream contract:** every prompt that reads `state://AgentSpec.*`, `state://AppSpec.*`, or `state://Spec Provenance.*` resolves to the file-derived values. SDLC quality-suite prompts (50–56) can run without an additional resolve step.
- [ ] **Idempotency check:** running this prompt a second time produces zero new schemas, zero new volumes, zero changed sections in the state file (modulo `resolved_at`), and zero errors.

</details>

---

## Phase 1 / Agent Foundation — Create Knowledge Assistant

| Field | Value |
|-------|-------|
| `input_id` | `202` |
| `section_tag` | `knowledge_assistant_create` |
| `order_number` | `42` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Create or sync a user-scoped Databricks Knowledge Assistant for the agent doc-Q&A tool_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Create a Databricks **Knowledge Assistant** (Agent Bricks KA) seeded with the **{use_case_slug}** agent's domain documents and expose it as a managed RAG endpoint the agent can call as a single `@function_tool`. Today the agent has no doc-Q&A surface; after this prompt runs, source markdown is staged into the `{db_schema}_knowledge_sources` UC volume, a user-scoped KA exists on `{agent_app_name}-knowledge`, and the endpoint is `READY` with `knowledge_source_file_count >= 1`.

This will involve the following steps:

- **Stage source documents** — populate the F0-provisioned `/Volumes/{lakehouse_default_catalog}/{db_schema}_agent/{db_schema}_knowledge_sources` volume from `ka_source` (or auto-generate a minimal corpus from `docs/design_prd.md` glossary/business-context plus `docs/agent_spec.yaml.agent.capabilities`)
- **Get-or-create the KA** — idempotent get-or-create on `ka_display_name = {agent_app_name}-knowledge` so a second run never duplicates the endpoint
- **Attach the knowledge source** — bind a `files` knowledge source to the staged volume path, reusing any pre-existing matching source
- **Sync and poll** — call `sync_knowledge_sources` (incremental) and poll until `sync_status = READY`
- **Smoke-test the endpoint** — confirm the KA serving endpoint responds and capture `ka_endpoint_name`, `knowledge_assistant_id`, `sync_status` as state for the wire-tools prompt
- **Skip cleanly when not selected** — if `agent_tool_plan.knowledge_assistant.selected: false`, exit with gate `Skipped - KA not selected` and no resources are touched

If `docs/agent_tool_plan.yaml` has `knowledge_assistant.selected: false`, do not create or sync a KA. Instead, call `skills/vibecoding-state` op `exit` with gate `Skipped - KA not selected` and captured `{doc_qa_backend: "n/a", ka_endpoint_name: "n/a", knowledge_assistant_id: "n/a"}`.

**How this prompt chains with the prior step (skill invocations):**

**Invoke skills (in order):**

1. `skills/vibecoding-state` op `enter` — params: `prompt_id: "knowledge_assistant_create"`, `require_prior_gate: [{prompt_id: "uc_resources_foundation", gate: "UC resources ready"}, {prompt_id: "agent_tool_selection", gate: "Agent tool plan ready"}]`.
2. @genai-agents/foundation/05-knowledge-assistant/SKILL.md — execute Step 5_0 (source-markdown staging only) → 5a–5d. Params:
   - `agent_tool_plan_ref: "docs/agent_tool_plan.yaml"`
   - `ka_source: docs/agent_tool_plan.yaml.knowledge_assistant.ka_source`
   - `run_only_if: docs/agent_tool_plan.yaml.knowledge_assistant.selected == true`
   - `ka_display_name: "{agent_app_name}-knowledge"`  -- **idempotency key** for Step 5a get-or-create
   - `volume_path: "/Volumes/{lakehouse_default_catalog}/{db_schema}_agent/{db_schema}_knowledge_sources"`  -- set by F0
   - `poll_until_ready: true`
   - **Idempotency contract (whole skill):** every step must succeed cleanly on a second run with no input changes. Step 5_0 uses `overwrite=True` on file uploads. Step 5a does **get-or-create** on `ka_display_name` (re-uses the matching KA from `list_knowledge_assistants` instead of creating a duplicate). Step 5b does **get-or-create** on each knowledge source `display_name` (re-uses matching sources from `list_knowledge_sources`). Step 5c (`sync_knowledge_sources`) is incremental and safe to re-call. A second run must produce zero new KAs and zero new knowledge sources.
   - **Step 5_0 responsibility (KA-specific):** stage source markdown into the F0-provisioned volume — branch (A) skip if the volume is already non-empty; branch (B) upload the contents of `ka_source` if it points to a local `.md` directory; branch (C) auto-generate a minimal corpus from `docs/design_prd.md` (extract any glossary, key-terms, or business-context sections — fall back to the PRD's executive summary if none are explicitly marked) plus `docs/agent_spec.yaml.agent.capabilities` and upload. Do **not** consult `state://DataSpec.*`: the Agents Accelerator visible path may not have run a Lakehouse track, so `## Resources` will be `optional: true` (set by `vibecoding-state.hydrate_from_files` in step 40). The `docs/*` files are the single source of truth for branch (C). **No schema or volume DDL** — if `volume_path` is unreachable, fail with a pointer to F0 (input_id 200).
   - **Steps 5a–5d:** get-or-create KA → get-or-create `files` source at `volume_path` → sync → poll → capture handoff values.
   - **Returns:** `knowledge_source_path`, `knowledge_source_file_count`, `knowledge_source_origin` (`pre_staged` | `local_dir` | `prd_generated`), `ka_endpoint_name`, `knowledge_assistant_id`, `knowledge_source_type`, `sync_status`. (`agent_schema` and `knowledge_source_volume` come from F0's state, not from this prompt.)
3. `skills/vibecoding-state` op `exit` — params: `prompt_id: "knowledge_assistant_create"`, `gate: "KA READY"`, `captured: {doc_qa_backend: "knowledge_assistant", knowledge_source_path, knowledge_source_file_count, knowledge_source_origin, ka_endpoint_name, knowledge_assistant_id, knowledge_source_type, sync_status}`.

**Gate:** `KA READY` — `sync_status = READY`, `knowledge_source_file_count >= 1`, `ka_endpoint_name` and `knowledge_assistant_id` captured into state, KA reachable from a quick `WorkspaceClient.serving_endpoints.get()` smoke call.

If a PRD exists at @docs/design_prd.md, reference it for business requirements, user personas, and workflows.
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## 1️⃣ How To Apply

Copy the prompt above, start a **new Agent thread** in your Coding Assistant, and paste it. The agent will load `genai-agents/foundation/05-knowledge-assistant/SKILL.md` and create a user-scoped KA that the Track A agent will wire as a tool in the next prompt.

### Prerequisite

Required:
- [ ] `uc_resources_foundation` (input_id 200) — owns the agent UC schema (`{db_schema}_agent`) and the `{db_schema}_knowledge_sources` MANAGED volume.
- [ ] `agent_tool_selection` (input_id 218) — `docs/agent_tool_plan.yaml` exists.

Conditional execution:
- This prompt runs only when `docs/agent_tool_plan.yaml.knowledge_assistant.selected == true`. If KA is not selected, the prompt exits cleanly with gate `Skipped - KA not selected` and creates no resources.

Source document modes (any one is acceptable; no Bronze/Genie dependency):
- **Pre-staged** — the `{db_schema}_knowledge_sources` volume already contains `.md` files (Step 5_0 detects this and skips re-uploading).
- **Local directory** — `ka_source` points at a local `.md` directory and Step 5_0 uploads its contents.
- **PRD/spec-generated** — Step 5_0 auto-generates a minimal corpus from `docs/design_prd.md` (glossary, key-terms, or business-context sections; falls back to the executive summary) plus `docs/agent_spec.yaml.agent.capabilities`, then uploads. Branch (C) does **not** read `state://DataSpec.*` — `## Resources` may be stamped `optional: true` by step 40's `hydrate_from_files`.

Bronze tables, Genie Spaces, and Data Intelligence outputs are **not** required for this prompt. The KA reads only from the UC volume that step 40 provisioned. **This prompt does not run any `CREATE SCHEMA` or `CREATE VOLUME` DDL** — that responsibility belongs to step 40.

### Steps to Apply

**Step 1: Start New Agent Thread** — open your Coding Assistant, start a new Agent thread.

**Step 2: Paste the Prompt** — paste this entire prompt; the AI will invoke the foundation 05-knowledge-assistant skill end-to-end.

**Step 3: Verify** — `databricks serving-endpoints list --output json | jq '.endpoints[] | select(.name | startswith("ka-"))'` should show the KA endpoint in `READY` state.

---

## 2️⃣ What Are We Building?

We are creating (or reusing) a **Databricks Knowledge Assistant** — a managed RAG endpoint that wraps document parsing + chunking + embedding + retrieval + serving. The agent calls KA as a single `@function_tool` instead of building any of that plumbing itself.

```
Documents (.md files)             Knowledge Assistant (Databricks-managed)
in UC Volume                      ┌───────────────────────────────────────┐
┌───────────┐                     │ Parse → Chunk → Embed (Vector Search) │
│ doc1.md   │                     │   ↓                                   │
│ doc2.md   │  ──── sync ────►    │ Hybrid search + reranker              │
│ doc3.md   │                     │   ↓                                   │
└───────────┘                     │ Serving endpoint (READY)              │
                                  └───────────────┬───────────────────────┘
                                                  │ ka_endpoint_name
                                                  ▼
                                  Agent calls as a single @function_tool
```

### Key Concepts

| Concept | What It Means | Why It Matters |
|---------|---------------|----------------|
| **Knowledge Assistant** | Managed Databricks service that bundles parsing, chunking, embedding (Vector Search), hybrid retrieval, and reranking behind a single serving endpoint | The agent never owns RAG plumbing; one tool call replaces a hand-built pipeline |
| **`ka_display_name`** | Idempotency key for KA get-or-create (`{agent_app_name}-knowledge`) | Second runs reuse the existing KA; the prompt never silently creates duplicates |
| **`knowledge_source_path`** | UC volume path `/Volumes/{catalog}/{db_schema}_agent/{db_schema}_knowledge_sources` provisioned by 40 | The KA reads source docs from a governed UC volume — never DBFS or raw cloud paths |
| **Three staging modes** | `pre_staged` (volume already populated), `local_dir` (upload from `ka_source`), `prd_generated` (auto-generate from `docs/design_prd.md` glossary/business-context + `docs/agent_spec.yaml.agent.capabilities`) | Adapts to how the use-case bundle ships content; recorded as `knowledge_source_origin` for downstream traceability. Branch `prd_generated` reads only the `docs/*` files — never `state://DataSpec.*`, which may be `optional: true` on the Agents-only path. |
| **Skip-on-not-selected** | If `agent_tool_plan.knowledge_assistant.selected: false`, exit with gate `Skipped — KA not selected` and no resources are touched | Tool families the use case doesn't need leave clean state, not orphaned KAs |

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It's Used Here |
|----------|--------------------|
| **Managed RAG** | KA hides the RAG plumbing (chunking, embeddings, retrieval, reranking) behind a serving endpoint; the agent calls it like any other tool. The build phase (44) wires KA in 5 lines, not 50. |
| **Get-or-create idempotency** | `display_name` is the idempotency key; the second run reuses the existing KA via `list_knowledge_assistants`, never creates a duplicate. The same is true for each knowledge source attached to it. |
| **Source files in UC volumes** | The knowledge corpus lives in a UC managed volume created by 40, never in DBFS or cloud storage paths. KA reads through governance — RBAC and retention come for free. |
| **Three source-staging modes** | Pre-staged (volume already populated), local directory upload, or auto-generated from `docs/design_prd.md` (glossary / key-terms / business-context with executive-summary fallback) plus `docs/agent_spec.yaml.agent.capabilities`. The chosen branch is recorded in state as `knowledge_source_origin`. Branch (C) does **not** consult `state://DataSpec.*`. |
| **Skip-on-not-selected** | If `agent_tool_plan.knowledge_assistant.selected: false`, this prompt records `Skipped — KA not selected` and exits without creating anything. The downstream wire-tools prompt then registers no KA tool. |

---

## 4️⃣ What Happens Behind the Scenes?

The skill executes 5 ordered sub-steps (5_0 → 5d) with idempotency guards at every step:

| Phase | What Happens | Key Output |
|-------|--------------|------------|
| **5_0** | Stage source markdown into the F0-provisioned volume — branch (A) skip if non-empty, (B) upload from `ka_source` directory, or (C) auto-generate from `docs/design_prd.md` (glossary / key-terms / business-context, executive-summary fallback) plus `docs/agent_spec.yaml.agent.capabilities`. Branch (C) MUST NOT read `state://DataSpec.*`. | `knowledge_source_origin`, `knowledge_source_file_count` |
| **5a** | Get-or-create KA on `ka_display_name` (= `{agent_app_name}-knowledge`); reuse matching from `list_knowledge_assistants` instead of creating duplicate | `ka_endpoint_name`, `knowledge_assistant_id` |
| **5b** | Get-or-create `files` knowledge source bound to `volume_path`; reuse via `list_knowledge_sources` | `knowledge_source_type` |
| **5c** | `sync_knowledge_sources` — incremental, safe to re-call | Synced |
| **5d** | Poll until `sync_status = READY`; capture all hand-off values into state | `sync_status: READY` |

### Gate Contract

| Reads gate | Produces gate | Captured state |
|------------|---------------|----------------|
| `UC resources ready` (from `uc_resources_foundation`) AND `Agent tool plan ready` (from `agent_tool_selection`) | `KA READY` OR `Skipped - KA not selected` | `doc_qa_backend`, `knowledge_source_path`, `knowledge_source_file_count`, `knowledge_source_origin`, `ka_endpoint_name`, `knowledge_assistant_id`, `knowledge_source_type`, `sync_status` |

</details>

<details><summary><strong>Expected Output</strong></summary>

### Resources Created

The bullets below are conditional on the `docs/agent_tool_plan.yaml.knowledge_assistant.selected` flag. When KA is not selected, the prompt explicitly creates no resources and exits with gate `Skipped - KA not selected`; the only Expected Output is the captured-state stub below.

**If `docs/agent_tool_plan.yaml.knowledge_assistant.selected == true` (gate `KA READY`):**
- [ ] UC Volume `/Volumes/{lakehouse_default_catalog}/{db_schema}_agent/{db_schema}_knowledge_sources/` populated with at least one `.md` file (`knowledge_source_file_count >= 1`) — schema + volume themselves were created by `uc_resources_foundation` (input_id 200)
- [ ] `knowledge_source_origin` recorded (`pre_staged` | `local_dir` | `prd_generated`) — proves Step 5_0 took a deterministic branch
- [ ] User-scoped Knowledge Assistant `{agent_app_name}-knowledge` created **or reused** via get-or-create on `display_name` (idempotent)
- [ ] Knowledge source attached **or reused** via get-or-create on `display_name` (idempotent)
- [ ] `ka_endpoint_name`, `knowledge_assistant_id`, `sync_status: READY` captured in state
- [ ] `doc_qa_backend = knowledge_assistant` recorded in state for the next tool-wiring prompt
- [ ] **Idempotency check:** running this prompt a second time with the same `ka_display_name` produces zero new KAs and zero new knowledge sources

**If `docs/agent_tool_plan.yaml.knowledge_assistant.selected == false` (gate `Skipped - KA not selected`):**
- [ ] No UC volumes are populated, no KA endpoint is created, no knowledge source is attached, and no sync is invoked. Step 5_0 through 5d do **not** run.
- [ ] State captures the explicit skip stub: `doc_qa_backend: "n/a"`, `ka_endpoint_name: "n/a"`, `knowledge_assistant_id: "n/a"`. The remaining handoff fields (`knowledge_source_path`, `knowledge_source_file_count`, `knowledge_source_origin`, `knowledge_source_type`, `sync_status`) are absent or `"n/a"` — never `READY` or a real path.
- [ ] Step 44 reads `knowledge_assistant.selected == false` and skips the KA tool family cleanly (no `tools/ka.py` is generated, no KA serving-endpoint grant is added to `databricks.yml`, no KA TOOL span appears in MLflow).

</details>

#### Fork — `coding_assistant = genie-code`  (input_id 913)

> Fork rows override only `input_template`, `system_prompt`, and `bypass_llm`. All display fields are inherited from the default row above.

| Field | Value |
|-------|-------|
| `input_id` | `913` |
| `section_tag` | `knowledge_assistant_create` |
| `order_number` | `(inherited)` |
| `coding_assistant` | `genie-code` |
| `bypass_llm` | `true` |

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Create a Knowledge Assistant (KA) over staged Unity Catalog documents via the REST contract. Before this step there is no KA; after it, the KA and its source are created, synced, and verified READY — or cleanly skipped if KA is not selected.

This will involve the following steps:

- **Skip cleanly if KA is not selected**.
- **Load the skills** — full `skill_ref_root`-prefixed paths.
- **Stage source documents** — into the UC volume.
- **Get-or-create the KA and source** — sync and poll, all via `w.api_client.do`.
- **Verify** — read-only.

The steps below are the prescriptive runbook for those actions; follow them in order.

**Genie Code — this is a prescriptive runbook. Follow the steps in order. Do NOT improvise paths, do NOT use bare relative paths, do NOT use `@`-mentions, and do NOT reach for the `w.knowledge_assistants` SDK module — it does NOT exist in the bundled `databricks-sdk 0.67.0`. Every skill is named by its full `skill_ref_root`-prefixed path; every Knowledge Assistant (KA) call goes through the generic REST escape hatch `w.api_client.do(...)`. This stands up the **{use_case_slug}** agent's Knowledge Assistant.**

### 🔴 Non-negotiable execution rules (read before anything)

❌ **NEVER call `w.knowledge_assistants.*`.** On Genie Code's `databricks-sdk 0.67.0`, `hasattr(w, "knowledge_assistants")` is **False** — every `w.knowledge_assistants.list_knowledge_assistants()` / `create_knowledge_assistant(...)` / `create_knowledge_source(...)` / `sync_knowledge_sources(...)` the foundation skill describes raises `AttributeError`. The REST API is live; you reach it through `w.api_client.do(<verb>, <path>, body=…)`. Do **NOT** `uv pip install -U databricks-sdk` to get the wrapper — the upgrade is ephemeral (gone next session) and unnecessary.

❌ **NEVER verify with `curl` + `databricks auth token`.** `auth token` is hard-blocked on Genie Code. Verify with the pre-authenticated `WorkspaceClient` via `executeCode` (`w.serving_endpoints.get(...)`) or `databricks serving-endpoints get` through `runDatabricksCli`.

✅ The things you run directly are (a) the KA REST calls via `w.api_client.do(...)` inside `executeCode`, (b) volume file staging via `w.files.upload(...)` / `w.dbutils`-free SDK uploads, and (c) **read-only** inspection (`databricks serving-endpoints list/get`, `w.serving_endpoints.get(...)`).

### KA REST contract (use these EXACT verb + path pairs)

`w.knowledge_assistants.<method>` → `w.api_client.do(<verb>, <path>, body=<dict>)`. Prefer the `2.1` prefix; fall back to `2.0` ONLY if a `2.1` verb returns 404 (the API is mid-migration):

| Operation | `w.api_client.do(...)` |
|---|---|
| list KAs (idempotency lookup) | `do("GET", "/api/2.1/knowledge-assistants")` |
| create KA (body needs ≥1 knowledge source) | `do("POST", "/api/2.1/knowledge-assistants", body={...})` |
| get / update / delete KA | `do("GET" / "PATCH" / "DELETE", f"/api/2.1/{ka_name}")` |
| list / create knowledge sources | `do("GET" / "POST", f"/api/2.1/{ka_name}/knowledge-sources", body={...})` |
| sync knowledge sources | `do("POST", f"/api/2.1/{ka_name}/knowledge-sources:sync")` |

Poll readiness with `w.serving_endpoints.get(ka_endpoint_name)` (available) until the KA's `sync_status == "READY"`.

### Step 0 — Resolve your environment (once, before anything else)

Run `skills/vibecoding-state` operation `enter` with `prompt_id: "knowledge_assistant_create"` and `require_prior_gate: [{prompt_id: "uc_resources_foundation", gate: "UC resources ready"}, {prompt_id: "agent_tool_selection", gate: "Agent tool plan ready"}]`. Read these resolved values and use them literally:

- `client_context` = `genie_code`
- `artifact_root` = your workshop project root (e.g. `/Workspace/Users/<your-email>/vibe-coding-workshop`) — where all generated bundles/apps/docs build; the repo itself is cloned at `/Workspace/Users/<your-email>/.assistant/skills/vibe-coding-workshop` (skills load from there via `skill_ref_root`, NOT from `artifact_root`)
- `skill_ref_root` = `skills/vibe-coding-workshop` (substitute your clone folder if different)
- `agent_app_root` = `<artifact_root>/{agent_app_name}` — the top-level Track A agent app dir (the `docs/agent_tool_plan.yaml` and `docs/agent_spec.yaml` this prompt reads live under it once the agent app exists; pre-clone, read them from where `agent_tool_selection` wrote them under `artifact_root`).
- Workspace: `{workspace_url}`
- `ka_display_name` = `{agent_app_name}-knowledge` (idempotency key)
- `volume_path` = `/Volumes/{lakehouse_default_catalog}/{db_schema}_agent/{db_schema}_knowledge_sources` (provisioned by `uc_resources_foundation`)

If `enter` reports either prior gate is unmet, STOP and finish that prompt first. If `enter` has not run in this thread, run it now.

### Step 0a — Skip cleanly if KA is not selected

Read `docs/agent_tool_plan.yaml.knowledge_assistant.selected` (resolve `docs/` under `artifact_root`/`agent_app_root`). If it is `false`, do **nothing** else: run `skills/vibecoding-state` op `exit` — `prompt_id: "knowledge_assistant_create"`, `gate: "Skipped - KA not selected"`, `captured: {doc_qa_backend: "n/a", ka_endpoint_name: "n/a", knowledge_assistant_id: "n/a"}` — and end the prompt. Create no volumes, no KA, no sources.

### Step 1 — Load the required skills by their FULL `skill_ref_root`-prefixed paths

Load each with `readSkillFile` using its `<skill_ref_root>`-prefixed path — NEVER a bare `@…` mention, NEVER a repo-relative path. **The root-level `skills/` come FIRST: they are the highest-priority, always-on guardrails.**

1. `readSkillFile("skills/vibe-coding-workshop/skills/genie-code-environment/SKILL.md")` — §6b is the normative KA-on-Genie-Code contract (the REST table above comes from it). Loading this flips the manifest-load gate.
2. `readSkillFile("skills/vibe-coding-workshop/skills/databricks-expert-agent/SKILL.md")` — extract names/IDs from source + `.vibecoding-state.md`; never hardcode or hallucinate.
3. `readSkillFile("skills/vibe-coding-workshop/genai-agents/foundation/05-knowledge-assistant/SKILL.md")` — the orchestrator (Steps 5_0 → 5a–5d: stage docs → get-or-create KA → attach source → sync → poll). **Translate each `w.knowledge_assistants.*` call it shows into the `w.api_client.do(...)` pair from the table above** — the skill's step LOGIC (idempotency, branches, polling) is correct; only the SDK surface changes.
4. `readSkillFile("skills/vibe-coding-workshop/data_product_accelerator/skills/common/naming-tagging-standards/SKILL.md")` — KA / source naming + COMMENTs. **NEVER name a KA or source without reading this.**

When the orchestrator names further references, load EACH the same way — prefix its repo-relative path with `skill_ref_root`. Genie Code has no repo-root-relative resolution and `AGENTS.md` does not carry across threads. Read independent files in one batched `readSkillFile` turn.

### Step 2 — Stage source documents into the UC volume

Run the foundation skill's **Step 5_0** logic against `volume_path` (from Step 0), via `executeCode` with the pre-authenticated `w`:

- Branch (A) — if `volume_path` already holds `.md` files, skip re-upload.
- Branch (B) — if `docs/agent_tool_plan.yaml.knowledge_assistant.ka_source` points at a local `.md` directory, upload its contents with `overwrite=True`.
- Branch (C) — else auto-generate a minimal corpus from `docs/design_prd.md` (glossary / key-terms / business-context, executive-summary fallback) plus `docs/agent_spec.yaml.agent.capabilities`, and upload.

Do **NOT** run any `CREATE SCHEMA` / `CREATE VOLUME` DDL — that was `uc_resources_foundation` (input_id 200). If `volume_path` is unreachable, STOP and point back to that prompt. Branch (C) reads only `docs/*`, never `state://DataSpec.*`.

### Step 3 — Get-or-create the KA + source, sync, poll (all via `w.api_client.do`)

Inside `executeCode` with the pre-authenticated `w`, in order (idempotent — a second run creates zero new KAs / sources):

1. **Get-or-create KA.** `do("GET", "/api/2.1/knowledge-assistants")`; if a KA with `display_name == ka_display_name` exists, reuse it; else `do("POST", "/api/2.1/knowledge-assistants", body={... display_name=ka_display_name, at least one knowledge source bound to volume_path ...})`. Capture `knowledge_assistant_id` and `ka_endpoint_name` from the response.
2. **Get-or-create the `files` knowledge source** at `volume_path`: `do("GET", f"/api/2.1/{ka_name}/knowledge-sources")` then reuse-or-`do("POST", ...)`.
3. **Sync:** `do("POST", f"/api/2.1/{ka_name}/knowledge-sources:sync")` (incremental, safe to re-call).
4. **Poll** `w.serving_endpoints.get(ka_endpoint_name)` until `sync_status == "READY"`.

If any `2.1` verb 404s, retry the same call on `/api/2.0/...`. If it still fails, STOP and report — do NOT fall back to the missing SDK wrapper.

### Step 4 — Verify (read-only)

Confirm the endpoint is live without `curl`/`auth token`:
- `executeCode`: `w.serving_endpoints.get(ka_endpoint_name)` returns the endpoint and `sync_status == "READY"`, OR
- `runDatabricksCli`: `databricks serving-endpoints list --output json | jq '.endpoints[] | select(.name | startswith("ka-"))'` shows it `READY`.

PASS = `sync_status == "READY"` AND `knowledge_source_file_count >= 1`.

**State-lock:** this prompt runs between an `enter` (Step 0) and an `exit`. After the gate passes, run `skills/vibecoding-state` op `exit` — params: `prompt_id: "knowledge_assistant_create"`, `gate: "KA READY"`, `captured: {doc_qa_backend: "knowledge_assistant", knowledge_source_path, knowledge_source_file_count, knowledge_source_origin, ka_endpoint_name, knowledge_assistant_id, knowledge_source_type, sync_status}`. **This `enter`/`exit` pair is a mandatory ritual, not advisory.** Step 0's `enter` MUST locate — or, if this is the first prompt of the track, bootstrap-create — the canonical live state file at `<agent_app_root>/.vibecoding-state.md` (never the temporary `example/…` bootstrap path). The closing `exit` MUST append this prompt's Per-Step Log entry, Gate result, and `captured` vars to that file, then **re-read it and echo the appended section to prove the write landed**. **Gate completion rule:** this prompt is NOT complete until that re-read confirms the appended entry — the chat summary is NOT the state store.

**Gate:** `KA READY` — `sync_status == "READY"`, `knowledge_source_file_count >= 1`, `ka_endpoint_name` and `knowledge_assistant_id` captured into state, KA reachable from a read-only `w.serving_endpoints.get(...)` smoke call — OR `Skipped - KA not selected` when the Tool Plan did not select KA. The KA existing is necessary but NOT sufficient: if it was created via the (absent) `w.knowledge_assistants` wrapper rather than the REST contract, the run never reached this gate.
```

---

## Phase 2 / Agent Build — Clone + Framework

| Field | Value |
|-------|-------|
| `input_id` | `203` |
| `section_tag` | `track_a_agent_app_clone_framework` |
| `order_number` | `43` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Clone the agent-openai-advanced template, install deps, run dev server, wire module-level invoke/stream handlers (Option B)_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Clone the Track A agent-app framework template (FastAPI host + OpenAI Agents SDK + MLflow tracing + two-layer Lakebase memory) into its own **top-level** directory `$AGENT_APP_ROOT` (= `<agent_app_name>/` at the repo root — a sibling of `apps_lakebase/` and of the AppKit `$APP_ROOT`, NOT nested inside `apps_lakebase/`) and stand up the **{use_case_slug}** agent's runtime shell. This mirrors how the AppKit app lives in its own top-level `$APP_ROOT` and the data-product bundle in `{user_schema_prefix}_<use_case_slug>_dab/`, so the agent app's root has parity across coding agents. Today there is no agent app code; after this prompt runs, the cloned app boots locally with `uv run dev`, responds to a "Hello" smoke test, emits MLflow AGENT spans at `{mlflow_experiment_path}`, and is registered in `databricks.yml`.

This will involve the following steps:

- **Clone the framework template** — `git clone` the `agent-openai-advanced` template into `$AGENT_APP_ROOT/` so the canonical scaffold (Option B handlers + Lakebase memory pre-wired) becomes the starting point
- **Install dependencies with `uv`** — run `uv pip install -e .` against the template's `pyproject.toml` so local + deployed runtimes share the same dependency tree
- **Wire Option B module-level handlers** — wire `@mlflow.genai.agent_server.invoke` and `@stream` async handlers (canonical for Databricks Apps; not the rejected `mlflow.pyfunc.ResponsesAgent` path)
- **Drive the model from `config.yml`** — write `llm_endpoint`, `llm_api_base_url`, `llm_api_mode` from `runtime_config.llm` into `config.yml` so Python never hardcodes the model endpoint
- **Smoke-test the framework** — start `uv run dev`, send "Hello", and confirm an MLflow AGENT span appears at `{mlflow_experiment_path}` before any tools are wired
- **Register the app in `databricks.yml`** — declare the new agent app so the bundle deploy phase later can lift it as a Databricks App resource

**First:** Read `$AGENT_APP_ROOT/.vibecoding-state.md` if it exists — it carries resolved issues and variable values from prior phases. `enter` resolves `$AGENT_APP_ROOT` (= `<artifact_root>/<agent_app_name>`, the top-level agent app dir) for you; from this point on, all agent-app file paths are relative to `$AGENT_APP_ROOT/`.

**How this prompt chains with the prior step (skill invocations):**

**Invoke skills (in order):**

1. `skills/vibecoding-state` op `enter` — params: `prompt_id: "track_a_agent_app_clone_framework"`, `require_prior_gate: [{prompt_id: "mlflow_agent_tracing_uc", gate: "Tracing live; UC OTel tables ready"}, {prompt_id: "agent_tool_selection", gate: "Agent tool plan ready"}]`.
2. @genai-agents/tracks/A-custom-agent-apps/01-clone-and-run/SKILL.md — params:
   - `template: "agent-openai-advanced"` (canonical: short-term + long-term Lakebase memory built in)
   - `agent_name: "{agent_app_name}"`
   - `install_deps: true`
   - `start_dev_server: true`
   - `walkthrough_project_structure: true`
   - `smoke_test_prompt: "Hello"`
3. @genai-agents/tracks/A-custom-agent-apps/02-agent-framework/SKILL.md — params:
   - `agent_name: "{agent_app_name}"`
   - `agent_spec_ref: "docs/agent_spec.yaml"`
   - `agent_tool_plan_ref: "docs/agent_tool_plan.yaml"`
   - `runtime_model_ref: "docs/agent_tool_plan.yaml.runtime_config.llm"`
   - `config_file: "config.yml"`
   - `model_config_keys: ["llm_endpoint", "llm_api_base_url", "llm_api_mode"]`
   - `sdk: "openai-agents-sdk"`
   - `option: "B"` (canonical for Databricks Apps: module-level `@mlflow.genai.agent_server.invoke` + `@stream` handlers; **not** `mlflow.pyfunc.ResponsesAgent`)
   - `mlflow_experiment_path: "{mlflow_experiment_path}"`
   - `streaming_runner: true`
   - `verification: {mlflow_agent_spans_visible: true, invoke_handler_present: true, stream_handler_present: true}`
   - The skill reads `agent.system_prompt` (paste verbatim into `Agent(instructions=...)`), `agent.capabilities[]` (chat-panel capability list), and `docs/agent_tool_plan.yaml.runtime_config.llm` (write `endpoint`, `api_base_url`, and `api_mode` into `config.yml` as `llm_endpoint`, `llm_api_base_url`, and `llm_api_mode`). No model endpoint may be hardcoded in Python.
4. `skills/vibecoding-state` op `exit` — params: `prompt_id: "track_a_agent_app_clone_framework"`, `gate: "Agent framework live"`.

**Gate:** `Agent framework live` — template chat UI responds to "Hello" locally; `config.yml` contains `llm_endpoint`, `llm_api_base_url`, and `llm_api_mode` from `docs/agent_tool_plan.yaml.runtime_config.llm`; the agent uses `ModelConfig(development_config="config.yml")` and `model=config.get("llm_endpoint")`; MLflow AGENT spans are visible for `{agent_app_name}` at `{mlflow_experiment_path}`.

If a PRD exists at @docs/design_prd.md, reference it for business requirements, user personas, and workflows.
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## 1️⃣ How To Apply

**Run this in your cloned Template Repository.** Copy the prompt above into a new Agent thread in your Coding Assistant. The AI will execute `01-clone-and-run` then `02-agent-framework` in order, leaving you with a running local Agent App that emits MLflow AGENT spans.

### Prerequisite
- MLflow tracing prompt completed (`Tracing live; UC OTel tables ready` gate captured in state)
- Agent Tool Selection prompt completed (`Agent tool plan ready` gate captured in state)
- Knowledge Assistant prompt only required when `docs/agent_tool_plan.yaml.knowledge_assistant.selected == true`
- Lakebase project provisioned (from earlier Lakebase prompt)
- MLflow experiment at `{mlflow_experiment_path}` already created

### Steps to Apply
1. Start a new Agent thread in your Coding Assistant.
2. Paste this prompt verbatim.
3. The AI will (a) clone the `agent-openai-advanced` template into the top-level `$AGENT_APP_ROOT/` (sibling of `apps_lakebase/`), (b) install deps via `uv`, (c) start the local dev server, (d) wire Option B module-level handlers, (e) verify MLflow AGENT spans appear at `{mlflow_experiment_path}`.
4. Confirm "Hello" returns a streaming response in the local chat UI before exit.

---

## 2️⃣ What Are We Building?

We are bootstrapping the **Track A custom agent** as a Databricks App: cloning the canonical `agent-openai-advanced` template, installing deps with `uv`, and wiring **Option B** module-level `@invoke` / `@stream` handlers (canonical for Apps; not the rejected `mlflow.pyfunc.ResponsesAgent` path used for Model-Serving deployments).

```
Databricks App (FastAPI host)                    Option B (canonical for Apps)
┌────────────────────────────────────────────────────────────────────────────┐
│  app.py                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ @mlflow.genai.agent_server.invoke                                    │  │
│  │ async def invoke(request) -> response:                               │  │
│  │     agent = build_agent(config)                                      │  │
│  │     return await agent.run(request.input)                            │  │
│  │                                                                      │  │
│  │ @mlflow.genai.agent_server.stream                                    │  │
│  │ async def stream(request) -> AsyncIterator[event]:                   │  │
│  │     agent = build_agent(config)                                      │  │
│  │     async for ev in agent.run_streamed(request.input): yield ev      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  config.yml ──► ModelConfig(development_config="config.yml")               │
│  llm_endpoint, llm_api_base_url, llm_api_mode (no hardcoded model in .py)  │
└────────────────────────────────────────────────────────────────────────────┘
```

### Key Concepts

| Concept | What It Means | Why It Matters |
|---------|---------------|----------------|
| **Option B handlers** | Module-level `@mlflow.genai.agent_server.invoke` and `@stream` decorated async functions | Integrates cleanly with the FastAPI host that Databricks Apps runs; no class-based ResponsesAgent boilerplate |
| **`agent-openai-advanced` template** | Canonical Databricks scaffold with two-layer Lakebase memory pre-wired | 45 just configures memory rather than building it from scratch |
| **`config.yml` + `ModelConfig`** | Runtime settings (`llm_endpoint`, `llm_api_base_url`, `llm_api_mode`) loaded via `ModelConfig(development_config="config.yml")` | Python never hardcodes endpoint or base URL — 55 can swap to AI Gateway by changing config alone |
| **`uv`** | Fast, lockfile-based package manager (`uv pip install`, `uv run`) | Reproducible installs across local, CI, and Databricks Apps; no per-machine drift |
| **Smoke = "Hello"** | First verification is a single chat round-trip showing MLflow AGENT spans appear | Defers all tool wiring to 44; failure is on the framework, not on a tool |

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It's Used Here |
|----------|--------------------|
| **Option B over ResponsesAgent** | Module-level `@invoke` / `@stream` handlers integrate cleanly with FastAPI/Databricks Apps; `mlflow.pyfunc.ResponsesAgent` is for Model-Serving deployments and would force class-based plumbing for no benefit. |
| **`agent-openai-advanced` template** | The canonical scaffold ships with two-layer Lakebase memory pre-wired so 45 just *configures* it rather than implementing a session store from scratch. |
| **`config.yml` + `ModelConfig`** | Model endpoint, base URL, and API mode load from config — never hardcoded — so 55 can swap to AI Gateway without editing Python. The agent uses `ModelConfig(development_config="config.yml")` and `model=config.get("llm_endpoint")`. |
| **`uv` for deps** | Fast, reproducible lockfile-based installs; `uv run` matches the dev server entry point Databricks Apps uses, so local dev and deployed runtime share the same dependency tree. |
| **Smoke = "Hello"** | The first verification is a single chat round-trip showing MLflow AGENT spans appear at `{mlflow_experiment_path}`; tool wiring is deferred to 44, so framework failures are isolated. |

---

## 4️⃣ What Happens Behind the Scenes?

Two skills run end-to-end in this prompt: `01-clone-and-run` then `02-agent-framework`.

| Phase | What Happens | Key Output |
|-------|--------------|------------|
| **Phase 0** | `vibecoding-state` op `enter` confirms `Tracing live; UC OTel tables ready` AND `Agent tool plan ready` | Foundation context |
| **Phase 1** | `git clone` the `agent-openai-advanced` template into `$AGENT_APP_ROOT/` (top-level agent app dir) | Template cloned |
| **Phase 2** | `uv pip install -e .` installs dependencies from the template's `pyproject.toml` | Deps installed |
| **Phase 3** | `uv run dev` starts the local dev server; smoke test "Hello" returns | Dev server up |
| **Phase 4** | Walk project structure: `app.py`, `config.yml`, `tools/`, `tests/` | Layout understood |
| **Phase 5** | Wire Option B `@invoke` and `@stream` handlers; paste `agent.system_prompt` into `Agent(instructions=...)`; expose `agent.capabilities[]` to the chat UI | Handlers live |
| **Phase 6** | Write `llm_endpoint`, `llm_api_base_url`, `llm_api_mode` from `runtime_config.llm` into `config.yml`; agent constructs via `ModelConfig` and `model=config.get("llm_endpoint")` | Config-driven model route |
| **Phase 7** | Verify MLflow AGENT spans appear at `{mlflow_experiment_path}` for the smoke run | Spans visible |

### Gate Contract

| Reads gate | Produces gate | Captured state |
|------------|---------------|----------------|
| `Tracing live; UC OTel tables ready` (from `mlflow_agent_tracing_uc`) AND `Agent tool plan ready` (from `agent_tool_selection`) | `Agent framework live` (consumed by 44) | (no new state captured; state from prior gates flows through) |

</details>

<details><summary><strong>Expected Output</strong></summary>

### Resources Created
- [ ] Local Track A agent app cloned from `agent-openai-advanced` template
- [ ] `uv` dependencies installed
- [ ] Local dev server running and responding to `Hello`
- [ ] Module-level `@mlflow.genai.agent_server.invoke` and `@stream` handlers present
- [ ] MLflow AGENT spans visible at `{mlflow_experiment_path}`
- [ ] `config.yml` contains `llm_endpoint`, `llm_api_base_url`, and `llm_api_mode` from `docs/agent_tool_plan.yaml.runtime_config.llm`
- [ ] Agent construction uses `ModelConfig` and `model=config.get("llm_endpoint")`

</details>

#### Fork — `coding_assistant = genie-code`  (input_id 914)

> Fork rows override only `input_template`, `system_prompt`, and `bypass_llm`. All display fields are inherited from the default row above.

| Field | Value |
|-------|-------|
| `input_id` | `914` |
| `section_tag` | `track_a_agent_app_clone_framework` |
| `order_number` | `(inherited)` |
| `coding_assistant` | `genie-code` |
| `bypass_llm` | `true` |

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Clone the custom agent app into its own top-level `<AGENT_APP_ROOT>` and prove the framework boots. Before this step there is no agent app; after it, the cloned app is authored and a "Hello" smoke test confirms an MLflow span — with no local dev server.

This will involve the following steps:

- **Load the skills** — full `skill_ref_root`-prefixed paths.
- **Clone and author** — under `<AGENT_APP_ROOT>` (write files only).
- **Smoke-test** — in-process "Hello" plus an MLflow span check (not localhost).

The steps below are the prescriptive runbook for those actions; follow them in order.

**Genie Code — this is a prescriptive runbook. Follow the steps in order. Do NOT improvise paths, do NOT use bare relative paths, do NOT use `@`-mentions, and do NOT start a local dev server. The agent app is cloned into its own TOP-LEVEL directory `<AGENT_APP_ROOT>`; the "Hello" smoke runs the agent IN-PROCESS via `executeCode`, not against `http://localhost:8000`. This stands up the **{use_case_slug}** agent's runtime shell.**

### 🔴 Non-negotiable execution rules (read before anything)

❌ **NEVER run `uv run dev` and NEVER open `http://localhost:8000`.** Genie Code has no foreground local server surface; a `uv run dev` loop would hang the session. The `uv` + `pip` + Python 3.12 toolchain IS present (`genie-code-environment` §4), so you install deps with `uv pip install -e .` and then exercise the agent **in-process** inside `executeCode` (import `build_agent`, call `agent.run("Hello")`), which emits the MLflow AGENT span. Server startup is deferred to the deploy step (46) where the Apps runtime builds the `uv`/FastAPI server **server-side**.

❌ **NEVER write the cloned app to the bare project root, to `apps_lakebase/`, or to `/tmp`.** It goes under `<AGENT_APP_ROOT>` only (a top-level sibling of `<APP_ROOT>` and `{user_schema_prefix}_<use_case_slug>_dab`).

✅ The things you run directly are (a) `git clone` of the template, (b) `uv pip install -e .` in-session, (c) in-process `executeCode` smoke + MLflow span check, and (d) **read-only** inspection.

### Step 0 — Resolve your environment (once, before anything else)

Run `skills/vibecoding-state` operation `enter` with `prompt_id: "track_a_agent_app_clone_framework"` and `require_prior_gate: [{prompt_id: "mlflow_agent_tracing_uc", gate: "Tracing live; UC OTel tables ready"}, {prompt_id: "agent_tool_selection", gate: "Agent tool plan ready"}]`. Read these resolved values and use them literally:

- `client_context` = `genie_code`
- `artifact_root` = your workshop project root (e.g. `/Workspace/Users/<your-email>/vibe-coding-workshop`) — where all generated bundles/apps/docs build; the repo itself is cloned at `/Workspace/Users/<your-email>/.assistant/skills/vibe-coding-workshop` (skills load from there via `skill_ref_root`, NOT from `artifact_root`)
- `skill_ref_root` = `skills/vibe-coding-workshop` (substitute your clone folder if different)
- `agent_app_root` = `<artifact_root>/{agent_app_name}` — the self-contained Track A agent app project dir, a TOP-LEVEL sibling of `<APP_ROOT>` and `{user_schema_prefix}_<use_case_slug>_dab`, NOT under `apps_lakebase/`. Referred to below as `<AGENT_APP_ROOT>`. `app.yaml`, `pyproject.toml`, `databricks.yml`, `server/`, and `<AGENT_APP_ROOT>/.vibecoding-state.md` all live here.
- `mlflow_experiment_path` = `{mlflow_experiment_path}`
- Workspace: `{workspace_url}`

If `enter` reports either prior gate is unmet, STOP and finish that prompt first. If `enter` has not run in this thread, run it now.

### Step 1 — Load the required skills by their FULL `skill_ref_root`-prefixed paths

Load each with `readSkillFile` using its `<skill_ref_root>`-prefixed path — NEVER a bare `@…` mention, NEVER a repo-relative path. **The root-level `skills/` come FIRST as the highest-priority guardrails.**

1. `readSkillFile("skills/vibe-coding-workshop/skills/genie-code-environment/SKILL.md")` — §4 (Python toolchain + server-side build) is the normative basis for "no local server; build server-side." Loading this flips the manifest-load gate.
2. `readSkillFile("skills/vibe-coding-workshop/skills/databricks-expert-agent/SKILL.md")` — extract names/IDs from source + `.vibecoding-state.md`; never hardcode.
3. `readSkillFile("skills/vibe-coding-workshop/genai-agents/tracks/A-custom-agent-apps/01-clone-and-run/SKILL.md")` — clone + dep install + project walk. **Skip its `uv run dev` / localhost steps** — substitute the in-process smoke in Step 3 below.
4. `readSkillFile("skills/vibe-coding-workshop/genai-agents/tracks/A-custom-agent-apps/02-agent-framework/SKILL.md")` — Option B module-level `@invoke`/`@stream` handlers, `ModelConfig(development_config="config.yml")`, `config.yml` keys.

Load every further reference the skills name the same way (repo-relative path prefixed with `skill_ref_root`). `AGENTS.md` root context does not carry across Genie Code threads.

### Step 2 — Clone + author under `<AGENT_APP_ROOT>` (write files only)

- `git clone` the `agent-openai-advanced` template into `<AGENT_APP_ROOT>/` (NOT the project root, NOT `apps_lakebase/`).
- `uv pip install -e .` against `<AGENT_APP_ROOT>/pyproject.toml` (the toolchain is present; this resolves deps for the in-process smoke).
- Wire Option B handlers in `<AGENT_APP_ROOT>/app.py` (`@mlflow.genai.agent_server.invoke` + `@stream`); paste `agent.system_prompt` into `Agent(instructions=...)`; expose `agent.capabilities[]`.
- Write `<AGENT_APP_ROOT>/config.yml` with `llm_endpoint`, `llm_api_base_url`, `llm_api_mode` from `docs/agent_tool_plan.yaml.runtime_config.llm` (resolve `docs/` under `<AGENT_APP_ROOT>`). No model endpoint hardcoded in Python.
- Register the app in `<AGENT_APP_ROOT>/databricks.yml` so the deploy step (46) can lift it.

### Step 3 — In-process "Hello" smoke + MLflow span check (NOT localhost)

Via `executeCode` (no server): set `MLFLOW_EXPERIMENT` / tracking to `{mlflow_experiment_path}`, import the agent factory from `<AGENT_APP_ROOT>` (`build_agent(ModelConfig(development_config="config.yml"))`), and call the invoke path with input "Hello". Confirm a streaming/text response AND that an MLflow **AGENT** span appears at `{mlflow_experiment_path}` for the run (`mlflow.search_traces(...)` or the experiment UI). Do NOT start `uv run dev` to do this.

**State-lock:** this prompt runs between an `enter` (Step 0) and an `exit`. After the gate passes, run `skills/vibecoding-state` op `exit` — params: `prompt_id: "track_a_agent_app_clone_framework"`, `gate: "Agent framework live"`. **This `enter`/`exit` pair is a mandatory ritual, not advisory.** Step 0's `enter` MUST locate — or, if this is the first prompt of the track, bootstrap-create — the canonical live state file at `<agent_app_root>/.vibecoding-state.md` (never the temporary `example/…` bootstrap path). The closing `exit` MUST append this prompt's Per-Step Log entry, Gate result, and `captured` vars to that file, then **re-read it and echo the appended section to prove the write landed**. **Gate completion rule:** this prompt is NOT complete until that re-read confirms the appended entry — the chat summary is NOT the state store.

**Gate:** `Agent framework live` — the cloned app under `<AGENT_APP_ROOT>` responds to an **in-process** "Hello" with MLflow AGENT spans visible at `{mlflow_experiment_path}`; `config.yml` carries `llm_endpoint`/`llm_api_base_url`/`llm_api_mode` from `runtime_config.llm`; the agent uses `ModelConfig(development_config="config.yml")` and `model=config.get("llm_endpoint")`; module-level `@invoke` + `@stream` handlers are present. NO `http://localhost:8000` check was attempted.
```

---

## Phase 2 / Agent Build - Wire Selected Tools and MCP

| Field | Value |
|-------|-------|
| `input_id` | `204` |
| `section_tag` | `track_a_agent_ka_genie_tools` |
| `order_number` | `44` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Wire the tools selected in docs/agent_tool_plan.yaml, including optional KA, Genie, Vector Search, SQL MCP, UC Functions, and external MCPs_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Wire the **selected** tools and MCP servers from `docs/agent_tool_plan.yaml` into the cloned **{use_case_slug}** agent app as `@function_tool` definitions, and emit the matching `databricks.yml` + `app.yaml` resource grants. Selected families may include any combination of Knowledge Assistant (only if KA was created in step 42), Genie (bring your own `genie_space_id`), SQL MCP (bring your own catalog/schema/warehouse/allowed tables), Vector Search (bring your own endpoint/index), UC Functions (bring your own fully qualified function names), and external MCP servers (bring your own UC connection or registry-backed candidate). Today the cloned `{agent_app_name}` agent has zero tool surface; after this prompt runs, every entry in `docs/agent_tool_plan.yaml.selected_tools[]` is materialized as a `@function_tool`, families absent from the plan are skipped (not failed), the bundle declares the right `CAN_QUERY` / `CAN_RUN` / `CAN_USE` grants, and MLflow shows TOOL spans for each tool the agent calls.

This will involve the following steps:

- **Wire each managed tool** — generate one `@function_tool` per entry in `selected_tools[]` (KA, Genie, SQL MCP against `{default_warehouse}`, UC Functions, Vector Search) using the IDs captured by upstream prompts
- **Declare resource grants in `databricks.yml`** — declare serving endpoints, Genie space, SQL warehouse, UC functions, and UC connections with the correct permissions so DAB applies them once
- **Wire `app.yaml` `valueFrom` refs** — point `app.yaml` resources at the bundle entries and add the OAuth scopes the SDK requires at runtime
- **Pin the SQL read-only guardrails** — every SQL tool enforces `SELECT/DESCRIBE/EXPLAIN` only and requires fully-qualified `catalog.schema.table` names from `selected_tools[].guardrails`
- **Skip cleanly when a family is not selected** — KA, Genie, or external MCPs absent from `selected_tools[]` are recorded as skipped (not failed) so the gate stays clean
- **Smoke-test every tool** — exercise each tool in the local dev server and verify TOOL spans appear in MLflow before producing the gate

**How this prompt chains with the prior step (skill invocations):**

**Invoke skills (in order):**

1. `skills/vibecoding-state` op `enter` — params: `prompt_id: "track_a_agent_ka_genie_tools"`, `require_prior_gate: {prompt_id: "track_a_agent_app_clone_framework", gate: "Agent framework live"}`.
2. @genai-agents/tracks/A-custom-agent-apps/03-tools-and-mcp/SKILL.md — params:
   - `agent_name: "{agent_app_name}"`
   - `agent_spec_ref: "docs/agent_spec.yaml"`
   - `agent_tool_plan_ref: "docs/agent_tool_plan.yaml"`
   - `selected_tools: "docs/agent_tool_plan.yaml.selected_tools"`
   - `selected_mcp_servers: "docs/agent_tool_plan.yaml.selected_mcp_servers"`
   - `resource_grants: "docs/agent_tool_plan.yaml.resource_grants"`
   - `runtime_model_ref: "docs/agent_tool_plan.yaml.runtime_config.llm"`
   - `model_grant_policy: "Read the SCALAR value at docs/agent_tool_plan.yaml.runtime_config.llm.endpoint (e.g. 'databricks-claude-sonnet-4-6') and grant CAN_QUERY on THAT endpoint name when runtime_config.llm.provider == 'databricks'. NEVER grant on the literal YAML path string 'docs/agent_tool_plan.yaml.runtime_config.llm.endpoint' or 'docs/agent_spec.yaml.agent.model' — those are paths, not endpoint names. If the resolved value is empty or still wrapped in {...}, STOP and re-run prompt 39 (agent_tool_selection). Skip Gateway provisioning when provider == 'ai_gateway'."`
   - `ka_endpoint_name`: read from state captured by `knowledge_assistant_create` (input_id 202) when `docs/agent_tool_plan.yaml.knowledge_assistant.selected == true`; otherwise `"n/a"`. KA is the only tool family whose ID flows through workshop state — every other family below is bring-your-own from the Tool Plan.
   - `genie_space_id`: read from `docs/agent_tool_plan.yaml.selected_tools[? type == "genie"].meta.genie_space_id` when Genie was selected; otherwise `"n/a"`. Do NOT consume `{genie_space_id}` from a rendered global — Genie is bring-your-own at this point and no upstream Agents Accelerator step provisions it.
   - Vector Search: read endpoint + index from `docs/agent_tool_plan.yaml.selected_tools[? type == "vector_search"].meta` (`endpoint`, `index`) when selected; otherwise skip the Vector Search tool family.
   - UC Functions: read fully qualified function names from `docs/agent_tool_plan.yaml.selected_tools[? type == "uc_function"].target` when selected; otherwise skip.
   - External MCP: read UC connection name and registry-backed candidate from `docs/agent_tool_plan.yaml.selected_mcp_servers[? type == "external"]` when selected; otherwise skip.
   - If a required BYO field for a selected family is blank, missing, or still wrapped in `{...}`, STOP and ask the user — do not proceed with placeholder literals.
   - `warehouse_id: "{default_warehouse}"`
   - SQL MCP wiring uses `selected_mcp_servers[].meta.warehouse_id` and the read-only guardrails from `selected_tools[].guardrails`. Default policy: `readonly: true`; allowed statements `SELECT, DESCRIBE, EXPLAIN`; require fully qualified `catalog.schema.table` names; `CAN_USE` on the warehouse plus `USE_CATALOG`, `USE_SCHEMA`, and `SELECT` on each table in `selected_mcp_servers[].scope.allowed_tables`. Tool families not present in `selected_tools[]` (e.g. KA when `knowledge_assistant.selected: false`, Genie when not selected) are skipped, not failed.
   - The configured model route is also a runtime resource. Include the entries from `docs/agent_tool_plan.yaml.resource_grants.databricks_yml.serving_endpoints[]` verbatim — those entries already carry the scalar endpoint name (e.g. `name: "databricks-claude-sonnet-4-6"`, `permission: "CAN_QUERY"`). Do NOT substitute the YAML-path string `docs/agent_spec.yaml.agent.model` or `docs/agent_tool_plan.yaml.runtime_config.llm.endpoint` for the endpoint name; those are file paths, not Databricks serving-endpoint names. The model route must be exposed to the app runtime through `config.yml` / `ModelConfig` keys (`llm_endpoint`, `llm_api_base_url`, `llm_api_mode`), again populated from the SCALAR `runtime_config.llm.endpoint` value, not by hardcoding the endpoint or base URL in Python.
3. `skills/vibecoding-state` op `exit` — params: `prompt_id: "track_a_agent_ka_genie_tools"`, `gate: "Tools wired"`.

**Gate:** `Tools wired` - MLflow traces show TOOL spans for every selected tool in `docs/agent_tool_plan.yaml.selected_tools[]`; skipped tool families are marked skipped, not failed; SQL MCP smoke tests use read-only queries with fully qualified table names.

If a PRD exists at @docs/design_prd.md, reference it for business requirements, user personas, and workflows.
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## 1️⃣ How To Apply

Open a **new Agent thread in your Coding Assistant** and paste the prompt above. The AI invokes `03-tools-and-mcp` which reads `docs/agent_spec.yaml`, `docs/agent_tool_plan.yaml`, and `$APP_ROOT/.vibecoding-state.md` (AppKit + Lakebase context from steps 04-07) to materialize every tool declared in the Tool Plan. `state://DataSpec` is optional — only consulted when the Lakehouse track has produced one and is not a prerequisite for this prompt.

### Selected Backend Sources

This row is the **integration handshake**. Each tool family is wired only when the user explicitly selected it in `docs/agent_tool_plan.yaml.selected_tools[]`. Tool families that are absent are recorded as skipped, not failed. The agent never assumes a fixed KA + Genie path — every backend below is conditional and bring-your-own where applicable.

| Tool Family | Source / Provisioning | State Keys Consumed | Grant |
|---|---|---|---|
| Knowledge Assistant | `knowledge_assistant_create` (input_id 202) — runs only when `docs/agent_tool_plan.yaml.knowledge_assistant.selected == true` | `{ka_endpoint_name}`, `{knowledge_assistant_id}`, `{doc_qa_backend} = "knowledge_assistant"` | `CAN_QUERY` on the KA serving endpoint |
| Genie | Bring your own `genie_space_id` declared in `docs/agent_tool_plan.yaml.selected_tools[]`; if absent, the Genie tool is skipped (no Bronze/Genie pipeline is required) | `{genie_space_id}` from the Tool Plan | `CAN_RUN` on the Genie Space |
| SQL MCP | Bring your own catalog, schema, warehouse, and table allowlist declared in `docs/agent_tool_plan.yaml.selected_mcp_servers[]` (read-only guardrails: `SELECT, DESCRIBE, EXPLAIN`; fully qualified `catalog.schema.table` names) | `{agent_sql_catalog}`, `{agent_sql_schema}`, `{warehouse_id}`, allowed tables | `CAN_USE` on the warehouse + `USE_CATALOG`, `USE_SCHEMA`, `SELECT` on each allowed table |
| Vector Search | Bring your own endpoint + index name declared in `docs/agent_tool_plan.yaml.selected_tools[]`; if absent, skipped | `{vs_endpoint}`, `{vs_index}` | `CAN_USE` on the Vector Search endpoint |
| UC Functions | Bring your own fully qualified function names declared in `docs/agent_tool_plan.yaml.selected_tools[]` (the agent schema grant from `uc_resources_foundation` covers `EXECUTE`) | `selected_tools[? type == "uc_function"].target` paths | `EXECUTE` on each UC function |
| External MCP | Bring your own UC connection or registry-backed candidate declared in `docs/agent_tool_plan.yaml.selected_mcp_servers[]`; if absent, skipped | UC connection name + scopes | `CAN_USE` on the UC connection |
| Lakebase Memory | Earlier Lakebase prompts (steps 06-07) | `{lakebase_host}`, `{lakebase_instance}`, `{lakebase_database}` | `CAN_USE` on the SQL warehouse for tool queries |
| SQL Warehouse | `workspace_setup_deploy` (input_id 4) | `{default_warehouse}` | `CAN_USE` (declared in `databricks.yml`) |

Bronze tables, Bronze metadata, and Data Intelligence outputs are **not** required by this prompt. They can appear only as optional bring-your-own backends in the Tool Plan.

### Prerequisite
- `Agent framework live` gate captured in state
- `docs/agent_tool_plan.yaml` exists with `selected_tools[]` populated. Entries that need BYO IDs — Genie (`meta.genie_space_id`), Vector Search (`meta.endpoint`, `meta.index`), SQL MCP (`scope.catalog`, `scope.schema`, `meta.warehouse_id`, `scope.allowed_tables`), UC Functions (`target`), External MCP (`selected_mcp_servers[].uc_connection`) — must carry those IDs inside the Tool Plan itself. Entries the user omitted are skipped, not failed.
- `ka_endpoint_name` is captured in state ONLY when `knowledge_assistant_create` (input_id 202) ran (i.e. KA was selected); otherwise the KA tool family is skipped.
- `warehouse_id` and `lakebase_host` captured in state from earlier prompts (`workspace_setup_deploy` and the Lakebase steps).
- `docs/agent_spec.yaml` exists with `tool_recommendations` populated (loose recommendations from step 38; not a binding selection). Final binding selections live in `docs/agent_tool_plan.yaml.selected_tools[]` — that is the canonical source consumed by this prompt. `agent.tools[]` is NOT a required field of the Agent Spec; it is a state-projection field populated by `vibecoding-state.hydrate_from_files` from `tool_recommendations` overlaid by `selected_tools` (see `skills/vibecoding-state/SKILL.md` § *Operation: hydrate_from_files*).
- BYO tool IDs (`genie_space_id`, Vector Search endpoint/index, UC Function names, external MCP UC connection) come from `docs/agent_tool_plan.yaml`, NOT from rendered globals like `{genie_space_id}`.

### Steps to Apply
1. New thread in your Coding Assistant, paste prompt.
2. AI generates `tools/ka.py`, `tools/genie.py`, plus one file per UC-function tool, registers each as `@function_tool` on the canonical `Agent(...)`.
3. AI patches `databricks.yml` and `app.yaml` with the three resource grants (KA `CAN_QUERY`, Genie `CAN_RUN`, warehouse `CAN_USE`).
4. AI runs a smoke test against every tool declared in `docs/agent_tool_plan.yaml.selected_tools[]` (the canonical, binding tool list — `agent.tools[]` is a state-projection field, not the source of truth) in the local dev server and confirms TOOL spans show up in MLflow.

---

## 2️⃣ What Are We Building?

We are wiring the agent's **5 tool families** as `@function_tool`-decorated Python functions, each backed by a Databricks-managed resource. The grant chain (`databricks.yml` + `app.yaml`) is declared once and the App inherits it via `valueFrom`.

```
                        Agent (OpenAI Agents SDK)
                                  │
        ┌──────────┬──────────────┼──────────────┬──────────────┐
        ▼          ▼              ▼              ▼              ▼
   @function     @function    @function      @function      @function
     _tool         _tool        _tool          _tool          _tool
        │          │              │              │              │
        ▼          ▼              ▼              ▼              ▼
   KA endpoint  Genie Space  UC Function   SQL MCP       External MCP
   (CAN_QUERY)  (CAN_RUN)   (EXECUTE)      (CAN_USE      (UC connection)
                                            warehouse)
        │          │              │              │              │
        └──────────┴──────────────┼──────────────┴──────────────┘
                                  ▼
                    databricks.yml: serving_endpoints, genie_space,
                    sql_warehouse, uc_functions, uc_connections
                    app.yaml: valueFrom: <resource_name>
```

### Key Concepts

| Concept | What It Means | Why It Matters |
|---------|---------------|----------------|
| **`@function_tool`** | OpenAI Agents SDK decorator that registers a Python function as a callable tool the agent can choose | One decorator per declared tool; the SDK handles JSON schema and dispatch |
| **Resource grants in `databricks.yml`** | Bundle resources (`serving_endpoints`, `genie_space`, `sql_warehouse`, `uc_functions`, `uc_connections`) declared with permission (`CAN_QUERY`, `CAN_RUN`, `EXECUTE`, `CAN_USE`) | DAB applies the grants once; the App picks them up via `valueFrom` |
| **`app.yaml` `valueFrom`** | Resource references in `app.yaml` that resolve at deploy time to the bundled grant | The agent code never embeds endpoint names or credentials — the platform injects them |
| **SQL MCP read-only guardrails** | Each SQL MCP tool enforces `SELECT/DESCRIBE/EXPLAIN` only and requires fully-qualified `catalog.schema.table` references | An agent prompt cannot exfil-write or wander into the wrong namespace |
| **Skipped vs. failed** | Tool families absent from `selected_tools[]` (e.g. KA when not selected) are explicitly marked skipped; the agent code conditionally registers tools | `Skipped — KA not selected` is a clean state the gate accepts |

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It's Used Here |
|----------|--------------------|
| **One `@function_tool` per declared tool** | Every entry in `docs/agent_tool_plan.yaml.selected_tools[]` (the canonical, binding tool list) materializes as a Python decorator the SDK can call. The 1:1 mapping makes it trivial to verify nothing is missing — count entries in `selected_tools[]`, count `@function_tool` definitions, count TOOL spans in the smoke run. `agent.tools[]` is a state-projection field populated by `vibecoding-state.hydrate_from_files`; do NOT count or smoke-test against it. |
| **Resource grants live in `databricks.yml`** | Never inline-create resources from Python. The bundle declares `CAN_QUERY` / `CAN_RUN` / `CAN_USE` once and the app inherits via `valueFrom`. Permissions become part of the deploy contract, not a runtime side-effect. |
| **Read-only SQL guardrails** | Every SQL MCP tool enforces `SELECT/DESCRIBE/EXPLAIN` only and requires fully-qualified `catalog.schema.table` references. Guardrails are pinned in `selected_tools[].guardrails`, so the wire-tools skill cannot accidentally relax them. |
| **Skipped ≠ failed** | Tool families absent from `selected_tools[]` (e.g. KA when not selected) are explicitly marked skipped; the agent code conditionally registers tools so a missing KA never breaks startup. |
| **Verify by trace** | TOOL spans for every wired tool must appear in MLflow before exiting the gate. The verification is end-to-end: if the trace is missing, the wiring failed even when no Python error was raised. |

---

## 4️⃣ What Happens Behind the Scenes?

The skill (`03-tools-and-mcp`) walks 6 ordered phases against `docs/agent_spec.yaml`, `docs/agent_tool_plan.yaml`, and the AppKit + Lakebase state from steps 04-07. `state://DataSpec` is optional — only consulted when the Lakehouse track has produced one:

| Phase | What Happens | Key Output |
|-------|--------------|------------|
| **Phase 0** | `vibecoding-state` op `enter` confirms `Agent framework live` | Build context |
| **Phase 1** | Read `docs/agent_tool_plan.yaml` `selected_tools[]`, `selected_mcp_servers[]`, `resource_grants` | Tool list |
| **Phase 2** | Generate `tools/{ka,genie,sql,uc_functions,external_mcp}.py` — one `@function_tool` per declared tool; conditional skip for unselected families | Tool modules |
| **Phase 3** | Patch `databricks.yml`: declare `serving_endpoints` (KA + model `CAN_QUERY`), `genie_space` (`CAN_RUN`), `sql_warehouse` (`CAN_USE`), `uc_functions` (`EXECUTE`), `uc_connections` (external MCP) | Bundle resources |
| **Phase 4** | Patch `app.yaml`: `valueFrom` references to each declared resource; OAuth scopes from `resource_grants.app_yaml_oauth_scopes` | App resource refs |
| **Phase 5** | Smoke each tool in the local dev server (read-only SQL, KA query, Genie ask, UC function call) | Smoke pass |
| **Phase 6** | Verify MLflow trace shows TOOL spans for every wired tool; skipped families recorded as skipped, not failed | TOOL spans visible |

### Gate Contract

| Reads gate | Produces gate | Captured state |
|------------|---------------|----------------|
| `Agent framework live` (from `track_a_agent_app_clone_framework`) | `Tools wired` (consumed by 45) | (no new state captured beyond the wired tool inventory in MLflow) |

</details>

<details><summary><strong>Expected Output</strong></summary>

### Resources Created

The bullets below are conditional — each one applies **only** when the matching family is present in `docs/agent_tool_plan.yaml`. Families that are absent (or whose `selected: false`) are recorded as skipped, not failed. The model-route bullets are unconditional because every agent has a model route.

Always-applicable:
- [ ] One `@function_tool` per entry in `docs/agent_tool_plan.yaml.selected_tools[]`; one tool module file per family that has at least one selected entry (e.g. `tools/genie.py` only when Genie was selected). Skipped families are recorded as skipped, not failed (no empty-stub modules).
- [ ] `databricks.yml` carries the union of `docs/agent_tool_plan.yaml.resource_grants.databricks_yml.*` entries verbatim — no extra grants, no missing grants.
- [ ] `app.yaml` references each declared bundle resource via `valueFrom` and includes the OAuth scopes from `docs/agent_tool_plan.yaml.resource_grants.app_yaml_oauth_scopes`.
- [ ] MLflow traces show one TOOL span per wired tool family. The skipped-vs-failed distinction is observable: skipped families produce zero TOOL spans and are absent from the trace; failed families produce error spans.

Conditional on Tool Plan selection:
- [ ] **If `docs/agent_tool_plan.yaml.knowledge_assistant.selected == true`**: KA tool wired against the `ka_endpoint_name` captured by step 42; `databricks.yml` grants `CAN_QUERY` on that endpoint; KA TOOL span visible in the smoke trace.
- [ ] **If any `selected_tools[].type == "genie"`**: Genie tool wired against the `meta.genie_space_id` declared in that entry; `databricks.yml` grants `CAN_RUN` on the Genie Space; Genie TOOL span visible.
- [ ] **If any `selected_mcp_servers[].type == "sql"` or any `selected_tools[].type == "sql_mcp"`**: SQL MCP tool wired with read-only guardrails (`SELECT, DESCRIBE, EXPLAIN` only; fully qualified `catalog.schema.table` references); `databricks.yml` grants `CAN_USE` on the warehouse and `USE_CATALOG` / `USE_SCHEMA` / `SELECT` on each table in `selected_mcp_servers[].scope.allowed_tables`; SQL TOOL span visible.
- [ ] **If any `selected_tools[].type == "vector_search"`**: Vector Search tool wired against `meta.endpoint` + `meta.index`; `databricks.yml` grants `CAN_USE` on the Vector Search endpoint; Vector Search TOOL span visible.
- [ ] **If any `selected_tools[].type == "uc_function"`**: One `@function_tool` per declared UC function with `target` matching the fully qualified function name; `databricks.yml` grants `EXECUTE` on each (or relies on the agent-schema grant from step 40); UC Function TOOL spans visible.
- [ ] **If any `selected_mcp_servers[].type == "external"`**: External MCP tool wired against the declared UC connection or registry-backed candidate; `databricks.yml` grants `CAN_USE` on the UC connection; external MCP TOOL span visible.

Model route (always applicable):
- [ ] `databricks.yml` declares one `serving_endpoints[]` entry whose `name` is the SCALAR value at `docs/agent_tool_plan.yaml.runtime_config.llm.endpoint` (e.g. `"databricks-claude-sonnet-4-6"`) with `permission: "CAN_QUERY"`. The endpoint name MUST NOT be the literal YAML-path string `docs/agent_spec.yaml.agent.model` or `docs/agent_tool_plan.yaml.runtime_config.llm.endpoint`.
- [ ] The selected model endpoint is exposed to the Agent App as the `llm_endpoint` key in `config.yml` / `ModelConfig`, again populated from the scalar value (not the YAML path).

</details>

#### Fork — `coding_assistant = genie-code`  (input_id 915)

> Fork rows override only `input_template`, `system_prompt`, and `bypass_llm`. All display fields are inherited from the default row above.

| Field | Value |
|-------|-------|
| `input_id` | `915` |
| `section_tag` | `track_a_agent_ka_genie_tools` |
| `order_number` | `(inherited)` |
| `coding_assistant` | `genie-code` |
| `bypass_llm` | `true` |

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Author the agent's Knowledge Assistant and Genie tools under `<AGENT_APP_ROOT>` and smoke each one. Before this step the agent has no tools; after it, each tool module is authored and an in-process per-tool TOOL-span smoke confirms it.

This will involve the following steps:

- **Load the skills** — full `skill_ref_root`-prefixed paths.
- **Author tools and grants** — under `<AGENT_APP_ROOT>` (write files only).
- **Smoke each tool** — in-process per-tool TOOL-span (not localhost).

The steps below are the prescriptive runbook for those actions; follow them in order.

**Genie Code — this is a prescriptive runbook. Follow the steps in order. Do NOT improvise paths, do NOT use bare relative paths, do NOT use `@`-mentions, and do NOT start a local dev server. Every tool module is authored under `<AGENT_APP_ROOT>`; the per-tool smoke runs the agent IN-PROCESS via `executeCode` and asserts TOOL spans in MLflow. This wires the **{use_case_slug}** agent's tools.**

### 🔴 Non-negotiable execution rules (read before anything)

❌ **NEVER run `uv run dev` / open `http://localhost:8000`.** Smoke each wired tool in-process (`executeCode`: build the agent, send a prompt that triggers the tool, assert the TOOL span). The resource grants are declared in `databricks.yml` / `app.yaml` and applied at the deploy step (46) — do **NOT** inline-create endpoints, Genie spaces, or connections from Python.

❌ **NEVER hardcode BYO tool IDs.** Genie `genie_space_id`, Vector Search endpoint/index, UC function names, and external-MCP UC connection all come from `docs/agent_tool_plan.yaml` (resolve `docs/` under `<AGENT_APP_ROOT>`), never from rendered globals like `{genie_space_id}`. KA's `ka_endpoint_name` is the one ID that flows through state (captured by `knowledge_assistant_create`, input_id 202/913).

✅ The things you run directly are (a) authoring tool modules + bundle/app YAML under `<AGENT_APP_ROOT>`, (b) in-process `executeCode` smoke + MLflow TOOL-span checks, and (c) read-only inspection.

### Step 0 — Resolve your environment (once, before anything else)

Run `skills/vibecoding-state` operation `enter` with `prompt_id: "track_a_agent_ka_genie_tools"` and `require_prior_gate: {prompt_id: "track_a_agent_app_clone_framework", gate: "Agent framework live"}`. Read these resolved values and use them literally:

- `client_context` = `genie_code`
- `artifact_root` = your workshop project root (e.g. `/Workspace/Users/<your-email>/vibe-coding-workshop`) — where all generated bundles/apps/docs build; the repo itself is cloned at `/Workspace/Users/<your-email>/.assistant/skills/vibe-coding-workshop` (skills load from there via `skill_ref_root`, NOT from `artifact_root`)
- `skill_ref_root` = `skills/vibe-coding-workshop` (substitute your clone folder if different)
- `agent_app_root` = `<artifact_root>/{agent_app_name}` (the top-level Track A agent app dir from prompt 43). Referred to below as `<AGENT_APP_ROOT>`.
- `default_warehouse` = `{default_warehouse}`
- Workspace: `{workspace_url}`

If `enter` reports the prior gate is unmet, STOP. If `enter` has not run in this thread, run it now.

### Step 1 — Load the required skills by their FULL `skill_ref_root`-prefixed paths

Load each with `readSkillFile` using its `<skill_ref_root>`-prefixed path — NEVER a bare `@…` mention. **The root-level `skills/` come FIRST as the highest-priority guardrails.**

1. `readSkillFile("skills/vibe-coding-workshop/skills/genie-code-environment/SKILL.md")` — §4 (no local server, build server-side) and §6b (KA via `w.api_client.do`, if the KA tool family is selected). Loading this flips the manifest-load gate.
2. `readSkillFile("skills/vibe-coding-workshop/skills/databricks-expert-agent/SKILL.md")` — extract IDs from `docs/agent_tool_plan.yaml` + state; never hardcode.
3. `readSkillFile("skills/vibe-coding-workshop/genai-agents/tracks/A-custom-agent-apps/03-tools-and-mcp/SKILL.md")` — one `@function_tool` per `selected_tools[]` entry; skip absent families (skipped ≠ failed); declare `databricks.yml`/`app.yaml` grants. **Replace its local-dev-server smoke with the in-process smoke in Step 3.**
4. `readSkillFile("skills/vibe-coding-workshop/data_product_accelerator/skills/common/naming-tagging-standards/SKILL.md")` — tool/resource naming + COMMENTs.

Load every further reference the skills name the same way (prefix repo-relative paths with `skill_ref_root`). `AGENTS.md` root context does not carry across Genie Code threads.

### Step 2 — Author tools + grants under `<AGENT_APP_ROOT>` (write files only)

- Generate one `@function_tool` module per family present in `docs/agent_tool_plan.yaml.selected_tools[]` (`tools/ka.py`, `tools/genie.py`, `tools/sql.py`, `tools/uc_functions.py`, `tools/external_mcp.py`) under `<AGENT_APP_ROOT>/`. Families absent from `selected_tools[]` are recorded skipped, not failed — no empty stubs.
- Patch `<AGENT_APP_ROOT>/databricks.yml` with the exact `resource_grants.databricks_yml.*` entries from the Tool Plan (serving endpoints incl. the SCALAR model endpoint name with `CAN_QUERY`, Genie `CAN_RUN`, warehouse `CAN_USE`, UC functions `EXECUTE`, UC connections `CAN_USE`). No extra/missing grants.
- Patch `<AGENT_APP_ROOT>/app.yaml` with `valueFrom` refs + the OAuth scopes from `resource_grants.app_yaml_oauth_scopes`.
- Pin SQL read-only guardrails (`SELECT/DESCRIBE/EXPLAIN`, fully-qualified `catalog.schema.table`) from `selected_tools[].guardrails`. If a required BYO field is blank/missing/`{...}`, STOP and ask — no placeholder literals.

### Step 3 — In-process per-tool TOOL-span smoke (NOT localhost)

Via `executeCode` (no server): build the agent from `<AGENT_APP_ROOT>` and, for each wired tool, send a prompt that forces that tool, then assert a **TOOL** span for it in MLflow (`mlflow.search_traces(...)`). Read-only SQL only; KA query; Genie ask; UC function call. Skipped families produce zero TOOL spans and are absent from the trace — that is a clean state, not a failure.

**State-lock:** this prompt runs between an `enter` (Step 0) and an `exit`. After the gate passes, run `skills/vibecoding-state` op `exit` — params: `prompt_id: "track_a_agent_ka_genie_tools"`, `gate: "Tools wired"`. **This `enter`/`exit` pair is a mandatory ritual, not advisory.** Step 0's `enter` MUST locate — or, if this is the first prompt of the track, bootstrap-create — the canonical live state file at `<agent_app_root>/.vibecoding-state.md` (never the temporary `example/…` bootstrap path). The closing `exit` MUST append this prompt's Per-Step Log entry, Gate result, and `captured` vars to that file, then **re-read it and echo the appended section to prove the write landed**. **Gate completion rule:** this prompt is NOT complete until that re-read confirms the appended entry — the chat summary is NOT the state store.

**Gate:** `Tools wired` — MLflow traces show one TOOL span per selected tool in `docs/agent_tool_plan.yaml.selected_tools[]` (asserted **in-process**, not via a local server); skipped families are marked skipped not failed; SQL smoke used read-only queries with fully-qualified table names; `databricks.yml`/`app.yaml` carry the Tool Plan's grants verbatim.
```

---

## Phase 2 / Agent Build — Auth + Lakebase Memory

| Field | Value |
|-------|-------|
| `input_id` | `205` |
| `section_tag` | `track_a_agent_auth_memory` |
| `order_number` | `45` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Add SP + OBO auth and short-term + long-term Lakebase memory to the agent_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Configure on-behalf-of (OBO) auth via `x-forwarded-access-token` plus persistent two-layer memory backed by `{lakebase_instance}` / `{lakebase_database}` for the **{use_case_slug}** agent. Today the cloned `{agent_app_name}` runs as service-principal only with no per-request memory; after this prompt runs, OBO is wired inside the `@invoke`/`@stream` handlers (with SP fallback for background paths), `user_api_scopes` is declared in `app.yaml`, short-term memory keeps multi-turn coherence, and long-term memory recalls user-stated facts across new threads.

This will involve the following steps:

- **Wire OBO in the handlers** — call `get_user_workspace_client(http_request)` inside `@invoke` / `@stream` so each user request gets its own scoped Databricks client
- **Declare `user_api_scopes`** — write the OAuth scopes the agent needs (`serving.serving-endpoints`, `sql`, `unity-catalog`, plus `dashboards.genie` / `catalog.connections` if selected) into `app.yaml`
- **Provision short-term memory** — use `AsyncDatabricksSession` against `{lakebase_database}` keyed on `thread_id` for last-N message coherence
- **Provision long-term memory** — use `LongTermMemory` with `databricks-gte-large-en` (1024 dims) keyed on `user_id` so facts recall across new threads
- **Pre-LLM search + post-LLM persist** — search long-term memory before the LLM call and persist extracted facts after, so the agent never re-asks for facts the user already shared
- **Smoke-test memory** — verify same-thread turn 2 references turn 1, and a fact stated in thread A is recalled in a fresh thread B for the same user

**How this prompt chains with the prior step (skill invocations):**

**Invoke skills (in order):**

1. `skills/vibecoding-state` op `enter` — params: `prompt_id: "track_a_agent_auth_memory"`, `require_prior_gate: {prompt_id: "track_a_agent_ka_genie_tools", gate: "Tools wired"}`.
2. @genai-agents/tracks/A-custom-agent-apps/04-authentication/SKILL.md — params:
   - `agent_name: "{agent_app_name}"`
   - `app_level_auth: "service_principal"`
   - `user_level_auth: "obo"`
   - `obo_helper: "databricks_app.utils.get_user_workspace_client"` (called inside `@invoke` / `@stream` handlers)
   - `user_api_scopes:` derived from `docs/agent_tool_plan.yaml.resource_grants.app_yaml_oauth_scopes`, with default fallback `["serving.serving-endpoints", "sql", "unity-catalog"]`. If Genie is selected, include `dashboards.genie`. If external MCP UC connections are selected, include `catalog.connections`.
   - `reuse_detect_environment_helper: true`
   - `verification: ["obo_local", "sp_local", "user_api_scopes_in_app_yaml"]`
3. @genai-agents/tracks/A-custom-agent-apps/05-lakebase-memory/SKILL.md — params:
   - `agent_name: "{agent_app_name}"`
   - `agent_spec_ref: "state://AgentSpec"`
   - `lakebase_instance: "{lakebase_instance}"`
   - `lakebase_database: "{lakebase_database}"`
   - `pattern: "agent-openai-advanced"` (canonical: two-layer memory — `AsyncDatabricksSession` for short-term, `LongTermMemory` for long-term)
   - `embedding_endpoint: "databricks-gte-large-en"`
   - `embedding_dims: 1024`
   - `obo_scoped: true` (sessions instantiated inside `@invoke` via `get_user_workspace_client(http_request)`)
   - `thread_id_resolver: "request.custom_inputs.thread_id || request.conversation_id"`
   - `pre_llm_search_long_term: true`
   - `post_llm_persist_facts: true`
   - `graceful_degradation: true`
   - `verification: {memory_persists_across_turns: true, long_term_recall_after_new_thread: true}`
4. `skills/vibecoding-state` op `exit` — params: `prompt_id: "track_a_agent_auth_memory"`, `gate: "Auth + Memory verified"`, `captured: {lakebase_instance, lakebase_database, embedding_endpoint, thread_id_strategy}`.

**Gate:** `Auth + Memory verified` — both OBO and SP flows pass the local verification probes; same-thread turn 2 references turn 1 (short-term); a fact stated in thread A is recalled when starting a fresh thread B for the same user (long-term).
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## 1️⃣ How To Apply

Open a **new Agent thread in your Coding Assistant** and paste the prompt above. The AI runs `04-authentication` then `05-lakebase-memory` end-to-end in one pass.

### Prerequisite
- `Tools wired` gate captured in state
- Lakebase project + database already provisioned (earlier Lakebase prompt)

### Steps to Apply
1. New thread in your Coding Assistant, paste prompt.
2. The AI implements OBO via `get_user_workspace_client(http_request)` inside `@invoke`/`@stream`, declares `user_api_scopes` in `app.yaml`, and verifies both OBO + SP locally.
3. The AI then adds the two-layer Lakebase memory: short-term `AsyncDatabricksSession` per-thread + long-term `LongTermMemory` with `databricks-gte-large-en` embeddings.
4. Runs a multi-turn local smoke test that proves persistence both within and across threads.

---

## 2️⃣ What Are We Building?

We are wiring **on-behalf-of (OBO) authentication** so the agent acts as the calling user, with **service-principal (SP) fallback** for background paths — and adding **two-layer Lakebase memory** so multi-turn coherence and cross-thread recall both work.

```
HTTP request                                    Two-layer Lakebase memory
┌─────────────────────────────┐                ┌──────────────────────────────┐
│ x-forwarded-access-token    │                │ Short-term (per-thread)      │
│   (OBO — end-user identity) │                │  AsyncDatabricksSession      │
│                             │                │  Last N messages, current    │
│ @invoke / @stream handler   │  ──────────►   │  chain-of-thought            │
│   ↓                         │                │                              │
│ get_user_workspace_client(  │                │ Long-term (cross-thread)     │
│   http_request)             │                │  LongTermMemory              │
│   ↓                         │                │  databricks-gte-large-en     │
│ user_api_scopes (app.yaml): │                │  embeddings (1024 dims)      │
│  serving.serving-endpoints, │                │  Recall by semantic search   │
│  sql, unity-catalog,        │                │                              │
│  dashboards.genie (if Genie)│                │ Both keyed on thread_id +    │
└─────────────────────────────┘                │  user_id (OBO-derived)       │
            │                                  └──────────────────────────────┘
            ▼ falls back to                              ▲
    Service-Principal (SP)                               │
    (background tasks, no user)                          │
                                                  Pre-LLM search +
                                                  Post-LLM persist facts
```

### Key Concepts

| Concept | What It Means | Why It Matters |
|---------|---------------|----------------|
| **OBO** | On-behalf-of auth — the agent uses `x-forwarded-access-token` to act as the calling end-user | Tools (KA, Genie, SQL) enforce the user's UC permissions; the agent cannot escalate beyond them |
| **SP fallback** | Module-level `WorkspaceClient` is service-principal-backed for non-user paths (background, healthcheck) | Module-level construction has no `http_request`; SP keeps non-user code paths working |
| **`user_api_scopes`** | OAuth scopes declared in `app.yaml` (`serving.serving-endpoints`, `sql`, `unity-catalog`, optionally `dashboards.genie`, `catalog.connections`) | The platform issues a user token with exactly the scopes the agent needs |
| **`AsyncDatabricksSession`** | Short-term memory primitive bound to `thread_id` — last N messages + current chain-of-thought | Same-thread turn 2 references turn 1; per-request OBO scoping means memory respects user identity |
| **`LongTermMemory`** | Cross-thread store using `databricks-gte-large-en` embeddings (1024 dims), keyed on `user_id` | Recalls user-stated facts across new threads; pre-LLM search injects relevant memory into context, post-LLM persist writes new facts back |

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It's Used Here |
|----------|--------------------|
| **OBO inside handlers, SP at module level** | `get_user_workspace_client(http_request)` is called *inside* `@invoke` / `@stream` so each user request gets its own scoped client; module-level `WorkspaceClient` is SP-backed for non-user paths (background tasks, health probes). |
| **Declared `user_api_scopes`** | Every OAuth scope the agent needs at user level is declared in `app.yaml` so the platform issues the right token. Genie selects `dashboards.genie`; external MCP UC connections add `catalog.connections`. |
| **Two-layer memory by default** | Short-term gives turn-to-turn coherence; long-term gives cross-conversation recall. Both layers live in Lakebase, so identity, encryption, and backup come for free. |
| **Pre-LLM search, post-LLM persist** | Long-term memory is searched *before* the LLM call (results inserted into context) and persisted *after* (extracted facts written back). The agent never re-asks for facts the user already shared. |
| **Graceful degradation** | A Lakebase outage does not crash the agent; the memory layer logs the error and the agent continues with empty memory. Availability is preserved over recall. |

---

## 4️⃣ What Happens Behind the Scenes?

Two skills run end-to-end (`04-authentication` then `05-lakebase-memory`) over 7 phases:

| Phase | What Happens | Key Output |
|-------|--------------|------------|
| **Phase 0** | `vibecoding-state` op `enter` confirms `Tools wired` | Auth context |
| **Phase 1** | Install `get_user_workspace_client(http_request)` helper inside `@invoke` / `@stream` | OBO helper wired |
| **Phase 2** | Declare `user_api_scopes` in `app.yaml` from `agent_tool_plan.resource_grants.app_yaml_oauth_scopes` (default `["serving.serving-endpoints", "sql", "unity-catalog"]`; +`dashboards.genie` if Genie selected; +`catalog.connections` if external MCP UC connections selected) | Scopes declared |
| **Phase 3** | Verify both OBO + SP flows pass local probes (`obo_local`, `sp_local`, `user_api_scopes_in_app_yaml`) | Auth verified |
| **Phase 4** | Wire short-term `AsyncDatabricksSession` per-thread; `thread_id_resolver: "request.custom_inputs.thread_id || request.conversation_id"` | Short-term store live |
| **Phase 5** | Wire long-term `LongTermMemory` with `databricks-gte-large-en` (1024 dims); pre-LLM search, post-LLM persist; OBO-scoped sessions instantiated inside `@invoke` | Long-term store live |
| **Phase 6** | Multi-turn smoke test (turn 2 references turn 1) + cross-thread recall test (fact stated in thread A is recalled in thread B for same user) | Memory verified |

### Gate Contract

| Reads gate | Produces gate | Captured state |
|------------|---------------|----------------|
| `Tools wired` (from `track_a_agent_ka_genie_tools`) | `Auth + Memory verified` (consumed by 46) | `lakebase_instance`, `lakebase_database`, `embedding_endpoint`, `thread_id_strategy` |

</details>

<details><summary><strong>Expected Output</strong></summary>

### Resources Created
- [ ] `user_api_scopes` declared in `app.yaml`
- [ ] OBO + SP both verified locally
- [ ] Short-term memory persists across turns within a thread
- [ ] Long-term memory recalls user-stated facts across threads
- [ ] `lakebase_instance`, `lakebase_database`, `embedding_endpoint`, `thread_id_strategy` captured in state

</details>

#### Fork — `coding_assistant = genie-code`  (input_id 916)

> Fork rows override only `input_template`, `system_prompt`, and `bypass_llm`. All display fields are inherited from the default row above.

| Field | Value |
|-------|-------|
| `input_id` | `916` |
| `section_tag` | `track_a_agent_auth_memory` |
| `order_number` | `(inherited)` |
| `coding_assistant` | `genie-code` |
| `bypass_llm` | `true` |

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Add OBO/SP auth and the two-layer Lakebase memory to the agent app under `<AGENT_APP_ROOT>`. Before this step the agent is stateless and unauthenticated; after it, auth and memory are authored and verified by in-process probes.

This will involve the following steps:

- **Load the skills** — full `skill_ref_root`-prefixed paths.
- **Author auth and memory** — under `<AGENT_APP_ROOT>` (write files only).
- **Probe** — in-process OBO/SP and memory probes (not localhost).

The steps below are the prescriptive runbook for those actions; follow them in order.

**Genie Code — this is a prescriptive runbook. Follow the steps in order. Do NOT improvise paths, do NOT use bare relative paths, do NOT use `@`-mentions, and do NOT start a local dev server. OBO/SP auth and the two-layer Lakebase memory are authored under `<AGENT_APP_ROOT>`; the OBO/SP + memory probes run IN-PROCESS via `executeCode`. This wires auth + memory for the **{use_case_slug}** agent.**

### 🔴 Non-negotiable execution rules (read before anything)

❌ **NEVER run `uv run dev` / open `http://localhost:8000`.** The `obo_local` / `sp_local` / memory probes run in-process via `executeCode`: construct a fake `http_request` carrying `x-forwarded-access-token` for the OBO path and a module-level SP `WorkspaceClient` for the fallback path, then call the handler logic directly. No server.

❌ **NEVER hardcode the runtime token for OBO.** On serverless the SP runtime token is `w.config.authenticate()["Authorization"]` (NOT `w.config.token`, which is `None`) — see `genie-code-environment` §2 / `app-verification.md`. The OBO path uses the forwarded user token; the SP fallback uses the authenticated runtime token.

✅ The things you run directly are (a) authoring auth + memory code and `app.yaml` scopes under `<AGENT_APP_ROOT>`, (b) in-process `executeCode` OBO/SP + multi-turn memory probes, and (c) read-only inspection. Lakebase (`{lakebase_instance}` / `{lakebase_database}`) is already provisioned — do NOT create instances here.

### Step 0 — Resolve your environment (once, before anything else)

Run `skills/vibecoding-state` operation `enter` with `prompt_id: "track_a_agent_auth_memory"` and `require_prior_gate: {prompt_id: "track_a_agent_ka_genie_tools", gate: "Tools wired"}`. Read these resolved values and use them literally:

- `client_context` = `genie_code`
- `artifact_root` = your workshop project root (e.g. `/Workspace/Users/<your-email>/vibe-coding-workshop`) — where all generated bundles/apps/docs build; the repo itself is cloned at `/Workspace/Users/<your-email>/.assistant/skills/vibe-coding-workshop` (skills load from there via `skill_ref_root`, NOT from `artifact_root`)
- `skill_ref_root` = `skills/vibe-coding-workshop` (substitute your clone folder if different)
- `agent_app_root` = `<artifact_root>/{agent_app_name}` (the top-level Track A agent app dir). Referred to below as `<AGENT_APP_ROOT>`.
- `lakebase_instance` = `{lakebase_instance}`; `lakebase_database` = `{lakebase_database}`
- Workspace: `{workspace_url}`

If `enter` reports the prior gate is unmet, STOP. If `enter` has not run in this thread, run it now.

### Step 1 — Load the required skills by their FULL `skill_ref_root`-prefixed paths

Load each with `readSkillFile` using its `<skill_ref_root>`-prefixed path — NEVER a bare `@…` mention. **The root-level `skills/` come FIRST as the highest-priority guardrails.**

1. `readSkillFile("skills/vibe-coding-workshop/skills/genie-code-environment/SKILL.md")` — §2 (runtime token = `w.config.authenticate()`) + §4 (no local server). Loading this flips the manifest-load gate.
2. `readSkillFile("skills/vibe-coding-workshop/skills/databricks-expert-agent/SKILL.md")` — extract IDs from state; never hardcode.
3. `readSkillFile("skills/vibe-coding-workshop/genai-agents/tracks/A-custom-agent-apps/04-authentication/SKILL.md")` — OBO via `get_user_workspace_client(http_request)` inside `@invoke`/`@stream`, SP fallback, `user_api_scopes` in `app.yaml`. **Run its `obo_local`/`sp_local` probes in-process per Step 3 — not against a local server.**
4. `readSkillFile("skills/vibe-coding-workshop/genai-agents/tracks/A-custom-agent-apps/05-lakebase-memory/SKILL.md")` — two-layer memory (`AsyncDatabricksSession` short-term, `LongTermMemory` long-term, `databricks-gte-large-en` 1024-dim).

Load every further reference the skills name the same way (prefix with `skill_ref_root`). `AGENTS.md` root context does not carry across Genie Code threads.

### Step 2 — Author auth + memory under `<AGENT_APP_ROOT>` (write files only)

- Wire OBO: call `get_user_workspace_client(http_request)` INSIDE `@invoke`/`@stream`; keep the module-level SP `WorkspaceClient` for background paths.
- Declare `user_api_scopes` in `<AGENT_APP_ROOT>/app.yaml` from `docs/agent_tool_plan.yaml.resource_grants.app_yaml_oauth_scopes` (default `["serving.serving-endpoints", "sql", "unity-catalog"]`; +`dashboards.genie` if Genie selected; +`catalog.connections` if external MCP UC connections selected).
- Short-term memory: `AsyncDatabricksSession` against `{lakebase_database}`, keyed `thread_id` (`request.custom_inputs.thread_id || request.conversation_id`).
- Long-term memory: `LongTermMemory` with `databricks-gte-large-en` (1024 dims), keyed `user_id`; pre-LLM search + post-LLM persist; graceful degradation on Lakebase outage; sessions OBO-scoped inside `@invoke`.

### Step 3 — In-process OBO/SP + memory probes (NOT localhost)

Via `executeCode` (no server):
- **`obo_local`** — call the handler with a fake `http_request` carrying a `x-forwarded-access-token`; confirm `get_user_workspace_client` returns a user-scoped client.
- **`sp_local`** — call a background path with no `http_request`; confirm it falls back to the module-level SP client (runtime token via `w.config.authenticate()`).
- **`user_api_scopes_in_app_yaml`** — assert the scopes are present in `<AGENT_APP_ROOT>/app.yaml`.
- **Memory** — same-thread turn 2 references turn 1 (short-term); a fact stated in thread A is recalled in a fresh thread B for the same user (long-term).

**State-lock:** this prompt runs between an `enter` (Step 0) and an `exit`. After the gate passes, run `skills/vibecoding-state` op `exit` — params: `prompt_id: "track_a_agent_auth_memory"`, `gate: "Auth + Memory verified"`, `captured: {lakebase_instance, lakebase_database, embedding_endpoint, thread_id_strategy}`. **This `enter`/`exit` pair is a mandatory ritual, not advisory.** Step 0's `enter` MUST locate — or, if this is the first prompt of the track, bootstrap-create — the canonical live state file at `<agent_app_root>/.vibecoding-state.md` (never the temporary `example/…` bootstrap path). The closing `exit` MUST append this prompt's Per-Step Log entry, Gate result, and `captured` vars to that file, then **re-read it and echo the appended section to prove the write landed**. **Gate completion rule:** this prompt is NOT complete until that re-read confirms the appended entry — the chat summary is NOT the state store.

**Gate:** `Auth + Memory verified` — OBO and SP probes both pass **in-process**; same-thread turn 2 references turn 1; a fact stated in thread A is recalled in fresh thread B for the same user. NO `http://localhost:8000` check was attempted.
```

---

## Phase 2 / Agent Build — Smoke Eval + Deploy

| Field | Value |
|-------|-------|
| `input_id` | `206` |
| `section_tag` | `track_a_agent_eval_deploy` |
| `order_number` | `46` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Run developer-loop smoke evaluation, deploy the agent to Databricks Apps, verify queryable end-to-end_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Run the smoke eval suite against the wired **{use_case_slug}** agent and deploy `{agent_app_name}` to Databricks Apps. Today the agent runs only locally; after this prompt runs, the smoke gate has either passed or fail-closed-blocked, the agent is deployed via `databricks bundle deploy`, three post-deploy probes (curl, Python SDK, MLflow trace at `{mlflow_experiment_path}`) succeed, and `databricks apps get` reports `RUNNING`.

This will involve the following steps:

- **Load smoke cases (union)** — UNION `governance.verification.smoke_test_cases[]` from the agent spec (use-case shaped) WITH `verification.tool_smoke_tests[]` from the tool plan (one per `selected_tools[]` entry — KA absent ⇒ no KA smoke test, Genie absent ⇒ no Genie smoke test). Write the union into `tests/eval_dataset.json`.
- **Run the smoke eval** — execute `uv run agent-evaluate` against the configured `runtime_config.llm` route and write per-case pass/fail to MLflow
- **Apply fail-closed conditions** — refuse to advance if any L1 scorer is below floor, `correctness/mean` is below floor, any tool LISTED IN `docs/agent_tool_plan.yaml.selected_tools[]` returns `UNRESOLVED_COLUMN` / `TABLE_OR_VIEW_NOT_FOUND` / permission-denied / empty output, any selected tool is missing a TOOL span in the trace, or any open known issue targets `first_scored_eval`. Tools absent from `selected_tools[]` cannot trip this condition (they were never wired).
- **Bundle-deploy the agent app** — run `databricks bundle deploy` then `databricks apps deploy {agent_app_name}` so app code and resource grants from the Tool Plan deploy together
- **Run three post-deploy probes** — curl `/invocations`, Python SDK invoke, and confirm production traces appear at `{mlflow_experiment_path}`
- **Verify platform health** — confirm `databricks apps get "{agent_app_name}"` reports `RUNNING` before producing the gate

This prompt maps to the canonical `local_eval_smoke` role. The smoke Gate **fails closed** — `exit` MUST refuse to write `Agent App RUNNING` (and instead emit `Smoke regressed — block`) if any of the following hold:

- Any L1 scorer mean (e.g. `safety/mean`, `relevance/mean`, `guideline_adherence/mean`) is below its registered floor.
- `correctness/mean` is below its registered floor.
- Any tool call in the smoke run produces `UNRESOLVED_COLUMN`, `TABLE_OR_VIEW_NOT_FOUND`, a permission denied error, or empty tool output.
- `mlflow_eval_known_quality_issues[]` contains an open item targeting `first_scored_eval` (i.e. a known regression that the smoke run is expected to surface but currently masks).

**How this prompt chains with the prior step (skill invocations):**

**Invoke skills (in order):**

1. `skills/vibecoding-state` op `enter` — params: `prompt_id: "track_a_agent_eval_deploy"`, `require_prior_gate: {prompt_id: "track_a_agent_auth_memory", gate: "Auth + Memory verified"}`.
2. @genai-agents/tracks/A-custom-agent-apps/06-evaluation/SKILL.md — params:
   - `agent_name: "{agent_app_name}"`
   - `agent_spec_ref: "state://AgentSpec"`
   - `agent_tool_plan_ref: "docs/agent_tool_plan.yaml"`
   - `mlflow_experiment_path: "{mlflow_experiment_path}"`
   - `runtime_model_ref: "docs/agent_tool_plan.yaml.runtime_config.llm"`
   - `runner_cmd: "uv run agent-evaluate"`
   - `dataset_path: "tests/eval_dataset.json"`
   - The skill reads `governance.verification.smoke_test_cases[]` (Spec, use-case shaped) UNIONED with `docs/agent_tool_plan.yaml.verification.tool_smoke_tests[]` (Plan, one per `selected_tools[]` entry) for the developer-loop test cases. Tool families absent from `selected_tools[]` contribute zero smoke tests.
3. @genai-agents/tracks/A-custom-agent-apps/07-deploy-and-query/SKILL.md — params:
   - `agent_name: "{agent_app_name}"`
   - `target: "databricks_apps"`
   - `runtime_model_ref: "docs/agent_tool_plan.yaml.runtime_config.llm"`
   - `ai_gateway_required: false`
   - `post_deploy_checks: ["curl_query", "python_sdk_query", "traces_visible_in_mlflow"]`
4. **Inline verification:** `databricks apps get "{agent_app_name}" --output json | jq -r '.status.state'` must return `RUNNING` before exit.
5. `skills/vibecoding-state` op `exit` — params: `prompt_id: "track_a_agent_eval_deploy"`, `gate: "Agent App RUNNING"`, `captured: {agent_app_url, agent_app_name}`. `exit` re-evaluates the four fail-closed conditions above; any positive condition flips the Gate to `Smoke regressed — block` and refuses to advance.

**Gate:** `Agent App RUNNING` — smoke eval pass/fail visible in MLflow AND none of the four fail-closed conditions above are tripped (no L1 scorer below floor, `correctness/mean` at or above floor, no `UNRESOLVED_COLUMN` / `TABLE_OR_VIEW_NOT_FOUND` / permission denied / empty tool output, no open `mlflow_eval_known_quality_issues[]` targeting `first_scored_eval`); agent app deployed; curl + Python SDK calls against `<agent_app_url>/invocations` succeed; traces from the deployed app show up at `{mlflow_experiment_path}`. The deployed app uses the configured model route from `runtime_config.llm`; the core gate does not create, configure, or require AI Gateway.
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## 1️⃣ How To Apply

Open a **new Agent thread in your Coding Assistant** and paste the prompt above. The AI runs `06-evaluation` then `07-deploy-and-query` and finishes with the explicit `databricks apps get` health check before exiting state.

### Prerequisite
- `Auth + Memory verified` gate captured in state
- `governance.verification.smoke_test_cases[]` populated in `state://AgentSpec`

### Steps to Apply
1. New thread in your Coding Assistant, paste prompt.
2. AI executes `uv run agent-evaluate` against `tests/eval_dataset.json` and writes per-test pass/fail to MLflow.
3. AI builds + uploads the app via Databricks Asset Bundles, redeploys, then runs the three post-deploy probes (curl, SDK, traces).
4. Final inline check: `databricks apps get` reports `RUNNING`.

---

## 2️⃣ What Are We Building?

We are running the **fail-closed smoke eval + deploy gate** that closes Track A. The smoke run refuses to advance on **any** of four conditions; the deploy then proves the running app is reachable through three probes before the gate fires `Agent App RUNNING`.

```
Smoke run (uv run agent-evaluate, tests/eval_dataset.json)
                │
                ▼
   ┌────────────────────────────┐
   │ Fail-closed conditions:    │
   │  1. L1 scorer below floor? │   ANY YES ──► Gate: Smoke regressed - block
   │  2. correctness < floor?   │              (refuse to deploy)
   │  3. UNRESOLVED_COLUMN /    │
   │     TABLE_NOT_FOUND /      │
   │     permission denied /    │
   │     empty tool output?     │
   │  4. open known issue       │
   │     targeting first_eval?  │   ALL NO  ──► proceed
   └────────────────────────────┘                │
                                                 ▼
                                  databricks bundle deploy + apps deploy
                                                 │
                                                 ▼
                              Three post-deploy probes:
                                curl <agent_app_url>/invocations
                                Python SDK invoke
                                traces visible at {mlflow_experiment_path}
                                                 │
                                                 ▼
                              databricks apps get reports RUNNING
                                                 │
                                                 ▼
                                Gate: Agent App RUNNING
```

### Key Concepts

| Concept | What It Means | Why It Matters |
|---------|---------------|----------------|
| **Smoke eval** | `uv run agent-evaluate` against `tests/eval_dataset.json`, reading `governance.verification.smoke_test_cases[]` from the spec | Developer-loop signal; the real scored eval happens in 50 |
| **Fail-closed gate** | The gate refuses to advance on ANY of 4 conditions: L1 scorer below floor, `correctness/mean` below floor, tool errors (`UNRESOLVED_COLUMN`, `TABLE_OR_VIEW_NOT_FOUND`, permission denied, empty output), or open known issue targeting `first_scored_eval` | Quality regressions cannot ride a successful deploy into production |
| **DAB-driven deploy** | `databricks bundle deploy` packages app + resources; nothing is deployed by hand | Bundle resources from 39 (`serving_endpoints`, `genie_space`, `sql_warehouse`, etc.) deploy together with the app code |
| **Three post-deploy probes** | curl `/invocations`, Python SDK `invoke`, MLflow trace appears at `{mlflow_experiment_path}` | Independent paths verify the deployed app reaches users, automation, and observability |
| **`databricks apps get` health check** | Final gate refuses to write `Agent App RUNNING` until the platform reports `RUNNING` | The platform's own state is the source of truth, not local return codes |

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It's Used Here |
|----------|--------------------|
| **Fail-closed by design** | The smoke gate refuses to advance on ANY of four conditions. Quality regressions cannot ride a successful deploy into production — the gate is built to refuse, not to negotiate. |
| **Smoke ≠ full eval** | Smoke uses developer-loop test cases (`governance.verification.smoke_test_cases[]`); the real scored eval happens in 50. Smoke is fast and surfaces obvious regressions; it is not a quality bar. |
| **Three deploy probes** | curl `/invocations`, Python SDK invoke, MLflow trace visible at `{mlflow_experiment_path}`. All three must pass before the gate fires — independent paths verify reachability for end-users, automation, and observability. |
| **DAB-driven deploy** | `databricks bundle deploy` packages app + resources together; nothing is deployed by hand. Resource grants from the Tool Plan (39) are applied in the same bundle action as the app code. |
| **`databricks apps get` health check** | The final gate refuses to write `Agent App RUNNING` until the platform reports `RUNNING`. The platform's own state machine is the truth, not the local return code of `apps deploy`. |

---

## 4️⃣ What Happens Behind the Scenes?

Two skills run sequentially (`06-evaluation` then `07-deploy-and-query`) plus an inline platform health check, across 7 phases:

| Phase | What Happens | Key Output |
|-------|--------------|------------|
| **Phase 0** | `vibecoding-state` op `enter` confirms `Auth + Memory verified` | Smoke context |
| **Phase 1** | `uv run agent-evaluate --dataset tests/eval_dataset.json` against the configured `runtime_config.llm` route | Per-case pass/fail in MLflow |
| **Phase 2** | Evaluate fail-closed conditions: L1 scorer floor, `correctness/mean` floor, tool errors, open known issues — ANY YES => `Smoke regressed - block` | Gate decision |
| **Phase 3** | `databricks bundle deploy` packages app + resources from 39's `databricks.yml` | Bundle deployed |
| **Phase 4** | `databricks apps deploy {agent_app_name}` rolls the app to Databricks Apps | App rolling |
| **Phase 5** | Three probes: `curl <agent_app_url>/invocations`, Python SDK `invoke`, MLflow trace appears at `{mlflow_experiment_path}` | Reachability verified |
| **Phase 6** | Inline `databricks apps get "{agent_app_name}" --output json | jq -r '.status.state'` must return `RUNNING` before exit | Platform health |

### Gate Contract

| Reads gate | Produces gate | Captured state |
|------------|---------------|----------------|
| `Auth + Memory verified` (from `track_a_agent_auth_memory`) | `Agent App RUNNING` OR `Smoke regressed - block` | `agent_app_url`, `agent_app_name` |

</details>

<details><summary><strong>Expected Output</strong></summary>

### Resources Created
- [ ] Smoke evaluation results in MLflow (pass/fail per test case)
- [ ] Agent App deployed to Databricks Apps
- [ ] `databricks apps get` reports `RUNNING`
- [ ] curl + Python SDK queries succeed against `<agent_app_url>/invocations`
- [ ] Production traces show up at `{mlflow_experiment_path}`
- [ ] `agent_app_url`, `agent_app_name` captured in state

</details>

#### Fork — `coding_assistant = genie-code`  (input_id 917)

> Fork rows override only `input_template`, `system_prompt`, and `bypass_llm`. All display fields are inherited from the default row above.

| Field | Value |
|-------|-------|
| `input_id` | `917` |
| `section_tag` | `track_a_agent_eval_deploy` |
| `order_number` | `(inherited)` |
| `coding_assistant` | `genie-code` |
| `bypass_llm` | `true` |

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Run a smoke eval, then deploy the agent app under `<AGENT_APP_ROOT>`. Before this step the agent runs only in-session; after it, a fail-closed smoke eval passes, resource grants are bundle-deployed, and the app host is deployed and probed live over OAuth.

This will involve the following steps:

- **Load the skills** — full `skill_ref_root`-prefixed paths.
- **Run the smoke eval** — fail-closed, in-session `uv`.
- **Bundle-deploy the grants** — from the bundle-editor page.
- **Deploy the app host** — via the SDK SNAPSHOT path (server-side build).
- **Probe** — against the deployed `/invocations` (3-hop OAuth).

The steps below are the prescriptive runbook for those actions; follow them in order.

**Genie Code — this is a prescriptive runbook. Follow the steps in order. Do NOT improvise paths, do NOT use bare relative paths, do NOT use `@`-mentions, and do NOT hand-create the app. The smoke eval runs in-session with `uv`; the agent app under `<AGENT_APP_ROOT>` deploys via `bundle deploy` (resource grants, from the bundle-editor page) PLUS the SDK SNAPSHOT app deploy (server-side `uv`/FastAPI build); the deployed `/invocations` is verified with the 3-hop OAuth session. This evaluates + deploys the **{use_case_slug}** agent.**

### 🔴 Non-negotiable execution rules (read before anything)

❌ **NEVER `curl` + `databricks auth token`.** `auth token` is hard-blocked on Genie Code. A deployed App sits behind the Apps **OAuth gate**: a raw `Authorization: Bearer` token (even the runtime token) returns 401. Verify `/invocations` with the **3-hop OAuth `requests.Session()`** (`genie-code-environment` §7 / `app-verification.md`).

❌ **DO NOT rely on `databricks apps deploy` via `runDatabricksCli` for the app host** — it is page-dependent/CWD-defeated. Use the SDK SNAPSHOT call. The **bundle** half (`bundle deploy`, which applies the Tool Plan's resource grants) DOES run via `runDatabricksCli`, but **only from the bundle-editor page** for `<AGENT_APP_ROOT>`. *blocked ≠ impossible — try the next path.*

❌ **NEVER apply the resource grants by hand via `executeCode` or `spark.sql` `GRANT`, and NEVER apply them via the Permissions REST API.** Those grants are the **body of the bundle** — `bundle deploy` IS the mechanism that applies them. Hand-applying grants creates an un-versioned drift with no `bundle destroy` cleanup and FAILS the gate. **Do not fall back to direct SQL.** Those hand-apply routes are an **escape hatch available only if the operator explicitly authorizes it.**

✅ The things you run directly are (a) `uv run agent-evaluate` in-session, (b) `databricks bundle validate/deploy --target dev` via `runDatabricksCli` from the bundle-editor page, (c) the SDK SNAPSHOT app deploy via `executeCode`, and (d) the 3-hop OAuth `/invocations` probe + trace check.

### Step 0 — Resolve your environment (once, before anything else)

Run `skills/vibecoding-state` operation `enter` with `prompt_id: "track_a_agent_eval_deploy"` and `require_prior_gate: {prompt_id: "track_a_agent_auth_memory", gate: "Auth + Memory verified"}`. Read these resolved values and use them literally:

- `client_context` = `genie_code`
- `artifact_root` = your workshop project root (e.g. `/Workspace/Users/<your-email>/vibe-coding-workshop`) — where all generated bundles/apps/docs build; the repo itself is cloned at `/Workspace/Users/<your-email>/.assistant/skills/vibe-coding-workshop` (skills load from there via `skill_ref_root`, NOT from `artifact_root`)
- `skill_ref_root` = `skills/vibe-coding-workshop` (substitute your clone folder if different)
- `agent_app_root` = `<artifact_root>/{agent_app_name}` (the top-level Track A agent app dir). Referred to below as `<AGENT_APP_ROOT>`. Its `databricks.yml` lives here, so this folder is the **`bundle deploy` page-context root**.
- `mlflow_experiment_path` = `{mlflow_experiment_path}`
- `bundle_deploy.verb` = `bundle deploy --target dev` (run via `runDatabricksCli`); `app_deploy.verb` = `apps deploy` (resolves to the SDK SNAPSHOT call on Genie Code)
- Workspace: `{workspace_url}`

If `enter` reports the prior gate is unmet, STOP. If `enter` has not run in this thread, run it now.

### Step 1 — Load the required skills by their FULL `skill_ref_root`-prefixed paths

Load each with `readSkillFile` using its `<skill_ref_root>`-prefixed path — NEVER a bare `@…` mention. **The root-level `skills/` come FIRST as the highest-priority guardrails.**

1. `readSkillFile("skills/vibe-coding-workshop/skills/genie-code-environment/SKILL.md")` — §4 (server-side `uv`/FastAPI SNAPSHOT build) + §7 (deployed-app OAuth). Loading this flips the manifest-load gate.
2. `readSkillFile("skills/vibe-coding-workshop/skills/databricks-asset-bundles/SKILL.md")` — serverless YAML, `--target dev`, the bundle-editor page-context rule. **You will not run any `bundle` command until you have read this.**
3. `readSkillFile("skills/vibe-coding-workshop/genai-agents/tracks/A-custom-agent-apps/06-evaluation/SKILL.md")` — smoke eval + the four fail-closed conditions. Run `uv run agent-evaluate` in-session.
4. `readSkillFile("skills/vibe-coding-workshop/genai-agents/tracks/A-custom-agent-apps/07-deploy-and-query/SKILL.md")` — deploy + post-deploy probes. **Translate its `databricks apps deploy` into the SDK SNAPSHOT call (Step 4) and its `curl` probe into the 3-hop OAuth session (Step 5).**
5. `readSkillFile("skills/vibe-coding-workshop/skills/genie-code-environment/references/app-verification.md")` — the reusable 3-hop OAuth `requests.Session()` snippet (incl. a POST to a Track A Agent App `/invocations`).

Load every further reference the skills name the same way (prefix with `skill_ref_root`). `AGENTS.md` root context does not carry across Genie Code threads.

### Step 2 — Run the fail-closed smoke eval (in-session `uv`)

Build `tests/eval_dataset.json` under `<AGENT_APP_ROOT>` from the UNION of `governance.verification.smoke_test_cases[]` (Spec) and `docs/agent_tool_plan.yaml.verification.tool_smoke_tests[]` (Plan; one per `selected_tools[]` entry). Run `uv run agent-evaluate` from `<AGENT_APP_ROOT>` and write per-case pass/fail to `{mlflow_experiment_path}`. **Fail closed** — do NOT advance if any L1 scorer is below floor, `correctness/mean` is below floor, any tool in `selected_tools[]` returns `UNRESOLVED_COLUMN`/`TABLE_OR_VIEW_NOT_FOUND`/permission-denied/empty, any selected tool is missing a TOOL span, or an open `mlflow_eval_known_quality_issues[]` targets `first_scored_eval`. Tools absent from `selected_tools[]` cannot trip this.

### Step 3 — Bundle-deploy the resource grants (from the bundle-editor page)

`<AGENT_APP_ROOT>/databricks.yml` already exists, so the workspace file browser shows the **"Open in bundle editor"** affordance on that folder. **Surface a clickable link and open it BEFORE any `bundle` command** (its page CWD is `<AGENT_APP_ROOT>`, where `bundle deploy` is pre-approved). Build the link via the pre-authenticated `w`:
- `host = w.config.host`; `o = w.get_workspace_id()`
- `file_id = w.workspace.get_status("<AGENT_APP_ROOT>/databricks.yml").object_id`; `folder_id = w.workspace.get_status("<AGENT_APP_ROOT>").object_id`
- **Bundle editor:** `{host}/editor/files/{file_id}?o={o}&contextId=folder%3A{folder_id}`

From that page, via `runDatabricksCli` (omit `--profile`; do NOT `databricks sync`):
- `databricks bundle validate --target dev`
- `databricks bundle deploy --target dev`

**🛑 If a `bundle` command is blocked or fails**, you are NOT on the bundle page. A `databricks.yml not found` error or a "blocked by safety guardrails" message means the page CWD is wrong — open the bundle-editor link and retry (CONFIRMED: the same `bundle deploy` that is "blocked" from a file page succeeds from the bundle editor). **Do not fall back to direct SQL** or hand-apply grants. If it STILL fails from the bundle editor, STOP and report. The hand-apply / REST routes are an **escape hatch available only if the operator explicitly authorizes it.**

### Step 4 — Deploy the app host via the SDK SNAPSHOT path (server-side build)

Via `executeCode` against warm compute (warm up once with `print("ready")`; generous `timeoutMinutes`): the Apps runtime installs `uv` deps + starts the FastAPI server **server-side** from the un-built source under `<AGENT_APP_ROOT>` (TESTED — `uv`/FastAPI SNAPSHOT build, `genie-code-environment` §4):
1. `w.apps.get(<agent_app_name>)`; if 404, `w.apps.create(...)` and wait for compute `ACTIVE`.
2. `w.apps.deploy(<agent_app_name>, AppDeployment(source_code_path="<AGENT_APP_ROOT>", mode=AppDeploymentMode.SNAPSHOT))`.
3. Poll `get_deployment` until `SUCCEEDED` (surface `apps logs <agent_app_name>` on `FAILED`); confirm `w.apps.get(<agent_app_name>).compute_status.state == "ACTIVE"`. Capture `agent_app_url`.

### Step 5 — Post-deploy probes against the DEPLOYED `/invocations` (3-hop OAuth)

Three probes (no localhost, no `curl`+token):
- **OAuth `/invocations` POST** — replay the 3-hop Apps OAuth handshake in one `requests.Session()` (snippet from `app-verification.md`), then POST a domain question to `<agent_app_url>/invocations`; expect 200 + a valid agent response.
- **Python SDK invoke** — confirm the same via the SDK path.
- **Traces visible** — production traces from the deployed app appear at `{mlflow_experiment_path}`.

Then confirm platform health: `w.apps.get(<agent_app_name>).compute_status.state == "ACTIVE"` (or `databricks apps get "<agent_app_name>"` via `runDatabricksCli`).

**State-lock:** this prompt runs between an `enter` (Step 0) and an `exit`. After the gate passes, run `skills/vibecoding-state` op `exit` — params: `prompt_id: "track_a_agent_eval_deploy"`, `gate: "Agent App RUNNING"`, `captured: {agent_app_url, agent_app_name}`. `exit` re-evaluates the four fail-closed conditions; any positive condition flips the gate to `Smoke regressed — block`. **This `enter`/`exit` pair is a mandatory ritual, not advisory.** Step 0's `enter` MUST locate — or, if this is the first prompt of the track, bootstrap-create — the canonical live state file at `<agent_app_root>/.vibecoding-state.md` (never the temporary `example/…` bootstrap path). The closing `exit` MUST append this prompt's Per-Step Log entry, Gate result, and `captured` vars to that file, then **re-read it and echo the appended section to prove the write landed**. **Gate completion rule:** this prompt is NOT complete until that re-read confirms the appended entry — the chat summary is NOT the state store.

**Gate:** `Agent App RUNNING` — smoke eval pass/fail visible in MLflow AND none of the four fail-closed conditions tripped; the bundle's resource grants deployed via `bundle deploy` from the bundle-editor page; the app host deployed via the SDK SNAPSHOT call (server-side `uv`/FastAPI build) with compute `ACTIVE`; the deployed `/invocations` returned 200 through the 3-hop OAuth session; traces visible at `{mlflow_experiment_path}`. The app/grants existing is **necessary but NOT sufficient** — if the grants were hand-applied (REST/`spark.sql`) instead of by `bundle deploy` from the bundle-editor page, or the host was hand-created, the gate FAILS and you redo it via the bundle + SDK SNAPSHOT. Verification used the DEPLOYED URL — NO localhost check, NO `curl`+`auth token`, and NO hand-created app.

**🛑 STOP — do not work around a blocked deploy.** If `bundle deploy`, the SDK SNAPSHOT deploy, or the OAuth probe fails, STOP and report the exact error and which path was attempted. Do NOT hand-create the app, fabricate a URL, or skip verification. Take an alternate path only if the operator explicitly authorizes it.
```

---

## Phase 3 / AppKit Integration — AppKit ↔ Agent App Proxy (streaming chat)

| Field | Value |
|-------|-------|
| `input_id` | `207` |
| `section_tag` | `appkit_agent_app_proxy_chat` |
| `order_number` | `47` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Wire AppKit dashboard to a Databricks Agent App via server.extend() proxy with SP + OBO and dual-format streaming_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Wire the existing AppKit dashboard `{app_name}` to the separately-deployed Track A Agent App `{agent_app_name}` (running at `{agent_app_url}`) through an in-app `/api/chat` proxy. The Agent App is a Databricks App (FastAPI host with `/invocations`), not a Model Serving endpoint, so this uses a vanilla `server.extend()` proxy with OBO forwarding instead of the AppKit Serving plugin. Today the AppKit dashboard has no chat surface; after this prompt runs, `/chat` streams chat against the Agent App with the user's OBO token forwarded byte-for-byte.

This will involve the following steps:

- **Declare the Agent App as `CAN_USE` resource** — patch `$APP_ROOT/databricks.yml` to declare the Agent App as a bundle resource named `agent-backend`
- **Expose `AGENT_APP_URL` in `app.yaml`** — bind `AGENT_APP_URL` via `valueFrom: agent-backend` so swapping environments (dev/staging/prod) requires no code change
- **Write the `server.extend()` proxy** — add `POST /api/chat` that forwards `x-forwarded-access-token` verbatim and bridges Agent-App SSE into the format the AppKit chat page understands
- **Mount the chat page** — wire the AppKit chat React page at `/chat` to consume the proxy stream
- **Run the 3-probe e2e test** — direct agent / AppKit SP-only / AppKit with forwarded OBO must all pass to prove the auth wiring is correct

**First:** Read `$APP_ROOT/.vibecoding-state.md` if it exists — it contains the AppKit app identity (`APP_NAME`) and Lakebase values from prior phases.

**How this prompt chains with the prior step (skill invocations):**

**Invoke skills (in order):**

1. `skills/vibecoding-state` op `enter` — params: `prompt_id: "appkit_agent_app_proxy_chat"`, `require_prior_gate: {prompt_id: "track_a_agent_eval_deploy", gate: "Agent App RUNNING"}`.
2. @apps_lakebase/skills/06d-appkit-agent-app-proxy/SKILL.md — params:
   - `app_dir: "$APP_ROOT"` (= `<artifact_root>/<app_name>`, the top-level AppKit app dir)
   - `agent_app_name: "{agent_app_name}"`
   - `agent_app_url: "{agent_app_url}"`
   - `chat_route: "/api/chat"`
   - `chat_page: "/chat"`
   - `databricks_yml_resource: {type: "app", name: "agent-backend", permission: "CAN_USE"}`
   - `app_yaml_env: {AGENT_APP_URL: {valueFrom: "agent-backend"}}`
   - `streaming: "dual-format"`
   - `obo_forwarding: true` (verbatim `x-forwarded-access-token`)
   - `verification: {cmd: "bash apps_lakebase/skills/06d-appkit-agent-app-proxy/scripts/test-agent-app-proxy.sh --appkit-app {app_name} --agent-app {agent_app_name}", behavior: "3 probes pass"}`
   - Wires the AppKit frontend to the Agent App backend via a vanilla `server.extend()` proxy with SP + OBO auth layers. Does **not** use the Serving plugin — the backend is a Databricks App, not a Model Serving endpoint.
3. `skills/vibecoding-state` op `exit` — params: `prompt_id: "appkit_agent_app_proxy_chat"`, `gate: "AppKit ↔ Agent App proxy live"`.

**Gate:** `AppKit ↔ Agent App proxy live` — streaming chat works on `/chat` against the Agent App; the 3-probe e2e test (direct agent, AppKit SP-only, AppKit with forwarded OBO) passes.
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## 1️⃣ How To Apply

Open a **new Agent thread in your Coding Assistant** and paste the prompt above. This installs the new `06d-appkit-agent-app-proxy` skill which is purpose-built for Agent App backends — distinct from the legacy Serving plugin which only targets Model Serving endpoints.

### Prerequisite
- `Agent App RUNNING` gate captured in state with `agent_app_url`, `agent_app_name`
- AppKit dashboard from earlier prompts already deployed

### Steps to Apply
1. New thread in your Coding Assistant, paste prompt.
2. AI patches `$APP_ROOT/databricks.yml` to declare the Agent App as a `CAN_USE` resource named `agent-backend`.
3. AI patches `app.yaml` to expose `AGENT_APP_URL` via `valueFrom`.
4. AI generates the `server.extend()` proxy at `/api/chat` that forwards `x-forwarded-access-token` and bridges the dual-format SSE stream to the AppKit chat page at `/chat`.
5. AI runs the 3-probe e2e script to confirm the proxy works end-to-end.

---

## 2️⃣ What Are We Building?

We are wiring an existing AppKit dashboard to a separately-deployed **Track A Agent App** through an in-app proxy route. The Agent App is a Databricks App (FastAPI host with `/invocations`), not a Model Serving endpoint, so we do **not** use the AppKit Serving plugin. Instead, the AppKit backend extends its FastAPI server with a `/api/chat` route that forwards the user's OBO token and bridges Agent-App SSE into the format the AppKit chat page understands.

```
Browser (user)                    AppKit App                  Agent App (Track A)
┌──────────┐    /chat            ┌──────────────────┐       ┌────────────────────┐
│ Chat UI  │ ─────────────────►  │ React page +     │       │ FastAPI host       │
│          │                     │  /api/chat route │       │  /invocations      │
│          │  SSE stream         │   (server.extend)│       │  @invoke / @stream │
│          │ ◀─────────────────  │  ┌────────────┐  │       │                    │
└──────────┘                     │  │ proxy      │  │       └────────────────────┘
                                 │  │ x-forwarded│  │ ───►  databricks.yml:
                                 │  │ -access-   │  │       resources:
                                 │  │   token    │  │         agent-backend:
                                 │  │ verbatim   │  │           type: app
                                 │  └────────────┘  │           permission: CAN_USE
                                 └──────────────────┘       app.yaml:
                                                              AGENT_APP_URL:
                                                                valueFrom: agent-backend
```

### Key Concepts

| Concept | What It Means | Why It Matters |
|---------|---------------|----------------|
| **server.extend() proxy** | Vanilla FastAPI route added by AppKit's extension hook | Only path that supports an Agent App backend; the Serving plugin only targets Model Serving |
| **`x-forwarded-access-token`** | Header AppKit injects with the end user's OBO token | Verbatim forwarding lets the Agent App act as the user, not the AppKit SP |
| **`agent-backend` resource** | A `databricks.yml` `app` resource with `CAN_USE` permission | Materializes the trust relationship in the bundle; `databricks bundle deploy` provisions the grant |
| **`valueFrom: agent-backend`** | `app.yaml` env binding that resolves to the resource's URL | Swap dev/staging/prod by changing the bundle target — no code edit |
| **Dual-format streaming** | Agent App emits one SSE shape; AppKit chat expects another | Proxy translates per-event so the existing chat UI renders without a rewrite |
| **3-probe e2e** | Direct agent / AppKit-SP-only / AppKit-with-OBO | All three must pass to prove auth wiring; the SP-only probe catches missing-OBO bugs |

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It's Used Here |
|----------|--------------------|
| **Vanilla `server.extend()` proxy** | The AppKit Serving plugin only targets Model Serving endpoints. The Agent App is a Databricks App, so we proxy app-to-app via a custom FastAPI route — no plugin shortcut. |
| **Verbatim OBO forwarding** | `x-forwarded-access-token` is forwarded byte-for-byte; the Agent App reuses the end-user's identity for tool calls, preserving UC RLS and audit trails. |
| **Dual-format streaming bridge** | The proxy translates Agent-App SSE events into AppKit chat-page SSE events on the fly so the existing chat UI works without modification. |
| **`valueFrom` indirection** | `AGENT_APP_URL` resolves through the `agent-backend` resource in `app.yaml`, so swapping deploy targets (dev/staging/prod) requires no code change — only a bundle target switch. |
| **Three-probe smoke test** | Direct agent, AppKit-with-SP-only, AppKit-with-OBO; all three must pass before the gate fires. The SP-only probe catches the "forgot to forward the user token" failure mode. |

---

## 4️⃣ What Happens Behind the Scenes?

When you paste the prompt, the AI walks the proxy install in five phases:

| Phase | What the AI Does | Where It Writes |
|-------|------------------|-----------------|
| 1. Declare resource | Add `agent-backend` `app` resource with `CAN_USE` | `$APP_ROOT/databricks.yml` |
| 2. Expose env var | Bind `AGENT_APP_URL` via `valueFrom: agent-backend` | `$APP_ROOT/app.yaml` |
| 3. Write proxy route | `server.extend()` adds `POST /api/chat` that forwards `x-forwarded-access-token` and bridges SSE | AppKit backend extension module |
| 4. Wire chat page | React chat page hits `/api/chat`; consumes proxy SSE | AppKit frontend route at `/chat` |
| 5. Run 3-probe e2e | `test-agent-app-proxy.sh` hits direct agent, AppKit SP-only, AppKit-with-OBO | Smoke output captured before gate exit |

### Gate Contract

| Reads gate | Produces gate | Captured state |
|------------|---------------|----------------|
| `Agent App RUNNING` (from `track_a_agent_eval_deploy`, with `agent_app_url`, `agent_app_name`) | `AppKit ↔ Agent App proxy live` | `/chat` page renders streaming chat against the Agent App with OBO; 3-probe e2e green |

</details>

<details><summary><strong>Expected Output</strong></summary>

### Resources Created
- [ ] `$APP_ROOT/databricks.yml` declares the Agent App as `agent-backend` resource
- [ ] `$APP_ROOT/app.yaml` exposes `AGENT_APP_URL` via `valueFrom: agent-backend`
- [ ] `/api/chat` proxy route streams against the Agent App with OBO header forwarding
- [ ] `/chat` AppKit page renders streaming chat
- [ ] 3-probe e2e test passes (direct agent, AppKit SP-only, AppKit with forwarded OBO)

</details>

#### Fork — `coding_assistant = genie-code`  (input_id 918)

> Fork rows override only `input_template`, `system_prompt`, and `bypass_llm`. All display fields are inherited from the default row above.

| Field | Value |
|-------|-------|
| `input_id` | `918` |
| `section_tag` | `appkit_agent_app_proxy_chat` |
| `order_number` | `(inherited)` |
| `coding_assistant` | `genie-code` |
| `bypass_llm` | `true` |

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Add an on-behalf-of (OBO) proxy so the AppKit app's chat calls reach a separate Agent App. Before this step the two apps are disconnected; after it, `<APP_ROOT>` carries the `server.extend()` proxy plus grants, redeploys via SNAPSHOT, and a 3-probe OAuth end-to-end confirms the chat path works.

This will involve the following steps:

- **Load the skills** — read the proxy and agent-app skills by their full `skill_ref_root`-prefixed paths.
- **Author the proxy and grants** — write the `server.extend()` proxy under `<APP_ROOT>` (files only).
- **Redeploy and probe** — redeploy via SDK SNAPSHOT, then run the 3-probe OAuth end-to-end.

The steps below are the prescriptive runbook for those actions; follow them in order.

**Genie Code — this is a prescriptive runbook. Follow the steps in order. Do NOT improvise paths, do NOT use bare relative paths, do NOT use `@`-mentions, and do NOT run the bash test script or open localhost. The `server.extend()` proxy is authored under `<APP_ROOT>`; the AppKit app redeploys via the SDK SNAPSHOT call; the 3-probe e2e runs through the 3-hop OAuth `requests.Session()`.**

### 🔴 Non-negotiable execution rules (read before anything)

❌ **NEVER run `bash …/test-agent-app-proxy.sh` and NEVER open `http://localhost:8000`.** Genie Code has no local Node toolchain and the script's `curl + databricks auth token` is hard-blocked. Run the 3 probes via the 3-hop OAuth `requests.Session()` against the DEPLOYED AppKit + Agent App URLs (`genie-code-environment` §7 / `app-verification.md`).

❌ **DO NOT rely on `databricks apps deploy` via `runDatabricksCli`** for the AppKit host — use the SDK SNAPSHOT call (`w.apps.deploy(..., mode=SNAPSHOT)`); the Node/Vite build runs server-side.

✅ The things you run directly are (a) authoring the proxy + `databricks.yml`/`app.yaml` edits under `<APP_ROOT>`, (b) the SDK SNAPSHOT redeploy via `executeCode`, and (c) the 3-hop OAuth 3-probe e2e.

### Step 0 — Resolve your environment (once, before anything else)

Run `skills/vibecoding-state` operation `enter` with `prompt_id: "appkit_agent_app_proxy_chat"` and `require_prior_gate: {prompt_id: "track_a_agent_eval_deploy", gate: "Agent App RUNNING"}`. Read these resolved values and use them literally:

- `client_context` = `genie_code`
- `artifact_root` = your workshop project root (e.g. `/Workspace/Users/<your-email>/vibe-coding-workshop`) — where all generated bundles/apps/docs build; the repo itself is cloned at `/Workspace/Users/<your-email>/.assistant/skills/vibe-coding-workshop` (skills load from there via `skill_ref_root`, NOT from `artifact_root`)
- `skill_ref_root` = `skills/vibe-coding-workshop` (substitute your clone folder if different)
- `app_root` = `<artifact_root>/{app_name}` — the top-level AppKit app dir (NOT under `apps_lakebase/`). Referred to below as `<APP_ROOT>`.
- `app_deploy.verb` = `apps deploy` (resolves to the SDK SNAPSHOT call on Genie Code)
- `{agent_app_name}`, `{agent_app_url}` = the separately-deployed Track A Agent App's name + URL, from the `track_a_agent_eval_deploy` `exit` capture in `.vibecoding-state.md` (the proxy declares `{agent_app_name}` as the `agent-backend` `CAN_USE` resource and binds `AGENT_APP_URL` to `{agent_app_url}`)
- Workspace: `{workspace_url}`

**First:** read `<APP_ROOT>/.vibecoding-state.md` (full `<artifact_root>`-anchored path) for `APP_NAME`, Lakebase values, and `agent_app_url`/`agent_app_name`. If `enter` reports the Agent App gate is unmet, STOP.

### Step 1 — Load the required skills by their FULL `skill_ref_root`-prefixed paths

Load each with `readSkillFile` using its `<skill_ref_root>`-prefixed path — NEVER a bare `@…` mention. **The root-level `skills/` come FIRST as the highest-priority guardrails.**

1. `readSkillFile("skills/vibe-coding-workshop/skills/genie-code-environment/SKILL.md")` — §4 (server-side build) + §7 (deployed-app OAuth). Loading this flips the manifest-load gate.
2. `readSkillFile("skills/vibe-coding-workshop/apps_lakebase/skills/06d-appkit-agent-app-proxy/SKILL.md")` — the vanilla `server.extend()` proxy with SP + OBO and dual-format streaming. **Replace its `bash …/test-agent-app-proxy.sh` verification with the OAuth 3-probe e2e in Step 3.**
3. `readSkillFile("skills/vibe-coding-workshop/skills/genie-code-environment/references/app-verification.md")` — the reusable 3-hop OAuth `requests.Session()` snippet.

Load every further reference the skills name the same way (prefix with `skill_ref_root`). `AGENTS.md` root context does not carry across Genie Code threads.

### Step 2 — Author the proxy + grants under `<APP_ROOT>` (write files only)

- Patch `<APP_ROOT>/databricks.yml` to declare the Agent App as a `CAN_USE` resource named `agent-backend`.
- Patch `<APP_ROOT>/app.yaml` to bind `AGENT_APP_URL` via `valueFrom: agent-backend`.
- Add the `server.extend()` `POST /api/chat` proxy that forwards `x-forwarded-access-token` verbatim and bridges the Agent-App SSE into the AppKit chat-page format.
- Mount the AppKit chat React page at `/chat` consuming the proxy stream.

### Step 3 — Redeploy via SDK SNAPSHOT, then run the 3-probe e2e (OAuth)

1. Redeploy the AppKit app: `w.apps.deploy(<app_name>, AppDeployment(source_code_path="<APP_ROOT>", mode=AppDeploymentMode.SNAPSHOT))`; poll to `SUCCEEDED`, compute `ACTIVE`.
2. 3-probe e2e via the 3-hop OAuth `requests.Session()` (no bash, no localhost):
   - **Direct agent** — POST a question to `<agent_app_url>/invocations`; expect 200 + agent response.
   - **AppKit SP-only** — call `/api/chat` WITHOUT forwarding the user token; this probe catches a missing-OBO bug.
   - **AppKit with forwarded OBO** — call `/api/chat` with the user's OBO token forwarded; expect a streamed answer with the user's identity.

**State-lock:** this prompt runs between an `enter` (Step 0) and an `exit`. After the gate passes, run `skills/vibecoding-state` op `exit` — params: `prompt_id: "appkit_agent_app_proxy_chat"`, `gate: "AppKit ↔ Agent App proxy live"`. **This `enter`/`exit` pair is a mandatory ritual, not advisory.** Step 0's `enter` MUST locate — or, if this is the first prompt of the track, bootstrap-create — the canonical live state file at `<app_root>/.vibecoding-state.md` (never the temporary `example/…` bootstrap path). The closing `exit` MUST append this prompt's Per-Step Log entry, Gate result, and `captured` vars to that file, then **re-read it and echo the appended section to prove the write landed**. **Gate completion rule:** this prompt is NOT complete until that re-read confirms the appended entry — the chat summary is NOT the state store.

**Gate:** `AppKit ↔ Agent App proxy live` — `/chat` streams chat against the Agent App with OBO forwarding; all three probes pass via the 3-hop OAuth session against the DEPLOYED URLs. NO bash test script, NO `curl`+`auth token`, NO localhost check was used.
```

---

## Phase 3 / AppKit Integration — Chatbot Feedback → MLflow Trace Assessments (Expert-in-the-Loop, End-User)

| Field | Value |
|-------|-------|
| `input_id` | `208` |
| `section_tag` | `appkit_chat_feedback_mlflow` |
| `order_number` | `48` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Chat history sidebar + thumbs up/down captured as MLflow user_feedback assessments (HUMAN source)_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Add end-user feedback (👍 / 👎 + optional comment) on each chat response in the AppKit dashboard `{app_name}`, persisting every click as an MLflow trace `Assessment` (`user_feedback`, `source_type=HUMAN`) on the originating Agent App `{agent_app_name}` trace. This is the end-user EITL (Evaluator In The Loop) entry point: today there is no thumb / comment surface; after this prompt runs, chat history is persisted in Lakebase (`{lakebase_host}`), the AppKit chat page exposes thumb controls, the Agent App's `/feedback` endpoint calls `mlflow.log_feedback(...)`, and the new feedback experiment lives at `{mlflow_feedback_experiment_path}`.

**Feedback experiment-path derivation (REQUIRED — do not deviate).** `{mlflow_feedback_experiment_path}` MUST be `/Users/<user_email>/mlflow/{user_app_name}-feedback`, where `<user_email>` is the operator's email (read from `Global Variables.User email` in `.vibecoding-state.md`) and `{user_app_name}` is the same `${FIRSTNAME}-${LASTINITIAL}-${use_case_slug}` identity that backs `APP_NAME` (e.g. `/Users/jane.doe@example.com/mlflow/jane-d-stayfinder-feedback`). This guarantees concurrent attendees on a shared workspace cannot collide on a single feedback experiment, and the MLflow UI never lists a generic `Default` / `Tracing` / `feedback` / `my-app-feedback` entry. Read the pinned value from `state://Resources.mlflow_feedback_experiment_path` if `vibecoding-state.migrate_canonical` has already populated it (it should have, at the same prompt that resolved `$APP_NAME`); otherwise derive it here using the formula above and capture the resolved path back into state. Forbidden leaves (HARD STOP if encountered): `feedback`, `Feedback`, `Default`, `my-app-feedback`, `/Shared/feedback`, `/Shared/my-app-feedback`, or any leaf not suffixed with `{user_app_name}-feedback`.

This will involve the following steps:

- **Add the chat history sidebar** — install OBO-scoped Lakebase chat persistence + sidebar navigation with ephemeral fallback when Lakebase is unreachable
- **Plumb the `trace_id`** — return `trace_id` from `@invoke` and emit a final `{type: "done", trace_id}` SSE event from `@stream` so the chat page can anchor feedback to the right trace
- **Expose `/feedback` on the Agent App** — wire the route that calls `mlflow.log_feedback(...)` with `Assessment(name="user_feedback", source_type="HUMAN", source_id=<user email via OBO>)`
- **Wire the thumb controls** — add 👍 / 👎 buttons to the AppKit chat page that POST `{trace_id, value, dimension}` through the existing `/api/chat` proxy
- **Persist feedback as MLflow assessments** — write to `{mlflow_feedback_experiment_path}` so end-user signal joins the same monitoring + dataset pipeline as SME labels and continuous-eval scorers
- **Smoke-test the round-trip + idle** — send a turn, click 👎, refresh the trace, then wait 3–5 min idle and re-test to confirm wake-up resilience

This prompt assumes the canonical two-app path: AppKit `/api/chat` → Agent App `/invocations` → MLflow trace. Do not switch to the legacy Serving plugin path.

**First:** Read `$APP_ROOT/.vibecoding-state.md` if it exists — it contains the AppKit app identity (`APP_NAME`) and Lakebase values from prior phases.

**How this prompt chains with the prior step (skill invocations):**

**Invoke skills (in order):**

1. `skills/vibecoding-state` op `enter` — params: `prompt_id: "appkit_chat_feedback_mlflow"`, `require_prior_gate: {prompt_id: "appkit_agent_app_proxy_chat", gate: "AppKit ↔ Agent App proxy live"}`.
2. @apps_lakebase/skills/07-appkit-chat-history/SKILL.md — params:
   - `app_dir: "$APP_ROOT"` (= `<artifact_root>/<app_name>`, the top-level AppKit app dir)
   - `lakebase_host: "{lakebase_host}"`
   - `sidebar_enabled: true`
   - `navigation: "by_conversation"`
   - `identity: "OBO"`
   - `auto_title: true`
   - `ephemeral_fallback: true`
   - `streaming_proxy: "two-app-agent-proxy"` (proxy route streams via `/api/chat` from `06d-appkit-agent-app-proxy`, forwards OBO to the Agent App, persists messages, and captures MLflow `trace_id` for feedback linking)
3. @genai-agents/sdlc/04c-end-user-feedback/SKILL.md — params:
   - `agent_app_dir: "$AGENT_APP_ROOT"` (= `<artifact_root>/<agent_app_name>`, the top-level Track A agent app dir)
   - `feedback_route: "/feedback"`
   - `trace_id_source: "invoke_response_field"` (return `trace_id` from `@invoke`; for `@stream` send a final `{type: "done", trace_id}` SSE event)
   - `assessment_name: "user_feedback"`
   - `source_type: "HUMAN"`
   - `user_id_resolver: "OBO"`
   - `dimensions: ["accuracy", "helpfulness", "relevance"]`
   - `support_update_delete: true`
   - Owns the **Python `mlflow.log_feedback(...)` write-path** in the Track A Agent App.
4. @apps_lakebase/skills/08-appkit-feedback/SKILL.md — params:
   - `app_dir: "$APP_ROOT"` (= `<artifact_root>/<app_name>`, the top-level AppKit app dir)
   - `mlflow_feedback_experiment_name: "{mlflow_feedback_experiment_path}"`
   - `mlflow_api: "Assessments"`
   - `auth: "client.config.authenticate()"`
   - `controls: ["thumbs_up", "thumbs_down"]`
   - `link_to_mlflow_traces: true`
   - `python_contract: "genai-agents/sdlc/04c-end-user-feedback"`
   - `capture_into_state: ["mlflow_feedback_experiment_path"]`
5. **Inline steps:** `databricks experiments create --name "{mlflow_feedback_experiment_path}"` (capture path), then deploy and run E2E including idle resilience (wait 3–5 min then re-test). Verify the round-trip: send a chat turn, click 👎, refresh the trace in the MLflow UI and confirm the `user_feedback=false` assessment with `source_type=HUMAN, source_id=<your email>` is attached.
6. `skills/vibecoding-state` op `exit` — params: `prompt_id: "appkit_chat_feedback_mlflow"`, `gate: "Deployed + idle resilience passed + 04c round-trip verified"`, `captured: {mlflow_feedback_experiment_path}`.

**Gate:** `Deployed + idle resilience passed + 04c round-trip verified` — sidebar + history works; thumbs-up/down linked to MLflow traces via `mlflow.log_feedback(...)` from the Track A Agent App; an end-to-end 👎 round-trip shows up in the MLflow trace UI; the app survives 3–5 min idle.
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## 1️⃣ How To Apply

Open a **new Agent thread in your Coding Assistant** and paste the prompt above. This is the user-facing landing of the **expert-in-the-loop phase** — every end-user thumbs click becomes a `user_feedback` assessment (`source_type=HUMAN`) on the underlying MLflow trace, feeding the same monitoring + dataset pipeline as SME labels from `mlflow_agent_human_review`.

### Prerequisite
- `AppKit ↔ Agent App proxy live` gate captured in state
- Lakebase project provisioned (chat history persistence)
- `agent_app_name` captured in state

### Steps to Apply
1. New thread in your Coding Assistant, paste prompt.
2. AI installs `07-appkit-chat-history` (sidebar + per-conversation navigation + OBO identity + ephemeral fallback).
3. AI installs `04c-end-user-feedback` on the Agent App side: returns `trace_id` from `@invoke`, emits a final `{type: "done", trace_id}` SSE event from `@stream`, exposes `/feedback` REST endpoint that calls `mlflow.log_feedback(...)`.
4. AI installs `08-appkit-feedback` on the AppKit side: thumbs up/down controls bound to the `/feedback` REST endpoint with the matching contract.
5. AI creates the `{mlflow_feedback_experiment_path}` experiment and runs the 👎 round-trip verification.

---

## 2️⃣ What Are We Building?

We are turning every end-user thumbs click in the AppKit chat into an MLflow trace assessment so end-user signal lands in the **same** dataset pipeline that SME labels (Skill 53) and continuous-eval (Skill 56) feed off. The key plumbing is the `trace_id`: `@invoke` returns it in the response body; `@stream` emits a final `{type: "done", trace_id}` SSE event. The chat page captures it per turn and attaches it to the feedback POST. The proxy forwards OBO; the Agent App calls `mlflow.log_feedback(...)`.

```
@invoke returns trace_id        @stream emits {type:"done", trace_id} as final SSE event
            │                                          │
            └────────────────────┬─────────────────────┘
                                 ▼
            AppKit chat page captures trace_id per turn
                                 │
        User clicks thumbs-down  ▼
            │            POST /api/feedback
            ▼              { trace_id, value: false,
                             dimension: "accuracy" | "helpfulness" | "relevance" }
            │                    │
            ▼                    ▼
            Proxy forwards x-forwarded-access-token
                                 │
                                 ▼
                  Agent App /feedback endpoint
                                 │
                                 ▼
                  mlflow.log_feedback(
                      trace_id=trace_id,
                      assessment=Assessment(name="user_feedback",
                                           value=False,
                                           source=AssessmentSource(
                                               source_type="HUMAN",
                                               source_id=user_email)))
                                 │
                                 ▼
                  MLflow trace UI shows assessment
                  (joins benchmark + monitoring pipelines)
```

### Key Concepts

| Concept | What It Means | Why It Matters |
|---------|---------------|----------------|
| **`user_feedback` assessment** | An MLflow `Assessment` named `user_feedback` with a boolean value | Same schema as SME labels; both sources roll up in dataset / monitoring queries |
| **`source_type=HUMAN`** | Provenance flag that distinguishes humans from judges | End-user clicks are weighted alongside SME labels, not against scorer means |
| **`trace_id` plumbing** | Returned from `@invoke`, emitted in the final `done` SSE event from `@stream` | Without it the feedback row has no anchor — it cannot join MLflow trace tables |
| **Lakebase chat history** | OBO-scoped conversation persistence with ephemeral fallback | Survives app restarts; falls back to in-memory if Lakebase is unreachable |
| **`mlflow.log_feedback(...)`** | Python API that writes an `Assessment` to a trace | Owned by Skill `04c-end-user-feedback` on the **agent-app side**; AppKit only POSTs |
| **Idle resilience** | App survives 3-5 min idle and re-tests cleanly | Databricks Apps spin down when idle; the round-trip test must wake them and re-pass |

---

## 3️⃣ Why Are We Building It This Way? (Databricks Best Practices)

| Practice | How It's Used Here |
|----------|--------------------|
| **`source_type=HUMAN` for end-user signal** | End-user feedback joins SME labels in the same MLflow trace-assessment schema; both feed continuous-eval and dataset growth — there is no second pipeline to maintain. |
| **`trace_id` plumbing** | `@invoke` returns `trace_id` in the response; `@stream` emits a final `{type: "done", trace_id}` SSE event so the front-end can attach feedback to the right trace. No magic correlation. |
| **Idle resilience matters** | Databricks Apps idle after 3-5 min; the round-trip test must include an idle period and re-test to catch wake-up bugs that only manifest after cold start. |
| **Lakebase for chat history** | Conversations persist OBO-scoped in Lakebase; ephemeral fallback if Lakebase is unreachable so the chat does not hard-fail on a dependency hiccup. |
| **Two endpoints, one contract** | `04c-end-user-feedback` owns the Python `mlflow.log_feedback(...)` write; `08-appkit-feedback` owns the AppKit-side wiring; both bind to the same dimension list (`accuracy / helpfulness / relevance`). |

---

## 4️⃣ What Happens Behind the Scenes?

When you paste the prompt, the AI walks five sub-installs across two apps:

| Phase | What the AI Does | Where It Writes |
|-------|------------------|-----------------|
| 1. Chat history | Install `07-appkit-chat-history`: Lakebase persistence, OBO scoping, sidebar UI | AppKit app dir (`$APP_ROOT`) |
| 2. Agent feedback | Install `04c-end-user-feedback`: `/feedback` REST + `mlflow.log_feedback(...)` on every POST; emit final `done` SSE with `trace_id` | Agent app dir (`$AGENT_APP_ROOT`) |
| 3. AppKit feedback | Install `08-appkit-feedback`: thumbs up/down controls bound to the `/feedback` route; capture `trace_id` per turn | AppKit chat page |
| 4. Experiment | Create `{mlflow_feedback_experiment_path}` and capture path into state | MLflow experiment + state file |
| 5. Round-trip + idle | Send a turn, click thumbs-down, refresh trace, wait 3-5 min idle, re-test | Verification log before gate exit |

### Gate Contract

| Reads gate | Produces gate | Captured state |
|------------|---------------|----------------|
| `AppKit ↔ Agent App proxy live` (from `appkit_agent_app_proxy_chat`) | `Deployed + idle resilience passed + 04c round-trip verified` | `mlflow_feedback_experiment_path`; one `user_feedback` assessment with `source_type=HUMAN` visible on a trace |

</details>

<details><summary><strong>Expected Output</strong></summary>

### Resources Created
- [ ] Chat history sidebar live; conversations persisted in Lakebase
- [ ] `/feedback` REST endpoint on the Agent App invokes `mlflow.log_feedback(...)`
- [ ] AppKit thumbs-up/down controls wired to `/feedback`
- [ ] MLflow experiment at `{mlflow_feedback_experiment_path}` created
- [ ] At least one `user_feedback` assessment visible in the MLflow trace UI with `source_type=HUMAN`
- [ ] App passes 3–5 minute idle resilience re-test

</details>

#### Fork — `coding_assistant = genie-code`  (input_id 919)

> Fork rows override only `input_template`, `system_prompt`, and `bypass_llm`. All display fields are inherited from the default row above.

| Field | Value |
|-------|-------|
| `input_id` | `919` |
| `section_tag` | `appkit_chat_feedback_mlflow` |
| `order_number` | `(inherited)` |
| `coding_assistant` | `genie-code` |
| `bypass_llm` | `true` |

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Persist chat history and wire thumbs feedback to MLflow. Before this step chats are ephemeral; after it, `<APP_ROOT>` stores conversations and a `/feedback` write-path (under the agent app) logs thumbs as MLflow assessments — verified end-to-end over OAuth.

This will involve the following steps:

- **Load the skills** — read the chat-history and feedback skills by their full `skill_ref_root`-prefixed paths.
- **Author chat history and feedback** — write the persistence and feedback code (files only).
- **Redeploy and verify** — redeploy both hosts via SDK SNAPSHOT, then verify over OAuth.

The steps below are the prescriptive runbook for those actions; follow them in order.

**Genie Code — this is a prescriptive runbook. Follow the steps in order. Do NOT improvise paths, do NOT use bare relative paths, do NOT use `@`-mentions, and do NOT open localhost. AppKit chat history + thumbs feedback are authored under `<APP_ROOT>`; the agent's `/feedback` write-path under `<AGENT_APP_ROOT>`; redeploy via the SDK SNAPSHOT call; verify through the 3-hop OAuth session.**

### 🔴 Non-negotiable execution rules (read before anything)

❌ **NEVER open `http://localhost:8000` and NEVER `curl`+`databricks auth token`.** Verify the feedback round-trip through the 3-hop OAuth `requests.Session()` against the DEPLOYED AppKit URL, and inspect MLflow assessments via `executeCode` (`genie-code-environment` §7).

❌ **DO NOT rely on `databricks apps deploy` via `runDatabricksCli`** for either host — use the SDK SNAPSHOT call; builds run server-side.

✅ The things you run directly are (a) authoring the chat-history/feedback code under `<APP_ROOT>` and the agent `/feedback` path under `<AGENT_APP_ROOT>`, (b) SDK SNAPSHOT redeploys, and (c) the OAuth round-trip + MLflow assessment check.

### Step 0 — Resolve your environment (once, before anything else)

Run `skills/vibecoding-state` operation `enter` with `prompt_id: "appkit_chat_feedback_mlflow"` and `require_prior_gate: {prompt_id: "appkit_agent_app_proxy_chat", gate: "AppKit ↔ Agent App proxy live"}`. Read these resolved values and use them literally:

- `client_context` = `genie_code`
- `artifact_root` = your workshop project root (e.g. `/Workspace/Users/<your-email>/vibe-coding-workshop`) — where all generated bundles/apps/docs build; the repo itself is cloned at `/Workspace/Users/<your-email>/.assistant/skills/vibe-coding-workshop` (skills load from there via `skill_ref_root`, NOT from `artifact_root`)
- `skill_ref_root` = `skills/vibe-coding-workshop` (substitute your clone folder if different)
- `app_root` = `<artifact_root>/{app_name}` — the top-level AppKit app dir. Referred to below as `<APP_ROOT>`.
- `agent_app_root` = `<artifact_root>/{agent_app_name}` — the top-level Track A agent app dir. Referred to below as `<AGENT_APP_ROOT>`.
- `lakebase_host` = `{lakebase_host}`; `mlflow_feedback_experiment_path` = `{mlflow_feedback_experiment_path}` — MUST be `/Users/<user_email>/mlflow/{user_app_name}-feedback` (the same `${FIRSTNAME}-${LASTINITIAL}-${use_case_slug}` identity that backs `APP_NAME`), so concurrent attendees never collide; HARD STOP on a generic leaf like `feedback` / `Default` / `my-app-feedback`
- Workspace: `{workspace_url}`

**First:** read `<APP_ROOT>/.vibecoding-state.md` for `APP_NAME` + Lakebase values. If `enter` reports the prior gate is unmet, STOP.

### Step 1 — Load the required skills by their FULL `skill_ref_root`-prefixed paths

Load each with `readSkillFile` using its `<skill_ref_root>`-prefixed path — NEVER a bare `@…` mention. **The root-level `skills/` come FIRST as the highest-priority guardrails.**

1. `readSkillFile("skills/vibe-coding-workshop/skills/genie-code-environment/SKILL.md")` — §4 (server-side build) + §7 (deployed-app OAuth). Loading this flips the manifest-load gate.
2. `readSkillFile("skills/vibe-coding-workshop/apps_lakebase/skills/07-appkit-chat-history/SKILL.md")` — Lakebase chat persistence, OBO scoping, sidebar UI (authored under `<APP_ROOT>`).
3. `readSkillFile("skills/vibe-coding-workshop/genai-agents/sdlc/04c-end-user-feedback/SKILL.md")` — the Python `mlflow.log_feedback(...)` write-path + `/feedback` route in the Agent App (authored under `<AGENT_APP_ROOT>`); return `trace_id` from `@invoke`, final `{type:"done", trace_id}` SSE from `@stream`.
4. `readSkillFile("skills/vibe-coding-workshop/apps_lakebase/skills/08-appkit-feedback/SKILL.md")` — thumbs up/down controls bound to `/feedback` + MLflow Assessments (authored under `<APP_ROOT>`); auth via `client.config.authenticate()`.
5. `readSkillFile("skills/vibe-coding-workshop/skills/genie-code-environment/references/app-verification.md")` — the 3-hop OAuth `requests.Session()` snippet.

Load every further reference the skills name the same way (prefix with `skill_ref_root`). `AGENTS.md` root context does not carry across Genie Code threads.

### Step 2 — Author chat history + feedback (write files only)

- Under `<APP_ROOT>`: Lakebase-backed chat history (per-conversation sidebar, OBO-scoped, auto-title, ephemeral fallback); thumbs up/down controls capturing `trace_id` per turn and writing MLflow Assessments to `{mlflow_feedback_experiment_path}`.
- Under `<AGENT_APP_ROOT>`: the `/feedback` REST route that calls `mlflow.log_feedback(...)` on every POST and emits the final `done` SSE with `trace_id`.
- Create the MLflow feedback experiment `{mlflow_feedback_experiment_path}` and capture its path into state.

### Step 3 — Redeploy both hosts via SDK SNAPSHOT, then verify (OAuth)

1. Redeploy the AppKit app (`w.apps.deploy(<app_name>, AppDeployment(source_code_path="<APP_ROOT>", mode=SNAPSHOT))`) and, if the agent `/feedback` path changed, the agent app (`source_code_path="<AGENT_APP_ROOT>"`). Poll each to `SUCCEEDED`, compute `ACTIVE`.
2. Through the 3-hop OAuth `requests.Session()`: send a chat turn, click thumbs-down (POST `/feedback`), then confirm via `executeCode` that an MLflow Assessment row appears for that `trace_id` at `{mlflow_feedback_experiment_path}`. Wait 3-5 min idle and re-test to confirm persistence.

**State-lock:** this prompt runs between an `enter` (Step 0) and an `exit`. After the gate passes, run `skills/vibecoding-state` op `exit` — params: `prompt_id: "appkit_chat_feedback_mlflow"`, `gate: "Deployed + idle resilience passed + 04c round-trip verified"`, `captured: {mlflow_feedback_experiment_path}`. **This `enter`/`exit` pair is a mandatory ritual, not advisory.** Step 0's `enter` MUST locate — or, if this is the first prompt of the track, bootstrap-create — the canonical live state file at `<app_root>/.vibecoding-state.md` (never the temporary `example/…` bootstrap path). The closing `exit` MUST append this prompt's Per-Step Log entry, Gate result, and `captured` vars to that file, then **re-read it and echo the appended section to prove the write landed**. **Gate completion rule:** this prompt is NOT complete until that re-read confirms the appended entry — the chat summary is NOT the state store.

**Gate:** `Deployed + idle resilience passed + 04c round-trip verified` — sidebar + history works; thumbs up/down linked to MLflow traces via `mlflow.log_feedback(...)` from the Track A Agent App; an end-to-end 👎 round-trip shows up in the MLflow trace UI (verified through the 3-hop OAuth session against the DEPLOYED URL); the app survives 3-5 min idle. NO localhost check, NO `curl`+`auth token`.
```

---
