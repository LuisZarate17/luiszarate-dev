/**
 * Scene copy that the content schema does not hold yet.
 * TODO: move both maps into src/content.config.ts and the project files
 * (T3 does not own the content files), then delete this module.
 */

/** Extra drawer notes, keyed by project entry id. */
export const notes: Record<string, string> = {
  bifrost:
    "The model comparison run was stopped early; the repo's write-up says what that leaves unproven.",
};

/** Label of the live link when "Live demo" would overstate what it opens. */
export const liveLabels: Record<string, string> = {
  labq: "Live API docs",
  "cougar-connect": "Live demo (login)",
};
