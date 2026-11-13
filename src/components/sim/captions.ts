/**
 * Project id -> the figcaption of its simulation. A project listed here renders its simulation
 * (see Simulations.astro); a project with no entry keeps its screenshot (stills.ts). Each
 * simulation adds one line under its own marker.
 */
export const simCaptions: Record<string, string> = {
  // bifrost
  // cougar-connect
  "cougar-connect":
    "Drag to compare the 2024 team build with the 2026 solo rebuild. Each row links to its commit.",
  // labq
  // mastery-pilot
};
