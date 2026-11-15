import { expect, test, type Page } from "@playwright/test";

// The letterbox bars are fixed over the page, so whatever Tab scrolls into view has to land
// between them (`scroll-padding` on <html>, src/styles/tokens.css). A short laptop window is
// where it showed: tabbing down from Bifrost, Cougar Connect's commit links stopped behind the
// bottom bar.
const SIZE = { width: 1280, height: 720 };
const SCENES = ["labq", "bifrost", "cougar-connect", "mastery-pilot"];
/** Layout is fractional and scrolling is whole pixels: allow the rounding, nothing more. */
const PX = 1;

/** The focused element: the scene it is in, and where it sits against the bars. */
async function focused(page: Page) {
  return page.evaluate((ids) => {
    const el = document.activeElement!;
    const rect = el.getBoundingClientRect();
    return {
      name: `${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 24)}"`,
      scene: ids.find((id) => document.getElementById(id)!.contains(el)) ?? null,
      commit: el.matches(".cougar-hashes a"),
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
      frameTop: document.querySelector(".frame-bar--top")!.getBoundingClientRect().bottom,
      frameBottom: document.querySelector(".frame-bar--bottom")!.getBoundingClientRect().top,
    };
  }, SCENES);
}

test(`Tab through the project scenes at ${SIZE.width} x ${SIZE.height}: every stop is fully between the bars`, async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "a desktop window size");
  await page.setViewportSize(SIZE);
  await page.goto("/");
  await page.waitForLoadState("load");
  await page.evaluate(() => document.fonts.ready);

  // Start where the first scene starts, and let Tab do all the scrolling from there.
  await page.evaluate((id) => {
    const heading = document.querySelector<HTMLElement>(`#${id} h2`)!;
    heading.scrollIntoView({ behavior: "instant", block: "start" });
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }, SCENES[0]!);

  const stops: Record<string, number> = {};
  let commits = 0;
  // Down through the four scenes, then back up through them.
  for (const key of ["Tab", "Shift+Tab"]) {
    for (let i = 0; i < 200; i++) {
      await page.keyboard.press(key);
      const at = await focused(page);
      if (!at.scene) break;
      const where = `${key} to ${at.name} in ${at.scene}`;
      stops[at.scene] = (stops[at.scene] ?? 0) + 1;
      if (at.commit) commits++;
      expect(at.height, where).toBeGreaterThan(0);
      expect(at.top, `${where}: under the top bar`).toBeGreaterThanOrEqual(at.frameTop - PX);
      expect(at.bottom, `${where}: behind the bottom bar`).toBeLessThanOrEqual(at.frameBottom + PX);
    }
  }
  for (const id of SCENES) expect(stops[id], id).toBeGreaterThan(0);
  const links = await page.locator("#cougar-connect .cougar-hashes a").count();
  expect(links).toBeGreaterThan(0);
  expect(commits).toBe(links * 2);
});
