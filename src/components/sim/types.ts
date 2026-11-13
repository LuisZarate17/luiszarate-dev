/** What every simulation exposes through a ref (SIM-SPEC section 1). */
export interface SimHandle {
  /** Plays from the start. */
  play(): void;
  /** Back to the still's state. */
  reset(): void;
  /** Scrubs to 0..1. Scroll staging (phase 6) uses it. */
  setProgress?(progress: number): void;
}
