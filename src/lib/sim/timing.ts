/**
 * Shared timing for the simulations. These mirror the tokens in src/styles/tokens.css
 * (--dur-reveal, --dur-cut, --ease-cut); tests/unit/sim-timing.test.ts fails if they drift.
 */
export const DUR = { reveal: 500, cut: 700 } as const;

/** `--ease-cut`: cubic-bezier(0.77, 0, 0.18, 1). */
const CUT = [0.77, 0, 0.18, 1] as const;

/** Solves a CSS cubic-bezier for progress `t` in 0..1 (Newton, then bisection). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const ax = 3 * x1 - 3 * x2 + 1;
  const bx = 3 * x2 - 6 * x1;
  const cx = 3 * x1;
  const ay = 3 * y1 - 3 * y2 + 1;
  const by = 3 * y2 - 6 * y1;
  const cy = 3 * y1;
  const sampleX = (u: number) => ((ax * u + bx) * u + cx) * u;
  const sampleY = (u: number) => ((ay * u + by) * u + cy) * u;
  const slopeX = (u: number) => (3 * ax * u + 2 * bx) * u + cx;
  return (t: number): number => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let u = t;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(u) - t;
      if (Math.abs(err) < 1e-6) return sampleY(u);
      const d = slopeX(u);
      if (Math.abs(d) < 1e-6) break;
      u -= err / d;
    }
    let lo = 0;
    let hi = 1;
    u = t;
    while (hi - lo > 1e-6) {
      if (sampleX(u) < t) lo = u;
      else hi = u;
      u = (lo + hi) / 2;
    }
    return sampleY(u);
  };
}

export const easeCut = cubicBezier(...CUT);

/** Progress of a staged step: `elapsed` ms into a step of `duration` ms, eased and clamped. */
export function stepProgress(elapsed: number, duration: number): number {
  if (duration <= 0) return 1;
  return easeCut(Math.min(1, Math.max(0, elapsed / duration)));
}

/** Seeded generator (mulberry32): the same seed gives the same frames, so tests can rely on it. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
