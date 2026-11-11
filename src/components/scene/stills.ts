import type { ImageMetadata } from "astro";
import labq from "../../assets/projects/labq/screenshot.png";
import bifrost from "../../assets/projects/bifrost/screenshot.png";
import cougarConnect from "../../assets/projects/cougar-connect/screenshot.png";
import masteryPilot from "../../assets/projects/mastery-pilot/screenshot.png";

export interface Still {
  src: ImageMetadata;
  alt: string;
  caption: string;
  /** CSS object-position, keeps the subject inside the central 3:2 band. */
  position?: string;
}

/**
 * The static still of each scene's simulation slot: the project's real screenshot.
 * Replaced by the simulation itself in a later phase.
 */
export const stills: Record<string, Still> = {
  labq: {
    src: labq,
    alt: "Grafana dashboard for the labqueue-api service during a load test: request rate, error rate, latency percentiles and database query duration, with a booking-conflicts panel that peaks at 2.21 conflicts per second.",
    caption:
      "Grafana during the k6 load test: booking conflicts climb to 2.21 per second, then fall.",
    position: "left top",
  },
  bifrost: {
    src: bifrost,
    alt: "Mimir, Bifrost's chat app. One edit to src/config.rs is marked Applied. A second edit to src/main.rs shows its diff, renaming greet to welcome, with a note that nothing has changed yet and Apply edit and Deny buttons.",
    caption: "Mimir shows the exact diff and waits for Apply or Deny before it writes a file.",
    position: "center top",
  },
  "cougar-connect": {
    src: cougarConnect,
    alt: "Cougar Connect's Search Alumni page with WA typed into the single search box and ten alumni cards below it, each with a name, major, class year and location and a Connect button. The profiles are labelled as mock data.",
    caption: "Alumni search on mock data: one search box matches several fields at once.",
    position: "center top",
  },
  "mastery-pilot": {
    src: masteryPilot,
    alt: "Mastery Pilot's tutor chat. A student working on 2x + 6 = 14 gets one question at a time, and each reply names the curriculum file it drew on, algebra_linear_equations.md. A sessions list sits on the left.",
    caption: "The tutor asks for one step at a time and names the curriculum file it used.",
    position: "center top",
  },
};
