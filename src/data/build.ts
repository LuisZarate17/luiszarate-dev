/**
 * Who did the work: the hand-curated half of "How it was built" (ADR-008).
 *
 * Every commit is authored by Luis and carries no AI trailer (AGENTS.md, Workflow), so git
 * cannot say which model did what. This file can, and only from the written record: each
 * entry names its source in `docs/BUILD-LOG.md`, `docs/ROADMAP.md`, a plan, the pull request's
 * own description, or the orchestrator's session record (the orchestrator ran the work, and
 * supplied what the written log left out during phase 7). Where no source names a model,
 * `credits` is empty and the page says so. Nothing here is inferred.
 *
 * The other half, `history.json`, is written by `npm run history:sync`. A unit test fails if a
 * pull request listed here is missing from it.
 */

/**
 * The three subagents are credited by model. The orchestrator is credited by role: it ran on
 * Claude Opus 5.5 for most of the build and on Claude Sonnet 5.5 for a stretch of phase 5, so a
 * credit says "Orchestrator" and the note or the crew list carries the model.
 */
export type CrewId = "orchestrator" | "fable" | "sonnet" | "haiku";

export const CREW_NAMES: Record<CrewId, string> = {
  orchestrator: "Orchestrator",
  fable: "Fable",
  sonnet: "Sonnet",
  haiku: "Haiku",
};

export interface Credit {
  by: CrewId;
  /** What it did on this pull request, in one word. */
  work:
    "Build" | "Plan" | "Spec" | "Direction" | "Review" | "Docs" | "Edit" | "Integration" | "Fixes";
  /** How many instances worked in parallel, when the record gives a number above one. */
  count?: number;
}

export interface PrRecord {
  /** Roadmap phase, when the record ties the pull request to one. */
  phase?: number;
  credits: Credit[];
  /** One or two sentences from the record. Shown as the card's credit statement. */
  note?: string;
  /** Where the attribution is written down. Absent when the record names no model. */
  source?: string;
}

export interface Phase {
  n: number;
  title: string;
  /** The model roles as the record states them. */
  roles: string;
}

/** Phases that have run (docs/ROADMAP.md, phase table). */
export const phases: Phase[] = [
  { n: 0, title: "Planning", roles: "Orchestrator" },
  { n: 1, title: "Art direction", roles: "Fable" },
  { n: 2, title: "Foundation", roles: "Orchestrator" },
  {
    n: 3,
    title: "Design system",
    roles: "Fable spec, three Sonnet implementers, Fable review",
  },
  { n: 4, title: "3D hero", roles: "Fable direction and review, Sonnet build" },
  {
    n: 5,
    title: "Project simulations",
    roles:
      "Fable spec review, orchestrator slot, four Sonnet implementers in parallel, Fable review",
  },
  { n: 6, title: "Scroll staging", roles: "Orchestrator plan, Fable build" },
  { n: 7, title: "How it was built", roles: "Fable" },
];

/** Merged pull requests, by number. */
export const prRecords: Record<number, PrRecord> = {
  1: {
    phase: 2,
    credits: [{ by: "orchestrator", work: "Build" }],
    note: "Done by the orchestrator directly, without subagents or worktrees: setup is sequential, and parallel work only pays off once there are independent features.",
    source: "BUILD-LOG, 2026-11-11: Foundation PR",
  },
  2: {
    phase: 3,
    credits: [
      { by: "fable", work: "Spec" },
      { by: "sonnet", work: "Build" },
    ],
    note: "Ticket T1 of Fable's design-system spec, built first and alone because the other two tickets depend on it. The Sonnet implementer caught three errors in the spec while building.",
    source: "BUILD-LOG, 2026-11-11: Design system",
  },
  3: {
    phase: 3,
    credits: [
      { by: "sonnet", work: "Build" },
      { by: "fable", work: "Review" },
    ],
    note: "Ticket T3, built by a Sonnet implementer in its own worktree while T2 ran beside it. Fable's design review found seven must-fix problems; all were fixed before merge.",
    source: "BUILD-LOG, 2026-11-11: Design system; PR #3 description",
  },
  4: {
    phase: 3,
    credits: [{ by: "sonnet", work: "Build" }],
    note: "Ticket T2, built by a second Sonnet implementer in a parallel worktree. The orchestrator merged both branches locally and ran every test against the combined page before either merged.",
    source: "BUILD-LOG, 2026-11-11: Design system",
  },
  5: {
    credits: [{ by: "orchestrator", work: "Docs" }],
    note: "Written by the orchestrator directly, on Claude Opus 5.5, with no subagent.",
    source: "orchestrator session record, 2026-11-11..13",
  },
  6: {
    phase: 3,
    credits: [{ by: "orchestrator", work: "Docs" }],
    note: "Written by the orchestrator directly, on Claude Opus 5.5, with no subagent.",
    source: "orchestrator session record, 2026-11-11..13",
  },
  7: {
    phase: 4,
    credits: [
      { by: "fable", work: "Direction" },
      { by: "sonnet", work: "Build" },
      { by: "fable", work: "Review" },
    ],
    note: "Fable specified the hero after a working prototype; a Sonnet implementer built it. Fable's design review changed the fan, the front plate and the phone height, approved by Luis.",
    source: "BUILD-LOG, 2026-11-12: 3D hero; ROADMAP phase 4; PR #7 description",
  },
  8: {
    credits: [{ by: "orchestrator", work: "Build" }],
    note: "Written by the orchestrator directly, on Claude Opus 5.5, with no subagent.",
    source: "orchestrator session record, 2026-11-11..13",
  },
  9: {
    credits: [{ by: "orchestrator", work: "Edit" }],
    note: "Luis generated the workflow files by running /install-github-app locally. The orchestrator, on Claude Opus 5.5, then formatted them and changed the triggers: one review per pull request, docs-only pull requests skipped.",
    source: "orchestrator session record, 2026-11-11..13",
  },
  10: {
    phase: 5,
    credits: [{ by: "orchestrator", work: "Build" }],
    note: "The shared slot the four simulations plug into. Built by the orchestrator directly, with no subagent, while its session ran on Claude Sonnet 5.5: Luis had switched the model to save usage.",
    source: "orchestrator session record, 2026-11-11..13",
  },
  11: {
    phase: 5,
    credits: [
      { by: "sonnet", work: "Build", count: 4 },
      { by: "orchestrator", work: "Integration" },
      { by: "sonnet", work: "Fixes" },
    ],
    note: "Four Sonnet implementers in parallel worktrees, one per simulation. The orchestrator, on Claude Sonnet 5.5 at that point, integrated them and ran one code review on the combined diff; a Sonnet implementer fixed the nine findings before merge.",
    source:
      "PR #11 description; BUILD-LOG, 2026-11-13: Project simulations; orchestrator session record, 2026-11-11..13",
  },
  12: {
    credits: [{ by: "orchestrator", work: "Docs" }],
    note: "The roadmap and build-log update for phases 4 and 5, written by the orchestrator directly, on Claude Opus 5.5.",
    source: "orchestrator session record, 2026-11-11..13",
  },
  13: {
    phase: 6,
    credits: [{ by: "orchestrator", work: "Plan" }],
    note: "Written by the orchestrator, on Claude Opus 5.5, from the design spec and Fable's phase 5 notes, without a new Fable pass.",
    source:
      "docs/scroll-staging/PLAN.md; BUILD-LOG, 2026-11-13: Scroll staging; orchestrator session record, 2026-11-11..13",
  },
  14: {
    phase: 5,
    credits: [
      { by: "fable", work: "Review" },
      { by: "sonnet", work: "Fixes" },
    ],
    note: "Fable reviewed the four simulations from 25 screenshots. A Sonnet implementer applied the fixes; the orchestrator, on Claude Opus 5.5, added one line (the primary outline on Mastery Pilot's Answer button) and verified.",
    source:
      "PR #14 description; BUILD-LOG, 2026-11-13: Project simulations; orchestrator session record, 2026-11-11..13",
  },
  15: {
    phase: 6,
    credits: [{ by: "fable", work: "Build" }],
    note: "Built by Fable, after a first Sonnet attempt stopped at its usage limit with no changes. Implementation shifted to Fable this week to balance usage.",
    source: "PR #15 description; orchestrator session record, 2026-11-11..13",
  },
  16: {
    phase: 6,
    credits: [{ by: "fable", work: "Build" }],
    note: "The scroll stage, by Fable end to end, through the push and the pull request; the orchestrator only dispatched it.",
    source: "BUILD-LOG, 2026-11-13: Scroll staging; orchestrator session record, 2026-11-11..13",
  },
};

export interface CrewMember {
  id: CrewId;
  /** The role's name in the repository (`.claude/agents/`), or "Orchestrator". */
  role: string;
  /** The model, as the record names it. */
  model: string;
  /** What the role is for (AGENTS.md, Workflow). */
  brief: string;
  /** What it was delegated, from the build log and the orchestrator's session record. */
  did: string;
}

export const crew: CrewMember[] = [
  {
    id: "orchestrator",
    role: "Orchestrator",
    model: "Opus 5.5",
    brief: "Plans, writes specs and merges.",
    did: "Ran on Claude Opus 5.5 for most of the build, and on Claude Sonnet 5.5 for the simulation slot and the integration of the four simulations. Built the foundation and the slot directly, split Fable's design spec into three tickets with disjoint files, wrote the simulation spec from the four project repos, and merged the parallel branches locally to run every test before any of them landed.",
  },
  {
    id: "fable",
    role: "design-reviewer",
    model: "Fable",
    brief: "Design and taste: decisions and reviews, not bulk code.",
    did: "Produced the three art-direction concepts, the design-system spec and the hero direction, reviewed the simulation spec before any code, and reviewed the scene template, the hero and the simulations from screenshots. From phase 6 on it also builds: the scroll staging and this section.",
  },
  {
    id: "sonnet",
    role: "implementer",
    model: "Sonnet",
    brief: "Well-specified feature work, one branch or worktree each.",
    did: "Built the tokens, the scene template and the frame (two of them in parallel worktrees), the 3D hero, and the four simulations as four implementers at once; then fixed the findings of the code review and of Fable's design review.",
  },
  {
    id: "haiku",
    role: "ci-fixer",
    model: "Haiku",
    brief: "Mechanical lint, type and test fixes.",
    did: "Set up with the other two subagents in the foundation PR. The build log records no work delegated to it so far.",
  },
];
