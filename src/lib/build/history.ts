/**
 * The typed view of `src/data/history.json`, the snapshot `npm run history:sync` writes
 * (scripts/history.mjs, ADR-008). Dates are ISO 8601 in UTC.
 */
import raw from "../../data/history.json";

export interface HistoryCommit {
  /** Short sha. */
  sha: string;
  date: string;
  subject: string;
}

export interface MainCommit extends HistoryCommit {
  /** The pull request this commit landed, or null for a direct commit. */
  pr: number | null;
}

export interface HistoryCheck {
  name: string;
  conclusion: string;
}

export interface HistoryPr {
  number: number;
  title: string;
  branch: string;
  createdAt: string;
  mergedAt: string;
  /** The commit on main it became, when found. */
  mergeSha: string | null;
  url: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  /** The commits on its branch, before the squash. */
  commits: HistoryCommit[];
  /** Check runs on the branch's last commit. */
  checks: HistoryCheck[];
}

export interface History {
  repo: string;
  url: string;
  main: MainCommit[];
  prs: HistoryPr[];
}

export const history: History = raw;
