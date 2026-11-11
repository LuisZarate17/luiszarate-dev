/** Shared reduced-motion helper (spec 4.6). Safe to import on the server: it only touches `window` when called. */
const QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia(QUERY).matches;
}

/** Calls `callback` whenever the preference changes. Returns a function that stops listening. */
export function onReducedMotionChange(callback: (reduced: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia(QUERY);
  const handler = (event: MediaQueryListEvent) => callback(event.matches);
  mql.addEventListener("change", handler);
  return () => mql.removeEventListener("change", handler);
}
