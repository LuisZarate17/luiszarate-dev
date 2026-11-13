import { useEffect, useSyncExternalStore, type RefObject } from "react";
import { onReducedMotionChange, prefersReducedMotion } from "../../lib/motion";

/** True under `prefers-reduced-motion: reduce`, and follows a live change without a reload. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (notify) => onReducedMotionChange(notify),
    prefersReducedMotion,
    () => false,
  );
}

/**
 * Calls `play` once, the first time `ref` is at least `threshold` visible. It never plays
 * under reduced motion, and never on a touch-first device, where the visitor taps a control
 * instead (SIM-SPEC section 1). In a scene that is armed to pin, scroll plays the simulation
 * (spec 4.4), so this waits; once scroll has driven it, it never plays by itself.
 */
export function usePlayOnView(
  ref: RefObject<Element | null>,
  play: () => void,
  threshold = 0.6,
): void {
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || window.matchMedia("(pointer: coarse)").matches) return;
    const figure = el.closest(".sim");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= threshold)) {
          if (el.closest(".scene-pin.is-armed")) return;
          observer.disconnect();
          play();
        }
      },
      { threshold: [threshold] },
    );
    observer.observe(el);
    const driven = () => observer.disconnect();
    figure?.addEventListener("sim:progress", driven, { once: true });
    return () => {
      observer.disconnect();
      figure?.removeEventListener("sim:progress", driven);
    };
    // `play` is read once at the moment of intersection; a changing identity must not re-arm it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, reduced, threshold]);
}

/**
 * The bridge from scroll staging (src/lib/scroll-stage.ts) to an island. While the scene holds
 * in the frame, `onProgress` gets the hold's progress, 0..1, on every frame it changes; when
 * the hold ends, `onRelease` gets the progress it ended at and the simulation is the visitor's
 * again. Both callbacks must be stable (`useCallback`).
 */
export function useScrollStage(
  ref: RefObject<Element | null>,
  onProgress: (progress: number) => void,
  onRelease: (progress: number) => void,
): void {
  useEffect(() => {
    const figure = ref.current?.closest(".sim");
    if (!figure) return;
    const read = (event: Event) => (event as CustomEvent<{ progress: number }>).detail.progress;
    const progress = (event: Event) => onProgress(read(event));
    const release = (event: Event) => onRelease(read(event));
    figure.addEventListener("sim:progress", progress);
    figure.addEventListener("sim:release", release);
    // Hydrated mid-hold: ask for the progress the scroll is at.
    figure.dispatchEvent(new CustomEvent("sim:ready", { bubbles: true }));
    return () => {
      figure.removeEventListener("sim:progress", progress);
      figure.removeEventListener("sim:release", release);
    };
  }, [ref, onProgress, onRelease]);
}
