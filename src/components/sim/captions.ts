/**
 * Project id -> the figcaption of its simulation. A project listed here renders its simulation
 * (see Simulations.astro); a project with no entry keeps its screenshot (stills.ts). Each
 * simulation adds one line under its own marker.
 */
export const simCaptions: Record<string, string> = {
  // bifrost
  // cougar-connect
  // labq
  // mastery-pilot
  "mastery-pilot":
    "A real session on a local Qwen3-4B, captured unedited: the tutor asks for the next step instead of giving the answer, and names the curriculum file it used.",
};
