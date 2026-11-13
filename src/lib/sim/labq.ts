import { DUR, seeded, stepProgress } from "./timing";

/** LabQ simulation logic (SIM-SPEC section 2): pure geometry, timeline and counters. */

export const DOTS = 50;
export const LAND_COLS = 10;
export const LAND_ROWS = 5;
export const REFUSE_COLS = 7;
export const REFUSE_ROWS = 7;
/** Every pair of the 50 confirmed bookings overlaps: 50 x 49 / 2. */
export const PAIRS = (DOTS * (DOTS - 1)) / 2;
export const SEED = 1225;
export const HOLD_MS = 1000;
/** Per-dot start delay, at most this long (seeded). */
export const STAGGER_MS = 300;
/** All dots have arrived: travel plus the largest stagger. */
export const TRAVEL_END = DUR.cut + STAGGER_MS;

export type Run = "without" | "with";

export interface Counters {
  confirmed: number;
  refused: number;
  pairs: number;
}

export const END_COUNTERS: Record<Run, Counters> = {
  without: { confirmed: DOTS, refused: 0, pairs: PAIRS },
  with: { confirmed: 1, refused: DOTS - 1, pairs: 0 },
};

export const COUNTER_LABELS = ["Confirmed", "Refused 409", "Overlapping pairs"] as const;

export const formatCount = (n: number) => n.toLocaleString("en-US");

export const countersList = (c: Counters) => [c.confirmed, c.refused, c.pairs].map(formatCount);

/** Time into one run (ms) to the counters it shows. Counters cut; they do not count up. */
export function countersAt(run: Run, t: number): Counters {
  if (run === "without") return t >= TRAVEL_END ? END_COUNTERS.without : ZERO;
  return {
    confirmed: t >= DUR.cut ? 1 : 0,
    refused: t >= runDuration("with") ? DOTS - 1 : 0,
    pairs: 0,
  };
}
const ZERO: Counters = { confirmed: 0, refused: 0, pairs: 0 };

export const runDuration = (run: Run) => (run === "without" ? TRAVEL_END : TRAVEL_END + DUR.reveal);

/** First play: without, hold, with. */
export const SEQUENCE_MS = runDuration("without") + HOLD_MS + runDuration("with");

export interface SequenceFrame {
  run: Run;
  /** ms into that run. */
  t: number;
  /** True while holding between the runs. */
  holding: boolean;
}

export function sequenceAt(t: number): SequenceFrame {
  const first = runDuration("without");
  if (t < first) return { run: "without", t: Math.max(0, t), holding: false };
  if (t < first + HOLD_MS) return { run: "without", t: first, holding: true };
  return { run: "with", t: Math.min(t - first - HOLD_MS, runDuration("with")), holding: false };
}

/** Seeded per-dot stagger. Dot 0 (the one that wins the slot) leaves first. */
export function staggers(seed = SEED): number[] {
  const rand = seeded(seed);
  return Array.from({ length: DOTS }, (_, i) => (i === 0 ? 0 : Math.round(rand() * STAGGER_MS)));
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Point {
  x: number;
  y: number;
}
export interface CounterSlot {
  lx: number;
  ly: number;
  vx: number;
  vy: number;
  align: "start" | "end";
}
export interface Layout {
  w: number;
  h: number;
  r: number;
  slot: Rect;
  header: Point;
  slotLabel: Point;
  constraintLabel: Point;
  refusalLabel: Point;
  counters: CounterSlot[];
  starts: Point[];
  landing: Point[];
  refusal: Point[];
}

const PAD = 10;

/**
 * The geometry of one drawing area (a canvas, or one still panel), in its own pixels.
 * `counterRows` reserves the strip for the three counters; the live canvas leaves it out
 * because the readout below the stage carries them.
 */
export function makeLayout(w: number, h: number, counterRows = true): Layout {
  const band = h < 150;
  const rows = w >= 340;
  const headerH = band ? 14 : 28;
  const counterH = !counterRows ? 0 : rows ? (band ? 28 : 44) : 54;
  const field: Rect = { x: PAD, y: headerH, w: w - PAD * 2, h: h - headerH - counterH };

  const slotX = field.x + field.w * 0.42;
  const slotW = field.x + field.w - slotX;
  const inner = band ? 5 : 10;
  const colS = (slotW - inner * 2) / LAND_COLS;
  const above = band ? 11 : 12;
  const below = band ? 12 : 14;
  const slotH = Math.min(LAND_ROWS * colS + inner * 2, field.h - above - below);
  const slotY = Math.min(
    Math.max(field.y + (field.h - slotH) / 2, field.y + above),
    field.y + field.h - slotH - below,
  );
  const slot: Rect = { x: slotX, y: slotY, w: slotW, h: slotH };
  const rowS = (slotH - inner * 2) / LAND_ROWS;
  const landing: Point[] = Array.from({ length: DOTS }, (_, i) => ({
    x: slot.x + inner + ((i % LAND_COLS) + 0.5) * colS,
    y: slot.y + inner + (Math.floor(i / LAND_COLS) + 0.5) * rowS,
  }));

  const regionW = slotX - field.x - 22;
  const regionH = field.h - 16;
  const s = Math.min(regionW / REFUSE_COLS, regionH / REFUSE_ROWS);
  const gridW = s * REFUSE_COLS;
  const gridH = s * REFUSE_ROWS;
  const gx = field.x + (regionW - gridW) / 2;
  const gy = field.y + (field.h - (gridH + 16)) / 2;
  const refusal: Point[] = Array.from({ length: DOTS - 1 }, (_, i) => ({
    x: gx + ((i % REFUSE_COLS) + 0.5) * s,
    y: gy + (Math.floor(i / REFUSE_COLS) + 0.5) * s,
  }));

  const base = w >= 500 ? 5 : 4;
  const r = Math.min(base, 0.4 * Math.min(colS, rowS, s));

  const cy = h - counterH;
  const counters: CounterSlot[] = [0, 1, 2].map((i) =>
    rows
      ? {
          lx: PAD + (i * (w - PAD * 2)) / 3,
          ly: cy + (band ? 10 : 14),
          vx: PAD + (i * (w - PAD * 2)) / 3,
          vy: cy + (band ? 24 : 34),
          align: "start",
        }
      : { lx: PAD, ly: cy + 14 + i * 16, vx: w - PAD, vy: cy + 14 + i * 16, align: "end" },
  );

  // Dots wait in two columns at the left edge, spread over the field's height.
  const starts: Point[] = Array.from({ length: DOTS }, (_, i) => ({
    x: field.x + r + (i % 2) * (2 * r + 2),
    y: field.y + r + ((Math.floor(i / 2) + 0.5) / (DOTS / 2)) * (field.h - 2 * r),
  }));

  return {
    w,
    h,
    r,
    slot,
    header: { x: PAD, y: headerH - 5 },
    slotLabel: { x: slot.x, y: slot.y - 4 },
    constraintLabel: { x: slot.x, y: slot.y + slot.h + 10 },
    refusalLabel: { x: gx, y: gy + gridH + 11 },
    counters,
    starts,
    landing,
    refusal,
  };
}

export interface Dot extends Point {
  filled: boolean;
}

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/** Where each dot is `t` ms into a run (Infinity is the end state). */
export function dotsAt(layout: Layout, run: Run, t: number, stagger: number[]): Dot[] {
  const { slot, starts, landing, refusal } = layout;
  return starts.map((from, i) => {
    const p = stepProgress(t - (stagger[i] ?? 0), DUR.cut);
    if (run === "without") {
      const to = landing[i] as Point;
      return { x: lerp(from.x, to.x, p), y: lerp(from.y, to.y, p), filled: true };
    }
    if (i === 0) {
      // The one confirmed booking sits in the middle of the slot.
      const to = { x: slot.x + slot.w / 2, y: slot.y + slot.h / 2 };
      return { x: lerp(from.x, to.x, p), y: lerp(from.y, to.y, p), filled: true };
    }
    // The other 49 reach the dashed line, then go back to the refusal grid.
    const line = { x: slot.x - layout.r, y: slot.y + (i / (DOTS - 1)) * slot.h };
    const back = stepProgress(t - TRAVEL_END, DUR.reveal);
    const home = refusal[i - 1] as Point;
    const at = { x: lerp(from.x, line.x, p), y: lerp(from.y, line.y, p) };
    return {
      x: lerp(at.x, home.x, back),
      y: lerp(at.y, home.y, back),
      filled: t < TRAVEL_END,
    };
  });
}

/** What the canvas says for a settled run, in words (also the stage's aria-label). */
export const ARIA_LABEL =
  "Without the constraint, 50 of 50 bookings were confirmed for the same slot. With it, 1 was confirmed and 49 were refused with 409.";
