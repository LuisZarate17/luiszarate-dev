import { expect, test, type Page } from "@playwright/test";
import {
  isTouchFirst,
  scrollStageIntoView,
  stage,
  stageSize,
  waitForHydration,
} from "./sim-helpers";

const SCOPE = "#labq";
const values = (page: Page) => page.locator(`${SCOPE} .sim-readout-value`);
const sim = (page: Page) => page.locator(`${SCOPE} [data-sim-state]`);
const WITHOUT = ["50", "0", "1,225"];
const WITH = ["1", "49", "0"];

test.describe("labq simulation", () => {
  test("the still is server-rendered: both end states show without JavaScript", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");
    await expect(stage(page, SCOPE)).toBeVisible();
    await expect(stage(page, SCOPE)).toHaveAttribute("role", "img");
    await expect(stage(page, SCOPE)).toHaveAttribute(
      "aria-label",
      /50 of 50 bookings.*49 were refused/,
    );
    expect(await sim(page).getAttribute("data-sim-state")).toBe("still");
    const text = (await page.locator(`${SCOPE} .sim-still`).textContent()) ?? "";
    for (const part of [
      "Before",
      "After",
      "15:00 – 17:00",
      "1,225",
      "reservations_no_overlap",
      "49 × 409",
    ])
      expect(text).toContain(part);
    await expect(page.locator(`${SCOPE} figcaption`)).toHaveText(/Fifty bookings for one slot/);
    await expect(values(page)).toHaveText(WITH);
    await context.close();
  });

  test("hydration keeps the stage the same size", async ({ page }) => {
    await page.goto("/");
    await stage(page, SCOPE).scrollIntoViewIfNeeded();
    const before = await stageSize(page, SCOPE);
    await waitForHydration(page, SCOPE);
    expect(await stageSize(page, SCOPE)).toEqual(before);
  });

  test("first play runs without, holds, then with (autoplay on desktop, a tap on a phone)", async ({
    page,
  }) => {
    await page.goto("/");
    await stage(page, SCOPE).scrollIntoViewIfNeeded();
    await waitForHydration(page, SCOPE);
    const before = await stageSize(page, SCOPE);
    await scrollStageIntoView(page, SCOPE);
    if (await isTouchFirst(page)) {
      await page.waitForTimeout(600);
      expect(await sim(page).getAttribute("data-sim-state")).toBe("still");
      await page.getByRole("button", { name: "Replay" }).tap();
    }
    await expect(values(page)).toHaveText(WITHOUT);
    await expect(page.getByRole("button", { name: "Without constraint" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(values(page)).toHaveText(WITH, { timeout: 8000 });
    await expect(sim(page)).toHaveAttribute("data-sim-state", "with");
    await expect(page.locator(`${SCOPE} canvas`)).toBeVisible();
    expect(await stageSize(page, SCOPE)).toEqual(before);
  });

  test("the toggles reach both documented states", async ({ page }) => {
    await page.goto("/");
    await stage(page, SCOPE).scrollIntoViewIfNeeded();
    await waitForHydration(page, SCOPE);
    await stage(page, SCOPE).scrollIntoViewIfNeeded();
    const without = page.getByRole("button", { name: "Without constraint" });
    const withC = page.getByRole("button", { name: "With constraint" });
    await without.click();
    await expect(values(page)).toHaveText(WITHOUT);
    await expect(without).toHaveAttribute("aria-pressed", "true");
    await expect(withC).toHaveAttribute("aria-pressed", "false");
    await withC.click();
    await expect(values(page)).toHaveText(WITH);
    await expect(withC).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Replay" }).click();
    await expect(values(page)).toHaveText(WITHOUT);
    await expect(values(page)).toHaveText(WITH, { timeout: 8000 });
  });

  test("the readout is a polite live region", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(`${SCOPE} .sim-readout`)).toHaveAttribute("aria-live", "polite");
  });

  test("the keyboard alone reaches both states", async ({ page }, info) => {
    test.skip(info.project.name === "phone", "keyboard path is checked at desktop size");
    await page.goto("/");
    await stage(page, SCOPE).scrollIntoViewIfNeeded();
    await waitForHydration(page, SCOPE);
    const without = page.getByRole("button", { name: "Without constraint" });
    await without.focus();
    await page.keyboard.press("Enter");
    await expect(values(page)).toHaveText(WITHOUT);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Space");
    await expect(values(page)).toHaveText(WITH);
    await expect(page.getByRole("button", { name: "With constraint" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("reduced motion shows the end state and switches instantly", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    await stage(page, SCOPE).scrollIntoViewIfNeeded();
    await waitForHydration(page, SCOPE);
    await scrollStageIntoView(page, SCOPE);
    await page.waitForTimeout(500);
    await expect(page.locator(`${SCOPE} canvas`)).toHaveCount(0);
    await expect(sim(page)).toHaveAttribute("data-sim-state", "still");
    await expect(values(page)).toHaveText(WITH);
    await page.getByRole("button", { name: "Without constraint" }).click();
    await expect(values(page)).toHaveText(WITHOUT);
    await expect(page.locator(`${SCOPE} .sim-still`)).toHaveAttribute("data-picked", "without");
    await expect(page.locator(`${SCOPE} canvas`)).toHaveCount(0);
    await context.close();
  });

  test("controls are at least 44 px", async ({ page }) => {
    await page.goto("/");
    for (const name of ["Without constraint", "With constraint", "Replay"]) {
      const box = await page.getByRole("button", { name }).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    }
  });

  test("the still shows two panels on desktop and two stacked bands below 1024 px", async ({
    page,
  }) => {
    await page.goto("/");
    const boxes = await page.locator(`${SCOPE} svg.labq-panel:visible`).evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      }),
    );
    expect(boxes).toHaveLength(2);
    const [a, b] = boxes as [(typeof boxes)[0], (typeof boxes)[0]];
    if (await isTouchFirst(page)) {
      expect(b.y).toBeGreaterThan(a.y + a.h - 1);
      expect(Math.round(a.w)).toBeGreaterThan(300);
    } else {
      expect(b.x).toBeGreaterThan(a.x + a.w - 1);
      expect(a.w).toBeGreaterThan(280);
    }
  });
});
