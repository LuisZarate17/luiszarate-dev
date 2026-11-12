/**
 * Scroll-driven timecode (spec 5.1). Every top-level section of <main> is worth
 * 30 seconds; inside a section the time advances linearly with scroll progress.
 * Pure functions only, so they run in unit tests without a DOM.
 */
export const FPS = 24;

/**
 * The elements that count as sections: every scene, and the hero. The hero is wrapped in
 * `.hero-pin` (the sticky pin, twice the frame tall), so the wrapper is section 0: a sticky
 * section's own top moves while it is pinned, the wrapper's does not.
 */
export const SECTION_SELECTOR = "main > .hero-pin, main > section";
export const SECTION_SECONDS = 30;

const pad = (n: number) => String(n).padStart(2, "0");

/** Formats seconds as `HH:MM:SS:FF` at 24 frames per second. */
export function formatTimecode(seconds: number): string {
  const totalFrames = Math.max(0, Math.floor(seconds * FPS + 1e-6));
  const frames = totalFrames % FPS;
  const totalSeconds = Math.floor(totalFrames / FPS);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(frames)}`;
}

/** Index of the section whose top is the last one at or above `probe` (0 before the first). */
export function sectionIndexAt(tops: readonly number[], probe: number): number {
  let index = 0;
  for (let i = 0; i < tops.length; i++) {
    if ((tops[i] ?? Infinity) <= probe) index = i;
  }
  return index;
}

/**
 * Seconds into the page at document position `probe`.
 * `tops` are the sections' document-space tops in order; `end` is where the last one ends.
 */
export function secondsAt(tops: readonly number[], end: number, probe: number): number {
  if (tops.length === 0) return 0;
  const i = sectionIndexAt(tops, probe);
  const start = tops[i] ?? 0;
  const stop = tops[i + 1] ?? end;
  const length = stop - start;
  const within = length > 0 ? Math.min(1, Math.max(0, (probe - start) / length)) : 0;
  return (i + within) * SECTION_SECONDS;
}

/** Reduced motion: the timecode only shows the start of the current section. */
export function sectionStartSeconds(tops: readonly number[], probe: number): number {
  return tops.length === 0 ? 0 : sectionIndexAt(tops, probe) * SECTION_SECONDS;
}
