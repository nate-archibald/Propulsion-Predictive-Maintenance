// ─── Row mappers: PostgreSQL snake_case rows → frontend camelCase shapes ──
// node-pg returns DECIMAL/NUMERIC as strings and DATE as JS Date objects, so
// every numeric/date field is coerced explicitly here.

type Row = Record<string, unknown>;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isoDate(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string" && v.length >= 10) return v.slice(0, 10);
  return "";
}

function confidenceFrom(faultConfirm: unknown): "HIGH" | "MEDIUM" | "LOW" {
  const v = String(faultConfirm ?? "").toUpperCase();
  if (v === "CONFIRM") return "HIGH";
  if (v === "PENDING") return "MEDIUM";
  return "LOW"; // NOT/CONFIRM or unknown
}

export function mapDefect(r: Row): Row {
  const cancellation = r.cancellation;
  const delayMinutes = num(r.delay_minutes);
  const impact: "CANCEL" | "DELAY" | "NONE" =
    cancellation !== null && cancellation !== undefined
      ? "CANCEL"
      : delayMinutes > 0
        ? "DELAY"
        : "NONE";
  const defectType = String(r.defect_type ?? "").trim();
  const defect = String(r.defect ?? "").trim();
  return {
    id: [defectType, defect].filter(Boolean).join("-") || String(r.fact_defect_key ?? ""),
    tail: String(r.tail ?? ""),
    ata: String(r.ata ?? ""),
    ataDesc: String(r.ata_desc ?? ""),
    station: String(r.station ?? ""),
    date: isoDate(r.reported_date),
    narrative: String(r.defect_description ?? ""),
    resolution: String(r.resolution_description ?? ""),
    impact,
    delayMinutes,
    linkedPartSN: "",
    linkedPartPN: "",
    confidence: confidenceFrom(r.fault_confirm),
    deferral: r.defer !== null && r.defer !== undefined && String(r.defer).trim() !== "",
  };
}

export function mapDefectByAta(r: Row): Row {
  return {
    ata: String(r.ata ?? ""),
    description: String(r.description ?? ""),
    count: num(r.count),
    delayMinutes: num(r.delay_minutes),
    cancels: num(r.cancels),
  };
}

export function mapWeeklyTrend(r: Row): Row {
  // The week-ending calendar date is computed by the warehouse (MAX(calendar_date)
  // per (year, week_of_year) group in the SQL query) rather than re-derived here.
  // A prior version recalculated it from the week number in JS using a hand-rolled
  // ISO-week formula that didn't match the warehouse's week numbering and was
  // consistently off by one week — this avoids that class of bug entirely.
  const dateStr = String(r.week_end_date ?? "");
  return {
    week: dateStr,
    weekLabel: dateStr,
    count: num(r.count),
    delayMinutes: num(r.delay_minutes),
  };
}

export function mapPart(r: Row): Row {
  return {
    partNumber: String(r.pn ?? ""),
    serialNumber: String(r.sn ?? ""),
    description: String(r.description ?? ""),
    engineSN: "",
    tail: "",
    position: "",
    condition: "",
    location: "",
    tsn: num(r.actual_hours),
    csn: num(r.actual_cycles),
    tso: numOrNull(r.live_tso) ?? 0,
    csi: 0,
    installDate: "",
    ata: "",
    isLLP: String(r.control ?? "").toUpperCase() === "LL",
    cycleLimit: numOrNull(r.schedule_cycles),
    cyclesRemaining: numOrNull(r.remaining_cycles),
  };
}

export function mapSpare(r: Row): Row {
  const quantity = num(r.quantity);
  const stockOutRisk: "HIGH" | "MEDIUM" | "LOW" =
    quantity === 0 ? "HIGH" : quantity <= 1 ? "MEDIUM" : "LOW";
  return {
    partNumber: String(r.part_number ?? ""),
    description: String(r.description ?? ""),
    station: String(r.station ?? ""),
    condition: String(r.condition ?? ""),
    quantity,
    removalRate90d: num(r.removal_rate_90d),
    stockOutRisk,
  };
}

export function mapEngine(r: Row): Row {
  return {
    engineSN: String(r.engine_sn ?? ""),
    tail: String(r.tail ?? ""),
    engineType: "CF34-8E",  // All filtered engines are CF34-8E5G01, display as CF34-8E
    position: String(r.position ?? ""),
    totalHours: num(r.total_hours),
    totalCycles: num(r.total_cycles),
    lastShopVisit: isoDate(r.last_shop_visit),
    parts: [],
  };
}

// Engine Removal Plan — HSR Data row (live Time Since HSR / soft-time reset).
// Backed by the gold reconstruction qx_ppmtx_synced_gold_engine_tshsi joined to
// fact_inventory_snapshot for the installed position.
export function mapHsrEngine(r: Row): Row {
  const rawPos = String(r.position ?? "").trim();
  const position =
    rawPos === "LH ENG" ? "ENG-1" : rawPos === "RH ENG" ? "ENG-2" : rawPos;

  const installed = Boolean(r.currently_installed);

  // Projection (bindingConstraint / projectedRemovalDate / daysToRemoval) is
  // computed on the client from a user-adjustable fleet utilization assumption
  // (FH/day, FC/day), so this mapper only returns the raw ingredients. The
  // per-engine hrs/cyc-per-day are passed through as OBSERVED context only.
  return {
    engineSN: String(r.engine_sn ?? ""),
    pn: String(r.pn ?? ""),
    resetDate: isoDate(r.reset_date),
    tshsi: num(r.tshsi),
    hsrTarget: num(r.hsr_target),
    tshsrRemaining: num(r.tshsr_remaining),
    currentlyInstalled: installed,
    installedAC: r.installed_ac ? String(r.installed_ac) : "",
    position,
    onWingPeriods: num(r.on_wing_periods),
    hrsPerDay: numOrNull(r.hrs_per_day),
    cyclesPerDay: numOrNull(r.cycles_per_day),
    utilWindowDays: numOrNull(r.util_window_days),
    minCyclesRemaining: numOrNull(r.min_cyc_remaining),
    bindingLlpPN: r.binding_llp_pn ? String(r.binding_llp_pn) : "",
    bindingLlpSN: r.binding_llp_sn ? String(r.binding_llp_sn) : "",
    asOfDate: isoDate(r.as_of_date),
  };
}

export function mapAPU(r: Row): Row {
  return {
    apuSN: String(r.apu_sn ?? ""),
    tail: String(r.tail ?? ""),
    totalHours: num(r.total_hours),
    totalCycles: num(r.total_cycles),
    lastShopVisit: isoDate(r.last_shop_visit),
    parts: [],
  };
}
