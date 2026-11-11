# luiszarate-dev

[![CI](https://github.com/LuisZarate17/luiszarate-dev/actions/workflows/ci.yml/badge.svg)](https://github.com/LuisZarate17/luiszarate-dev/actions/workflows/ci.yml)
![Astro](https://img.shields.io/badge/Astro-7-BC52EE?style=flat&logo=astro&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Playwright](https://img.shields.io/badge/Tested%20with-Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)

The portfolio site of Luis Zarate, full-stack engineer. It presents his projects as scenes in
a short film: each one with its own color world and a small, runnable simulation of what the
project really does.

**Status:** in production. The foundation is in place; the design system and the scenes are
next.

## Projects it covers

| Project                                                         | What it is                                                        |
| --------------------------------------------------------------- | ----------------------------------------------------------------- |
| [LabsQ](https://github.com/LuisZarate17/labqueue)               | Lab equipment reservation API with two measured database findings |
| [Bifrost](https://github.com/LuisZarate17/bifrost)              | Local-first AI tools for Windows 11, all on one local model       |
| [Cougar Connect](https://github.com/LuisZarate17/CougarConnect) | Alumni networking platform for WSU graduates                      |
| [Mastery Pilot](https://github.com/LuisZarate17/MasteryPilot)   | Self-hosted Socratic AI tutor for school districts                |

## How it is built

- **Astro** with **TypeScript** and **React** islands, styled with **Tailwind CSS**. Pages ship
  as HTML and CSS; JavaScript loads only for the interactive pieces. Why Astro and not
  Next.js: [ADR-001](DECISIONS.md#adr-001-astro-as-the-framework).
- Each project is one typed content file in `src/content/projects/`, so adding a project is
  adding a file.
- Every pull request runs formatting, lint, type checks, a build, Playwright tests at desktop
  and phone sizes, and a Lighthouse budget.
- Work happens one PR per issue, in parallel git worktrees, with an AI orchestrator delegating
  to subagents on different models. The process is recorded as it happens in
  [`docs/BUILD-LOG.md`](docs/BUILD-LOG.md), and the decisions in [`DECISIONS.md`](DECISIONS.md).

## Running it

Requires Node.js 22.

```bash
npm ci
npm run dev
```

| Command                | What it does                                 |
| ---------------------- | -------------------------------------------- |
| `npm run dev`          | Dev server at http://localhost:4321          |
| `npm run build`        | Static build into `dist/`                    |
| `npm run check`        | Astro and TypeScript diagnostics             |
| `npm run lint`         | ESLint                                       |
| `npm run format:check` | Prettier                                     |
| `npm run test:e2e`     | Playwright, desktop and phone (builds first) |
| `npm run lhci`         | Lighthouse budget against `dist/`            |

## License

[MIT](LICENSE)
