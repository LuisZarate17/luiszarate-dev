import { DUR, stepProgress } from "./timing";

/** One commit behind a ledger row: the short hash shown on the stage and the full one linked. */
export interface Commit {
  short: string;
  hash: string;
}

export interface LedgerRow {
  label: string;
  /** The 2024 team build. */
  before: string;
  /** The 2026 solo rebuild. */
  after: string;
  commits: Commit[];
  /** The row flips to its 2026 state once the divider reaches this position (percent). */
  threshold: number;
}

export const REPO_URL = "https://github.com/LuisZarate17/CougarConnect";

/** Source: CougarConnect git log and README (SIM-SPEC section 4). Full hashes from `git log`. */
export const LEDGER: readonly LedgerRow[] = [
  {
    label: "Secrets",
    before: "hardcoded in the repo",
    after: "environment variables",
    commits: [{ short: "dbf0e4a", hash: "dbf0e4a0cb2b27c540e594706f346bd5734cc90b" }],
    threshold: 10,
  },
  {
    label: "Database",
    before: "SQL Server LocalDB (Windows)",
    after: "PostgreSQL on Supabase",
    commits: [{ short: "e3ab6b2", hash: "e3ab6b22797f3aefe4607f4b330b59478edcbbb7" }],
    threshold: 30,
  },
  {
    label: "Tests",
    before: "none",
    after: "32 xUnit tests, CI on every push",
    commits: [
      { short: "8c96b20", hash: "8c96b20641ced6369630ef5268c6fcc13960c53b" },
      { short: "9c579af", hash: "9c579af47c10af961dd0719abe2a3a190738c507" },
    ],
    threshold: 50,
  },
  {
    label: "Runs on",
    before: "localhost",
    after: "Docker on Render, live",
    commits: [
      { short: "0acf504", hash: "0acf504f625fff6442cc1fc389cfd8742fcd49ac" },
      { short: "417f854", hash: "417f85482a2a581782fcb8357de75d4c14ea25bf" },
    ],
    threshold: 70,
  },
  {
    label: "Connections, messaging, notifications",
    before: "first version",
    after: "redesigned",
    commits: [{ short: "c77c121", hash: "c77c121c9e4d3f3294870ecc3881a5df09187da7" }],
    threshold: 90,
  },
];

export const CREDIT =
  "Team project, fall 2024 (Jonah Jellison, Cameron, Luis). Solo rebuild by Luis, 2026.";

export const KEY_STEP = 10;

export function commitUrl(commit: Commit): string {
  return `${REPO_URL}/commit/${commit.hash}`;
}

export function clampPosition(p: number): number {
  if (Number.isNaN(p)) return 0;
  return Math.min(100, Math.max(0, p));
}

/** True when the row shows its 2026 state with the divider at `position`. */
export function isFlipped(row: LedgerRow, position: number): boolean {
  return position >= row.threshold;
}

/** How many rows show their 2026 state. */
export function flippedCount(position: number): number {
  return LEDGER.filter((row) => isFlipped(row, position)).length;
}

/** The slider's `aria-valuetext`. */
export function valueText(position: number): string {
  return `2026 rows shown: ${flippedCount(position)} of ${LEDGER.length}`;
}

/** The new position for a key press, or null when the key does nothing. */
export function stepPosition(position: number, key: string): number | null {
  switch (key) {
    case "ArrowRight":
    case "ArrowUp":
      return clampPosition(position + KEY_STEP);
    case "ArrowLeft":
    case "ArrowDown":
      return clampPosition(position - KEY_STEP);
    case "Home":
      return 0;
    case "End":
      return 100;
    default:
      return null;
  }
}

/** Divider position (percent) for a pointer at `clientX` over a track at `left` with `width`. */
export function positionFromPointer(clientX: number, left: number, width: number): number {
  if (width <= 0) return 0;
  return clampPosition(((clientX - left) / width) * 100);
}

/** Position `elapsed` ms into a move from `from` to `to`, on the cut ease. */
export function tweenPosition(
  from: number,
  to: number,
  elapsed: number,
  duration: number = DUR.cut,
): number {
  return from + (to - from) * stepProgress(elapsed, duration);
}

/** The play sweep: 2024 (0) to 2026 (100) over 700 ms. */
export function sweepPosition(elapsed: number): number {
  return tweenPosition(0, 100, elapsed);
}
