# Refinement & Clean Up

Iterate and enhance the app, redeploy & test, tear down workspace resources, plus the catch-all default prompt.

> Auto-generated from `02_seed_section_input_prompts.sql`. Each section below corresponds to one `section_tag` in the workshop builder's `section_input_prompts` table.

## Sections in this category

| Step (order) | Section | `section_tag` | Forks |
|---|---|---|---|
| 18 | [Iterate & Enhance App](#iterate-enhance-app) | `iterate_enhance` | — |
| 19 | [Redeploy & Test Application](#redeploy-test-application) | `redeploy_test` | — |
| 31 | [Workspace Clean Up](#workspace-clean-up) | `workspace_cleanup` | — |
| 99 | [Default Section](#default-section) | `default` | — |

---

## Iterate & Enhance App

| Field | Value |
|-------|-------|
| `input_id` | `14` |
| `section_tag` | `iterate_enhance` |
| `order_number` | `18` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `(default)` |

_Iterate on the application to add new features, update functionality, and improve user experience_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Iterate and enhance the application based on user feedback and business needs.

---

## Potential Enhancements

Review the current application and identify areas for improvement:

### UI/UX Improvements
- Dark mode support
- Better visualizations and charts
- Improved navigation and user flows
- Mobile responsiveness
- Accessibility improvements

### Data Features
- Additional filters and search capabilities
- Data export functionality (CSV, Excel, PDF)
- Saved views and bookmarks
- Custom dashboards per user

### Agent Enhancements
- Additional tools and capabilities
- Conversation history and context
- Multi-turn conversations
- Integration with more data sources

### Performance Optimizations
- Query caching strategies
- Pagination for large datasets
- Lazy loading for UI components
- Database query optimization

### Integration Enhancements
- Additional data source connections
- External API integrations
- Webhook notifications
- SSO/authentication improvements

---

## Iteration Process

### Step 1: Gather User Feedback
- Conduct user interviews
- Review usage analytics
- Collect feature requests
- Identify pain points

### Step 2: Prioritize Enhancements
Use MoSCoW method:
- **Must Have**: Critical for user success
- **Should Have**: Important but not critical
- **Could Have**: Nice to have
- **Won't Have**: Out of scope for now

### Step 3: Plan Implementation
- Break down into sprints
- Estimate effort for each enhancement
- Identify dependencies
- Create implementation tickets

### Step 4: Implement Changes
- Work on one enhancement at a time
- Write tests for new features
- Document changes
- Review code before merging

### Step 5: Test and Validate
- Unit tests for new functionality
- Integration tests for workflows
- User acceptance testing
- Performance testing

### Step 6: Deploy and Monitor
- Deploy to staging first
- Validate in staging environment
- Deploy to production
- Monitor for issues

---

## Industry Context
Industry: {industry}
Use Case: {use_case}

Review the current implementation and identify enhancements specific to the {industry} {use_case} use case.

---

## Output contract for the next step (Redeploy & Test)

End your generated plan with these four sections, exactly named, so Step 21 (Redeploy & Test) can consume them programmatically. Step 21 receives this entire plan as `{iteration_plan}` and looks for these section headings verbatim — do not rename, reorder, or merge them.

### Change Manifest
List every file path, API endpoint, database table, env var, secret, config key, and gate (feature flag, Lakebase visibility row, per-assistant fork, env-driven toggle) you propose to touch, grouped by enhancement. Include for each: the enhancement name, the artifact, and a one-line "why" so the Step 21 reviewer can sanity-check the diff against this manifest before deploying.

### Smoke Tests (per enhancement)
For each enhancement, write 1–3 given / when / then steps a human can execute in under 5 minutes to prove the new behavior works. Each test must specify the gate state required (default vs target) and the observable signal (HTTP status, JSON field, log line, UI element). If the enhancement has no observable signal, redesign it before listing it here.

### Regression-Risk Surface
Call out any "preserves pre-existing behavior" guarantee — i.e., a code path you intend to leave behaviorally unchanged even though the file containing it was touched. For each, name the call site, the input that exercises the unchanged path, and the expected output. Step 21 re-verifies these explicitly. Leave the section heading present with the text "None." if there are no such guarantees.

### Migrations / Order of Operations
Ordered list of schema changes, DDL, seed updates, env var changes, or permission grants that must run before the app code deploys. Each entry: the artifact (SQL file path, CLI command, or description), and the reason it must precede the app deploy. Leave the section heading present with the text "None." if there are no migrations.
```

**System Prompt:**

```
You are a product manager and developer specializing in iterative application development.
Generate a detailed, actionable prompt for enhancing the application based on user feedback.
Focus on:
- Identifying high-impact improvements
- Prioritizing based on user value
- Breaking down into manageable tasks
- Ensuring quality through testing
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## Prerequisite

**Run this in your cloned Template Repository** (see Prerequisites in Step 0). These prompts assume you are working in that codebase with a coding assistant enabled.

---

## Steps to Iterate and Enhance

### Step 1: Review Current State
```
@codebase What are the main features of this application? 
What areas could be improved?
```

### Step 2: Gather Feedback
- Review user feedback
- Analyze usage patterns
- Identify pain points

### Step 3: Prioritize Enhancements
- Use MoSCoW method
- Consider effort vs impact
- Plan sprint backlog

### Step 4: Implement Changes
- One enhancement at a time
- Write tests
- Document changes

### Step 5: Test and Deploy
- Run all tests
- Deploy to staging
- Validate and deploy to production

</details>

<details><summary><strong>Expected Output</strong></summary>

## Expected Enhancement Outcomes

### UI/UX Improvements
- [ ] Dark mode implemented
- [ ] Better visualizations
- [ ] Improved navigation

### Data Features
- [ ] Export functionality
- [ ] Advanced filters
- [ ] Saved views

### Performance
- [ ] Faster load times
- [ ] Optimized queries
- [ ] Better caching

### Documentation
- [ ] Updated user guide
- [ ] API documentation
- [ ] Release notes

</details>

---

## Redeploy & Test Application

| Field | Value |
|-------|-------|
| `input_id` | `15` |
| `section_tag` | `redeploy_test` |
| `order_number` | `19` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Deploy and verify only the iteration delta with a self-healing loop, then update docs and state file for the changed surface._

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

````
## Your Task

Deploy and verify **only the changes introduced in this iteration**. Self-heal on failure (max 3 attempts), document only the surface that changed, and update the project state file.

**First:** Read the iteration plan from Step 20 (delivered below as `{iteration_plan}`) — it tells you what changed, what to migrate, what to flag-gate, and what to verify. If `{iteration_plan}` is empty or contains a `[No iteration_plan provided ...]` placeholder, stop and return to Step 20 — there is nothing for this step to verify.

**Workspace:** `{workspace_url}`
**Profile:** `{databricks_cli_profile}`
**App name:** `{user_app_name}`

---

### Mandatory Reads

- The iteration plan (above) — change manifest, smoke tests, regression-risk surface, migrations
- The project deploy script if present (`./deploy.sh`, `scripts/deploy.sh`, `scripts/deploy.py`) — reuse it; do not write ad-hoc deploy commands
- `databricks.yml` and `app.yaml` — confirm target and env config
- `package.json` and `requirements.txt` — only if the iteration touched them
- The project state file (`.vibecoding-state.md` or equivalent) — append your results at the end

Use the autonomous operations skill at `@data_product_accelerator/skills/common/databricks-autonomous-operations/SKILL.md` for the deploy → poll → diagnose → fix → redeploy loop, and `@data_product_accelerator/skills/common/databricks-asset-bundles/SKILL.md` for any DAB validation.

---

### Steps

1. **Diff review.** Run `git diff --stat HEAD` and `git status --short`. Every changed file must appear in the iteration plan's **Change Manifest**. If `git diff` lists files that are NOT in the manifest, the plan is stale — stop and return to Step 20.

2. **Pick the deploy mode based on the manifest.**
   - **Code-only delta** (only files under `src/`, no changes to `databricks.yml` / `app.yaml` / `requirements.txt` / DAB resources): use the project's incremental path. If a `deploy.sh --code-only` exists, prefer it (e.g., `./scripts/deploy.sh --code-only -t <target>`). It builds the frontend, syncs files, and triggers a rolling app deploy without resetting permissions or re-seeding tables.
   - **Infra delta** (any of those touched, or new DAB jobs / pipelines / dashboards): full deploy. Validate first (`databricks bundle validate -t <target>`), then `./deploy.sh -t <target>` or `databricks bundle deploy -t <target>`. If validation fails, fix the YAML and re-validate before deploying.
   - **Mixed**: do migrations / DDL first (Step 3), then full deploy, then a code-only re-sync if needed.

3. **Run migrations or schema changes BEFORE app deploy.** If the iteration plan's **Migrations / Order of Operations** section lists anything, apply each item in order. Common patterns:
   - SQL files in the project (`db/**/*.sql`) — apply via `databricks sql --warehouse-id <id> --file <path>` or `psql` for Lakebase.
   - Setup script (`scripts/setup-lakebase.sh`, `scripts/migrate.sh`) — run it.
   - If a migration fails, the self-healing loop fixes the migration first (max 3 attempts). Do NOT deploy app code against a half-migrated database.

4. **Deploy.** Execute the chosen mode from Step 2. Watch for transient OAuth quota or "already exists" errors — most project deploy scripts already retry with cleanup; if not, follow the autonomous-operations skill's recovery patterns.

5. **Poll.**
   - For app-only iterations, poll `databricks apps get {user_app_name} --output json | jq -r .app_status.state` until `RUNNING`.
   - For DAB job/pipeline runs (only if the manifest lists them), poll `databricks jobs get-run <RUN_ID>` with 30s → 60s → 120s backoff until `TERMINATED`, then check `result_state`.

6. **On failure — diagnose.** For app failures: `databricks apps logs {user_app_name} --tail 200`. For job failures, use the **task** run_id, not the parent job run_id:
   ```
   databricks jobs get-run <JOB_RUN_ID> --output json \
     | jq '.tasks[] | select(.state.result_state == "FAILED") | {task: .task_key, run_id: .run_id, error: .state.state_message}'
   databricks jobs get-run-output <TASK_RUN_ID> --output json | jq -r '.notebook_output.result // .error'
   ```
   Apply fix → redeploy (Step 4) → re-poll (Step 5). Cap at 3 iterations. On the 4th failure, escalate with all errors, fixes attempted, and run page URLs.

7. **Verify the delta — not the whole app.** This is the part most teams get wrong. For each enhancement listed in `{iteration_plan}`:
   - Run its smoke tests (given / when / then) from the plan, exactly as written.
   - If the enhancement is gated (feature flag, env var, Lakebase visibility row, per-assistant fork, etc.), run with the gate at its **default state per the plan** first; verify pre-existing behavior is intact for cohorts that don't see the change. Then flip the gate to the target state for the target cohort and verify the new behavior.
   - If the enhancement appears under the plan's **Regression-Risk Surface** section, re-run the explicit "preserves pre-existing behavior" check the plan called out. **This is the only regression sweep — there is no broader one.**
   - Record PASS/FAIL with evidence (curl response, log line, screenshot path).
   - Any FAIL re-enters the self-healing loop in Step 6 — but targeting the *enhancement*, not the deploy.

   Once-per-deploy checks (run once, not per enhancement): `curl -fsS $APP_URL/api/health` returns 200, no ERROR-level lines in `databricks apps logs {user_app_name} --tail 200`.

   **Exit criteria:** every enhancement smoke test passes at the correct gate state, and `/api/health` is 200.

8. **Update docs for the changed surface only.** Use `@data_product_accelerator/skills/admin/documentation-organization/SKILL.md` in Framework Documentation Authoring mode, but scope the update to the change manifest:
   - For each entry in the manifest, find the matching page under the project's `docs/` and update only that page.
   - For new modules / endpoints / tables, generate a new page.
   - For gates introduced this iteration, append to the operations doc under "Active gates / flags" with default state, target cohort, and rollback action.
   - **Do not regenerate the whole `docs/` tree** — Framework Authoring mode supports targeted updates; use them.
   - Run organizational enforcement at the end: audit root for stray `.md` files, move misplaced docs, validate kebab-case naming.

9. **Close the loop on the state file.** Append to the project state file (`.vibecoding-state.md` or equivalent) with:
   - Step name (`## Redeploy & Test — <iteration label>`)
   - Deploy timestamp, target, app URL, run page URLs
   - Smoke test results per enhancement (PASS/FAIL with evidence)
   - Gates now live and their current state
   - Anything the self-healing loop had to fix (so the next iteration's Step 20 picks it up as a "watch this" item)

   The state file becomes the closed loop: the next time someone runs Step 20, they see what happened in the previous Step 21 before planning more changes.

---

### Common Errors

| Error | Fix |
|-------|-----|
| `{iteration_plan}` substitutes to empty or to `[No iteration_plan provided ...]` | Step 20 was not run, or its output was not chained. Run Step 20 first; the test tab and real workflow both pipe `stepPrompts[20]` as `previous_outputs.iteration_plan` automatically |
| `git diff` lists files NOT in the change manifest | Plan is stale. Stop and re-run Step 20 to refresh the manifest before deploying |
| App stuck in `UNAVAILABLE` after `--code-only` deploy | Run `databricks apps start {user_app_name}` then re-deploy code; most project scripts auto-recover this in 3 attempts |
| Bundle deploy hits OAuth quota (`QUOTA_EXCEEDED`, `1000 OAuth`) | Account-wide cap. Clean up stale apps via `databricks apps list` then retry. Most project deploy scripts include this recovery — read the script before improvising |
| Smoke test passes but `/api/health` is 200 with `source: "mock"` | The test was checking HTTP status, not envelope semantics. Re-run with `jq '.source'` and confirm `"live"`. Check `databricks apps logs {user_app_name} --tail 200 \| grep "falling back to mock"` for the masked exception |
| New endpoint in the manifest, but smoke test fails because old behavior is gone | The "preserves pre-existing behavior" guarantee was violated. Don't paper over — return to Step 20, fix the regression, re-run from Step 1 |

---

### Guardrails

- **Never deploy a fix you haven't smoke-tested.** Each iteration of the self-healing loop must end with a smoke test of the enhancement, not just a successful deploy.
- **Never expand scope inside this step.** If `{iteration_plan}` missed something, return to Step 20. Don't fix-while-you-go — that is how iteration plans drift from reality.
- **Never skip the close-the-loop append in Step 9.** The next Step 20 depends on it.
- **Don't re-seed Lakebase or re-run permission setup on a code-only delta.** Use the project's incremental path (`--code-only` or equivalent). Otherwise you reset SP roles, app resources, and tags for no reason.
- **Don't generate the whole `docs/` tree on every iteration.** Targeted updates only — anything else creates noisy diffs and reviewer fatigue.

---

### Done When

- [ ] `{iteration_plan}` was read; `git diff` matches its change manifest
- [ ] Migrations applied (or N/A) BEFORE app deploy
- [ ] Deploy succeeded (within 3 self-heal iterations) using the right mode for the delta
- [ ] Every enhancement smoke test PASSED at the correct gate state
- [ ] Regression-risk surface re-verified (only what the plan flagged)
- [ ] `/api/health` returns 200 (and `source: "live"` if the project uses envelope semantics)
- [ ] Docs updated for the changed surface only
- [ ] State file appended with deploy timestamp, smoke test results, gates live, fixes applied

**State-lock (`skills/vibecoding-state`) — run this prompt between an `enter` and an `exit` so workshop state is resolved and locked:**

1. **Phase 0 — first, before any step below:** `skills/vibecoding-state` op `enter` — params: `prompt_id: "redeploy_test"`. `enter` resolves the `## Environment Capabilities` triple (deploy verb, CLI channel, `state_file_root`) so every deploy/run step below uses the resolved channel — `runDatabricksCli` on Genie Code — and writes state under `state_file_root`, never a bare-local assumption.
2. **Final — after the step succeeds:** `skills/vibecoding-state` op `exit` — params: `prompt_id: "redeploy_test"`, `gate: "Redeployed + smoke passed"`, `captured: {user_app_name}`.

**Gate:** `Redeployed + smoke passed` — every enhancement smoke test passes and the once-per-deploy health checks pass.
````

**System Prompt:**

```
This prompt is returned as-is for direct use in Cursor/Copilot. No LLM processing.
```

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

## Prerequisite

Step 20 (Iterate & Enhance) must have run in this same session — Step 21 reads its output as `{iteration_plan}`. The plan must include the four named sections it emits in its "Output contract for the next step" block: **Change Manifest**, **Smoke Tests**, **Regression-Risk Surface**, **Migrations / Order of Operations**. If any are missing, return to Step 20 and complete it before running this step.

---

## Steps to Apply

1. **Copy the generated prompt** from above.
2. **Paste into your coding assistant** in your project repo (the codebase that the iteration plan describes).
3. The coding assistant will:
   - Read the iteration plan delivered as `{iteration_plan}`
   - Run `git diff --stat HEAD` against the Change Manifest to catch stale plans
   - Pick code-only or full deploy based on what the manifest touched
   - Apply migrations BEFORE app deploy (if any)
   - Run the project deploy script (`./deploy.sh`, `./scripts/deploy.sh`) — preferring `--code-only` for code-only deltas
   - Self-heal failures (max 3 iterations) via the autonomous-operations skill
   - Verify ONLY the enhancements listed in the plan, at the correct gate state
   - Update docs only for the changed surface
   - Append results back to the project state file (`.vibecoding-state.md` or equivalent)

**Note:** This step verifies the iteration delta — not the whole app. The smoke tests come from the iteration plan, not from a generic checklist. If you want a full app health sweep, run a separate end-to-end verification step.

---

## What Happens Behind the Scenes

The coding assistant reads three skills as needed:

| Skill | Role |
|-------|------|
| `databricks-autonomous-operations` | Self-healing deploy loop with task-level diagnostics |
| `databricks-asset-bundles` | DAB validation patterns (only used if the manifest touched DAB resources) |
| `documentation-organization` (Framework Authoring mode) | Targeted doc updates for the changed surface |

The deploy mode is chosen automatically from the manifest:

| Manifest contains | Mode |
|---|---|
| Only `src/**` changes | Code-only (`./deploy.sh --code-only` or equivalent) |
| Any of `databricks.yml`, `app.yaml`, `requirements.txt`, or DAB resources | Full deploy (`./deploy.sh` or `databricks bundle deploy`) |
| Both | Migrations first, then full deploy, then code-only re-sync |

---

## Why this is different from a generic redeploy

A generic "redeploy and test" runs the same checklist regardless of what changed. That is a recipe for deploying a regression and never noticing — the `/api/health` endpoint will pass even if dark mode broke or the auth flow stopped working.

Step 21 is delta-driven: every smoke test traces back to a specific enhancement in the iteration plan. If an enhancement has no smoke test, the plan is incomplete and you return to Step 20. If `git diff` shows a file the plan didn't mention, the plan is stale and you return to Step 20. The seam between iteration and verification is enforced, not assumed.

---

## Architecture: Step 20 → Step 21 Handoff

```
┌──────────────────────────────────────────────────────────────────────────┐
│  STEP 20: Iterate & Enhance                                              │
│  LLM generates an iteration plan with 4 named sections:                  │
│    Change Manifest | Smoke Tests | Regression-Risk Surface | Migrations  │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ stepPrompts[20]
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Workshop chain: previous_outputs.iteration_plan = stepPrompts[20]       │
│  Substituted into Step 21's prompt as {iteration_plan} verbatim.         │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  STEP 21: Redeploy & Test                                                │
│    1. Read {iteration_plan}                                              │
│    2. Diff review vs Change Manifest                                     │
│    3. Migrations BEFORE app deploy                                       │
│    4-6. Deploy + poll + self-heal (max 3 iters)                          │
│    7. Smoke test EACH enhancement at correct gate state                  │
│    8. Update only changed-surface docs                                   │
│    9. Append results to project state file                               │
└──────────────────────────────────────────────────────────────────────────┘
```

The append in Step 9 closes the loop — the *next* Step 20 reads the previous Step 21's outcome before planning more changes.

</details>

<details><summary><strong>Expected Output</strong></summary>

## Expected Deliverables

### Self-Healing Loop Tracking

| Iteration | Failure | Fix Applied | Outcome |
|-----------|---------|-------------|---------|
| 1 | (recorded from diagnosis) | (what was changed) | FAIL / SUCCESS |
| 2 | (recorded from diagnosis) | (what was changed) | FAIL / SUCCESS |
| 3 | (recorded from diagnosis) | (what was changed) | FAIL / ESCALATE |

If your loop terminates at iteration 1 with SUCCESS, ignore rows 2 and 3. If you reach iteration 3 with FAIL, escalate to the user with this table populated, the run page URLs, and the section of `{iteration_plan}` that triggered the failure.

---

### Per-Enhancement Smoke Test Results

For each enhancement in `{iteration_plan}`, record:

| Enhancement | Gate state tested | Smoke test | PASS / FAIL | Evidence |
|---|---|---|---|---|
| (from plan) | default / target | (given/when/then) | PASS or FAIL | curl output, log line, screenshot path |

Every row must be PASS at the correct gate state before this step exits. A FAIL row re-enters the self-healing loop targeting the *enhancement*, not the deploy.

---

### Regression-Risk Re-Verification

Only required if `{iteration_plan}` listed entries under "Regression-Risk Surface":

| Risk surface | Pre-existing behavior expected | Result | Evidence |
|---|---|---|---|

If the plan said "None.", skip this section.

---

### Once-Per-Deploy Health Checks

- [ ] `curl -fsS $APP_URL/api/health` returns 200
- [ ] `databricks apps get {user_app_name} --output json | jq .app_status.state` returns `RUNNING`
- [ ] `databricks apps logs {user_app_name} --tail 200` has no ERROR-level lines
- [ ] If the project uses envelope semantics: every `/api/*` endpoint returns `source: "live"`, never `"mock"`

---

### Targeted Documentation Updates

Updated only the doc pages that map to entries in `{iteration_plan}`'s **Change Manifest**. Did NOT regenerate the whole `docs/` tree.

- [ ] Each touched module has a corresponding doc update
- [ ] New modules / endpoints / tables have new pages
- [ ] Active gates / flags table updated in operations doc
- [ ] Root directory audited for stray `.md` files (kebab-case enforced)

---

### State File Append

Appended to `.vibecoding-state.md` (or project equivalent):

```
## Redeploy & Test — <iteration label>

- Deploy timestamp: <ISO-8601>
- Target: <target>
- App URL: <url>
- Bundle / app deploy run URLs: <urls>

### Smoke test results
- <enhancement 1>: PASS (<gate state>) — <evidence>
- <enhancement 2>: PASS (<gate state>) — <evidence>

### Gates now live
- <gate 1>: <state>, <cohort>
- <gate 2>: <state>, <cohort>

### Self-heal fixes applied
- (or "None — clean deploy on first attempt")

### Watch this for next iteration
- <anything that warrants investigation in the next plan>
```

This append is non-negotiable — the next Step 20 reads it before planning the next iteration.

---

### Success Criteria Checklist

**Input handoff:**
- [ ] `{iteration_plan}` was non-empty and contained all four required sections
- [ ] `git diff` matches the plan's Change Manifest

**Deploy:**
- [ ] Migrations applied (or N/A) BEFORE app deploy
- [ ] Correct deploy mode chosen for the delta (code-only / full / mixed)
- [ ] Deploy succeeded within 3 self-heal iterations

**Verification:**
- [ ] Every enhancement smoke test PASSED at the correct gate state
- [ ] Regression-risk surface re-verified (if listed in plan)
- [ ] `/api/health` is 200

**Output handoff:**
- [ ] Docs updated for the changed surface only
- [ ] State file appended with deploy timestamp, smoke test results, gates live, fixes applied

</details>

---

## Workspace Clean Up

| Field | Value |
|-------|-------|
| `input_id` | `140` |
| `section_tag` | `workspace_cleanup` |
| `order_number` | `31` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `true` |

_Safely delete all Databricks resources created during the workshop_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

````
Clean up all Databricks resources created during the Vibe Coding Workshop. Delete every resource safely — if it exists, delete it; if it does not exist, skip it and move on. Never fail on a missing resource.

---

## Workspace Context

- **Workspace URL**: {workspace_url}
- **User Email**: {created_by}

> **All other values must be discovered at runtime** — read `databricks.yml` (root and app-level) to extract catalog names, schema names, app names, Lakebase project IDs, and warehouse references. Do NOT hardcode resource names.

---

## IMPORTANT: Safety Rules

1. **Discover config first** — read `databricks.yml` at the repo root and any `apps_lakebase/*/databricks.yml` to extract actual resource names (catalog, schemas, app name, Lakebase project ID, warehouse).
2. **Set the correct CLI profile** — match the workspace URL against `~/.databrickscfg` profiles and `export DATABRICKS_CONFIG_PROFILE=<matching_profile>` before any `databricks api` calls.
3. **Inventory first** — before deleting anything, list every resource that will be affected and print a summary.
4. **Confirm with the user** — after showing the inventory, ask for explicit confirmation before proceeding.
5. **If-exists checks** — every delete operation must check existence first. If the resource is not found, print a skip message and continue.
6. **Dependency order** — delete in the correct order to avoid dependency errors (children before parents, consumers before producers).
7. **Never delete resources outside the workshop scope** — only target resources matching the discovered naming patterns.
8. **Report results** — at the end, print a summary table showing each resource, whether it was deleted or skipped, and any errors.

---

## Step 0: Runtime Discovery (MANDATORY — run before any cleanup)

### 0a. Resolve CLI Profile

> **Client note:** IDE runs these in a terminal; Genie Code runs the `databricks …` commands via `runDatabricksCli` (pre-authenticated). See `genie-code-environment`.

```bash
# Use the configured Databricks CLI profile (defaults to DEFAULT — change in Session Settings → Profile if your ~/.databrickscfg uses a different name)
# Export it so all subsequent `databricks api` calls authenticate correctly
export DATABRICKS_CONFIG_PROFILE={databricks_cli_profile}

# Verify
databricks current-user me --profile {databricks_cli_profile} --output json
```

### 0b. Read Bundle Configs

Read `databricks.yml` at the repo root to extract:
- `variables.catalog.default` → the **Lakehouse catalog** (e.g. `mkim_fevm_azure_classic`)
- `variables.bronze_schema.default` → bronze schema name
- `variables.silver_schema.default` → silver schema name
- `variables.gold_schema.default` → gold schema name
- `variables.source_schema.default` → **source/seed schema** (often different from the medallion schemas)
- `variables.source_catalog.default` → source catalog (may equal the main catalog)
- Warehouse lookup name → resolve to a warehouse ID

Read `apps_lakebase/*/databricks.yml` to extract:
- `resources.apps.app.name` → the **Databricks App name**
- `resources.postgres_projects.*.project_id` → the **Lakebase project ID**
- `resources.apps.app.resources[].postgres.branch` → confirms the Lakebase project path

### 0c. Find a SQL Warehouse

```bash
databricks warehouses list --output json
# Pick a running/startable warehouse, capture its ID as WAREHOUSE_ID
```

### 0d. Discover Lakebase UC Catalog

The Lakebase UC catalog name is typically provided by the user or found via:
```bash
# Post via SQL Statements API (NOT `databricks sql execute` which doesn't exist)
databricks api post /api/2.0/sql/statements \
  --json @<(cat <<'EOF'
{"warehouse_id": "<WAREHOUSE_ID>", "statement": "SHOW CATALOGS LIKE '%lakebase%'", "wait_timeout": "30s"}
EOF
)
```

---

## Resources to Clean Up (in order)

### Phase 1: Jobs and DLT Pipelines

**Jobs**: Use a broad search. Workshop jobs may NOT contain the schema prefix in their name. Search for jobs matching ANY of these patterns:
- Job name contains the schema prefix (e.g. `minah_k_loyalty_rewards_analytics`)
- Job name contains workshop-related keywords: `Loyalty Rewards`, `Bronze`, `Silver`, `Gold`, `Metric Views`, `TVF`, `Genie`, `Dashboard Deployment`
- Job is tagged with `project=loyalty_rewards_analytics` or similar
- Job is tagged with the user's `dev` tag (e.g. `dev: minah_kim`)
- Job creator matches the user email

```bash
databricks jobs list --output json | python3 -c "
import sys, json
data = json.load(sys.stdin)
jobs = data.get('jobs', []) if isinstance(data, dict) else data
keywords = ['loyalty', 'rewards', 'bronze', 'silver', 'gold', 'metric', 'tvf',
            'genie', 'dashboard', 'dlt', 'dq', 'clone', 'merge', 'setup',
            'skill_validation', '{user_schema_prefix}']
for j in jobs:
    settings = j.get('settings', {})
    name = settings.get('name', '').lower()
    tags = settings.get('tags', {})
    creator = j.get('creator_user_name', '')
    if (any(kw in name for kw in keywords)
        or tags.get('project', '') in ['loyalty_rewards_analytics', 'vibe_coding_workshop']
        or creator == '{created_by}'):
        print(f\"Job {j['job_id']}: {settings.get('name', '')} (creator: {creator})\")
"
```

Delete each matching job (positional arg, NOT `--job-id`):
```bash
databricks jobs delete <JOB_ID>
```

**DLT Pipelines**: Also search for pipelines — these are separate from jobs.
```bash
databricks pipelines list-pipelines --output json | python3 -c "
import sys, json
pipelines = json.load(sys.stdin)
if not isinstance(pipelines, list):
    pipelines = pipelines.get('statuses', [])
keywords = ['loyalty', 'rewards', 'silver', 'bronze', 'gold', 'dlt', '{user_schema_prefix}']
for p in pipelines:
    name = p.get('name', '').lower()
    creator = p.get('creator_user_name', '')
    if any(kw in name for kw in keywords) or creator == '{created_by}':
        print(f\"Pipeline {p.get('pipeline_id','')}: {p.get('name','')} (creator: {creator})\")
"

# Delete each matching pipeline
databricks pipelines delete <PIPELINE_ID>
```

### Phase 2: AI/BI Dashboards

Search by name patterns AND creator:
```bash
databricks lakeview list --output json | python3 -c "
import sys, json
data = json.load(sys.stdin)
dashboards = data if isinstance(data, list) else data.get('dashboards', [])
keywords = ['loyalty', 'rewards', '{user_schema_prefix}']
for d in dashboards:
    name = d.get('display_name', d.get('name', '')).lower()
    creator = d.get('creator_user_name', '')
    if any(kw in name for kw in keywords) or creator == '{created_by}':
        print(f\"Dashboard {d.get('dashboard_id','')}: {d.get('display_name','')} (creator: {creator})\")
"
```

Delete via trash (the `delete` subcommand may not exist — use `trash` instead):
```bash
databricks lakeview trash <DASHBOARD_ID>
```

### Phase 3: Genie Spaces

Genie spaces often have **human-readable names** (e.g. "Loyalty Rewards Intelligence"), not underscore-prefixed names. Search broadly:

```bash
# Requires the correct CLI profile to be set
databricks api get /api/2.0/genie/spaces | python3 -c "
import sys, json
data = json.load(sys.stdin)
spaces = data.get('spaces', [])
keywords = ['loyalty', 'rewards', '{user_schema_prefix}']
for s in spaces:
    title = s.get('title', '').lower()
    creator = s.get('creator_user_name', '')
    if any(kw in title for kw in keywords) or creator == '{created_by}':
        print(f\"Genie Space {s.get('space_id','')}: {s.get('title','')} (creator: {creator})\")
"

# Delete each matching Genie space
databricks api delete /api/2.0/genie/spaces/<SPACE_ID>
```

### Phase 4: Model Serving Endpoints

```bash
databricks serving-endpoints list --output json | python3 -c "
import sys, json
data = json.load(sys.stdin)
endpoints = data.get('endpoints', []) if isinstance(data, dict) else data
keywords = ['loyalty', 'rewards', '{user_schema_prefix}']
for e in endpoints:
    name = e.get('name', '').lower()
    if any(kw in name for kw in keywords):
        print(f\"Endpoint: {e.get('name','')} (state: {e.get('state',{}).get('ready','?')})\")
"

# Delete each matching endpoint
databricks serving-endpoints delete <ENDPOINT_NAME>
```

### Phase 5: Lakehouse Schemas

Drop ALL schemas discovered from `databricks.yml` — including the **source schema** which the original cleanup missed. Use the SQL Statements REST API (not `databricks sql execute`):

```bash
WAREHOUSE_ID="<discovered_warehouse_id>"
CATALOG="<from databricks.yml variables.catalog.default>"

# Schemas to drop (all from databricks.yml):
#   - variables.bronze_schema.default
#   - variables.silver_schema.default
#   - variables.gold_schema.default
#   - variables.source_schema.default  ← IMPORTANT: often missed

for SCHEMA in <bronze_schema> <silver_schema> <gold_schema> <source_schema>; do
  cat > /tmp/sql_stmt.json << ENDJSON
{"warehouse_id": "$WAREHOUSE_ID", "statement": "DROP SCHEMA IF EXISTS $CATALOG.$SCHEMA CASCADE", "wait_timeout": "50s"}
ENDJSON
  databricks api post /api/2.0/sql/statements --json @/tmp/sql_stmt.json
done
```

> **Note**: `wait_timeout` must be between 5s and 50s (not 60s). Write the JSON to a temp file to avoid shell quoting issues.

### Phase 6: Lakebase Unity Catalog Registration

Drop the UC catalog that was created when registering Lakebase (discovered in Step 0d):

```bash
cat > /tmp/sql_stmt.json << 'ENDJSON'
{"warehouse_id": "<WAREHOUSE_ID>", "statement": "DROP CATALOG IF EXISTS <LAKEBASE_UC_CATALOG> CASCADE", "wait_timeout": "50s"}
ENDJSON
databricks api post /api/2.0/sql/statements --json @/tmp/sql_stmt.json
```

### Phase 7: Lakebase Project

The project ID comes from `apps_lakebase/*/databricks.yml` → `resources.postgres_projects.*.project_id`.

**Autoscaling mode** (dedicated project — safe to delete entirely):
```bash
# The NAME argument must use the `projects/<project_id>` format
databricks postgres delete-project projects/<PROJECT_ID> --no-wait
```

**Provisioned mode** (shared instance — only drop the schema):
```bash
# DO NOT delete the instance. Only drop the workshop schema via psql.
DROP SCHEMA IF EXISTS <user_schema> CASCADE;
```

If unsure, check whether the project name matches the app name (autoscaling) or is a shared name like `donotdelete-*` (provisioned). When in doubt, only drop the schema.

### Phase 8: Databricks App

The app name comes from `apps_lakebase/*/databricks.yml` → `resources.apps.app.name`.

```bash
# Stop the app first (ignore error if already stopped)
databricks apps stop <APP_NAME> || true

# Wait a few seconds for stop to propagate
sleep 5

# Delete the app
databricks apps delete <APP_NAME>
```

> **Important**: The app name may be truncated (e.g. `minah-k-loyalty-rewards-an` instead of `minah-k-loyalty-rewards-analytics`). Always use the name from the bundle config, not an assumed full name.

### Phase 9: Databricks Asset Bundles (DAB)

Destroy bundles in **both** locations — the root data-product bundle and the app-level bundle:

```bash
# Root bundle (data product jobs, pipelines, workspace files)
cd <REPO_ROOT>
databricks bundle destroy --auto-approve

# App bundle (app deployment, Lakebase project)
cd <REPO_ROOT>/apps_lakebase/<APP_DIR>
databricks bundle destroy --auto-approve
```

### Phase 10: Skill Validation Assets (if Agent Skills track was used)

Search for any `skill_validation` jobs (included in Phase 1 keyword search).

---

## CLI Syntax Reference (common pitfalls)

| Operation | Correct Syntax | Common Mistake |
|-----------|---------------|----------------|
| Delete job | `databricks jobs delete <JOB_ID>` (positional) | ~~`--job-id <ID>`~~ (flag doesn't exist) |
| Delete dashboard | `databricks lakeview trash <ID>` | ~~`databricks lakeview delete <ID>`~~ (may not exist) |
| Execute SQL | `databricks api post /api/2.0/sql/statements --json @file.json` | ~~`databricks sql execute`~~ (command doesn't exist) |
| Delete Lakebase project | `databricks postgres delete-project projects/<ID>` | ~~`--project-id <ID>`~~ (positional, needs `projects/` prefix) |
| SQL wait_timeout | `"wait_timeout": "50s"` (max 50s) | ~~`"wait_timeout": "60s"`~~ (rejected) |
| API with auth | Set `DATABRICKS_CONFIG_PROFILE` first | ~~Rely on default auth~~ (fails for `databricks api` calls) |

---

## Output: Summary Report

After running all phases, print a summary like this:

```
============================================================
                 WORKSHOP CLEANUP SUMMARY
============================================================
 Phase | Resource                        | Status
-------|---------------------------------|-------------------------
   1   | Jobs                            | Deleted (N) / Skipped (M)
   1   | DLT Pipelines                   | Deleted (N) / Skipped (M)
   2   | AI/BI Dashboards                | Deleted (N) / Skipped (M)
   3   | Genie Spaces                    | Deleted (N) / Skipped (M)
   4   | Model Serving Endpoints         | Deleted (N) / Skipped (M)
   5   | Lakehouse Schemas               | Dropped (N) / Skipped (M)
   6   | Lakebase UC Catalog             | Deleted / Skipped
   7   | Lakebase Project                | Deleted / Skipped
   8   | Databricks App                  | Deleted / Skipped
   9   | DAB Bundles                     | Destroyed (N)
  10   | Skill Validation Assets         | Deleted (N) / Skipped (M)
============================================================
 Total: X deleted, Y skipped, Z errors
============================================================
```

---

## Execution Approach

Execute the phases interactively one at a time using the Databricks CLI:
1. Run Step 0 (discovery) to populate all variable values
2. Run the inventory scan across all phases
3. Present the full inventory and ask for user confirmation
4. Execute each phase in order, wrapping every delete in `|| true` with error capture
5. Print the summary report at the end
6. Return exit code 0 even if some resources were not found (skip is not an error)
````

<details><summary><strong>How to Apply</strong> (user-facing guidance)</summary>

**Run this in your cloned Template Repository** (see Prerequisites in Step 0). These commands assume the Databricks CLI is installed and you have a profile in `~/.databrickscfg` whose `host` matches `{workspace_url}`.

---

### Step 1: Set the Correct Databricks CLI Profile
Use the configured Databricks CLI profile (default `DEFAULT` — override in **Session Settings → Profile** if your `~/.databrickscfg` uses a different profile name for `{workspace_url}`):
```bash
export DATABRICKS_CONFIG_PROFILE={databricks_cli_profile}
databricks current-user me --profile {databricks_cli_profile} --output json
```
This is required — `databricks api` calls will silently hit the wrong workspace without it.

### Step 2: Copy the Generated Prompt
Copy the cleanup prompt into your AI coding assistant from the project root.

### Step 3: Let the Assistant Run Discovery and Present the Inventory
The assistant will execute Step 0 (discover the CLI profile, read `databricks.yml` at the repo root and under `apps_lakebase/<APP_DIR>/`, find a warehouse, resolve the Lakebase UC catalog), then sweep every phase and print a full inventory of resources that will be deleted.

### Step 4: Review and Confirm
Review the inventory carefully. If the list looks correct, confirm to proceed. The assistant will delete resources in dependency order (jobs/pipelines → dashboards → Genie → serving → schemas → Lakebase UC catalog → Lakebase project → app → DAB bundles).

### Step 5: Verify
Use these links to confirm resources have been removed:
- **Apps** page — your app should no longer appear
- **Catalog Explorer** — bronze, silver, gold, and **source** schemas should be gone; the Lakebase UC catalog should be gone
- **Lakebase Projects** — autoscaling project should be removed (provisioned instances remain, but the workshop schema should be dropped)
- **Jobs** page — workshop-related jobs should be deleted
- **Pipelines** page — workshop DLT pipelines should be deleted
- **Dashboards** page — workshop dashboards should be in Trash
- **Genie** page — workshop Genie spaces should be deleted

### Step 6: DAB Bundles
Both bundles are destroyed automatically in Phase 9 — the root bundle (`databricks.yml` in the repo root) and the app bundle (`apps_lakebase/<APP_DIR>/databricks.yml`). No manual step is required.

</details>

<details><summary><strong>Expected Output</strong></summary>

### Resources Removed
- [ ] All workshop jobs deleted
- [ ] All workshop DLT pipelines deleted
- [ ] AI/BI dashboards deleted (moved to Trash)
- [ ] Genie spaces deleted
- [ ] Model serving endpoints deleted (if created)
- [ ] Source, bronze, silver, gold schemas dropped (CASCADE)
- [ ] Lakebase UC catalog dropped (CASCADE)
- [ ] Lakebase project deleted (autoscaling) **or** workshop schema dropped (provisioned)
- [ ] Databricks App stopped and deleted
- [ ] Root DAB bundle destroyed (`<REPO_ROOT>`)
- [ ] App DAB bundle destroyed (`<REPO_ROOT>/apps_lakebase/<APP_DIR>`)
- [ ] Skill validation assets deleted (if created)

### Verification
- [ ] Apps page shows no workshop app
- [ ] Catalog Explorer shows no workshop schemas (source/bronze/silver/gold) and no Lakebase UC catalog
- [ ] Lakebase Projects page shows no workshop project (autoscaling mode)
- [ ] Jobs page shows no workshop jobs
- [ ] Pipelines page shows no workshop DLT pipelines
- [ ] Dashboards page shows no workshop dashboards (check Trash too)
- [ ] Genie page shows no workshop Genie spaces

</details>

---

## Default Section

| Field | Value |
|-------|-------|
| `input_id` | `99` |
| `section_tag` | `default` |
| `order_number` | `99` |
| `coding_assistant` | `__default__` |
| `bypass_llm` | `(default)` |

_Default template for unknown sections_

**Input Template** (the prompt the section feeds to the LLM / pastes verbatim):

```
Generate content for {section_tag} in {industry_name} for {use_case_title}.

Industry: {industry_name}
Use Case: {use_case_title}
Section: {section_tag}

Please provide detailed requirements and specifications for this section.
```

**System Prompt:**

```
You are an expert Databricks solutions architect.
Generate a detailed, actionable prompt for {section_tag} in a {industry_name} {use_case_title} application.
```

---
