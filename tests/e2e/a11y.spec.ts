import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Accessibility audit (phase 9): axe-core against WCAG 2.0 A and AA and WCAG 2.1 AA, on the
 * home page and the 404 page. Both Playwright projects run it, so each page is checked at the
 * desktop size and at phone size. No rule is disabled, and one that axe leaves off is turned on.
 *
 * axe only judges what is rendered, so the home page is first walked from top to bottom: that
 * hydrates every simulation (`client:visible`) and loads the timeline's script. A second pass
 * opens the drawers and a pull-request card, whose content is otherwise not in the tree.
 */
const TAGS = ["wcag2a", "wcag2aa", "wcag21aa"];

interface Finding {
  rule: string;
  help: string;
  nodes: string[];
}

async function audit(page: Page): Promise<Finding[]> {
  const results = await new AxeBuilder({ page })
    .withTags(TAGS)
    // Off by default in axe (experimental), and what Lighthouse reports as
    // "label-content-name-mismatch": an accessible name must contain the visible label.
    .options({ rules: { "label-content-name-mismatch": { enabled: true } } })
    .analyze();
  return results.violations.map((violation) => ({
    rule: violation.id,
    help: violation.help,
    nodes: violation.nodes.map((node) => `${node.target.join(" ")}: ${node.failureSummary ?? ""}`),
  }));
}

/** Brings every section into the frame once, then returns to the top. */
async function walk(page: Page) {
  const sections = page.locator("main > .hero-pin, main > .scene-pin, main > section");
  const count = await sections.count();
  for (let i = 0; i < count; i++) {
    await sections.nth(i).evaluate((el) => el.scrollIntoView({ behavior: "instant" }));
    await page.waitForTimeout(150);
  }
  // Every simulation island has hydrated.
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

test.describe("accessibility (axe: WCAG 2.0 A and AA, WCAG 2.1 AA)", () => {
  test("home page", async ({ page }) => {
    await page.goto("/");
    await walk(page);
    expect(await audit(page)).toEqual([]);
  });

  test("home page with reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await walk(page);
    expect(await audit(page)).toEqual([]);
  });

  test("home page with the drawers and a pull-request card open", async ({ page }) => {
    await page.goto("/");
    await walk(page);
    const opened = await page.evaluate(() => {
      const drawers = [...document.querySelectorAll<HTMLDetailsElement>("details.drawer")];
      for (const drawer of drawers) drawer.open = true;
      const card = document.querySelector<HTMLDetailsElement>("details.pr");
      if (card) card.open = true;
      return { drawers: drawers.length, card: card !== null };
    });
    expect(opened.drawers).toBeGreaterThan(0);
    expect(opened.card).toBe(true);
    expect(await audit(page)).toEqual([]);
  });

  test("404 page", async ({ page }) => {
    const response = await page.goto("/404.html");
    expect(response?.ok()).toBe(true);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await audit(page)).toEqual([]);
  });

  test("404 page with reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/404.html");
    expect(await audit(page)).toEqual([]);
  });
});
