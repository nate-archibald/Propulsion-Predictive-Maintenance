# Supervisor Agent — Discovery (Chat Tab Wiring)

> Source of truth for wiring the **Propulsion-Supervisor-Agent** into the app as a chat tab.
> Workspace `adb-620317033646362`; app `nathan-a-ppmtx`.

## Identity — confirmed

- **Display name:** `Propulsion-Supervisor-Agent` (Agent Bricks Multi-Agent Supervisor / MAS).
- **Serving endpoint:** `mas-99316ed5-endpoint` — the ONLY `agent/v1/responses` endpoint in the
  workspace. Confirmed identity by invoking it: the response trace literally emits
  `<name>Propulsion-Supervisor-Agent</name>` as it routes to its subagents.
- **State:** `READY`. `route_optimized: false`. Served entity foundation model `mas-base-model-722f9bc7`.
- **Subagent:** a Genie space tool `genie-01f1763c5f6c1b2789524816da865544` (natural-language SQL over
  the propulsion data). The supervisor orchestrates this Genie subagent.

## Schema — `agent/v1/responses` (ResponsesAgent / OpenAI Responses format)

**Request** (invocations body):
```json
{ "input": [ { "role": "user", "content": "…question…" } ] }
```
Multi-turn: pass the full prior `input` array (user + prior assistant messages) to preserve context.

**Response** — top-level `object: "response"` with an `output[]` array. Each item is one of:
- `type: "message"` → `content[]` with `{ type: "output_text", text }` — assistant text (reasoning,
  routing markers like `<name>…</name>`, and the FINAL answer are all `message` items).
- `type: "function_call"` → `{ name, arguments, call_id, step }` — a tool/subagent call (e.g. the Genie query).

**Normalization rule (backend):** the **final answer** is the `output_text` of the **last**
`type == "message"` item whose text is not a routing marker (`<name>…</name>`) or a bare status token
(`EMPTY`). Intermediate `message`/`function_call` items are trace steps — optionally surfaced as
"thinking"/citations, but not the headline reply.

## Wiring path — DECISION: Serving plugin + normalizing `/api/agent` proxy (OBO)

- Use AppKit's built-in **`serving()` plugin** (default alias `default`, reads env
  `DATABRICKS_SERVING_ENDPOINT_NAME`). It auto-adds a `CAN_QUERY` serving-endpoint **resource
  requirement** for the app SP and exposes `appkit.serving().invoke(body)` / `.asUser(req)`.
- Add a thin custom **`POST /api/agent`** route in `server.extend()` that:
  1. accepts `{ messages: [{role, content}] }` from the chat UI,
  2. maps to `{ input: [...] }`,
  3. calls `appkit.serving().asUser(req).invoke({ input })` **as the signed-in user (OBO)**,
  4. treats a resolved `{ ok:false }` ExecutionResult as a failure (the plugin does not throw),
  5. normalizes the endpoint payload (`ExecutionResult.data`) `output[]` → `{ reply, steps, source:"live" }`,
  6. on any error, returns `{ reply: <friendly msg>, source: "mock" }` (never 500 to the UI).

## Identity: MUST run as the signed-in user (OBO), not the app SP — with one-time consent

**Why OBO (not app-SP):** the MAS's Genie subagent queries the propulsion Delta tables under the
*invoking* identity. When invoked as the **app SP** it fails with
`INVALID_PARAMETER_VALUE: Error getting permissions for table(s): (none). Verify you have USE CATALOG …
USE SCHEMA … SELECT on each table.` — the app SP has no UC grants on the governed catalog
`subject_maintenanceengineering_test`, and **we cannot grant them** (the workshop user lacks `MANAGE`
on that catalog/schema — `databricks grants update` returns "User does not have MANAGE"). Invoking as
the **signed-in user** works: a direct `/invocations` REST call with the user's own token succeeds
(the Genie subagent runs as the user, who already has access to these tables + the two Genie spaces).

**Therefore the app uses OBO:** `.asUser(req)` reads the `x-forwarded-access-token` +
`x-forwarded-user` headers that the Databricks Apps runtime injects for authenticated **browser**
users, and invokes the MAS as that user. This requires:

1. `databricks.yml` → `resources.apps.app.user_api_scopes: [serving.serving-endpoints, dashboards.genie, sql]`.
2. **ONE-TIME in-browser consent (manual, unavoidable):** the first time each user opens the app after
   the scopes were added, Databricks shows an **app-consent screen** requesting those scopes. Until the
   user clicks **Authorize**, no OBO token is minted, `asUser` falls back to the app SP, and the
   Assistant returns the "mock" fallback message. This consent is a deliberate, interactive security
   gate — it CANNOT be scripted (the consent UI is a React SPA with no server-side form; the Apps proxy
   also strips client-supplied `x-forwarded-*` headers, so a bearer-token `curl` cannot exercise OBO).
   **Validation must be done in a browser (or via the 3-hop `requests.Session()` OAuth replay AFTER the
   user has consented once).**

- The Genie space the MAS routes to: **`Propulsion Reliability Intelligence`**
  (`space_id 01f1763c5f6c1b2789524816da865544`, warehouse `600d6ad41356867b`). Under OBO the user's own
  Genie/warehouse/UC access applies, so no app-SP grants on it are needed (nor possible here).

## Permissions the app SP needs

- **Serving endpoint `CAN_QUERY`** on `mas-99316ed5-endpoint` → added via a `serving_endpoint` app
  resource in `databricks.yml` (parallels the existing `postgres` binding). This lets the app *invoke*
  the endpoint; the *Genie/table* access comes from the OBO user, not the app SP.

## Config changes

- `databricks.yml` → add app resource **and** `user_api_scopes`:
  ```yaml
  resources:
    - name: "serving"
      serving_endpoint:
        name: "mas-99316ed5-endpoint"
        permission: "CAN_QUERY"
  user_api_scopes:
    - serving.serving-endpoints
    - dashboards.genie
    - sql
  ```
- `app.yaml` → add env:
  ```yaml
  - name: DATABRICKS_SERVING_ENDPOINT_NAME
    value: "mas-99316ed5-endpoint"
  ```
- **One-time in-browser consent** is required before the Assistant returns live answers (see Identity).
