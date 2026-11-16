# Extending this site

For whoever works on the site next. It says where things go and which habits keep the page
looking like one piece of work. It links to the documents that hold the detail and does not
repeat them:

- [`AGENTS.md`](../AGENTS.md): standing rules, commands, definition of done.
- [`DECISIONS.md`](../DECISIONS.md): the ADRs. Read the one named before changing what it covers.
- [`design-system/SPEC.md`](design-system/SPEC.md): tokens, components, the do / don't list (section 8).
- [`simulations/SIM-SPEC.md`](simulations/SIM-SPEC.md): the simulation contract.
- [`scroll-staging/PLAN.md`](scroll-staging/PLAN.md): pinning.
- [`BUILD-LOG.md`](BUILD-LOG.md) and [`ROADMAP.md`](ROADMAP.md): what was done, and what is open.

## 1. Add a project

A project is one file, `src/content/projects/<id>.md`. The file name is the scene's id, its
anchor and its `data-world`. The schema in `src/content.config.ts` documents and enforces each
field; the build fails with the field's name when one is wrong.

| Field               | What to know                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `order`             | Position on the page. The strip, the counter and the hero's plates follow it                             |
| `credit`            | `solo` or `team`. Drives the badge by the slug                                                           |
| `slug`              | The location after `SC 0N`: `INT.` or `EXT.`, a place, a dash, a condition. At most 48 characters        |
| `headline`          | One or two lines of at most 14 characters. Two short sentences that state the tension, each with a stop  |
| `logline`           | At most 160 characters. What it is and the one thing worth knowing. Aim for three lines at 1440 px       |
| `world`             | Six colors, see below                                                                                    |
| `metrics`           | Zero to three, each a value of at most 6 glyphs and a label. Three reads best. From the repo, or omitted |
| `role`              | The credit line, see section 3                                                                           |
| `live`, `liveLabel` | Only a link that opens something real. Rename the label when "Live demo" would overstate it              |
| `note`              | Optional caveat for the Details drawer. The drawer exists only when there is one                         |
| `pin`               | Leave `false` unless the simulation scrubs (section 5)                                                   |

**The color world** (spec 2.3 to 2.5, ADR-005). Take the hue from the project itself and keep it
well away from the four in use (amber, frost, crimson, violet): a fifth world that sits near
one of them makes two scenes look like one. Every text pair must reach 4.5:1 and the schema
checks it at build time (`src/lib/contrast.ts`): `onFill` on `fill`, `textDark` on `tintDark`
and on the black bar, `textLight` on `tintLight`. `tintDark` is a near-black with a little of
the hue, not a dark version of the fill. If the check fails, change the text color, never the
threshold.

**The still.** Put the project's real screenshot at `src/assets/projects/<id>/screenshot.png`
and add its entry (alt text and caption) to `src/components/scene/stills.ts`. It shows until
the project has a simulation, and stays as the fallback without JavaScript. The alt text
describes what the screenshot shows; the caption says what to notice in it.

**Then:** the hero reads its plates from the content files, so run `npm run hero:still` and
`npm run share:image` and commit what they write; check the strip
at 1024 px and at 320 px with the extra item (it was tight at six); update the bio in
`src/data/about.ts` and its unit test, which names the projects.

## 2. Add a simulation

Read SIM-SPEC first; section 1 is the contract. In short:

1. `src/components/sim/<name>/<Name>Sim.tsx` and its CSS. Compose the shared pieces:
   `SimStage` owns the stage box and its `role`, `Controls` the buttons, `Readout` the live
   values. Expose `play`, `reset` and, for a pinned scene, `setProgress` (`types.ts`). Keep the
   logic in a pure module under `src/lib/sim/` with unit tests.
2. Register it in two places, each under a marker comment with the project id: the import and
   the block in `Simulations.astro`, and the caption in `captions.ts`. A project with a
   caption renders its simulation; one without keeps its still.
3. Colors come from the world through CSS variables (`worldColors.ts` for canvas). A unit test
   fails on a CSS variable that is defined nowhere; it exists because that happened.

Requirements a simulation must meet before it merges:

- **True values only.** Every number, name and line on the stage comes from the project repo,
  and the caption says where ("Counts from the k6 run in the repo").
- **Reduced motion gets a designed state, not a frozen first frame:** the end state, or before
  and after side by side, with every value readable and every control working.
- **Phone:** it works by touch on a 360 px phone, targets are 44 px, nothing depends on hover or
  drag alone (Cougar Connect's handle also has two buttons and arrow keys).
- **Keyboard and screen reader:** controls are real buttons, and what changes is announced
  once, outside the canvas.
- **Budget:** 12 KB gzip per simulation chunk, checked by `npm run check:budget`. No new
  library; three.js belongs to the hero alone.
- **Tests:** a unit file for the logic and an e2e file like `tests/e2e/sim-labq.spec.ts`,
  including the reduced-motion and phone cases. `/sim-probe/<name>` is the test fixture.

A simulation shows the one thing the project does, operated by the visitor. If it needs a
paragraph to explain, it is the wrong simulation.

## 3. Copy and voice

One voice: **Luis, in the first person, in plain past-tense verbs.** "I measured the race", "I
removed hardcoded secrets", "How I run a project". This holds in the hero, the loglines, the
credit lines, the bio and How it was built, including the pull-request summaries in
`src/data/build.ts`.

- "Luis" appears only as a name: the title, the top bar, the footer, alt text, and a roster
  that lists him beside teammates (Cougar Connect's caption). Never as the subject of a
  sentence, and never both "Luis" and "I" in one block.
- **A credit line** opens with what kind of project it is, as a fragment ("Solo project.",
  "Team capstone (WSU CPT_S 421/423)."), then says what I did. On a team project it separates
  what was done during the team build from what was done alone after it, and the verbs are
  specific: "removed", "migrated", "added", "closed". Check the project's README first.
- Headlines are two short sentences. Loglines are one or two. No exclamation marks, no
  adjectives doing a number's job ("fast", "robust", "scalable"), no "passionate".
- Numbers carry their unit and their condition: "2.13× availability throughput after
  indexing", not "2× faster".
- Labels are sentence case; the mono caps are CSS. Film words stop at the slug line and the 404
  card (spec section 8, item 1).

**Never claim:**

- "built" where the record says "contributed to", or a team's work as one person's.
- a number that is not in the project's repo, or a rounder one than the repo gives.
- "Live demo" for a link that opens a sign-in page or API docs (hence `liveLabel`).
- more than the evidence shows: Bifrost's note says its comparison run stopped early. Keep
  caveats like that; they are why the other numbers are believed.
- that the models built the site, or that they did not. The Tools paragraph says who did what
  once; the build log has the detail (ADR-008, amendment).
- dates, employers or degrees that no file in a repo records.

## 4. Design habits that are not in the spec

Noticed while reviewing every section at four sizes. The spec's section 8 is the rule list;
these are the habits behind what is on the page now.

- **Each scene has one loud thing:** the headline. The stats are the second voice and the
  simulation is the proof. Nothing else is set in display type larger than a heading, and a
  new element does not get an accent color to be noticed.
- **The left column says, the right column shows.** Head and credit on the left, simulation
  and stats on the right, in every project scene. The two sections without a world (How it was
  built, Contact) keep the same split: title left, substance right.
- **The left column's parts stay in this order:** slug and badge, name, headline, logline, a
  gap, stack, links, credit, drawer. The gap is the flexible part; the head sits at the top and
  the meta at the bottom, so the slug is at the same height from scene to scene.
- **Spacing is a 4 px grid with few steps:** 8 inside a group, 16 between related lines, 24
  between groups, 32 before the stats. When something looks crowded, remove an element before
  adding space.
- **Measure:** leads at 62 characters, small text at 72 (`--container-measure`, `-wide`). A line that runs the
  full column is a bug.
- **Hairlines, not boxes.** Rows are separated by 1 px lines (stats, drawer, pull requests,
  contact rows). The only boxes are the simulation stage, buttons and the credit badge.
- **Mono caps are for labels of one to four words.** A sentence in mono caps is unreadable;
  write it in the sans.
- **Muted is for what can be skipped** (labels, captions, stack). The credit statement is never
  muted.
- **An empty state is no state.** A missing photo or resume leaves no gap, icon or "coming
  soon" (ADR-009). Apply the same to any optional piece: it renders when its data exists.
- **A scene fits one frame at 1440 × 900 and 1280 × 800** (`tests/e2e/scene-fit.spec.ts`). Copy
  that is too long fails that test; shorten the copy, do not shrink the type.
- **Check 1024 × 768 and 360 px by eye** after any layout change. Those are where labels wrap
  to a fourth line and where the bottom bar covers the last line of a scene.

Avoid: a second accent in a scene, cards with shadows or large radii, icons as decoration,
centered body text, fade-ins, count-up numbers, a "skills" grid, logos of tools, a progress
bar, and anything that moves without the visitor causing it (the hero has a Pause button for
that reason).

## 5. Pinning

ADR-007 and the plan. The rules that matter when adding to it:

- Pin a scene only when its simulation has something to scrub: `pin: true` and a
  `setProgress`. A pin with nothing to play is dead scroll.
- Pinning is CSS `position: sticky`, armed by `src/lib/scroll-stage.ts`. No GSAP, no scroll
  library, no scroll snapping, and no `overflow` on any ancestor of a scene (it breaks sticky
  in Safari; a test asserts it).
- It arms only at 1024 px wide and up, 760 px tall and up, with a fine pointer, without reduced
  motion, and only when the scene fits the frame. Opening the Details drawer releases it.
  Everything a pinned scene shows must also be reachable unpinned, with the buttons.
- The hold is 75% of a frame. Do not lengthen it, and do not pin two neighbours' worth of
  extra scenes: two pinned scenes in a row is already the limit of patience.
- The timecode, strip and counter count wrappers (`SECTION_SELECTOR` in `src/lib/timecode.ts`).
  A new wrapper type must be added there.

## 6. Tests and CI

The gates and the definition of done are in `AGENTS.md`. What to add with a change:

- **Logic** goes in `src/lib/` as pure functions with a Vitest file. Components stay thin.
- **Behaviour** gets a Playwright test that runs in both projects (desktop 1440 × 900 and
  Pixel 7), plus a reduced-motion case when anything moves.
- **Copy rules are tests too:** the bio's unit test, the model-name count in
  `tests/e2e/built.spec.ts`, the placeholder check in the Contact section. When a rule in
  section 3 matters, write the test that holds it.
- `tests/e2e/a11y.spec.ts` runs axe with no rule disabled. Fix the page, never the rule list.
- Budgets: `npm run check:budget` after a build, and `npm run lhci`. A budget is raised only
  with an ADR.
- After a merge that should appear in How it was built: `npm run history:sync`, then add the
  pull request to `src/data/build.ts` (`what` in the first person, from the PR description;
  `credits` from the record). A unit test fails until both halves agree.
- Still to do by hand, because CI cannot: a real iPhone and Safari on a Mac (sticky pinning,
  the bars with the browser's own toolbars, the copy button).

## 7. Launch checklist

1. **Domain.** Buy it (roadmap: `luiszarate.dev`), add it to the Vercel project and make it
   the primary domain so the `vercel.app` address redirects.
2. **`site`.** Change it in `astro.config.mjs`, and the same origin in `public/robots.txt` and
   `public/sitemap.xml`. `tests/e2e/meta.spec.ts` compares the three. The canonical URL and the
   `og:url` and `og:image` tags follow `site`; check them in the built `dist/index.html`.
3. **Share card.** After the deploy, paste the URL into LinkedIn's Post Inspector and one
   chat app. Run `npm run share:image` again only if the hero or a world changed.
4. **Photo.** `src/assets/about/photo.jpg` (or `.png`, `.webp`): square, at least 192 px, a
   plain background. It appears round at 96 px beside the bio. Look at Contact at 1440 and on
   a phone afterwards.
5. **Resume.** `public/resume.pdf`. Its row appears in Contact. The resume's portfolio link
   and its numbers should match the scenes exactly.
6. **Bio.** Approve or rewrite the three sentences in `src/data/about.ts` (the test holds it
   to three, and to the project names).
7. **History.** `npm run history:sync`, add the last pull requests to `src/data/build.ts`,
   commit.
8. **Real devices.** The hand checks in section 6.
9. **Branches.** Delete merged remote branches (auto-delete is off) and remove stale
   worktrees with `git worktree prune`.
10. **README.** Screenshots and the live link; then the link goes on the resume (roadmap
    phase 10).
