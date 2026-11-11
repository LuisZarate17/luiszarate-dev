import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

/**
 * One file per project in src/content/projects/. Adding a project to the site
 * means adding one file here; the chapter template renders it.
 */
const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    /** Scene order on the page, starting at 1. */
    order: z.number().int().positive(),
    tagline: z.string(),
    /** The project's color world, as a hex value. */
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    stack: z.array(z.string()).min(1),
    repo: z.url(),
    live: z.url().optional(),
    /** What Luis did, stated accurately (team projects say so). */
    role: z.string(),
    metrics: z
      .array(z.object({ value: z.string(), label: z.string() }))
      .max(4)
      .default([]),
  }),
});

export const collections = { projects };
