import { expect, test } from "@playwright/test";

test.describe("home page", () => {
  test("has one h1 and four scenes, each with an h2", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Luis\s+Zarate/i);
    const scenes = page.locator("section.scene");
    await expect(scenes).toHaveCount(4);
    for (const scene of await scenes.all()) {
      await expect(scene.getByRole("heading", { level: 2 })).toHaveCount(1);
    }
  });

  test("has no horizontal scroll", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("has no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });
});
