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
  const weekNum = num(r.week);
  const year = new Date().getFullYear();
  
  // Calculate the Sunday of the given ISO week
  // ISO week 1 is the week with the first Thursday of the year
  const jan4 = new Date(year, 0, 4);
  const mondayOfWeek1 = new Date(jan4);
  mondayOfWeek1.setDate(jan4.getDate() - jan4.getDay() + 1);
  
  // Add (weekNum - 1) * 7 days to get Monday of target week, then add 6 for Sunday
  const sundayOfWeek = new Date(mondayOfWeek1);
  sundayOfWeek.setDate(mondayOfWeek1.getDate() + (weekNum - 1) * 7 + 6);
  
  const dateStr = sundayOfWeek.toISOString().split('T')[0];
  
  return { 
    week: dateStr,
    weekLabel: dateStr,
    count: num(r.count) 
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
    tso: 0,
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
