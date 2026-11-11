# luiszarate-dev

Luis Zarate's portfolio site: a live link on his resume. It presents his resume projects and
is itself a resume project, so the front end is the point. Treat it as a production codebase.

## Standing rules

- **Every resume project goes on this site**, and this site goes on the resume. A project is
  one file in `src/content/projects/` (schema in `src/content.config.ts`).
- **Credit is accurate.** Team projects say so and state what Luis built. Check the project's
  own README before writing a credit line; never round "contributed to" up to "built".
- **Real content only.** Numbers and claims come from the project repos. No placeholder copy
  in shipped pages.
- **Desktop-first, mobile supported** (ADR-003). Every interaction works by touch and
  keyboard; nothing is hover-only. Respect `prefers-reduced-motion` with a designed fallback.
- **Art direction is "Final Cut"** (ADR-002, `docs/art-direction/CONCEPTS.md`). Film grammar
  stays restrained: letterbox bars, slug lines and cuts. No film grain, clapperboards or
  "directed by".
- Decisions with lasting consequences get an ADR in `DECISIONS.md`. Notable work gets an entry
  in `docs/BUILD-LOG.md`; it is the source for the site's "How it was built" section.

## Commands

- `npm run dev`: local dev server
- `npm run format` / `npm run format:check`: Prettier
- `npm run lint`: ESLint
- `npm run check`: Astro and TypeScript diagnostics
- `npm run build`: static build into `dist/`
- `npm run test:e2e`: Playwright, desktop and phone projects (builds first)
- `npm run lhci`: Lighthouse budget against `dist/` (run `npm run build` first)

## Definition of done

A change is done when `format:check`, `lint`, `check`, `build` and `test:e2e` all pass
locally, any new interactive piece has a reduced-motion fallback and a phone-size check, and
the PR description says what changed and how it was verified. CI runs the same gates plus
Lighthouse; a PR merges only when CI is green.

## Workflow

- `main` is protected. One branch and one PR per issue. Branch names: `feat/…`, `fix/…`,
  `chore/…`, `docs/…`.
- Commits: author `Luis Zarate <146589262+LuisZarate17@users.noreply.github.com>` (pass
  `--author`), committer left as configured, no `Co-Authored-By` or session trailers.
- Parallel work uses git worktrees, one per branch. Tasks that run in parallel must own
  disjoint files; shared files (`src/styles/`, `src/layouts/`, `astro.config.mjs`,
  `package.json`) are changed by one branch at a time.
- Model roles: the orchestrator plans, writes specs and merges. Use the subagents in
  `.claude/agents/`: `design-reviewer` (Fable) for design and taste reviews, `implementer`
  (Sonnet) for well-specified feature work, `ci-fixer` (Haiku) for mechanical lint, type and
  test fixes. Fable usage is limited, so spend it on decisions and reviews, not bulk code.

## Code conventions

- TypeScript strict everywhere. React components in `.tsx`, hydrated with the narrowest Astro
  directive that works (prefer `client:visible`).
- Colors and type come from design tokens in `src/styles/`; components never hard-code hex
  values (project colors come from the content files).
- Heavy libraries (three.js, GSAP) are imported only inside the islands that use them.
