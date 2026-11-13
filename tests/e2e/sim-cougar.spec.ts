import { expect, test, type Page } from "@playwright/test";
import { isTouchFirst, scrollStageIntoView, stageSize, waitForHydration } from "./sim-helpers";

const SCOPE = "#cougar-connect";
const readout = (page: Page) => page.locator(`${SCOPE} .sim-readout`);
const slider = (page: Page) => page.locator(`${SCOPE} [role="slider"]`);
const rows = (page: Page) => page.locator(`${SCOPE} .cougar-row`);

const CREDIT =
  "Team project, fall 2024 (Jonah Jellison, Cameron, Luis). Solo rebuild by Luis, 2026.";

/** The island hydrates when near the viewport (client:visible), so scroll to it first. On desktop
 * that also starts the autoplay sweep; wait for it to hand over before the test drives. */
async function ready(page: Page) {
  await page.goto("/");
  await scrollStageIntoView(page, SCOPE);
  await waitForHydration(page, SCOPE);
  if (!(await isTouchFirst(page))) await page.waitForTimeout(1000);
}

async function flippedRows(page: Page) {
  return rows(page).evaluateAll(
    (els) => els.filter((el) => el.getAttribute("data-flipped") === "true").length,
  );
}

test.describe("cougar connect simulation", () => {
  test("the still renders without JavaScript, at 2026, with the credit and links", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator(`${SCOPE} .sim-stage`)).toBeVisible();
    await expect(rows(page)).toHaveCount(5);
    expect(await flippedRows(page)).toBe(5);
    await expect(slider(page)).toHaveAttribute("aria-valuetext", "2026 rows shown: 5 of 5");
    await expect(page.locator(`${SCOPE} .cougar-credit`)).toHaveText(CREDIT);
    await expect(page.locator(`${SCOPE} .sim-still`)).toContainText(
      "32 xUnit tests, CI on every push",
    );
    await expect(page.locator(`${SCOPE} .sim-still`)).toContainText("hardcoded in the repo");
    const links = page.locator(`${SCOPE} .cougar-hashes a`);
    await expect(links).toHaveCount(7);
    await expect(links.first()).toHaveAttribute(
      "href",
      "https://github.com/LuisZarate17/CougarConnect/commit/dbf0e4a0cb2b27c540e594706f346bd5734cc90b",
    );
    expect(await links.first().getAttribute("target")).toBeNull();
    await expect(page.locator(`${SCOPE} figcaption`)).toContainText(/Drag to compare/);
    await context.close();
  });

  test("hydration keeps the stage the same size, and so does every state", async ({ page }) => {
    await page.goto("/");
    const before = await stageSize(page, SCOPE);
    await scrollStageIntoView(page, SCOPE);
    await waitForHydration(page, SCOPE);
    await page.waitForTimeout(1000);
    expect(await stageSize(page, SCOPE)).toEqual(before);
    await page.getByRole("button", { name: "2024", exact: true }).click();
    await expect(readout(page)).toContainText("0 of 5");
    expect(await stageSize(page, SCOPE)).toEqual(before);
    await slider(page).focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    expect(await stageSize(page, SCOPE)).toEqual(before);
  });

  test("plays once on view on desktop and ends at 2026; waits for a tap on a phone", async ({
    page,
  }) => {
    await page.goto("/");
    await scrollStageIntoView(page, SCOPE);
    await waitForHydration(page, SCOPE);
    if (await isTouchFirst(page)) {
      await page.waitForTimeout(900);
      expect(await flippedRows(page)).toBe(5);
      await page.getByRole("button", { name: "2024", exact: true }).tap();
      await expect(readout(page)).toContainText("0 of 5");
      await page.getByRole("button", { name: "2026", exact: true }).tap();
    } else {
      // The sweep starts at 2024 and hands over at 2026; a cut is never seen twice.
      await page.waitForTimeout(1000);
    }
    await expect(readout(page)).toContainText("5 of 5");
    await expect(slider(page)).toHaveAttribute("aria-valuenow", "100");
  });

  test("the buttons move the divider to the ends and set aria-pressed", async ({ page }) => {
    await ready(page);
    const b2024 = page.getByRole("button", { name: "2024", exact: true });
    const b2026 = page.getByRole("button", { name: "2026", exact: true });
    await b2024.click();
    await expect(slider(page)).toHaveAttribute("aria-valuetext", "2026 rows shown: 0 of 5");
    await expect(b2024).toHaveAttribute("aria-pressed", "true");
    expect(await flippedRows(page)).toBe(0);
    await b2026.click();
    await expect(slider(page)).toHaveAttribute("aria-valuetext", "2026 rows shown: 5 of 5");
    await expect(b2026).toHaveAttribute("aria-pressed", "true");
  });

  test("the keyboard alone reaches every state", async ({ page }, info) => {
    test.skip(info.project.name === "phone", "keyboard path is checked at desktop size");
    await ready(page);
    const s = slider(page);
    await s.focus();
    await page.keyboard.press("Home");
    await expect(s).toHaveAttribute("aria-valuetext", "2026 rows shown: 0 of 5");
    for (const [key, text] of [
      ["ArrowRight", "1 of 5"],
      ["ArrowRight", "1 of 5"],
      ["ArrowRight", "2 of 5"],
      ["ArrowRight", "2 of 5"],
      ["ArrowRight", "3 of 5"],
    ] as const) {
      await page.keyboard.press(key);
      await expect(s).toHaveAttribute("aria-valuetext", `2026 rows shown: ${text}`);
    }
    await page.keyboard.press("ArrowLeft");
    await expect(s).toHaveAttribute("aria-valuenow", "40");
    await page.keyboard.press("End");
    await expect(s).toHaveAttribute("aria-valuetext", "2026 rows shown: 5 of 5");
    await expect(readout(page)).toContainText("5 of 5");

    const b2024 = page.getByRole("button", { name: "2024", exact: true });
    await b2024.focus();
    await page.keyboard.press("Enter");
    await expect(readout(page)).toContainText("0 of 5");
    await page.getByRole("button", { name: "2026", exact: true }).focus();
    await page.keyboard.press("Space");
    await expect(readout(page)).toContainText("5 of 5");
  });

  test("dragging the handle flips rows, and links stay clickable", async ({ page }) => {
    await ready(page);
    await page.getByRole("button", { name: "2024", exact: true }).click();
    await expect(readout(page)).toContainText("0 of 5");
    const handle = slider(page);
    const track = page.locator(`${SCOPE} .cougar-track`);
    await track.scrollIntoViewIfNeeded();
    const tb = (await track.boundingBox())!;
    const hb = (await handle.boundingBox())!;
    const y = hb.y + hb.height / 2;
    await page.mouse.move(hb.x + hb.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(tb.x + tb.width * 0.55, y, { steps: 6 });
    await expect(handle).toHaveAttribute("aria-valuetext", "2026 rows shown: 3 of 5");
    await page.mouse.up();
    await expect(readout(page)).toContainText("3 of 5");
    expect(await flippedRows(page)).toBe(3);
    expect(await handle.evaluate((el) => getComputedStyle(el).touchAction)).toBe("pan-y");
    const link = page.locator(`${SCOPE} .cougar-hashes a`).last();
    expect(await link.evaluate((el) => getComputedStyle(el).pointerEvents)).not.toBe("none");
  });

  test("the divider's hit area is at least 44 px and the controls too", async ({ page }) => {
    await ready(page);
    const hb = (await slider(page).boundingBox())!;
    expect(hb.width).toBeGreaterThanOrEqual(44);
    expect(hb.height).toBeGreaterThanOrEqual(44);
    for (const name of ["2024", "2026"]) {
      const box = (await page.getByRole("button", { name, exact: true }).boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
  });

  test("the credit line is visible in every state", async ({ page }) => {
    await ready(page);
    const credit = page.locator(`${SCOPE} .sim-stage .cougar-credit`);
    for (const name of ["2024", "2026"]) {
      await page.getByRole("button", { name, exact: true }).click();
      await expect(credit).toBeVisible();
      await expect(credit).toHaveText(CREDIT);
    }
  });

  test("the readout is a polite live region", async ({ page }) => {
    await page.goto("/");
    await expect(readout(page)).toHaveAttribute("aria-live", "polite");
  });

  test("reduced motion shows the end state, and the buttons jump instantly", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await ready(page);
    await scrollStageIntoView(page, SCOPE);
    await page.waitForTimeout(200);
    expect(await flippedRows(page)).toBe(5);
    await expect(slider(page)).toHaveAttribute("aria-valuenow", "100");
    await page.getByRole("button", { name: "2024", exact: true }).click();
    // No tween: the very next read already shows the end.
    expect(await flippedRows(page)).toBe(0);
    await expect(readout(page)).toContainText("0 of 5");
    await context.close();
  });
});
