import { describe, it, expect } from "vitest";
import { buildRemovalPlan, type PlanConstraints } from "./removalSchedule";
import type { HsrEngine } from "../mock-data";

const TODAY = new Date(2026, 9, 15); // 2026-10-15

function engine(sn: string, tail: string, hoursRemaining: number): HsrEngine {
  return {
    engineSN: sn,
    pn: "CF34-8E5",
    resetDate: "2024-01-01",
    tshsi: 10_000 - hoursRemaining,
    hsrTarget: 10_000,
    tshsrRemaining: hoursRemaining,
    currentlyInstalled: true,
    installedAC: tail,
    position: "L",
    onWingPeriods: 1,
    hrsPerDay: 10,
    cyclesPerDay: 0,
    utilWindowDays: 90,
    minCyclesRemaining: null, // HSR binds
    bindingLlpPN: "",
    bindingLlpSN: "",
    asOfDate: "2026-10-15",
  };
}

// fh = 10/day → due = hoursRemaining / 10 days from today.
const ENGINES: HsrEngine[] = [
  engine("ESN-0001", "N001QX", 1000), // due ~100 days (~2027-01-23)
  engine("ESN-0002", "N002QX", 2000), // due ~200 days
  engine("ESN-0003", "N003QX", 3000), // due ~300 days
];

const BASE = {
  fhPerDay: 10,
  fcPerDay: 0,
  tatDays: 90,
  spacingWeeks: 3,
  horizonMonths: 24,
  startSpares: 5,
  today: TODAY,
};

function monthOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

describe("buildRemovalPlan — baseline (no constraints)", () => {
  it("schedules all three engines in due-date order and is feasible", () => {
    const plan = buildRemovalPlan(ENGINES, BASE);
    expect(plan.rows).toHaveLength(3);
    expect(plan.rows.map((r) => r.engineSN)).toEqual(["ESN-0001", "ESN-0002", "ESN-0003"]);
    expect(plan.feasible).toBe(true);
    expect(plan.constraintWarnings).toEqual([]);
    // Removals are Mondays and strictly increasing.
    for (let i = 1; i < plan.rows.length; i++) {
      expect(plan.rows[i].removalDate > plan.rows[i - 1].removalDate).toBe(true);
    }
  });
});

describe("buildRemovalPlan — overflow compresses to the 1-week floor, no stacking", () => {
  it("packs an over-capacity window down to the weekly floor instead of clustering same-day removals", () => {
    // 20 engines due tightly packed (10 days apart) while the TARGET spacing is
    // 3 weeks (21 days). The backward pass would push the earliest engines to
    // negative days; without forward re-spacing they would all snap onto the
    // first Monday, draining the spare pool instantly. The congested window now
    // compresses down to the fixed 1-week floor (never tighter), relaxing back
    // to the target cadence once it catches up.
    const many: HsrEngine[] = [];
    for (let i = 0; i < 20; i++) {
      many.push(engine(`ESN-${100 + i}`, `N${100 + i}`, 1000 + i * 100)); // due ~100,110,...290 days
    }
    const plan = buildRemovalPlan(many, { ...BASE, horizonMonths: 48 });
    expect(plan.rows).toHaveLength(20);

    const dates = plan.rows.map((r) => r.removalDate);
    // Every removal lands on a distinct Monday, strictly increasing and spaced
    // ≥ 1 week apart (the compression floor) — no same-day stack.
    expect(new Set(dates).size).toBe(dates.length);
    const firstWeekCount = dates.filter((d) => d === dates[0]).length;
    expect(firstWeekCount).toBe(1);
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i] > dates[i - 1]).toBe(true);
      const prev = new Date(dates[i - 1]).getTime();
      const cur = new Date(dates[i]).getTime();
      expect(cur - prev).toBeGreaterThanOrEqual(7 * 86_400_000);
    }
  });
});

describe("buildRemovalPlan — force removals before limit", () => {
  it("keeps every removal at or above the at-removal buffer when achievable", () => {
    const plan = buildRemovalPlan(ENGINES, {
      ...BASE,
      forceBeforeLimit: true,
      minHrsAtRemoval: 250,
      minCycAtRemoval: 250,
    });
    expect(plan.rows).toHaveLength(3);
    for (const r of plan.rows) {
      expect(r.hrsRemainingAtRemoval).toBeGreaterThanOrEqual(250);
    }
    expect(plan.forceInfeasible).toEqual([]);
  });

  it("reports engines that cannot fit before their buffer even at the weekly floor", () => {
    // 20 engines all due ~60 days out; even compressing to one removal/week the
    // later ones cannot be pulled while still keeping a 250 hr buffer.
    const crowded: HsrEngine[] = [];
    for (let i = 0; i < 20; i++) {
      crowded.push(engine(`ESN-${200 + i}`, `N${200 + i}`, 600));
    }
    const plan = buildRemovalPlan(crowded, {
      ...BASE,
      forceBeforeLimit: true,
      minHrsAtRemoval: 250,
      minCycAtRemoval: 250,
    });
    expect(plan.forceInfeasible.length).toBeGreaterThan(0);
    // With the toggle OFF the same plan raises no force warnings (overruns are
    // simply shown, not blocked).
    const relaxed = buildRemovalPlan(crowded, { ...BASE, forceBeforeLimit: false });
    expect(relaxed.forceInfeasible).toEqual([]);
  });
});


describe("buildRemovalPlan — spare-aware smoothing", () => {
  it("spreads a cluster into the idle runway so spares never go negative", () => {
    // 10 engines all due within ~90 days (days 300–390). With 5 spares and a
    // 90-day shop TAT the pool can only support ~4 removals per shop-turn
    // window, so bunching them against their due dates would sink the balance
    // well below 1 ("not viable"). There is ample idle runway before the
    // cluster, so the scheduler should start it sooner and keep it feasible.
    const cluster: HsrEngine[] = [];
    for (let i = 0; i < 10; i++) {
      cluster.push(engine(`ESN-${400 + i}`, `N${400 + i}`, 3000 + i * 100));
    }
    const plan = buildRemovalPlan(cluster, BASE);
    expect(plan.rows).toHaveLength(10);
    expect(plan.feasible).toBe(true);
    const minSpares = Math.min(...plan.balanceSeries.map((b) => b.spares));
    expect(minSpares).toBeGreaterThanOrEqual(1);
    // Every engine is still removed on/before its due date (never past the limit).
    expect(plan.rows.every((r) => r.weeksEarly >= 0)).toBe(true);
  });
});

describe("buildRemovalPlan — a far-future cluster does not yank engines early", () => {
  it("schedules every engine near its own due date, not dozens of weeks early", () => {
    // 80 engines all due far out (~1,120–1,910 days), 10 days apart. The old
    // backward pass chained the full 3-week target spacing back from the last
    // engine, so this future cluster cascaded into the present and pulled the
    // earliest engines ~100+ weeks early (bunched at the front). Each engine
    // should now sit within ~one target interval of its own due date.
    const cluster: HsrEngine[] = [];
    for (let i = 0; i < 80; i++) {
      cluster.push(engine(`ESN-${300 + i}`, `N${300 + i}`, 11_200 + i * 100));
    }
    const plan = buildRemovalPlan(cluster, {
      ...BASE,
      horizonMonths: 72,
      startSpares: 60, // isolate the target-spacing cascade from the spare-throughput limit
    });
    expect(plan.rows).toHaveLength(80);
    // No engine is pulled more than ~one target interval (3 wk) early — the old
    // bug produced 74+ week early pulls.
    const maxEarly = Math.max(...plan.rows.map((r) => r.weeksEarly));
    expect(maxEarly).toBeLessThan(6);
    // And nothing is dumped onto the near-term Mondays: the first removal is far
    // out (close to the earliest engine's due date), not this month.
    expect(plan.rows[0].removalDate > "2029-01-01").toBe(true);
  });
});

describe("buildRemovalPlan — order constraint", () => {
  it("schedules a named engine first", () => {
    const constraints: PlanConstraints = { order: ["ESN-0003"] };
    const plan = buildRemovalPlan(ENGINES, { ...BASE, constraints });
    expect(plan.rows[0].engineSN).toBe("ESN-0003");
  });
});

describe("buildRemovalPlan — pin constraint", () => {
  it("pins the first removal to an exact Monday", () => {
    const constraints: PlanConstraints = {
      pins: [{ ordinal: 1, monday: "2027-01-04" }],
    };
    const plan = buildRemovalPlan(ENGINES, { ...BASE, constraints });
    expect(plan.rows[0].removalDate).toBe("2027-01-04");
  });

  it("warns when a pin is after the engine's due week but keeps it", () => {
    const constraints: PlanConstraints = {
      // ESN-0001 is due ~2027-01-23; pin well past that.
      pins: [{ ordinal: 1, monday: "2027-06-07" }],
    };
    const plan = buildRemovalPlan(ENGINES, { ...BASE, constraints });
    expect(plan.rows[0].removalDate).toBe("2027-06-07");
    expect(plan.constraintWarnings.join(" ")).toMatch(/after its due week/i);
  });
});

describe("buildRemovalPlan — blackout constraint", () => {
  it("keeps every removal out of a blacked-out month", () => {
    const constraints: PlanConstraints = {
      blackouts: [{ start: "2027-01-01", end: "2027-01-31", label: "Jan 2027" }],
    };
    const plan = buildRemovalPlan(ENGINES, { ...BASE, constraints });
    for (const r of plan.rows) {
      expect(monthOf(r.removalDate)).not.toBe("2027-01");
    }
  });
});

describe("buildRemovalPlan — hours floor", () => {
  it("pulls removals earlier so each leaves at least the floor of HSR hours", () => {
    const constraints: PlanConstraints = { minHrsFloor: 500 };
    const plan = buildRemovalPlan(ENGINES, { ...BASE, constraints });
    expect(plan.rows).toHaveLength(3);
    for (const r of plan.rows) {
      expect(r.hrsRemainingAtRemoval).toBeGreaterThanOrEqual(500);
    }
    // No floor warnings when the floor is achievable.
    expect(plan.constraintWarnings.join(" ")).not.toMatch(/floor/i);
  });

  it("warns when an engine is already below the requested floor", () => {
    // ESN-0001 has only ~1000 hr left today; a 1,200 hr floor is impossible.
    const constraints: PlanConstraints = { minHrsFloor: 1200 };
    const plan = buildRemovalPlan(ENGINES, { ...BASE, constraints });
    expect(plan.constraintWarnings.join(" ")).toMatch(/floor/i);
  });
});

describe("buildRemovalPlan — per-month cap", () => {
  it("never schedules more than the cap in one calendar month", () => {
    // Force many engines due close together so a cap actually bites.
    const clustered: HsrEngine[] = [
      engine("ESN-A", "N0A", 1000),
      engine("ESN-B", "N0B", 1050),
      engine("ESN-C", "N0C", 1100),
    ];
    const constraints: PlanConstraints = { maxPerMonth: 1 };
    const plan = buildRemovalPlan(clustered, {
      ...BASE,
      spacingWeeks: 1,
      constraints,
    });
    const counts = new Map<string, number>();
    for (const r of plan.rows) {
      const k = monthOf(r.removalDate);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    for (const c of counts.values()) expect(c).toBeLessThanOrEqual(1);
  });
});
