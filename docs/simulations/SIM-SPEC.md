# Project simulations: spec

Phase 5. This replaces the screenshot in each scene's simulation slot with a small runnable
simulation of what the project really does. It builds on design-system spec 5.5 ("Simulation
slot") and concept A (`docs/art-direction/CONCEPTS.md`). Every value below comes from the
project's own repo, and the **Source** line of each section says where. No value is invented.
If a value isn't in a repo, it doesn't go on the stage.

Decisions settled by Luis: Cougar Connect gets the before/after split, not the search. LabQ
ships two runs; the deadlock replay goes to the backlog.

## 1. Shared contract (all four)

- **Island.** Each simulation is a React component, `src/components/sim/<id>/<Name>.tsx`,
  hydrated with `client:visible`. Pure state and timing logic lives in `src/lib/sim/<id>.ts`
  with Vitest tests. The component only renders.
- **Still first.** The stage is server-rendered with the simulation's designed still
  (`div.sim-still`): DOM or inline SVG, drawn with tokens and world variables, never an image.
  That is the first paint, the no-JS view and the reduced-motion view. Hydration takes it over
  in place, with no layout shift (CLS 0 in the Lighthouse run). The screenshot in `stills.ts`
  stays as the fallback for a project with no simulation.
- **API.** Each component exposes `play()`, `reset()` and `setProgress(p: 0..1)` through a
  ref. Scroll staging (phase 6) needs `setProgress`. In this phase, only the unit tests and
  the controls drive it.
- **Playback.** On desktop a simulation plays once, the first time its stage is at least
  60% visible, and then waits for input. On phones and coarse pointers it does not autoplay:
  it waits for a tap on its first control. It never loops.
- **Controls.** These go in `div.sim-controls`, with buttons from spec 5.6. Mode buttons are
  toggles (`aria-pressed`). Every action works by tap, click, Enter and Space, and the split in
  4 also responds to arrow keys. Minimum hit area is 44 × 44 px on phones.
- **Readout.** `div.sim-readout` with `aria-live="polite"`. Labels use `text-meta` in muted;
  values use Sans 600 16 px, tabular figures, in the accent color. It announces only end
  states, never every frame.
- **Caption.** `figcaption`: one sentence on what the visitor sees, plus the source when it is
  a measurement.
- **Motion.** Staged steps use `--ease-cut`, with only token durations (700 ms travel, 500 ms reveal) and no bounces or overshoot (design spec 4.1). Hard cuts are allowed. Nothing moves outside
  the stage. Under `prefers-reduced-motion`, a simulation shows its end state immediately and
  its controls switch states instantly (see each simulation). Use `src/lib/motion.ts`; a
  live change of the preference applies without reload.
- **Color.** Marks use the world accent (`--world-text`) and `--color-muted`. Surfaces use
  `--color-surface` and `--color-line`. The canvas reads these once per theme with
  `getComputedStyle` on the stage. No hex values in components.
- **Accessibility.** A canvas gets `role="img"` and an `aria-label` that states the current
  end state in words. DOM cards are real text and real buttons. Outcomes never depend on
  color alone (filled vs hollow marks, text labels).
- **Weight.** Each simulation's JS chunk is at most 12 KB gzip, enforced by
  `npm run check:budget`. No new dependencies. Nothing loads before the stage is near the
  viewport.
- **Tests.** For each simulation, Playwright on desktop and Pixel 7 checks that:
  - the still renders with JS disabled
  - a control changes the readout to the documented end state
  - the keyboard alone can reach every state
  - reduced motion shows the end state with no animation
  - the stage size doesn't change on hydration

## 2. LabQ: "Fifty bookings. One slot."

**Source:** `labqueue/README.md` "What was found" and "Evidence" (the k6 output of
`loadtest/race.js`: 50 VUs, one iteration each, same resource, same window
`2028-03-31 15:00–17:00Z`).

**Stage (canvas 2D).** One instrument's two-hour window is drawn as a horizontal slot,
labelled in `text-meta` `15:00 – 17:00`. Fifty request dots start at the left edge, spread
vertically, and travel to the slot together. The slot has a dashed outline that becomes the
constraint line in the "with" run, labelled `reservations_no_overlap`.

| Run                    | What happens                                                                                                                                     | Readout: `CONFIRMED` · `REFUSED 409` · `OVERLAPPING PAIRS` |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Without the constraint | All 50 dots land in a countable 10 × 5 grid inside the slot, filled. The pairs counter cuts from 0 to 1,225 on the landing frame.                | **50 · 0 · 1,225**                                         |
| With the constraint    | One dot lands, filled. 49 are turned back at the dashed line and settle at the left as a 7 × 7 grid of hollow rings, with one label: `49 × 409`. | **1 · 49 · 0**                                             |

- 1,225 is 50 × 49 / 2: every pair of the 50 confirmed bookings overlaps. The README states
  it as "1,225 overlapping pairs → 0".
- **Controls:** two toggles, `Without constraint` and `With constraint`, plus `Replay`. The
  first play runs "without", holds for 1 s, then runs "with". After that the visitor picks.
- **Timing:** travel 700 ms with a seeded per-dot stagger, refusal return 500 ms, both
  `--ease-cut`, no overshoot. Hold 1 s between runs. The same seed gives the same frames, so tests
  can rely on it.
- **Still and reduced motion:** both end states, labelled `Before` and `After`, each with its
  own three counters. Side by side on desktop (two panels of about 306 px); stacked as two
  358 × 126 bands on phones. Dot radius 4 on phones.
- **Caption:** "Fifty bookings for one slot, before and after the exclusion constraint. Counts
  from the k6 run in the repo."
- **aria-label (canvas):** "Without the constraint, 50 of 50 bookings were confirmed for the
  same slot. With it, 1 was confirmed and 49 were refused with 409."

## 3. Bifrost: "Nothing is written until you say so."

**Source:** the Mimir screenshot already used in the scene (`src/assets/projects/bifrost/`),
and `bifrost/apps/mimir/src/ToolCard.tsx` for the card's states and exact wording.

**Stage (DOM card).** This is the Mimir edit card rebuilt in site tokens, not a copy of
Mimir's styling. The user's message sits above it in a chat bubble: "Now rename greet to
welcome in src/main.rs, and where it's called."

- **Header:** pencil icon, `Edit file`, `src/main.rs`, `+2 −2`, and a state chip.
- **Diff** (Mono, with old and new line numbers):

  ```
   1  1   mod config;
   2  2
   3     - fn greet(name: &str) -> String {
      3  + fn welcome(name: &str) -> String {
   4  4       format!("Hello, {name}!")
   5  5   }
   6  6
   7  7   fn main() {
   8     -     println!("{}", greet("world"));
      8  +     println!("{}", welcome("world"));
   9  9       println!("listening on {}", config::address());
  10 10   }
  ```

  Removed lines are marked with `−` and muted text. Added lines get `+`, the accent color and a
  tinted row. The marks carry the meaning, not color alone.

| State    | Chip       | Note under the diff (Mimir's wording)                                                                   | Buttons              |
| -------- | ---------- | ------------------------------------------------------------------------------------------------------- | -------------------- |
| Review   | `Review`   | "Nothing has been changed yet. Applying writes exactly this — and keeps a backup, so it can be undone." | `Apply edit`, `Deny` |
| Applied  | `Applied`  | (none)                                                                                                  | `Undo`               |
| Undone   | `Undone`   | "Undone — the file is back as it was."                                                                  | `Replay`             |
| Declined | `Declined` | "You declined. Nothing was written, and the model was told."                                            | `Replay`             |

- **Play:** the diff types in one line every 60 ms (hard cuts), then waits on Review. Apply:
  the chip changes, the two `−` rows collapse and the tint drops (500 ms, `--ease-cut`),
  leaving the ten-line file as written. Undo runs the same frames backwards, which is the
  visual for "byte for byte". The stage reserves the Review height, so nothing below moves.
- **Layout:** the card's buttons live in `div.sim-controls`, below the stage. On desktop:
  bubble 40, header 40, 12 rows × 20, a two-line note. On phones: Mono 12 with a single
  line-number gutter. Only line 9 overflows, so the diff gets `overflow-x: auto` and
  `tabindex="0"`. No smaller type, no wrapping.
- **Still and reduced motion:** the Review state, complete, with no typing. The buttons
  switch states instantly.
- **Caption:** "Mimir shows the exact diff and writes nothing until you apply it; Undo puts
  the file back byte for byte."

## 4. Cougar Connect: "Team build. Solo rebuild."

**Source:** `CougarConnect/README.md` "Built by", `DECISIONS.md` §2 and §7, `git log`
(2024 team commits; 2026 solo commits from `dbf0e4a` on 2026-07-22 to `1dfe897` on
2026-07-30), and the test attributes in `CougarConnect.Tests` (32). The 2024 column was checked against the tree at `dbf0e4a~1` (2024-12-05): no test project, no Dockerfile, CI or Render config, and `launchSettings.json` URLs on localhost.

**Stage (DOM, pointer).** Two panels share one frame with a vertical divider the visitor
drags.

- **Left, `2024 · team of 3`:** each row in its 2024 state, in muted text.
- **Right, `2026 · solo`:** the same rows in their 2026 state, in the accent color.

It is one ledger. Each row flips from 2024 to 2026 by a hard cut, top to bottom, as the
divider passes 10 / 30 / 50 / 70 / 90%. Every row is always two lines (the 2024 value, then
the 2026 value), so the still and the live layout are identical. Only the handle drags
(`touch-action: pan-y`), so the commit links stay clickable. The handle is a
`role="slider"` (`aria-valuemin 0`, `aria-valuemax 100`, `aria-valuetext` "2026 rows shown:
3 of 5"). On phones the divider becomes a horizontal slider under the rows with a 44 px
thumb, and each row stacks as label, 2024 line (muted), 2026 line (accent, with hash).

| Row                                   | 2024                         | 2026                             | Commit               |
| ------------------------------------- | ---------------------------- | -------------------------------- | -------------------- |
| Secrets                               | hardcoded in the repo        | environment variables            | `dbf0e4a`            |
| Database                              | SQL Server LocalDB (Windows) | PostgreSQL on Supabase           | `e3ab6b2`            |
| Tests                                 | none                         | 32 xUnit tests, CI on every push | `8c96b20`, `9c579af` |
| Runs on                               | localhost                    | Docker on Render, live           | `0acf504`, `417f854` |
| Connections, messaging, notifications | first version                | redesigned                       | `c77c121`            |

- **Controls:** the drag handle, plus `2024` and `2026` buttons that move the divider all the
  way over (700 ms, `--ease-cut`). Arrow keys move it 10% at a time, and Home and End jump to
  the ends.
- **Credit line:** always visible inside the stage under the panels: "Team project, fall 2024
  (Jonah Jellison, Cameron, Luis). Solo rebuild by Luis, 2026."
- **Play:** the divider sweeps from 2024 to 2026 once over 700 ms, then hands over to the
  visitor.
- **Still and reduced motion:** the divider at 2026. Both lines of every row stay visible.
  The buttons jump instantly.
- **Caption:** "Drag to compare the 2024 team build with the 2026 solo rebuild. Each row links
  to its commit." Commit hashes are links to the GitHub commit, opening in the same tab.

## 5. Mastery Pilot: "It asks."

**Source:** `MasteryPilot/docs/images/tutor-chat.png` (real Qwen3-4B output, captured
2026-08-14, per the README) and the student turns in
`code/llmsite/tutor/management/commands/_tutor_harness.py`.

**Stage (DOM).** Screenplay dialogue rows: a 64 px speaker column (`STUDENT` / `TUTOR` in
`text-meta`) and lines in `text-small`. On phones the speaker label sits above each line. The
full height is reserved from first paint, and unrevealed lines are `visibility: hidden`.
Where the real reply ended "This is covered in algebra_linear_equations.md.", that closing
sentence is shown as a citation chip in Mono `text-meta`, on its own line on phones.

| #   | Speaker | Line (verbatim; the closing citation sentence is shown as the chip)                                  | Chip |
| --- | ------- | ---------------------------------------------------------------------------------------------------- | ---- |
| 1   | Student | I need help solving 2x + 6 = 14 for x.                                                               |      |
| 2   | Tutor   | What is the first step you would take to solve the equation 2x + 6 = 14?                             |      |
| 3   | Student | 20                                                                                                   |      |
| 4   | Tutor   | Subtract 6 from both sides to isolate the term with the variable. What does that give you?           | yes  |
| 5   | Student | Oh, 8.                                                                                               |      |
| 6   | Tutor   | You are right! Subtracting 6 from both sides gives you 2x = 8. What is the next step to solve for x? | yes  |
| 7   | Student | So x is 4?                                                                                           |      |
| 8   | Tutor   | You are right! Dividing both sides by 2 gives you x = 4. What is the next step after finding x = 4?  | yes  |

- The tutor's greeting is left out: it names a demo student and adds nothing.
- **No invented branches.** Concept A had the visitor choose a wrong answer and get a
  different reply. The repo has only this one real run, so the visitor steps through it
  instead, but it gives the wrong "20" itself. The point stays the same: after it, the tutor
  gives the next step as a question, not the answer.
- **Controls:** the visitor speaks the student's real next line. The main button is labelled
  with it: `Answer "20"`, then `Answer "Oh, 8."`, then `Answer "So x is 4?"`. The tutor's
  reply follows after a 500 ms pause. `Show all` and `Restart` sit beside it. Above the
  dialogue, a step meter reads `1 of 4` through `4 of 4`.
- **Play:** on desktop the first exchange (lines 1–2) appears, then it waits for `Next`.
- **Still and reduced motion:** the full transcript, all eight lines. The buttons are hidden
  except `Restart`, which is also hidden under no JS.
- **Caption:** "A real session on a local Qwen3-4B, captured unedited: the tutor asks for the
  next step instead of giving the answer, and names the curriculum file it used."

## 6. Build plan

- **Shared slot PR (`feat/sim-slot`, one Sonnet implementer, lands first):**
  - `src/components/sim/` base pieces: stage, controls, readout, a `useReducedMotion` hook
    over `src/lib/motion.ts`, a world-color reader, and a `usePlayOnView` hook
  - a registry from project id to component plus still
  - `Scene.astro` renders the registry entry and falls back to `stills.ts`
  - the per-sim budget line in `scripts/check-budget.mjs`
  - Playwright helpers in `tests/e2e/sim-helpers.ts`
- **Four parallel PRs (Sonnet ×4, one worktree each).** Each owns only:
  - `src/components/sim/<id>/`
  - `src/lib/sim/<id>.ts`
  - `tests/unit/sim-<id>.test.ts`
  - `tests/e2e/sim-<id>.spec.ts`
  - its one registry line

  The orchestrator merges all four locally and runs the full suite before any of them merges.

- **Review:** each PR gets `/code-review high` plus the automatic Claude review, and one Fable
  design review covers all four (1440, 1024, Pixel 7, reduced motion).
