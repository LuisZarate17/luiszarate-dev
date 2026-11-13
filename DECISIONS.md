# Decisions

Architecture decision records, newest last. Each one says what was decided, what else was
considered, and what it costs. A decision is changed by adding a new record that supersedes
it, not by editing the old one.

## ADR-001: Astro as the framework

**Status:** accepted, 2026-11-11

**Context.** The site is mostly content (four project chapters, an about section) with a few
heavy interactive pieces: canvas simulations, a three.js hero and scroll-staged scenes. It
has no accounts, no database and no server-side logic.

**Decision.** Astro with TypeScript, React for interactive islands, Tailwind CSS v4 for
styling.

**Considered.**

- _Next.js._ Better known on job postings, and React throughout. But it is built for
  server-rendered applications, and a static Next.js page still ships the React runtime and a
  router to every visitor. Here that is weight with no feature behind it.
- _Plain Vite + React._ Fine for the interactive parts, but every page would be a client-side
  render, which costs first paint and SEO for a site whose job is to be read fast.

**Consequences.** Pages ship as HTML and CSS; JavaScript loads only for the islands that need
it, and only when they need it (`client:visible`). React still covers the interactive work.
Astro is less familiar to some reviewers, which this record exists to explain.

## ADR-002: Art direction "Final Cut"

**Status:** accepted, 2026-11-11

**Context.** The site has to prove front-end and design-engineering skill, since the projects
it presents are mostly backend, systems and local AI. Three concepts were produced from a
written brief (see `docs/art-direction/`).

**Decision.** Concept A, _Final Cut_: the site as a short film in a widescreen frame, with
letterbox bars, slug lines and hard cuts between per-project color worlds. Each project scene
holds one small simulation of what the project really does. Two borrowings:

- From concept B, _Meridian_: operable interface cards for the projects that are interfaces
  (Bifrost's diff card, Cougar Connect's search).
- From concept C, _Constellation_: a point field in the hero, upgraded to real 3D with
  three.js (depth, pointer and tilt parallax, a scroll-driven break-apart into the first
  scene). It is confined to the hero.

**Considered.** B alone read as a Stripe imitation and was the least cinematic. C alone had the
highest ceiling but the highest cost, the highest phone-GPU risk, and a template that every
future project would struggle to fill.

**Consequences.** Most of the site is CSS, DOM and canvas 2D, which keeps it fast and makes
the chapter template easy to extend. The 3D hero is the one expensive piece; it loads after
first paint, falls back to 2D on weak devices and to a still frame under reduced motion.

## ADR-003: Desktop-first, mobile supported

**Status:** accepted, 2026-11-11

**Decision.** Design for desktop first. Phones are a supported addition: everything must look
right and work by touch, but the cinematic staging (pinned scenes, 3D) is tuned for large
screens and simplifies on small ones.

**Consequences.** CI runs the end-to-end suite at a desktop size and a phone size, so mobile
regressions are caught even though mobile is not the design target.

## ADR-004: Projects as content files

**Status:** accepted, 2026-11-11

**Decision.** Each project is one Markdown file in `src/content/projects/`, validated by a
schema in `src/content.config.ts`. The chapter template renders whatever the collection holds,
in `order`.

**Consequences.** Adding a project means adding one file (plus its simulation, when it has
one). The schema rejects a project with a malformed color, missing links or more than four
headline numbers at build time, so a bad entry fails CI instead of shipping.

## ADR-005: Color worlds and credit live in the content files

**Status:** accepted, 2026-11-11. Amends ADR-004.

**Decision.** Each project file holds its full color world (fill, on-fill, text and tint for
dark and light, optional secondary), a `credit` of `solo` or `team`, and its scene copy
(`slug`, `headline`, `logline`, `pin`). `WorldStyles.astro` generates the CSS from the
collection. The schema computes WCAG contrast and fails the build when a world's text pairs
are under 4.5:1.

**Considered.** Worlds in a CSS file keyed by project id: simpler today, but a new project
would touch two files and lose the build-time contrast check.

**Consequences.** A new project is still one file. A badly chosen color cannot ship. The
light theme's tokens exist but no toggle ships yet; it is a later, additive change.

## ADR-006: Hero: five dot-lattice plates, CSS still, CSS sticky pin, three.js off the critical path

**Status:** accepted, 2026-11-12. Refines ADR-002 (the hero) and amends design-system spec 4.4,
4.5 and 7. Full direction: `docs/hero/HERO-SPEC.md` ("Five plates").

**Context.** ADR-002 asked for a point field in the hero, upgraded to real 3D with three.js,
loaded after first paint. A free-floating particle cloud reads as a template, and the name has
to stay legible, selectable text that is the page's LCP. The hand-off contract also called for
AVIF/WebP stills of the settled field, a GSAP-pinned hero and a 1.5 device-pixel-ratio cap on
phones; building the prototype showed each of those had a better answer.

**Decision.**

- The name is five flat plates stacked in depth, each a full copy of LUIS ZARATE as a lattice
  of small square dots on an opaque card (off-white in front, one project color per plate
  behind). The lattice is sampled from the laid-out `h1`, so plate 0 is registered to it at
  every size. Colors come only from the tokens and world variables, at run time.
- The still is CSS: four dotted copies inside the `h1`, behind its text. It serves reduced
  motion, no-JS, weak devices and any failure.
- The hero pins with CSS `position: sticky` in a wrapper twice the frame tall, under the same
  media query as before. No GSAP in the hero.
- three.js is imported by one file, `render-gl.ts`, with named imports, after `load` and idle,
  and only on the full tier. A 2D canvas renderer covers weak and WebGL-less devices. The
  budget (three.js chunk under 140 KB gzip, hero code under 8 KB, nothing on the critical
  path) is enforced by `npm run check:budget` in CI.
- Tests reach WebGL through `?hero=gl` and `?hero=2d`, which exist only in dev and in builds
  made with `PUBLIC_HERO_TEST_HOOKS=1`; the budget check fails if they ever ship.

**Considered.**

- _Raster stills (AVIF/WebP)._ A `cover` image of the settled field cannot stay registered
  with a fluid `h1`: the page would show two misaligned names, or hide the real one. CSS is
  exact at every size, costs no bytes or requests, and follows the theme.
- _GSAP ScrollTrigger pin._ Works, but adds about 27 KB gzip before the first scroll, a
  pin-spacer and main-thread scrubbing; sticky is compositor-driven and the hero needs no
  other GSAP feature.
- _Raw WebGL2 instead of three.js._ The scene is two draws of one buffer, about 3 KB instead of
  about 127 KB. Rejected because ADR-002 names three.js and it is a resume keyword; the weight
  is kept off the critical path instead.

**Consequences.** First paint is the plain `h1`, so Lighthouse sees text, not a canvas. The
site carries a pinned dependency on three (exact version, re-measured on upgrade). The still
is part of the design and is checked against the live rest pose by `npm run hero:still`.
Timecode and scene tracking treat `main > .hero-pin` as section 0, because a sticky section's
own position moves while it is pinned.

**Amendments (design review, approved by Luis).** The fan is one lattice column per plate (rest
fan 16 px desktop, 12 px phone; at most about 29 px and 22 px with the pointer), so
`--hero-step` is 3 px / 4 px. The front plate is drawn solid (dot = pitch), amending the
"dotted at rest" open question: only the four colored plates stay dotted. On phones the hero is
at most 37.5rem tall, so a tall screen does not leave empty ground above the name. Visibility is
read from the hero's rect every frame rather than from an IntersectionObserver, whose batched
callbacks could leave the field stranded after a quick scroll out and back.

## ADR-007: Scene pinning with CSS sticky, not GSAP

**Status:** accepted, 2026-11-13. Amends design-system spec 4.4. Plan:
`docs/scroll-staging/PLAN.md`.

**Context.** Spec 4.4 pinned scenes with GSAP ScrollTrigger. ADR-006 had already moved the hero
to `position: sticky` in a taller wrapper, so the site would have carried two pinning models,
and about 27 KB gzip of GSAP, for two scenes. Every scene was also taller than one frame, which
the spec's own "content fits `--frame-h`" rule would have refused to pin.

**Decision.**

- A scene with `pin: true` renders inside `div.scene-pin`. Armed (`is-armed`), the wrapper is
  75% of `--frame-h` taller than the scene and the scene is sticky under the top bar. Unarmed,
  which is also the no-JS state, the wrapper is a plain block.
- `src/lib/scroll-stage.ts` arms a wrapper only when the spec's media query matches, the
  scene's measured height is at most `--frame-h` and its drawer is closed. It re-checks on
  resize, media change, drawer toggle, font load and any change of the scene's height.
- While a scene holds, the module reads its rectangle once per scrolled frame and sends
  `sim:progress` (`detail.progress`, 0 to 1) to the scene's `figure.sim`, then `sim:release`
  when the hold ends, the wrapper is disarmed or the drawer opens. The simulation listens
  through `useScrollStage`. An armed scene does not also play by itself on entry.
- LabQ and Bifrost pin. Cougar Connect (a team project, its slider is a direct control) and
  Mastery Pilot (the visitor gives the answers) do not.
- The module is its own chunk, 1 KB gzip, fetched only on a page with a `.scene-pin`.
  `npm run check:budget` caps it at 2 KB and fails if it gains an import.

**Considered.**

- _GSAP ScrollTrigger, as specified._ A pin-spacer, main-thread scrubbing and a `refresh()` to
  remember on every layout change, for an effect sticky gives for free. Cost of leaving it:
  "GSAP" comes off the resume keyword list. three.js stays.
- _The media query in CSS, as the hero has it._ Then the browser collapses the wrapper before
  the script can measure, and the page jumps under the visitor. With the class as the only
  switch, every change goes through one function that keeps the scene where it is: disarming
  mid-hold gives back the scroll already spent, and arming a scene that is already scrolling
  out lands past its hold.
- _Pinning all four scenes._ Two of four keeps a rhythm of hold, read, hold, read, and gives
  the screen time to the two solo projects.

**Consequences.** Timecode and scene strip count `main > .scene-pin` as a section, as they do
`main > .hero-pin`; a wrapper names its scene in `data-scene`. A scene cut scrolls to the
wrapper, because a sticky scene's own rectangle moves while it holds. Bifrost's scrub gained a
second half (Review, then Applied), so the scroll plays the whole edit. Sticky needs every
ancestor of a scene to stay `overflow: visible` or `clip`; a test asserts it. A scene that grows
past one frame at some window size quietly stops pinning there, which is the intended fallback,
and `tests/e2e/scene-fit.spec.ts` guards the two common laptop sizes.

## ADR-008: "How it was built" from a committed history snapshot and a curated credit file

**Status:** accepted, 2026-11-13. Amends the concept's "generated at build time from `git log`"
(`docs/art-direction/CONCEPTS.md`, concept A).

**Context.** The section shows the repository's real history and which model did the work. Two
facts stand in the way of generating it during the build. Vercel builds from a shallow clone
with no GitHub token, so the build can read neither the full `git log` nor the pull requests.
And every commit is authored by Luis, with no AI trailer (AGENTS.md), so no amount of git
history says which model built what.

**Decision.**

- `npm run history:sync` (`scripts/history.mjs`) runs on a developer machine. It reads the
  first-parent log of `main` and, through `gh api`, each merged pull request: title, branch,
  dates, size, the commits on its branch and the check runs on its last commit. It writes
  `src/data/history.json`, which is committed.
- `src/data/build.ts` maps each pull request and phase to the models that did the work. It is
  written by hand, only from `docs/BUILD-LOG.md`, `docs/ROADMAP.md`, the plans, the pull
  request descriptions and the orchestrator's session record (it ran the work), and each entry
  names its source. Where no source names a model, the entry has no credit and the page says
  "Model not recorded".
- The page renders both at build time as static HTML. The script notes are parsed from this
  file. A unit test checks the snapshot's shape and that every pull request in the curated file
  is in it.

**Considered.**

- _Reading git at build time, as the concept says._ Works locally and breaks on Vercel, or
  needs a deep clone and a token in the build for data that changes only when a PR merges.
- _AI trailers on commits (`Co-Authored-By`)._ Would make attribution machine-readable, but the
  repository's rule is that Luis authors every commit, and a trailer names one model where the
  truth is often "Fable specified, Sonnet built, Fable reviewed".
- _Inferring the model from the roadmap's plan._ The plan and what happened differ (phase 6 was
  planned for Sonnet and built by Fable). Only what the record says happened is shown.

**Consequences.** The section is true as of its last sync and says which pull request that was;
it lags `main` until someone runs the script, and a pull request can never appear in the
snapshot it ships in. A new pull request shows up uncredited until the curated file is edited,
which is the safe failure. The curated file is a second place to keep honest, so it stays small
and cites its sources.
