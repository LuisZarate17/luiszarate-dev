/**
 * Scroll staging (spec 4.4, ADR-007). A scene with `pin: true` sits in a `.scene-pin` wrapper.
 * When the wrapper is armed (`is-armed`) it is 75% of the frame taller than the scene, and the
 * scene is `position: sticky`, so it holds in the frame for that stretch of scroll. This module
 * decides when a wrapper may be armed and turns the hold into a 0..1 progress for the scene's
 * simulation: a `sim:progress` event on its `figure.sim`, then `sim:release` when the hold ends.
 *
 * Loaded by Scene.astro only when the page has a `.scene-pin`. It imports nothing, so it stays
 * one small chunk (`npm run check:budget` caps it at 2 KB gzip).
 */

/** Pinning allowed: the media query of spec 4.4, verbatim (the hero uses the same one). */
export const PIN_QUERY =
  "(min-width: 1024px) and (min-height: 760px) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

/** Sub-pixel slack: a scene that is one frame tall measures a fraction over it at some zooms. */
const SLACK = 0.5;

export interface PinConditions {
  /** `PIN_QUERY` matches. */
  media: boolean;
  /** The scene's measured height, and the frame's (`--frame-h`), in px. */
  sceneHeight: number;
  frameHeight: number;
  drawerOpen: boolean;
}

/** Spec 4.4: a scene pins only if the media query holds, it fits the frame and its drawer is closed. */
export function canPin({ media, sceneHeight, frameHeight, drawerOpen }: PinConditions): boolean {
  return media && !drawerOpen && sceneHeight > 0 && sceneHeight <= frameHeight + SLACK;
}

/**
 * Progress of a hold, 0..1. `offset` is how far the wrapper's top has gone above the frame's
 * top edge; `travel` is the extra scroll the wrapper adds (its height minus the scene's).
 */
export function pinProgress(offset: number, travel: number): number {
  if (!(travel > 0)) return 0;
  return Math.min(1, Math.max(0, offset / travel));
}

/**
 * How far to scroll when a wrapper is armed or disarmed, so the scene stays where it is on
 * screen. Arming adds `travel` px of page under the scene's top, disarming removes them:
 *  - a scene still below the frame's top edge is not affected either way;
 *  - disarming mid-hold gives back the part of the hold already scrolled;
 *  - arming a scene that is already scrolling out lands it past its hold, not back in it.
 */
export function armShift(arm: boolean, offset: number, travel: number): number {
  if (!(travel > 0)) return 0;
  if (arm) return offset > 1 ? travel : 0;
  return 0 - Math.min(travel, Math.max(0, offset));
}

export interface StageDetail {
  progress: number;
}

interface Stage {
  wrapper: HTMLElement;
  scene: HTMLElement;
  sim: Element | null;
  armed: boolean;
  /** The hold is in progress: the simulation is being driven. */
  driving: boolean;
  travel: number;
  last: number;
}

/** Starts scroll staging for every `.scene-pin` on the page. */
export function startScrollStage(): void {
  const root = document.documentElement;
  const query = matchMedia(PIN_QUERY);
  const stages: Stage[] = [];
  for (const wrapper of document.querySelectorAll<HTMLElement>(".scene-pin")) {
    const scene = wrapper.querySelector<HTMLElement>(":scope > .scene");
    if (scene) {
      const sim = scene.querySelector(".sim");
      stages.push({ wrapper, scene, sim, armed: false, driving: false, travel: 0, last: -1 });
    }
  }
  if (stages.length === 0) return;

  let frameTop = 0;
  let frameHeight = 0;
  let raf = 0;

  /** The frame between the bars: <body> is padded by exactly the two bars. */
  const measureFrame = () => {
    const body = getComputedStyle(document.body);
    frameTop = parseFloat(body.paddingTop) || 0;
    frameHeight = root.clientHeight - frameTop - (parseFloat(body.paddingBottom) || 0);
  };

  const emit = (stage: Stage, type: "sim:progress" | "sim:release", progress: number) =>
    stage.sim?.dispatchEvent(new CustomEvent<StageDetail>(type, { detail: { progress } }));

  const release = (stage: Stage, progress: number) => {
    if (!stage.driving) return;
    stage.driving = false;
    emit(stage, "sim:release", progress);
  };

  /** One read per armed scene per frame; events only when the progress changed. */
  const tick = () => {
    raf = 0;
    for (const stage of stages) {
      if (!stage.armed) continue;
      const rect = stage.wrapper.getBoundingClientRect();
      stage.travel = rect.height - stage.scene.offsetHeight;
      const progress = pinProgress(frameTop - rect.top, stage.travel);
      if (progress === stage.last) continue;
      stage.last = progress;
      if (progress > 0 && progress < 1) {
        stage.driving = true;
        emit(stage, "sim:progress", progress);
      } else if (stage.driving) {
        // Leaving the hold: the simulation gets the exact end first, then its controls back.
        emit(stage, "sim:progress", progress);
        release(stage, progress);
      }
    }
  };
  const schedule = () => {
    raf ||= requestAnimationFrame(tick);
  };

  const setArmed = (stage: Stage, arm: boolean) => {
    const offset = frameTop - stage.wrapper.getBoundingClientRect().top;
    // The browser's own scroll anchoring would correct the same change a second time.
    root.style.overflowAnchor = "none";
    stage.wrapper.classList.toggle("is-armed", arm);
    stage.armed = arm;
    if (arm) stage.travel = stage.wrapper.offsetHeight - stage.scene.offsetHeight;
    const shift = armShift(arm, offset, stage.travel);
    if (shift) window.scrollBy({ top: shift, behavior: "instant" });
    if (!arm) release(stage, pinProgress(offset, stage.travel));
    stage.last = -1;
    requestAnimationFrame(() => (root.style.overflowAnchor = ""));
  };

  const evaluate = () => {
    measureFrame();
    for (const stage of stages) {
      const arm = canPin({
        media: query.matches,
        sceneHeight: stage.scene.getBoundingClientRect().height,
        frameHeight,
        drawerOpen: stage.scene.querySelector("details[open]") !== null,
      });
      if (arm !== stage.armed) setArmed(stage, arm);
    }
    schedule();
  };

  evaluate();
  query.addEventListener("change", evaluate);
  window.addEventListener("resize", evaluate);
  window.addEventListener("scroll", schedule, { passive: true });
  // `toggle` does not bubble. Capturing on window runs before the drawer's own scroll fix-up
  // (Scene.astro), which then measures the released layout.
  window.addEventListener("toggle", evaluate, true);
  // A simulation that hydrates mid-hold asks for the current progress.
  document.addEventListener("sim:ready", (event) => {
    for (const stage of stages) if (stage.sim === event.target) stage.last = -1;
    schedule();
  });
  // Fonts and hydration change a scene's height, and with it whether it fits.
  const observer = new ResizeObserver(evaluate);
  for (const stage of stages) observer.observe(stage.scene);
  void document.fonts?.ready.then(evaluate);
}
