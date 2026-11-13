import { expect, test, type Page } from "@playwright/test";
import {
  isTouchFirst,
  scrollStageIntoView,
  stage,
  stageSize,
  waitForHydration,
} from "./sim-helpers";

const SCOPE = "#mastery-pilot";
const rows = (page: Page) => page.locator(`${SCOPE} .mastery-row`);
const visibleCount = (page: Page) =>
  page.locator(`${SCOPE} .mastery-row[data-visible="true"]`).count();
const meter = (page: Page) => page.locator(`${SCOPE} [data-testid="mastery-meter"]`);
const answerBtn = (page: Page, line: string) =>
  page.getByRole("button", { name: `Answer "${line}"` });

async function load(page: Page) {
  await page.goto("/");
  // client:visible: the island hydrates once its stage is near the viewport.
  await stage(page, SCOPE).scrollIntoViewIfNeeded();
  await waitForHydration(page, SCOPE);
}

/** Desktop plays the first exchange on view; a phone waits, so Restart gets it going. */
async function reachFirstExchange(page: Page) {
  await scrollStageIntoView(page, SCOPE);
  if (await isTouchFirst(page)) {
    await page.getByRole("button", { name: "Restart" }).tap();
  }
  await expect(meter(page)).toHaveText("1 of 4");
  await expect.poll(() => visibleCount(page)).toBe(2);
}

test("the still shows all eight lines without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(rows(page)).toHaveCount(8);
  await expect(page.locator(`${SCOPE} .mastery-row[data-visible="true"]`)).toHaveCount(8);
  await expect(page.locator(`${SCOPE} .mastery-sim`)).toContainText("Oh, 8.");
  await expect(page.locator(`${SCOPE} .mastery-chip`)).toHaveCount(3);
  await expect(meter(page)).toHaveText("4 of 4");
  await expect(page.getByRole("button", { name: "Restart" })).toHaveCount(0);
  await expect(page.locator(`${SCOPE} figcaption`)).toContainText("Qwen3-4B");
  await context.close();
});

test("hydration keeps the stage the same size", async ({ page }) => {
  await page.goto("/");
  const before = await stageSize(page, SCOPE);
  await stage(page, SCOPE).scrollIntoViewIfNeeded();
  await waitForHydration(page, SCOPE);
  expect(await stageSize(page, SCOPE)).toEqual(before);
});

test("plays the first exchange on view (desktop) or waits for a tap (phone)", async ({ page }) => {
  await load(page);
  await scrollStageIntoView(page, SCOPE);
  if (await isTouchFirst(page)) {
    await page.waitForTimeout(600);
    expect(await visibleCount(page)).toBe(8);
    await page.getByRole("button", { name: "Restart" }).tap();
  }
  await expect(meter(page)).toHaveText("1 of 4");
  await expect.poll(() => visibleCount(page)).toBe(2);
  await expect(answerBtn(page, "20")).toBeVisible();
});

test("steps through the session, labelled with the student's next line", async ({ page }) => {
  await load(page);
  await reachFirstExchange(page);
  const size = await stageSize(page, SCOPE);
  await answerBtn(page, "20").click();
  await expect(meter(page)).toHaveText("2 of 4");
  await expect.poll(() => visibleCount(page)).toBe(4);
  await answerBtn(page, "Oh, 8.").click();
  await expect.poll(() => visibleCount(page)).toBe(6);
  await answerBtn(page, "So x is 4?").click();
  await expect(meter(page)).toHaveText("4 of 4");
  await expect.poll(() => visibleCount(page)).toBe(8);
  await expect(page.locator(`${SCOPE} .sim-readout`)).toHaveText(/3 of 4/);
  await expect(page.getByRole("button", { name: /^Answer/ })).toHaveCount(0);
  expect(await stageSize(page, SCOPE)).toEqual(size);
});

test("hidden lines keep their space; Show all and Restart work", async ({ page }) => {
  await load(page);
  await reachFirstExchange(page);
  await expect(rows(page).nth(7)).toHaveCSS("visibility", "hidden");
  await page.getByRole("button", { name: "Show all" }).click();
  await expect.poll(() => visibleCount(page)).toBe(8);
  await page.getByRole("button", { name: "Restart" }).click();
  await expect(meter(page)).toHaveText("1 of 4");
  await expect.poll(() => visibleCount(page)).toBe(2);
});

test("the keyboard alone runs the whole session", async ({ page }, info) => {
  test.skip(info.project.name === "phone", "keyboard path is checked at desktop size");
  await load(page);
  await reachFirstExchange(page);
  for (const line of ["20", "Oh, 8.", "So x is 4?"]) {
    const button = answerBtn(page, line);
    await expect(button).toBeEnabled();
    await button.focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => visibleCount(page)).toBeGreaterThan(0);
    await expect(answerBtn(page, line)).toHaveCount(0);
    // Wait for the tutor's reply so the next button is enabled.
    await page.waitForTimeout(700);
  }
  await expect(meter(page)).toHaveText("4 of 4");
  await expect(page.getByRole("button", { name: "Restart" })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(meter(page)).toHaveText("1 of 4");
});

test("a new tutor line is announced in a polite live region, and focus stays on Answer", async ({
  page,
}, info) => {
  await load(page);
  await reachFirstExchange(page);
  const live = page.locator(`${SCOPE} [data-testid="sim-announce"]`);
  await expect(live).toHaveAttribute("aria-live", "polite");
  await expect(live).toContainText("What is the first step");
  const button = answerBtn(page, "20");
  if (info.project.name !== "phone") {
    await button.focus();
    await page.keyboard.press("Enter");
    // During the reply pause the button is aria-disabled but stays focused.
    await expect(page.getByRole("button", { name: /^Answer/ })).toBeFocused();
    await expect(page.getByRole("button", { name: /^Answer/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  } else {
    await button.tap();
  }
  await expect(live).toContainText("Subtract 6 from both sides");
  await expect(live).toContainText("algebra_linear_equations.md");
});

test("reduced motion shows the whole transcript and steps instantly", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await load(page);
  expect(await visibleCount(page)).toBe(8);
  await expect(meter(page)).toHaveText("4 of 4");
  await expect(page.getByRole("button", { name: /^Answer|Show all/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Restart" }).click();
  await expect(meter(page)).toHaveText("1 of 4");
  await answerBtn(page, "20").click();
  // No pause: the tutor's reply is there at once.
  expect(await visibleCount(page)).toBe(4);
  await expect(rows(page).first()).toHaveCSS("transition-duration", "0s");
  await context.close();
});

test("controls are at least 44 px", async ({ page }) => {
  await load(page);
  await reachFirstExchange(page);
  for (const name of [/^Answer/, /^Show all$/, /^Restart$/]) {
    const box = await page.getByRole("button", { name }).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});

for (const size of [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1024x768", width: 1024, height: 768 },
]) {
  test(`every line sits fully inside the stage at ${size.name}`, async ({ browser }, info) => {
    test.skip(info.project.name === "phone", "desktop viewports");
    const context = await browser.newContext({ viewport: size });
    const page = await context.newPage();
    await load(page);
    await expectLinesInside(page);
    await context.close();
  });
}

test("every line sits fully inside the stage on a phone", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "Pixel 7 project");
  await load(page);
  await expectLinesInside(page);
});

async function expectLinesInside(page: Page) {
  const stage = page.locator(`${SCOPE} .sim-stage`);
  await stage.scrollIntoViewIfNeeded();
  const box = await stage.boundingBox();
  expect(box).not.toBeNull();
  const b = box ?? { x: 0, y: 0, width: 0, height: 0 };
  const hasScroll = await stage.evaluate((el) => el.scrollHeight > el.clientHeight + 1);
  expect(hasScroll).toBe(false);
  for (const row of await rows(page).all()) {
    const r = await row.boundingBox();
    expect(r).not.toBeNull();
    const rb = r ?? { x: 0, y: 0, width: 0, height: 0 };
    expect(rb.x).toBeGreaterThanOrEqual(b.x);
    expect(rb.y).toBeGreaterThanOrEqual(b.y);
    expect(rb.x + rb.width).toBeLessThanOrEqual(b.x + b.width + 0.5);
    expect(rb.y + rb.height).toBeLessThanOrEqual(b.y + b.height + 0.5);
  }
}
