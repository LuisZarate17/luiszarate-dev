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
}

export function SimButton({ children, onClick, pressed, disabled }: ButtonProps) {
  return (
    <button
      type="button"
      className="sim-btn text-control"
      onClick={onClick}
      aria-pressed={pressed}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
