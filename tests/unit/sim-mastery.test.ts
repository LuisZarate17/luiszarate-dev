import { describe, expect, it } from "vitest";
import {
  STEPS,
  STILL,
  TRANSCRIPT,
  answer,
  answerLabel,
  citationCount,
  isComplete,
  meter,
  reply,
  showAll,
  start,
  visibleLines,
} from "../../src/lib/sim/mastery";

describe("transcript", () => {
  it("has eight alternating lines, student first", () => {
    expect(TRANSCRIPT).toHaveLength(8);
    TRANSCRIPT.forEach((l, i) => expect(l.speaker).toBe(i % 2 === 0 ? "student" : "tutor"));
  });
  it("keeps the real lines verbatim, with the citation split off", () => {
    expect(TRANSCRIPT[2]?.text).toBe("20");
    expect(TRANSCRIPT[3]?.text).toBe(
      "Subtract 6 from both sides to isolate the term with the variable. What does that give you?",
    );
    expect(TRANSCRIPT[3]?.citation).toBe("This is covered in algebra_linear_equations.md.");
    expect(TRANSCRIPT[1]?.citation).toBeUndefined();
    expect(citationCount()).toEqual({ cited: 3, replies: 4 });
  });
});

describe("state machine", () => {
  it("the still shows everything and is not engaged", () => {
    expect(visibleLines(STILL).every(Boolean)).toBe(true);
    expect(STILL.engaged).toBe(false);
    expect(isComplete(STILL)).toBe(true);
  });
  it("start shows the first exchange", () => {
    expect(visibleLines(start())).toEqual([true, true, false, false, false, false, false, false]);
    expect(meter(start())).toBe("1 of 4");
  });
  it("answer shows the student line first, then the reply", () => {
    const a = answer(start());
    expect(visibleLines(a).filter(Boolean)).toHaveLength(3);
    expect(answer(a)).toBe(a);
    const r = reply(a);
    expect(visibleLines(r).filter(Boolean)).toHaveLength(4);
    expect(meter(r)).toBe("2 of 4");
  });
  it("reaches 4 of 4 and stops", () => {
    let s = start();
    for (let i = 1; i < STEPS; i++) s = reply(answer(s));
    expect(meter(s)).toBe("4 of 4");
    expect(isComplete(s)).toBe(true);
    expect(answer(s)).toBe(s);
  });
  it("show all completes from any step", () => {
    expect(isComplete(showAll())).toBe(true);
  });
  it("labels the main button with the student's next real line", () => {
    expect([1, 2, 3].map(answerLabel)).toEqual([
      'Answer "20"',
      'Answer "Oh, 8."',
      'Answer "So x is 4?"',
    ]);
    expect(answerLabel(4)).toBeNull();
  });
});
