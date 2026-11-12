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
