// The share image (Open Graph and Twitter card), 1200 x 630. `npm run share:image` writes
// public/og.png, which is committed: the build does not need a browser to produce it.
//
// It is the hero in the frame: the letterbox bars, the hero's slug line, the name as the front
// plate with the four project plates fanned behind it, and the positioning line. Real content
// only. The plate colors and their order are read from the project content files, the base
// colors from the tokens and the fonts from the same @fontsource files the site ships, so the
// image cannot drift from the page. Run it again when a project, a color or the name changes.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "og.png");
const WIDTH = 1200;
const HEIGHT = 630;

/** A custom property of the dark theme (the first declaration in tokens.css). */
const tokens = readFileSync(join(ROOT, "src", "styles", "tokens.css"), "utf8");
const token = (name) => {
  const value = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(tokens)?.[1];
  if (!value) throw new Error(`token --${name} not found in tokens.css`);
  return value;
};

/** The projects' fill colors, by `order`: the nearest plate behind the name first. */
const dir = join(ROOT, "src", "content", "projects");
const plates = readdirSync(dir)
  .filter((file) => file.endsWith(".md"))
  .map((file) => {
    const text = readFileSync(join(dir, file), "utf8");
    const order = Number(/^order:\s*(\d+)/m.exec(text)?.[1]);
    const fill = /^\s+fill:\s*"(#[0-9a-fA-F]{6})"/m.exec(text)?.[1];
    if (!order || !fill) throw new Error(`${file}: no order or world.fill`);
    return { order, fill };
  })
  .sort((a, b) => a.order - b.order);

const font = (pkg, file) =>
  readFileSync(join(ROOT, "node_modules", "@fontsource", pkg, "files", file)).toString("base64");
const face = (family, weight, data) =>
  `@font-face{font-family:"${family}";font-weight:${weight};src:url(data:font/woff2;base64,${data}) format("woff2")}`;

const STEP = 9; // px between plates, right and down
const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<style>
${face("Display", 900, font("big-shoulders-display", "big-shoulders-display-latin-900-normal.woff2"))}
${face("Sans", 400, font("hanken-grotesk", "hanken-grotesk-latin-400-normal.woff2"))}
${face("Mono", 500, font("jetbrains-mono", "jetbrains-mono-latin-500-normal.woff2"))}
*{box-sizing:border-box;margin:0}
body{width:${WIDTH}px;height:${HEIGHT}px;display:flex;flex-direction:column;background:${token("color-bg")};color:${token("color-text")}}
.bar{flex:none;height:64px;background:${token("color-bar")}}
.frame{flex:1;display:flex;flex-direction:column;justify-content:flex-end;padding:0 72px 56px}
.slug{font:500 20px/1.2 Mono;letter-spacing:.08em;text-transform:uppercase;color:${token("color-muted")}}
.name{position:relative;margin-top:20px;font:900 236px/.86 Display;letter-spacing:-.005em;text-transform:uppercase;white-space:nowrap}
.name i{position:absolute;inset:0;font-style:normal}
.name b{position:relative;font-weight:900}
.sub{margin-top:${28 + plates.length * STEP}px;font:400 36px/1.2 Sans}
</style>
<div class="bar"></div>
<div class="frame">
  <p class="slug">INT. PORTFOLIO — FULL-STACK ENGINEER</p>
  <p class="name">${[...plates]
    .reverse()
    .map(
      (plate, i) =>
        `<i style="color:${plate.fill};transform:translate(${(plates.length - i) * STEP}px,${(plates.length - i) * STEP}px)">Luis Zarate</i>`,
    )
    .join("")}<b>Luis Zarate</b></p>
  <p class="sub">Full-stack engineer</p>
</div>
<div class="bar"></div>
</html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const loaded = await page.evaluate(() => [...document.fonts].every((f) => f.status === "loaded"));
  if (!loaded) throw new Error("a font did not load: the image would use a fallback face");
  const fits = await page.evaluate(
    () => document.querySelector(".name b").getBoundingClientRect().right <= innerWidth - 72,
  );
  if (!fits) throw new Error("the name does not fit the frame");
  const png = await page.screenshot({ type: "png" });
  const info = await sharp(png).png({ compressionLevel: 9, palette: true }).toFile(OUT);
  console.log(`share image: ${info.width} x ${info.height}, ${info.size} bytes -> public/og.png`);
} finally {
  await browser.close();
}
