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
