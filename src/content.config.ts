import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import { worldSchema } from "./lib/contrast";

/**
 * One file per project in src/content/projects/. Adding a project to the site
 * means adding one file here; the scene template renders it.
 */
const projects = defineCollection({
  // The `slug` field is scene copy, not a URL slug. Astro's glob loader would use it as
  // the entry id, so derive the id from the file name instead (it keys `data-world`).
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/projects",
    generateId: ({ entry }) => entry.replace(/\.md$/, ""),
  }),
  schema: z.object({
    title: z.string(),
    /** Scene order on the page, starting at 1. */
    order: z.number().int().positive(),
    /** Solo project, or a team project Luis took over or contributed to. */
    credit: z.enum(["solo", "team"]),
    /** Location text after the scene number, e.g. "INT. POSTGRES 17 — READ COMMITTED". */
    slug: z.string().max(48),
    /** Title lines in display type (spec 1.5): one or two lines of at most 14 characters. */
    headline: z.array(z.string().max(14)).min(1).max(2),
    logline: z.string().max(160),
    /** Opt in to a pinned, scrubbed scene on desktop (spec 4.4). */
    pin: z.boolean().default(false),
    world: worldSchema,
    stack: z.array(z.string()).min(1),
    repo: z.url(),
    live: z.url().optional(),
    /** What Luis did, stated accurately (team projects say so). */
    role: z.string(),
    metrics: z
      .array(
        z.object({
          /** At most 6 glyphs; "→" counts as one. */
          value: z.string().refine((v) => [...v].length <= 6, "Stat values are at most 6 glyphs."),
          label: z.string(),
        }),
      )
      .max(3)
      .default([]),
  }),
});

export const collections = { projects };
