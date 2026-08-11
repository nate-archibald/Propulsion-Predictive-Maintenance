import { createApp, server, lakebase, serving } from "@databricks/appkit";
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

// Catalog for Lakebase inventory snapshot tables
const INVENTORY_CATALOG = "subject_maintenanceengineering_test";
const INVENTORY_SCHEMA = "an_maintenanceengineering_ods";

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

// ── Supervisor Agent (ResponsesAgent / agent/v1/responses) helpers ────
// The Propulsion-Supervisor-Agent MAS endpoint returns an `output[]` array whose
// items are `message` (assistant text) or `function_call` (subagent/tool calls).
// Reasoning text, routing markers like `<name>…</name>`, and the FINAL answer are
// all `message` items. See docs/supervisor_agent_discovery.md.
type AgentMsg = { role: "user" | "assistant"; content: string };
const NAME_MARKER = /^<name>.*<\/name>$/s;
const STATUS_TOKENS = new Set(["EMPTY", "COMPLETE", "DONE"]);

function textOf(item: any): string {
  if (typeof item?.content === "string") return item.content;
  if (Array.isArray(item?.content)) {
    return item.content
      .filter((c: any) => c?.type === "output_text" && typeof c.text === "string")
      .map((c: any) => c.text)
      .join("");
  }
  return "";
}

// Reduce a ResponsesAgent `output[]` array to { reply, steps }.
function normalizeAgentResponse(resp: any): { reply: string; steps: string[] } {
  const output: any[] = Array.isArray(resp?.output) ? resp.output : [];
  const messages: string[] = [];
  const steps: string[] = [];
  for (const item of output) {
    if (item?.type === "function_call") {
      const q = (() => {
        try {
          const a = JSON.parse(item.arguments ?? "{}");
          return a.genie_query || a.query || item.arguments;
        } catch {
          return item.arguments;
        }
      })();
      steps.push(`Queried \`${item.name}\`: ${q}`);
      continue;
    }
    if (item?.type === "message") {
      const t = textOf(item).trim();
      if (!t) continue;
      if (NAME_MARKER.test(t) || STATUS_TOKENS.has(t.toUpperCase())) {
        continue; // routing marker / status token — trace only
      }
      messages.push(t);
    }
  }
  // Final answer = last substantive assistant message; earlier ones are reasoning.
  const reply = messages.length ? messages[messages.length - 1] : "";
  if (messages.length > 1) steps.push(...messages.slice(0, -1));
  return { reply: reply || "(The assistant returned no answer.)", steps };
}

await createApp({
  plugins: [server(), lakebase(), serving()],
  async onPluginsReady(appkit) {
    // NOTE: the synced tables are created/populated by the reverse-ETL pipeline,
    // so there is NO DDL or seed step here — the app is read-only over them.
    appkit.server.extend((app) => {
      // ── Health ───────────────────────────────────────────────────────
      app.get("/api/health/lakebase", async (_req: Request, res: Response) => {
        try {
          await appkit.lakebase.query("SELECT 1");
          res.json({ connected: true, mode: "autoscaling", schema: S });
        } catch (err) {
          res.json({ connected: false, mode: "autoscaling", schema: S, error: String(err) });
        }
      });

      // ── Diagnostic endpoint for schema inspection ─────────────────────
      app.get("/api/debug/schema-inspection", async (_req: Request, res: Response) => {
        const diagnostics: any = {};

        // 1. List tables
        try {
          const result = await appkit.lakebase.query(
            `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name`,
            [S]
          );
          diagnostics.tables = result.rows.map((r: any) => r.table_name);
        } catch (err) {
          diagnostics.tables_error = String(err);
        }

        // 2. Inventory control columns
        try {
          const result = await appkit.lakebase.query(
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
          const result = await appkit.lakebase.query(
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
          const result = await appkit.lakebase.query(
            `SELECT DISTINCT control FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_control ORDER BY control LIMIT 50`
          );
          diagnostics.control_values = result.rows.map((r: any) => r.control);
        } catch (err) {
          diagnostics.control_values_error = String(err);
        }

        // 5. Sample inventory snapshot rows
        try {
          const result = await appkit.lakebase.query(
            `SELECT sn, installed_ac, installed_position FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_snapshot 
             WHERE installed_ac IS NOT NULL LIMIT 5`
          );
          diagnostics.sample_inventory_snapshot = result.rows;
        } catch (err) {
          diagnostics.sample_inventory_snapshot_error = String(err);
        }

        // 6. Engine part numbers
        try {
          const result = await appkit.lakebase.query(
            `SELECT DISTINCT pn, pn_description FROM ${S}.qx_ppmtx_synced_gold_dim_part 
             WHERE pn ILIKE '%CF34%' OR pn_description ILIKE '%CF34%' LIMIT 20`
          );
          diagnostics.engine_part_numbers = result.rows;
        } catch (err) {
          diagnostics.engine_part_numbers_error = String(err);
        }

        // 7. Check TSN count
        try {
          const result = await appkit.lakebase.query(
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
          const result = await appkit.lakebase.query(
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
          const result = await appkit.lakebase.query(
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

      // ── Weekly defect trend ──────────────────────────────────────────
      app.get("/api/defects/weekly-trend", async (req: Request, res: Response) => {
        const weeks = clampLimit(req.query.weeks, 12, 104);
        try {
          const result = await appkit.lakebase.query(
            `SELECT d.year, d.week_of_year AS week, COUNT(*)::int AS count
             FROM ${S}.qx_ppmtx_synced_gold_fact_defect f
             JOIN ${S}.qx_ppmtx_synced_gold_dim_date d ON f.reported_date_key = d.dim_date_key
             JOIN ${S}.qx_ppmtx_synced_gold_dim_ata_chapter c ON f.dim_ata_chapter_key = c.dim_ata_chapter_key
             WHERE c.chapter IN (${PROP_ATA_LIST})
             GROUP BY d.year, d.week_of_year
             ORDER BY d.year DESC, d.week_of_year DESC
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

      // ── Parts (life-limited / inventory control) ─────────────────────
      app.get("/api/parts", async (req: Request, res: Response) => {
        const limit = clampLimit(req.query.limit, 300, 2000);
        try {
          const result = await appkit.lakebase.query(
            `SELECT ic.pn, ic.sn, p.pn_description AS description,
                    ic.control, ic.actual_hours, ic.actual_cycles,
                    ic.schedule_cycles, ic.remaining_cycles
             FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_control ic
             LEFT JOIN ${S}.qx_ppmtx_synced_gold_dim_part p ON ic.dim_part_key = p.dim_part_key
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

      // ── Spares (on-hand inventory by part / station / condition) ─────
      app.get("/api/spares", async (req: Request, res: Response) => {
        const limit = clampLimit(req.query.limit, 500, 5000);
        try {
          const result = await appkit.lakebase.query(
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
          const result = await appkit.lakebase.query(
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
              t.total_hours::integer AS total_hours,
              t.total_cycles::integer AS total_cycles,
              tsr.last_shop_visit
            FROM engine_tsn t
            LEFT JOIN engine_tsr tsr ON t.engine_sn = tsr.sn
            WHERE t.rn = 1
            ORDER BY t.tail
            LIMIT $1`,
            [limit],
          );
          res.json({ data: result.rows.map(mapEngine), source: "live" });
        } catch (err) {
          console.warn(`[Lakebase] /api/engines fallback: ${err}`);
          res.json({ data: MOCK_ENGINES, source: "mock" });
        }
      });

      // ── APUs (auxiliary power units, fleet aircraft) ───────────────────────────────────────
      app.get("/api/apus", async (req: Request, res: Response) => {
        const limit = clampLimit(req.query.limit, 200, 2000);
        try {
          const result = await appkit.lakebase.query(
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

      // ── Fleet Leaders (highest-time engine and APU currently in service) ─────────────────────
      app.get("/api/fleet-leaders", async (_req: Request, res: Response) => {
        try {
          const result = await appkit.lakebase.query(
            `WITH engine_leader AS (
              SELECT 
                ic.sn, snap.installed_ac AS tail,
                ic.actual_hours::integer AS total_hours,
                ic.actual_cycles::integer AS total_cycles,
                ROW_NUMBER() OVER (ORDER BY ic.actual_hours DESC) AS rn
              FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_control ic
              JOIN ${S}.qx_ppmtx_synced_gold_dim_part p ON ic.dim_part_key = p.dim_part_key
              JOIN ${S}.qx_ppmtx_synced_gold_fact_inventory_snapshot snap ON ic.sn = snap.sn
              WHERE ic.control = 'TSN'
                AND p.pn = 'CF34-8E5G01'
                AND snap.installed_ac IS NOT NULL
                AND ic.actual_hours > 0
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
            FROM engine_leader WHERE rn = 1
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
          const result = await appkit.lakebase.query(
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
          const result = await appkit.lakebase.query(
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
      app.get("/api/critical-spares", async (_req: Request, res: Response) => {
        // Part mapping: part name → array of PNs for that part
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

        // All unique PNs from the map
        const allPns = Object.values(partMap).flat();
        const pnList = allPns.map((pn) => `'${pn.replace(/'/g, "''")}'`).join(", ");

        try {
          // Spare parts: not installed AND in a serviceable condition
          // Including INSPTEST (Inspected & Tested) since user data shows it's serviceable
          const spareConditions = ["REPAIR", "SV", "OH", "NEW", "MOD", "INSPTEST"];
          const conditionList = spareConditions.map((c) => `'${c.replace(/'/g, "''")}'`).join(", ");

          console.log(`[CRITICAL-SPARES] Spare conditions filter: (${conditionList})`);
          console.log(`[CRITICAL-SPARES] PN list (${allPns.length} parts): ${pnList.substring(0, 100)}...`);

          // Query: count parts that are NOT installed and have spare condition codes
          // Using snapshot table for current state (not transaction history)
          const result = await appkit.lakebase.query(
            `SELECT p.pn, COUNT(DISTINCT s.sn)::int AS spare_count
             FROM ${INVENTORY_CATALOG}.${INVENTORY_SCHEMA}.qx_ppmtx_synced_gold_fact_inventory_snapshot s
             JOIN ${INVENTORY_CATALOG}.${INVENTORY_SCHEMA}.qx_ppmtx_synced_gold_dim_part p ON s.dim_part_key = p.dim_part_key
             WHERE p.pn IN (${pnList})
               AND s.installed_ac IS NULL
               AND s.condition IN (${conditionList})
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
          const result = await appkit.lakebase.query(
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
          const defectAgg = await appkit.lakebase.query(
            `SELECT COUNT(*) FILTER (WHERE f.status = 'OPEN')::int AS active_defects,
                    COUNT(*) FILTER (WHERE f.cancellation IS NOT NULL AND ${inRange})::int AS cancel_count,
                    COALESCE(SUM(f.delay_minutes) FILTER (WHERE ${inRange}), 0)::int AS total_delay_minutes,
                    COUNT(*)::int AS total_defects,
                    COUNT(*) FILTER (
                      WHERE f.defect_type = 'PILOT'
                        AND f.defect_description IS NOT NULL
                        AND lower(f.defect_description) LIKE '%vib%'
                        AND ${inRange}
                    )::int AS vibration_pireps,
                    COUNT(*) FILTER (
                      WHERE f.status = 'OPEN'
                        AND f.defect_description IS NOT NULL
                        AND upper(f.defect_description) LIKE '%ECMP%'
                    )::int AS open_ecmp
             FROM ${S}.qx_ppmtx_synced_gold_fact_defect f
             JOIN ${S}.qx_ppmtx_synced_gold_dim_ata_chapter c ON f.dim_ata_chapter_key = c.dim_ata_chapter_key
             LEFT JOIN ${S}.qx_ppmtx_synced_gold_dim_date d ON f.reported_date_key = d.dim_date_key
             WHERE c.chapter IN (${PROP_ATA_LIST})`,
            [from, to],
          );
          const llpAgg = await appkit.lakebase.query(
            `SELECT COUNT(*)::int AS llp_alerts
             FROM ${S}.qx_ppmtx_synced_gold_fact_inventory_control
             WHERE control = 'LL' AND remaining_cycles IS NOT NULL AND remaining_cycles < 1000
               AND dim_part_key IN (${PROP_PART_POPULATION})`,
          );
          const d = defectAgg.rows[0] ?? {};
          const l = llpAgg.rows[0] ?? {};
          res.json({
            data: {
              activeDefects: Number(d.active_defects) || 0,
              cancelCount: Number(d.cancel_count) || 0,
              totalDelayMinutes: Number(d.total_delay_minutes) || 0,
              totalDefects: Number(d.total_defects) || 0,
              llpAlerts: Number(l.llp_alerts) || 0,
              vibrationPireps: Number(d.vibration_pireps) || 0,
              openEcmp: Number(d.open_ecmp) || 0,
            },
            source: "live",
          });
        } catch (err) {
          console.warn(`[Lakebase] /api/kpis fallback: ${err}`);
          res.json({ data: MOCK_KPIS, source: "mock" });
        }
      });

      // ── Supervisor Agent chat ────────────────────────────────────────
      // Proxies the Assistant tab to the Propulsion-Supervisor-Agent MAS endpoint
      // (alias `default` → DATABRICKS_SERVING_ENDPOINT_NAME). Normalizes the
      // ResponsesAgent output to { reply, steps } and never 500s to the UI.
      app.post("/api/agent", async (req: Request, res: Response) => {
        const history: AgentMsg[] = Array.isArray(req.body?.messages) ? req.body.messages : [];
        const input = history
          .filter((m) => m && typeof m.content === "string" && m.content.trim())
          .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
        if (input.length === 0) {
          res.status(400).json({ reply: "No message provided.", steps: [], source: "mock" });
          return;
        }
        try {
          const result: any = await appkit.serving().asUser(req).invoke({ input });
          // `invoke()` returns an ExecutionResult. A failed call resolves (does not
          // throw) with { ok:false, status, message } — treat that as a fallback.
          if (result && result.ok === false) {
            throw new Error(`serving invoke failed (${result.status}): ${result.message}`);
          }
          // The endpoint payload is the ExecutionResult's `.data` (else the result itself).
          const payload = result && result.data !== undefined ? result.data : result;
          const { reply, steps } = normalizeAgentResponse(payload);
          res.json({ reply, steps, source: "live" });
        } catch (err) {
          console.warn(`[Serving] /api/agent fallback: ${err}`);
          res.json({
            reply:
              "The Propulsion Assistant is unavailable right now. Please try again in a moment.",
            steps: [],
            source: "mock",
          });
        }
      });

      // ── Agent health ─────────────────────────────────────────────────
      // Lightweight: reports whether the serving endpoint is configured. We do NOT
      // invoke the MAS here — it is slow and billable; the chat path itself reports
      // live/mock per request.
      app.get("/api/health/agent", (req: Request, res: Response) => {
        const endpoint = process.env.DATABRICKS_SERVING_ENDPOINT_NAME || "";
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
        res.json({ connected: Boolean(endpoint), endpoint, obo });
      });
    });
  },
});
