import { DRIFT, EASE_CUT_FALLBACK, HOLD_MS, INTRO_MS, POINTER, REST } from "./constants";
import { clamp01 } from "./project";

export type Ease = (x: number) => number;

/** CSS `cubic-bezier(x1, y1, x2, y2)` as a function of progress, solved by bisection. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): Ease {
  const at = (t: number, a: number, b: number) =>
    3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    let t = x;
    for (let i = 0; i < 32; i++) {
      t = (lo + hi) / 2;
      if (at(t, x1, x2) < x) lo = t;
      else hi = t;
    }
    return at(t, y1, y2);
  };
}

/** Reads a `cubic-bezier(...)` token value; falls back to the site's one staged easing. */
export function easeFromToken(value: string): Ease {
  const m = /cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/.exec(
    value,
  );
  const n = m ? m.slice(1, 5).map(Number) : [...EASE_CUT_FALLBACK];
  return cubicBezier(n[0] ?? 0, n[1] ?? 0, n[2] ?? 1, n[3] ?? 1);
}

const defaultEase = cubicBezier(...EASE_CUT_FALLBACK);

export interface Pose {
  yaw: number;
  pitch: number;
}

/**
 * The eye's pose in degrees at `clockMs` (time since the first frame, advancing only while
 * the field runs). `pointer` is the smoothed pointer or tilt in −1..1.
 */
export function poseAt(
  clockMs: number,
  pointer: { x: number; y: number },
  ease: Ease = defaultEase,
): Pose {
  let yaw: number;
  let pitch: number;
  if (clockMs < HOLD_MS + INTRO_MS) {
    const u = ease(clamp01((clockMs - HOLD_MS) / INTRO_MS));
    yaw = REST.yaw * u;
    pitch = REST.pitch * u;
  } else {
    const t = clockMs - HOLD_MS - INTRO_MS;
    yaw = DRIFT.yaw.centre + DRIFT.yaw.amplitude * Math.cos((2 * Math.PI * t) / DRIFT.yaw.periodMs);
    pitch =
      DRIFT.pitch.centre +
      DRIFT.pitch.amplitude * Math.cos((2 * Math.PI * t) / DRIFT.pitch.periodMs);
  }
  return { yaw: yaw + POINTER.yaw * pointer.x, pitch: pitch - POINTER.pitch * pointer.y };
}

/** Scroll break-apart `p`, linear in scroll and clamped to 0..1; 0 when there is no distance. */
export function progressFromScroll(scrollY: number, distance: number): number {
  return distance > 0 ? clamp01(scrollY / distance) : 0;
}
