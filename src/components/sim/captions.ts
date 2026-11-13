/**
 * Project id -> the figcaption of its simulation. A project listed here renders its simulation
 * (see Simulations.astro); a project with no entry keeps its screenshot (stills.ts). Each
 * simulation adds one line under its own marker.
 */
export const simCaptions: Record<string, string> = {
  // bifrost
  bifrost:
    "Mimir shows the exact diff and writes nothing until you apply it; Undo puts the file back byte for byte.",
  // cougar-connect
  "cougar-connect":
    "Drag to compare the 2024 team build with the 2026 solo rebuild. Each row links to its commit.",
  // labq
  labq: "Fifty bookings for one slot, before and after the exclusion constraint. Counts from the k6 run in the repo.",
  // mastery-pilot
  "mastery-pilot":
    "A real session on a local Qwen3-4B, captured unedited: the tutor asks for the next step instead of giving the answer, and names the curriculum file it used.",
};
