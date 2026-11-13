/**
 * Project id -> the figcaption of its simulation. A project listed here renders its simulation
 * (see Simulations.astro); a project with no entry keeps its screenshot (stills.ts). Each
 * simulation adds one line under its own marker.
 */
export const simCaptions: Record<string, string> = {
  // bifrost
  // cougar-connect
  // labq
  labq: "Fifty bookings for one slot, before and after the exclusion constraint. Counts from the k6 run in the repo.",
  // mastery-pilot
};
