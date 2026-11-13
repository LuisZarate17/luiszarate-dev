/**
 * Who did the work: the hand-curated half of "How it was built" (ADR-008).
 *
 * Every commit is authored by Luis and carries no AI trailer (AGENTS.md, Workflow), so git
 * cannot say which model did what. This file can, and only from the written record: each
 * entry names its source in `docs/BUILD-LOG.md`, `docs/ROADMAP.md`, a plan or the pull
 * request's own description. Where the record names no model, `credits` is empty and the page
 * says so. Nothing here is inferred.
 *
 * The other half, `history.json`, is written by `npm run history:sync`. A unit test fails if a
 * pull request listed here is missing from it.
 */

/**
 * The record credits the three subagents by model. It credits the orchestrator by role, and
 * names its model once ("Opus, orchestrator", for the foundation PR), so a credit says
 * "Orchestrator" and the crew list carries the model.
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
  work: "Build" | "Plan" | "Spec" | "Direction" | "Review";
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
    roles: "Fable spec review, Sonnet slot, four Sonnet implementers in parallel, Fable review",
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
  5: { credits: [] },
  6: { credits: [] },
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
  8: { credits: [] },
  9: { credits: [] },
  10: {
    phase: 5,
    credits: [{ by: "sonnet", work: "Build" }],
    note: "The shared slot the four simulations plug into, built by one Sonnet implementer and landed first.",
    source: "ROADMAP phase 5; SIM-SPEC, build plan",
  },
  11: {
    phase: 5,
    credits: [{ by: "sonnet", work: "Build", count: 4 }],
    note: "Four Sonnet implementers in parallel worktrees, one per simulation, then merged and tested together by the orchestrator. One code review ran on the integrated diff; all nine findings were fixed before merge.",
    source: "PR #11 description; BUILD-LOG, 2026-11-13: Project simulations",
  },
  12: { credits: [] },
  13: {
    phase: 6,
    credits: [{ by: "orchestrator", work: "Plan" }],
    note: "Written by the orchestrator from the design spec and Fable's phase 5 notes, without a new Fable pass.",
    source: "docs/scroll-staging/PLAN.md; BUILD-LOG, 2026-11-13: Scroll staging",
  },
  14: {
    phase: 5,
    credits: [{ by: "fable", work: "Review" }],
    note: "Fixes from Fable's design review of the four simulations, made from 25 screenshots. The record does not say which model applied them.",
    source: "PR #14 description; BUILD-LOG, 2026-11-13: Project simulations",
  },
  15: {
    phase: 6,
    credits: [{ by: "fable", work: "Build" }],
    note: "Built by Fable: implementation shifted to Fable this week to balance usage.",
    source: "PR #15 description",
  },
  16: {
    phase: 6,
    credits: [{ by: "fable", work: "Build" }],
    note: "The scroll stage: LabQ and Bifrost hold for 75% of a frame and the scroll plays them.",
    source: "BUILD-LOG, 2026-11-13: Scroll staging",
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
  /** What it was delegated, from the build log. */
  did: string;
}

export const crew: CrewMember[] = [
  {
    id: "orchestrator",
    role: "Orchestrator",
    model: "Opus",
    brief: "Plans, writes specs and merges.",
    did: "Named as Opus in the build log's foundation entry. Built the foundation directly, split Fable's design spec into three tickets with disjoint files, wrote the simulation spec from the four project repos, and merged the parallel branches locally to run every test before any of them landed.",
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
    did: "Built the tokens, the scene template and the frame (two of them in parallel worktrees), the 3D hero, the simulation slot, and the four simulations as four implementers at once.",
  },
  {
    id: "haiku",
    role: "ci-fixer",
    model: "Haiku",
    brief: "Mechanical lint, type and test fixes.",
    did: "Set up with the other two subagents in the foundation PR. The build log records no work delegated to it so far.",
  },
];
