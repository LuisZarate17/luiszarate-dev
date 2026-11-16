/**
 * The hand-curated half of "How it was built" (ADR-008).
 *
 * Two things live here, both written only from the record, and each with its source:
 *
 *  - what a pull request changed and why (`what`, `source`). The page shows this. It comes from
 *    the pull request's own description and `docs/BUILD-LOG.md`.
 *  - which model did the work (`credits`, `creditNote`, `creditSource`). Every commit is authored
 *    by Luis and carries no AI trailer (AGENTS.md, Workflow), so git cannot say; this file can,
 *    from the build log, the roadmap, the plans, the pull request descriptions and the
 *    orchestrator's session record. It is kept for the record and the build log. The page does
 *    not render it per pull request: it names the tools once (ADR-008, amendment).
 *
 * Nothing here is inferred. The other half, `history.json`, is written by
 * `npm run history:sync`. A unit test fails if a pull request listed here is missing from it, or
 * if one in it has no record here.
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
  /** What changed and why, in two or three sentences. Shown on the card; names no model. */
  what: string;
  /** Where `what` is written down. Shown on the card. */
  source: string;
  /** Which models did the work. For the record; the page does not render it. */
  credits: Credit[];
  /** The attribution in a sentence or two, from the record. Not rendered. */
  creditNote?: string;
  /** Where the attribution is written down. Absent when the record names no model. */
  creditSource?: string;
}

export interface Phase {
  n: number;
  title: string;
  /** The model roles as the record states them. For the record; not rendered. */
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
  { n: 8, title: "About and contact", roles: "Fable" },
  { n: 9, title: "Polish and QA", roles: "Fable" },
];

/** Merged pull requests, by number. */
export const prRecords: Record<number, PrRecord> = {
  1: {
    phase: 2,
    what: "The base everything else stands on: Astro with strict TypeScript, the four projects as typed content files with credit lines checked against each repo's README, and CI from the first commit: format, lint, type check, build, Playwright at desktop and phone size and a Lighthouse budget.",
    source: "PR #1 description; BUILD-LOG, 2026-11-11: Foundation PR",
    credits: [{ by: "orchestrator", work: "Build" }],
    creditNote:
      "Done by the orchestrator directly, without subagents or worktrees: setup is sequential, and parallel work only pays off once there are independent features.",
    creditSource: "BUILD-LOG, 2026-11-11: Foundation PR",
  },
  2: {
    phase: 3,
    what: "Tokens, fonts and each project's color world, defined in its content file (ADR-005). The schema computes WCAG contrast and fails the build if a world's text falls under 4.5:1. Merged first and alone, because the next two pull requests depend on it.",
    source: "PR #2 description; BUILD-LOG, 2026-11-11: Design system",
    credits: [
      { by: "fable", work: "Spec" },
      { by: "sonnet", work: "Build" },
    ],
    creditNote:
      "Ticket T1 of Fable's design-system spec, built first and alone because the other two tickets depend on it. The Sonnet implementer caught three errors in the spec while building.",
    creditSource: "BUILD-LOG, 2026-11-11: Design system",
  },
  3: {
    phase: 3,
    what: "The page itself: a static hero and one scene per project, rendered from the content files, each with the project's real screenshot. A design review at four widths found seven must-fix problems, among them crops that hid what the captions described. All were fixed before merge.",
    source: "PR #3 description; BUILD-LOG, 2026-11-11: Design system",
    credits: [
      { by: "sonnet", work: "Build" },
      { by: "fable", work: "Review" },
    ],
    creditNote:
      "Ticket T3, built by a Sonnet implementer in its own worktree while T2 ran beside it. Fable's design review found seven must-fix problems; all were fixed before merge.",
    creditSource: "BUILD-LOG, 2026-11-11: Design system; PR #3 description",
  },
  4: {
    phase: 3,
    what: "The film frame: fixed letterbox bars, a timecode that follows the scroll, the scene strip and the scene-cut wipe, with an instant swap under reduced motion. Built beside #3 in a separate git worktree; the two branches were merged locally and tested together before either landed.",
    source: "PR #4 description; BUILD-LOG, 2026-11-11: Design system",
    credits: [{ by: "sonnet", work: "Build" }],
    creditNote:
      "Ticket T2, built by a second Sonnet implementer in a parallel worktree. The orchestrator merged both branches locally and ran every test against the combined page before either merged.",
    creditSource: "BUILD-LOG, 2026-11-11: Design system",
  },
  5: {
    what: "The roadmap: the phases from planning to launch with their status, a backlog of small items from design review, and the decisions still open for Luis. Docs only.",
    source: "PR #5 description",
    credits: [{ by: "orchestrator", work: "Docs" }],
    creditNote: "Written by the orchestrator directly, on Claude Opus 5.5, with no subagent.",
    creditSource: "orchestrator session record, 2026-11-11..13",
  },
  6: {
    phase: 3,
    what: "The build-log entry for the design-system phase: the spec, the three tickets, what ran in parallel and the snags along the way. Docs only.",
    source: "PR #6 description",
    credits: [{ by: "orchestrator", work: "Docs" }],
    creditNote: "Written by the orchestrator directly, on Claude Opus 5.5, with no subagent.",
    creditSource: "orchestrator session record, 2026-11-11..13",
  },
  7: {
    phase: 4,
    what: "The name as five dot-lattice plates in depth that fan out on load, follow the pointer and break apart on scroll (ADR-006). three.js loads only inside the hero, under a budget check; reduced motion and no JavaScript get a CSS still. A design review halved the fan and made the front plate solid, approved by Luis.",
    source: "PR #7 description; BUILD-LOG, 2026-11-12: 3D hero",
    credits: [
      { by: "fable", work: "Direction" },
      { by: "sonnet", work: "Build" },
      { by: "fable", work: "Review" },
    ],
    creditNote:
      "Fable specified the hero after a working prototype; a Sonnet implementer built it. Fable's design review changed the fan, the front plate and the phone height, approved by Luis.",
    creditSource: "BUILD-LOG, 2026-11-12: 3D hero; ROADMAP phase 4; PR #7 description",
  },
  8: {
    what: "A hook that runs lint and the type check before an agent can finish, and sends any failure back to be fixed. Also adds code review to the definition of done, with the findings going to Luis before any fix.",
    source: "PR #8 description",
    credits: [{ by: "orchestrator", work: "Build" }],
    creditNote: "Written by the orchestrator directly, on Claude Opus 5.5, with no subagent.",
    creditSource: "orchestrator session record, 2026-11-11..13",
  },
  9: {
    what: "The GitHub workflows for AI code review on pull requests. Luis generated them with the GitHub app's installer; the triggers were then changed so each pull request gets one review and docs-only pull requests are skipped.",
    source:
      "orchestrator session record, 2026-11-11..13; the review workflow in .github/workflows/",
    credits: [{ by: "orchestrator", work: "Edit" }],
    creditNote:
      "Luis generated the workflow files by running /install-github-app locally. The orchestrator, on Claude Opus 5.5, then formatted them and changed the triggers: one review per pull request, docs-only pull requests skipped.",
    creditSource: "orchestrator session record, 2026-11-11..13",
  },
  10: {
    phase: 5,
    what: "The shared base for the four simulations: one component owns the stage, the caption and the screenshot fallback, so each simulation plugs in with one line. The budget check caps each simulation at 12 KB gzip and fails if the test-only fixture ships.",
    source: "PR #10 description; BUILD-LOG, 2026-11-13: Project simulations",
    credits: [{ by: "orchestrator", work: "Build" }],
    creditNote:
      "The shared slot the four simulations plug into. Built by the orchestrator directly, with no subagent, while its session ran on Claude Sonnet 5.5: Luis had switched the model to save usage.",
    creditSource: "orchestrator session record, 2026-11-11..13",
  },
  11: {
    phase: 5,
    what: "The four project simulations, in place of the screenshots; every value comes from the project repos. They were built side by side in four git worktrees and merged together. One code review of the combined diff found nine problems, such as tutor replies a screen reader never heard. All were fixed before merge.",
    source: "PR #11 description; BUILD-LOG, 2026-11-13: Project simulations",
    credits: [
      { by: "sonnet", work: "Build", count: 4 },
      { by: "orchestrator", work: "Integration" },
      { by: "sonnet", work: "Fixes" },
    ],
    creditNote:
      "Four Sonnet implementers in parallel worktrees, one per simulation. The orchestrator, on Claude Sonnet 5.5 at that point, integrated them and ran one code review on the combined diff; a Sonnet implementer fixed the nine findings before merge.",
    creditSource:
      "PR #11 description; BUILD-LOG, 2026-11-13: Project simulations; orchestrator session record, 2026-11-11..13",
  },
  12: {
    what: "The roadmap and build-log update for phases 4 and 5: status, backlog and the notes on the simulations. Docs only.",
    source: "PR #12 description",
    credits: [{ by: "orchestrator", work: "Docs" }],
    creditNote:
      "The roadmap and build-log update for phases 4 and 5, written by the orchestrator directly, on Claude Opus 5.5.",
    creditSource: "orchestrator session record, 2026-11-11..13",
  },
  13: {
    phase: 6,
    what: "The plan for scroll staging. Its main call: pin scenes with CSS sticky, the way the hero already pins, and drop GSAP, which saves about 27 KB (ADR-007). Docs only.",
    source: "docs/scroll-staging/PLAN.md; BUILD-LOG, 2026-11-13: Scroll staging",
    credits: [{ by: "orchestrator", work: "Plan" }],
    creditNote:
      "Written by the orchestrator, on Claude Opus 5.5, from the design spec and Fable's phase 5 notes, without a new Fable pass.",
    creditSource:
      "docs/scroll-staging/PLAN.md; BUILD-LOG, 2026-11-13: Scroll staging; orchestrator session record, 2026-11-11..13",
  },
  14: {
    phase: 5,
    what: "Fixes from a design review of the simulations, made from 25 screenshots. The main one: two simulations used a color variable defined nowhere, so the browser silently dropped those styles. No test had caught it, so a unit test now fails on any undefined CSS variable.",
    source: "PR #14 description; BUILD-LOG, 2026-11-13: Project simulations",
    credits: [
      { by: "fable", work: "Review" },
      { by: "sonnet", work: "Fixes" },
    ],
    creditNote:
      "Fable reviewed the four simulations from 25 screenshots. A Sonnet implementer applied the fixes; the orchestrator, on Claude Opus 5.5, added one line (the primary outline on Mastery Pilot's Answer button) and verified.",
    creditSource:
      "PR #14 description; BUILD-LOG, 2026-11-13: Project simulations; orchestrator session record, 2026-11-11..13",
  },
  15: {
    phase: 6,
    what: "Layout only: every scene now fits one frame on desktop, so the bottom bar no longer covers the stat captions. It comes first because a scene is only pinned when it fits. A test holds each scene to one frame at 1440 × 900 and 1280 × 800.",
    source: "PR #15 description; BUILD-LOG, 2026-11-13: Scroll staging",
    credits: [{ by: "fable", work: "Build" }],
    creditNote:
      "Built by Fable, after a first Sonnet attempt stopped at its usage limit with no changes. Implementation shifted to Fable this week to balance usage.",
    creditSource: "PR #15 description; orchestrator session record, 2026-11-11..13",
  },
  16: {
    phase: 6,
    what: "LabQ and Bifrost hold for 75% of a frame while the scroll plays their simulations. Pinning is CSS sticky plus a 1 KB module, loaded only on a page with a pinned scene; no GSAP (ADR-007). It stays off on phones, under reduced motion and without JavaScript.",
    source: "PR #16 description; BUILD-LOG, 2026-11-13: Scroll staging",
    credits: [{ by: "fable", work: "Build" }],
    creditNote:
      "The scroll stage, by Fable end to end, through the push and the pull request; the orchestrator only dispatched it.",
    creditSource:
      "BUILD-LOG, 2026-11-13: Scroll staging; orchestrator session record, 2026-11-11..13",
  },
  17: {
    phase: 7,
    what: "This section: the repository's real history as a timeline, a card per pull request and the decision records. The history is a committed snapshot, because the host builds from a shallow clone with no GitHub token (ADR-008). It reads and works without JavaScript.",
    source: "PR #17 description; BUILD-LOG, 2026-11-13: How it was built",
    credits: [{ by: "fable", work: "Build" }],
    creditNote:
      "Fable, end to end (design, build, tests, self-review, PR); the orchestrator (Claude Opus 5.5) dispatched it and supplied the model credits for earlier PRs from its session record.",
    creditSource: "orchestrator session record",
  },
  18: {
    phase: 8,
    what: "The contact scene. To limit spam the email address is selectable text with a copy button and is never an email link (ADR-009). The photo and the resume render only when their files exist; nothing stands in for them.",
    source: "PR #18 description; BUILD-LOG, 2026-11-14: About and contact",
    credits: [{ by: "fable", work: "Build" }],
    creditNote:
      "Fable, end to end; the orchestrator (Claude Opus 5.5) dispatched it and fixed one CI-only layout overflow in Mastery Pilot.",
    creditSource: "BUILD-LOG, 2026-11-14: About and contact; orchestrator session record",
  },
  19: {
    phase: 9,
    what: "An axe-core accessibility audit in the test suite, which found two violations, both fixed: low-contrast labels in Mastery Pilot, and scene-strip link names that did not match their visible text. Also the 404 page, the share image and the page metadata.",
    source: "PR #19 description; BUILD-LOG, 2026-11-14: Polish and QA",
    credits: [{ by: "fable", work: "Build" }],
    creditNote:
      "Fable, end to end, including the phase 6–8 code review whose findings went to Luis before any fix; the orchestrator (Claude Opus 5.5) dispatched it.",
    creditSource: "PR #19 description; orchestrator session record",
  },
};

/** The crew, for the record. The page names the tools in one line and does not render this. */
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
    did: "Produced the three art-direction concepts, the design-system spec and the hero direction, reviewed the simulation spec before any code, and reviewed the scene template, the hero and the simulations from screenshots. From phase 6 on it also builds: the scroll staging, this section and the contact scene.",
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
