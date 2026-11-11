import { describe, expect, it } from "vitest";
import {
  CUT_DURATION_MS,
  CUT_SWAP_AT_MS,
  createCutController,
  wipeKeyframes,
  type CutDeps,
} from "../../src/lib/cut";

function harness(reduced = false) {
  let time = 0;
  let finish: (() => void) | undefined;
  let started = 0;
  const frames: Array<() => void> = [];
  const log: string[] = [];
  const deps: CutDeps<string> = {
    reduced: () => reduced,
    startWipe: () => {
      started++;
      time = 0;
      return { currentTime: () => time, onFinish: (cb) => (finish = cb) };
    },
    swap: (t) => log.push(`swap:${t}@${time}`),
    raf: (cb) => frames.push(cb),
  };
  const advance = (to: number) => {
    time = to;
    const run = frames.splice(0);
    run.forEach((f) => f());
    if (to >= CUT_DURATION_MS) finish?.();
  };
  return { controller: createCutController(deps), advance, log, started: () => started };
}

describe("wipe keyframes", () => {
  it("covers at 45%, holds to 55%, then leaves right", () => {
    const k = wipeKeyframes("E");
    expect(k.map((f) => [f.offset, f.transform])).toEqual([
      [0, "translateX(-101%)"],
      [0.45, "translateX(0)"],
      [0.55, "translateX(0)"],
      [1, "translateX(101%)"],
    ]);
    expect(k[0]?.easing).toBe("E");
  });
  it("swaps at the midpoint of a 700 ms cut", () => {
    expect(CUT_SWAP_AT_MS).toBe(350);
    expect(CUT_DURATION_MS).toBe(700);
  });
});

describe("cut controller", () => {
  it("swaps only once the animation clock reaches 350 ms", () => {
    const h = harness();
    h.controller.cutTo("a");
    h.advance(100);
    expect(h.log).toEqual([]);
    h.advance(350);
    expect(h.log).toEqual(["swap:a@350"]);
    h.advance(700);
    expect(h.controller.isActive()).toBe(false);
  });
  it("re-targets a running cut without restarting the wipe", () => {
    const h = harness();
    h.controller.cutTo("a");
    h.advance(100);
    h.controller.cutTo("b");
    expect(h.started()).toBe(1);
    h.advance(360);
    expect(h.log).toEqual(["swap:b@360"]);
  });
  it("runs onSwap after the swap", () => {
    const h = harness();
    h.controller.cutTo("a", { onSwap: () => h.log.push("onSwap") });
    h.advance(350);
    expect(h.log).toEqual(["swap:a@350", "onSwap"]);
  });
  it("allows a new cut once the last one finished", () => {
    const h = harness();
    h.controller.cutTo("a");
    h.advance(700);
    h.controller.cutTo("b");
    expect(h.started()).toBe(2);
  });
  it("reduced motion swaps at once with no wipe", () => {
    const h = harness(true);
    h.controller.cutTo("a");
    expect(h.log).toEqual(["swap:a@0"]);
    expect(h.started()).toBe(0);
  });
});
