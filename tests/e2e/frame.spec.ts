import { expect, test, type Page } from "@playwright/test";

/**
 * Frame, scene cut and strip (spec 3.4, 4.2, 5.1, 5.3, 5.5, 6.4).
 * Tests that need real scene sections rely on T3's markup: one
 * `main > section.scene#<entry id>` per project, each with an `h2`, after a hero section.
 */
const SCENES = [
  { id: "labq", n: 1, name: "LabQ" },
  { id: "bifrost", n: 2, name: "Bifrost" },
  { id: "cougar-connect", n: 3, name: "Cougar Connect" },
  { id: "mastery-pilot", n: 4, name: "Mastery Pilot" },
];

const strip = (page: Page) => page.getByRole("navigation", { name: "Scenes" });
const link = (page: Page, n: number, name: string) =>
  strip(page).getByRole("link", { name: `Scene ${n}: ${name}` });
const barTop = (page: Page) => page.locator("header.frame-bar--top");

async function scrollToSectionMiddle(page: Page, id: string) {
  await page.evaluate((sectionId) => {
    const el = document.getElementById(sectionId)!;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top + el.offsetHeight / 2 - window.innerHeight / 2);
  }, id);
}

test.describe("frame", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders the page structure in order", async ({ page }) => {
    const order = await page.evaluate(() =>
      [...document.body.children]
        .filter((el) => !["SCRIPT", "STYLE"].includes(el.tagName))
        .map((el) => el.tagName + (el.className ? "." + String(el.className).split(" ")[0] : "")),
    );
    expect(order.slice(0, 2)).toEqual(["A.skip-link", "HEADER.frame-bar"]);
    expect(order).toContain("NAV.frame-bar");
    expect(order.indexOf("NAV.frame-bar")).toBeLessThan(order.indexOf("MAIN"));
    expect(order.filter((o) => o.startsWith("DIV.wipe"))).toHaveLength(1);
    await expect(page.locator("main#main")).toHaveAttribute("tabindex", "-1");
    await expect(page.locator(".theme-toggle")).toHaveCount(0);
  });

  test("bars are fixed and do not move on scroll", async ({ page }) => {
    for (const bar of [barTop(page), strip(page)]) {
      await expect(bar).toHaveCSS("position", "fixed");
    }
    const before = [await barTop(page).boundingBox(), await strip(page).boundingBox()];
    await scrollToSectionMiddle(page, "bifrost");
    const after = [await barTop(page).boundingBox(), await strip(page).boundingBox()];
    expect(after).toEqual(before);
    const viewport = page.viewportSize()!;
    expect(before[0]!.y).toBe(0);
    expect(before[1]!.y + before[1]!.height).toBe(viewport.height);
  });

  test("the strip lists the four scenes and the build section with accessible names", async ({
    page,
  }) => {
    await expect(strip(page).getByRole("listitem")).toHaveCount(SCENES.length + 1);
    const build = link(page, 5, "How it was built");
    await expect(build).toHaveAttribute("href", "#build");
    await expect(build).not.toHaveAttribute("data-world");
    const buildBox = await build.boundingBox();
    expect(buildBox!.height).toBeGreaterThanOrEqual(44);
    expect(buildBox!.width).toBeGreaterThanOrEqual(44);
    for (const s of SCENES) {
      const a = link(page, s.n, s.name);
      await expect(a).toHaveAttribute("href", `#${s.id}`);
      const box = await a.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
  });

  test("clicking a strip item cuts to the scene and focuses its heading", async ({ page }) => {
    await link(page, 2, "Bifrost").click();
    const heading = page.locator("#bifrost h2");
    await expect(heading).toBeFocused();
    const top = await page
      .locator("section#bifrost")
      .evaluate((el) => el.getBoundingClientRect().top);
    const bar = (await barTop(page).boundingBox())!.height;
    expect(Math.abs(top - bar)).toBeLessThanOrEqual(1);
    await expect(page).toHaveURL(/#bifrost$/);
  });

  test("aria-current follows scroll", async ({ page }) => {
    for (const s of SCENES) {
      await scrollToSectionMiddle(page, s.id);
      await expect(link(page, s.n, s.name)).toHaveAttribute("aria-current", "true");
      await expect(strip(page).locator("[aria-current]")).toHaveCount(1);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(strip(page).locator("[aria-current]")).toHaveCount(0);
  });

  test("the counter starts at 01 / 05 and follows the current scene", async ({ page }) => {
    await expect(page.locator("nav.frame-bar--bottom")).toContainText("01 / 05");
    await scrollToSectionMiddle(page, "cougar-connect");
    await expect(page.locator("#strip-counter-current")).toHaveText("03");
    await scrollToSectionMiddle(page, "build");
    await expect(page.locator("#strip-counter-current")).toHaveText("05");
  });

  test("the home link cuts back to the top", async ({ page }) => {
    await scrollToSectionMiddle(page, "mastery-pilot");
    await page.locator("header .home:visible").click();
    await expect(page.locator("main h1")).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test("the timecode is driven by scroll", async ({ page }) => {
    const tc = page.locator("#timecode");
    await expect(tc).toHaveText("00:00:00:00");
    await expect(tc).toHaveAttribute("aria-hidden", "true");
    await scrollToSectionMiddle(page, "bifrost");
    await expect.poll(async () => (await tc.textContent())!.startsWith("00:01:")).toBe(true);
  });

  test("the skip link is first, appears on focus and moves focus to main", async ({ page }) => {
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    const box = (await skip.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual((await barTop(page).boundingBox())!.height);
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main")).toBeFocused();
  });

  test("the wipe runs during a cut", async ({ page }) => {
    await link(page, 3, "Cougar Connect").click();
    await expect
      .poll(() => page.evaluate(() => document.querySelector(".wipe")!.getAnimations().length))
      .toBeGreaterThan(0);
    await expect(page.locator("#cougar-connect h2")).toBeFocused();
    await expect
      .poll(() => page.evaluate(() => document.querySelector(".wipe")!.getAnimations().length))
      .toBe(0);
  });

  test("has no horizontal scroll at 320 px and the strip fits", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const stripOverflow = await strip(page)
      .locator("ol")
      .evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(stripOverflow).toBeLessThanOrEqual(0);
    await expect(link(page, 4, "Mastery Pilot")).toBeVisible();
    await expect(link(page, 5, "How it was built")).toBeVisible();
  });
});

test.describe("frame with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("no wipe animation runs, the jump is instant and focus still moves", async ({ page }) => {
    await page.goto("/");
    await link(page, 2, "Bifrost").click();
    await expect(page.locator("#bifrost h2")).toBeFocused();
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    const top = await page
      .locator("section#bifrost")
      .evaluate((el) => el.getBoundingClientRect().top);
    const bar = (await barTop(page).boundingBox())!.height;
    expect(Math.abs(top - bar)).toBeLessThanOrEqual(1);
  });

  test("the timecode shows the start of the current scene", async ({ page }) => {
    await page.goto("/");
    await scrollToSectionMiddle(page, "bifrost");
    await expect(page.locator("#timecode")).toHaveText("00:01:00:00");
  });
});
