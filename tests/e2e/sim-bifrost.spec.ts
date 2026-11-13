import { expect, test, type Page } from "@playwright/test";
import {
  isTouchFirst,
  scrollStageIntoView,
  stage,
  stageSize,
  waitForHydration,
} from "./sim-helpers";

const SCOPE = "#bifrost";
const state = (page: Page) => page.locator(`${SCOPE} .sim-still`).getAttribute("data-sim-state");
const btn = (page: Page, name: string) =>
  page.locator(`${SCOPE} .sim-controls`).getByRole("button", { name, exact: true });
const rows = (page: Page, view: string) =>
  page.locator(`${SCOPE} .bifrost-row[data-view="${view}"]`);
const readout = (page: Page) => page.locator(`${SCOPE} .sim-readout`);

/** The island hydrates only near the viewport (client:visible), so scroll to it first. */
async function ready(page: Page) {
  await page.goto("/");
  await scrollStageIntoView(page, SCOPE);
  await waitForHydration(page, SCOPE);
}

/** Phones wait for a tap; desktop autoplays once at 60% visible. Either way, ends on Review. */
async function settleOnReview(page: Page) {
  if (await isTouchFirst(page)) {
    await page.waitForTimeout(500);
    expect(await state(page)).toBe("review");
    return;
  }
  await page.waitForTimeout(300);
  await expect.poll(() => state(page), { timeout: 5000 }).toBe("review");
}

test.describe("bifrost simulation", () => {
  test("the still is server-rendered: the Review card shows without JavaScript", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");
    const still = page.locator(`${SCOPE} .sim-still`);
    await expect(still).toContainText("Now rename greet to welcome in src/main.rs");
    await expect(still).toContainText("Edit file");
    await expect(still).toContainText("src/main.rs");
    await expect(still).toContainText("+2 −2");
    await expect(still).toContainText("Review");
    await expect(still).toContainText("fn welcome(name: &str) -> String {");
    await expect(still).toContainText("fn greet(name: &str) -> String {");
    await expect(still).toContainText("Nothing has been changed yet.");
    await expect(page.locator(`${SCOPE} .bifrost-row`)).toHaveCount(12);
    await expect(page.locator(`${SCOPE} figcaption`)).toContainText("byte for byte");
    await context.close();
  });

  test("hydration keeps the stage the same size", async ({ page }) => {
    await page.goto("/");
    await scrollStageIntoView(page, SCOPE);
    const before = await stageSize(page, SCOPE);
    await waitForHydration(page, SCOPE);
    expect(await stageSize(page, SCOPE)).toEqual(before);
  });

  test("plays on view on desktop and waits for a tap on a phone, then lands on Review", async ({
    page,
  }) => {
    await page.goto("/");
    await scrollStageIntoView(page, SCOPE);
    await waitForHydration(page, SCOPE);
    if (await isTouchFirst(page)) {
      await page.waitForTimeout(500);
      expect(await state(page)).toBe("review");
      await expect(btn(page, "Apply edit")).toBeEnabled();
    } else {
      // Autoplay: the diff types in (Apply is disabled meanwhile), then waits on Review.
      await expect(btn(page, "Apply edit")).toBeEnabled();
      await expect.poll(() => state(page)).toBe("review");
    }
    await expect(readout(page)).toContainText("Review");
    await expect(btn(page, "Apply edit")).toBeEnabled();
    await expect(btn(page, "Deny")).toBeVisible();
  });

  test("Apply, Undo and Replay reach every state, and the stage never resizes", async ({
    page,
  }) => {
    await ready(page);
    await settleOnReview(page);
    const size = await stageSize(page, SCOPE);

    await btn(page, "Apply edit").click();
    await expect.poll(() => state(page)).toBe("applied");
    await expect(page.locator(`${SCOPE} .bifrost-chip`)).toHaveText("Applied");
    await expect(readout(page)).toContainText("Applied");
    await expect(page.locator(`${SCOPE} .bifrost-note`)).toHaveText("");
    await expect(rows(page, "collapsed")).toHaveCount(2);
    await expect(rows(page, "plain")).toHaveCount(10);
    await expect(btn(page, "Undo")).toBeVisible();
    await page.waitForTimeout(700);
    expect(await stageSize(page, SCOPE)).toEqual(size);

    await btn(page, "Undo").click();
    await expect.poll(() => state(page)).toBe("undone");
    await expect(page.locator(`${SCOPE} .bifrost-note`)).toHaveText(
      "Undone — the file is back as it was.",
    );
    await expect(readout(page)).toContainText("byte for byte");
    await expect(btn(page, "Replay")).toBeVisible();
    await page.waitForTimeout(700);
    expect(await stageSize(page, SCOPE)).toEqual(size);

    await btn(page, "Replay").click();
    await expect.poll(() => state(page)).toBe("review");
    expect(await stageSize(page, SCOPE)).toEqual(size);

    await btn(page, "Deny").click();
    await expect.poll(() => state(page)).toBe("declined");
    await expect(page.locator(`${SCOPE} .bifrost-chip`)).toHaveText("Declined");
    await expect(page.locator(`${SCOPE} .bifrost-note`)).toHaveText(
      "You declined. Nothing was written, and the model was told.",
    );
    await expect(btn(page, "Replay")).toBeVisible();
    expect(await stageSize(page, SCOPE)).toEqual(size);
  });

  test("the keyboard alone reaches every state", async ({ page }, info) => {
    test.skip(info.project.name === "phone", "keyboard path is checked at desktop size");
    await ready(page);
    await settleOnReview(page);
    await btn(page, "Apply edit").focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => state(page)).toBe("applied");
    // Focus moves to the next state's button rather than being lost.
    await expect(btn(page, "Undo")).toBeFocused();
    await page.keyboard.press("Space");
    await expect.poll(() => state(page)).toBe("undone");
    await expect(btn(page, "Replay")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect.poll(() => state(page)).toBe("review");
    await btn(page, "Deny").focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => state(page)).toBe("declined");
  });

  test("keyboard focus stays on the pressed button through Replay and is not stolen back", async ({
    page,
  }, info) => {
    test.skip(info.project.name === "phone", "keyboard path is checked at desktop size");
    await ready(page);
    await settleOnReview(page);
    await btn(page, "Apply edit").focus();
    await page.keyboard.press("Enter");
    await expect(btn(page, "Undo")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(btn(page, "Replay")).toBeFocused();
    await page.keyboard.press("Enter");
    // Typing: the button is still the focused element (aria-disabled, not removed).
    expect(await state(page)).toBe("typing");
    await expect(btn(page, "Apply edit")).toBeFocused();
    await expect(btn(page, "Apply edit")).toHaveAttribute("aria-disabled", "true");
    // Tab away to the diff while it types; focus must not be pulled back.
    await page.keyboard.press("Tab");
    await expect(btn(page, "Deny")).toBeFocused();
    await expect.poll(() => state(page)).toBe("review");
    await expect(btn(page, "Deny")).toBeFocused();
  });

  test("Apply then Undo renders the original lines byte for byte", async ({ page }) => {
    await ready(page);
    await settleOnReview(page);
    const plain = async () =>
      page
        .locator(`${SCOPE} .bifrost-row[data-view="plain"] .bifrost-text`)
        .evaluateAll((els) => els.map((el) => el.textContent ?? ""));
    await btn(page, "Apply edit").click();
    await expect.poll(() => state(page)).toBe("applied");
    const applied = await plain();
    expect(applied).toHaveLength(10);
    expect(applied.join("\n")).toContain("fn welcome(name: &str) -> String {");
    expect(applied.join("\n")).not.toContain("greet");
    await btn(page, "Undo").click();
    await expect.poll(() => state(page)).toBe("undone");
    const restored = await plain();
    expect(restored).toHaveLength(10);
    expect(restored[2]).toBe("fn greet(name: &str) -> String {");
    expect(restored[7]).toBe('    println!("{}", greet("world"));');
    expect(restored.join("\n")).not.toContain("welcome");
  });

  test("reduced motion shows Review at once and switches states instantly", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await ready(page);
    await page.waitForTimeout(500);
    expect(await state(page)).toBe("review");
    await expect(rows(page, "diff")).toHaveCount(12);
    await btn(page, "Apply edit").click();
    await expect.poll(() => state(page)).toBe("applied");
    await expect(rows(page, "collapsed")).toHaveCount(2);
    const duration = await page
      .locator(`${SCOPE} .bifrost-row[data-view="collapsed"]`)
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(duration).toBe("0s");
    await btn(page, "Undo").click();
    await btn(page, "Replay").click();
    // Replay goes straight back to the complete Review card: no typing.
    expect(await state(page)).toBe("review");
    await expect(rows(page, "diff")).toHaveCount(12);
    await context.close();
  });

  test("controls are real buttons of at least 44 px", async ({ page }) => {
    await ready(page);
    for (const name of ["Apply edit", "Deny"]) {
      const box = await btn(page, name).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    }
    await expect(readout(page)).toHaveAttribute("aria-live", "polite");
  });

  test("the diff scrolls sideways when a line is wider than the card, and takes focus", async ({
    page,
  }, info) => {
    await ready(page);
    const diff = page.locator(`${SCOPE} .bifrost-diff`);
    await expect(diff).toHaveAttribute("tabindex", "0");
    await expect(diff).toHaveCSS("overflow-x", "auto");
    if (info.project.name === "phone") {
      const { scroll, client } = await diff.evaluate((el) => ({
        scroll: el.scrollWidth,
        client: el.clientWidth,
      }));
      expect(scroll).toBeGreaterThan(client);
      // The page itself does not scroll sideways.
      const page_ = await page.evaluate(() => ({
        s: document.documentElement.scrollWidth,
        c: document.documentElement.clientWidth,
      }));
      expect(page_.s).toBeLessThanOrEqual(page_.c);
      // Phone: a single line-number gutter.
      await expect(
        page.locator(`${SCOPE} .bifrost-row[data-kind="ctx"] .bifrost-old`).first(),
      ).toBeHidden();
    }
  });

  test("the stage element exists once with the caption", async ({ page }) => {
    await page.goto("/");
    await expect(stage(page, SCOPE)).toHaveCount(1);
    await expect(page.locator(`${SCOPE} .sim > figcaption`)).toHaveCount(1);
  });
});
