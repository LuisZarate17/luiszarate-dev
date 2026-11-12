# Roadmap

The plan from start to launch, and where the build stands. Updated as phases finish.
Decisions live in [`DECISIONS.md`](../DECISIONS.md); the story of how the work was done lives in
[`BUILD-LOG.md`](BUILD-LOG.md).

Status key: **Done**, **In review** (PR open), **Next**, **Planned**. Last updated 2026-11-12.

## Phases

| #   | Phase               | Status  | Model roles                                               | Result                                                                                                                                             |
| --- | ------------------- | ------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | Planning            | Done    | Orchestrator                                              | Audience, positioning (full-stack engineer), the four projects, desktop-first with mobile supported                                                |
| 1   | Art direction       | Done    | Fable                                                     | _Final Cut_, with Meridian's operable cards and Constellation's point field in a 3D hero (ADR-002)                                                 |
| 2   | Foundation          | Done    | Orchestrator                                              | Astro, TypeScript, React, Tailwind; CI with lint, types, Playwright and Lighthouse; ADRs; agent setup (#1)                                         |
| 3   | Design system       | Done    | Fable spec, Sonnet ×3 in parallel worktrees, Fable review | Tokens, fonts and color worlds (#2); scene template and page (#3); frame, scene cut and strip (#4)                                                 |
| 4   | 3D hero             | Next    | Fable direction and review, Sonnet build                  | Point field in real depth, pointer and tilt parallax, scroll break-apart into scene 1; 2D fallback on weak devices; still frame for reduced motion |
| 5   | Project simulations | Planned | Sonnet ×4 in parallel worktrees, Fable reviews one or two | LabQ 50 → 1 race, Bifrost diff card, Cougar Connect search, Mastery Pilot "it asks" transcript                                                     |
| 6   | Scroll staging      | Planned | Sonnet                                                    | GSAP pinning for scenes that opt in, desktop only (spec 4.4)                                                                                       |
| 7   | How it was built    | Planned | Sonnet                                                    | Generated from git history and PRs: worktree lanes, which model did what, ADRs                                                                     |
| 8   | About and contact   | Planned | Sonnet                                                    | Small photo, short bio, email, GitHub, LinkedIn, resume link                                                                                       |
| 9   | Polish and QA       | Planned | Haiku and Sonnet fixes, Fable final review                | Accessibility audit, real-phone and Safari testing, share image, 404 page                                                                          |
| 10  | Launch              | Planned | Luis and orchestrator                                     | Domain, README screenshots, resume bullets with real numbers, link on the resume                                                                   |

After launch, adding a project is one content file plus its simulation.

## Fable budget

Fable's included usage ends **2026-11-16**. It goes to decisions and reviews, not bulk code.

| Window          | Fable work                                                     | Status  |
| --------------- | -------------------------------------------------------------- | ------- |
| 2026-11-11      | Art direction (phase 1), design-system spec (phase 3)          | Done    |
| 2026-11-11      | Design review of the scene template                            | Done    |
| 2026-11-12 – 14 | 3D hero direction and review (phase 4)                         | Next    |
| 2026-11-15 – 16 | Review of the first simulations; written guidance for the rest | Planned |

## Backlog

Small items found along the way, to fold into upcoming PRs.

- Keep the slug line at the same height in every scene, so it doesn't shift on a cut
  (design review; amends spec 5.4).
- Move the duplicated `.frame-bar` base styles from `TopBar` and `SceneStrip` into
  `src/styles/`.
- Move the Bifrost drawer note and the live-link labels from `src/components/scene/notes.ts`
  into the content schema.
- One voice for credit lines (some say "Luis built", some have no subject; loglines say "I").
- Stat labels can run to four lines between 1024 and 1280 px wide (spec allows three).
- Re-check at 1024 × 768 that a scene cut never hides the Details bar behind the bottom bar.
- Add a build-log entry for phase 3.

## Open decisions for Luis

- **Domain:** buy `luiszarate.dev`, or keep `luiszarate-dev.vercel.app` for now.
- **Photo:** which one, before phase 8.
- **Contact:** which email to show publicly, plus LinkedIn URL and resume PDF.
- **Analytics:** none, or a privacy-friendly option such as Vercel Analytics.
- **Light theme:** tokens exist; the toggle ships after launch (decided 2026-11-11).
