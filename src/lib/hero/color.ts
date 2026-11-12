export type Rgb = readonly [number, number, number];

/** Parses the CSS color forms the tokens use: `#rgb`, `#rrggbb`, `rgb()` and `rgba()`. */
export function parseColor(input: string): Rgb | null {
  const text = input.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(text)?.[1];
  if (hex) {
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
    const n = Number.parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const fn = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(text);
  if (fn) return [Number(fn[1]), Number(fn[2]), Number(fn[3])];
  return null;
}

export const rgbToCss = ([r, g, b]: Rgb): string => `rgb(${r}, ${g}, ${b})`;
