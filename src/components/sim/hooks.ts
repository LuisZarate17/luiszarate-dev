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
 * instead (SIM-SPEC section 1).
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
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= threshold)) {
          observer.disconnect();
          play();
        }
      },
      { threshold: [threshold] },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // `play` is read once at the moment of intersection; a changing identity must not re-arm it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, reduced, threshold]);
}
