import { describe, it, expect } from "vitest";
import { parsePlanCommand, type ParseContext } from "./planChatParser";
import { emptyConstraints } from "./removalSchedule";

const ctx: ParseContext = {
  today: new Date(2026, 9, 15), // 2026-10-15 (a Thursday)
  spacingWeeks: 3,
  engines: [
    { engineSN: "ESN-31047", tail: "N642QX" },
    { engineSN: "ESN-31050", tail: "N635QX" },
    { engineSN: "ESN-31045", tail: "N631QX" },
  ],
};

describe("parsePlanCommand — pin", () => {
  it("pins the first removal to the first week of January 2027 (Jan 4)", () => {
    const r = parsePlanCommand(
      "have the first removal be the first week of January 2027",
      emptyConstraints(),
      ctx,
    );
    expect(r.ok).toBe(true);
    expect(r.intent).toBe("pin");
    expect(r.nextConstraints?.pins?.[0]).toEqual({ ordinal: 1, monday: "2027-01-04" });
  });

  it("pins a numbered removal to an ISO date (snapped to Monday on/before)", () => {
    const r = parsePlanCommand("pin removal 2 to 2027-03-17", emptyConstraints(), ctx);
    expect(r.ok).toBe(true);
    // 2027-03-17 is a Wednesday → Monday on/before is 2027-03-15.
    expect(r.nextConstraints?.pins?.[0]).toEqual({ ordinal: 2, monday: "2027-03-15" });
  });

  it("replaces an existing pin on the same ordinal rather than duplicating", () => {
    const first = parsePlanCommand(
      "first removal in the first week of January 2027",
      emptyConstraints(),
      ctx,
    );
    const second = parsePlanCommand(
      "first removal in the last week of February 2027",
      first.nextConstraints!,
      ctx,
    );
    expect(second.nextConstraints?.pins).toHaveLength(1);
    expect(second.nextConstraints?.pins?.[0].ordinal).toBe(1);
  });
});

describe("parsePlanCommand — blackout", () => {
  it("blacks out a bare month, choosing the next occurrence", () => {
    const r = parsePlanCommand("no removals in March", emptyConstraints(), ctx);
    expect(r.ok).toBe(true);
    expect(r.intent).toBe("blackout");
    // Oct 2026 → next March is 2027.
    expect(r.nextConstraints?.blackouts?.[0]).toMatchObject({
      start: "2027-03-01",
      end: "2027-03-31",
    });
  });

  it("blacks out an explicit month+year", () => {
    const r = parsePlanCommand("no removals in March 2027", emptyConstraints(), ctx);
    expect(r.nextConstraints?.blackouts?.[0]).toMatchObject({
      start: "2027-03-01",
      end: "2027-03-31",
    });
  });

  it("blacks out a month-to-month range", () => {
    const r = parsePlanCommand("no removals April to June 2027", emptyConstraints(), ctx);
    expect(r.ok).toBe(true);
    expect(r.nextConstraints?.blackouts?.[0]).toMatchObject({
      start: "2027-04-01",
      end: "2027-06-30",
    });
  });
});

describe("parsePlanCommand — cadence", () => {
  it("sets the spacing lever", () => {
    const r = parsePlanCommand("space removals 4 weeks apart", emptyConstraints(), ctx);
    expect(r.ok).toBe(true);
    expect(r.intent).toBe("cadence");
    expect(r.nextSpacingWeeks).toBe(4);
  });

  it("parses word numbers", () => {
    const r = parsePlanCommand("set cadence to two weeks", emptyConstraints(), ctx);
    expect(r.nextSpacingWeeks).toBe(2);
  });
});

describe("parsePlanCommand — ratecap", () => {
  it("caps removals per month (word number)", () => {
    const r = parsePlanCommand("max one removal per month", emptyConstraints(), ctx);
    expect(r.ok).toBe(true);
    expect(r.intent).toBe("ratecap");
    expect(r.nextConstraints?.maxPerMonth).toBe(1);
  });

  it("caps removals per month (digit)", () => {
    const r = parsePlanCommand("no more than 2 removals a month", emptyConstraints(), ctx);
    expect(r.nextConstraints?.maxPerMonth).toBe(2);
  });
});

describe("parsePlanCommand — hours floor", () => {
  it("sets a remaining-hours floor from a natural phrase", () => {
    const r = parsePlanCommand(
      "make all removals at a minimum of 1000 remaining hours on the limit",
      emptyConstraints(),
      ctx,
    );
    expect(r.ok).toBe(true);
    expect(r.intent).toBe("floor");
    expect(r.nextConstraints?.minHrsFloor).toBe(1000);
  });

  it("parses a comma-formatted hour floor", () => {
    const r = parsePlanCommand("keep at least 1,500 remaining hours", emptyConstraints(), ctx);
    expect(r.nextConstraints?.minHrsFloor).toBe(1500);
  });

  it("clears an existing hour floor", () => {
    const r = parsePlanCommand("remove the hour floor", { minHrsFloor: 1000 }, ctx);
    expect(r.ok).toBe(true);
    expect(r.intent).toBe("floor");
    expect(r.nextConstraints?.minHrsFloor).toBeUndefined();
  });
});

describe("parsePlanCommand — order", () => {
  it("moves an ESN first", () => {
    const r = parsePlanCommand("remove ESN-31047 first", emptyConstraints(), ctx);
    expect(r.ok).toBe(true);
    expect(r.intent).toBe("order");
    expect(r.nextConstraints?.order).toEqual(["ESN-31047"]);
  });

  it("resolves a tail to its engineSN", () => {
    const r = parsePlanCommand("put N635QX first", emptyConstraints(), ctx);
    expect(r.nextConstraints?.order).toEqual(["ESN-31050"]);
  });

  it("orders multiple engines in sequence", () => {
    const r = parsePlanCommand("do ESN-31045 then ESN-31047", emptyConstraints(), ctx);
    expect(r.nextConstraints?.order).toEqual(["ESN-31045", "ESN-31047"]);
  });
});

describe("parsePlanCommand — clear & unknown", () => {
  it("clears all constraints", () => {
    const prev = { maxPerMonth: 1, blackouts: [{ start: "2027-03-01", end: "2027-03-31" }] };
    const r = parsePlanCommand("clear all constraints", prev, ctx);
    expect(r.ok).toBe(true);
    expect(r.intent).toBe("clear");
    expect(r.nextConstraints).toEqual({});
  });

  it("returns a helpful unknown for gibberish", () => {
    const r = parsePlanCommand("make me a sandwich", emptyConstraints(), ctx);
    expect(r.ok).toBe(false);
    expect(r.intent).toBe("unknown");
  });
});
