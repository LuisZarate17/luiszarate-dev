// JavaScript budget for the hero (HERO-SPEC 7.6). Run after `npm run build`.
//  - the chunk that holds three.js (it contains "WebGLRenderer") stays under 140 KB gzip;
//  - the hero's own code stays under 8 KB gzip;
//  - nothing the page's initial HTML loads, directly or by static import, contains three.js;
//  - the test-only query overrides (`heroHooks`) are not in the build.
import { readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const DIST = "dist";
const ASTRO = join(DIST, "_astro");
const THREE_BUDGET = 140 * 1024;
const HERO_BUDGET = 8 * 1024;

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
for (const m of html.matchAll(/_astro\/([^"']+\.js)/g)) visit(m[1]);
console.log(
  `initial load    ${[...seen].length} script chunk(s), none with three.js: ${failures.length === 0}`,
);

for (const [name, c] of chunks) {
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
