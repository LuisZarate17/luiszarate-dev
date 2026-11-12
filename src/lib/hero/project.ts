import { BREAK, FAN_COLUMNS, FOV_DEG, REST } from "./constants";
import type { Rgb } from "./color";

/** Floats per point in `Field.pts`: x, y, plate k, delay, frac. */
export const STRIDE = 5;

/**
 * The laid-out name as points. All coordinates are CSS px in the hero's box, y down.
 * `pts` holds `STRIDE` floats per point, one point per cell per plate.
 */
export interface Field {
  pts: Float32Array;
  /** Number of points (`pts.length / STRIDE`). */
  n: number;
  /** Plates, front (0) to back (`plates - 1`). */
  plates: number;
  /** Vanishing point: the centre of the name's ink box. */
  C: readonly [number, number];
  /** Dot size and lattice pitch. */
  dot: number;
  g: number;
  /** Fan coefficient from `fanStep`. */
  c: number;
  W: number;
  H: number;
  /** Eye distance. */
  D: number;
  /** Largest dot; the GL renderer may lower it to the hardware's point-size limit. */
  maxDot: number;
}

export const rad = (deg: number) => (deg * Math.PI) / 180;
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export function smoothstep(a: number, b: number, v: number): number {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** Eye distance for a field of view over height `H`. */
export const eyeDistance = (H: number) => H / 2 / Math.tan(rad(FOV_DEG / 2));

/**
 * Fan coefficient `c`: plate k sits at depth D·k·c / (1 − k·c), so from an eye offset `e` it
 * slides `k·c·e` on screen. Chosen so each plate steps `FAN_COLUMNS` lattice columns at the
 * rest yaw.
 */
export const fanStep = (g: number, D: number) => (FAN_COLUMNS * g) / (D * Math.tan(rad(REST.yaw)));

/** Depth of plate `k` behind the screen plane. */
export const plateDepth = (D: number, k: number, c: number) => (D * k * c) / (1 - k * c);

/** Eye offset in px for a pose in degrees (an off-axis projection: the screen plane never moves). */
export function eyeOffset(D: number, yaw: number, pitch: number): [number, number] {
  return [D * Math.tan(rad(yaw)), -D * Math.tan(rad(pitch))];
}

/**
 * Projects point `i` for eye offset `eye` and break-apart progress `p`.
 * Writes `[x, y, size, cardSize]` into `out` (CSS px); `size` is 0 once the point has flown
 * through the camera. The GL vertex shader mirrors these lines.
 */
export function projectPoint(
  f: Field,
  i: number,
  eye: readonly [number, number],
  p: number,
  out: number[] | Float32Array,
): number[] | Float32Array {
  const a = f.pts;
  const o = i * STRIDE;
  const k = a[o + 2] ?? 0;
  const delay = a[o + 3] ?? 0;
  const D = f.D;
  const d = plateDepth(D, k, f.c);
  const ex = f.C[0] + eye[0];
  const ey = f.C[1] + eye[1];
  const back = k === f.plates - 1;
  const scale = (D + d) / D;
  let w = D + d;
  let T = 0;
  if (!back) {
    T = clamp01((p - delay) / BREAK.span);
    w -= D * (1 - Math.exp(-BREAK.zoomK * T)) * scale;
  }
  // The front plate is solid ink: its dot is the pitch, centred on the same cell.
  const front = k === 0;
  const dot = front ? f.g : f.dot;
  const nudge = front ? (f.g - f.dot) / 2 : 0;
  const hx = (a[o] ?? 0) + nudge;
  const hy = (a[o + 1] ?? 0) + nudge;
  let x = ex + (f.C[0] + (hx - f.C[0]) * scale - ex) * (D / w);
  let y = ey + (f.C[1] + (hy - f.C[1]) * scale - ey) * (D / w);
  const size = Math.min(f.maxDot, (dot * (D + d)) / w);
  if (back) {
    const t = smoothstep(BREAK.lineFrom, BREAK.lineTo, p);
    x += ((a[o + 4] ?? 0) * f.W - x) * t;
    y += (f.H - f.dot / 2 - y) * t;
  }
  out[0] = x;
  out[1] = y;
  out[2] = T >= 1 ? 0 : size;
  out[3] = front ? size : (size * (f.g + 0.5)) / f.dot;
  return out;
}

/** Colors read from the tokens: the card backing, and one color per plate, front first. */
export interface Palette {
  bg: Rgb;
  plates: readonly Rgb[];
}

/** Both renderers draw the same `Field` through `projectPoint`'s math. */
export interface Renderer {
  /** Takes a new field (and pixel ratio). May lower `field.maxDot` to the hardware's limit. */
  setField(field: Field, dpr: number): void;
  setPalette(palette: Palette): void;
  draw(field: Field, eye: readonly [number, number], p: number): void;
  dispose(): void;
}
