# Portfolio site — art-direction brief

> Historical record: the brief as given to Fable on 2026-11-11. One change since: the site
> is **desktop-first**, with mobile as a supported addition rather than the design target
> (see DECISIONS.md, ADR-003).

## The site

A live personal portfolio for Luis Zarate, linked from his resume. It is itself a
resume project: its job is to be the standout proof of **front-end / design-engineering**
skill, since his other projects are mostly backend, systems and local AI.
Positioning: **full-stack engineer**.

It is a living site: each new resume project gets added later, so the project
presentation must be a repeatable pattern (a "chapter" template), not five one-offs.

## Audience

Recruiters and hiring managers first (they give it ~60 seconds — it must impress
immediately and be easy to scan), technical reviewers second (depth one click/scroll
deeper: stack, decisions, numbers, repo links).

## Feel

- **Clean** structure and typography.
- **Cinematic is the frame**: deliberate pacing, staged scroll, scene-like transitions,
  big type, widescreen composition.
- **Wow is the content inside the frame**: interactive moments that make people stop.
  He likes **stripe.com** (animated gradients, color as personality, still professional)
  and **lusion.co** (immersive WebGL, cinematic). He leans toward the more interactive
  references. Wow moments must earn their place; most of the frame stays quiet.
- **Color**: not hard-committed to dark (he prefers dark but is open). Each project is a
  chapter with its **own color world**, all meshing on a shared base:
  Cougar Connect → crimson/red; Bifrost → frosty (Norse names: Vidar, Mimir, Hugin);
  LabQ and Mastery Pilot → yours to propose.
- A small photo of Luis near the bottom (about/contact), not a centerpiece.
- A **"How it was built"** section documenting the engineering workflow behind the site
  itself: git worktrees for parallel work, an orchestrator model delegating to subagents
  on different models, PRs, CI, ADRs. This should be presented attractively, not as a wall
  of text — it is part of the pitch.

## Hard constraints

- **Mobile is first-class.** Many recruiters open resume links on a phone. Every concept
  must say how its signature moments work at 390px wide, on touch (no hover-only
  interactions), and on a mid-range phone's GPU.
- Respect `prefers-reduced-motion` with a designed fallback, not just "off".
- Performance: fast first paint; heavy effects (WebGL) load progressively and never
  block reading the content.
- Accessible: readable contrast in every color world, keyboard navigable.

## The projects (repos are cloned read-only at /home/user/luiszarate17/<repo>)

Read their READMEs and look at the screenshots — they are the raw material.

1. **LabQ** (`labqueue`) — Lab equipment reservation API, C#/.NET 10, PostgreSQL 17,
   Docker, k6, Grafana. Story: measured database findings. A booking race where 50 of 50
   concurrent bookings for one slot all confirmed → fixed to 1 with a GiST exclusion
   constraint (then a deadlock edge case found and fixed). Unindexed range predicate:
   2.13× throughput, p95 21.78 → 9.91 ms, query 26.9× faster. Live API docs + public
   Grafana dashboard. Screenshots: docs/screenshots/grafana-*.png
2. **Bifrost** (`bifrost`) — Local-first AI tools for Windows 11 in Rust + Tauri + React +
   TypeScript, all on one local model via Ollama. Vidar (screen assistant tray app),
   Mimir (code-aware desktop chat that shows exact diffs before writing, undoable),
   Hugin (terminal coding agent working in a scratch copy). Guards against faked passes,
   resource limits on model-written code, model choice backed by hidden-test benchmarks.
   Screenshots: docs/images/*.png
3. **Cougar Connect** (`CougarConnect`) — WSU alumni networking platform, Blazor Server,
   .NET 8, ASP.NET Identity, Supabase/Postgres, xUnit, deployed on Render with a live demo.
   Started as a 2024 team project; Luis solo in 2026 removed hardcoded secrets, migrated
   to Postgres, added tests + CI, containerized and deployed, and redesigned connections,
   messaging and notifications. Credit must be accurate. Screenshots: docs/screenshots/*.png
4. **Mastery Pilot** (`MasteryPilot`) — Self-hosted Socratic AI tutor for school districts,
   Python 3.13 / Django 5.2, 508 tests. Asks rather than answers, grounded in the district's
   own curriculum with citations, generated + graded quizzes, teacher dashboard; student
   conversations never leave the district's hardware. Screenshots: docs/images/*.png
