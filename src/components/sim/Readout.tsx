export interface ReadoutItem {
  label: string;
  value: string;
}

/**
 * The live readout. Polite, and it announces end states only: callers pass items when a run
 * settles, not every frame.
 */
export function Readout({ items }: { items: ReadoutItem[] }) {
  return (
    <div className="sim-readout" aria-live="polite" aria-atomic="true">
      {items.map((item) => (
        <div className="sim-readout-item" key={item.label}>
          <span className="sim-readout-label font-mono text-meta uppercase">{item.label}</span>
          <span className="sim-readout-value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
