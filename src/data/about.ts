/**
 * The copy and the contact details of the last section (`src/components/about/About.astro`).
 * Luis edits this file; nothing here is generated.
 *
 * Two slots are files, not fields, and each renders only when its file exists:
 *  - the photo: `src/assets/about/photo.jpg` (or `.jpeg`, `.png`, `.webp`), cropped to a square
 *    and shown round at 96 px;
 *  - the resume: `public/resume.pdf`, linked as `/resume.pdf`.
 */

export interface AboutLink {
  /** Row label, e.g. "GitHub". */
  label: string;
  href: string;
  /** What the link shows: the address without its scheme. */
  text: string;
}

export interface About {
  /** Three short sentences. Every claim is in the project content files or the build log. */
  bio: [string, string, string];
  /**
   * Shown as selectable text with a copy button. Never a mailto link: Luis wants to keep
   * the address away from address harvesters, and the page writes it as character references
   * for the same reason (`src/lib/about.ts`).
   */
  email: string;
  links: AboutLink[];
}

export const about: About = {
  // Sources: "full-stack engineer" is the positioning in docs/BUILD-LOG.md (Planning). Solo and
  // team come from `credit` and `role` in src/content/projects/*.md: LabQ and Bifrost are solo;
  // Cougar Connect is a 2024 team project for WSU alumni, rebuilt solo in 2026; Mastery Pilot
  // is a WSU team capstone with solo work after it. The last sentence is the rule in AGENTS.md.
  bio: [
    "I'm Luis Zarate, a full-stack engineer.",
    "LabQ and Bifrost are solo projects; Cougar Connect, a network for WSU alumni, and Mastery Pilot, a WSU capstone, began as team builds that I kept working on alone.",
    "The numbers in each scene come from that project's own repository.",
  ],
  email: "lz.zarate.1@gmail.com",
  links: [
    {
      label: "GitHub",
      href: "https://github.com/LuisZarate17",
      text: "github.com/LuisZarate17",
    },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/luiszarate1",
      text: "linkedin.com/in/luiszarate1",
    },
  ],
};
