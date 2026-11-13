import { describe, expect, it } from "vitest";
import {
  BUTTONS,
  CHIP,
  DIFF,
  NOTE,
  ROW_COUNT,
  STAGE_APPLY_AT,
  STAGE_TYPE_END,
  STILL,
  STILL_SESSION,
  isPlaying,
  reduceSession,
  rowTexts,
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
    const restored = undoEdit(applied);
    expect(restored).toEqual(original);
    expect(restored.join("\n") + "\n").toBe(original.join("\n") + "\n");
  });
  it("refuses a file the diff was not made for", () => {
    expect(() => applyEdit(["fn other() {}"])).toThrow();
    expect(() => undoEdit(["fn other() {}"])).toThrow();
    // Undo needs the applied file: the original is not it.
    expect(() => undoEdit(sideBefore())).toThrow();
  });
});

describe("session: the file the UI shows", () => {
  const session = (events: CardEvent[]) => events.reduce(reduceSession, STILL_SESSION);
  const plain = (s: ReturnType<typeof session>) =>
    rowTexts(s.card, s.file).filter((_, i) => rowView(s.card, i) === "plain");
  it("starts on the original file", () => {
    expect(STILL_SESSION.file).toEqual(sideBefore());
  });
  it("Apply shows exactly the lines applyEdit produced", () => {
    const s = session([{ type: "apply" }]);
    expect(s.file).toEqual(applyEdit(sideBefore()));
    expect(plain(s)).toEqual(sideAfter());
  });
  it("Apply then Undo shows the original lines byte for byte", () => {
    const s = session([{ type: "apply" }, { type: "undo" }]);
    expect(s.file).toEqual(sideBefore());
    expect(plain(s).join("\n") + "\n").toBe(sideBefore().join("\n") + "\n");
  });
  it("declining or replaying leaves the original file", () => {
    expect(session([{ type: "deny" }]).file).toEqual(sideBefore());
    expect(session([{ type: "apply" }, { type: "reset" }]).file).toEqual(sideBefore());
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
    expect(reduce(STILL, { type: "scrub", progress: 0.5 })).toEqual({
      phase: "typing",
      typed: 6,
      frozen: true,
    });
    expect(reduce(STILL, { type: "scrub", progress: 1 })).toEqual(STILL);
    expect(reduce(STILL, { type: "scrub", progress: -1 })).toEqual({
      phase: "typing",
      typed: 0,
      frozen: true,
    });
    expect(run([{ type: "deny" }, { type: "reset" }])).toEqual(STILL);
  });
  it("staging types the diff in, waits in Review, then applies (spec 4.4)", () => {
    const at = (progress: number) => reduce(STILL, { type: "stage", progress });
    expect(at(0.001)).toEqual({ phase: "typing", typed: 0, frozen: true });
    expect(at(STAGE_TYPE_END / 2)).toEqual({ phase: "typing", typed: 6, frozen: true });
    expect(at(STAGE_TYPE_END)).toBe(STILL);
    expect(at((STAGE_TYPE_END + STAGE_APPLY_AT) / 2)).toBe(STILL);
    expect(at(STAGE_APPLY_AT).phase).toBe("applied");
    expect(at(1).phase).toBe("applied");
  });
  it("staging returns the same state for the same frame, so it renders once", () => {
    const half = reduce(STILL, { type: "stage", progress: 0.2 });
    expect(reduce(half, { type: "stage", progress: 0.201 })).toBe(half);
    const applied = reduce(STILL, { type: "stage", progress: 0.9 });
    expect(reduce(applied, { type: "stage", progress: 0.95 })).toBe(applied);
  });
  it("staging writes the file on apply and restores it when scrolled back", () => {
    const applied = reduceSession(STILL_SESSION, { type: "stage", progress: 1 });
    expect(applied.file).toEqual(sideAfter());
    expect(reduceSession(applied, { type: "stage", progress: 0.7 }).file).toEqual(sideBefore());
    // Released at the end, the card is live: Undo restores the file byte for byte.
    const released = reduceSession(applied, { type: "settle" });
    expect(released).toBe(applied);
    expect(reduceSession(released, { type: "undo" }).file).toEqual(sideBefore());
  });
  it("settling a half-typed frame finishes it as Review", () => {
    const half = reduce(STILL, { type: "stage", progress: 0.2 });
    expect(reduce(half, { type: "settle" })).toBe(STILL);
    expect(reduce(STILL, { type: "settle" })).toBe(STILL);
  });
  it("a scrubbed frame is static: it is not playing and ticks do not advance it", () => {
    const scrubbed = reduce(STILL, { type: "scrub", progress: 0.5 });
    expect(isPlaying(scrubbed)).toBe(false);
    expect(reduce(scrubbed, { type: "tick" })).toBe(scrubbed);
    // Real play is the only state the typing interval runs for.
    expect(isPlaying(reduce(STILL, { type: "play" }))).toBe(true);
    expect(isPlaying(STILL)).toBe(false);
    // A scrubbed frame can still be answered, and play restarts typing from it.
    expect(reduce(scrubbed, { type: "apply" }).phase).toBe("applied");
    expect(isPlaying(reduce(scrubbed, { type: "play" }))).toBe(true);
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
