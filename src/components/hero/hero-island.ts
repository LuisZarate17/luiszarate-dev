/**
 * The hero island (HERO-SPEC 7.1): tier, lattice sampling, loop, input, pause, watchdog and
 * teardown. A plain TypeScript module, no framework. It never imports three.js: the WebGL
 * renderer is loaded with `await import()` once the tier is known to be `full`.
 */
import { onReducedMotionChange, prefersReducedMotion } from "../../lib/motion";
import {
  BREAK,
  DESKTOP_MIN_WIDTH,
  FONT_LOAD,
  FONT_SAMPLE,
  FONT_TIMEOUT_MS,
  HOLD_MS,
  IDLE_FALLBACK_MS,
  IDLE_TIMEOUT_MS,
  IN_VIEW_RATIO,
  INTRO_MS,
  LATTICE,
  LITE_FRAME_MS,
  MAX_DT_MS,
  MAX_PLATES,
  PIN_QUERY,
  RESIZE_DEBOUNCE_MS,
  RESIZE_IGNORE_HEIGHT,
  TILT,
} from "../../lib/hero/constants";
import { parseColor } from "../../lib/hero/color";
import {
  buildPoints,
  cellsFromAlpha,
  glyphCentroids,
  inkCenter,
  rankGlyphs,
  type Cell,
} from "../../lib/hero/lattice";
import {
  clamp01,
  eyeDistance,
  eyeOffset,
  fanStep,
  STRIDE,
  type Field,
  type Palette,
  type Renderer,
} from "../../lib/hero/project";
import { pickDpr, pickTier, type Tier } from "../../lib/hero/tier";
import { easeFromToken, poseAt, progressFromScroll, type Ease } from "../../lib/hero/timeline";
import { createWatchdog } from "../../lib/hero/watchdog";

/**
 * Query overrides for tests (`?hero=gl`, `?hero=2d`, `?hero=rest`). They exist only in dev and
 * in a build made with PUBLIC_HERO_TEST_HOOKS=1 (the Playwright web server). In a production
 * build this is the constant `false`, the bundler drops the branch, and scripts/check-budget.mjs
 * fails if the `heroHooks` marker below ever ships.
 */
const HOOKS = import.meta.env.DEV || import.meta.env.PUBLIC_HERO_TEST_HOOKS === "1";
type Override = "gl" | "2d" | "rest";

function readOverride(hero: HTMLElement): Override | null {
  hero.dataset.heroHooks = "on";
  const value = new URLSearchParams(location.search).get("hero");
  return value === "gl" || value === "2d" || value === "rest" ? value : null;
}

const idle = (callback: () => void) => {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(callback, { timeout: IDLE_TIMEOUT_MS });
  } else {
    window.setTimeout(callback, IDLE_FALLBACK_MS);
  }
};

/** The WebGL2 probe runs on a throwaway canvas: a failed attempt on the real one blocks "2d". */
function probeWebgl2(strict: boolean): boolean {
  try {
    const gl = document
      .createElement("canvas")
      .getContext("webgl2", { failIfMajorPerformanceCaveat: strict });
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

/** Resolves true when the display face is ready, false after the timeout (stay on the h1). */
async function fontsReady(): Promise<boolean> {
  const loaded = (async () => {
    await document.fonts.load(FONT_LOAD, FONT_SAMPLE);
    await document.fonts.ready;
    return true;
  })();
  const timeout = new Promise<boolean>((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS, false));
  return Promise.race([loaded, timeout]).catch(() => false);
}

export function startHero(hero: HTMLElement): void {
  const pin = hero.closest<HTMLElement>(".hero-pin");
  const h1 = hero.querySelector<HTMLElement>("h1");
  const inner = hero.querySelector<HTMLElement>(".hero-inner");
  const box = hero.querySelector<HTMLElement>(".hero-field");
  const pauseButton = hero.querySelector<HTMLButtonElement>(".hero-pause");
  let canvas = box?.querySelector("canvas") ?? null;
  const plateIds = (hero.dataset.plates ?? "").split(",").filter(Boolean);
  const plates = plateIds.length + 1;
  if (!pin || !h1 || !inner || !box || !canvas || !pauseButton) return;
  if (plates < 2 || plates > MAX_PLATES) return;

  const override = HOOKS ? readOverride(hero) : null;
  const pinQuery = matchMedia(PIN_QUERY);
  const phoneQuery = matchMedia(`(max-width: ${DESKTOP_MIN_WIDTH - 1}px)`);
  const root = document.documentElement;

  let renderer: Renderer | null = null;
  let field: Field | null = null;
  let palette: Palette | null = null;
  let ease: Ease = easeFromToken("");
  let tier: Tier = "still";
  let lattice: "full" | "lite" = "full";
  let dpr = 1;
  let watchdog: ReturnType<typeof createWatchdog> | null = null;
  let generation = 0;
  let canvasUsed = false;
  let live = false;
  let paused = false;
  let visible = true;
  let raf = 0;
  let last = 0;
  let lastDraw = 0;
  let clock = 0;
  let progress = 0;
  let lastKey = "";
  const pointer = { tx: 0, ty: 0, x: 0, y: 0 };

  /* ---------- Text to points (7.2) ---------- */

  function layoutKey(): string {
    const b = h1!.getBoundingClientRect();
    const hb = hero.getBoundingClientRect();
    return [b.left - hb.left, b.top - hb.top, b.width, b.height, hb.width, hb.height]
      .map(Math.round)
      .join("|");
  }

  function sample(): Field | null {
    const hb = hero.getBoundingClientRect();
    const hr = h1!.getBoundingClientRect();
    const style = getComputedStyle(h1!);
    const { pitch: g, dot } = LATTICE[lattice][phoneQuery.matches ? "phone" : "desktop"];
    const grid = { ox: Math.round(hr.left - hb.left), oy: Math.round(hr.top - hb.top), g };
    const cols = Math.ceil(hr.width / g) + 2;
    const rows = Math.ceil(hr.height / g) + 2;
    const surface = document.createElement("canvas");
    surface.width = cols;
    surface.height = rows;
    const ctx = surface.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    ctx.textBaseline = "alphabetic";

    const owner = new Int16Array(cols * rows).fill(-1);
    const cells: Cell[] = [];
    let glyphs = 0;
    const range = document.createRange();
    for (const line of h1!.querySelectorAll(".hero-line")) {
      const text = line.firstChild;
      if (!(text instanceof Text)) continue;
      // The baseline is the bottom edge of a zero-size inline-block at the end of the line.
      const probe = document.createElement("span");
      probe.style.cssText = "display:inline-block;width:0;height:0";
      line.appendChild(probe);
      const baseline = probe.getBoundingClientRect().bottom - hb.top;
      probe.remove();
      for (let i = 0; i < text.length; i++) {
        range.setStart(text, i);
        range.setEnd(text, i + 1);
        const left = range.getBoundingClientRect().left - hb.left;
        ctx.setTransform(1 / g, 0, 0, 1 / g, 0, 0);
        ctx.clearRect(0, 0, cols * g, rows * g);
        ctx.fillText(text.data.charAt(i).toUpperCase(), left - grid.ox, baseline - grid.oy);
        const { data } = ctx.getImageData(0, 0, cols, rows);
        cells.push(...cellsFromAlpha(data, cols, rows, glyphs, owner, 4, 3));
        glyphs += 1;
      }
    }
    if (cells.length === 0) return null;

    const C = inkCenter(cells, grid);
    const ranks = rankGlyphs(glyphCentroids(cells, glyphs, grid), C);
    const pts = buildPoints(cells, ranks, grid, dot, plates);
    const D = eyeDistance(hb.height);
    lastKey = layoutKey();
    return {
      pts,
      n: pts.length / STRIDE,
      plates,
      C,
      dot,
      g,
      c: fanStep(g, D),
      W: hb.width,
      H: hb.height,
      D,
      maxDot: BREAK.maxDot,
    };
  }

  function readPalette(): Palette | null {
    const style = getComputedStyle(hero);
    const light = root.dataset.theme === "light";
    const read = (name: string) => parseColor(style.getPropertyValue(name));
    const bg = read("--color-bg");
    const front = read("--color-text");
    if (!bg || !front) return null;
    const colors = [front];
    for (const id of plateIds) {
      const color = read(`--w-${id}-${light ? "text-light" : "fill"}`);
      if (!color) return null;
      colors.push(color);
    }
    return { bg, plates: colors };
  }

  /* ---------- Frame loop (4.7) ---------- */

  function readProgress() {
    const pinned = pin!.classList.contains("is-armed") && pinQuery.matches;
    const distance = pinned
      ? pin!.offsetHeight - hero.offsetHeight
      : hero.offsetHeight * BREAK.unpinnedSpan;
    progress = override === "rest" ? 0 : progressFromScroll(window.scrollY, distance);
  }

  /**
   * Share of the hero inside the viewport, read from its rect on every frame. An
   * IntersectionObserver was used first and could strand the field: its callback is batched
   * and only the first (oldest) entry was read, so a quick scroll out and back could leave the
   * hero "not in view" for good, with the loop stopped and scroll events ignored.
   */
  function viewShare(): number {
    const r = hero.getBoundingClientRect();
    const visibleHeight = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
    return r.height > 0 ? Math.max(0, visibleHeight) / r.height : 0;
  }

  function runnable(share: number): boolean {
    return !paused && visible && share >= IN_VIEW_RATIO && override !== "rest";
  }

  function draw(dt: number) {
    if (!renderer || !field) return;
    const k = 1 - Math.exp(-dt / 180);
    pointer.x += (pointer.tx - pointer.x) * k;
    pointer.y += (pointer.ty - pointer.y) * k;
    if (override === "rest") clock = HOLD_MS + INTRO_MS;
    const pose = poseAt(clock, pointer, ease);
    renderer.draw(field, eyeOffset(field.D, pose.yaw, pose.pitch), progress);
  }

  function frame(now: number) {
    raf = 0;
    if (!renderer || !field) return;
    const share = viewShare();
    // Off screen: nothing to draw. The next scroll event (or resize) asks for a frame again.
    if (live && share <= 0) {
      last = 0;
      return;
    }
    const running = runnable(share);
    let dt = 0;
    if (running) {
      dt = Math.min(MAX_DT_MS, now - (last || now));
      if (tier === "lite" && last && now - lastDraw < LITE_FRAME_MS - 2) {
        raf = requestAnimationFrame(frame);
        return;
      }
      last = now;
      clock += dt;
    } else {
      last = 0;
    }
    lastDraw = now;
    readProgress();
    draw(running ? dt : 0);
    if (!live) {
      // The cut: the h1 goes off and the canvas on in the same frame (2.2).
      live = true;
      hero.classList.add("hero--live");
    }
    if (running && watchdog && clock > HOLD_MS + INTRO_MS) act(watchdog.push(dt));
    if (running && renderer) raf = requestAnimationFrame(frame);
  }

  function request() {
    if (!raf && renderer && field && visible) raf = requestAnimationFrame(frame);
  }

  function stopLoop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  }

  function rebuild() {
    if (!renderer || !palette) return;
    const next = sample();
    if (!next) return;
    field = next;
    renderer.setField(field, dpr);
    watchdog?.reset();
    if (live) {
      readProgress();
      draw(0);
    }
  }

  /** Watchdog steps (5): fewer pixels, then a coarser lattice, then the still. */
  function act(action: ReturnType<ReturnType<typeof createWatchdog>["push"]>) {
    if (action === "dpr") dpr = 1;
    else if (action === "lattice") lattice = "lite";
    else if (action === "still") return void toStill();
    else return;
    rebuild();
  }

  /* ---------- Teardown ---------- */

  function teardown() {
    generation += 1;
    stopLoop();
    renderer?.dispose();
    renderer = null;
    field = null;
    live = false;
    hero.classList.remove("hero--live");
    pin!.classList.remove("is-armed");
    delete hero.dataset.heroTier;
  }

  /** Failure or a weak device: the CSS still, no canvas, no pin, no Pause. */
  function toStill() {
    teardown();
    hero.classList.add("hero--still");
    readProgress();
  }

  /* ---------- Boot ---------- */

  function freshCanvas(): HTMLCanvasElement {
    const next = document.createElement("canvas");
    canvas!.replaceWith(next);
    canvas = next;
    bindCanvas(next);
    return next;
  }

  function bindCanvas(target: HTMLCanvasElement) {
    target.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      stopLoop();
      live = false;
      hero.classList.remove("hero--live");
    });
    target.addEventListener("webglcontextrestored", () => {
      if (!renderer || !palette) return;
      rebuild();
      request();
    });
  }

  async function boot() {
    const mine = ++generation;
    if (prefersReducedMotion()) return; // the CSS still is already showing
    hero.classList.remove("hero--still");
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };
    tier =
      override === "2d"
        ? "lite"
        : override
          ? "full"
          : pickTier({
              reducedMotion: false,
              saveData: nav.connection?.saveData,
              hardwareConcurrency: nav.hardwareConcurrency,
              deviceMemory: nav.deviceMemory,
              webgl2: () => probeWebgl2(true),
            });
    if (tier === "still") return void toStill();
    pin!.classList.add("is-armed");

    // Start loading the renderer while the fonts settle.
    const gl = tier === "full" ? import("./render-gl") : null;
    const flat = tier === "lite" ? import("./render-2d") : null;
    const [fonts] = await Promise.all([
      fontsReady(),
      gl?.catch(() => null),
      flat?.catch(() => null),
    ]);
    if (mine !== generation) return;
    palette = readPalette();
    if (!fonts || !palette) return void toStill();

    ease = easeFromToken(getComputedStyle(root).getPropertyValue("--ease-cut"));
    if (canvasUsed) freshCanvas();
    canvasUsed = true;
    dpr = pickDpr(window.devicePixelRatio);
    lattice = tier === "lite" ? "lite" : "full";
    try {
      const mod = gl ? await gl : null;
      if (mine !== generation) return;
      renderer = mod ? mod.createGlRenderer(canvas!, palette) : null;
    } catch {
      renderer = null;
    }
    if (!renderer) {
      // WebGL failed after a good probe: a fresh canvas, and the lite renderer.
      try {
        if (tier === "full") freshCanvas();
        const mod = await (flat ?? import("./render-2d"));
        if (mine !== generation) return;
        renderer = mod.create2dRenderer(canvas!, palette);
        tier = "lite";
        lattice = "lite";
      } catch {
        return void toStill();
      }
    }
    hero.dataset.heroTier = tier;
    field = sample();
    if (!field) return void toStill();
    renderer.setField(field, dpr);
    watchdog = override ? null : createWatchdog(tier);
    clock = 0;
    last = 0;
    request();
  }

  /* ---------- Input ---------- */

  hero.addEventListener("pointermove", (event) => {
    if (paused || !renderer) return;
    const b = hero.getBoundingClientRect();
    pointer.tx = clamp01((event.clientX - b.left) / b.width) * 2 - 1;
    pointer.ty = clamp01((event.clientY - b.top) / b.height) * 2 - 1;
  });
  const release = () => {
    pointer.tx = 0;
    pointer.ty = 0;
  };
  hero.addEventListener("pointerleave", release);
  hero.addEventListener("pointercancel", release);

  // Tilt only where no permission prompt exists (Android). iOS keeps drift and drag (4.4).
  const orientation = window.DeviceOrientationEvent as
    (typeof DeviceOrientationEvent & { requestPermission?: unknown }) | undefined;
  if (orientation && typeof orientation.requestPermission !== "function") {
    let gamma0: number | null = null;
    let beta0: number | null = null;
    window.addEventListener("deviceorientation", (event) => {
      if (paused || !renderer || !phoneQuery.matches) return;
      if (event.gamma === null || event.beta === null) return;
      gamma0 ??= event.gamma;
      beta0 ??= event.beta;
      gamma0 += (event.gamma - gamma0) * TILT.recentre;
      beta0 += (event.beta - beta0) * TILT.recentre;
      pointer.tx = Math.max(-1, Math.min(1, (event.gamma - gamma0) / TILT.rangeDeg));
      pointer.ty = Math.max(-1, Math.min(1, (event.beta - beta0) / TILT.rangeDeg));
    });
  }

  pauseButton.addEventListener("click", () => {
    paused = !paused;
    pauseButton.textContent = paused ? "Play" : "Pause";
    if (paused) release();
    watchdog?.reset();
    last = 0;
    request();
  });

  // Scroll is the visitor's own input: it drives `p` even while paused (4.6, 4.7).
  window.addEventListener(
    "scroll",
    () => {
      if (override !== "rest") request();
    },
    { passive: true },
  );

  document.addEventListener("visibilitychange", () => {
    visible = document.visibilityState === "visible";
    watchdog?.reset();
    if (visible) request();
    else stopLoop();
  });

  // Re-sample when the name moves or changes size (4.7). Height-only changes under 120 px are
  // mobile browser chrome and are ignored.
  let resizeTimer = 0;
  let lastWidth = window.innerWidth;
  let lastHeight = window.innerHeight;
  window.addEventListener("resize", () => {
    request();
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (width === lastWidth && Math.abs(height - lastHeight) < RESIZE_IGNORE_HEIGHT) return;
      lastWidth = width;
      lastHeight = height;
      rebuild();
    }, RESIZE_DEBOUNCE_MS);
  });
  new ResizeObserver(() => {
    if (field && layoutKey() !== lastKey) rebuild();
  }).observe(inner);

  window.addEventListener("themechange", () => {
    palette = readPalette();
    if (!palette || !renderer || !field) return;
    renderer.setPalette(palette);
    draw(0);
  });

  bindCanvas(canvas);
  onReducedMotionChange((reduced) => {
    if (reduced) teardown();
    else void boot();
  });

  const start = () => void boot();
  if (document.readyState === "complete") idle(start);
  else window.addEventListener("load", () => idle(start), { once: true });
}
