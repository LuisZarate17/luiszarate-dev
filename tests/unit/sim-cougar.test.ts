import { describe, expect, it } from "vitest";
import { DUR } from "../../src/lib/sim/timing";
import {
  CREDIT,
  LEDGER,
  clampPosition,
  commitUrl,
  flippedCount,
  isFlipped,
  positionFromPointer,
  stepPosition,
  sweepPosition,
  tweenPosition,
  valueText,
} from "../../src/lib/sim/cougar";

describe("ledger", () => {
  it("has the five rows from the spec, in order", () => {
    expect(LEDGER.map((r) => r.label)).toEqual([
      "Secrets",
      "Database",
      "Tests",
      "Runs on",
      "Connections, messaging, notifications",
    ]);
    expect(LEDGER.map((r) => r.threshold)).toEqual([10, 30, 50, 70, 90]);
    expect(LEDGER[2]?.after).toBe("32 xUnit tests, CI on every push");
  });

  it("links each short hash to a full 40-character commit", () => {
    for (const commit of LEDGER.flatMap((r) => r.commits)) {
      expect(commit.hash).toMatch(/^[0-9a-f]{40}$/);
      expect(commit.hash.startsWith(commit.short)).toBe(true);
      expect(commitUrl(commit)).toBe(
        `https://github.com/LuisZarate17/CougarConnect/commit/${commit.hash}`,
      );
    }
    expect(LEDGER.flatMap((r) => r.commits).map((c) => c.short)).toEqual([
      "dbf0e4a",
      "e3ab6b2",
      "8c96b20",
      "9c579af",
      "0acf504",
      "417f854",
      "c77c121",
    ]);
  });

  it("states the credit", () => {
    expect(CREDIT).toBe(
      "Team project, fall 2024 (Jonah Jellison, Cameron, Luis). Solo rebuild by Luis, 2026.",
    );
  });
});

describe("flipping", () => {
  it("flips rows top to bottom as the divider passes each threshold", () => {
    const counts = [0, 9, 10, 29, 30, 49, 50, 69, 70, 89, 90, 100].map(flippedCount);
    expect(counts).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    expect(isFlipped(LEDGER[0]!, 10)).toBe(true);
    expect(isFlipped(LEDGER[4]!, 89)).toBe(false);
  });

  it("words the slider value", () => {
    expect(valueText(50)).toBe("Rebuilt in 2026: 3 of 5");
    expect(valueText(0)).toBe("Rebuilt in 2026: 0 of 5");
  });
});

describe("keys and pointer", () => {
  it("steps by 10 and clamps", () => {
    expect(stepPosition(50, "ArrowRight")).toBe(60);
    expect(stepPosition(50, "ArrowLeft")).toBe(40);
    expect(stepPosition(95, "ArrowUp")).toBe(100);
    expect(stepPosition(5, "ArrowDown")).toBe(0);
    expect(stepPosition(37, "Home")).toBe(0);
    expect(stepPosition(37, "End")).toBe(100);
    expect(stepPosition(50, "PageUp")).toBe(80);
    expect(stepPosition(50, "PageDown")).toBe(20);
    expect(stepPosition(90, "PageUp")).toBe(100);
    expect(stepPosition(10, "PageDown")).toBe(0);
    expect(stepPosition(37, "a")).toBeNull();
  });

  it("clamps positions", () => {
    expect(clampPosition(-4)).toBe(0);
    expect(clampPosition(140)).toBe(100);
    expect(clampPosition(Number.NaN)).toBe(0);
  });

  it("maps a pointer to a percent of the track", () => {
    expect(positionFromPointer(150, 100, 200)).toBe(25);
    expect(positionFromPointer(0, 100, 200)).toBe(0);
    expect(positionFromPointer(999, 100, 200)).toBe(100);
    expect(positionFromPointer(10, 0, 0)).toBe(0);
  });
});

describe("sweep", () => {
  it("runs 0 to 100 over 700 ms and is monotonic", () => {
    expect(sweepPosition(0)).toBe(0);
    expect(sweepPosition(DUR.cut)).toBe(100);
    expect(sweepPosition(DUR.cut * 2)).toBe(100);
    let last = -1;
    for (let t = 0; t <= DUR.cut; t += 50) {
      const p = sweepPosition(t);
      expect(p).toBeGreaterThanOrEqual(last);
      last = p;
    }
  });

  it("tweens either way", () => {
    expect(tweenPosition(100, 0, 0)).toBe(100);
    expect(tweenPosition(100, 0, DUR.cut)).toBe(0);
    expect(tweenPosition(40, 40, 300)).toBe(40);
  });
});
