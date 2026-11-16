# Build log

Raw notes for the site's "How it was built" section. Each entry records what was decided or
built, which model did the work, and why. Written as the work happens, not reconstructed.

## 2026-11-11: Planning

- Scope: a live portfolio, linked from the resume, for the four resume projects: LabQ,
  Bifrost, Cougar Connect and Mastery Pilot. Rule: every resume project goes on the site, and
  this site goes on the resume.
- Positioning: full-stack engineer. The site itself is the front-end proof.
- Audience: recruiters and hiring managers first (a 60-second scan), technical reviewers
  second.
- Feel: clean structure, cinematic framing, interactive moments inside the frame. References
  liked: stripe.com and lusion.co.
- Per-project color worlds on a shared base. Dark preferred, not hard-committed.
- Desktop-first; mobile supported (ADR-003). Photo small, near the bottom.

## 2026-11-11: Art direction (Fable)

- The orchestrator wrote `docs/art-direction/BRIEF.md` from the planning conversation and read
  the four project repos.
- Fable, as a subagent, produced three concepts and a live HTML preview: A _Final Cut_,
  B _Meridian_, C _Constellation_ (~157k tokens, ~8 minutes). See `docs/art-direction/`.
- Decision: A as the base, B's operable cards, C's point field in the hero upgraded to 3D
  (ADR-002).
- Colors: LabQ amber `#F59E1B`, Bifrost frost `#7FD6EE`, Cougar Connect crimson `#C8102E`,
  Mastery Pilot indigo-violet `#6C5CE7`.

## 2026-11-11: Foundation PR (Opus, orchestrator)

- Done by the orchestrator directly, without subagents or worktrees: setup is sequential, and
  parallel work only pays off once there are independent features.
- Astro 7 + TypeScript (strictest) + React 19 + Tailwind v4. Projects as a typed content
  collection (ADR-004). Credit lines checked against each repo's README: Cougar Connect and
  Mastery Pilot are team projects and say so.
- Quality gates: Prettier, ESLint, `astro check`, build, Playwright at 1440×900 and Pixel 7,
  Lighthouse budget (performance ≥ 0.9; accessibility, best practices and SEO ≥ 0.95). The
  placeholder page scores 100 in all four.
- Snag: Astro 7's `preview` keeps a lock file, and a stale one from an aborted run made
  Playwright's web server exit early. Fixed with `--ignore-lock`.
- Claude Code setup committed: `AGENTS.md` (project rules, imported by a one-line
  `CLAUDE.md`), three model-pinned subagents in `.claude/agents/`, a permissions allowlist and
  a format-on-edit hook in `.claude/settings.json`.

## 2026-11-11: Design system (Fable spec, three Sonnet implementers, Fable review)

- **Spec (Fable).** `docs/design-system/SPEC.md`, about 1,400 lines. Contrast ratios, font
  sizes and string widths were computed from the real colors and font files, not estimated.
  Luis settled the four open questions: real metrics only, color worlds in the content files
  (ADR-005), light theme after launch, `BUILD` as the strip label.
- **Tickets (orchestrator).** The spec was split into three tickets, each owning a disjoint set
  of files: T1 tokens, fonts and schema; T2 frame, scene cut and strip; T3 scene template and
  page. The orchestrator wrote the scene copy and pulled the missing metrics from the project
  repos (32 xUnit tests counted in Cougar Connect's code; 1,100+ tests and the 76% vs 43%
  benchmark from Bifrost's README).
- **T1 first, alone (#2).** T2 and T3 both depend on the tokens and the schema, so running all
  three at once would have meant conflicts in shared files. The Sonnet implementer caught three
  errors in the spec while building: the font import paths broke the build, a new `slug` field
  silently became every entry's id (breaking the color worlds), and Zod v4 runs a refine even
  after a failed regex.
- **Snag: an edit on GitHub.** The README was edited in the browser to rename "LabsQ" to
  "LabQ". It skipped the local format hook, so the next PR's CI failed on formatting. The fix
  also corrected the name in 61 places, including the content file and the world id.
- **T2 and T3 in parallel (#3, #4).** Two Sonnet implementers worked at the same time in
  separate git worktrees. The branches merged with no conflicts. The orchestrator merged them
  together locally and ran every test against the combined page before either PR merged: 66
  browser tests passed, and Lighthouse scored 100 in all four categories.
- **Design review (Fable).** Screenshots at four widths found seven must-fix problems,
  including crops that hid what the captions described, the hero's two name lines touching
  (a value in Fable's own spec), and a details drawer that only repeated the stack list. All
  were fixed before merge.
- **Process change.** #2 landed as a merge commit, carrying all of its branch commits onto
  `main`. From #3 on, PRs are squash-merged, so each PR is one commit on `main`.

## 2026-11-12: 3D hero, "Five plates" (Fable direction, Sonnet build)

- Fable specified the hero after a working prototype: five registered dot-lattice plates sampled
  from the real `h1`, an off-axis projection (five lines in the vertex shader, the same five in
  TypeScript), and a scroll break-apart by letter and plate that ends on a line along the hero's
  bottom edge. See ADR-006.
- Built as a plain TypeScript island: pure logic in `src/lib/hero/` (unit tested), WebGL and
  2D canvas renderers, CSS still. three.js 0.187.0 pinned; the GL chunk is 127 KB gzip, the hero
  code about 6.6 KB.
- Snag: the pin wrapper moved the hero out of `main > section`, which the timecode and scene
  strip count. Fixed with one shared selector, and the timecode now re-measures when the page
  height changes (the island arms the pin after load).
- Snag: headless Chromium has no hardware GL. Playwright launches with software GL, and a
  build-time flag enables `?hero=gl` / `?hero=2d` for tests only; the budget check fails if it
  ships.
- Snag: the first still painted its plates nearest-first, so the back plate covered the others.
  The DOM order is farthest first.

## 2026-11-13: Project simulations (Fable spec review, Sonnet ×4 in parallel, Fable design review)

- **Spec from the repos (orchestrator).** `docs/simulations/SIM-SPEC.md` takes every value from
  the four project repos: the k6 output of LabQ's race (50 → 1 confirmed, 49 refused, 1,225
  overlapping pairs → 0), Mimir's real edit card and wording, Cougar Connect's commits (the 2024
  side checked against the tree before the 2026 rebuild), and Mastery Pilot's captured tutor
  session, verbatim. Luis chose the Cougar Connect before/after split over a search demo, and
  deferred LabQ's deadlock replay.
- **Fable spec review.** Six must-fixes before any code. Among them: the Cougar split's geometry
  contradicted itself, the Mastery lines were not quite verbatim, Bifrost said `Denied` where
  Mimir says `Declined`, and timings were off-token. Mastery's weakest point became its best
  idea: the visitor gives the student's real wrong answer (`Answer "20"`) instead of pressing
  Next.
- **Shared slot (#10).** One component owns the stage, caption and screenshot fallback. Snag: a
  lookup table of components can't hydrate, because Astro needs a static import for every
  island (`NoMatchingImport`). Each simulation gets one line in `Simulations.astro` instead. A
  test-only fixture page proves the slot and never ships; the budget script checks that.
- **Four in parallel (#11).** Four Sonnet implementers, one worktree each. Two things made it
  conflict-free: a marker per project in the two shared wiring files, and a `PORT` variable so
  four Playwright servers could run at once. All four found the same bug in the budget
  script: it counted an island's lazy `component-url` as an initial load. Merged together
  locally, the four needed one hand-resolved test conflict, and the nested worktrees had to be
  kept out of lint.
- **One review for the phase.** `/code-review high` ran once on the integrated diff instead of
  once per PR, to save usage. Nine findings, all fixed before merge. They included tutor
  replies a screen reader never heard, focus dropping to the page during Replay, an Undo that
  flipped a label instead of running the byte-for-byte logic its test proved, and a budget
  check a `client:load` could slip past.
- **Fable design review.** From 25 screenshots. Top finding: Cougar Connect and Mastery Pilot
  used a color variable that exists nowhere, so the browser silently dropped those styles, and
  Cougar's divider never drew. No test caught it, so a unit test now fails on any undefined
  `var(--…)`. Other fixes: LabQ showed its counters twice, Mastery's first frame looked empty,
  and Bifrost's code font turned `->` into an arrow, on a card whose claim is the exact diff.

## 2026-11-13: Scroll staging (orchestrator plan, Fable build)

- **Plan without a Fable pass.** Fable's weekly budget was spent, so the orchestrator wrote the
  plan from the design spec and Fable's phase 5 notes. Its main call: pin scenes the way the
  hero already pins, with CSS sticky, and drop GSAP (ADR-007). About 27 KB saved; "GSAP" leaves
  the resume keyword list.
- **Who built it.** The plan gave both PRs to a Sonnet implementer. Luis shifted implementation
  to Fable this week to balance usage, so Fable built both (#15's description says so; this
  entry's heading first read "Sonnet fit" and was corrected in phase 7).
- **Fit before pin (#15).** The spec only pins a scene that fits one frame, and none did. A
  layout-only PR capped the stages at 2:1 and tightened the proof column; a test holds every
  scene to one frame at 1440 x 900 and 1280 x 800.
- **Stage.** LabQ and Bifrost hold for 75% of a frame and the scroll plays them: LabQ's fifty
  land, then forty-nine are turned back; Bifrost's diff types in, waits in Review, then
  applies, and Undo works once the scene lets go. The module that does it is 1 KB gzip and
  loads only on a page with a pinned scene.
- **Snag: the page jumped when a pin let go.** Collapsing a wrapper above or under the visitor
  moves everything below it. The media query came out of the CSS, so the script is the only
  switch and corrects the scroll each time; the browser's own scroll anchoring is paused for
  that one frame so the correction is not applied twice.
- **Snag: a sticky scene is a moving target.** While it holds, its rectangle follows the
  scroll, so a strip link to it went nowhere. Cuts, the timecode and the strip all measure the
  wrapper instead.

## 2026-11-13: How it was built (Fable)

- **One PR, design to tests (Fable).** Implementation stayed with Fable. The section is end
  credits crossed with a call sheet (concept A): a timeline of the real history, a card per pull
  request, the crew, and the ADRs as numbered script notes. It is `05 BUILD` in the scene strip.
- **Git cannot say who did the work.** Every commit is authored by Luis, with no AI trailer, by
  design. So the section has two sources (ADR-008): `npm run history:sync` writes the commits,
  pull requests, branch commits and check runs to `src/data/history.json`, and
  `src/data/build.ts` maps each pull request to the models, by hand, from this log, the roadmap
  and the PR descriptions. Five of the first sixteen PRs named no model in any of those, so the
  first version of their cards said "Model not recorded" instead of guessing.
- **The orchestrator filled the gaps from its session record.** It ran the work, so it is a
  primary source. It ran on Claude Opus 5.5 for most of the build, and on Claude Sonnet 5.5
  while it built the simulation slot (#10) itself and integrated the four simulations (#11):
  Luis had switched the model to save usage. It wrote #5, #6, #8, #12 and #13 directly, and
  edited the generated review workflow in #9. Sonnet implementers fixed the code-review findings
  in #11 and applied Fable's design-review fixes in #14. #15 went to Fable after a first Sonnet
  attempt stopped at its usage limit with no changes. An unrecorded pull request still renders
  as "Model not recorded", which is what a new one shows until it is curated.
- **A committed snapshot, not a build step.** The concept wanted the history read at build
  time. Vercel builds from a shallow clone and has no GitHub token, so the snapshot is
  committed and the page says which pull request it runs to. A unit test fails if the curated
  file names a pull request the snapshot lacks.
- **The time axis is warped.** Sixteen merges in three days put three of them inside fifteen
  minutes; to scale, they would be one dot. Each merge is one column wide and everything else
  sits between its neighbours in proportion, so order is true and distance is not, and the
  caption says so. Lanes are branches that were open at the same time; squash merges keep the
  branch commits off `main`, so they come from the pull-request API.
- **No JavaScript needed.** The timeline is HTML and CSS positioned from custom properties; the
  marks are links and the cards are native `details`. A 1 KB module, fetched when the section
  comes near, makes a mark open its card in place instead of cutting to it. On a desktop window
  the timeline sticks under the top bar, so the open card and its mark stay on screen together;
  on phones it is a strip that scrolls sideways.
- **Snag: the record disagreed with itself.** The phase 6 heading above said Sonnet built the
  fit PR; the PR's own description says Fable. The first-hand source won and the heading was
  corrected.
- **Merged as #17.** The snapshot was synced after the merge, so #17 has its own card, credited
  from the orchestrator's session record: Fable end to end, dispatched by the orchestrator.

## 2026-11-14: About and contact (Fable)

- **One PR, design to tests (Fable).** The last scene, `06 CONTACT` in the strip and `SC 06` in
  its slug: three sentences on the base colour, then the address, GitHub and LinkedIn as rows
  with hairlines, the same call-sheet language as the section before it. The heading is
  "Contact", as the design spec names it (6.3).
- **The address is text, not a link (ADR-009).** Luis wants to limit spam, so there is no
  mailto anywhere. The address is selectable (one click or a long press takes all of it) and a
  copy button writes it to the clipboard and says "Copied" in a polite live region. Without
  clipboard access the button selects the address and says so. The button is hidden in the
  HTML and shown by the script, so it never appears where it cannot work. In the page source
  the address is written as character references: readers, selection and copying see plain
  text, the simplest harvesters do not. A speed bump, not a lock.
- **Slots that are files.** The photo and the resume are not ready. Each renders only when its
  file exists (`src/assets/about/photo.*`, `public/resume.pdf`) and the layout is the same
  without them: nothing stands in. A unit test rejects placeholder wording in the section and a
  stand-in file in either slot (wrong type, too small).
- **The bio is a draft.** Three sentences in `src/data/about.ts`, written only from the project
  content files and this log: the positioning, which projects are solo and which began as team
  builds, and where the numbers come from. No dates, employers or degrees, because the
  repository records none. A unit test holds it to three sentences, the four project names and
  the solo and team split in the content files. Luis approves or rewrites it.
- **The last cut, without moving the bars.** The concept closes the bars to black. The spec
  says the bars never move (4.3), and bars closing over the contact details would hide the one
  thing the scene is for. So the scene ends in a band of the letterbox colour that meets the
  bottom bar: at the end of the page the black rises as the visitor scrolls. No script and no
  animation, so reduced motion needs no fallback. The band holds the footer line.
- **Snag: six items in a 320 px strip.** A sixth scene left the current item 84 px on a 320 px
  phone, and "Cougar Connect" with its number needs 116. Under 360 px the current item now
  shows its name alone; a test checks every name stays inside its item.
- **Snag: a live region that started hidden.** The first version hid the empty status with
  `display: none`. A region that appears from nothing is not reliably announced, so it is
  always rendered and only gains its spacing when it has text.
- **Merged as #18.** Fable end to end; the orchestrator (Claude Opus 5.5) dispatched it and
  fixed one layout overflow in Mastery Pilot that only showed in CI, where Linux wraps a line
  the Mac does not.

## 2026-11-14: Polish and QA (Fable)

- **A review before any fix.** AGENTS.md asks for one high-effort code review of each phase's
  integrated diff, with the findings going to Luis first. Fable reviewed everything merged
  since the simulations (#14 to #18) and reported a ranked list; this PR fixes none of it
  except where the audit below found the same thing.
- **axe in the test suite.** `tests/e2e/a11y.spec.ts` runs axe-core (WCAG 2.0 A and AA, 2.1 AA)
  on the home page and the 404 page, at desktop and phone size, with and without reduced
  motion, and once more with the drawers and a pull-request card open. The page is walked top
  to bottom first, so every simulation is hydrated when axe looks. No rule is disabled, and
  the label-in-name rule that axe leaves off is turned on, because Lighthouse reports it.
- **What it found: two things.** In Mastery Pilot the speaker labels of lines not yet spoken
  were dimmed to 35% opacity, which is 1.9:1 on the stage where text needs 4.5:1. They are now
  the muted colour at full strength for both speakers; the tutor's accent arrives with its
  line. And the scene strip's links were named "Scene 1: LabQ" while showing "01 LabQ", so a
  visitor using speech input could not say what they saw (WCAG 2.5.3). The name is now
  "Scene 01 LabQ", which starts with the visible words; the spec's 5.5 is amended.
- **The 404 page is a "scene missing" card.** In a rough cut, a card with those words holds
  the place of footage that is not there. One scene on the base colour, no world: the slug
  `SC 404 · INT. CUTTING ROOM — NO FOOTAGE`, the title, one sentence, one button back to the
  start. Nothing moves. Vercel serves `404.html` at any path, so the strip's links become
  `/#labq` and so on away from the home page, and the counter shows `--`.
- **The share image is the hero, rendered from the real parts.** `npm run share:image` draws
  1200 x 630 in headless Chromium and writes `public/og.png` (23 KB, committed): the bars, the
  hero's slug line, the name with the four project plates fanned behind it, "Full-stack
  engineer". The plate colours are read from the content files, the base colours from the
  tokens and the fonts from the packages the site ships, and the script fails if a font did
  not load or the name does not fit. Committed and not built on Vercel, for the reason in
  ADR-008: the build should not need a browser.
- **Metadata.** Canonical URL, Open Graph and Twitter card tags from `Astro.site`, a static
  `robots.txt` and a one-URL `sitemap.xml`. The 404 page is `noindex` and has no canonical.
  `site` is the Vercel address until the domain is connected; three places follow it
  (`astro.config.mjs`, `public/robots.txt`, `public/sitemap.xml`) and a test compares them.
- **Snag: Lighthouse marked the 404 page down for being a 404 page.** Lighthouse CI audits
  every HTML file in `dist/`, and `noindex` fails its "is crawlable" audit (SEO 0.63). The 404
  page is now held to the same performance, accessibility and best-practices floors, and only
  the home page to the SEO floor.
- **Backlog folded in.** The Bifrost drawer note and the two live-link labels moved from a
  side module into the content schema (`note`, `liveLabel`), so a project is again one file.

## 2026-11-15: How it was built, reframed (Fable)

- **Luis is the subject, the models are tools.** Luis found that the section brought up the
  models too much: every card led with a model badge, there was a crew list, and the page named
  a model about 110 times, which reads as "AI built this". He directed the build, so the page
  now says how he ran it: specs, decision records, CI on every pull request, parallel branches,
  code review. Each card leads with what changed and why, written from the pull request
  descriptions and this log; the crew list became one "Tools" line that names the models once
  and links here. Nothing was dropped from the record: the per-pull-request credits stay in
  `src/data/build.ts` with their sources, and this log keeps the full account (ADR-008,
  amendment). A test fails if the section names a model more than four times outside the script
  notes and the pull requests' own titles and branch names.
