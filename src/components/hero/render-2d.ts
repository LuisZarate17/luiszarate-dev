/**
 * The lite renderer: the same picture and motion as the WebGL one, from the same
 * `projectPoint`, drawn with `fillRect`. Back plate first; per plate, the cards, then the dots.
 */
import { rgbToCss } from "../../lib/hero/color";
import type { Field, Palette, Renderer } from "../../lib/hero/project";
import { projectPoint } from "../../lib/hero/project";

export function create2dRenderer(canvas: HTMLCanvasElement, palette: Palette): Renderer {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  let dpr = 1;
  let css = { bg: rgbToCss(palette.bg), plates: palette.plates.map(rgbToCss) };
  const out = [0, 0, 0, 0];

  return {
    setField(f, ratio) {
      dpr = ratio;
      canvas.width = Math.round(f.W * ratio);
      canvas.height = Math.round(f.H * ratio);
    },
    setPalette(next: Palette) {
      css = { bg: rgbToCss(next.bg), plates: next.plates.map(rgbToCss) };
    },
    draw(f: Field, eye, p) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, f.W, f.H);
      for (let k = f.plates - 1; k >= 0; k--) {
        for (let pass = 0; pass < 2; pass++) {
          ctx.fillStyle = pass ? (css.plates[k] ?? css.bg) : css.bg;
          for (let i = k; i < f.n; i += f.plates) {
            projectPoint(f, i, eye, p, out);
            const s = pass ? out[2] : out[3];
            if (out[2] && s) ctx.fillRect((out[0] ?? 0) - s / 2, (out[1] ?? 0) - s / 2, s, s);
          }
        }
      }
    },
    dispose() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
