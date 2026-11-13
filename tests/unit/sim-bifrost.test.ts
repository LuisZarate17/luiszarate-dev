import { describe, expect, it } from "vitest";
import {
  BUTTONS,
  CHIP,
  DIFF,
  NOTE,
  ROW_COUNT,
  STILL,
  applyEdit,
  reduce,
  rowTyped,
  rowView,
  sideAfter,
  sideBefore,
  summary,
  undoEdit,
  type CardEvent,
  type CardState,
} from "../../src/lib/sim/bifrost";

const run = (events: CardEvent[], from: CardState = STILL) => events.reduce(reduce, from);

describe("the diff data", () => {
  it("has twelve rows and the +2 -2 summary", () => {
    expect(DIFF).toHaveLength(12);
    expect(summary()).toBe("+2 −2");
  });
  it("numbers old and new sides consecutively", () => {
    const old = DIFF.map((l) => l.oldNo).filter((n) => n !== null);
    const next = DIFF.map((l) => l.newNo).filter((n) => n !== null);
    expect(old).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(next).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
  it("renames greet to welcome on both changed lines", () => {
    expect(sideBefore().filter((t) => t.includes("greet"))).toHaveLength(2);
    expect(sideAfter().filter((t) => t.includes("welcome"))).toHaveLength(2);
    expect(sideAfter().some((t) => t.includes("greet"))).toBe(false);
  });
});

describe("apply and undo", () => {
  it("apply writes the new side and undo returns the original byte for byte", () => {
    const original = sideBefore();
    const applied = applyEdit(original);
    expect(applied).toEqual(sideAfter());
    expect(applied).not.toEqual(original);
    const restored = undoEdit(applied, original);
    expect(restored).toEqual(original);
    expect(restored.join("\n") + "\n").toBe(original.join("\n") + "\n");
    expect(restored).not.toBe(original);
  });
  it("refuses a file the diff was not made for", () => {
    expect(() => applyEdit(["fn other() {}"])).toThrow();
  });
});

describe("state machine", () => {
  it("starts on the still: Review, fully typed", () => {
    expect(STILL).toEqual({ phase: "review", typed: ROW_COUNT });
  });
  it("types one row per tick and lands on Review", () => {
    let s = run([{ type: "play" }]);
    expect(s).toEqual({ phase: "typing", typed: 0 });
    for (let i = 0; i < ROW_COUNT - 1; i++) s = reduce(s, { type: "tick" });
    expect(s).toEqual({ phase: "typing", typed: ROW_COUNT - 1 });
    s = reduce(s, { type: "tick" });
    expect(s.phase).toBe("review");
    expect(s.typed).toBe(ROW_COUNT);
  });
  it("walks review, applied, undone, replay", () => {
    expect(run([{ type: "apply" }]).phase).toBe("applied");
    expect(run([{ type: "apply" }, { type: "undo" }]).phase).toBe("undone");
    expect(run([{ type: "apply" }, { type: "undo" }, { type: "replay" }]).phase).toBe("typing");
  });
  it("walks review, declined, replay", () => {
    expect(run([{ type: "deny" }]).phase).toBe("declined");
    expect(run([{ type: "deny" }, { type: "replay" }]).phase).toBe("typing");
  });
  it("ignores events that do not apply to the phase", () => {
    expect(run([{ type: "undo" }])).toEqual(STILL);
    expect(run([{ type: "replay" }])).toEqual(STILL);
    const applied = run([{ type: "apply" }]);
    expect(reduce(applied, { type: "deny" })).toBe(applied);
    expect(reduce(applied, { type: "apply" })).toBe(applied);
    const typing = run([{ type: "play" }]);
    expect(reduce(typing, { type: "apply" })).toBe(typing);
    expect(reduce(STILL, { type: "tick" })).toBe(STILL);
  });
  it("scrubs to a typed count and reset returns to the still", () => {
    expect(reduce(STILL, { type: "scrub", progress: 0.5 })).toEqual({ phase: "typing", typed: 6 });
    expect(reduce(STILL, { type: "scrub", progress: 1 })).toEqual(STILL);
    expect(reduce(STILL, { type: "scrub", progress: -1 })).toEqual({ phase: "typing", typed: 0 });
    expect(run([{ type: "deny" }, { type: "reset" }])).toEqual(STILL);
  });
  it("has the documented chip, note and buttons per state", () => {
    expect(CHIP.review).toBe("Review");
    expect(CHIP.applied).toBe("Applied");
    expect(NOTE.applied).toBe("");
    expect(NOTE.undone).toBe("Undone — the file is back as it was.");
    expect(NOTE.declined).toBe("You declined. Nothing was written, and the model was told.");
    expect(BUTTONS.review).toEqual(["apply", "deny"]);
    expect(BUTTONS.applied).toEqual(["undo"]);
    expect(BUTTONS.undone).toEqual(["replay"]);
    expect(BUTTONS.declined).toEqual(["replay"]);
  });
});

describe("row views", () => {
  const views = (s: CardState) => DIFF.map((_, i) => rowView(s, i));
  it("shows all twelve rows as diff in review and declined", () => {
    expect(new Set(views(STILL))).toEqual(new Set(["diff"]));
    expect(new Set(views(run([{ type: "deny" }])))).toEqual(new Set(["diff"]));
  });
  it("applied collapses the two removed rows and leaves the ten-line file", () => {
    const v = views(run([{ type: "apply" }]));
    expect(v.filter((x) => x === "collapsed")).toHaveLength(2);
    expect(v.filter((x) => x === "plain")).toHaveLength(10);
    DIFF.forEach((l, i) => {
      if (l.kind === "del") expect(v[i]).toBe("collapsed");
    });
  });
  it("undone is the exact inverse frame: added rows collapse, removed rows return", () => {
    const applied = views(run([{ type: "apply" }]));
    const undone = views(run([{ type: "apply" }, { type: "undo" }]));
    DIFF.forEach((l, i) => {
      if (l.kind === "ctx") expect(undone[i]).toBe(applied[i]);
      else expect(undone[i]).not.toBe(applied[i]);
    });
    expect(undone.filter((x) => x === "plain")).toHaveLength(10);
  });
  it("hides rows not yet typed only while typing", () => {
    const s = run([{ type: "play" }, { type: "tick" }, { type: "tick" }]);
    expect(DIFF.map((_, i) => rowTyped(s, i)).filter(Boolean)).toHaveLength(2);
    expect(DIFF.every((_, i) => rowTyped(STILL, i))).toBe(true);
  });
});
