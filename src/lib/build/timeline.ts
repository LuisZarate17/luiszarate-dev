/**
 * Layout of the "How it was built" timeline. Pure functions over the history snapshot, so the
 * page renders it at build time and unit tests run it without a DOM.
 *
 * The horizontal axis is time, warped so that it stays readable: each merge to main is one
 * column wide, whatever the clock said, and a moment between two merges sits between their
 * columns in proportion. Order is always true; distance is not to scale. Sixteen merges in
 * three days would otherwise put three of them inside one dot.
 */
import type { History, HistoryPr } from "./history";

export interface TimelineDot {
  /** Position in columns, 0 (first commit) to `cols` (last merge). */
  x: number;
  sha: string;
  subject: string;
}

export interface TimelinePr {
  number: number;
  /** 1-based column: the order it merged in. */
  col: number;
  /** 0 is the lane next to main. */
  lane: number;
  /** Where its branch starts, in columns. */
  startX: number;
  /** Commits on the branch, oldest first. */
  dots: TimelineDot[];
}

/** The run of columns merged on one UTC day. */
export interface TimelineDay {
  /** `2026-11-12` */
  date: string;
  from: number;
  to: number;
}

export interface Timeline {
  cols: number;
  lanes: number;
  prs: TimelinePr[];
  /** Commits made straight to main. */
  direct: TimelineDot[];
  days: TimelineDay[];
}

/** Least distance between two commit dots on a lane, and between the last one and the merge. */
export const DOT_GAP = 0.07;
/** Least distance between a merge and the start of the next branch on the same lane. */
export const LANE_GAP = 0.12;

/** Pull requests in the order they merged. */
export function mergeOrder(prs: readonly HistoryPr[]): HistoryPr[] {
  return [...prs].sort((a, b) => Date.parse(a.mergedAt) - Date.parse(b.mergedAt));
}

/**
 * The warp: `knots[0]` (the first commit) is column 0 and `knots[k]` (the k-th merge) is
 * column k. Times outside the range clamp to its ends.
 */
export function warp(knots: readonly number[], time: number): number {
  const last = knots.length - 1;
  if (last < 1 || time <= (knots[0] ?? 0)) return 0;
  for (let k = 1; k <= last; k++) {
    const from = knots[k - 1] ?? 0;
    const to = knots[k] ?? 0;
    if (time <= to) return to > from ? k - 1 + (time - from) / (to - from) : k;
  }
  return last;
}

/**
 * Keeps dots apart on a lane that runs from `floor` to the merge at `limit`: a burst of
 * commits reads as separate marks, `gap` apart where there is room and evenly squeezed where
 * there is not. Order never changes.
 */
export function spread(
  xs: readonly number[],
  floor: number,
  limit: number,
  gap = DOT_GAP,
): number[] {
  const out = [...xs];
  const room = limit - gap - floor;
  const step = out.length > 1 ? Math.max(0, Math.min(gap, room / (out.length - 1))) : gap;
  let ceiling = limit - gap;
  for (let i = out.length - 1; i >= 0; i--) {
    out[i] = Math.min(out[i] ?? 0, ceiling);
    ceiling = (out[i] ?? 0) - step;
  }
  for (let i = 0; i < out.length; i++) out[i] = Math.max(out[i] ?? 0, floor + i * step);
  return out;
}

/** The lowest lane whose last branch had merged by `start`. Mutates `ends`. */
export function takeLane(ends: number[], start: number, end: number): number {
  let lane = ends.findIndex((e) => e <= start);
  if (lane === -1) lane = ends.length;
  ends[lane] = end;
  return lane;
}

export function buildTimeline(history: History): Timeline {
  const ordered = mergeOrder(history.prs);
  const first = history.main[0];
  const origin = first ? Date.parse(first.date) : Date.parse(ordered[0]?.createdAt ?? "");
  const knots = [origin, ...ordered.map((pr) => Date.parse(pr.mergedAt))];
  const cols = ordered.length;

  // Where each branch really ran: from its first commit (or the day it was opened) to its merge.
  const drafts = ordered.map((pr, i) => {
    const col = i + 1;
    const xs = pr.commits.map((c) => warp(knots, Date.parse(c.date)));
    const start = Math.min(warp(knots, Date.parse(pr.createdAt)), ...xs, col);
    return { pr, col, xs, start };
  });

  // Lanes go to branches in the order they started, as a git graph does. Two branches share a
  // lane only when the first had merged before the second began.
  const ends: number[] = [];
  const lanes = new Map<number, { lane: number; floor: number }>();
  for (const draft of [...drafts].sort((a, b) => a.start - b.start || a.col - b.col)) {
    const before = [...ends];
    const lane = takeLane(ends, draft.start, draft.col);
    const previous = before[lane];
    lanes.set(draft.pr.number, {
      lane,
      floor: previous === undefined ? 0 : previous + LANE_GAP,
    });
  }

  const prs = drafts.map(({ pr, col, xs, start }) => {
    const { lane = 0, floor = 0 } = lanes.get(pr.number) ?? {};
    const placed = spread(xs, floor, col);
    const dots = pr.commits.map((c, j) => ({
      x: placed[j] ?? col,
      sha: c.sha,
      subject: c.subject,
    }));
    const startX = Math.min(Math.max(start, floor), placed[0] ?? col, col - DOT_GAP);
    return { number: pr.number, col, lane, startX, dots };
  });

  const direct = history.main
    .filter((c) => c.pr === null)
    .map((c) => ({ x: warp(knots, Date.parse(c.date)), sha: c.sha, subject: c.subject }));

  const days: TimelineDay[] = [];
  ordered.forEach((pr, i) => {
    const date = pr.mergedAt.slice(0, 10);
    const day = days.at(-1);
    if (day?.date === date) day.to = i + 1;
    else days.push({ date, from: i + 1, to: i + 1 });
  });

  return {
    cols,
    lanes: ends.length,
    prs,
    direct,
    days,
  };
}
