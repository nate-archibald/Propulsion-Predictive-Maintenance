// ─── Removal Plan chat parser ───────────────────────────────────────────────
// Deterministic natural-language → constraint translator for the Engine Removal
// Plan. No model call: every supported phrasing maps to a concrete mutation of
// the PlanConstraints object (or the spacing lever), so results are instant,
// free, predictable, and auditable. Anything it can't confidently parse is
// returned as a friendly "not understood" so the user can rephrase.
//
// Supported intents:
//   • PIN      "have the first removal be the first week of January 2027"
//              "pin removal 2 to 2027-03-15", "first removal on Jan 4 2027"
//   • BLACKOUT "no removals in March", "no removals in March 2027",
//              "blackout April–June 2027", "no removals between X and Y"
//   • CADENCE  "space removals 4 weeks apart", "set cadence to 2 weeks"
//   • RATECAP  "max one removal per month", "no more than 2 removals a month"
//   • FLOOR    "keep at least 1000 remaining hours on the limit",
//              "every removal leaves a 1,500 hour floor", "remove the hour floor"
//   • ORDER    "remove ESN-31047 first", "do ESN-31045 then ESN-31042",
//              "put N642QX first", "ESN-31047 before ESN-31050"
//   • CLEAR    "clear constraints", "reset the plan", "start over"

import type { PlanConstraints, Blackout, RemovalPin } from "./removalSchedule";

export interface EngineRef {
  engineSN: string;
  tail: string;
}

export interface ParseContext {
  today: Date;
  engines: EngineRef[]; // installed engines currently in the plan (for order/pin-by-engine)
  spacingWeeks: number; // current cadence lever
}

export type ParseIntent =
  | "pin"
  | "blackout"
  | "cadence"
  | "ratecap"
  | "floor"
  | "order"
  | "clear"
  | "unknown";

export interface ParseResult {
  ok: boolean;
  intent: ParseIntent;
  summary: string; // human-readable confirmation (or error message)
  nextConstraints?: PlanConstraints; // present when a constraint changed
  nextSpacingWeeks?: number; // present when the cadence lever changed
}

const DAY_MS = 86_400_000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + Math.round(days) * DAY_MS);
}
function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function mondayOnOrBefore(d: Date): Date {
  const day = d.getDay();
  const sinceMonday = (day + 6) % 7;
  return addDays(startOfDay(d), -sinceMonday);
}
function mondayOnOrAfter(d: Date): Date {
  const day = d.getDay();
  const untilMonday = (8 - day) % 7;
  return addDays(startOfDay(d), untilMonday);
}
function endOfMonth(year: number, month0: number): Date {
  return new Date(year, month0 + 1, 0);
}

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const ORDINAL_WORDS: Record<string, number> = {
  first: 1, "1st": 1,
  second: 2, "2nd": 2,
  third: 3, "3rd": 3,
  fourth: 4, "4th": 4,
  fifth: 5, "5th": 5,
  sixth: 6, "6th": 6,
  seventh: 7, "7th": 7,
  eighth: 8, "8th": 8,
  ninth: 9, "9th": 9,
  tenth: 10, "10th": 10,
};

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, no: 0, one: 1, a: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

function clone(c: PlanConstraints): PlanConstraints {
  return {
    order: c.order ? [...c.order] : undefined,
    pins: c.pins ? c.pins.map((p) => ({ ...p })) : undefined,
    blackouts: c.blackouts ? c.blackouts.map((b) => ({ ...b })) : undefined,
    maxPerMonth: c.maxPerMonth ?? undefined,
    minHrsFloor: c.minHrsFloor ?? undefined,
  };
}

// Resolve a month name to a year — explicit year if present, else the next
// occurrence on/after the current month.
function resolveMonth(
  monthName: string,
  yearStr: string | undefined,
  today: Date,
): { year: number; month0: number } | null {
  const m = MONTHS[monthName.toLowerCase()];
  if (m == null) return null;
  let year: number;
  if (yearStr) {
    year = parseInt(yearStr, 10);
    if (year < 100) year += 2000;
  } else {
    year = today.getFullYear();
    if (m < today.getMonth()) year += 1; // already past this year → next year
  }
  return { year, month0: m };
}

// Parse an explicit calendar day: ISO (2027-01-04), "Jan 4 2027",
// "January 4, 2027", or "4 January 2027".
function parseExplicitDate(text: string, today: Date): Date | null {
  const isoM = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoM) {
    return new Date(+isoM[1], +isoM[2] - 1, +isoM[3]);
  }
  // Month DD, YYYY
  let m = text.match(
    /\b([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/i,
  );
  if (m && MONTHS[m[1].toLowerCase()] != null) {
    const month0 = MONTHS[m[1].toLowerCase()];
    const day = parseInt(m[2], 10);
    const year = m[3]
      ? parseInt(m[3], 10)
      : today.getFullYear() + (month0 < today.getMonth() ? 1 : 0);
    return new Date(year, month0, day);
  }
  // DD Month YYYY
  m = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\.?(?:\s+(\d{4}))?\b/i);
  if (m && MONTHS[m[2].toLowerCase()] != null) {
    const month0 = MONTHS[m[2].toLowerCase()];
    const day = parseInt(m[1], 10);
    const year = m[3]
      ? parseInt(m[3], 10)
      : today.getFullYear() + (month0 < today.getMonth() ? 1 : 0);
    return new Date(year, month0, day);
  }
  return null;
}

// "first/second/…/last week of January 2027" → the Monday of that week.
// Week 1's Monday is the first Monday of the month; "last" is the last Monday.
function parseWeekOfMonth(text: string, today: Date): Date | null {
  const m = text.match(
    /\b(first|second|third|fourth|fifth|last|1st|2nd|3rd|4th|5th)\s+week\s+of\s+([a-z]+)\.?(?:\s+(\d{4}))?/i,
  );
  if (!m) return null;
  const res = resolveMonth(m[2], m[3], today);
  if (!res) return null;
  const firstMonday = mondayOnOrAfter(new Date(res.year, res.month0, 1));
  if (/last/i.test(m[1])) {
    const lastMonday = mondayOnOrBefore(endOfMonth(res.year, res.month0));
    return lastMonday;
  }
  const n = ORDINAL_WORDS[m[1].toLowerCase()] ?? 1;
  return addDays(firstMonday, (n - 1) * 7);
}

// Resolve any date-ish phrase to a concrete Monday (snapping on/before).
function parseDateToMonday(text: string, today: Date): Date | null {
  const wk = parseWeekOfMonth(text, today);
  if (wk) return wk; // already a Monday
  const exact = parseExplicitDate(text, today);
  if (exact) return mondayOnOrBefore(exact);
  // "in <Month> [Year]" with no day → first week's Monday of that month.
  const m = text.match(/\b(?:in|during|of|for)\s+([a-z]+)\.?(?:\s+(\d{4}))?/i);
  if (m && MONTHS[m[1].toLowerCase()] != null) {
    const res = resolveMonth(m[1], m[2], today);
    if (res) return mondayOnOrAfter(new Date(res.year, res.month0, 1));
  }
  return null;
}

function pickOrdinal(text: string): number | null {
  // "first/second/… removal" or "removal 2" / "removal #2" / "2nd removal"
  let m = text.match(
    /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th)\s+removal\b/i,
  );
  if (m) return ORDINAL_WORDS[m[1].toLowerCase()] ?? null;
  m = text.match(/\bremoval\s*#?\s*(\d{1,2})\b/i);
  if (m) return parseInt(m[1], 10);
  return null;
}

// Find engine references (ESN tokens or tails) in a phrase, in order of
// appearance, resolved to canonical engineSNs.
function findEngineRefs(text: string, engines: EngineRef[]): string[] {
  const tokens = text.match(/\b[A-Za-z]{1,5}-?\d{2,6}[A-Za-z]{0,3}\b/g) ?? [];
  const byUpper = new Map<string, string>();
  for (const e of engines) {
    byUpper.set(e.engineSN.trim().toUpperCase(), e.engineSN);
    if (e.tail) byUpper.set(e.tail.trim().toUpperCase(), e.engineSN);
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of tokens) {
    const key = t.trim().toUpperCase();
    const sn = byUpper.get(key);
    if (sn && !seen.has(sn)) {
      seen.add(sn);
      out.push(sn);
    }
  }
  return out;
}

function err(intent: ParseIntent, summary: string): ParseResult {
  return { ok: false, intent, summary };
}

export function parsePlanCommand(
  raw: string,
  prev: PlanConstraints,
  ctx: ParseContext,
): ParseResult {
  const input = raw.trim();
  if (!input) return err("unknown", "Type a request, e.g. “no removals in March 2027”.");
  const text = input.toLowerCase();
  const today = startOfDay(ctx.today);

  // ── CLEAR / RESET ──────────────────────────────────────────────────
  if (/\b(clear|reset|remove all|start over|undo all|wipe)\b/.test(text) &&
      /\b(constraint|constraints|plan|override|overrides|everything|all)\b/.test(text)) {
    return {
      ok: true,
      intent: "clear",
      summary: "Cleared all chat constraints — back to the automatic plan.",
      nextConstraints: {},
    };
  }

  // ── HOURS FLOOR ────────────────────────────────────────────────────
  // "make every removal leave at least 1000 remaining hours on the limit",
  // "keep a 1,500 hour floor", "no removals below 1000 hours left",
  // "remove the hour floor"
  if (/\b(hours?|hrs?)\b/.test(text) &&
      /\b(floor|minimum|min|least|remaining|left|buffer|margin|below|under|above)\b/.test(text)) {
    // Clear an existing floor ("no hour floor", "remove the hours minimum").
    if (/\b(no|remove|clear|drop|without|cancel|reset|lift)\b/.test(text) && !/\d/.test(text)) {
      const next = clone(prev);
      next.minHrsFloor = undefined;
      return {
        ok: true,
        intent: "floor",
        summary: "Removed the remaining-hours floor — removals return to the automatic timing.",
        nextConstraints: next,
      };
    }
    const m =
      text.match(/(\d[\d,]*)\s*(?:remaining\s+)?(?:hours?|hrs?)/) ??
      text.match(/\b(?:floor|minimum|min|least|buffer|margin)\b[^\d]*(\d[\d,]*)/);
    if (m) {
      const hrs = parseInt(m[1].replace(/,/g, ""), 10);
      if (Number.isFinite(hrs) && hrs > 0) {
        const next = clone(prev);
        next.minHrsFloor = hrs;
        return {
          ok: true,
          intent: "floor",
          summary: `Every removal will leave at least ${hrs.toLocaleString()} hours on the HSR limit — engines are pulled earlier when needed to stay above it.`,
          nextConstraints: next,
        };
      }
    }
    return err(
      "floor",
      "Tell me the hours floor, e.g. “keep at least 1,000 remaining hours on the limit”.",
    );
  }

  // ── CADENCE ────────────────────────────────────────────────────────
  // "space removals 4 weeks apart", "set cadence to 2 weeks", "every 5 weeks"
  if (/\b(cadence|spac(e|ing)|apart|every)\b/.test(text) && /week/.test(text)) {
    const m = text.match(/(\d+(?:\.\d+)?)\s*week/);
    const wordNum = Object.keys(NUMBER_WORDS).find((w) =>
      new RegExp(`\\b${w}\\s+week`).test(text),
    );
    const weeks = m ? parseFloat(m[1]) : wordNum ? NUMBER_WORDS[wordNum] : NaN;
    if (!Number.isFinite(weeks) || weeks < 1) {
      return err("cadence", "Tell me the spacing in weeks, e.g. “space removals 4 weeks apart”.");
    }
    const w = Math.max(Math.round(weeks), 1);
    return {
      ok: true,
      intent: "cadence",
      summary: `Cadence set to ${w} week${w === 1 ? "" : "s"} between removals.`,
      nextSpacingWeeks: w,
    };
  }

  // ── RATECAP ────────────────────────────────────────────────────────
  // "max one removal per month", "no more than 2 removals a month"
  if (/\bper\s+month\b|\ba\s+month\b|\beach\s+month\b|\bmonthly\b/.test(text) &&
      /\bremoval/.test(text) &&
      /\b(max|maximum|no more than|at most|only|cap|limit|up to|fewer than|less than)\b/.test(text)) {
    let n = NaN;
    const digit = text.match(/\b(\d+)\b/);
    if (digit) n = parseInt(digit[1], 10);
    else {
      const w = Object.keys(NUMBER_WORDS).find((k) => new RegExp(`\\b${k}\\b`).test(text));
      if (w) n = NUMBER_WORDS[w];
    }
    if (!Number.isFinite(n) || n < 0) {
      return err("ratecap", "Tell me the limit, e.g. “max one removal per month”.");
    }
    const next = clone(prev);
    next.maxPerMonth = n;
    return {
      ok: true,
      intent: "ratecap",
      summary: `Capped removals at ${n} per calendar month.`,
      nextConstraints: next,
    };
  }

  // ── BLACKOUT ───────────────────────────────────────────────────────
  // "no removals in March [2027]", "blackout April to June 2027",
  // "no removals between 2027-03-01 and 2027-03-31"
  if (/\bno\s+removals?\b|\bblackout\b|\bavoid\b|\bnot?\s+in\b|\bskip\b/.test(text)) {
    // Explicit range: "between X and Y" or "X to/through/– Y"
    const rangeM = text.match(
      /\b(?:between\s+)?(.+?)\s+(?:and|to|through|thru|until|[-–—])\s+(.+)$/i,
    );
    if (rangeM) {
      const d1 = parseExplicitDate(rangeM[1], today);
      const d2 = parseExplicitDate(rangeM[2], today);
      // Month-to-month range (e.g. "April to June 2027")
      const mo1 = rangeM[1].match(/\b([a-z]+)\.?(?:\s+(\d{4}))?\s*$/i);
      const mo2 = rangeM[2].match(/\b([a-z]+)\.?(?:\s+(\d{4}))?\b/i);
      if (!d1 && !d2 && mo1 && mo2 && MONTHS[mo1[1].toLowerCase()] != null && MONTHS[mo2[1].toLowerCase()] != null) {
        const yr = mo2[2] || mo1[2];
        const r1 = resolveMonth(mo1[1], mo1[2] || yr, today);
        const r2 = resolveMonth(mo2[1], mo2[2] || yr, today);
        if (r1 && r2) {
          const start = new Date(r1.year, r1.month0, 1);
          const end = endOfMonth(r2.year, r2.month0);
          const b: Blackout = {
            start: iso(start),
            end: iso(end),
            label: `${mo1[1]}–${mo2[1]} ${r2.year}`,
          };
          const next = clone(prev);
          next.blackouts = [...(next.blackouts ?? []), b];
          return { ok: true, intent: "blackout", summary: `Blackout added: no removals ${b.label}.`, nextConstraints: next };
        }
      }
      if (d1 && d2) {
        const b: Blackout = { start: iso(d1 < d2 ? d1 : d2), end: iso(d1 < d2 ? d2 : d1), label: `${iso(d1 < d2 ? d1 : d2)}…${iso(d1 < d2 ? d2 : d1)}` };
        const next = clone(prev);
        next.blackouts = [...(next.blackouts ?? []), b];
        return { ok: true, intent: "blackout", summary: `Blackout added: no removals ${b.start} through ${b.end}.`, nextConstraints: next };
      }
    }
    // Single month: "no removals in March [2027]"
    const monM = text.match(/\b(?:in|during|for)?\s*([a-z]+)\.?(?:\s+(\d{4}))?\b/gi);
    if (monM) {
      for (const chunk of monM) {
        const mm = chunk.match(/\b([a-z]+)\.?(?:\s+(\d{4}))?\b/i);
        if (mm && MONTHS[mm[1].toLowerCase()] != null) {
          const res = resolveMonth(mm[1], mm[2], today);
          if (res) {
            const start = new Date(res.year, res.month0, 1);
            const end = endOfMonth(res.year, res.month0);
            const label = `${mm[1][0].toUpperCase()}${mm[1].slice(1).toLowerCase()} ${res.year}`;
            const b: Blackout = { start: iso(start), end: iso(end), label };
            const next = clone(prev);
            next.blackouts = [...(next.blackouts ?? []), b];
            return { ok: true, intent: "blackout", summary: `Blackout added: no removals in ${label}.`, nextConstraints: next };
          }
        }
      }
    }
    return err("blackout", "Tell me which month or date range to block, e.g. “no removals in March 2027”.");
  }

  // ── PIN ────────────────────────────────────────────────────────────
  // "have the first removal be the first week of January 2027",
  // "pin removal 2 to 2027-03-15", "first removal on Jan 4 2027",
  // "remove ESN-12345 on 2027-03-15" (supports non-Monday dates),
  // "remove the engine on the left side of N5678"
  if (/\b(pin|have|make|set|move|schedule|put|remove)\b/.test(text) || /\bremoval\b/.test(text)) {
    const ordinal = pickOrdinal(text);
    const engineRefs = findEngineRefs(input, ctx.engines);
    
    // Support location-based reference: "left/right side of TAIL" or "left/right wing TAIL"
    let resolvedEngineSN: string | undefined = engineRefs[0];
    if (!resolvedEngineSN && /\b(left|right|l|r)\b/.test(text)) {
      const locM = text.match(/\b(left|right|l|r)(?:\s+(?:side|wing))?\s+(?:of\s+)?([A-Z][0-9A-Z]+)\b/i);
      if (locM) {
        const tail = locM[2].toUpperCase();
        const engine = ctx.engines.find((e) => e.tail?.toUpperCase() === tail);
        if (engine) resolvedEngineSN = engine.engineSN;
      }
    }
    
    // Parse the target date — could be a specific date or a Monday phrase
    const specificDateM = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    let targetDate: Date | null = null;
    
    if (specificDateM) {
      // ISO date format: 2027-03-15 (keep as-is, don't snap to Monday)
      targetDate = new Date(+specificDateM[1], +specificDateM[2] - 1, +specificDateM[3]);
    } else {
      // Try to parse as a Monday phrase (existing behavior)
      targetDate = parseDateToMonday(input, today);
    }
    
    if (targetDate && (ordinal != null || resolvedEngineSN)) {
      const targetIso = iso(targetDate);
      const pin: RemovalPin =
        ordinal != null
          ? { ordinal, monday: targetIso }
          : { engineSN: resolvedEngineSN, monday: targetIso };
      const next = clone(prev);
      // Replace any existing pin on the same target.
      next.pins = [
        ...(next.pins ?? []).filter((p) =>
          ordinal != null ? p.ordinal !== ordinal : p.engineSN !== resolvedEngineSN,
        ),
        pin,
      ];
      const who = ordinal != null ? `Removal #${ordinal}` : `Engine ${resolvedEngineSN}`;
      // Indicate whether it's being pinned to a specific Monday or exact date
      const isExactDate = specificDateM != null;
      const whenStr = isExactDate ? `${targetIso} (exact date)` : `the week of ${targetIso}`;
      return { ok: true, intent: "pin", summary: `${who} pinned to ${whenStr}.`, nextConstraints: next };
    }
    // Fall through to ORDER if engines named without a date.
    if (!targetDate && (ordinal != null || resolvedEngineSN)) {
      return err("pin", "I understood the removal but not the date — try 'first removal in the first week of January 2027' or 'remove ESN-12345 on 2027-03-15'.");
    }
  }

  // ── ORDER ──────────────────────────────────────────────────────────
  // "remove ESN-31047 first", "do ESN-A then ESN-B", "ESN-A before ESN-B",
  // "put N642QX first"
  {
    const refs = findEngineRefs(input, ctx.engines);
    if (refs.length >= 1 && /\b(first|then|before|order|sequence|prioriti[sz]e|move|put|do)\b/.test(text)) {
      let order = refs;
      // "ESN-B before ESN-A" with existing order: keep given order (B,A).
      // "put X first" → X leads, preserve any prior order for the rest.
      const prior = prev.order ?? [];
      const merged = [...order];
      for (const sn of prior) {
        if (!merged.some((s) => s.toUpperCase() === sn.toUpperCase())) merged.push(sn);
      }
      order = merged;
      const next = clone(prev);
      next.order = order;
      const names = refs.join(", ");
      return {
        ok: true,
        intent: "order",
        summary:
          refs.length === 1
            ? `${refs[0]} will be scheduled first.`
            : `Removal order set: ${names} (ahead of the rest).`,
        nextConstraints: next,
      };
    }
  }

  return err(
    "unknown",
    "Sorry, I didn’t catch that. Try: “first removal in the first week of January 2027”, “no removals in March”, “keep at least 1,000 remaining hours on the limit”, “max one removal per month”, “space removals 4 weeks apart”, or “remove ESN-31047 first”.",
  );
}
