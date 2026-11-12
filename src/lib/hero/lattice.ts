import { ALPHA_THRESHOLD, BREAK } from "./constants";
import { STRIDE } from "./project";

export interface Cell {
  col: number;
  row: number;
  glyph: number;
}

/**
 * Turns one glyph's coverage into lattice cells (spec 7.2). `alpha` is a `cols × rows` raster;
 * for RGBA pixel data pass `stride` 4 and `offset` 3. A cell belongs to one glyph only
 * (`owner` is shared by all glyphs and updated here), and a cell whose left neighbour belongs
 * to a different glyph is dropped, so adjacent letters never fuse.
 */
export function cellsFromAlpha(
  alpha: ArrayLike<number>,
  cols: number,
  rows: number,
  glyph: number,
  owner: Int16Array,
  stride = 1,
  offset = 0,
): Cell[] {
  const cells: Cell[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const q = row * cols + col;
      if ((alpha[q * stride + offset] ?? 0) < ALPHA_THRESHOLD) continue;
      const left = col > 0 ? (owner[q - 1] ?? -1) : -1;
      if ((owner[q] ?? -1) >= 0 || (left >= 0 && left !== glyph)) continue;
      owner[q] = glyph;
      cells.push({ col, row, glyph });
    }
  }
  return cells;
}

/** Rank of each glyph by distance of its centroid from `C`: the farthest is 0. Ties keep glyph order. */
export function rankGlyphs(
  centroids: readonly (readonly [number, number])[],
  C: readonly [number, number],
): number[] {
  const order = centroids
    .map(([x, y], i) => ({ i, d: Math.hypot(x - C[0], y - C[1]) }))
    .sort((a, b) => b.d - a.d || a.i - b.i);
  const rank: number[] = [];
  order.forEach(({ i }, r) => (rank[i] = r));
  return rank;
}

/** Origin and pitch of a sampled lattice: cell (col, row) is at `(ox + col·g, oy + row·g)`. */
export interface Grid {
  ox: number;
  oy: number;
  g: number;
}

/** Centroid of each glyph's cells, in hero px. */
export function glyphCentroids(
  cells: readonly Cell[],
  glyphs: number,
  { ox, oy, g }: Grid,
): [number, number][] {
  const sum = Array.from({ length: glyphs }, () => [0, 0, 0] as [number, number, number]);
  for (const { col, row, glyph } of cells) {
    const s = sum[glyph];
    if (s) {
      s[0] += col;
      s[1] += row;
      s[2] += 1;
    }
  }
  return sum.map(([x, y, n]) => [ox + (x / Math.max(1, n)) * g, oy + (y / Math.max(1, n)) * g]);
}

/** Centre of the ink box of all cells: the vanishing point. */
export function inkCenter(cells: readonly Cell[], { ox, oy, g }: Grid): [number, number] {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const { col, row } of cells) {
    x0 = Math.min(x0, col);
    x1 = Math.max(x1, col);
    y0 = Math.min(y0, row);
    y1 = Math.max(y1, row);
  }
  if (!cells.length) return [ox, oy];
  return [ox + ((x0 + x1 + 1) / 2) * g, oy + ((y0 + y1 + 1) / 2) * g];
}

/**
 * One interleaved array, `STRIDE` floats per point per plate: x, y, k, delay, frac.
 * `frac` is the cell's left-to-right rank among all cells (0..1): the back plate keeps it
 * when it flattens into the line. Dots sit on whole pixels (`+ dot / 2`).
 */
export function buildPoints(
  cells: readonly Cell[],
  ranks: readonly number[],
  grid: Grid,
  dot: number,
  plates: number,
): Float32Array {
  const frac = new Float32Array(cells.length);
  cells
    .map((c, i) => ({ c, i }))
    .sort((a, b) => a.c.col - b.c.col || a.c.row - b.c.row)
    .forEach(({ i }, r) => (frac[i] = r / Math.max(1, cells.length - 1)));
  const out = new Float32Array(cells.length * plates * STRIDE);
  let o = 0;
  cells.forEach(({ col, row, glyph }, i) => {
    const x = grid.ox + col * grid.g + dot / 2;
    const y = grid.oy + row * grid.g + dot / 2;
    for (let k = 0; k < plates; k++) {
      const delay =
        k === plates - 1
          ? 0
          : BREAK.delayBase + BREAK.delayPerRank * (ranks[glyph] ?? 0) + BREAK.delayPerPlate * k;
      out[o++] = x;
      out[o++] = y;
      out[o++] = k;
      out[o++] = delay;
      out[o++] = frac[i] ?? 0;
    }
  });
  return out;
}
