import { expect, type Page } from "@playwright/test";

/** The probe page exists only in the test build (PUBLIC_SIM_PROBE=1). Real simulations reuse these helpers. */
export const PROBE_URL = "/sim-probe/probe/";

export function stage(page: Page, scope = "#sim-probe") {
  return page.locator(`${scope} .sim-stage`);
}

/** True where the visitor taps instead of waiting for autoplay (the phone project). */
export async function isTouchFirst(page: Page): Promise<boolean> {
  return page.evaluate(() => window.matchMedia("(pointer: coarse)").matches);
}

/** Scrolls the stage until at least 60% of it is visible, which is what starts playback. */
export async function scrollStageIntoView(page: Page, scope = "#sim-probe") {
  await stage(page, scope).evaluate((el) => {
    el.scrollIntoView({ block: "center" });
  });
}

/** The stage's size, rounded, to compare before and after hydration or a run. */
export async function stageSize(page: Page, scope = "#sim-probe") {
  const box = await stage(page, scope).boundingBox();
  expect(box).not.toBeNull();
  return { w: Math.round(box?.width ?? 0), h: Math.round(box?.height ?? 0) };
}

/** Waits for the island's React tree to be live (the island loses its `ssr` attribute). */
export async function waitForHydration(page: Page, scope = "#sim-probe") {
  await expect(page.locator(`${scope} astro-island`)).not.toHaveAttribute("ssr", /.*/, {
    timeout: 10_000,
  });
}

/**
 * LabQ and Bifrost pin on a large desktop screen, where the scroll plays them and they do not
 * play by themselves (spec 4.4, tests/e2e/scroll-stage.spec.ts). Play-on-entry still applies in
 * a desktop window too short to pin, so the tests of it run in one. No-op on the phone project.
 */
export async function useWindowTooShortToPin(page: Page) {
  const size = page.viewportSize();
  if (size && size.width >= 1024) await page.setViewportSize({ width: size.width, height: 740 });
}
