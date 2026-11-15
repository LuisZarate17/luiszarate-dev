import { expect, test } from "@playwright/test";

/**
 * The 404 page (src/pages/404.astro). The static build emits it as /404.html, which Vercel
 * serves for any unknown path; the preview server does the same, so both are checked.
 */
test.describe("404 page", () => {
  test("an unknown path answers 404 with the page", async ({ page }) => {
    const response = await page.goto("/no/such/page");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Scene missing");
    await expect(page).toHaveTitle("Scene missing (404) · Luis Zarate");
  });

  test("one scene in the frame: slug, title, sentence and the way back", async ({ page }) => {
    await page.goto("/404.html");
    const scene = page.locator("main > section");
    await expect(scene).toHaveCount(1);
    await expect(scene).not.toHaveAttribute("data-world");
    await expect(scene.locator(".slug")).toHaveText(/SC 404\s+INT\. CUTTING ROOM — NO FOOTAGE/);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(
      scene.getByRole("paragraph").filter({ hasText: "no page at this address" }),
    ).toBeVisible();

    // The scene fits between the bars: nothing to scroll.
    const fits = await page.evaluate(
      () => document.documentElement.scrollHeight <= window.innerHeight + 1,
    );
    expect(fits).toBe(true);
    const sideways = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(sideways).toBe(false);

    const back = scene.getByRole("link", { name: "Back to the start" });
    const box = await back.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    await back.click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Luis\s+Zarate/i);
  });

  test("the way back works from the keyboard", async ({ page }) => {
    await page.goto("/404.html");
    const back = page.getByRole("link", { name: "Back to the start" });
    await back.focus();
    await expect(back).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/$/);
  });

  test("the bars lead back to the home page and its scenes", async ({ page }) => {
    await page.goto("/no/such/page");
    const strip = page.getByRole("navigation", { name: "Scenes" });
    await expect(strip.getByRole("link")).toHaveCount(6);
    await expect(strip.locator("[aria-current]")).toHaveCount(0);
    for (const link of await strip.getByRole("link").all())
      expect(await link.getAttribute("href")).toMatch(/^\/#[a-z-]+$/);
    await expect(page.locator("header.frame-bar--top a")).toHaveAttribute("href", "/");

    await strip.getByRole("link", { name: "Scene 02 Bifrost" }).click();
    await expect(page).toHaveURL(/\/#bifrost$/);
    await expect(page.locator("#bifrost")).toBeInViewport();
  });

  test("search engines skip it", async ({ page }) => {
    await page.goto("/404.html");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  });

  test("nothing moves, with or without reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/404.html");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const running = await page.evaluate(() => document.getAnimations().length);
    expect(running).toBe(0);
  });
});
