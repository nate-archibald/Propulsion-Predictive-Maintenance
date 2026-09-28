import { createApp, server, lakebase, genie } from "@databricks/appkit";
import type { Request, Response } from "express";
import {
  MOCK_DEFECTS,
  MOCK_DEFECTS_BY_ATA,
  MOCK_WEEKLY_DEFECT_TREND,
  MOCK_PARTS,
  MOCK_SPARES,
  MOCK_ENGINES,
  MOCK_APUS,
  MOCK_KPIS,
  MOCK_FLEET_LEADERS,
  MOCK_ECMP_DETAILS,
  MOCK_DELAY_DETAILS,
  MOCK_CANCEL_DETAILS,
} from "./mock-data.js";
import {
  mapDefect,
  mapDefectByAta,
  mapWeeklyTrend,
  mapPart,
  mapSpare,
  mapEngine,
  mapAPU,
} from "./mappers.js";

// Postgres schema holding the reverse-ETL synced Gold tables (qx_ppmtx_synced_gold_*).
const DB_SCHEMA = process.env.DB_SCHEMA || "an_maintenanceengineering_ods";
const S = DB_SCHEMA;

// ── User Authorization (OBO) helpers ─────────────────────────────────
// Uses AppKit's built-in per-user Lakebase pool (AppKit.lakebase.asUser(req)).
// It reads the x-forwarded-access-token / x-forwarded-email headers (set by the
// Databricks Apps platform proxy) and authenticates as the signed-in user's own
// Postgres role, so `current_user` in Postgres reflects the real user. Requires
// `postgres` in `user_api_scopes` (databricks.yml) and a Postgres role created
// for each user (see the databricks-lakebase skill / Lakebase "Branch Overview").
// Falls back to null if the user token is missing or the per-user pool fails
// (e.g. user has no Postgres role yet, or consent hasn't been granted).
async function getUserLakebaseConnection(
  req: Request,
  appkit: any
): Promise<{ query: (sql: string, params?: any[]) => Promise<any> } | null> {
  if (!req.header("x-forwarded-access-token")) return null;

  try {
    const userClient = appkit.lakebase.asUser(req);
    // Fail fast so we can fall back cleanly instead of surfacing an OBO-specific
    // error to the end user.
    await userClient.query("SELECT 1");
    return userClient;
  } catch (err) {
    console.warn(`[User Auth] Failed to create user Lakebase connection: ${err}`);
    return null;
  }
}

// ── Propulsion scoping ───────────────────────────────────────────────
// This tool only shows PROPULSION (engine/APU) data. The definition mirrors the
// user's `vw_prop_*` Unity Catalog views (which also scope the Genie spaces).
// See docs/propulsion_scope_discovery.md for the authoritative extraction.
//
// ATA chapters: 49 (APU) + 70–80 (powerplant/engine group). Applied by joining
// fact tables to dim_ata_chapter.
const PROP_ATA_CHAPTERS = [49, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80];
const PROP_ATA_LIST = PROP_ATA_CHAPTERS.join(", ");

// Curated propulsion part overrides from `qx_ppmtx_prop_part_overrides` (UC).
// That table is not synced to Lakebase, so its (currently single) PN is embedded
// here to keep parity with vw_prop_part_population. If the override list grows,
// sync the table as a 14th synced table and read it instead.
const PROP_PART_OVERRIDE_PNS = ["3215790-3"];
const PROP_OVERRIDE_SQL_LIST = PROP_PART_OVERRIDE_PNS.map((pn) => `'${pn.replace(/'/g, "''")}'`).join(", ");

// Reusable subquery: the set of propulsion `dim_part_key` values
// (= vw_prop_part_population): parts seen in propulsion-ATA component removals,
// UNION curated overrides matched by part number.
const PROP_PART_POPULATION = `
  SELECT DISTINCT cr.dim_part_key
  FROM ${S}.qx_ppmtx_synced_gold_fact_component_removal cr
  JOIN ${S}.qx_ppmtx_synced_gold_dim_ata_chapter c
    ON cr.dim_ata_chapter_key = c.dim_ata_chapter_key
  WHERE c.chapter IN (${PROP_ATA_LIST})
  UNION
  SELECT p.dim_part_key
  FROM ${S}.qx_ppmtx_synced_gold_dim_part p
  WHERE p.pn IN (${PROP_OVERRIDE_SQL_LIST})`;

// Whole engine / APU part numbers for serviceable spares inventory
const ENGINE_PN = "CF34-8E5G01";
const APU_PNS = ["4503067A", "4505001B"];
const APU_SQL_LIST = APU_PNS.map((pn) => `'${pn.replace(/'/g, "''")}'`).join(", ");

function clampLimit(raw: unknown, def: number, max: number): number {
  const n = parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.min(n, max);
}

// Parse a `YYYY-MM-DD` query param into a safe date string (or null if absent /
// malformed). Used to scope KPI + ATA queries to a user-chosen timeframe.
function parseDateParam(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

// ── Keyword-based defect classification ──────────────────────────────
// Free-text defect narratives are almost never identical word-for-word (e.g.
// "FUEL FLOW FLUCTUATION ON ENG 1 DURING CLIMB" vs "FUEL FLOW FLUCTUATING
// ON ENGINE 2"), so grouping by exact string equality rarely surfaces real
// "top defect type" clusters — nearly every row is its own singleton group.
// Instead we tag each narrative with a recognized component + action
// keyword (when present) and group by that canonical tag, which produces
// meaningful clusters regardless of exact wording.
const COMPONENT_KEYWORDS: { tag: string; pattern: RegExp }[] = [
  { tag: "Fuel Control Unit", pattern: /\bfcu\b|fuel control unit/i },
  { tag: "Fuel Manifold", pattern: /fuel manifold/i },
  { tag: "Fuel Pump", pattern: /fuel pump/i },
  { tag: "HPT Blade", pattern: /hpt blade/i },
  { tag: "HPT Disk", pattern: /hpt disk/i },
  { tag: "LPT Blade", pattern: /lpt blade/i },
  { tag: "LPT Disk", pattern: /lpt disk/i },
  { tag: "Fan Blade", pattern: /fan blade/i },
  { tag: "Fan Disk", pattern: /fan disk/i },
  { tag: "Oil Transfer Tube", pattern: /oil transfer tube/i },
  { tag: "Oil Pressure Sensor", pattern: /oil pressure sensor/i },
  { tag: "Oil Filter", pattern: /oil filter/i },
  { tag: "Igniter Plug", pattern: /igniter/i },
  { tag: "FADEC", pattern: /\bfadec\b/i },
  { tag: "Stator Vane", pattern: /stator vane/i },
  { tag: "HPC Impeller", pattern: /hpc impeller/i },
  { tag: "Bleed Valve", pattern: /bleed valve/i },
  { tag: "Thermocouple", pattern: /thermocouple/i },
  { tag: "EGT / Trend Monitoring", pattern: /\begt\b|trend monitoring/i },
  { tag: "Vibration", pattern: /vibration/i },
  { tag: "Starter", pattern: /\bstarter\b/i },
  { tag: "Generator", pattern: /generator/i },
  { tag: "Borescope Finding", pattern: /borescope/i },
];
const ACTION_KEYWORDS: { tag: string; pattern: RegExp }[] = [
  { tag: "Replacement", pattern: /replaced?|\br[\s/]?[&/]?[\s/]?r\b/i },
  { tag: "Removal", pattern: /removed|removal/i },
  { tag: "Repair", pattern: /repaired?/i },
  { tag: "Inspection", pattern: /inspect(ed|ion)?/i },
  { tag: "Leak", pattern: /leak/i },
  { tag: "Fluctuation", pattern: /fluctuat/i },
  { tag: "Overtemp", pattern: /over[\s-]?temp|overheat/i },
  { tag: "Cleaning", pattern: /cleaned|cleaning/i },
  { tag: "Adjustment", pattern: /adjusted|adjustment/i },
  { tag: "Test", pattern: /tested|test failure/i },
];

// Classify a single defect narrative into a canonical "component — action"
// tag (falling back to just component, just action, or "Other").
function classifyDefectText(text: string): string {
  const component = COMPONENT_KEYWORDS.find((k) => k.pattern.test(text));
  const action = ACTION_KEYWORDS.find((k) => k.pattern.test(text));
  if (component && action) return `${component.tag} — ${action.tag}`;
  if (component) return component.tag;
  if (action) return action.tag;
  return "Other";
}

// ── Soft-time component catalog (shared by /api/soft-times + /api/overhaul-forecast) ──
// Each entry matches units either by explicit PN list (preferred — catches all
// interchangeable PNs regardless of description) or by a LIKE pattern against
// pn_description. When `pnList` is present it takes precedence.
//
// FMU, Fuel Pump, Master CVG, and Seal PRV use PN lists because their
// interchangeable PNs have inconsistent or null descriptions that a single LIKE
// misses. FADEC, Slave CVG, and Lube Oil Pump match cleanly by description.
const SOFT_TIME_CONFIG: {
  likePattern?: string;
  pnList?: string[];
  displayName: string;
  softLimit: number;
}[] = [
  { pnList: ["829500-7", "829500-9", "4120T04P07", "4120T04P09"],
                                                                 displayName: "Fuel Pump",                  softLimit: 20000 },
  { pnList: ["8061-926", "4120T01P02"],                          displayName: "FMU",                        softLimit: 18000 },
  { likePattern: "FUEL INJECTOR",                                displayName: "Fuel Injector",              softLimit: 14000 },
  { likePattern: "ELECTRONIC ENGINE CONTROL%FADEC",             displayName: "FADEC",                      softLimit: 36000 },
  { pnList: ["1211508-003","1211508-004","1211508-005","1211508-006","1211508-007",
             "4120T02P02","4120T02P03","4120T02P05","4120T02P06","4120T02P07"],
                                                                 displayName: "Master CVG Actuator",        softLimit: 18000 },
  { likePattern: "ACTUATOR VGSV",                                displayName: "Slave CVG Actuator",         softLimit: 18000 },
  { likePattern: "PUMP, LUBE AND SCAVENGE OIL",                 displayName: "Lube and Scavenge Oil Pump", softLimit: 20000 },
  { pnList: ["421645-2","421645","4123T61P01","4123T61P03"],     displayName: "Seal PRV",                   softLimit: 6000  },
];

// ── Genie REST API direct integration ────
// Supports stateful multi-turn conversations (follow-up questions retain full context),
// tabular query result fetching, and visualization image download.
// Docs: https://docs.databricks.com/aws/en/genie-agents/conversation-api
const GENIE_POLL_INTERVAL_MS = 2000;
const GENIE_POLL_MAX_ATTEMPTS = 60; // 2 min max wait

// Augment user messages to clarify transaction_type filtering intent and part naming conventions.
// The transaction history table has transaction_type = 'REMOVE' | 'INSTALL'.
// Aviation part descriptions use inconsistent naming (noun-first, natural order, abbreviated).
function augmentGenieMessage(message: string): string {
  const removalPattern = /\b(removal|removals|removed|unscheduled removal|scheduled removal)\b/i;
  const installPattern = /\b(install|installation|installations|installed)\b/i;
  // Detect part name references — multi-word component names the user likely typed in natural order
  // e.g. "fuel pump", "hydraulic pump", "oil filter", "check valve", "fuel control unit"
  const partNamePattern = /\b(fuel pump|oil pump|hydraulic pump|hyd pump|fuel control|fuel control unit|fcu|oil filter|check valve|boost pump|engine driven pump|edp|acmp|dc pump|ac pump|starter|igc|ignition exciter|igniter|bleed valve|thrust reverser|fan blade|turbine blade|compressor blade|lpt|hpt|engine driven|power turbine|combustion liner|nozzle guide vane|flow divider)\b/i;

  const hints: string[] = [];

  if (removalPattern.test(message) && !installPattern.test(message)) {
    hints.push(
      "Filter to transaction_type = 'REMOVE' only. " +
      "Do NOT count installations (transaction_type = 'INSTALL'). " +
      "Only REMOVE transactions count as removals."
    );
  }

  if (partNamePattern.test(message)) {
    hints.push(
      "IMPORTANT — part descriptions in this database use inconsistent naming conventions. " +
      "When filtering by part name, ALWAYS use split keywords with AND conditions: " +
      "e.g. WHERE UPPER(pn_description) LIKE '%FUEL%' AND UPPER(pn_description) LIKE '%PUMP%'. " +
      "NEVER use a single LIKE '%fuel pump%' — that will miss most results. " +
      "This catches noun-first format ('PUMP, FUEL'), natural order ('FUEL PUMP'), " +
      "abbreviated ('HYD PUMP'), and other variants."
    );
  }

  if (hints.length > 0) {
    return message + "\n\n[Data context: " + hints.join(" | ") + "]";
  }
  return message;
}

export interface GenieQueryResult {
  columns: string[];
  rows: string[][];
  title?: string;
}

export interface GenieVisualization {
  title: string;
  dataUrl: string;
}

async function handleGenieQuery(
  req: Request,
  spaceId: string,
  userMessage: string,
  existingConversationId?: string,
): Promise<{
  reply: string;
  steps: string[];
  conversationId: string;
  queryResults?: GenieQueryResult[];
  visualizations?: GenieVisualization[];
}> {
  const rawHost = process.env.DATABRICKS_HOST || "";
  const token = req.header("x-forwarded-access-token");
  if (!rawHost) throw new Error("DATABRICKS_HOST not set");
  if (!token) throw new Error("No user token — user not authenticated via OBO");

  const host = rawHost.startsWith("http") ? rawHost : `https://${rawHost}`;
  const baseUrl = `${host.replace(/\/$/, "")}/api/2.0/genie/spaces/${spaceId}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // 1. Start a new conversation OR send a follow-up message in the existing one
  let conversationId: string;
  let messageId: string;

  if (existingConversationId) {
    // Follow-up: Genie retains full conversation context automatically
    const followRes = await fetch(
      `${baseUrl}/conversations/${existingConversationId}/messages`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ content: userMessage, enable_visualization: true }),
      },
    );
    if (!followRes.ok) {
      const errText = await followRes.text();
      throw new Error(`Genie create-message failed (${followRes.status}): ${errText}`);
    }
    const followData: any = await followRes.json();
    conversationId = existingConversationId;
    messageId = followData.id || followData.message_id || followData.message?.id;
  } else {
    // New conversation
    const startRes = await fetch(`${baseUrl}/start-conversation`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content: userMessage, enable_visualization: true }),
    });
    if (!startRes.ok) {
      const errText = await startRes.text();
      throw new Error(`Genie start-conversation failed (${startRes.status}): ${errText}`);
    }
    const startData: any = await startRes.json();
    conversationId = startData.conversation_id || startData.conversation?.id;
    messageId = startData.message_id || startData.message?.id;
    console.log(`[Genie] new conversation: conv=${conversationId} msg=${messageId}`);
  }

  if (!conversationId || !messageId) {
    throw new Error("Genie response missing conversation_id or message_id");
  }

  // 2. Poll until terminal status (COMPLETED / FAILED / CANCELLED)
  const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELLED"]);
  const pollUrl = `${baseUrl}/conversations/${conversationId}/messages/${messageId}`;
  let msg: any = null;
  for (let attempt = 0; attempt < GENIE_POLL_MAX_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, GENIE_POLL_INTERVAL_MS));
    const pollRes = await fetch(pollUrl, { method: "GET", headers });
    if (!pollRes.ok) {
      const errText = await pollRes.text();
      throw new Error(`Genie poll failed (${pollRes.status}): ${errText}`);
    }
    msg = await pollRes.json();
    if (TERMINAL_STATUSES.has((msg.status || "").toUpperCase())) break;
  }

  if (!msg) throw new Error("Genie poll returned no data");
  if ((msg.status || "").toUpperCase() === "FAILED") {
    throw new Error(`Genie query failed: ${msg.error?.message || JSON.stringify(msg.error)}`);
  }

  // 3. Extract answer text, SQL steps, and attachment IDs for results/visualizations
  const steps: string[] = [];
  let answerText = "";
  let fallbackText = "";
  let queryDescription = "";
  const attachments: any[] = Array.isArray(msg.attachments) ? msg.attachments : [];
  const queryAttachmentIds: Array<{ id: string; title?: string }> = [];
  const vizAttachmentIds: Array<{ id: string; title: string }> = [];

  for (const att of attachments) {
    if (att?.text?.content) {
      if (att.text.purpose === "TEXT_ATTACHMENT_PURPOSE_ANSWER") {
        answerText = att.text.content;
      } else if (!fallbackText) {
        fallbackText = att.text.content;
      }
    }
    if (att?.query?.query) steps.push(`SQL: ${att.query.query}`);
    if (att?.query?.description) queryDescription = att.query.description;
    if (att?.attachment_id && att?.query) {
      queryAttachmentIds.push({ id: att.attachment_id, title: att.query.title });
    }
    if (att?.attachment_id && att?.viz) {
      vizAttachmentIds.push({ id: att.attachment_id, title: att.viz.title || "Chart" });
    }
  }

  // 4. Fetch tabular results for each query attachment
  const queryResults: GenieQueryResult[] = [];
  for (const qatt of queryAttachmentIds) {
    try {
      const resultUrl = `${baseUrl}/conversations/${conversationId}/messages/${messageId}/attachments/${qatt.id}/query-result`;
      const resultRes = await fetch(resultUrl, { method: "GET", headers });
      if (resultRes.ok) {
        const rd: any = await resultRes.json();
        const columns: string[] =
          rd?.statement_response?.manifest?.schema?.columns?.map((c: any) => c.name) ?? [];
        const rows: string[][] = rd?.statement_response?.result?.data_array ?? [];
        if (columns.length > 0) queryResults.push({ columns, rows, title: qatt.title });
      }
    } catch (e) {
      console.warn(`[Genie] query-result fetch failed for ${qatt.id}: ${e}`);
    }
  }

  // 5. Download visualization images as base64 data URLs
  const visualizations: GenieVisualization[] = [];
  for (const vatt of vizAttachmentIds) {
    try {
      const vizUrl = `${baseUrl}/conversations/${conversationId}/messages/${messageId}/attachments/${vatt.id}/download-visualization`;
      const vizRes = await fetch(vizUrl, { method: "GET", headers: { Authorization: `Bearer ${token}` } });
      if (vizRes.ok) {
        const buf = await vizRes.arrayBuffer();
        const ct = vizRes.headers.get("content-type") || "image/png";
        visualizations.push({
          title: vatt.title,
          dataUrl: `data:${ct};base64,${Buffer.from(buf).toString("base64")}`,
        });
      }
    } catch (e) {
      console.warn(`[Genie] visualization download failed for ${vatt.id}: ${e}`);
    }
  }

  const reply = answerText || queryDescription || fallbackText;
  if (!reply && msg.query_result?.row_count !== undefined) {
    return { reply: `Query returned ${msg.query_result.row_count} rows.`, steps, conversationId, queryResults: queryResults.length ? queryResults : undefined };
  }
  return {
    reply: reply || "(Genie returned no answer text)",
    steps,
    conversationId,
    queryResults: queryResults.length ? queryResults : undefined,
    visualizations: visualizations.length ? visualizations : undefined,
  };
}
// Execute a SQL query using user authorization (if available) or fall back to app authorization.
async function executeQuery(
  req: Request,
  appkit: any,
  sql: string,
  params?: any[]
): Promise<any> {
  const userConn = await getUserLakebaseConnection(req, appkit);
  if (userConn) {
    return userConn.query(sql, params || []);
  }
  // Fall back to app-level Lakebase (service principal)
  return appkit.lakebase.query(sql, params);
}

// ── Interchangeable-parts expansion ──────────────────────────────────
// The Gold bridge qx_ppmtx_synced_gold_bridge_part_interchangeable holds directed
// PN pairs (two-way materialized both directions; one-way base->alt only). This
// central helper lets any endpoint that names a part number automatically include
// its physically-equivalent alternates — the "whenever a PN appears, its
// interchangeable PNs are included" rule — without per-endpoint substitution logic.
// Non-transitive: only one hop from each seed PN.
const INTERCHANGE_TABLE = `${S}.qx_ppmtx_synced_gold_bridge_part_interchangeable`;

interface InterchangeAlt {
  pn: string;
  interchangeClass: "two_way" | "one_way";
  prefer: boolean;
  type: string;
}

// The synced bridge is small and refreshed once/day, so a process-lifetime cache
// with a short TTL avoids a round-trip on every analytics query.
const INTERCHANGE_TTL_MS = 60 * 60 * 1000; // 1 hour
let _interchangeCache: { at: number; map: Map<string, InterchangeAlt[]> } | null = null;

async function loadInterchangeMap(
  req: Request,
  appkit: any,
): Promise<Map<string, InterchangeAlt[]>> {
  const now = Date.now();
  if (_interchangeCache && now - _interchangeCache.at < INTERCHANGE_TTL_MS) {
    return _interchangeCache.map;
  }
  const map = new Map<string, InterchangeAlt[]>();
  try {
    const result = await executeQuery(
      req,
      appkit,
      `SELECT pn, pn_interchangeable, interchange_class, interchangeable_type, prefer
       FROM ${INTERCHANGE_TABLE}`,
    );
    for (const row of result.rows) {
      const base = String(row.pn ?? "").trim().toUpperCase();
      const alt = String(row.pn_interchangeable ?? "").trim();
      if (!base || !alt) continue;
      const list = map.get(base) ?? [];
      list.push({
        pn: alt,
        interchangeClass: String(row.interchange_class) === "one_way" ? "one_way" : "two_way",
        prefer: String(row.prefer ?? "").trim().toUpperCase() === "Y",
        type: String(row.interchangeable_type ?? "").trim(),
      });
      map.set(base, list);
    }
  } catch (err) {
    // If the bridge table isn't present/synced yet, degrade gracefully: expansion
    // becomes a no-op (callers fall back to their curated PN lists). Cache the empty
    // map briefly so a missing table isn't hammered on every request.
    console.warn(`[Interchangeable] load failed — expansion disabled: ${err}`);
  }
  _interchangeCache = { at: now, map };
  return map;
}

// One-hop expansion of a PN list to include direct interchangeable alternates.
// Seeds are preserved (original casing); de-duped case-insensitively.
function expandWithMap(map: Map<string, InterchangeAlt[]>, pns: string[]): string[] {
  const out = new Map<string, string>(); // UPPER(pn) -> original-cased pn
  for (const raw of pns) {
    const p = String(raw ?? "").trim();
    if (!p) continue;
    if (!out.has(p.toUpperCase())) out.set(p.toUpperCase(), p);
    for (const alt of map.get(p.toUpperCase()) ?? []) {
      if (!out.has(alt.pn.toUpperCase())) out.set(alt.pn.toUpperCase(), alt.pn);
    }
  }
  return [...out.values()];
}

await createApp({
  plugins: [server(), lakebase(), genie()],
  async onPluginsReady(appkit) {
    // NOTE: the synced tables are created/populated by the reverse-ETL pipeline,
    // so there is NO DDL or seed step here — the app is read-only over them.
    appkit.server.extend((app) => {
      // ── Health ───────────────────────────────────────────────────────
      app.get("/api/health/lakebase", async (req: Request, res: Response) => {
        try {
          const userConn = await getUserLakebaseConnection(req, appkit);
          if (userConn) {
            await userConn.query("SELECT 1");
            res.json({ connected: true, mode: "autoscaling", schema: S, auth: "user" });
          } else {
            await executeQuery(req, appkit, "SELECT 1");
            res.json({ connected: true, mode: "autoscaling", schema: S, auth: "app" });
          }
        } catch (err) {
          res.json({ connected: false, mode: "autoscaling", schema: S, error: String(err) });
        }
      });

      // ── Diagnostic endpoint for schema inspection ─────────────────────
      app.get("/api/debug/schema-inspection", async (req: Request, res: Response) => {
        const diagnostics: any = {};

        // 1. List tables
        try {
          const result = await executeQuery(
            req,
            appkit,
            `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name`,
            [S]
          );
          diagnostics.tables = result.rows.map((r: any) => r.table_name);
        } catch (err) {
          diagnostics.tables_error = String(err);
        }

        // 2. Inventory control columns
        try {
          const result = await executeQuery(
            req,
            appkit,
            `SELECT column_name, data_type FROM information_schema.columns 
             WHERE table_schema = $1 AND table_name LIKE '%inventory_control%' 
             ORDER BY table_name, ordinal_position`,
            [S]
          );
          diagnostics.inventory_control_columns = result.rows;
        } catch (err) {
          diagnostics.inventory_control_columns_error = String(err);
        }

        // 3. Inventory snapshot columns
        try {
          const result = await executeQuery(
            req,
            appkit,
            `SELECT column_name, data_type FROM information_schema.columns 
             WHERE table_schema = $1 AND table_name LIKE '%inventory_snapshot%' 
             ORDER BY table_name, ordinal_position`,
            [S]
          );
          diagnostics.inventory_snapshot_columns = result.rows;
        } catch (err) {
          diagnostics.inventory_snapshot_columns_error = String(err);
        }

        // 4. Distinct control values
        try {
          const result = await executeQuery(
            req,
            appkit,
            `SELECT DISTINCT control FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_control ORDER BY control LIMIT 50`
          );
          diagnostics.control_values = result.rows.map((r: any) => r.control);
        } catch (err) {
          diagnostics.control_values_error = String(err);
        }

        // 5. Sample inventory snapshot rows
        try {
          const result = await executeQuery(
            req,
            appkit,
            `SELECT sn, installed_ac, installed_position FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_snapshot 
             WHERE installed_ac IS NOT NULL LIMIT 5`
          );
          diagnostics.sample_inventory_snapshot = result.rows;
        } catch (err) {
          diagnostics.sample_inventory_snapshot_error = String(err);
        }

        // 6. Engine part numbers
        try {
          const result = await executeQuery(
            req,
            appkit,
            `SELECT DISTINCT pn, pn_description FROM ${S}.qx_ppmtx_synced_gold_dim_part 
             WHERE pn ILIKE '%CF34%' OR pn_description ILIKE '%CF34%' LIMIT 20`
          );
          diagnostics.engine_part_numbers = result.rows;
        } catch (err) {
          diagnostics.engine_part_numbers_error = String(err);
        }

        // 7. Check TSN count
        try {
          const result = await executeQuery(
            req,
            appkit,
            `SELECT COUNT(*) as count FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_control WHERE control = 'TSN'`
          );
          diagnostics.tsn_row_count = result.rows[0]?.count;
        } catch (err) {
          diagnostics.tsn_row_count_error = String(err);
        }

        res.json(diagnostics);
      });

      // ── Defects (list) ───────────────────────────────────────────────
      app.get("/api/defects", async (req: Request, res: Response) => {
        const limit = clampLimit(req.query.limit, 300, 2000);
        try {
          const result = await executeQuery(
            req,
            appkit,
            `SELECT f.fact_defect_key, f.defect_type, f.defect, f.defect_item,
                    a.ac AS tail,
                    LPAD(c.chapter::text, 2, '0') || '-' || LPAD(c.section::text, 2, '0') AS ata,
                    c.chapter_description AS ata_desc,
                    d.calendar_date AS reported_date,
                    f.defect_description, f.resolution_description,
                    f.delay_minutes, f.cancellation, f.fault_confirm, f.defer, f.status
             FROM ${S}.qx_ppmtx_synced_gold_fact_defect f
             LEFT JOIN ${S}.qx_ppmtx_synced_gold_dim_aircraft a ON f.dim_aircraft_key = a.dim_aircraft_key
             LEFT JOIN ${S}.qx_ppmtx_synced_gold_dim_ata_chapter c ON f.dim_ata_chapter_key = c.dim_ata_chapter_key
             LEFT JOIN ${S}.qx_ppmtx_synced_gold_dim_date d ON f.reported_date_key = d.dim_date_key
             WHERE c.chapter IN (${PROP_ATA_LIST})
             ORDER BY d.calendar_date DESC NULLS LAST
             LIMIT $1`,
            [limit],
          );
          res.json({ data: result.rows.map(mapDefect), source: "live" });
        } catch (err) {
          console.warn(`[Lakebase] /api/defects fallback: ${err}`);
          res.json({ data: MOCK_DEFECTS, source: "mock" });
        }
      });

      // ── Defects grouped by ATA chapter ───────────────────────────────
      app.get("/api/defects/by-ata", async (req: Request, res: Response) => {
        const limit = clampLimit(req.query.limit, 25, 200);
        const from = parseDateParam(req.query.from);
        const to = parseDateParam(req.query.to);
        try {
          const result = await executeQuery(
            req,
            appkit,
            `SELECT LPAD(c.chapter::text, 2, '0') || '-' || LPAD(c.section::text, 2, '0') AS ata,
                    MAX(c.chapter_description) AS description,
                    COUNT(*)::int AS count,
                    COALESCE(SUM(f.delay_minutes), 0)::int AS delay_minutes,
                    COUNT(*) FILTER (WHERE f.cancellation IS NOT NULL)::int AS cancels
             FROM ${S}.qx_ppmtx_synced_gold_fact_defect f
             JOIN ${S}.qx_ppmtx_synced_gold_dim_ata_chapter c ON f.dim_ata_chapter_key = c.dim_ata_chapter_key
             LEFT JOIN ${S}.qx_ppmtx_synced_gold_dim_date d ON f.reported_date_key = d.dim_date_key
             WHERE c.chapter IN (${PROP_ATA_LIST})
               AND ($2::date IS NULL OR d.calendar_date >= $2::date)
               AND ($3::date IS NULL OR d.calendar_date <= $3::date)
             GROUP BY 1
             ORDER BY count DESC
             LIMIT $1`,
            [limit, from, to],
          );
          res.json({ data: result.rows.map(mapDefectByAta), source: "live" });
        } catch (err) {
          console.warn(`[Lakebase] /api/defects/by-ata fallback: ${err}`);
          res.json({ data: MOCK_DEFECTS_BY_ATA, source: "mock" });
        }
      });

      // ── Per-ATA detail: top-3 defect types (keyword-classified) + most
      // recent defect. Used to power rich hover tooltips on the Defects by
      // ATA bar chart. Grouping is done in JS by classifyDefectText() rather
      // than exact narrative text, since free-text narratives rarely repeat
      // verbatim (see comment on classifyDefectText above).
      app.get("/api/defects/by-ata/detail", async (req: Request, res: Response) => {
        const from = parseDateParam(req.query.from);
        const to = parseDateParam(req.query.to);
        try {
          const result = await executeQuery(
            req,
            appkit,
            `SELECT LPAD(c.chapter::text, 2, '0') || '-' || LPAD(c.section::text, 2, '0') AS ata,
                    f.defect_description,
                    d.calendar_date::text AS calendar_date
             FROM ${S}.qx_ppmtx_synced_gold_fact_defect f
             JOIN ${S}.qx_ppmtx_synced_gold_dim_ata_chapter c ON f.dim_ata_chapter_key = c.dim_ata_chapter_key
             LEFT JOIN ${S}.qx_ppmtx_synced_gold_dim_date d ON f.reported_date_key = d.dim_date_key
             WHERE c.chapter IN (${PROP_ATA_LIST})
               AND ($1::date IS NULL OR d.calendar_date >= $1::date)
               AND ($2::date IS NULL OR d.calendar_date <= $2::date)
             ORDER BY d.calendar_date DESC NULLS LAST`,
            [from, to],
          );

          type DetailEntry = { ata: string; top3: { desc: string; count: number }[]; recentDesc: string; recentDate: string };
          const tagCounts = new Map<string, Map<string, number>>();
          const recent = new Map<string, { desc: string; date: string }>();
          for (const row of result.rows) {
            const ata = row.ata as string;
            const desc = row.defect_description as string | null;
            if (!desc || !desc.trim()) continue;
            const tag = classifyDefectText(desc);
            if (!tagCounts.has(ata)) tagCounts.set(ata, new Map());
            const counts = tagCounts.get(ata)!;
            counts.set(tag, (counts.get(tag) ?? 0) + 1);
            // Rows are ordered by calendar_date DESC, so the first row seen
            // per ATA is the most recent defect.
            if (!recent.has(ata)) {
              recent.set(ata, { desc, date: (row.calendar_date as string) || "" });
            }
          }

          const map = new Map<string, DetailEntry>();
          for (const [ata, counts] of tagCounts) {
            const top3 = Array.from(counts.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([desc, count]) => ({ desc, count }));
            const recentEntry = recent.get(ata);
            map.set(ata, {
              ata,
              top3,
              recentDesc: recentEntry?.desc ?? "",
              recentDate: recentEntry?.date ?? "",
            });
          }
          res.json({ data: Array.from(map.values()), source: "live" });
        } catch (err) {
          console.warn(`[Lakebase] /api/defects/by-ata/detail fallback: ${err}`);
          res.json({ data: [], source: "mock" });
        }
      });

      // ── Weekly defect trend ──────────────────────────────────────────
      // Includes weekly propulsion-attributable delay minutes alongside the
      // defect count (same fact_defect_delay source + ATA scoping as the
      // Overview KPI dropdowns), so the chart can overlay both series on a
      // shared weekly x-axis. FULL OUTER JOIN keeps a week even if it only
      // has one signal (e.g. defects but no delay events that week).
      app.get("/api/defects/weekly-trend", async (req: Request, res: Response) => {
        const weeks = clampLimit(req.query.weeks, 12, 104);
        try {
          const result = await executeQuery(
            req,
            appkit,
            `WITH week_dates AS (
               SELECT year, week_of_year AS week, MAX(calendar_date) AS week_end_date
               FROM ${S}.qx_ppmtx_synced_gold_dim_date
               GROUP BY year, week_of_year
             ),
             defect_weeks AS (
               SELECT d.year, d.week_of_year AS week, COUNT(*)::int AS count
               FROM ${S}.qx_ppmtx_synced_gold_fact_defect f
               JOIN ${S}.qx_ppmtx_synced_gold_dim_date d ON f.reported_date_key = d.dim_date_key
               JOIN ${S}.qx_ppmtx_synced_gold_dim_ata_chapter c ON f.dim_ata_chapter_key = c.dim_ata_chapter_key
               WHERE c.chapter IN (${PROP_ATA_LIST})
               GROUP BY d.year, d.week_of_year
             ),
             delay_weeks AS (
               SELECT d.year, d.week_of_year AS week, COALESCE(SUM(fd.delay_minutes), 0)::int AS delay_minutes
               FROM ${S}.qx_ppmtx_synced_gold_fact_defect_delay fd
               JOIN ${S}.qx_ppmtx_synced_gold_fact_defect f
                 ON fd.defect_type = f.defect_type AND fd.defect = f.defect AND fd.defect_item = f.defect_item
               JOIN ${S}.qx_ppmtx_synced_gold_dim_ata_chapter c ON f.dim_ata_chapter_key = c.dim_ata_chapter_key
               JOIN ${S}.qx_ppmtx_synced_gold_dim_date d ON fd.delay_date_key = d.dim_date_key
               WHERE c.chapter IN (${PROP_ATA_LIST})
               GROUP BY d.year, d.week_of_year
             )
             SELECT COALESCE(dw.year, dl.year) AS year,
                    COALESCE(dw.week, dl.week) AS week,
                    wd.week_end_date::text AS week_end_date,
                    COALESCE(dw.count, 0) AS count,
                    COALESCE(dl.delay_minutes, 0) AS delay_minutes
             FROM defect_weeks dw
             FULL OUTER JOIN delay_weeks dl ON dw.year = dl.year AND dw.week = dl.week
             JOIN week_dates wd ON wd.year = COALESCE(dw.year, dl.year) AND wd.week = COALESCE(dw.week, dl.week)
             ORDER BY year DESC, week DESC
             LIMIT $1`,
            [weeks],
          );
          // reverse so the chart reads oldest → newest
          const data = result.rows.reverse().map(mapWeeklyTrend);
          res.json({ data, source: "live" });
        } catch (err) {
          console.warn(`[Lakebase] /api/defects/weekly-trend fallback: ${err}`);
          res.json({ data: MOCK_WEEKLY_DEFECT_TREND, source: "mock" });
        }
      });

      // ── Soft Time Recommendations (component shop visit intervals) ────
      app.get("/api/soft-times", async (req: Request, res: Response) => {
        const softTimeConfig = SOFT_TIME_CONFIG;
        try {
          // Run one query per component using LIKE matching; UNION ALL them together.
          //
          // Correctness notes (see the current-state CTE below):
          //  • The snapshot fact accumulates one row PER BATCH, so a serial has many
          //    historical rows across years/aircraft/conditions. We must reduce to the
          //    CURRENT state (latest batch per dim_part_key + sn) before counting.
          //  • Serial numbers are NOT unique across part numbers, so TSO is joined on
          //    BOTH dim_part_key AND sn — never sn alone (which cross-contaminates hours).
          //  • Scrapped units (condition SCRP) are excluded from the fleet unit
          //    count; all other conditions — including BADSTOCK and U/S — are kept.
          //  • Outlier/sentinel hour values (> 2× the soft limit) are dropped from the
          //    TSO min/avg/max stats. Live TSO is preferred (accounts for accumulated
          //    flight hours since last overhaul); falls back to static TSO if not yet
          //    reconstructed.
          const wantInterchange = String(req.query.interchange ?? "1") !== "0";
          const interMap = wantInterchange ? await loadInterchangeMap(req, appkit) : null;
          const unionParts = softTimeConfig.map(({ likePattern, pnList, displayName, softLimit }) => {
            // Augment explicit-PN components with their interchangeable alternates so
            // no physically-equivalent unit is missed (non-transitive, one hop).
            const effectivePnList = pnList && interMap ? expandWithMap(interMap, pnList) : pnList;
            const partFilter = effectivePnList
              ? `p.pn IN (${effectivePnList.map(pn => `'${pn.replace(/'/g, "''")}'`).join(", ")})`
              : `UPPER(p.pn_description) LIKE UPPER('%${(likePattern ?? "").replace(/'/g, "''").replace(/^%+|%+$/g, "")}%')`;
            const cap = softLimit * 2;
            return `
              SELECT
                '${displayName.replace(/'/g, "''")}' AS display_name,
                STRING_AGG(DISTINCT cs.pn, ', ' ORDER BY cs.pn) AS part_numbers,
                COUNT(*)::int AS unit_count,
                MAX(CASE WHEN cs.tso_hours > 0 AND cs.tso_hours <= ${cap} THEN cs.tso_hours END)::int AS max_tso,
                AVG(CASE WHEN cs.tso_hours > 0 AND cs.tso_hours <= ${cap} THEN cs.tso_hours END)::float AS avg_tso,
                MIN(CASE WHEN cs.tso_hours > 0 AND cs.tso_hours <= ${cap} THEN cs.tso_hours END)::int AS min_tso
              FROM (
                SELECT cur.pn, COALESCE(plt.live_tso, t.tso_hours) AS tso_hours
                FROM (
                  SELECT p.pn, snap.dim_part_key, snap.sn, snap.condition,
                    ROW_NUMBER() OVER (
                      PARTITION BY snap.dim_part_key, snap.sn
                      ORDER BY snap.snapshot_date_key DESC, snap.batch DESC
                    ) AS rn
                  FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_snapshot snap
                  JOIN ${S}.qx_ppmtx_synced_gold_dim_part p ON snap.dim_part_key = p.dim_part_key
                  WHERE ${partFilter}
                ) cur
                LEFT JOIN (
                  SELECT dim_part_key, sn, MAX(actual_hours) AS tso_hours
                  FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_control
                  WHERE control = 'TSO'
                  GROUP BY dim_part_key, sn
                ) t ON t.dim_part_key = cur.dim_part_key AND t.sn = cur.sn
                LEFT JOIN ${S}.qx_ppmtx_synced_gold_part_live_tso plt ON cur.pn = plt.pn AND cur.sn = plt.sn
                WHERE cur.rn = 1 AND cur.condition NOT IN ('SCRP')
              ) cs`;
          });

          const result = await executeQuery(
            req,
            appkit,
            unionParts.join("\n              UNION ALL\n") + "\n              ORDER BY display_name",
          );

          // Build response in config order
          const byName: Record<string, { partNumbers: string; unitCount: number; maxTso: number; avgTso: number; minTso: number }> = {};
          for (const row of result.rows) {
            byName[String(row.display_name)] = {
              partNumbers: String(row.part_numbers ?? ""),
              unitCount: Number(row.unit_count) || 0,
              maxTso: Number(row.max_tso) || 0,
              avgTso: Math.round(Number(row.avg_tso) || 0),
              minTso: Number(row.min_tso) || 0,
            };
          }

          const data = softTimeConfig.map(({ displayName, softLimit }) => {
            const stats = byName[displayName];
            return {
              displayName,
              partNumbers: stats?.partNumbers ?? "",
              softLimit,
              unitCount: stats?.unitCount ?? 0,
              maxTso: stats?.maxTso ?? 0,
              avgTso: stats?.avgTso ?? 0,
              minTso: stats?.minTso ?? 0,
            };
          });

          res.json({ data, source: "live" });
        } catch (err) {
          console.warn(`[Lakebase] /api/soft-times fallback: ${err}`);
          // Fallback with static soft limits only
          const fallback = softTimeConfig.map(({ displayName, softLimit }) => ({
            displayName, partNumbers: "", softLimit, unitCount: 0, maxTso: 0, avgTso: 0, minTso: 0,
          }));
          res.json({ data: fallback, source: "mock" });
        }
      });

      // ── Overhaul Forecast (LLP / soft-time budget projection) ────────
      // For a chosen utilization rate (hrs/day) and forward window (months),
      // projects each CURRENT-STATE unit's TSO forward and flags the units that
      // will cross their component soft limit within the window. Used by the
      // Parts page overhaul-budget planner.
      app.get("/api/overhaul-forecast", async (req: Request, res: Response) => {
        const softTimeConfig = SOFT_TIME_CONFIG;

        // Utilization rate (hours flown per day). Default 7.5. Clamped to a sane range.
        let hrsPerDay = parseFloat(String(req.query.hrsPerDay ?? ""));
        if (!Number.isFinite(hrsPerDay) || hrsPerDay <= 0) hrsPerDay = 7.5;
        hrsPerDay = Math.min(hrsPerDay, 24);

        // Forward window in months. Default 12. Clamped 1..120.
        const months = clampLimit(req.query.months, 12, 120);
        const windowDays = months * 30.44;
        const projectedHours = hrsPerDay * windowDays; // hours accrued over the window

        try {
          // One subquery per component returning the affected CURRENT-STATE units:
          // those whose TSO is high enough that (TSO + projectedHours) reaches the
          // soft limit within the window — plus units already past the limit.
          // Sentinel/outlier hours (> 2× limit) are excluded as bad data.
          // Live TSO is preferred (accounts for accumulated flight hours since last
          // overhaul); falls back to static TSO if not yet reconstructed.
          const wantInterchange = String(req.query.interchange ?? "1") !== "0";
          const interMap = wantInterchange ? await loadInterchangeMap(req, appkit) : null;
          const unionParts = softTimeConfig.map(({ likePattern, pnList, displayName, softLimit }) => {
            // Augment explicit-PN components with their interchangeable alternates so
            // no physically-equivalent unit is missed (non-transitive, one hop).
            const effectivePnList = pnList && interMap ? expandWithMap(interMap, pnList) : pnList;
            const partFilter = effectivePnList
              ? `p.pn IN (${effectivePnList.map(pn => `'${pn.replace(/'/g, "''")}'`).join(", ")})`
              : `UPPER(p.pn_description) LIKE UPPER('%${(likePattern ?? "").replace(/'/g, "''").replace(/^%+|%+$/g, "")}%')`;
            const cap = softLimit * 2;
            const threshold = softLimit - projectedHours; // TSO at/above this crosses within window
            return `
              SELECT
                '${displayName.replace(/'/g, "''")}' AS display_name,
                ${softLimit} AS soft_limit,
                cs.pn, cs.sn, cs.tso_hours
              FROM (
                SELECT cur.pn, cur.sn, COALESCE(plt.live_tso, t.tso_hours) AS tso_hours
                FROM (
                  SELECT p.pn, snap.dim_part_key, snap.sn, snap.condition,
                    ROW_NUMBER() OVER (
                      PARTITION BY snap.dim_part_key, snap.sn
                      ORDER BY snap.snapshot_date_key DESC, snap.batch DESC
                    ) AS rn
                  FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_snapshot snap
                  JOIN ${S}.qx_ppmtx_synced_gold_dim_part p ON snap.dim_part_key = p.dim_part_key
                  WHERE ${partFilter}
                ) cur
                LEFT JOIN (
                  SELECT dim_part_key, sn, MAX(actual_hours) AS tso_hours
                  FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_control
                  WHERE control = 'TSO'
                  GROUP BY dim_part_key, sn
                ) t ON t.dim_part_key = cur.dim_part_key AND t.sn = cur.sn
                LEFT JOIN ${S}.qx_ppmtx_synced_gold_part_live_tso plt ON cur.pn = plt.pn AND cur.sn = plt.sn
                WHERE cur.rn = 1 AND cur.condition NOT IN ('SCRP')
              ) cs
              WHERE cs.tso_hours > 0 AND cs.tso_hours <= ${cap}
                AND cs.tso_hours >= ${threshold}`;
          });

          const result = await executeQuery(
            req,
            appkit,
            unionParts.join("\n              UNION ALL\n"),
          );

          const now = Date.now();
          const DAY_MS = 86_400_000;

          // Group the affected units by component and compute per-unit projections.
          const groups: Record<string, any> = {};
          for (const { displayName, softLimit } of softTimeConfig) {
            groups[displayName] = { displayName, softLimit, alreadyDue: 0, dueInWindow: 0, units: [] as any[] };
          }
          for (const row of result.rows) {
            const displayName = String(row.display_name);
            const softLimit = Number(row.soft_limit) || 0;
            const tso = Number(row.tso_hours) || 0;
            const g = groups[displayName];
            if (!g) continue;

            const hoursRemaining = softLimit - tso;      // < 0 → already past limit
            const daysUntil = hoursRemaining / hrsPerDay; // may be negative
            const alreadyDue = hoursRemaining <= 0;
            const crossDate = new Date(now + daysUntil * DAY_MS).toISOString().slice(0, 10);

            if (alreadyDue) g.alreadyDue += 1;
            else g.dueInWindow += 1;

            g.units.push({
              pn: String(row.pn ?? ""),
              sn: String(row.sn ?? ""),
              tso: Math.round(tso),
              hoursRemaining: Math.round(hoursRemaining),
              projectedCrossDate: crossDate,
              status: alreadyDue ? "overdue" : "due",
            });
          }

          // Sort each component's units by soonest crossing first.
          const data = softTimeConfig.map(({ displayName }) => {
            const g = groups[displayName];
            g.units.sort((a: any, b: any) => a.hoursRemaining - b.hoursRemaining);
            g.totalFlagged = g.units.length;
            return g;
          });

          res.json({
            data,
            meta: { hrsPerDay, months, windowDays: Math.round(windowDays) },
            source: "live",
          });
        } catch (err) {
          console.warn(`[Lakebase] /api/overhaul-forecast fallback: ${err}`);
          const fallback = softTimeConfig.map(({ displayName, softLimit }) => ({
            displayName, softLimit, alreadyDue: 0, dueInWindow: 0, totalFlagged: 0, units: [],
          }));
          res.json({ data: fallback, meta: { hrsPerDay, months, windowDays: Math.round(windowDays) }, source: "mock" });
        }
      });

      // ── Parts (life-limited / inventory control) ─────────────────────
      app.get("/api/parts", async (req: Request, res: Response) => {
        const limit = clampLimit(req.query.limit, 300, 2000);
        try {
          const result = await executeQuery(
            req,
            appkit,
            `SELECT ic.pn, ic.sn, p.pn_description AS description,
                    ic.control, ic.actual_hours, ic.actual_cycles,
                    ic.schedule_cycles, ic.remaining_cycles,
                    plt.live_tso, plt.baseline_tso_hours, plt.flight_hours_since_reset
             FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_control ic
             LEFT JOIN ${S}.qx_ppmtx_synced_gold_dim_part p ON ic.dim_part_key = p.dim_part_key
             LEFT JOIN ${S}.qx_ppmtx_synced_gold_part_live_tso plt ON ic.sn = plt.sn AND ic.pn = plt.pn
             WHERE ic.dim_part_key IN (${PROP_PART_POPULATION})
             ORDER BY (ic.control = 'LL') DESC, ic.remaining_cycles ASC NULLS LAST
             LIMIT $1`,
            [limit],
          );
          res.json({ data: result.rows.map(mapPart), source: "live" });
        } catch (err) {
          console.warn(`[Lakebase] /api/parts fallback: ${err}`);
          res.json({ data: MOCK_PARTS, source: "mock" });
        }
      });

      // ── Interchangeable P/Ns for a given part ─────────────────────────
      // Returns every part number interchangeable with :pn (two-way + one-way),
      // preferred + two-way first. Powers the Parts-page detail panel and any
      // caller that wants to show alternates when a PN is queried.
      app.get("/api/interchangeable/:pn", async (req: Request, res: Response) => {
        const pn = String(req.params.pn ?? "").trim();
        if (!pn) {
          res.json({ data: [], source: "live" });
          return;
        }
        try {
          const result = await executeQuery(
            req,
            appkit,
            `SELECT pn_interchangeable, interchange_class, interchangeable_type, prefer, manufacturer
             FROM ${INTERCHANGE_TABLE}
             WHERE UPPER(pn) = UPPER($1)
             ORDER BY (interchange_class = 'two_way') DESC,
                      (UPPER(COALESCE(prefer, '')) = 'Y') DESC,
                      pn_interchangeable`,
            [pn],
          );
          const data = result.rows.map((r: Record<string, unknown>) => ({
            pn: String(r.pn_interchangeable ?? ""),
            interchangeClass: String(r.interchange_class ?? ""),
            type: String(r.interchangeable_type ?? ""),
            prefer: String(r.prefer ?? "").trim().toUpperCase() === "Y",
            manufacturer: String(r.manufacturer ?? ""),
          }));
          res.json({ data, source: "live" });
        } catch (err) {
          console.warn(`[Lakebase] /api/interchangeable fallback: ${err}`);
          res.json({ data: [], source: "mock" });
        }
      });

      // ── Spares (on-hand inventory by part / station / condition) ─────
      app.get("/api/spares", async (req: Request, res: Response) => {
        const limit = clampLimit(req.query.limit, 500, 5000);
        try {
          const result = await executeQuery(
            req,
            appkit,
            `SELECT p.pn AS part_number, MAX(p.pn_description) AS description,
                    s.station_code AS station, sn.condition,
                    COUNT(*)::int AS quantity
             FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_snapshot sn
             JOIN ${S}.qx_ppmtx_synced_gold_dim_part p ON sn.dim_part_key = p.dim_part_key
             LEFT JOIN ${S}.qx_ppmtx_synced_gold_dim_station s ON sn.dim_station_key = s.dim_station_key
             WHERE sn.dim_part_key IN (${PROP_PART_POPULATION})
             GROUP BY p.pn, s.station_code, sn.condition
             ORDER BY quantity DESC
             LIMIT $1`,
            [limit],
          );
          res.json({ data: result.rows.map(mapSpare), source: "live" });
        } catch (err) {
          console.warn(`[Lakebase] /api/spares fallback: ${err}`);
          res.json({ data: MOCK_SPARES, source: "mock" });
        }
      });

      // ── Engines (fleet aircraft) ─────────────────────────────────────
      app.get("/api/engines", async (req: Request, res: Response) => {
        const limit = clampLimit(req.query.limit, 200, 2000);
        try {
          const result = await executeQuery(
            req,
            appkit,
            `WITH engine_tsn AS (
              SELECT 
                ic.sn AS engine_sn,
                snap.installed_ac AS tail,
                CASE 
                  WHEN TRIM(snap.installed_position) = 'LH ENG' THEN 'ENG-1'
                  WHEN TRIM(snap.installed_position) = 'RH ENG' THEN 'ENG-2'
                  ELSE TRIM(snap.installed_position)
                END AS position,
                ic.actual_hours AS total_hours,
                ic.actual_cycles AS total_cycles,
                ROW_NUMBER() OVER (
                  PARTITION BY snap.installed_ac, TRIM(snap.installed_position)
                  ORDER BY ic.actual_hours DESC
                ) AS rn
              FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_control ic
              JOIN ${S}.qx_ppmtx_synced_gold_dim_part p ON ic.dim_part_key = p.dim_part_key
              JOIN ${S}.qx_ppmtx_synced_gold_fact_inventory_snapshot snap ON ic.sn = snap.sn
              WHERE ic.control = 'TSN'
                AND p.pn = 'CF34-8E5G01'
                AND snap.installed_ac IS NOT NULL
            ),
            engine_tsr AS (
              SELECT ic.sn, d.calendar_date AS last_shop_visit
              FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_control ic
              JOIN ${S}.qx_ppmtx_synced_gold_dim_part p ON ic.dim_part_key = p.dim_part_key
              JOIN ${S}.qx_ppmtx_synced_gold_dim_date d ON ic.reset_date_key = d.dim_date_key
              WHERE ic.control = 'TSR'
                AND p.pn = 'CF34-8E5G01'
            )
            SELECT 
              t.engine_sn, t.tail, t.position,
              COALESCE(elt.live_tsn, t.total_hours)::integer AS total_hours,
              COALESCE(elt.live_tsc, t.total_cycles)::integer AS total_cycles,
              elt.as_of_date AS live_times_as_of,
              tsr.last_shop_visit
            FROM engine_tsn t
            LEFT JOIN engine_tsr tsr ON t.engine_sn = tsr.sn
            LEFT JOIN ${S}.qx_ppmtx_synced_gold_engine_live_times elt
              ON elt.engine_sn = t.engine_sn
            WHERE t.rn = 1
            ORDER BY t.tail
            LIMIT $1`,
            [limit],
          );
          // Live engine TSN/TSC come from the synced gold table
          // qx_ppmtx_synced_gold_engine_live_times (airframe-hours-since-install,
          // refreshed by the gold merge job). COALESCE above falls back to the
          // frozen fact_inventory_control value for any SN not yet reconstructed.
          const liveTimesAsOf = result.rows.find((r: any) => r.live_times_as_of)
            ?.live_times_as_of ?? null;
          res.json({
            data: result.rows.map(mapEngine),
            source: "live",
            liveTimesAsOf,
          });
        } catch (err) {
          console.warn(`[Lakebase] /api/engines fallback: ${err}`);
          res.json({ data: MOCK_ENGINES, source: "mock" });
        }
      });

      // ── APUs (auxiliary power units, fleet aircraft) ───────────────────────────────────────
      app.get("/api/apus", async (req: Request, res: Response) => {
        const limit = clampLimit(req.query.limit, 200, 2000);
        try {
          const result = await executeQuery(
            req,
            appkit,
            `WITH apu_tsn AS (
              SELECT 
                ic.sn AS apu_sn,
                snap.installed_ac AS tail,
                ic.actual_hours AS total_hours,
                ic.actual_cycles AS total_cycles,
                ROW_NUMBER() OVER (PARTITION BY snap.installed_ac ORDER BY ic.actual_hours DESC) AS rn
              FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_control ic
              JOIN ${S}.qx_ppmtx_synced_gold_dim_part p ON ic.dim_part_key = p.dim_part_key
              JOIN ${S}.qx_ppmtx_synced_gold_fact_inventory_snapshot snap ON ic.sn = snap.sn
              WHERE ic.control = 'TSN'
                AND p.pn = '4505001B'
                AND snap.installed_ac IS NOT NULL
            ),
            apu_tsr AS (
              SELECT ic.sn, d.calendar_date AS last_shop_visit
              FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_control ic
              JOIN ${S}.qx_ppmtx_synced_gold_dim_part p ON ic.dim_part_key = p.dim_part_key
              JOIN ${S}.qx_ppmtx_synced_gold_dim_date d ON ic.reset_date_key = d.dim_date_key
              WHERE ic.control = 'TSR'
                AND p.pn = '4505001B'
            )
            SELECT 
              t.apu_sn,
              t.tail,
              t.total_hours::integer AS total_hours,
              t.total_cycles::integer AS total_cycles,
              tsr.last_shop_visit
            FROM apu_tsn t
            LEFT JOIN apu_tsr tsr ON t.apu_sn = tsr.sn
            WHERE t.rn = 1
            ORDER BY t.tail
            LIMIT $1`,
            [limit],
          );
          res.json({ data: result.rows.map(mapAPU), source: "live" });
        } catch (err) {
          console.warn(`[Lakebase] /api/apus fallback: ${err}`);
          res.json({ data: MOCK_APUS, source: "mock" });
        }
      });

      // ── Engine/APU Build-Up (hierarchical part tree) ───────────────────────────────────────
      app.get("/api/engine-buildup/:sn", async (req: Request, res: Response) => {
        const parentSn = req.params.sn;
        try {
          // Level 1: direct children of the engine/APU
          const level1 = await executeQuery(
            req,
            appkit,
            `SELECT s.sn, p.pn, p.pn_description AS description,
                    s.condition, s.installed_position AS position,
                    s.nha_sn, s.nha_pn
             FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_snapshot s
             JOIN ${S}.qx_ppmtx_synced_gold_dim_part p ON s.dim_part_key = p.dim_part_key
             WHERE s.nha_sn = $1
             ORDER BY p.pn`,
            [parentSn],
          );

          // Collect level-1 SNs to find their children (level 2)
          const level1Sns = level1.rows.map((r: any) => r.sn).filter(Boolean);

          let level2Rows: any[] = [];
          if (level1Sns.length > 0) {
            const level2Result = await executeQuery(
              req,
              appkit,
              `SELECT s.sn, p.pn, p.pn_description AS description,
                      s.condition, s.installed_position AS position,
                      s.nha_sn, s.nha_pn
               FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_snapshot s
               JOIN ${S}.qx_ppmtx_synced_gold_dim_part p ON s.dim_part_key = p.dim_part_key
               WHERE s.nha_sn = ANY($1::text[])
               ORDER BY s.nha_sn, p.pn`,
              [level1Sns],
            );
            level2Rows = level2Result.rows;
          }

          // Build the tree: attach children to their parent
          const childrenByParent: Record<string, any[]> = {};
          for (const row of level2Rows) {
            const key = row.nha_sn;
            if (!childrenByParent[key]) childrenByParent[key] = [];
            childrenByParent[key].push({
              sn: row.sn,
              pn: row.pn,
              description: String(row.description ?? "").replace(/\r\n/g, "").trim(),
              condition: row.condition,
              position: row.position,
            });
          }

          const tree = level1.rows.map((row: any) => ({
            sn: row.sn,
            pn: row.pn,
            description: String(row.description ?? "").replace(/\r\n/g, "").trim(),
            condition: row.condition,
            position: row.position,
            children: childrenByParent[row.sn] || [],
          }));

          res.json({ data: tree, parentSn, source: "live" });
        } catch (err) {
          console.warn(`[Lakebase] /api/engine-buildup/${parentSn} error: ${err}`);
          res.json({ data: [], parentSn, source: "mock" });
        }
      });

      // ── Fleet Leaders (highest-time engine and APU currently in service) ─────────────────────
      app.get("/api/fleet-leaders", async (req: Request, res: Response) => {
        try {
          const result = await executeQuery(
            req,
            appkit,
            `WITH engine_tsn AS (
              SELECT 
                ic.sn, snap.installed_ac AS tail,
                ic.actual_hours AS frozen_hours,
                ic.actual_cycles AS frozen_cycles,
                ROW_NUMBER() OVER (
                  ORDER BY COALESCE(elt.live_tsn, ic.actual_hours) DESC
                ) AS rn
              FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_control ic
              JOIN ${S}.qx_ppmtx_synced_gold_dim_part p ON ic.dim_part_key = p.dim_part_key
              JOIN ${S}.qx_ppmtx_synced_gold_fact_inventory_snapshot snap ON ic.sn = snap.sn
              LEFT JOIN ${S}.qx_ppmtx_synced_gold_engine_live_times elt ON elt.engine_sn = ic.sn
              WHERE ic.control = 'TSN'
                AND p.pn = 'CF34-8E5G01'
                AND snap.installed_ac IS NOT NULL
            ),
            engine_leader AS (
              SELECT 
                t.sn, t.tail,
                COALESCE(elt.live_tsn, t.frozen_hours)::integer AS total_hours,
                COALESCE(elt.live_tsc, t.frozen_cycles)::integer AS total_cycles
              FROM engine_tsn t
              LEFT JOIN ${S}.qx_ppmtx_synced_gold_engine_live_times elt ON elt.engine_sn = t.sn
              WHERE t.rn = 1
            ),
            apu_leader AS (
              SELECT 
                ic.sn, snap.installed_ac AS tail,
                ic.actual_hours::integer AS total_hours,
                ic.actual_cycles::integer AS total_cycles,
                ROW_NUMBER() OVER (ORDER BY ic.actual_hours DESC) AS rn
              FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_control ic
              JOIN ${S}.qx_ppmtx_synced_gold_dim_part p ON ic.dim_part_key = p.dim_part_key
              JOIN ${S}.qx_ppmtx_synced_gold_fact_inventory_snapshot snap ON ic.sn = snap.sn
              WHERE ic.control = 'TSN'
                AND p.pn = '4505001B'
                AND snap.installed_ac IS NOT NULL
            )
            SELECT 'ENGINE' AS type, sn, tail, total_hours, total_cycles
            FROM engine_leader
            UNION ALL
            SELECT 'APU' AS type, sn, tail, total_hours, total_cycles
            FROM apu_leader WHERE rn = 1`,
          );
          
          const data: { engine?: Record<string, unknown>; apu?: Record<string, unknown> } = {};
          result.rows.forEach((row: Record<string, unknown>) => {
            if (row.type === "ENGINE") {
              data.engine = {
                sn: String(row.sn ?? ""),
                tail: String(row.tail ?? ""),
                hours: Number(row.total_hours ?? 0),
                cycles: Number(row.total_cycles ?? 0),
              };
            } else if (row.type === "APU") {
              data.apu = {
                sn: String(row.sn ?? ""),
                tail: String(row.tail ?? ""),
                hours: Number(row.total_hours ?? 0),
                cycles: Number(row.total_cycles ?? 0),
              };
            }
          });
          
          res.json({ data, source: "live" });
        } catch (err) {
          console.warn(`[Lakebase] /api/fleet-leaders fallback: ${err}`);
          res.json(MOCK_FLEET_LEADERS);
        }
      });

      // ── Serviceable Spares (spare engines / APUs not installed, no active RO) ─────────────────────
      app.get("/api/serviceable-spares", async (req: Request, res: Response) => {
        const type = String(req.query.type || "ENGINE").toUpperCase();
        
        // Build the filter for engine or APU part numbers
        const pnFilter = type === "APU" 
          ? `p.pn IN (${APU_SQL_LIST})`
          : `p.pn = '${ENGINE_PN.replace(/'/g, "''")}'`;
        
        try {
          // Spares are whole engines/APUs that are:
          // 1. Not currently installed (installed_ac IS NULL)
          // 2. Not on an active RO (order_type='RO' AND status='OPEN')
          const result = await executeQuery(
            req,
            appkit,
            `WITH spare_candidates AS (
               SELECT DISTINCT fs.sn
               FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_snapshot fs
               JOIN ${S}.qx_ppmtx_synced_gold_dim_part p ON fs.dim_part_key = p.dim_part_key
               WHERE ${pnFilter}
                 AND fs.installed_ac IS NULL
             ),
             no_active_ro AS (
               SELECT sc.sn
               FROM spare_candidates sc
               LEFT JOIN ${S}.qx_ppmtx_synced_gold_fact_order fo ON sc.sn = fo.sn
                 AND fo.order_type = 'RO' AND fo.status = 'OPEN'
               WHERE fo.fact_order_key IS NULL
             )
             SELECT array_agg(sn ORDER BY sn)::text[] AS esns, count(*)::int AS total
             FROM no_active_ro`,
          );
          
          const row = result.rows[0] || { esns: [], total: 0 };
          res.json({
            data: {
              total: Number(row.total) || 0,
              esns: Array.isArray(row.esns) ? row.esns.filter((e: any) => e != null) : [],
              type: type,
            },
            source: "live",
          });
        } catch (err) {
          console.warn(`[Lakebase] /api/serviceable-spares fallback: ${err}`);
          res.json({
            data: { total: 0, esns: [], type: type },
            source: "mock",
          });
        }
      });

      // ── Diagnostic: Check transaction history for specific SNs ──────────────────────
      app.get("/api/critical-spares-debug", async (req: Request, res: Response) => {
        const pn = String(req.query.pn || "4120T00P60");
        const sns = (String(req.query.sns || "LMDBG310,LMDAG909,LMDBG272").split(",")).map(s => s.trim());
        
        console.log(`[DEBUG] Querying spares for PN: ${pn}, SNs: ${sns.join(", ")}`);
        
        try {
          // Show all transactions for these SNs with extended diagnostics
          const result = await executeQuery(
            req,
            appkit,
            `SELECT 
               p.pn,
               t.sn,
               t.transaction_no,
               t.transaction_type,
               t.qty,
               LOWER(TRIM(t.transaction_type)) AS transaction_type_clean,
               ROW_NUMBER() OVER (PARTITION BY p.pn, t.sn ORDER BY t.transaction_no DESC) AS rn
             FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_transaction t
             LEFT JOIN ${S}.qx_ppmtx_synced_gold_dim_part p ON t.dim_part_key = p.dim_part_key
             WHERE (p.pn = $1 OR p.pn IS NULL) 
               AND TRIM(t.sn) IN (${sns.map((_, i) => `TRIM($${i + 2})`).join(", ")})
             ORDER BY t.sn, t.transaction_no DESC`,
            [pn, ...sns],
          );

          console.log(`[DEBUG] Query returned ${result.rows.length} rows`);
          if (result.rows.length > 0) {
            console.log(`[DEBUG] First row:`, result.rows[0]);
          }

          // Show what's the latest per SN
          const latestPerSn = result.rows.filter((r: any) => r.rn === 1);
          
          // Show which would qualify as "spares" with OLD logic (R/I only)
          const sparesWithRILogic = latestPerSn.filter((r: any) => 
            ['r/i', 'r/i-nla', 'r/i-nlk'].includes(String(r.transaction_type_clean || ''))
          );

          // Show which would qualify as "spares" with NEW warehouse logic
          const warehouseStates = ['r/i', 'bin/transfer', 'to/receiving', 'ro/receiving', 'initial/load'];
          const sparesWithWarehouseLogic = latestPerSn.filter((r: any) => 
            warehouseStates.includes(String(r.transaction_type_clean || ''))
          );

          console.log(`[DEBUG] Latest per SN: ${latestPerSn.length}, Spares (R/I only): ${sparesWithRILogic.length}, Spares (warehouse): ${sparesWithWarehouseLogic.length}`);

          res.json({
            pn,
            sns,
            summary: {
              total_rows: result.rows.length,
              latest_per_sn: latestPerSn.length,
              spares_ri_only: sparesWithRILogic.length,
              spares_warehouse: sparesWithWarehouseLogic.length,
              transaction_types_seen: [...new Set(result.rows.map((r: any) => r.transaction_type))],
            },
            all_transactions: result.rows.slice(0, 100), // First 100 for debugging
            latest_per_sn: latestPerSn,
            spares_with_ri_logic: sparesWithRILogic,
            spares_with_warehouse_logic: sparesWithWarehouseLogic,
          });
        } catch (err) {
          console.error(`[Lakebase] /api/critical-spares-debug error:`, err);
          res.json({ error: String(err), pn, sns });
        }
      });

      // ── Critical Spares (for Spare Quick View widget) ──────────────────────────────
      app.get("/api/critical-spares", async (req: Request, res: Response) => {
        // Part mapping: part name → array of PNs for that part.
        // Some entries include interchangeable/superseding PNs used by other
        // vendors/programs for the same physical part.
        // NOTE: This widget intentionally uses a hand-curated PN list and does
        // NOT apply the app-wide interchangeable-PN expansion. Many interchangeable
        // PNs are outdated (superseded by SB revisions) and only clutter the view
        // with 0-unit rows. These are the specific PNs Engineering confirmed have
        // actual units tracked in our system.
        const partMap: Record<string, string[]> = {
          "FADEC": ["4120T00P60", "4120T00P63"],
          "FMU": ["4120T01P02"],
          "SEAL PRV": ["421645-2"],
          "ENG FUEL PUMP": ["829500-7", "829500-9"],
          "ENG OBV": ["5080046-103"],
          "ENG ATS": ["4120T06P10"],
          "APU ANTI-SURGE VALVE": ["4954226"],
          "T2 AIR TEMP SENSOR": ["4119T30P07"],
          "APU INLET SILENCER": ["4953193"],
          "APU ESC": ["4508022", "4954309"],
          "APU FUEL MODULE ASSY": ["4505008G", "4505008H"],
          "ENG IGNITION EXCITER": ["9238M66P11"],
          "ENG FUEL LOW PRESSURE SWITCH": ["1103P1114-01"],
          "OIL LEVEL TANK INDICATOR": ["4121T65P02"],
          "APU BSG": ["4952826"],
          "ENG SCV": ["4120T05P04"],
          "APU FADEC": ["4505003M"],
        };

        // All unique PNs from the curated map
        const allPns = [...new Set(Object.values(partMap).flat())];
        const pnList = allPns.map((pn) => `'${pn.replace(/'/g, "''")}'`).join(", ");

        try {
          // Spare parts, per Engineering's ERP definition:
          //   1. Not installed on an aircraft directly (installed_ac IS NULL), AND
          //   2. Not currently built into ANY higher assembly — including a spare
          //      engine/APU that itself isn't mounted on an aircraft (nha_sn IS NULL).
          //      "nha_sn" (Next Higher Assembly SN) is populated whenever a part is a
          //      sub-component of something else, so this catches spare-engine-installed
          //      parts that (1) alone would miss.
          //   3. Condition is not "U/S" (Unserviceable), "SCRP" (Scrapped), or
          //      "BADSTOCK". Note: "REPAIR" only reflects the *last* transaction type on
          //      the part, not that it's actively out for repair right now — so it must
          //      NOT be excluded here on its own.
          //   4. No OPEN Repair Order (order_type='RO', status='OPEN') against this
          //      specific serial number — this is what actually reflects "currently out
          //      for repair", not the static condition code.
          const excludedConditions = ["U/S", "SCRP", "BADSTOCK"];
          const excludedConditionList = excludedConditions.map((c) => `'${c.replace(/'/g, "''")}'`).join(", ");

          console.log(`[CRITICAL-SPARES] Excluded conditions: (${excludedConditionList})`);
          console.log(`[CRITICAL-SPARES] PN list (${allPns.length} parts): ${pnList.substring(0, 100)}...`);

          const result = await executeQuery(
            req,
            appkit,
            `SELECT p.pn, COUNT(DISTINCT s.sn)::int AS spare_count
             FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_snapshot s
             JOIN ${S}.qx_ppmtx_synced_gold_dim_part p ON s.dim_part_key = p.dim_part_key
             WHERE p.pn IN (${pnList})
               AND s.installed_ac IS NULL
               AND (s.nha_sn IS NULL OR TRIM(s.nha_sn) = '')
               AND upper(TRIM(COALESCE(s.condition, ''))) NOT IN (${excludedConditionList})
               AND NOT EXISTS (
                 SELECT 1
                 FROM ${S}.qx_ppmtx_synced_gold_fact_order fo
                 JOIN ${S}.qx_ppmtx_synced_gold_dim_part fop ON fo.dim_part_key = fop.dim_part_key
                 WHERE fop.pn = p.pn AND fo.sn = s.sn
                   AND fo.order_type = 'RO' AND fo.status = 'OPEN'
               )
             GROUP BY p.pn`,
          );

          console.log(`[CRITICAL-SPARES] Query returned ${result.rows.length} rows with spares`);
          if (result.rows.length > 0) {
            console.log(`[CRITICAL-SPARES] Sample results:`, result.rows.slice(0, 3));
          }

          // Build response: { partName, partNumbers: [{ pn, quantity }, ...] }
          const pnToCount: Record<string, number> = {};
          for (const row of result.rows) {
            pnToCount[String(row.pn)] = Number(row.spare_count) || 0;
          }

          console.log(`[CRITICAL-SPARES] PN to count map: ${JSON.stringify(pnToCount)}`);

          const criticalSpares = Object.entries(partMap).map(([name, pns]) => ({
            name,
            partNumbers: pns.map((pn) => ({
              pn,
              quantity: pnToCount[pn] || 0,
            })),
          }));

          res.json({
            data: criticalSpares,
            source: "live",
          });
        } catch (err) {
          console.warn(`[Lakebase] /api/critical-spares fallback: ${err}`);
          // Fallback: return the part map structure with 0 quantities
          const fallback = Object.entries(partMap).map(([name, pns]) => ({
            name,
            partNumbers: pns.map((pn) => ({ pn, quantity: 0 })),
          }));
          res.json({
            data: fallback,
            source: "mock",
          });
        }
      });

      // ── DEBUG: Serviceable Spares diagnostics (for a specific SN) ──────────────────
      app.get("/api/serviceable-spares-debug", async (req: Request, res: Response) => {
        const sn = String(req.query.sn || "");
        if (!sn) {
          res.json({ error: "sn query param required" });
          return;
        }
        
        try {
          const result = await executeQuery(
            req,
            appkit,
            `SELECT 
               fs.sn, 
               p.pn,
               fs.installed_ac,
               fs.installed_position,
               (SELECT COUNT(*) FROM ${S}.qx_ppmtx_synced_gold_fact_order fo 
                WHERE fo.sn = fs.sn AND fo.order_type = 'RO' AND fo.status = 'OPEN') AS active_ro_count
             FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_snapshot fs
             LEFT JOIN ${S}.qx_ppmtx_synced_gold_dim_part p ON fs.dim_part_key = p.dim_part_key
             WHERE fs.sn = $1`,
            [sn],
          );
          res.json({ debug: result.rows, sn });
        } catch (err) {
          console.error(`[Lakebase] /api/serviceable-spares-debug error:`, err);
          res.json({ error: String(err), sn });
        }
      });

      // ── KPI summary (Overview / Reliability) ─────────────────────────
      app.get("/api/kpis", async (req: Request, res: Response) => {
        const from = parseDateParam(req.query.from);
        const to = parseDateParam(req.query.to);
        // Date-range predicate reused by the timeframe-scoped aggregates below.
        // Null bound => that side is unconstrained (all-time).
        const inRange = `($1::date IS NULL OR d.calendar_date >= $1::date) AND ($2::date IS NULL OR d.calendar_date <= $2::date)`;
        try {
          const defectAgg = await executeQuery(
            req,
            appkit,
            `SELECT COUNT(*) FILTER (WHERE f.status = 'OPEN')::int AS active_defects,
                    COUNT(*)::int AS total_defects,
                    COUNT(*) FILTER (
                      WHERE f.defect_type = 'PILOT'
                        AND f.defect_description IS NOT NULL
                        AND lower(f.defect_description) LIKE '%vib%'
                        AND ${inRange}
                    )::int AS vibration_pireps
             FROM ${S}.qx_ppmtx_synced_gold_fact_defect f
             JOIN ${S}.qx_ppmtx_synced_gold_dim_ata_chapter c ON f.dim_ata_chapter_key = c.dim_ata_chapter_key
             LEFT JOIN ${S}.qx_ppmtx_synced_gold_dim_date d ON f.reported_date_key = d.dim_date_key
             WHERE c.chapter IN (${PROP_ATA_LIST})`,
            [from, to],
          );
          // Delay/cancellation KPIs, sourced from qx_ppmtx_gold_fact_defect_delay
          // (per-event delay/cancellation detail from qx_trax_defect_report_delay)
          // rather than the rolled-up delay/cancellation columns on fact_defect,
          // which only reflect the last-known state per defect and undercount/miss
          // delay events tracked at this finer grain. Joined back to fact_defect on
          // (defect_type, defect, defect_item) to inherit the same propulsion-only
          // ATA chapter scoping as the rest of this KPI set.
          const delayAgg = await executeQuery(
            req,
            appkit,
            `SELECT COUNT(*) FILTER (
                      WHERE fd.cancellation IS NOT NULL AND TRIM(fd.cancellation) <> '' AND ${inRange}
                    )::int AS cancel_count,
                    COALESCE(SUM(fd.delay_minutes) FILTER (WHERE ${inRange}), 0)::int AS total_delay_minutes
             FROM ${S}.qx_ppmtx_synced_gold_fact_defect_delay fd
             JOIN ${S}.qx_ppmtx_synced_gold_fact_defect f
               ON fd.defect_type = f.defect_type AND fd.defect = f.defect AND fd.defect_item = f.defect_item
             JOIN ${S}.qx_ppmtx_synced_gold_dim_ata_chapter c ON f.dim_ata_chapter_key = c.dim_ata_chapter_key
             LEFT JOIN ${S}.qx_ppmtx_synced_gold_dim_date d ON fd.delay_date_key = d.dim_date_key
             WHERE c.chapter IN (${PROP_ATA_LIST})`,
            [from, to],
          );
          const llpAgg = await executeQuery(
            req,
            appkit,
            `SELECT COUNT(*)::int AS llp_alerts
             FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_control
             WHERE control = 'LL' AND remaining_cycles IS NOT NULL AND remaining_cycles < 1000
               AND dim_part_key IN (${PROP_PART_POPULATION})`,
          );
          // Real ECMP open-count, sourced from qx_ppmtx_gold_fact_engineering_order
          // (replaces the prior narrative-text-search proxy on defect reports).
          // Per current procedure, only "ECMP-XXXX" numbered orders past the
          // ECMP-4500 cutover are tracked; older/legacy-named ECMPs (pre-4500,
          // or non-conforming names) are excluded from this KPI.
          const ecmpAgg = await executeQuery(
            req,
            appkit,
            `SELECT COUNT(*)::int AS open_ecmp
             FROM ${S}.qx_ppmtx_synced_gold_fact_engineering_order
             WHERE upper(status) = 'OPEN' AND upper(eo_category) = 'ECMP'
               AND eo ~ '^ECMP-[0-9]+$'
               AND substring(eo from 6)::int > 4500`,
          );
          const d = defectAgg.rows[0] ?? {};
          const dl = delayAgg.rows[0] ?? {};
          const l = llpAgg.rows[0] ?? {};
          const e = ecmpAgg.rows[0] ?? {};
          res.json({
            data: {
              activeDefects: Number(d.active_defects) || 0,
              cancelCount: Number(dl.cancel_count) || 0,
              totalDelayMinutes: Number(dl.total_delay_minutes) || 0,
              totalDefects: Number(d.total_defects) || 0,
              llpAlerts: Number(l.llp_alerts) || 0,
              vibrationPireps: Number(d.vibration_pireps) || 0,
              openEcmp: Number(e.open_ecmp) || 0,
            },
            source: "live",
          });
        } catch (err) {
          console.warn(`[Lakebase] /api/kpis fallback: ${err}`);
          res.json({ data: MOCK_KPIS, source: "mock" });
        }
      });

      // ── Delay/Cancellation event details, backing the Overview "Total Delay
      // Min" and "Cancellations" KPI dropdowns. Both read from
      // qx_ppmtx_synced_gold_fact_defect_delay (the same authoritative source
      // as the KPI totals above) joined back to qx_ppmtx_synced_gold_fact_defect
      // for the write-up narrative and propulsion-only ATA scoping, and to
      // dim_aircraft for the tail number. Each endpoint only returns rows that
      // actually contribute to its KPI (delay_minutes > 0 / cancellation
      // non-blank) so the detail list always reconciles with the number shown
      // on the card above it, and the two dropdowns can be empty/populated
      // independently of one another.
      const delayCancelDetailSql = (filterClause: string) => `
        SELECT d.calendar_date::text AS event_date,
               a.ac,
               fd.station,
               COALESCE(NULLIF(TRIM(f.defect_description), ''), NULLIF(TRIM(fd.delay_reason), '')) AS write_up,
               fd.delay_minutes::int AS delay_minutes,
               fd.cancellation AS cancellation
        FROM ${S}.qx_ppmtx_synced_gold_fact_defect_delay fd
        JOIN ${S}.qx_ppmtx_synced_gold_fact_defect f
          ON fd.defect_type = f.defect_type AND fd.defect = f.defect AND fd.defect_item = f.defect_item
        JOIN ${S}.qx_ppmtx_synced_gold_dim_ata_chapter c ON f.dim_ata_chapter_key = c.dim_ata_chapter_key
        LEFT JOIN ${S}.qx_ppmtx_synced_gold_dim_aircraft a ON fd.dim_aircraft_key = a.dim_aircraft_key
        LEFT JOIN ${S}.qx_ppmtx_synced_gold_dim_date d ON fd.delay_date_key = d.dim_date_key
        WHERE c.chapter IN (${PROP_ATA_LIST})
          AND ($1::date IS NULL OR d.calendar_date >= $1::date)
          AND ($2::date IS NULL OR d.calendar_date <= $2::date)
          AND ${filterClause}
        ORDER BY d.calendar_date DESC NULLS LAST
        LIMIT 100`;

      app.get("/api/delays/detail", async (req: Request, res: Response) => {
        const from = parseDateParam(req.query.from);
        const to = parseDateParam(req.query.to);
        try {
          const result = await executeQuery(
            req,
            appkit,
            delayCancelDetailSql("fd.delay_minutes > 0"),
            [from, to],
          );
          res.json({
            data: result.rows.map((r: any) => ({
              date: r.event_date,
              ac: r.ac ?? "Unknown",
              station: r.station ?? "",
              writeUp: r.write_up ?? "",
              delayMinutes: Number(r.delay_minutes) || 0,
            })),
            source: "live",
          });
        } catch (err) {
          console.warn(`[Lakebase] /api/delays/detail fallback: ${err}`);
          res.json({ data: MOCK_DELAY_DETAILS, source: "mock" });
        }
      });

      app.get("/api/cancellations/detail", async (req: Request, res: Response) => {
        const from = parseDateParam(req.query.from);
        const to = parseDateParam(req.query.to);
        try {
          const result = await executeQuery(
            req,
            appkit,
            delayCancelDetailSql("fd.cancellation IS NOT NULL AND TRIM(fd.cancellation) <> ''"),
            [from, to],
          );
          res.json({
            data: result.rows.map((r: any) => ({
              date: r.event_date,
              ac: r.ac ?? "Unknown",
              station: r.station ?? "",
              writeUp: r.write_up ?? "",
              reason: r.cancellation ?? "",
            })),
            source: "live",
          });
        } catch (err) {
          console.warn(`[Lakebase] /api/cancellations/detail fallback: ${err}`);
          res.json({ data: MOCK_CANCEL_DETAILS, source: "mock" });
        }
      });

      // ── ECMP detail list, backing the Overview "ECMP" KPI dropdown ─────
      // Same ECMP-4500+ cutover filter as /api/kpis' openEcmp count. The
      // aircraft tail is not a distinct source column — ECMP descriptions
      // embed it inline (e.g. "N643QX #2 ENGINE..."), so it's extracted via
      // regex here rather than added as a Gold column. Issue date is
      // intentionally omitted: new ECMPs are copied from prior ones and
      // inherit the original's issued_date, so it doesn't reflect reality.
      app.get("/api/ecmp/open", async (req: Request, res: Response) => {
        try {
          const result = await executeQuery(
            req,
            appkit,
            `SELECT f.eo,
                    f.eo_description,
                    COALESCE(
                      substring(f.eo_description from '(N[0-9]{3}QX)'),
                      'N' || substring(f.eo_description from '([0-9]{3}QX)')
                    ) AS ac
             FROM ${S}.qx_ppmtx_synced_gold_fact_engineering_order f
             WHERE upper(f.status) = 'OPEN' AND upper(f.eo_category) = 'ECMP'
               AND f.eo ~ '^ECMP-[0-9]+$'
               AND substring(f.eo from 6)::int > 4500
             ORDER BY substring(f.eo from 6)::int DESC`,
          );
          res.json({
            data: result.rows.map((r: any) => ({
              eo: r.eo,
              description: r.eo_description ?? "",
              ac: r.ac ?? "Unknown",
            })),
            source: "live",
          });
        } catch (err) {
          console.warn(`[Lakebase] /api/ecmp/open fallback: ${err}`);
          res.json({ data: MOCK_ECMP_DETAILS, source: "mock" });
        }
      });

      // ── Genie AI query handler ─────────────────────────────────────
      // Proxies the Assistant tab to the Genie "Propulsion Reliability Intelligence" space.
      // Supports stateful multi-turn conversations via conversationId round-trip.
      // Executes under the OBO token (logged-in user), granting Unity Catalog access.
      // Returns { reply, steps, conversationId, queryResults, visualizations, source }
      app.post("/api/agent", async (req: Request, res: Response) => {
        const history: any[] = Array.isArray(req.body?.messages) ? req.body.messages : [];
        const conversationId: string | undefined = req.body?.conversationId || undefined;
        const userMessage = history
          .filter((m: any) => m && m.role === "user" && typeof m.content === "string" && m.content.trim())
          .pop()?.content || "";

        if (!userMessage.trim()) {
          res.status(400).json({ reply: "No message provided.", steps: [], source: "mock" });
          return;
        }

        try {
          const spaceId = process.env.DATABRICKS_GENIE_SPACE_ID;
          if (!spaceId) throw new Error("DATABRICKS_GENIE_SPACE_ID not configured");

          const result = await handleGenieQuery(req, spaceId, augmentGenieMessage(userMessage), conversationId);
          console.log(`[Genie] /api/agent response conversationId=${result.conversationId} (incoming=${conversationId})`);
          res.json({ ...result, source: "live" });
        } catch (err: any) {
          console.warn(`[Genie] /api/agent fallback: ${err}`);
          res.json({
            reply: "The Propulsion Assistant is unavailable right now. Please try again in a moment.",
            steps: [],
            source: "mock",
          });
        }
      });

      // ── Agent health ─────────────────────────────────────────────────
      // Lightweight: reports whether the Genie space is configured. We do NOT
      // invoke Genie here — it is billable; the chat path itself reports live/mock per request.
      app.get("/api/health/agent", (req: Request, res: Response) => {
        const spaceId = process.env.DATABRICKS_GENIE_SPACE_ID || "";
        // OBO diagnostics: report only PRESENCE of forwarded headers (never values)
        // so we can confirm the Apps proxy is injecting the user token in-browser.
        const tok = req.header("x-forwarded-access-token") || "";
        // Decode ONLY the JWT scope/claims we need for diagnostics — never the token.
        let scopes: string[] | string | null = null;
        let claims: Record<string, unknown> = {};
        try {
          const seg = tok.split(".")[1];
          if (seg) {
            const json = JSON.parse(
              Buffer.from(seg.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
            );
            scopes = (json.scope ?? json.scp ?? null) as string[] | string | null;
            claims = {
              aud: json.aud ?? null,
              client_id: json.client_id ?? null,
              token_type: json.token_type ?? null,
              iss: json.iss ?? null,
            };
          }
        } catch {
          scopes = "<unparseable>";
        }
        const obo = {
          has_access_token: Boolean(tok),
          has_user: Boolean(req.header("x-forwarded-user")),
          has_email: Boolean(req.header("x-forwarded-email")),
          preferred_username: req.header("x-forwarded-preferred-username") || null,
          scopes,
          claims,
        };
        res.json({ connected: Boolean(spaceId), spaceId, obo });
      });
    });
  },
});