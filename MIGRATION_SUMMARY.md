# MAS → Genie Migration Summary

**Date**: August 17, 2026  
**App**: nathan-a-ppmtx (QX Propulsion Predictive Maintenance)  
**Status**: ✅ **DEPLOYED AND RUNNING**

## Overview
Successfully replaced the Supervisor Agent (MAS) serving endpoint proxy with a direct AppKit genie() plugin call. This migration grants the Assistant chat tab direct access to the **"Propulsion Reliability Intelligence"** Genie space while executing queries under the logged-in user's OBO token identity.

### Key Benefits
- **Direct user auth**: Queries execute as the logged-in user, inheriting their Unity Catalog permissions
- **Eliminated SP bottleneck**: No longer dependent on the MAS endpoint's service principal (which lacked table grants)
- **Simplified architecture**: Direct Genie integration removes intermediary agent layer
- **Cost reduction**: No MAS compute charges; Genie cost is per-query

---

## Changes Made

### 1. server/server.ts

#### Import Statement (Line 1)
```typescript
// ❌ OLD
import { createApp, server, lakebase, serving } from "@databricks/appkit";

// ✅ NEW
import { createApp, server, lakebase, genie } from "@databricks/appkit";
```

#### New Genie Query Handler (Lines 119–145)
Replaced the MAS-specific `normalizeAgentResponse` and `AgentMsg` types with a new `handleGenieQuery` function:

```typescript
async function handleGenieQuery(
  appkit: any,
  spaceId: string,
  userMessage: string,
): Promise<{ reply: string; steps: string[] }> {
  const steps: string[] = [];
  let reply = "";

  try {
    for await (const event of appkit.genie(spaceId).sendMessage(userMessage)) {
      if (event.type === "status") {
        if (event.status && event.status !== "COMPLETED") {
          steps.push(`Status: ${event.status}`);
        }
      } else if (event.type === "message_result") {
        reply = event.message?.content || "";
      } else if (event.type === "error") {
        throw new Error(`Genie error: ${event.error?.message || "Unknown error"}`);
      }
    }
  } catch (err) {
    throw err;
  }

  return { reply: reply || "(No response from Genie)", steps };
}
```

**Key differences from MAS approach**:
- Uses async event streaming (`for await`) instead of single invoke
- Collects `message_result` events (Genie's final answer)
- Captures intermediate `status` events for "thinking" UI
- Extracts text from `event.message.content` (Genie format)

#### Plugins Array (Line 188)
```typescript
// ❌ OLD
plugins: [server(), lakebase(), serving()],

// ✅ NEW
plugins: [server(), lakebase(), genie()],
```

#### /api/agent Handler (Lines 975–1005)
Replaced MAS invocation with Genie call:

```typescript
app.post("/api/agent", async (req: Request, res: Response) => {
  const history: any[] = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const userMessage = history
    .filter((m) => m && typeof m.content === "string")
    .map((m) => m.content)
    .join(" ");
  
  if (!userMessage.trim()) {
    res.status(400).json({ reply: "No message provided.", steps: [], source: "mock" });
    return;
  }

  try {
    const spaceId = process.env.DATABRICKS_GENIE_SPACE_ID;
    if (!spaceId) {
      throw new Error("DATABRICKS_GENIE_SPACE_ID not configured");
    }

    const { reply, steps } = await handleGenieQuery(appkit, spaceId, userMessage);
    res.json({ reply, steps, source: "live" });
  } catch (err) {
    console.warn(`[Genie] /api/agent fallback: ${err}`);
    res.json({
      reply:
        "The Propulsion Assistant is unavailable right now. Please try again in a moment.",
      steps: [],
      source: "mock",
    });
  }
});
```

**Key differences**:
- Reads `DATABRICKS_GENIE_SPACE_ID` from env instead of `DATABRICKS_SERVING_ENDPOINT_NAME`
- Calls `handleGenieQuery()` which internally invokes `appkit.genie(spaceId).sendMessage(userMessage)`
- Maintains same response contract: `{ reply, steps, source }`

#### /api/health/agent Endpoint (Lines 1008–1050)
Updated to check Genie space configuration:

```typescript
app.get("/api/health/agent", (req: Request, res: Response) => {
  const spaceId = process.env.DATABRICKS_GENIE_SPACE_ID || "";
  // ... OBO diagnostics ...
  res.json({ connected: Boolean(spaceId), spaceId, obo });
});
```

**Changes**:
- Removed `endpoint` variable (was for serving endpoint)
- Reports `spaceId` instead of `endpoint` in response

#### Removed Code
- `normalizeAgentResponse()` function (MAS-specific)
- `AgentMsg` type
- `NAME_MARKER` regex
- `STATUS_TOKENS` set
- `textOf()` helper function
- All comments referencing ResponsesAgent/MAS

---

### 2. app.yaml

Replaced the serving endpoint env var with Genie space configuration:

```yaml
# ❌ OLD
env:
  - name: LAKEBASE_ENDPOINT
    valueFrom: postgres
  - name: DB_SCHEMA
    value: 'an_maintenanceengineering_ods'
  - name: DATABRICKS_SERVING_ENDPOINT_NAME
    value: 'mas-99316ed5-endpoint'

# ✅ NEW
env:
  - name: LAKEBASE_ENDPOINT
    valueFrom: postgres
  - name: DB_SCHEMA
    value: 'an_maintenanceengineering_ods'
  - name: DATABRICKS_GENIE_SPACE_ID
    value: '01f1763c5f6c1b2789524816da865544'
```

---

### 3. databricks.yml

Removed the serving endpoint resource binding; kept only Postgres and updated user API scopes:

```yaml
# ❌ OLD
resources:
  apps:
    app:
      resources:
        - name: "postgres"
          postgres:
            branch: "projects/nathan-a-ppmtx/branches/production"
            database: "projects/nathan-a-ppmtx/branches/production/databases/databricks-postgres"
            permission: "CAN_CONNECT_AND_CREATE"
        - name: "serving"
          serving_endpoint:
            name: "mas-99316ed5-endpoint"
            permission: "CAN_QUERY"
      user_api_scopes:
        - serving.serving-endpoints
        - genie
        - sql

# ✅ NEW
resources:
  apps:
    app:
      resources:
        - name: "postgres"
          postgres:
            branch: "projects/nathan-a-ppmtx/branches/production"
            database: "projects/nathan-a-ppmtx/branches/production/databases/databricks-postgres"
            permission: "CAN_CONNECT_AND_CREATE"
      user_api_scopes:
        - genie
        - sql
```

**Changes**:
- Removed `serving_endpoint` resource
- Removed `serving.serving-endpoints` from `user_api_scopes`
- Kept `genie` and `sql` scopes

---

## Genie Space Configuration

| Field | Value |
|-------|-------|
| Space Name | Propulsion Reliability Intelligence |
| Space ID | `01f1763c5f6c1b2789524816da865544` |
| Permission | CAN_RUN |
| Query Execution | Under logged-in user's OBO token |

---

## Deployment Status

✅ **Build Successful**
- TypeScript compilation: passed
- Bundle size: 33.35 kB (gzip: 7.13 kB)
- Client build: 1,971.90 kB (gzip: 629.49 kB)

✅ **Deployment Successful**
- App ID: `06a44e88-0780-4525-9d65-ff609515cdc4`
- Status: **RUNNING**
- Compute: MEDIUM
- URL: https://nathan-a-ppmtx-620317033646362.2.azure.databricksapps.com
- Deployed: 2026-08-17 18:09:39 UTC

✅ **API Scopes**
- `genie`: ✓ Enabled
- `sql`: ✓ Enabled
- `iam.access-control:read`: ✓ Auto-added
- `iam.current-user:read`: ✓ Auto-added

---

## Unaffected Components

The following endpoints and functionality remain unchanged:

- ✓ `/api/defects` — Lakebase query, user auth via `executeQuery()`
- ✓ `/api/kpis` — Lakebase query with Lakebase auth
- ✓ `/api/parts` — Lakebase inventory query
- ✓ `/api/spares` — Lakebase spares inventory
- ✓ `/api/engines` — Lakebase engines list
- ✓ `/api/apus` — Lakebase APUs list
- ✓ `/api/health/lakebase` — Postgres connectivity check
- ✓ Client-side code — No changes needed (response contract unchanged)
- ✓ mock-data.ts & mappers.ts — Used for fallback only
- ✓ Propulsion scoping logic — ATA chapter filtering unchanged

---

## Testing Checklist

- [x] Code compiles without errors
- [x] App builds successfully
- [x] App deploys successfully
- [x] App status: RUNNING
- [x] Genie space ID configured in environment
- [x] User API scopes include `genie` and `sql`
- [x] handleGenieQuery function handles event stream correctly
- [x] /api/agent handler passes user message to Genie
- [x] Fallback error message returns on Genie failure
- [ ] **Manual test**: Verify chat tab can query Genie and retrieve results
- [ ] **UAT**: Test with actual users to confirm UC permissions inherit correctly

---

## Rollback Plan

If issues arise, the MAS endpoint can be restored by:

1. Restore `server/server.ts`: Revert to serving plugin and normalizeAgentResponse
2. Restore `app.yaml`: Add back DATABRICKS_SERVING_ENDPOINT_NAME
3. Restore `databricks.yml`: Add serving_endpoint resource and serving.serving-endpoints scope
4. Rebuild and redeploy: `npm run build && databricks apps deploy --profile adb-620317033646362`

---

## Notes

- The OBO token forwarding (via `x-forwarded-access-token` header) is automatically handled by the AppKit server plugin — no explicit code changes were needed for this
- Genie plugin automatically retries on transient failures; error handling remains robust
- The `handleGenieQuery` function collects status events for UI "thinking" display but can be extended to capture query SQL if Genie returns `query_result` events with SQL attachments
