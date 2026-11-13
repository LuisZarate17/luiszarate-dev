// JavaScript budget for the hero (HERO-SPEC 7.6), the simulations (SIM-SPEC section 1), scroll
// staging and the "How it was built" timeline.
// Run after `npm run build`.
//  - the chunk that holds three.js (it contains "WebGLRenderer") stays under 140 KB gzip;
//  - the hero's own code stays under 8 KB gzip;
//  - nothing the page's initial HTML loads, directly or by static import, contains three.js;
//  - the test-only query overrides (`heroHooks`) are not in the build;
//  - each simulation's chunk (a component named `<Id>Sim.tsx`) stays under 12 KB gzip and is
//    never loaded by the initial HTML;
//  - the test-only simulation probe (`simProbe`, /sim-probe/) is not in the build;
//  - scroll staging (src/lib/scroll-stage.ts, ADR-007) is one chunk under 2 KB gzip, with no
//    imports of its own, and the initial HTML never loads it statically: Scene.astro imports
//    it at run time, only on a page with a `.scene-pin`;
//  - the "How it was built" timeline (src/lib/build-timeline.ts) is one chunk under 6 KB gzip
//    that the initial HTML never loads statically: Built.astro imports it when the section
//    comes near.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const DIST = "dist";
const ASTRO = join(DIST, "_astro");
const THREE_BUDGET = 140 * 1024;
const HERO_BUDGET = 8 * 1024;
const SIM_BUDGET = 12 * 1024;
const SIM_CHUNK = /Sim\.[\w-]+\.js$/;
const STAGE_BUDGET = 2 * 1024;
const STAGE_CHUNK = /^scroll-stage\.[\w-]+\.js$/;
const BUILT_BUDGET = 6 * 1024;
const BUILT_CHUNK = /^build-timeline\.[\w-]+\.js$/;

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const failures = [];

const files = readdirSync(ASTRO).filter((f) => f.endsWith(".js"));
const chunks = new Map(
  files.map((name) => {
    const text = readFileSync(join(ASTRO, name), "utf8");
    return [name, { text, gzip: gzipSync(text, { level: 9 }).length }];
  }),
);

const three = [...chunks].filter(([, c]) => c.text.includes("WebGLRenderer"));
if (three.length === 0)
  failures.push("no chunk contains three.js (WebGLRenderer): is the hero built?");
for (const [name, c] of three) {
  console.log(`three.js chunk  ${name}  ${kb(c.gzip)} gzip (budget ${kb(THREE_BUDGET)})`);
  if (c.gzip > THREE_BUDGET) failures.push(`${name} is ${kb(c.gzip)}, over ${kb(THREE_BUDGET)}`);
}

// Hero code: the island script and the 2D renderer; everything else is shared site code.
const hero = [...chunks].filter(
  ([name, c]) => /^Hero\.astro|^render-2d/.test(name) && !c.text.includes("WebGLRenderer"),
);
const heroGzip = hero.reduce((sum, [, c]) => sum + c.gzip, 0);
console.log(
  `hero code       ${hero.map(([n]) => n).join(", ")}  ${kb(heroGzip)} gzip (budget ${kb(HERO_BUDGET)})`,
);
if (heroGzip > HERO_BUDGET) failures.push(`hero code is ${kb(heroGzip)}, over ${kb(HERO_BUDGET)}`);

// Nothing on the critical path may carry three.js.
const html = readFileSync(join(DIST, "index.html"), "utf8");
const seen = new Set();
const visit = (name) => {
  if (seen.has(name) || !chunks.has(name)) return;
  seen.add(name);
  const { text } = chunks.get(name);
  if (text.includes("WebGLRenderer"))
    failures.push(`${name} is loaded by the initial HTML and contains three.js`);
  // Static imports only: `import"./x.js"` and `from"./x.js"`, never `import("./x.js")`.
  for (const m of text.matchAll(/(?:from|import)\s*["']\.\/([^"']+\.js)["']/g)) visit(m[1]);
};
// What the page loads on its own, whatever the attribute order:
//  - <script src> and <link rel="modulepreload" href> in _astro/;
//  - static imports inside inline <script type="module"> bodies;
//  - every <astro-island>: a simulation island must hydrate with client="visible" only. A
//    `client:load`, `client:idle` or `client:only` island fetches its chunk at page load.
const attr = (tag, name) =>
  tag
    .match(new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)')`))
    ?.slice(1)
    .find(Boolean);
const astroName = (url) => url?.match(/_astro\/([^"'?#/]+\.js)/)?.[1];
for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
  const src = astroName(attr(m[1], "src"));
  if (src) visit(src);
  else if (/\stype=["']?module/.test(m[1]))
    for (const i of m[2].matchAll(/(?:from|import)\s*["']([^"']*_astro\/[^"']+\.js)["']/g))
      visit(astroName(i[1]));
}
for (const m of html.matchAll(/<link\b[^>]*>/g)) {
  if (attr(m[0], "rel") !== "modulepreload") continue;
  const name = astroName(attr(m[0], "href"));
  if (name) visit(name);
}
for (const m of html.matchAll(/<astro-island\b[^>]*>/g)) {
  const name = astroName(attr(m[0], "component-url"));
  const client = attr(m[0], "client");
  if (name && SIM_CHUNK.test(name) && client !== "visible")
    failures.push(`${name} hydrates with client="${client}": simulations must be client:visible`);
}
for (const name of seen)
  if (SIM_CHUNK.test(name)) failures.push(`${name} is a simulation loaded by the initial HTML`);
console.log(
  `initial load    ${[...seen].length} script chunk(s), none with three.js: ${failures.length === 0}`,
);

// Simulations: each chunk under its cap.
const sims = [...chunks].filter(([name]) => SIM_CHUNK.test(name));
for (const [name, c] of sims) {
  console.log(`simulation      ${name}  ${kb(c.gzip)} gzip (budget ${kb(SIM_BUDGET)})`);
  if (c.gzip > SIM_BUDGET) failures.push(`${name} is ${kb(c.gzip)}, over ${kb(SIM_BUDGET)}`);
}
if (sims.length === 0) console.log("simulation      none built yet");
// Scroll staging: one small chunk, self-contained, loaded on demand.
const stage = [...chunks].filter(([name]) => STAGE_CHUNK.test(name));
if (stage.length !== 1)
  failures.push(
    `expected one scroll-stage chunk, found ${stage.length}: is it still a dynamic import?`,
  );
for (const [name, c] of stage) {
  console.log(`scroll staging  ${name}  ${kb(c.gzip)} gzip (budget ${kb(STAGE_BUDGET)})`);
  if (c.gzip > STAGE_BUDGET) failures.push(`${name} is ${kb(c.gzip)}, over ${kb(STAGE_BUDGET)}`);
  if (/(?:from|import)\s*["']\.\/[^"']+\.js["']|import\(/.test(c.text))
    failures.push(`${name} imports another chunk: scroll staging must stay self-contained`);
  if (seen.has(name)) failures.push(`${name} is loaded statically by the initial HTML`);
}
const loaders = [...chunks].filter(
  ([name, c]) => !STAGE_CHUNK.test(name) && c.text.includes("scroll-stage."),
);
const inlineLoader = /scroll-stage\.[\w-]+\.js/.test(html);
for (const [name, c] of loaders)
  if (!/querySelector\(["'`]\.scene-pin["'`]\)/.test(c.text))
    failures.push(`${name} loads scroll staging without checking for a .scene-pin`);
if (inlineLoader && !/querySelector\(["'`]\.scene-pin["'`]\)/.test(html))
  failures.push("the page loads scroll staging without checking for a .scene-pin");
if (loaders.length === 0 && !inlineLoader) failures.push("nothing loads the scroll-stage chunk");

// "How it was built": the timeline's interaction is one small chunk, loaded on demand.
const built = [...chunks].filter(([name]) => BUILT_CHUNK.test(name));
if (built.length !== 1)
  failures.push(
    `expected one build-timeline chunk, found ${built.length}: is it still a dynamic import?`,
  );
for (const [name, c] of built) {
  console.log(`build timeline  ${name}  ${kb(c.gzip)} gzip (budget ${kb(BUILT_BUDGET)})`);
  if (c.gzip > BUILT_BUDGET) failures.push(`${name} is ${kb(c.gzip)}, over ${kb(BUILT_BUDGET)}`);
  if (seen.has(name)) failures.push(`${name} is loaded statically by the initial HTML`);
}

if (existsSync(join(DIST, "sim-probe")))
  failures.push("dist/sim-probe exists: rebuild without PUBLIC_SIM_PROBE");

for (const [name, c] of chunks) {
  if (c.text.includes("simProbe"))
    failures.push(
      `${name} contains the test-only simulation probe: rebuild without PUBLIC_SIM_PROBE`,
    );
  if (c.text.includes("heroHooks"))
    failures.push(
      `${name} contains the test-only hero hooks: rebuild without PUBLIC_HERO_TEST_HOOKS`,
    );
}

if (failures.length) {
  console.error(`\nBudget failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("\nBudget ok.");
