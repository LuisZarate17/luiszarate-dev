import { expect, test, type Page } from "@playwright/test";

// Scroll staging plan, decision 2: a scene may pin only if it fits the frame, so every scene
// fits it at the two common laptop sizes. Layout only; nothing pins yet.
const SIZES = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
];
const SCENES = ["labq", "bifrost", "cougar-connect", "mastery-pilot"];

/** The frame between the bars, in px: `--frame-h` and the two bar heights, as computed. */
async function frame(page: Page) {
  return page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;height:var(--frame-h)";
    document.body.append(probe);
    const frameH = probe.getBoundingClientRect().height;
    probe.remove();
    const body = getComputedStyle(document.body);
    return {
      frameH,
      barTop: parseFloat(body.paddingTop),
      barBottom: parseFloat(body.paddingBottom),
    };
  });
}

/** Scrolls so the scene's top edge meets the top bar, and waits for its simulation to hydrate. */
async function alignToTopBar(page: Page, id: string) {
  await page.evaluate((sceneId) => {
    const scene = document.getElementById(sceneId)!;
    const barTop = parseFloat(getComputedStyle(document.body).paddingTop);
    window.scrollTo(0, scene.getBoundingClientRect().top + window.scrollY - barTop);
  }, id);
  await expect(page.locator(`#${id} astro-island`)).not.toHaveAttribute("ssr", /.*/, {
    timeout: 10_000,
  });
}

for (const size of SIZES) {
  test.describe(`scenes fit the frame at ${size.width} x ${size.height}`, () => {
    test.beforeEach(async ({ page }, info) => {
      test.skip(info.project.name !== "desktop", "the frame fit is a desktop rule");
      await page.setViewportSize(size);
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
    });

    for (const id of SCENES) {
      test(`${id}: the scene is no taller than --frame-h`, async ({ page }) => {
        const { frameH } = await frame(page);
        expect(frameH).toBe(size.height - 112);
        await alignToTopBar(page, id);
        const heights = await page.evaluate((sceneId) => {
          const scene = document.getElementById(sceneId)!;
          return {
            scene: scene.getBoundingClientRect().height,
            grid: scene.querySelector(".scene-grid")!.getBoundingClientRect().height,
          };
        }, id);
        expect(heights.grid).toBeLessThanOrEqual(frameH);
        // Stricter than the grid: the section, with its padding, is exactly one frame.
        expect(heights.scene).toBeLessThanOrEqual(frameH + 0.5);
      });

      test(`${id}: stat captions clear the bottom bar`, async ({ page }) => {
        const { barTop, barBottom } = await frame(page);
        await alignToTopBar(page, id);
        const sceneTop = await page.evaluate(
          (sceneId) => document.getElementById(sceneId)!.getBoundingClientRect().top,
          id,
        );
        expect(Math.abs(sceneTop - barTop)).toBeLessThanOrEqual(1);

        const captions = page.locator(`#${id} .stat dt`);
        expect(await captions.count()).toBeGreaterThan(0);
        for (const caption of await captions.all()) {
          const box = (await caption.boundingBox())!;
          expect(box.height).toBeGreaterThan(0);
          expect(box.y).toBeGreaterThanOrEqual(barTop);
          expect(box.y + box.height).toBeLessThanOrEqual(size.height - barBottom);
          // Nothing is drawn over it: the caption is what a pointer at its centre would hit.
          const onTop = await caption.evaluate((el) => {
            const r = el.getBoundingClientRect();
            const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return hit === el || el.contains(hit);
          });
          expect(onTop).toBe(true);
        }
      });
    }
  });
}
