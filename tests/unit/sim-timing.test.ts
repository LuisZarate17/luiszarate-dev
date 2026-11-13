import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DUR, easeCut, seeded, stepProgress } from "../../src/lib/sim/timing";

const tokens = readFileSync("src/styles/tokens.css", "utf8");
const token = (name: string) => new RegExp(`--${name}:\\s*([^;]+);`).exec(tokens)?.[1]?.trim();

describe("durations match the design tokens", () => {
  it("reveal and cut", () => {
    expect(token("dur-reveal")).toBe(`${DUR.reveal}ms`);
    expect(token("dur-cut")).toBe(`${DUR.cut}ms`);
  });
  it("the easing is --ease-cut", () => {
    expect(token("ease-cut")).toBe("cubic-bezier(0.77, 0, 0.18, 1)");
  });
});

describe("easeCut", () => {
  it("runs 0 to 1, monotonic, with no overshoot", () => {
    expect(easeCut(0)).toBe(0);
    expect(easeCut(1)).toBe(1);
    let last = 0;
    for (let i = 1; i <= 100; i++) {
      const v = easeCut(i / 100);
      expect(v).toBeGreaterThanOrEqual(last);
      expect(v).toBeLessThanOrEqual(1);
      last = v;
    }
  });
  it("starts slow and finishes fast, a little past halfway at the middle", () => {
    expect(easeCut(0.1)).toBeLessThan(0.1);
    expect(easeCut(0.9)).toBeGreaterThan(0.9);
    expect(easeCut(0.5)).toBeGreaterThan(0.5);
    expect(easeCut(0.5)).toBeLessThan(0.7);
  });
});

describe("stepProgress", () => {
  it("clamps and handles a zero-length step", () => {
    expect(stepProgress(-10, 500)).toBe(0);
    expect(stepProgress(900, 500)).toBe(1);
    expect(stepProgress(0, 0)).toBe(1);
  });
});

describe("seeded", () => {
  it("repeats for a seed and differs between seeds", () => {
    const a = seeded(7);
    const b = seeded(7);
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect(seeded(8)()).not.toBe(first[0]);
    for (const v of first) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
