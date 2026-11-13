import { describe, expect, it } from "vitest";
import {
  DOTS,
  END_COUNTERS,
  PAIRS,
  SEQUENCE_MS,
  TRAVEL_END,
  countersAt,
  countersList,
  dotsAt,
  makeLayout,
  runDuration,
  sequenceAt,
  staggers,
} from "../../src/lib/sim/labq";

const sizes = [
  [306, 400],
  [358, 126],
  [626, 417],
  [356, 266],
] as const;

describe("labq counters", () => {
  it("50 choose 2 is 1,225", () => {
    expect(PAIRS).toBe((50 * 49) / 2);
    expect(PAIRS).toBe(1225);
  });
  it("end states", () => {
    expect(countersList(END_COUNTERS.without)).toEqual(["50", "0", "1,225"]);
    expect(countersList(END_COUNTERS.with)).toEqual(["1", "49", "0"]);
  });
  it("cuts on the landing frame", () => {
    expect(countersAt("without", TRAVEL_END - 1).pairs).toBe(0);
    expect(countersAt("without", TRAVEL_END)).toEqual(END_COUNTERS.without);
    expect(countersAt("with", 0)).toEqual({ confirmed: 0, refused: 0, pairs: 0 });
    expect(countersAt("with", runDuration("with"))).toEqual(END_COUNTERS.with);
  });
});

describe("labq layout", () => {
  it.each(sizes)("fits %i x %i", (w, h) => {
    const l = makeLayout(w, h);
    expect(l.starts).toHaveLength(DOTS);
    expect(l.landing).toHaveLength(50);
    expect(new Set(l.landing.map((p) => p.x.toFixed(3))).size).toBe(10);
    expect(new Set(l.landing.map((p) => p.y.toFixed(3))).size).toBe(5);
    for (const p of l.landing) {
      expect(p.x).toBeGreaterThan(l.slot.x);
      expect(p.x).toBeLessThan(l.slot.x + l.slot.w);
      expect(p.y).toBeGreaterThan(l.slot.y);
      expect(p.y).toBeLessThan(l.slot.y + l.slot.h);
    }
    expect(l.refusal).toHaveLength(49);
    expect(new Set(l.refusal.map((p) => p.x.toFixed(3))).size).toBe(7);
    expect(new Set(l.refusal.map((p) => p.y.toFixed(3))).size).toBe(7);
    for (const p of l.refusal) {
      expect(p.x).toBeLessThan(l.slot.x);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(l.h);
    }
    expect(l.r).toBeGreaterThanOrEqual(3);
    expect(l.r).toBeLessThanOrEqual(5);
  });
});

describe("labq timeline", () => {
  const layout = makeLayout(626, 417);
  const stag = staggers();
  it("is deterministic for a seed", () => {
    expect(staggers()).toEqual(stag);
    expect(staggers(1)).not.toEqual(stag);
    expect(Math.max(...stag)).toBeLessThanOrEqual(300);
  });
  it("sequence: without, hold 1 s, with", () => {
    expect(sequenceAt(0)).toEqual({ run: "without", t: 0, holding: false });
    expect(sequenceAt(runDuration("without") + 500).holding).toBe(true);
    expect(sequenceAt(runDuration("without") + 1000)).toMatchObject({ run: "with", t: 0 });
    expect(sequenceAt(SEQUENCE_MS + 99)).toMatchObject({ run: "with", t: runDuration("with") });
  });
  it("without: all 50 land in the grid, filled", () => {
    const dots = dotsAt(layout, "without", Infinity, stag);
    dots.forEach((d, i) => {
      expect(d.x).toBeCloseTo(layout.landing[i]?.x ?? NaN);
      expect(d.y).toBeCloseTo(layout.landing[i]?.y ?? NaN);
      expect(d.filled).toBe(true);
    });
  });
  it("with: one filled dot in the slot, 49 hollow rings in the 7x7 grid", () => {
    const dots = dotsAt(layout, "with", Infinity, stag);
    expect(dots.filter((d) => d.filled)).toHaveLength(1);
    const inSlot = dots.filter((d) => d.x > layout.slot.x);
    expect(inSlot).toHaveLength(1);
    dots.slice(1).forEach((d, i) => {
      expect(d.x).toBeCloseTo(layout.refusal[i]?.x ?? NaN);
      expect(d.filled).toBe(false);
    });
  });
  it("is eased with no overshoot", () => {
    for (let t = 0; t <= runDuration("with"); t += 25) {
      for (const d of dotsAt(layout, "with", t, stag)) {
        expect(d.x).toBeGreaterThanOrEqual(0);
        expect(d.x).toBeLessThanOrEqual(layout.slot.x + layout.slot.w);
      }
    }
  });
});
