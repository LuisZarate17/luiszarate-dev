import { expect, test } from "@playwright/test";
import {
  PROBE_URL,
  isTouchFirst,
  scrollStageIntoView,
  stage,
  stageSize,
  waitForHydration,
} from "./sim-helpers";

const state = (page: import("@playwright/test").Page) =>
  page.locator("#sim-probe .sim-still").getAttribute("data-sim-state");

test.describe("simulation slot", () => {
  test("the still is server-rendered: it shows without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(PROBE_URL);
    await expect(stage(page)).toBeVisible();
    expect(await state(page)).toBe("idle");
    await expect(page.locator("#sim-probe figcaption")).toHaveText(/simProbe fixture caption/);
    await context.close();
  });

  test("hydration keeps the stage the same size", async ({ page }) => {
    await page.goto(PROBE_URL);
    const before = await stageSize(page);
    await waitForHydration(page);
    expect(await stageSize(page)).toEqual(before);
  });

  test("plays once when 60% visible on desktop, and waits for a tap on a phone", async ({
    page,
  }) => {
    await page.goto(PROBE_URL);
    await waitForHydration(page);
    await scrollStageIntoView(page);
    if (await isTouchFirst(page)) {
      await page.waitForTimeout(600);
      expect(await state(page)).toBe("idle");
      await page.getByRole("button", { name: "Play probe" }).tap();
    }
    await expect.poll(() => state(page)).toBe("played");
    await expect(page.locator("#sim-probe .sim-readout")).toHaveText(/played/);
  });

  test("the readout is a polite live region", async ({ page }) => {
    await page.goto(PROBE_URL);
    await expect(page.locator("#sim-probe .sim-readout")).toHaveAttribute("aria-live", "polite");
  });

  test("the keyboard alone reaches and runs the controls", async ({ page }, info) => {
    test.skip(info.project.name === "phone", "keyboard path is checked at desktop size");
    await page.goto(PROBE_URL);
    await waitForHydration(page);
    const play = page.getByRole("button", { name: "Play probe" });
    await play.focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => state(page)).toBe("played");
    await expect(play).toHaveAttribute("aria-pressed", "true");
  });

  test("reduced motion shows the end state at once", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(PROBE_URL);
    await waitForHydration(page);
    // The server renders the still; hydration then reads the preference and shows the end state.
    await expect.poll(() => state(page)).toBe("played");
    await context.close();
  });

  test("controls are at least 44 px", async ({ page }) => {
    await page.goto(PROBE_URL);
    for (const name of ["Play probe", "Reset probe"]) {
      const box = await page.getByRole("button", { name }).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    }
  });
});

test("a project with no simulation keeps its screenshot", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#labq .sim-still img")).toBeVisible();
  await expect(page.locator("#labq .sim-stage")).toHaveCount(1);
});
