import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseColor } from "../../src/lib/hero/color";
import {
  FAN_COLUMNS,
  HOLD_MS,
  INTRO_MS,
  LATTICE,
  REST,
  WATCHDOG,
} from "../../src/lib/hero/constants";
import { buildPoints, cellsFromAlpha, rankGlyphs } from "../../src/lib/hero/lattice";
import {
  eyeDistance,
  eyeOffset,
  fanStep,
  plateDepth,
  projectPoint,
  STRIDE,
  type Field,
} from "../../src/lib/hero/project";
import { pickDpr, pickTier, type TierEnv } from "../../src/lib/hero/tier";
import {
  cubicBezier,
  easeFromToken,
  poseAt,
  progressFromScroll,
} from "../../src/lib/hero/timeline";
import { createWatchdog } from "../../src/lib/hero/watchdog";

const env = (over: Partial<TierEnv> = {}): TierEnv => ({
  reducedMotion: false,
  webgl2: () => true,
  ...over,
});

describe("pickTier", () => {
  it("reduced motion wins over everything", () => {
    expect(pickTier(env({ reducedMotion: true, hardwareConcurrency: 16 }))).toBe("still");
  });
  it("save-data is still", () => expect(pickTier(env({ saveData: true }))).toBe("still"));
  it("two cores or 1 GB is still", () => {
    expect(pickTier(env({ hardwareConcurrency: 2 }))).toBe("still");
    expect(pickTier(env({ deviceMemory: 1 }))).toBe("still");
  });
  it("no WebGL2 is lite, even on a strong machine", () => {
    expect(pickTier(env({ webgl2: () => false, hardwareConcurrency: 16 }))).toBe("lite");
  });
  it("four cores and 4 GB is lite", () => {
    expect(pickTier(env({ hardwareConcurrency: 4, deviceMemory: 4 }))).toBe("lite");
  });
  it("an undefined deviceMemory does not count as weak", () => {
    expect(pickTier(env({ hardwareConcurrency: 4 }))).toBe("full");
    expect(pickTier(env({ deviceMemory: 4 }))).toBe("full");
  });
  it("otherwise full, and the WebGL probe is skipped when a row already decided", () => {
    expect(pickTier(env({ hardwareConcurrency: 8, deviceMemory: 8 }))).toBe("full");
    const probe = () => {
      throw new Error("probed");
    };
    expect(pickTier(env({ saveData: true, webgl2: probe }))).toBe("still");
  });
});

describe("pickDpr", () => {
  it("uses whole numbers from 1 to 2", () => {
    expect([1, 1.5, 2, 2.625, 3].map(pickDpr)).toEqual([1, 1, 2, 2, 2]);
  });
});

describe("cubicBezier", () => {
  const ease = cubicBezier(0.77, 0, 0.18, 1);
  it("maps the ends and is monotonic", () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    let prev = 0;
    for (let i = 1; i <= 100; i++) {
      const v = ease(i / 100);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
  it("matches the CSS curve at 0.5", () => {
    // Reference solved independently (bisection on x(t) = 0.5 gives t = 0.55835, y = 0.58714).
    expect(Math.abs(ease(0.5) - 0.58714)).toBeLessThan(0.001);
  });
  it("reads a token and falls back", () => {
    expect(easeFromToken("cubic-bezier(0.77, 0, 0.18, 1)")(0.3)).toBeCloseTo(ease(0.3), 6);
    expect(easeFromToken("garbage")(0.3)).toBeCloseTo(ease(0.3), 6);
  });
});

describe("poseAt", () => {
  const still = { x: 0, y: 0 };
  it("is straight ahead through the hold", () => {
    expect(poseAt(0, still)).toEqual({ yaw: 0, pitch: 0 });
    expect(poseAt(HOLD_MS, still)).toEqual({ yaw: 0, pitch: 0 });
  });
  it("reaches the rest pose at the end of the intro, continuously", () => {
    const end = HOLD_MS + INTRO_MS;
    const at = poseAt(end, still);
    expect(at.yaw).toBeCloseTo(REST.yaw, 6);
    expect(at.pitch).toBeCloseTo(REST.pitch, 6);
    const before = poseAt(end - 0.01, still);
    expect(Math.abs(before.yaw - at.yaw)).toBeLessThan(0.001);
  });
  it("drifts through register (yaw -2 degrees) half a period later", () => {
    expect(poseAt(HOLD_MS + INTRO_MS + 13_000, still).yaw).toBeCloseTo(-2, 6);
  });
  it("adds the pointer at the extremes", () => {
    const base = poseAt(0, still);
    expect(poseAt(0, { x: 1, y: 1 }).yaw - base.yaw).toBeCloseTo(4, 6);
    expect(poseAt(0, { x: 1, y: 1 }).pitch - base.pitch).toBeCloseTo(-1.2, 6);
  });
});

describe("progressFromScroll", () => {
  it("clamps and handles zero distance", () => {
    expect(progressFromScroll(-10, 100)).toBe(0);
    expect(progressFromScroll(50, 100)).toBe(0.5);
    expect(progressFromScroll(500, 100)).toBe(1);
    expect(progressFromScroll(50, 0)).toBe(0);
  });
});

function field(plates = 5): Field {
  const g = 4;
  const H = 788;
  const D = eyeDistance(H);
  const cells = [
    { col: 0, row: 0, glyph: 0 },
    { col: 5, row: 2, glyph: 1 },
    { col: 9, row: 7, glyph: 1 },
  ];
  const grid = { ox: 80, oy: 248, g };
  const pts = buildPoints(cells, [1, 0], grid, 3, plates);
  return {
    pts,
    n: pts.length / STRIDE,
    plates,
    C: [300, 400],
    dot: 3,
    g,
    c: fanStep(g, D),
    W: 1440,
    H,
    D,
    maxDot: 40,
  };
}
const point = (f: Field, cell: number, k: number) => cell * f.plates + k;

describe("projection", () => {
  const f = field();
  const out = [0, 0, 0, 0];
  it("depths grow from the screen plane", () => {
    expect(plateDepth(f.D, 0, f.c)).toBe(0);
    const d = [1, 2, 3, 4].map((k) => plateDepth(f.D, k, f.c));
    expect(d).toEqual([...d].sort((a, b) => a - b));
  });
  // The front plate is solid ink: its dot is the pitch, centred on the same cell.
  const nudge = (k: number) => (k === 0 ? (f.g - f.dot) / 2 : 0);
  it("at e = 0 every plate sits on its home position; colored dots are dot-sized, the front is pitch-sized", () => {
    for (let k = 0; k < f.plates; k++) {
      const i = point(f, 1, k);
      projectPoint(f, i, [0, 0], 0, out);
      expect(out[0]).toBeCloseTo(f.pts[i * STRIDE]! + nudge(k), 4);
      expect(out[1]).toBeCloseTo(f.pts[i * STRIDE + 1]! + nudge(k), 4);
      expect(out[2]).toBeCloseTo(k === 0 ? f.g : f.dot, 6);
    }
  });
  it("the front plate's cell is whole pixels: centre minus half the pitch is the cell corner", () => {
    projectPoint(f, point(f, 1, 0), [0, 0], 0, out);
    expect(((out[0] ?? 0) - f.g / 2) % 1).toBeCloseTo(0, 6);
  });
  it("at the rest yaw plate k is shifted exactly FAN_COLUMNS g k", () => {
    const eye = eyeOffset(f.D, REST.yaw, 0);
    for (let k = 0; k < f.plates; k++) {
      const i = point(f, 1, k);
      projectPoint(f, i, eye, 0, out);
      expect((out[0] ?? 0) - f.pts[i * STRIDE]!).toBeCloseTo(FAN_COLUMNS * f.g * k + nudge(k), 4);
    }
  });
  it("plate 0 never moves, whatever the eye", () => {
    const i = point(f, 2, 0);
    for (const e of [
      [-90, 20],
      [0, 0],
      [130, -30],
    ] as const) {
      projectPoint(f, i, e, 0, out);
      expect(out[0]).toBeCloseTo(f.pts[i * STRIDE]! + nudge(0), 6);
      expect(out[1]).toBeCloseTo(f.pts[i * STRIDE + 1]! + nudge(0), 6);
    }
  });
  it("flies through the camera and is culled at T >= 1", () => {
    const i = point(f, 1, 1);
    const delay = f.pts[i * STRIDE + 3]!;
    projectPoint(f, i, [0, 0], delay + 0.48, out);
    expect(out[2]).toBe(0);
    projectPoint(f, i, [0, 0], delay + 0.2, out);
    expect(out[2]).toBeGreaterThan(f.dot);
  });
  it("the back plate ends at (frac * W, H - dot / 2) at p = 1", () => {
    const last = f.plates - 1;
    projectPoint(f, point(f, 0, last), [30, -5], 1, out);
    expect(out[0]).toBeCloseTo(0, 4);
    projectPoint(f, point(f, 2, last), [30, -5], 1, out);
    expect(out[0]).toBeCloseTo(f.W, 3);
    expect(out[1]).toBeCloseTo(f.H - f.dot / 2, 4);
    expect(out[2]).toBeGreaterThan(0);
  });
  it("every front plate is culled by p = 1", () => {
    for (let c = 0; c < 3; c++) {
      for (let k = 0; k < f.plates - 1; k++) {
        projectPoint(f, point(f, c, k), [0, 0], 1, out);
        expect(out[2]).toBe(0);
      }
    }
  });
});

describe("lattice", () => {
  it("cellsFromAlpha thresholds, gives single ownership and drops seams", () => {
    // 6 x 1 raster. Glyph 0 owns cols 1..2; glyph 1 touches at col 3 (dropped), then col 4.
    const owner = new Int16Array(6).fill(-1);
    const a = cellsFromAlpha([0, 200, 128, 0, 0, 0], 6, 1, 0, owner);
    expect(a.map((c) => c.col)).toEqual([1, 2]);
    const b = cellsFromAlpha([0, 255, 255, 255, 255, 127], 6, 1, 1, owner);
    expect(b.map((c) => c.col)).toEqual([4]); // col 1, 2 owned; col 3 touches glyph 0; col 5 < 128
    expect(owner[1]).toBe(0);
  });
  it("cellsFromAlpha reads an RGBA stride", () => {
    const rgba = [0, 0, 0, 255, 0, 0, 0, 10];
    const owner = new Int16Array(2).fill(-1);
    expect(cellsFromAlpha(rgba, 2, 1, 0, owner, 4, 3)).toEqual([{ col: 0, row: 0, glyph: 0 }]);
  });
  it("rankGlyphs puts the farthest centroid at 0 and keeps ties in order", () => {
    expect(
      rankGlyphs(
        [
          [0, 0],
          [10, 0],
          [-10, 0],
          [3, 0],
        ],
        [0, 0],
      ),
    ).toEqual([3, 0, 1, 2]);
  });
  it("buildPoints orders the back plate's frac left to right", () => {
    const f = field();
    const fracs = [0, 1, 2].map((c) => f.pts[point(f, c, 4) * STRIDE + 4]);
    expect(fracs).toEqual([0, 0.5, 1]);
  });
});

describe("createWatchdog", () => {
  const window = (wd: ReturnType<typeof createWatchdog>, ms: number) => {
    let action = "none";
    for (let i = 0; i < WATCHDOG.windowFrames; i++) {
      const a = wd.push(ms);
      if (a !== "none") action = a;
    }
    return action;
  };
  it("fires each full step once, in order, after two slow windows", () => {
    const wd = createWatchdog("full");
    expect(window(wd, 30)).toBe("none");
    expect(window(wd, 30)).toBe("dpr");
    expect(window(wd, 30)).toBe("none");
    expect(window(wd, 30)).toBe("lattice");
    expect(window(wd, 40)).toBe("none");
    expect(window(wd, 40)).toBe("still");
    expect(window(wd, 99)).toBe("none");
    expect(window(wd, 99)).toBe("none");
  });
  it("a fast window resets the count", () => {
    const wd = createWatchdog("full");
    window(wd, 30);
    window(wd, 10);
    expect(window(wd, 30)).toBe("none");
    expect(window(wd, 30)).toBe("dpr");
  });
  it("the last full step needs more than 32 ms", () => {
    const wd = createWatchdog("full");
    for (let i = 0; i < 4; i++) window(wd, 30);
    expect(window(wd, 28)).toBe("none");
    expect(window(wd, 28)).toBe("none");
  });
  it("lite goes straight to the still above 45 ms", () => {
    const wd = createWatchdog("lite");
    expect(window(wd, 40)).toBe("none");
    expect(window(wd, 40)).toBe("none");
    expect(window(wd, 50)).toBe("none");
    expect(window(wd, 50)).toBe("still");
  });
});

describe("tokens agree with the constants", () => {
  const css = readFileSync("src/styles/tokens.css", "utf8");
  const token = (name: string) =>
    [...css.matchAll(new RegExp(`--${name}:\\s*(\\d+)px`, "g"))].map((m) => Number(m[1]));
  it("hero pitch, dot and step: phone first, then desktop", () => {
    expect(token("hero-pitch")).toEqual([LATTICE.full.phone.pitch, LATTICE.full.desktop.pitch]);
    expect(token("hero-dot")).toEqual([LATTICE.full.phone.dot, LATTICE.full.desktop.dot]);
    expect(token("hero-step")).toEqual([
      FAN_COLUMNS * LATTICE.full.phone.pitch,
      FAN_COLUMNS * LATTICE.full.desktop.pitch,
    ]);
  });
});

describe("parseColor", () => {
  it("reads hex and rgb()", () => {
    expect(parseColor("#f59e1b")).toEqual([245, 158, 27]);
    expect(parseColor(" #FA0 ")).toEqual([255, 170, 0]);
    expect(parseColor("rgb(1, 2, 3)")).toEqual([1, 2, 3]);
    expect(parseColor("nope")).toBeNull();
  });
});
