import { WATCHDOG } from "./constants";

export type WatchdogAction = "none" | "dpr" | "lattice" | "still";

/** The steps a renderer goes through, in order, once each (spec 5). */
const FULL_STEPS: readonly { action: WatchdogAction; limitMs: number }[] = [
  { action: "dpr", limitMs: WATCHDOG.fullSlowMs },
  { action: "lattice", limitMs: WATCHDOG.fullSlowMs },
  { action: "still", limitMs: WATCHDOG.fullStillMs },
];
const LITE_STEPS: readonly { action: WatchdogAction; limitMs: number }[] = [
  { action: "still", limitMs: WATCHDOG.liteStillMs },
];

/**
 * Frame-time watchdog. Feed it every frame's `dt` with `push`; it averages non-overlapping
 * windows of `windowFrames` and returns the next step once the current step's limit was
 * exceeded in `consecutiveWindows` windows in a row. A step is never repeated and the result
 * is not stored. Call `reset` after anything that makes the next frames unrepresentative
 * (resize, visibility change, a rebuild).
 */
export function createWatchdog(tier: "full" | "lite") {
  const steps = tier === "full" ? FULL_STEPS : LITE_STEPS;
  let stage = 0;
  let slow = 0;
  let frames = 0;
  let total = 0;
  return {
    push(dt: number): WatchdogAction {
      const step = steps[stage];
      if (!step) return "none";
      frames += 1;
      total += dt;
      if (frames < WATCHDOG.windowFrames) return "none";
      const mean = total / frames;
      frames = 0;
      total = 0;
      slow = mean > step.limitMs ? slow + 1 : 0;
      if (slow < WATCHDOG.consecutiveWindows) return "none";
      slow = 0;
      stage += 1;
      return step.action;
    },
    reset() {
      slow = 0;
      frames = 0;
      total = 0;
    },
  };
}
