export interface ReadoutItem {
  label: string;
  value: string;
}

/**
 * The live readout. Polite, and it announces end states only: callers pass items when a run
 * settles, not every frame.
 */
export function Readout({
  items,
  hide,
}: {
  items: ReadoutItem[];
  /**
   * For a stage that already shows these numbers itself. Still announced either way:
   * "visually" removes it from the layout; "reserve" keeps its space (transparent) so the
   * page does not shift when the stage later goes live.
   */
  hide?: "visually" | "reserve" | undefined;
}) {
  const hidden =
    hide === "visually" ? " sr-only" : hide === "reserve" ? " sim-readout--reserve" : "";
  return (
    <div className={`sim-readout${hidden}`} aria-live="polite" aria-atomic="true">
      {items.map((item) => (
        <div className="sim-readout-item" key={item.label}>
          <span className="sim-readout-label font-mono text-meta uppercase">{item.label}</span>
          <span className="sim-readout-value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
