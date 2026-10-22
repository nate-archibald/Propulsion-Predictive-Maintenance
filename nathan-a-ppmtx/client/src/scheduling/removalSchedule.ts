// ─── Engine Removal Plan scheduler ──────────────────────────────────────────
// Turns the live per-engine HSR/LLP projection into a dated, sequential removal
// SCHEDULE that mirrors the manual "Removal Plan" worksheet (incl. the
// "Spares @ QX" running balance). All math is client-side so the user can
// re-tune the assumptions (utilization, shop turnaround, spacing) and instantly
// re-plan with zero backend cost.
//
// Rules encoded (V1):
//   • Due date = when an engine's limiting factor (HSR hours-to-target OR
//     binding-LLP cycles-remaining) reaches 0, dated via FH/FC-per-day.
//   • Removals are performed on the MONDAY of the scheduled week.
//   • At most one removal per week; a preferred spacing (default 3 weeks, an
//     adjustable lever) is kept between consecutive removals, hard-floored at 1.
//   • An engine is never scheduled AFTER its due date — so to honor the cadence
//     earlier-due engines get pulled early (leaving leftover life, which the
//     document surfaces).
//   • "Spares @ QX" starts from today's serviceable spare count; each removal
//     consumes a spare (the ESN going on), and the removed engine returns to the
//     pool as a serviceable spare after the shop turnaround (TAT). The balance
//     must stay at or above the required minimum spare count
//     (MIN_REQUIRED_SPARES) — if it would drop below it, the plan is INFEASIBLE
//     and must be reworked.
//   • "ESN going on" = the spare available longest (FIFO) — later to be driven
//     by the spare preservation-timeline tool.

import type { HsrEngine } from "../mock-data";

// ─── User-authored overrides (driven by the plan chat) ─────────────────────
// These let a planner nudge the auto-generated schedule in plain language while
// the math stays deterministic. All adjustments honor the core rule that an
// engine is never flown past its due date (a pin that forces otherwise is kept
// but flagged), and — matching the scheduler's "pull early to fit" philosophy —
// blackouts and per-month caps only ever move removals EARLIER.
export interface RemovalPin {
  ordinal?: number; // 1-based removal position ("first removal" = 1)
  engineSN?: string; // or pin a specific engine instead of a position
  monday: string; // ISO date of the target Monday
}

export interface Blackout {
  start: string; // ISO (inclusive)
  end: string; // ISO (inclusive)
  label?: string; // e.g. "March 2027"
}

export interface PlanConstraints {
  // Engines named here are scheduled first, in the given order, ahead of the
  // rest (which keep their due-date order). engineSNs only (tails pre-resolved).
  order?: string[];
  pins?: RemovalPin[]; // force a removal onto a specific week
  blackouts?: Blackout[]; // weeks with no removals (removals pushed earlier)
  maxPerMonth?: number | null; // cap removals per calendar month
  // Pull every removal early enough that the engine still has at least this many
  // HSR hours left on its limit at removal (a wasted-life ceiling). Matches the
  // scheduler's "pull early" philosophy — it only ever moves removals EARLIER,
  // never past an engine's own due date.
  minHrsFloor?: number | null;
}

export function emptyConstraints(): PlanConstraints {
  return {};
}

export function hasConstraints(c?: PlanConstraints | null): boolean {
  if (!c) return false;
  return Boolean(
    (c.order && c.order.length) ||
      (c.pins && c.pins.length) ||
      (c.blackouts && c.blackouts.length) ||
      (c.maxPerMonth != null) ||
      (c.minHrsFloor != null && c.minHrsFloor > 0),
  );
}

export interface PlanParams {
  fhPerDay: number;
  fcPerDay: number;
  tatDays: number; // shop turnaround (removal → back as serviceable spare)
  spacingWeeks: number; // TARGET weeks between removals (goal, not a hard floor)
  horizonMonths: number; // planning window
  startSpares: number; // serviceable spare engines today
  startSpareEsns?: string[]; // their ESNs (for the "ESN going on" column)
  // Future spare deliveries: engines that join the serviceable pool on a known
  // arrival date (e.g. a new spare slated for late Jan 2027). Each becomes a
  // FIFO-assignable spare and bumps the running balance from its arrival week —
  // exactly like a shop return, just with no prior removal. `availDate` is ISO
  // (snapped to the Monday on/after arrival, mirroring the shop-return rule).
  incomingSpares?: { esn: string; availDate: string }[];
  constraints?: PlanConstraints; // chat-authored overrides (optional)
  // When true, every engine's scheduling ceiling is tightened to its due date
  // minus the at-removal buffer (below), and the cadence is allowed to compress
  // down to the fixed 1-week floor to beat that threshold. Engines that still
  // cannot fit (even at 1/week) are reported in `forceInfeasible`.
  forceBeforeLimit?: boolean;
  minHrsAtRemoval?: number; // HSR buffer to keep at removal (force mode)
  minCycAtRemoval?: number; // LLP buffer to keep at removal (force mode)
  today?: Date;
}

export interface PlanRow {
  engineSN: string;
  tail: string;
  position?: string; // "L" or "R" for engine position
  bindingConstraint: "HSR" | "LLP";
  dueDate: string; // when the limiting factor hits 0
  removalDate: string; // scheduled Monday (≤ due date, or later if over capacity)
  weeksEarly: number; // signed: + = pulled early, − = flown past the due date
  esnGoingOn: string; // assigned spare (FIFO), "" if none available
  returnDate: string; // removal + TAT (removed engine back as a spare)
  sparesAtQx: number; // running serviceable-spare balance after this removal
  // Limiting-factor life left at the removal. Negative when flown past the limit.
  limitingUnit: "hr" | "cyc";
  limitingRemainingNow: number;
  limitingRemainingAtRemoval: number;
  // Both factors' leftover at removal (for context / wasted-life visibility).
  hrsRemainingAtRemoval: number;
  cycRemainingAtRemoval: number | null;
  feasible: boolean;
  issue?: string;
}

export interface BalancePoint {
  date: string;
  spares: number;
}

export interface WeekRow {
  weekDate: string; // Monday of the week
  sparesAtQx: number; // serviceable-spare balance at the end of this week
  removal?: PlanRow; // the removal happening this week (if any)
  returnedEsns: string[]; // engines that came back from the shop this week
  incomingEsns: string[]; // newly-delivered spare engines that arrived this week
}

export interface PlanResult {
  rows: PlanRow[];
  weeks: WeekRow[];
  balanceSeries: BalancePoint[];
  minSpares: number;
  feasible: boolean;
  firstIssueDate: string | null;
  issues: string[];
  // Non-fatal notices raised while honoring chat constraints (e.g. a pin that
  // lands after an engine's due date, or a blackout that had to compress the
  // cadence). The plan is still returned (apply-with-warning behavior).
  constraintWarnings: string[];
  // Force-before-limit mode: engines that could NOT be scheduled before their
  // due-date-minus-buffer threshold even after compressing the cadence to the
  // 1-week floor (a genuine physical conflict). Empty when the mode is off or
  // everything fits.
  forceInfeasible: string[];
}

const DAY_MS = 86_400_000;

// The hard cadence floor: the plan prefers the user's TARGET spacing, but when a
// congested cluster can't fit at that cadence it may compress down to this —
// one removal per week — but never tighter. Fixed (non-variable) per product
// decision: it models the real shop/logistics intake limit.
const MIN_SPACING_DAYS = 7;

// Required minimum serviceable-spare balance. The plan is only viable if the
// running "Spares @ QX" balance stays at or above this floor across the whole
// horizon. Set to 1 so at least one serviceable spare is always held in reserve.
export const MIN_REQUIRED_SPARES = 1;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(base: Date, days: number): Date {
  // Calendar-day arithmetic (not fixed-ms) so daylight-saving transitions never
  // shift a result onto the wrong day — a fixed 86.4M-ms step lands an hour
  // short across a fall-back boundary and snaps the Monday a full week early.
  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate() + Math.round(days),
    base.getHours(),
    base.getMinutes(),
    base.getSeconds(),
    base.getMilliseconds(),
  );
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Monday on or before the given date (so snapping never pushes past the due date).
function mondayOnOrBefore(d: Date): Date {
  const day = d.getDay(); // 0=Sun … 6=Sat
  const sinceMonday = (day + 6) % 7;
  return addDays(startOfDay(d), -sinceMonday);
}

// Monday on or after the given date — a shop return that lands mid-week only
// becomes a usable spare on the following Monday's removal, so we attribute the
// return (and its spare-count bump) to that week.
function mondayOnOrAfter(d: Date): Date {
  const day = d.getDay(); // 0=Sun … 6=Sat
  const untilMonday = (8 - day) % 7; // 0 when already Monday
  return addDays(startOfDay(d), untilMonday);
}

function normSN(sn: string | undefined | null): string {
  return String(sn ?? "").trim().toUpperCase();
}

function parseIso(s: string): Date {
  // Treat the ISO date as a local calendar day (avoids TZ drift off the Monday).
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

function weekInBlackout(monday: Date, blackouts: Blackout[] | undefined): Blackout | null {
  if (!blackouts) return null;
  const t = monday.getTime();
  for (const b of blackouts) {
    const s = startOfDay(parseIso(b.start)).getTime();
    const e = startOfDay(parseIso(b.end)).getTime();
    if (t >= s && t <= e) return b;
  }
  return null;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Apply the chat-authored constraints to the backbone's Monday assignments.
// Mutates `removalDates` in place and returns any non-fatal warnings. `candidates`
// is in removal-sequence order (index 0 removed first); `dueMonday[i]` is the
// latest Monday engine i may be pulled to without flying past its limit.
function applyPlanConstraints(
  candidates: Candidate[],
  removalDates: Date[],
  dueMonday: Date[],
  firstMonday: Date,
  constraints: PlanConstraints,
): string[] {
  const warnings: string[] = [];
  const n = candidates.length;
  if (n === 0) return warnings;

  const spacing = MIN_SPACING_DAYS; // ordering gap only — hard 1-week floor (the
  // capacity-aware spread already lives in the backbone `removalDates`)

  // Resolve pins to sequence indices → target Monday.
  const pinMonday = new Map<number, Date>();
  for (const pin of constraints.pins ?? []) {
    let idx = -1;
    if (pin.ordinal != null) idx = pin.ordinal - 1;
    else if (pin.engineSN)
      idx = candidates.findIndex((c) => normSN(c.e.engineSN) === normSN(pin.engineSN));
    const label = pin.ordinal != null ? `removal #${pin.ordinal}` : `engine ${pin.engineSN}`;
    if (idx < 0 || idx >= n) {
      warnings.push(`Pin ignored — there is no ${label} in the current plan.`);
      continue;
    }
    let m = mondayOnOrBefore(parseIso(pin.monday));
    if (m.getTime() < firstMonday.getTime()) {
      warnings.push(
        `Removal #${idx + 1} (${candidates[idx].e.engineSN}) was pinned to ${pin.monday}, which is in the past — moved to the first schedulable week (${iso(firstMonday)}).`,
      );
      m = firstMonday;
    }
    pinMonday.set(idx, m);
  }

  // Single latest-first placement pass. Each removal STARTS from its
  // capacity-aware backbone Monday (already in `removalDates`) and is only moved
  // EARLIER when ordering (a 1-week gap before the next removal), its due-week
  // ceiling, a blackout week, or a full calendar month requires it. It is never
  // re-derived from a naive target-spacing chain — that is what reintroduced the
  // long-horizon cascade (removals pulled into 2026) and drove the spare balance
  // negative whenever a chat constraint was present.
  const cap =
    constraints.maxPerMonth != null && constraints.maxPerMonth >= 0
      ? Math.floor(constraints.maxPerMonth)
      : null;
  const monthCount = new Map<string, number>();
  const bump = (d: Date) => monthCount.set(monthKey(d), (monthCount.get(monthKey(d)) ?? 0) + 1);
  const monthFull = (d: Date) => cap != null && (monthCount.get(monthKey(d)) ?? 0) >= cap;
  const blocked = (d: Date) => weekInBlackout(d, constraints.blackouts) != null;

  let nextStart = Infinity; // time of the previously placed (later) removal

  for (let i = n - 1; i >= 0; i--) {
    let m: Date;
    if (pinMonday.has(i)) {
      m = pinMonday.get(i)!;
      if (m.getTime() > dueMonday[i].getTime()) {
        warnings.push(
          `Removal #${i + 1} (${candidates[i].e.engineSN}) is pinned to ${iso(m)}, after its due week ${iso(dueMonday[i])} — the engine would exceed its limit. Kept as requested.`,
        );
      }
      const b = weekInBlackout(m, constraints.blackouts);
      if (b)
        warnings.push(
          `Removal #${i + 1} (${candidates[i].e.engineSN}) is pinned inside the blackout ${b.label ?? `${b.start}…${b.end}`}. Kept as requested.`,
        );
    } else {
      // Keep the capacity-aware backbone position unless ordering or the due
      // ceiling force it earlier.
      const latestMs = Number.isFinite(nextStart)
        ? Math.min(dueMonday[i].getTime(), nextStart - spacing * DAY_MS)
        : dueMonday[i].getTime();
      m = removalDates[i]; // capacity-aware backbone
      if (m.getTime() > latestMs) m = new Date(latestMs);
      // Snap to a Monday on/before (ceiling may be off-grid after the -spacing).
      m = mondayOnOrBefore(m);
      // Step earlier out of blackout weeks and full months.
      let guard = 0;
      while ((blocked(m) || monthFull(m)) && m.getTime() > firstMonday.getTime() && guard++ < 1040) {
        m = addDays(m, -7);
      }
      if (m.getTime() < firstMonday.getTime()) {
        m = firstMonday;
      }
      if (blocked(m)) {
        const b = weekInBlackout(m, constraints.blackouts)!;
        warnings.push(
          `Removal #${i + 1} (${candidates[i].e.engineSN}) could not be pulled clear of the blackout ${b.label ?? `${b.start}…${b.end}`} — left at ${iso(m)}.`,
        );
      } else if (cap != null && monthFull(m)) {
        warnings.push(
          `Per-month cap (${cap}) could not be fully met — removal #${i + 1} (${candidates[i].e.engineSN}) could not be pulled earlier.`,
        );
      }
    }
    removalDates[i] = m;
    bump(m);
    nextStart = m.getTime();
  }

  return warnings;
}



interface Candidate {
  e: HsrEngine;
  bindingConstraint: "HSR" | "LLP";
  dueDays: number;
  hsrDaysToDue: number;
  llpDaysToDue: number;
}

export function buildRemovalPlan(
  engines: HsrEngine[],
  params: PlanParams,
): PlanResult {
  const today = startOfDay(params.today ?? new Date());
  const fh = params.fhPerDay > 0 ? params.fhPerDay : null;
  const fc = params.fcPerDay > 0 ? params.fcPerDay : null;
  const tat = Math.max(params.tatDays, 0);
  const spacingDays = Math.max(Math.round(params.spacingWeeks), 1) * 7;
  const horizonDays = Math.max(params.horizonMonths, 1) * 30.4375;

  // 1) Due date per installed engine (whichever limit lands first). Both limits
  //    are converted to days using the fleet FH/FC levers at the top of the page
  //    — tuning those assumptions re-plans every engine uniformly.
  const candidates: Candidate[] = [];
  for (const e of engines) {
    if (!e.currentlyInstalled) continue;
    const hsrDays = fh ? Math.max(e.hsrTarget - e.tshsi, 0) / fh : Infinity;
    const llpDays =
      fc && e.minCyclesRemaining != null
        ? Math.max(e.minCyclesRemaining, 0) / fc
        : Infinity;
    const dueDays = Math.min(hsrDays, llpDays);
    if (!Number.isFinite(dueDays)) continue; // no rate / no limit data
    if (dueDays > horizonDays) continue; // beyond the planning window
    candidates.push({
      e,
      bindingConstraint: hsrDays <= llpDays ? "HSR" : "LLP",
      dueDays,
      hsrDaysToDue: hsrDays,
      llpDaysToDue: llpDays,
    });
  }

  candidates.sort((a, b) => a.dueDays - b.dueDays);

  // Optional user-authored ordering: named engines are scheduled first, in the
  // given order, ahead of the remaining engines (which keep their due-date
  // order). engineSNs are pre-resolved from tails by the caller.
  const constraints = params.constraints ?? {};
  if (constraints.order && constraints.order.length) {
    const want = constraints.order.map(normSN);
    const rank = (sn: string) => {
      const i = want.indexOf(normSN(sn));
      return i < 0 ? Number.POSITIVE_INFINITY : i;
    };
    candidates.sort((a, b) => {
      const ra = rank(a.e.engineSN);
      const rb = rank(b.e.engineSN);
      if (ra !== rb) return ra - rb;
      return a.dueDays - b.dueDays;
    });
  }

  // Scheduling ceiling per engine = the latest day it may be pulled. Normally
  // this is its own due date. Two things can tighten it earlier:
  //  • the chat lever "keep ≥ N hours on the limit" (minHrsFloor), and
  //  • force-before-limit mode, which subtracts the at-removal buffer in the
  //    engine's BINDING unit (hours for HSR, cycles for LLP) so the engine is
  //    scheduled with at least that much life left.
  // The true due date is kept separately for display / wasted-life math.
  const forceBeforeLimit = params.forceBeforeLimit ?? false;
  const minHrs = Math.max(params.minHrsAtRemoval ?? 0, 0);
  const minCyc = Math.max(params.minCycAtRemoval ?? 0, 0);
  const hrsFloor =
    constraints.minHrsFloor != null && constraints.minHrsFloor > 0
      ? constraints.minHrsFloor
      : null;
  // Days of life represented by the force buffer for each engine (binding unit).
  const bufferDaysOf = (c: Candidate): number => {
    if (!forceBeforeLimit) return 0;
    if (c.bindingConstraint === "HSR") return fh ? minHrs / fh : 0;
    return fc ? minCyc / fc : 0;
  };
  const ceilingDays = candidates.map((c) => {
    let ceil = c.dueDays;
    const buf = bufferDaysOf(c);
    if (buf > 0) ceil = Math.min(ceil, Math.max(c.dueDays - buf, 0));
    if (hrsFloor != null && fh) {
      const hsrRem = Math.max(c.e.hsrTarget - c.e.tshsi, 0);
      ceil = Math.min(ceil, Math.max((hsrRem - hrsFloor) / fh, 0));
    }
    return ceil;
  });

  // 2) Assign removal days, latest-first (ALAP), under TWO spreading forces:
  //
  //    (a) TARGET cadence for breathing room, with the early-pull *for spacing*
  //        capped at one interval so a far-future cluster can't chain the full
  //        target spacing backward and yank near-term engines dozens of weeks
  //        early (the old "80 bunched, 74-weeks-early" artifact). An engine sits
  //        at its own ceiling unless a *nearby* neighbor forces it in.
  //
  //    (b) SPARE THROUGHPUT. The serviceable-spare balance equals
  //        startSpares − (removals in the trailing shop-turn window), because a
  //        removed engine only returns as a spare after the shop TAT. So no
  //        rolling TAT-length window may hold more than `maxPerWindow` removals
  //        or the balance drops below MIN_REQUIRED_SPARES ("no serviceable
  //        spare — not viable"). If placing an engine would overfill its window,
  //        pull it EARLIER — into the idle months ahead of the cluster — just
  //        enough to stay within capacity. This spends idle spare capacity to
  //        de-congest a cluster (start it sooner) instead of bunching it against
  //        the due dates and sinking the balance negative.
  //
  //    No engine is ever placed after its ceiling, and each is pulled only as
  //    early as (a) and (b) require.
  const earlyCap = spacingDays; // max early-pull for spacing (capacity may pull further)
  const maxPerWindow = Math.max(params.startSpares - MIN_REQUIRED_SPARES, 1);
  const capWindowDays = tat + 7; // rolling shop-turn window (+1 wk for the Monday return snap)
  const countInWindow = (
    arr: number[],
    from: number,
    to: number,
    lo: number,
    hi: number,
  ): number => {
    let n = 0;
    for (let j = from; j < to; j++) if (arr[j] >= lo && arr[j] < hi) n++;
    return n;
  };
  const removalDays = new Array<number>(candidates.length);
  for (let i = candidates.length - 1; i >= 0; i--) {
    const ceil = ceilingDays[i];
    let day: number;
    if (i === candidates.length - 1) {
      day = ceil;
    } else {
      const next = removalDays[i + 1];
      const targetPos = Math.min(ceil, next - spacingDays); // where target spacing wants it
      const earlyFloor = ceil - earlyCap; // don't pull more than one interval early for spacing
      day = Math.max(targetPos, earlyFloor); // cap the spacing-driven early pull
      day = Math.min(day, next - MIN_SPACING_DAYS); // hard 1-week floor (mandatory compression)
    }
    // Spare-throughput de-congestion: while this engine's forward shop-turn
    // window already holds the most removals the spare pool can support, pull it
    // one week earlier — into the idle runway ahead of the cluster.
    let guard = 0;
    while (
      countInWindow(
        removalDays,
        i + 1,
        candidates.length,
        day,
        day + capWindowDays,
      ) >= maxPerWindow &&
      guard++ < 2000
    ) {
      day -= MIN_SPACING_DAYS;
    }
    removalDays[i] = day;
  }

  // 2b) Forward feasibility pass. After the capped backward pass an engine only
  //     lands before today when the fleet is GENUINELY over capacity near the
  //     start (more engines due soon than can fit even at the 1-week floor).
  //     Clamp those to the coming Monday and pack forward at the 1-week floor so
  //     they don't stack same-day (which would drain the spare pool instantly).
  //     In the healthy case nothing moves here.
  const firstMonday = mondayOnOrBefore(addDays(today, 6)); // this/next Monday
  const firstMondayDay = (firstMonday.getTime() - today.getTime()) / DAY_MS;
  let floorDay = firstMondayDay;
  for (let i = 0; i < candidates.length; i++) {
    if (removalDays[i] < floorDay) removalDays[i] = floorDay;
    floorDay = removalDays[i] + MIN_SPACING_DAYS;
  }

  // 3) Snap each removal to the Monday on/before, clamped to no earlier than the
  //    coming Monday (can't remove in the past).
  const removalDates = candidates.map((_, i) => {
    let m = mondayOnOrBefore(addDays(today, removalDays[i]));
    if (m.getTime() < firstMonday.getTime()) m = firstMonday;
    return m;
  });

  // Apply chat-authored overrides (pins, blackouts, per-month cap). Ordering was
  // handled above, before the backbone assignment. The ceiling-week per engine
  // (due date, tightened by any hours floor) keeps the limit rules intact.
  const dueMonday = candidates.map((_, i) => {
    let m = mondayOnOrBefore(addDays(today, ceilingDays[i]));
    if (m.getTime() < firstMonday.getTime()) m = firstMonday;
    return m;
  });
  const constraintWarnings = hasConstraints(constraints)
    ? applyPlanConstraints(
        candidates,
        removalDates,
        dueMonday,
        firstMonday,
        constraints,
      )
    : [];

  // 4) Walk removals in time order: FIFO spare assignment + running balance.
  const sparePool: { esn: string; availDay: number }[] = [];
  const esns = params.startSpareEsns ?? [];
  for (let k = 0; k < params.startSpares; k++) {
    sparePool.push({ esn: esns[k] ?? `SPARE-${k + 1}`, availDay: -Infinity });
  }

  // Future spare deliveries join the pool on the Monday on/after their arrival
  // (same usability rule as a shop return). From that day a removal can draw on
  // them via the normal FIFO pick below, and the balance series / weekly count
  // reflect the +1 — no special-casing beyond seeding the pool with a positive
  // availDay instead of -Infinity.
  const incomingDays = (params.incomingSpares ?? []).map((s) => ({
    esn: s.esn || "Incoming",
    availDay:
      (mondayOnOrAfter(parseIso(s.availDate)).getTime() - today.getTime()) /
      DAY_MS,
  }));
  for (const s of incomingDays) {
    sparePool.push({ esn: s.esn, availDay: s.availDay });
  }

  const issues: string[] = [];
  let firstIssueDate: string | null = null;

  const rows: PlanRow[] = candidates.map((c, i) => {
    const removalDate = removalDates[i];
    const removalDay = (removalDate.getTime() - today.getTime()) / DAY_MS;
    const dueDate = addDays(today, c.dueDays);
    // Signed: positive = pulled early (life left on the limit), negative = flown
    // PAST the due date (overflow engines that could not be fit before due).
    const weeksEarly = (c.dueDays - removalDay) / 7;

    // Pick the longest-available spare that has arrived by the removal date.
    const ready = sparePool
      .map((s, idx) => ({ s, idx }))
      .filter((x) => x.s.availDay <= removalDay)
      .sort((a, b) => a.s.availDay - b.s.availDay);

    let esnGoingOn = "";
    let feasible = true;
    let issue: string | undefined;
    if (ready.length === 0) {
      feasible = false;
      issue = "No serviceable spare available — plan not viable, must be reworked.";
      if (!firstIssueDate) firstIssueDate = iso(removalDate);
      issues.push(`${iso(removalDate)}: ${c.e.engineSN} has no spare to install.`);
    } else {
      const pick = ready[0];
      esnGoingOn = pick.s.esn;
      sparePool.splice(pick.idx, 1);
    }

    // The removed engine returns to the pool as a serviceable spare after TAT.
    sparePool.push({ esn: c.e.engineSN, availDay: removalDay + tat });

    const sparesAtQx =
      sparePool.filter((s) => s.availDay <= removalDay).length - (feasible ? 0 : 1);

    // Limiting-factor life left AT the (possibly late) removal. NOT clamped at
    // zero: when an engine is scheduled past its due date it is flown beyond the
    // limit, so this goes negative — surfaced in the UI so the overrun is visible
    // rather than hidden as "0 hr".
    const hrsRemainingAtRemoval =
      c.e.hsrTarget - c.e.tshsi - (fh ?? 0) * removalDay;
    const cycRemainingAtRemoval =
      c.e.minCyclesRemaining != null
        ? c.e.minCyclesRemaining - (fc ?? 0) * removalDay
        : null;

    const limitingUnit: "hr" | "cyc" = c.bindingConstraint === "HSR" ? "hr" : "cyc";
    const limitingRemainingNow =
      c.bindingConstraint === "HSR"
        ? Math.max(c.e.hsrTarget - c.e.tshsi, 0)
        : (c.e.minCyclesRemaining ?? 0);
    const limitingRemainingAtRemoval =
      c.bindingConstraint === "HSR"
        ? hrsRemainingAtRemoval
        : (cycRemainingAtRemoval ?? 0);

    return {
      engineSN: c.e.engineSN,
      tail: c.e.installedAC,
      position: c.e.position,
      bindingConstraint: c.bindingConstraint,
      dueDate: iso(dueDate),
      removalDate: iso(removalDate),
      weeksEarly,
      esnGoingOn,
      returnDate: iso(addDays(removalDate, tat)),
      sparesAtQx,
      limitingUnit,
      limitingRemainingNow,
      limitingRemainingAtRemoval,
      hrsRemainingAtRemoval,
      cycRemainingAtRemoval,
      feasible,
      issue,
    };
  });

  // Flag any engine the hours floor could not be honored for (already below the
  // floor today, or held later by the earliest schedulable week / cadence).
  if (hrsFloor != null) {
    for (const r of rows) {
      if (r.hrsRemainingAtRemoval < hrsFloor - 1) {
        constraintWarnings.push(
          `${r.engineSN} (removal ${r.removalDate}) leaves ${Math.round(r.hrsRemainingAtRemoval).toLocaleString()} hr on the limit — below the ${hrsFloor.toLocaleString()} hr floor; it could not be pulled earlier.`,
        );
      }
    }
  }

  // Force-before-limit: list every engine whose scheduled removal still leaves
  // LESS than the required at-removal buffer in its binding unit — i.e. the
  // cadence could not be compressed enough (even at the 1-week floor) to beat
  // its due-date-minus-buffer threshold. These are genuine physical conflicts
  // the planner must resolve (add a spare, raise intake, accept an overrun).
  const forceInfeasible: string[] = [];
  if (forceBeforeLimit) {
    for (const r of rows) {
      const buf = r.limitingUnit === "hr" ? minHrs : minCyc;
      if (buf > 0 && r.limitingRemainingAtRemoval < buf) {
        const short = Math.round(buf - r.limitingRemainingAtRemoval);
        forceInfeasible.push(
          `${r.engineSN} (removal ${r.removalDate}) leaves ${Math.round(r.limitingRemainingAtRemoval).toLocaleString()} ${r.limitingUnit} — ${short.toLocaleString()} ${r.limitingUnit} short of the ${buf.toLocaleString()} ${r.limitingUnit} buffer; can't fit before its limit even at one removal/week.`,
        );
      }
    }
  }

  // 5) Spare-balance series over the horizon for the chart (removal −1, return +1).
  const events: { day: number; delta: number }[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const rDay = (removalDates[i].getTime() - today.getTime()) / DAY_MS;
    // The removed engine only re-enters the serviceable pool on the Monday on
    // or after it comes back from the shop (a mid-week return waits a week).
    const retDay =
      (mondayOnOrAfter(addDays(removalDates[i], tat)).getTime() -
        today.getTime()) /
      DAY_MS;
    events.push({ day: rDay, delta: -1 });
    events.push({ day: retDay, delta: +1 });
  }
  // Incoming spare deliveries add +1 to the serviceable balance on arrival.
  for (const s of incomingDays) {
    events.push({ day: s.availDay, delta: +1 });
  }
  // Returns before removals when they fall on the same day (a freed spare is
  // usable that day).
  events.sort((a, b) => a.day - b.day || b.delta - a.delta);

  const balanceSeries: BalancePoint[] = [
    { date: iso(today), spares: params.startSpares },
  ];
  let balance = params.startSpares;
  let minSpares = params.startSpares;
  for (const ev of events) {
    balance += ev.delta;
    if (balance < minSpares) minSpares = balance;
    balanceSeries.push({ date: iso(addDays(today, ev.day)), spares: balance });
  }

  const feasible = minSpares >= MIN_REQUIRED_SPARES && rows.every((r) => r.feasible);

  // 6) Week-by-week timeline: one row for every Monday from the first removal
  //    through the last shop return, so the cadence (spaced-out removals) and
  //    every change in the serviceable-spare count are visible at a glance.
  const weeks: WeekRow[] = [];
  if (candidates.length > 0 || incomingDays.length > 0) {
    const removalAbs = removalDates.map(
      (d) => (d.getTime() - today.getTime()) / DAY_MS,
    );
    // Returns snap to the Monday on/after the engine is back from the shop, so a
    // mid-week return is shown (and counted) in the following week.
    const returnAbs = removalDates.map(
      (d) =>
        (mondayOnOrAfter(addDays(d, tat)).getTime() - today.getTime()) / DAY_MS,
    );
    const incomingAbs = incomingDays.map((s) => s.availDay);
    // The timeline spans from the earliest of (first removal, first delivery)
    // through the latest of (last shop return, last delivery), so an incoming
    // spare always gets a week row even if it lands outside the removal cluster.
    const startTimes = [
      ...removalDates.map((d) => d.getTime()),
      ...incomingAbs.map((d) => addDays(today, d).getTime()),
    ];
    const firstWeekMonday = startOfDay(new Date(Math.min(...startTimes)));
    const lastDay = Math.max(0, ...returnAbs, ...incomingAbs);
    for (
      let wk = firstWeekMonday;
      (wk.getTime() - today.getTime()) / DAY_MS <= lastDay;
      wk = addDays(wk, 7)
    ) {
      const weekStart = (wk.getTime() - today.getTime()) / DAY_MS;
      const weekEnd = weekStart + 7;
      const wkIso = iso(wk);
      const ri = removalDates.findIndex((d) => iso(d) === wkIso);
      const returnedEsns = candidates
        .filter((_, i) => returnAbs[i] >= weekStart && returnAbs[i] < weekEnd)
        .map((c) => c.e.engineSN);
      const incomingEsns = incomingDays
        .filter((s) => s.availDay >= weekStart && s.availDay < weekEnd)
        .map((s) => s.esn);
      const removalsSoFar = removalAbs.filter((d) => d < weekEnd).length;
      const returnsSoFar = returnAbs.filter((d) => d < weekEnd).length;
      const incomingSoFar = incomingAbs.filter((d) => d < weekEnd).length;
      weeks.push({
        weekDate: wkIso,
        sparesAtQx:
          params.startSpares - removalsSoFar + returnsSoFar + incomingSoFar,
        removal: ri >= 0 ? rows[ri] : undefined,
        returnedEsns,
        incomingEsns,
      });
    }
  }

  return { rows, weeks, balanceSeries, minSpares, feasible, firstIssueDate, issues, constraintWarnings, forceInfeasible };
}
