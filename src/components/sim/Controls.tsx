import type { ReactNode } from "react";

/** Row of buttons under the stage (`div.sim-controls`). */
export function Controls({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="sim-controls" role="group" aria-label={label}>
      {children}
    </div>
  );
}

interface ButtonProps {
  children: ReactNode;
  onClick: () => void;
  /** Makes it a toggle (`aria-pressed`). Leave undefined for a plain action button. */
  pressed?: boolean;
  disabled?: boolean;
  /**
   * Unavailable for now, but still focusable: `aria-disabled` instead of `disabled`, so a
   * button the visitor just pressed does not drop keyboard focus while the sim is busy.
   * The click is ignored here.
   */
  busy?: boolean;
}

export function SimButton({ children, onClick, pressed, disabled, busy }: ButtonProps) {
  return (
    <button
      type="button"
      className="sim-btn text-control"
      onClick={busy ? undefined : onClick}
      aria-pressed={pressed}
      disabled={disabled}
      aria-disabled={busy || undefined}
    >
      {children}
    </button>
  );
}
