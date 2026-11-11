# Build log

Raw notes for the site's "How it was built" section. Each entry records what was decided or
built, which model did the work, and why. Written as the work happens, not reconstructed.

## 2026-11-11: Planning

- Scope: a live portfolio, linked from the resume, for the four resume projects: LabsQ,
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
- Colors: LabsQ amber `#F59E1B`, Bifrost frost `#7FD6EE`, Cougar Connect crimson `#C8102E`,
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
