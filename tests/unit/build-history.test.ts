import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CREW_NAMES, crew, phases, prRecords } from "../../src/data/build";
import raw from "../../src/data/history.json";
import { githubAnchor, parseAdrs } from "../../src/lib/build/adrs";
import { history } from "../../src/lib/build/history";
import {
  DOT_GAP,
  buildTimeline,
  mergeOrder,
  spread,
  takeLane,
  warp,
} from "../../src/lib/build/timeline";
import { frameShift } from "../../src/lib/build-timeline";

const SHA = /^[0-9a-f]{7}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const keys = (value: object) => Object.keys(value).sort();

describe("history.json (written by npm run history:sync)", () => {
  it("has the top-level shape", () => {
    expect(keys(raw)).toEqual(["main", "prs", "repo", "url"]);
    expect(raw.repo).toMatch(/^[\w.-]+\/[\w.-]+$/);
    expect(raw.url).toBe(`https://github.com/${raw.repo}`);
    expect(raw.main.length).toBeGreaterThan(0);
    expect(raw.prs.length).toBeGreaterThan(0);
  });

  it("lists main oldest first, each commit with a short sha, a UTC date and a subject", () => {
    for (const commit of raw.main) {
      expect(keys(commit)).toEqual(["date", "pr", "sha", "subject"]);
      expect(commit.sha).toMatch(SHA);
      expect(commit.date).toMatch(ISO);
      expect(commit.subject.length).toBeGreaterThan(0);
      expect(commit.pr === null || Number.isInteger(commit.pr)).toBe(true);
    }
    expect(new Set(raw.main.map((c) => c.sha)).size).toBe(raw.main.length);
  });

  it("describes every merged pull request", () => {
    for (const pr of raw.prs) {
      expect(keys(pr)).toEqual([
        "additions",
        "branch",
        "changedFiles",
        "checks",
        "commits",
        "createdAt",
        "deletions",
        "mergeSha",
        "mergedAt",
        "number",
        "title",
        "url",
      ]);
      expect(Number.isInteger(pr.number) && pr.number > 0).toBe(true);
      expect(pr.title.length).toBeGreaterThan(0);
      expect(pr.branch.length).toBeGreaterThan(0);
      expect(pr.createdAt).toMatch(ISO);
      expect(pr.mergedAt).toMatch(ISO);
      expect(Date.parse(pr.mergedAt)).toBeGreaterThanOrEqual(Date.parse(pr.createdAt));
      expect(pr.url).toBe(`${raw.url}/pull/${pr.number}`);
      for (const n of [pr.additions, pr.deletions, pr.changedFiles])
        expect(Number.isInteger(n) && n >= 0).toBe(true);
      expect(pr.commits.length).toBeGreaterThan(0);
      for (const commit of pr.commits) {
        expect(keys(commit)).toEqual(["date", "sha", "subject"]);
        expect(commit.sha).toMatch(SHA);
        expect(commit.date).toMatch(ISO);
        expect(commit.subject).not.toContain("\n");
      }
      for (const check of pr.checks) {
        expect(keys(check)).toEqual(["conclusion", "name"]);
        expect(check.name.length).toBeGreaterThan(0);
        expect(typeof check.conclusion).toBe("string");
      }
    }
    const numbers = raw.prs.map((pr) => pr.number);
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("ties each pull request to its commit on main, both ways", () => {
    const bySha = new Map(raw.main.map((c) => [c.sha, c]));
    for (const pr of raw.prs) {
      expect(pr.mergeSha, `#${pr.number} has no commit on main`).toMatch(SHA);
      expect(bySha.get(pr.mergeSha as string)?.pr).toBe(pr.number);
    }
    const numbers = new Set(raw.prs.map((pr) => pr.number));
    for (const commit of raw.main)
      if (commit.pr !== null) expect(numbers.has(commit.pr)).toBe(true);
  });

  it("holds no author names or addresses", () => {
    expect(JSON.stringify(raw)).not.toMatch(/@[\w-]+\.[a-z]{2,}|"author"|"email"/i);
  });
});

describe("curated credits (src/data/build.ts)", () => {
  const numbers = new Set(history.prs.map((pr) => pr.number));

  it("only names pull requests that are in the history", () => {
    for (const n of Object.keys(prRecords)) expect(numbers.has(Number(n)), `#${n}`).toBe(true);
  });

  it("only names phases and crew that exist", () => {
    const known = new Set(phases.map((p) => p.n));
    for (const [n, record] of Object.entries(prRecords)) {
      if (record.phase !== undefined) expect(known.has(record.phase), `#${n}`).toBe(true);
      for (const credit of record.credits) expect(CREW_NAMES[credit.by]).toBeTruthy();
    }
    expect(crew.map((c) => c.id).sort()).toEqual(Object.keys(CREW_NAMES).sort());
  });

  it("cites a source for every credit, and claims nothing where it has none", () => {
    for (const [n, record] of Object.entries(prRecords)) {
      if (record.credits.length > 0) expect(record.source, `#${n}`).toBeTruthy();
      else expect(record.note ?? record.source, `#${n}`).toBeUndefined();
    }
  });

  it("names only models the repository's own record names", () => {
    const read = (...path: string[]) => readFileSync(join(process.cwd(), ...path), "utf8");
    // The orchestrator and the working subagents are in the build log; AGENTS.md pins all three
    // subagents to their models.
    const record = read("docs", "BUILD-LOG.md") + read("AGENTS.md");
    for (const member of crew) expect(record).toContain(member.model);
  });
});

describe("timeline layout", () => {
  it("warps time so each merge is one column", () => {
    const knots = [0, 100, 110, 1000];
    expect(warp(knots, -5)).toBe(0);
    expect(warp(knots, 0)).toBe(0);
    expect(warp(knots, 50)).toBe(0.5);
    expect(warp(knots, 100)).toBe(1);
    expect(warp(knots, 105)).toBe(1.5);
    expect(warp(knots, 555)).toBe(2.5);
    expect(warp(knots, 5000)).toBe(3);
    expect(warp([7], 9)).toBe(0);
  });

  it("spreads a burst of commits without reordering them", () => {
    const out = spread([1.9, 1.95, 1.99], 0, 2, 0.1);
    expect(out[2]).toBeCloseTo(1.9);
    expect(out[1]).toBeCloseTo(1.8);
    expect(out[0]).toBeCloseTo(1.7);
    // Not enough room above the floor: squeezed evenly, still in order, never past the merge.
    const tight = spread([1.9, 1.95, 1.99, 1.99], 1.8, 2, 0.1);
    for (let i = 1; i < tight.length; i++) expect(tight[i]!).toBeGreaterThanOrEqual(tight[i - 1]!);
    expect(tight[0]).toBeGreaterThanOrEqual(1.8);
    expect(tight.at(-1)!).toBeLessThanOrEqual(1.9 + 1e-9);
    // Dots already apart stay where they are.
    expect(spread([0.2, 0.5], 0, 1, 0.1)).toEqual([0.2, 0.5]);
  });

  it("reuses a lane only after the branch on it has merged", () => {
    const ends: number[] = [];
    expect(takeLane(ends, 0.5, 1)).toBe(0);
    expect(takeLane(ends, 0.8, 2)).toBe(1);
    expect(takeLane(ends, 1, 3)).toBe(0);
    expect(takeLane(ends, 2.5, 4)).toBe(1);
    expect(ends).toEqual([3, 4]);
  });

  const timeline = buildTimeline(history);
  const ordered = mergeOrder(history.prs);

  it("gives every pull request a column in merge order", () => {
    expect(timeline.cols).toBe(history.prs.length);
    expect(timeline.prs.map((pr) => pr.number)).toEqual(ordered.map((pr) => pr.number));
    expect(timeline.prs.map((pr) => pr.col)).toEqual(ordered.map((_, i) => i + 1));
  });

  it("keeps every commit dot on its branch, in order, before the merge", () => {
    for (const pr of timeline.prs) {
      const source = history.prs.find((p) => p.number === pr.number)!;
      expect(pr.dots.map((d) => d.sha)).toEqual(source.commits.map((c) => c.sha));
      expect(pr.startX).toBeGreaterThanOrEqual(0);
      let before = pr.startX;
      for (const dot of pr.dots) {
        expect(dot.x).toBeGreaterThanOrEqual(before - 1e-9);
        expect(dot.x).toBeLessThanOrEqual(pr.col - DOT_GAP + 1e-9);
        before = dot.x;
      }
    }
  });

  it("never draws two branches over each other on one lane", () => {
    for (const a of timeline.prs)
      for (const b of timeline.prs) {
        if (a.number >= b.number || a.lane !== b.lane) continue;
        const [first, second] = a.col < b.col ? [a, b] : [b, a];
        expect(second.startX, `#${a.number} and #${b.number}`).toBeGreaterThan(first.col);
      }
    expect(timeline.lanes).toBe(Math.max(...timeline.prs.map((pr) => pr.lane)) + 1);
  });

  it("groups the columns by the UTC day they merged", () => {
    expect(timeline.days[0]?.from).toBe(1);
    expect(timeline.days.at(-1)?.to).toBe(timeline.cols);
    timeline.days.forEach((day, i) => {
      for (let col = day.from; col <= day.to; col++)
        expect(ordered[col - 1]!.mergedAt.slice(0, 10)).toBe(day.date);
      if (i > 0) expect(day.from).toBe(timeline.days[i - 1]!.to + 1);
    });
  });

  it("places commits made straight to main on the line", () => {
    const direct = history.main.filter((c) => c.pr === null);
    expect(timeline.direct.map((d) => d.sha)).toEqual(direct.map((c) => c.sha));
    for (const dot of timeline.direct) {
      expect(dot.x).toBeGreaterThanOrEqual(0);
      expect(dot.x).toBeLessThanOrEqual(timeline.cols);
    }
  });
});

describe("script notes (DECISIONS.md)", () => {
  const adrs = parseAdrs(readFileSync(join(process.cwd(), "DECISIONS.md"), "utf8"));

  it("reads every record, in order, with its status", () => {
    expect(adrs.length).toBeGreaterThanOrEqual(8);
    adrs.forEach((adr, i) => {
      expect(adr.n).toBe(i + 1);
      expect(adr.id).toBe(`ADR-${String(i + 1).padStart(3, "0")}`);
      expect(adr.title.length).toBeGreaterThan(0);
      expect(adr.status).toBe("accepted");
      expect(adr.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it("builds the anchor GitHub gives the heading", () => {
    // The README links to this one by hand.
    expect(adrs[0]?.anchor).toBe("adr-001-astro-as-the-framework");
    expect(githubAnchor('ADR-002: Art direction "Final Cut"')).toBe(
      "adr-002-art-direction-final-cut",
    );
    expect(githubAnchor("ADR-006: Hero: five plates, three.js off the path")).toBe(
      "adr-006-hero-five-plates-threejs-off-the-path",
    );
  });
});

describe("bringing an opened card into the frame", () => {
  const frame = { top: 100, bottom: 700 };
  it("does not move a card that is already inside", () => {
    expect(frameShift({ top: 120, bottom: 400 }, frame)).toBe(0);
  });
  it("scrolls down just enough to show the bottom", () => {
    expect(frameShift({ top: 500, bottom: 800 }, frame)).toBe(108);
  });
  it("scrolls up to a card above the frame", () => {
    expect(frameShift({ top: 40, bottom: 300 }, frame)).toBe(-68);
  });
  it("aligns the top of a card taller than the frame", () => {
    expect(frameShift({ top: 300, bottom: 1200 }, frame)).toBe(192);
  });
});
