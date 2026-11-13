# Roadmap

The plan from start to launch, and where the build stands. Updated as phases finish.
Decisions live in [`DECISIONS.md`](../DECISIONS.md); the story of how the work was done lives in
[`BUILD-LOG.md`](BUILD-LOG.md).

Status key: **Done**, **In review** (PR open), **Next**, **Planned**. Last updated 2026-11-13.

## Phases

| #   | Phase               | Status    | Model roles                                                                          | Result                                                                                                                                   |
| --- | ------------------- | --------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | Planning            | Done      | Orchestrator                                                                         | Audience, positioning (full-stack engineer), the four projects, desktop-first with mobile supported                                      |
| 1   | Art direction       | Done      | Fable                                                                                | _Final Cut_, with Meridian's operable cards and Constellation's point field in a 3D hero (ADR-002)                                       |
| 2   | Foundation          | Done      | Orchestrator                                                                         | Astro, TypeScript, React, Tailwind; CI with lint, types, Playwright and Lighthouse; ADRs; agent setup (#1)                               |
| 3   | Design system       | Done      | Fable spec, Sonnet ×3 in parallel worktrees, Fable review                            | Tokens, fonts and color worlds (#2); scene template and page (#3); frame, scene cut and strip (#4)                                       |
| 4   | 3D hero             | Done      | Fable direction and review, Sonnet build                                             | Five dot-lattice plates from the real `h1`, scroll break-apart, 2D and CSS-still fallbacks (#7, ADR-006)                                 |
| 5   | Project simulations | Done      | Fable spec review, Sonnet slot, Sonnet ×4 in parallel worktrees, Fable design review | LabQ 50 → 1 race, Bifrost edit card, Cougar Connect before/after ledger, Mastery Pilot "It asks" (#10, #11)                              |
| 6   | Scroll staging      | Done      | Orchestrator plan, Fable build                                                       | Every scene fits one frame on desktop (#15); LabQ and Bifrost pin with CSS sticky and play on scroll (#16, ADR-007)                      |
| 7   | How it was built    | In review | Fable                                                                                | "How it was built": timeline of the real git history and PRs, a card per PR with the models and CI, crew, ADRs as script notes (ADR-008) |
| 8   | About and contact   | Planned   | Sonnet                                                                               | Small photo, short bio, email, GitHub, LinkedIn, resume link                                                                             |
| 9   | Polish and QA       | Planned   | Haiku and Sonnet fixes, Fable final review                                           | Accessibility audit, real-phone and Safari testing, share image, 404 page                                                                |
| 10  | Launch              | Planned   | Luis and orchestrator                                                                | Domain, README screenshots, resume bullets with real numbers, link on the resume                                                         |

After launch, adding a project is one content file plus its simulation.

## Fable budget

Fable's included usage ends **2026-11-16**. It goes to decisions and reviews, not bulk code. Its budget
for this week was spent after phase 5; later phases are reviewed by the orchestrator, with
Fable's written guidance in each spec. From phase 6, Luis shifted implementation to Fable to
balance usage across models (see #15).

| Window     | Fable work                                                           | Status                  |
| ---------- | -------------------------------------------------------------------- | ----------------------- |
| 2026-11-11 | Art direction (phase 1), design-system spec (phase 3)                | Done                    |
| 2026-11-11 | Design review of the scene template                                  | Done                    |
| 2026-11-12 | 3D hero direction and review (phase 4)                               | Done                    |
| 2026-11-13 | Simulation spec review and design review of all four (phase 5)       | Done                    |
| 2026-11-13 | Implementation: scroll staging (phase 6), How it was built (phase 7) | Done; phase 7 in review |

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
- LabQ: a third run, the deadlock replay (99 deadlocks as a locked ring, then the row-lock fix
  as a queue). Deferred from phase 5.
- Make the Claude Code hooks (`.claude/hooks/`, Prettier on edit) work on Windows (they use
  bash and jq).
- Delete stale remote branches after merge (auto-delete is off).
- Run `npm run history:sync` after each merge that should appear in "How it was built", and add
  the pull request to `src/data/build.ts` when the record names who built it.

## Open decisions for Luis

- **Domain:** `luiszarate.dev` recommended (then `luiszarate.com`, `luiszarate.me`); connect it to
  Vercel once bought.
- **Photo:** which one, before phase 8.
- **Contact:** email and LinkedIn chosen (added in phase 8, email shown as text with a copy
  button); resume PDF still needed.
- **Analytics:** none, or a privacy-friendly option such as Vercel Analytics.
- **Light theme:** tokens exist; the toggle ships after launch (decided 2026-11-11).
