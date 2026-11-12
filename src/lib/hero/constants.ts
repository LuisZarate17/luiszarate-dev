/**
 * Every number of the hero (docs/hero/HERO-SPEC.md sections 2 to 5 and 7, summarised in ADR-006). They were
 * tuned on screen in the prototype; change them here and nowhere else. Colors are never listed:
 * they are read from the tokens at run time.
 */

/** Vertical field of view of the long lens, degrees (2.3). */
export const FOV_DEG = 30;

/** Easing fallback when `--ease-cut` cannot be read (4). */
export const EASE_CUT_FALLBACK = [0.77, 0, 0.18, 1] as const;

/** Intro (4.1): hold, then the eye moves to the rest pose. Milliseconds and degrees. */
export const HOLD_MS = 240;
export const INTRO_MS = 1600;
export const REST = { yaw: 5, pitch: 1 } as const;

/** Idle drift (4.2): centre and amplitude in degrees, period in ms. */
export const DRIFT = {
  yaw: { centre: 1.5, amplitude: 3.5, periodMs: 26_000 },
  pitch: { centre: 0.25, amplitude: 0.75, periodMs: 34_000 },
} as const;

/** Pointer parallax (4.3): degrees at the extremes, and the smoothing time constant. */
export const POINTER = { yaw: 4, pitch: 1.2, tauMs: 180 } as const;

/** Device tilt (4.4): degrees for full deflection, and the per-event baseline re-centre. */
export const TILT = { rangeDeg: 15, recentre: 0.004 } as const;

/** Scroll break-apart (4.5). */
export const BREAK = {
  /** Share of `p` a letter takes to fly through the camera. */
  span: 0.48,
  /** Magnification is exp(zoomK * T). */
  zoomK: 3.7,
  delayBase: 0.03,
  delayPerRank: 0.028,
  delayPerPlate: 0.07,
  /** The back plate flattens into the line between these two values of `p`. */
  lineFrom: 0.35,
  lineTo: 0.95,
  /** Unpinned layouts finish the break-apart after this share of the hero has scrolled off. */
  unpinnedSpan: 0.85,
  /** Largest dot, CSS px (3). */
  maxDot: 40,
} as const;

/** Lattice pitch and dot size, CSS px (3). `phone` is below DESKTOP_MIN_WIDTH. */
export const LATTICE = {
  full: { desktop: { pitch: 4, dot: 3 }, phone: { pitch: 3, dot: 2 } },
  lite: { desktop: { pitch: 6, dot: 5 }, phone: { pitch: 4, dot: 3 } },
} as const;
export const DESKTOP_MIN_WIDTH = 1024;
/** Plates step this many lattice columns at the rest pose (2.3). */
export const FAN_COLUMNS = 1;
/** A cell is ink when its coverage is at least this (0..255) (7.2). */
export const ALPHA_THRESHOLD = 128;
/** Plates the shader has room for: the name plus up to seven projects. */
export const MAX_PLATES = 8;
/** Free point-size range the GL renderer needs, per device pixel of ratio (3). */
export const POINT_SIZE_HEADROOM = 60;

/** Running, visibility, resize (4.7). */
export const IN_VIEW_RATIO = 0.6;
export const MAX_DT_MS = 64;
export const RESIZE_DEBOUNCE_MS = 150;
export const RESIZE_IGNORE_HEIGHT = 120;
export const LITE_FRAME_MS = 1000 / 30;
export const IDLE_TIMEOUT_MS = 2000;
export const IDLE_FALLBACK_MS = 200;
export const FONT_TIMEOUT_MS = 3000;
export const FONT_LOAD = '900 1em "Big Shoulders Display"';
export const FONT_SAMPLE = "LUISZARTE";

/** Pinning allowed: the media query of design-system spec 4.4, verbatim. */
export const PIN_QUERY =
  "(min-width: 1024px) and (min-height: 760px) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

/** Tier rules (5). */
export const TIER = { stillCores: 2, stillMemory: 1, liteCores: 4, liteMemory: 4 } as const;

/** Frame-time watchdog (5): frames per window, and the mean frame times that trip each step, ms. */
export const WATCHDOG = {
  windowFrames: 90,
  consecutiveWindows: 2,
  fullSlowMs: 24,
  fullStillMs: 32,
  liteStillMs: 45,
  /**
   * A browser that caps requestAnimationFrame (iOS Low Power Mode, battery savers) delivers a
   * steady ~33.3 ms interval however cheap the frames are. That is not slowness: a window whose
   * intervals sit within `cappedToleranceMs` of the cap for `cappedShare` of its frames, with a
   * mean render cost under `cappedMaxCostMs`, never counts as slow.
   */
  cappedIntervalMs: 1000 / 30,
  cappedToleranceMs: 2,
  cappedShare: 0.9,
  cappedMaxCostMs: 10,
} as const;
