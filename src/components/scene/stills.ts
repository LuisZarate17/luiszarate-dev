import type { ImageMetadata } from "astro";
import labq from "../../assets/projects/labq/screenshot.png";
import bifrost from "../../assets/projects/bifrost/screenshot.png";
import cougarConnect from "../../assets/projects/cougar-connect/screenshot.png";
import masteryPilot from "../../assets/projects/mastery-pilot/screenshot.png";

export interface Still {
  src: ImageMetadata;
  alt: string;
  caption: string;
  /** "light" for a light screenshot on the dark scene: the stage frames it with padding. */
  tone?: "light";
}

/**
 * The static still of each scene's simulation slot: the project's real screenshot.
 * Replaced by the simulation itself in a later phase.
 */
export const stills: Record<string, Still> = {
  labq: {
    src: labq,
    alt: "Grafana dashboard for the labqueue-api service during a load test. The error-rate and database-query-duration panels sit above a wide booking-conflicts panel that rises from zero at 13:07, peaks around 13:10 and falls back to zero by 13:14.",
    caption:
      "Grafana during the k6 load test: booking conflicts rise at 13:07, peak, then fall back to zero.",
  },
  bifrost: {
    src: bifrost,
    alt: "Mimir, Bifrost's chat app. One edit to src/config.rs is marked Applied. A second edit to src/main.rs shows its diff, renaming greet to welcome, with a note that nothing has changed yet and Apply edit and Deny buttons.",
    caption: "Mimir shows the exact diff and waits for Apply or Deny before it writes a file.",
  },
  "cougar-connect": {
    src: cougarConnect,
    alt: "Cougar Connect's Search Alumni page with WA typed into the single search box and ten alumni cards below it, each with a name, major, class year and location and a Connect button. The profiles are labelled as mock data.",
    caption: "Alumni search on mock data: one search box matches several fields at once.",
  },
  "mastery-pilot": {
    src: masteryPilot,
    alt: "Mastery Pilot's tutor chat on a light background. A student working on 2x + 6 = 14 answers 20, then 8, then x is 4. Each tutor reply asks for the next step and names the curriculum file it drew on, algebra_linear_equations.md. A message box with a Send button sits at the bottom.",
    caption: "The tutor asks for one step at a time and names the curriculum file it used.",
    tone: "light",
  },
};
