export interface WorldColors {
  accent: string;
  muted: string;
  surface: string;
  line: string;
  text: string;
}

/**
 * Reads the scene's colors for a canvas, which cannot use CSS variables. Call it again when
 * the theme changes. Nothing is hard-coded: the values come from the world and the tokens.
 */
export function readWorldColors(el: Element): WorldColors {
  const style = getComputedStyle(el);
  const get = (name: string) => style.getPropertyValue(name).trim();
  return {
    accent: get("--color-accent"),
    muted: get("--color-muted"),
    surface: get("--color-surface"),
    line: get("--color-line"),
    text: get("--color-text"),
  };
}
