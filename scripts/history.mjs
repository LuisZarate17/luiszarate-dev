// Snapshot of the repository's real history for the "How it was built" section (ADR-008).
// Run with `npm run history:sync`, then commit src/data/history.json.
//
// Why a committed file: Vercel builds from a shallow clone, so the build cannot read `git log`,
// and it has no GitHub token for the pull-request list. This script reads both on a developer
// machine and writes one JSON file the page renders from.
//
//  - `main`: every first-parent commit on main (short sha, date, subject, the PR it landed).
//  - `prs`: every merged pull request: title, branch, dates, the commit it became on main, its
//    size, the commits on its branch before the squash, and the check runs on its last commit.
//
// It needs `git` with the full history of main and the `gh` CLI, signed in.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src", "data", "history.json");

const run = (cmd, args) =>
  execFileSync(cmd, args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const tryRun = (cmd, args) => {
  try {
    return run(cmd, args);
  } catch {
    return null;
  }
};
const iso = (date) => new Date(date).toISOString().replace(".000Z", "Z");
const firstLine = (text) => text.split("\n")[0].trim();

// owner/name from the origin remote.
const remote = run("git", ["remote", "get-url", "origin"]).trim();
const repo = remote.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/)?.[1];
if (!repo) throw new Error(`origin is not a GitHub repository: ${remote}`);

// A shallow clone would silently drop history: deepen it first. `--unshallow` can be blocked,
// so fall back to a fixed depth.
if (run("git", ["rev-parse", "--is-shallow-repository"]).trim() === "true") {
  if (tryRun("git", ["fetch", "--unshallow", "origin", "main"]) === null)
    run("git", ["fetch", "--depth=1000", "origin", "main"]);
} else {
  tryRun("git", ["fetch", "origin", "main"]);
}
const ref = tryRun("git", ["rev-parse", "--verify", "--quiet", "origin/main"])
  ? "origin/main"
  : "main";

const SEP = "\x1f";
const mainCommits = run("git", [
  "log",
  "--first-parent",
  "--reverse",
  `--format=%H${SEP}%aI${SEP}%s`,
  ref,
])
  .trim()
  .split("\n")
  .map((line) => {
    const [sha, date, subject] = line.split(SEP);
    return { sha, date: iso(date), subject };
  });
if (run("git", ["rev-parse", "--is-shallow-repository"]).trim() === "true")
  throw new Error("main is still shallow: the history would be incomplete");

const api = (path) => JSON.parse(run("gh", ["api", "--paginate", "--slurp", path])).flat();
const merged = api(`repos/${repo}/pulls?state=closed&per_page=100`)
  .filter((pr) => pr.merged_at)
  .sort((a, b) => a.number - b.number);

/** The commit on main a pull request became: by sha, or by the "(#n)" GitHub writes. */
const landed = (pr) =>
  mainCommits.find((c) => c.sha === pr.merge_commit_sha) ??
  mainCommits.find(
    (c) =>
      c.subject.endsWith(`(#${pr.number})`) ||
      c.subject.startsWith(`Merge pull request #${pr.number} `),
  );

const prs = merged.map((pr) => {
  const detail = JSON.parse(run("gh", ["api", `repos/${repo}/pulls/${pr.number}`]));
  const commits = api(`repos/${repo}/pulls/${pr.number}/commits?per_page=100`).map((c) => ({
    sha: c.sha.slice(0, 7),
    date: iso(c.commit.author.date),
    subject: firstLine(c.commit.message),
  }));
  // One entry per check name: the latest run wins.
  const runs = api(`repos/${repo}/commits/${pr.head.sha}/check-runs?per_page=100`).flatMap(
    (page) => page.check_runs ?? [],
  );
  const latest = new Map();
  for (const check of runs.sort((a, b) => a.id - b.id))
    latest.set(check.name, check.conclusion ?? check.status);
  const checks = [...latest]
    .map(([name, conclusion]) => ({ name, conclusion }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const commit = landed(pr);
  return {
    number: pr.number,
    title: pr.title,
    branch: pr.head.ref,
    createdAt: iso(pr.created_at),
    mergedAt: iso(pr.merged_at),
    mergeSha: commit ? commit.sha.slice(0, 7) : null,
    url: pr.html_url,
    additions: detail.additions,
    deletions: detail.deletions,
    changedFiles: detail.changed_files,
    commits,
    checks,
  };
});

const byMergeSha = new Map(prs.map((pr) => [pr.mergeSha, pr.number]));
const history = {
  repo,
  url: `https://github.com/${repo}`,
  main: mainCommits.map((c) => ({
    sha: c.sha.slice(0, 7),
    date: c.date,
    subject: c.subject,
    pr: byMergeSha.get(c.sha.slice(0, 7)) ?? null,
  })),
  prs,
};

writeFileSync(OUT, JSON.stringify(history, null, 2) + "\n");
run("npx", ["prettier", "--write", OUT]);
console.log(
  `history: ${history.main.length} commits on main, ${prs.length} merged pull requests -> src/data/history.json`,
);
