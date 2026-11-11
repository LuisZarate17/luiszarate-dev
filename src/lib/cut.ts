/**
 * The scene cut (spec 4.2, 5.3): one full-frame wipe, left to right, with the state
 * swap at 350 ms while the frame is covered. The controller is dependency-injected so
 * its timing logic is unit-testable; `cutTo` wires it to the real DOM.
 */
import { prefersReducedMotion } from "./motion";

export const CUT_DURATION_MS = 700;
export const CUT_SWAP_AT_MS = 350;

const EASE_FALLBACK = "cubic-bezier(0.77, 0, 0.18, 1)";

/** Keyframes of the wipe (spec 4.2). `ease` is the value of --ease-cut. */
export function wipeKeyframes(ease: string): Keyframe[] {
  return [
    { offset: 0, transform: "translateX(-101%)", easing: ease },
    { offset: 0.45, transform: "translateX(0)", easing: "linear" },
    { offset: 0.55, transform: "translateX(0)", easing: ease },
    { offset: 1, transform: "translateX(101%)" },
  ];
}

export type CutTarget = HTMLElement | "top";

export interface CutOptions {
  /** Runs at the swap, after the instant scroll and focus move. */
  onSwap?: () => void;
}

export interface WipeHandle {
  /** Milliseconds since the wipe started, from the animation's own clock. */
  currentTime(): number;
  onFinish(callback: () => void): void;
}

export interface CutDeps<T> {
  reduced(): boolean;
  startWipe(): WipeHandle;
  /** Scroll instantly to the target, then move focus and update the hash. */
  swap(target: T): void;
  raf(callback: () => void): void;
}

interface Request<T> {
  target: T;
  onSwap?: (() => void) | undefined;
}

export function createCutController<T>(deps: CutDeps<T>) {
  let active = false;
  let swapped = false;
  let pending: Request<T> | null = null;

  function perform(request: Request<T>) {
    deps.swap(request.target);
    request.onSwap?.();
  }

  function cutTo(target: T, options: CutOptions = {}) {
    const request: Request<T> = { target, onSwap: options.onSwap };
    if (deps.reduced()) {
      perform(request);
      return;
    }
    if (active) {
      // Never more than one cut: re-target the running one without restarting it.
      if (swapped) perform(request);
      else pending = request;
      return;
    }
    active = true;
    swapped = false;
    pending = request;
    const wipe = deps.startWipe();
    const doSwap = () => {
      if (swapped || !pending) return;
      swapped = true;
      const next = pending;
      pending = null;
      perform(next);
    };
    const tick = () => {
      if (swapped || !active) return;
      if (wipe.currentTime() >= CUT_SWAP_AT_MS) doSwap();
      else deps.raf(tick);
    };
    wipe.onFinish(() => {
      doSwap();
      active = false;
    });
    deps.raf(tick);
  }

  return { cutTo, isActive: () => active };
}

/* ---------- Browser wiring ---------- */

function headingOf(target: CutTarget): HTMLElement {
  const main = document.getElementById("main") as HTMLElement;
  const scope = target === "top" ? main : target;
  const heading = scope.querySelector<HTMLElement>("h1, h2, h3") ?? scope;
  if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
  return heading;
}

function swapDom(target: CutTarget) {
  if (target === "top") {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    history.replaceState(null, "", location.pathname + location.search);
  } else {
    // scroll-padding-top on <html> keeps the section's top edge under the top bar.
    target.scrollIntoView({ behavior: "instant", block: "start" });
    history.replaceState(null, "", `#${target.id}`);
  }
  headingOf(target).focus({ preventScroll: true });
}

function startWipeDom(): WipeHandle {
  const wipe = document.querySelector<HTMLElement>(".wipe");
  if (!wipe) {
    return { currentTime: () => CUT_SWAP_AT_MS, onFinish: (cb) => queueMicrotask(cb) };
  }
  const ease = getComputedStyle(document.documentElement).getPropertyValue("--ease-cut").trim();
  const animation = wipe.animate(wipeKeyframes(ease || EASE_FALLBACK), {
    duration: CUT_DURATION_MS,
  });
  return {
    currentTime: () => Number(animation.currentTime ?? 0),
    onFinish: (cb) => {
      animation.addEventListener("finish", cb);
      animation.addEventListener("cancel", cb);
    },
  };
}

let controller: ReturnType<typeof createCutController<CutTarget>> | undefined;

export function cutTo(target: CutTarget, options?: CutOptions) {
  controller ??= createCutController<CutTarget>({
    reduced: prefersReducedMotion,
    startWipe: startWipeDom,
    swap: swapDom,
    raf: (cb) => requestAnimationFrame(cb),
  });
  controller.cutTo(target, options);
}

/**
 * Turns in-page anchor jumps into cuts: links to a section inside <main>, and the home
 * link (`data-cut-home`) when already on the home page. Without JavaScript these stay
 * plain anchors and the browser jumps.
 */
export function bindCutLinks() {
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
    if (!link || link.target || link.hasAttribute("download")) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname) return;
    if (link.hasAttribute("data-cut-home") && !url.hash) {
      event.preventDefault();
      cutTo("top");
      return;
    }
    if (!url.hash) return;
    const main = document.getElementById("main");
    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!main || !target || target === main || !main.contains(target)) return;
    event.preventDefault();
    cutTo(target);
  });
}
