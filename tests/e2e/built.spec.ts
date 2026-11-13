import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * "How it was built" (ADR-008): the timeline, the pull-request cards, the crew and the script
 * notes. Everything is checked against the committed snapshot the page renders from.
 */
interface Pr {
  number: number;
  title: string;
  mergedAt: string;
  url: string;
  branch: string;
  checks: { name: string; conclusion: string }[];
}
const history = JSON.parse(
  readFileSync(join(process.cwd(), "src", "data", "history.json"), "utf8"),
) as { url: string; prs: Pr[] };
const merged = [...history.prs].sort((a, b) => Date.parse(a.mergedAt) - Date.parse(b.mergedAt));
const first = merged[0]!;
const last = merged.at(-1)!;
const eleventh = history.prs.find((pr) => pr.number === 11)!;

const section = (page: Page) => page.locator("main > section#build");
const mark = (page: Page, n: number) => section(page).locator(`.tl-prs a[href="#pr-${n}"]`);
const card = (page: Page, n: number) => section(page).locator(`details#pr-${n}`);
const summary = (page: Page, n: number) => card(page, n).locator("summary");

/** Puts the section's top under the top bar and waits for the interaction to load. */
async function arrive(page: Page) {
  const loaded = page.waitForResponse((r) => /build-timeline\.[\w-]+\.js/.test(r.url()));
  await page.goto("/");
  // The hero arms its pin after load, which changes the page's height: scroll after that.
  await page.waitForLoadState("load");
  await section(page).evaluate((el) => el.scrollIntoView({ behavior: "instant", block: "start" }));
  await loaded;
  await expect(section(page).locator("h2")).toBeInViewport();
}

/** The visible frame between the bars, and where the element sits in it. */
async function inFrame(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const rect = document.querySelector(sel)!.getBoundingClientRect();
    const top = document.querySelector(".frame-bar--top")!.getBoundingClientRect().bottom;
    const bottom = document.querySelector(".frame-bar--bottom")!.getBoundingClientRect().top;
    return { top: rect.top, bottom: rect.bottom, frameTop: top, frameBottom: bottom };
  }, selector);
}

const pageOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe("how it was built, without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("renders every merged pull request with its real number, title and link", async ({
    page,
  }) => {
    await page.goto("/");
    const s = section(page);
    await expect(s.getByRole("heading", { level: 2, name: "How it was built" })).toBeVisible();
    await expect(s).not.toHaveAttribute("data-world");
    await expect(s.locator(".slug")).toContainText(`${history.prs.length} PULL REQUESTS`);

    await expect(s.locator("details.pr")).toHaveCount(history.prs.length);
    await expect(s.locator(".tl-prs a")).toHaveCount(history.prs.length);
    for (const pr of history.prs) {
      await expect(summary(page, pr.number)).toContainText(`#${pr.number}`);
      await expect(summary(page, pr.number)).toContainText(pr.title);
      await expect(mark(page, pr.number)).toHaveAccessibleName(
        `Pull request ${pr.number}: ${pr.title}`,
      );
      // In the DOM while closed: real content, not something a script fills in.
      await expect(card(page, pr.number).locator(`a[href="${pr.url}"]`)).toHaveCount(1);
      await expect(card(page, pr.number).locator(".pr-facts")).toContainText(pr.branch);
    }
    // Cards and marks are both in merge order.
    const order = await s
      .locator("details.pr")
      .evaluateAll((els) => els.map((el) => Number(el.id.slice(3))));
    expect(order).toEqual(merged.map((pr) => pr.number));
  });

  test("a card opens from its summary and shows who did the work and what CI said", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(card(page, 11)).not.toHaveAttribute("open");
    await summary(page, 11).click();
    await expect(card(page, 11)).toHaveAttribute("open");
    await expect(summary(page, 11).locator(".credit-badge")).toHaveText(["Sonnet ×4 · Build"]);
    await expect(card(page, 11).locator(".credit")).toContainText("Four Sonnet implementers");
    const passed = eleventh.checks.filter((c) => c.conclusion === "success").length;
    await expect(summary(page, 11).locator(".pr-ci")).toContainText(
      `${passed}/${eleventh.checks.length} checks`,
    );
    for (const check of eleventh.checks)
      await expect(card(page, 11).locator(".pr-facts")).toContainText(check.name);
    // One card at a time, natively: the cards share a name.
    await summary(page, 3).click();
    await expect(card(page, 3)).toHaveAttribute("open");
    await expect(card(page, 11)).not.toHaveAttribute("open");
  });

  test("a pull request the record names no model for says so, and credits no one", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(summary(page, 5).locator(".credit-badge")).toHaveCount(0);
    await expect(summary(page, 5)).toContainText("Model not recorded");
    await expect(card(page, 5).locator(".credit")).toHaveCount(0);
  });

  test("a timeline mark is a plain link to its card", async ({ page }) => {
    await page.goto("/");
    await mark(page, last.number).click();
    await expect(page).toHaveURL(new RegExp(`#pr-${last.number}$`));
    await expect(summary(page, last.number)).toBeInViewport();
  });

  test("lists the crew and the decision records", async ({ page }) => {
    await page.goto("/");
    const s = section(page);
    await expect(s.locator(".crew > li")).toHaveCount(4);
    await expect(s.locator(".crew-model")).toHaveText(["Opus", "Fable", "Sonnet", "Haiku"]);
    const adrs = s.locator(".adrs a");
    expect(await adrs.count()).toBeGreaterThanOrEqual(8);
    await expect(adrs.first()).toHaveAttribute(
      "href",
      `${history.url}/blob/main/DECISIONS.md#adr-001-astro-as-the-framework`,
    );
    await expect(adrs.first()).toHaveAccessibleName("ADR-001: Astro as the framework");
  });
});

test.describe("how it was built", () => {
  test("headings keep the page outline: one h2, then h3s", async ({ page }) => {
    await page.goto("/");
    const levels = await section(page)
      .locator("h1, h2, h3, h4")
      .evaluateAll((els) => els.map((el) => `${el.tagName} ${el.textContent!.trim()}`));
    expect(levels).toEqual([
      "H2 How it was built",
      "H3 Timeline",
      "H3 Pull requests",
      "H3 Crew",
      "H3 Script notes",
    ]);
  });

  test("the interaction is not part of the initial load", async ({ page }) => {
    const requested: string[] = [];
    page.on("request", (r) => requested.push(r.url()));
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(requested.filter((u) => /build-timeline/.test(u))).toHaveLength(0);
    const loaded = page.waitForResponse((r) => /build-timeline\.[\w-]+\.js/.test(r.url()));
    await section(page).scrollIntoViewIfNeeded();
    await loaded;
    expect(requested.filter((u) => /build-timeline/.test(u))).toHaveLength(1);
  });

  test("a mark opens its card in place: no cut, focus on the card, the card in the frame", async ({
    page,
  }) => {
    await arrive(page);
    await mark(page, last.number).click();
    await expect(card(page, last.number)).toHaveAttribute("open");
    await expect(summary(page, last.number)).toBeFocused();
    await expect(mark(page, last.number)).toHaveAttribute("aria-current", "true");
    await expect(section(page).locator(".tl-prs [aria-current]")).toHaveCount(1);
    // The scene-cut wipe did not run, and the URL did not change.
    expect(await page.evaluate(() => document.querySelector(".wipe")!.getAnimations().length)).toBe(
      0,
    );
    expect(new URL(page.url()).hash).toBe("");
    const box = await inFrame(page, `#pr-${last.number} > summary`);
    expect(box.top).toBeGreaterThanOrEqual(box.frameTop);
    expect(box.bottom).toBeLessThanOrEqual(box.frameBottom);
    // Its branch and commits are picked out on the timeline; no other is.
    const lit = await section(page)
      .locator(".tl-art .is-on")
      .evaluateAll((els) => [...new Set(els.map((el) => (el as HTMLElement).dataset["pr"]))]);
    expect(lit).toEqual([String(last.number)]);
  });

  test("opening another mark moves the selection, and closing a card clears it", async ({
    page,
  }) => {
    await arrive(page);
    await mark(page, first.number).click();
    await mark(page, 11).click();
    await expect(card(page, 11)).toHaveAttribute("open");
    await expect(card(page, first.number)).not.toHaveAttribute("open");
    await expect(mark(page, 11)).toHaveAttribute("aria-current", "true");
    await expect(mark(page, first.number)).not.toHaveAttribute("aria-current");
    await summary(page, 11).click();
    await expect(card(page, 11)).not.toHaveAttribute("open");
    await expect(section(page).locator(".tl-prs [aria-current]")).toHaveCount(0);
    await expect(section(page).locator(".tl-art .is-on")).toHaveCount(0);
  });

  test("works by keyboard: arrows move between marks, Enter opens, the summary toggles", async ({
    page,
  }) => {
    await arrive(page);
    await mark(page, first.number).focus();
    await page.keyboard.press("ArrowRight");
    await expect(mark(page, merged[1]!.number)).toBeFocused();
    await page.keyboard.press("End");
    await expect(mark(page, last.number)).toBeFocused();
    await page.keyboard.press("Home");
    await expect(mark(page, first.number)).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(mark(page, first.number)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(card(page, first.number)).toHaveAttribute("open");
    await expect(summary(page, first.number)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(card(page, first.number)).not.toHaveAttribute("open");
    // A card opened from its own summary shows on the timeline too.
    await summary(page, 7).focus();
    await page.keyboard.press("Enter");
    await expect(card(page, 7)).toHaveAttribute("open");
    await expect(mark(page, 7)).toHaveAttribute("aria-current", "true");
    // Tab from a summary reaches the card's own link.
    await page.keyboard.press("Tab");
    await expect(card(page, 7).locator("a.pr-link")).toBeFocused();
  });

  test("a crew credit opens the card it names", async ({ page }) => {
    await arrive(page);
    const credit = section(page).locator('.crew-on a[href="#pr-13"]');
    await credit.scrollIntoViewIfNeeded();
    await credit.click();
    await expect(card(page, 13)).toHaveAttribute("open");
    await expect(summary(page, 13)).toBeFocused();
    await expect(summary(page, 13)).toBeInViewport();
  });

  test("a page opened on a card's link shows that card", async ({ page }) => {
    await page.goto("/#pr-7");
    await expect(card(page, 7)).toHaveAttribute("open");
    await expect(mark(page, 7)).toHaveAttribute("aria-current", "true");
    await expect(summary(page, 7)).toBeInViewport();
  });

  test("every target is at least 44 px and nothing is hover-only", async ({ page }) => {
    await arrive(page);
    const targets = section(page).locator(".tl-prs a, details.pr > summary, .crew-on a");
    for (const box of await targets.evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { w: r.width, h: r.height, name: el.textContent!.trim().slice(0, 24) };
      }),
    )) {
      expect(box.w, box.name).toBeGreaterThanOrEqual(44);
      expect(box.h, box.name).toBeGreaterThanOrEqual(44);
    }
    await mark(page, 2).click();
    await expect(card(page, 2).locator("a.pr-link")).toBeVisible();
    const link = await card(page, 2).locator("a.pr-link").boundingBox();
    expect(link!.height).toBeGreaterThanOrEqual(44);
  });

  test("the strip item cuts to the section and focuses its heading", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Scenes" })
      .getByRole("link", { name: "Scene 5: How it was built" })
      .click();
    await expect(section(page).locator("h2")).toBeFocused();
    await expect(page).toHaveURL(/#build$/);
    const box = await inFrame(page, "#build");
    expect(Math.abs(box.top - box.frameTop)).toBeLessThanOrEqual(1);
    await expect(
      page.getByRole("navigation", { name: "Scenes" }).locator("[aria-current]"),
    ).toHaveAccessibleName("Scene 5: How it was built");
  });

  test("the timecode counts the section as the sixth", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#build");
    // Reduced motion shows the start of the current section: hero 0, four scenes, then this.
    await expect(page.locator("#timecode")).toHaveText("00:02:30:00");
  });

  test("no console errors while using it", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));
    await arrive(page);
    await mark(page, 4).click();
    await mark(page, 15).click();
    expect(errors).toEqual([]);
  });

  test("desktop: the timeline stays on screen with the open card", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "the timeline sticks on a desktop window");
    await arrive(page);
    const strip = section(page).locator(".tl");
    await expect(strip).toHaveCSS("position", "sticky");
    expect(await strip.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
    await mark(page, last.number).click();
    await expect(mark(page, last.number)).toBeInViewport();
    const tl = await inFrame(page, "#build .tl");
    const open = await inFrame(page, `#pr-${last.number}`);
    expect(Math.abs(tl.top - tl.frameTop)).toBeLessThanOrEqual(1);
    // The card is whole, under the timeline and above the bottom bar.
    expect(open.top).toBeGreaterThanOrEqual(tl.bottom);
    expect(open.bottom).toBeLessThanOrEqual(open.frameBottom);
    // Tabbing back up the list never puts the focused row under the stuck timeline.
    await summary(page, last.number).focus();
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Shift+Tab");
      const focused = await page.evaluate(() => {
        const r = document.activeElement!.getBoundingClientRect();
        const t = document.querySelector("#build .tl")!.getBoundingClientRect();
        return { top: r.top, stripBottom: t.bottom };
      });
      expect(focused.top).toBeGreaterThanOrEqual(focused.stripBottom);
    }
  });

  test("desktop: a short window does not stick the timeline", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "a desktop window");
    await page.setViewportSize({ width: 1280, height: 700 });
    await arrive(page);
    await expect(section(page).locator(".tl")).toHaveCSS("position", "static");
    await mark(page, last.number).click();
    const open = await inFrame(page, `#pr-${last.number} > summary`);
    expect(open.top).toBeGreaterThanOrEqual(open.frameTop);
    expect(open.bottom).toBeLessThanOrEqual(open.frameBottom);
  });

  test("phone: the timeline is a strip that scrolls sideways by touch, the page does not", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "phone", "the phone project");
    await arrive(page);
    const strip = section(page).locator(".tl");
    await expect(strip).toHaveCSS("position", "static");
    expect(await strip.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeGreaterThan(0);
    expect(await strip.evaluate((el) => getComputedStyle(el).overflowX)).toBe("auto");
    expect(await pageOverflow(page)).toBeLessThanOrEqual(0);

    // The first mark is on screen; the last is off to the right until the strip is scrolled.
    await strip.scrollIntoViewIfNeeded();
    await expect(mark(page, first.number)).toBeInViewport();
    await expect(mark(page, last.number)).not.toBeInViewport();
    await mark(page, first.number).tap();
    await expect(card(page, first.number)).toHaveAttribute("open");
    await expect(summary(page, first.number)).toBeInViewport();

    // Scrolling the strip moves it, not the page.
    await strip.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);
    await strip.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
    expect(await page.evaluate(() => window.scrollX)).toBe(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
    await expect(mark(page, last.number)).toBeInViewport();
    await mark(page, last.number).tap();
    await expect(card(page, last.number)).toHaveAttribute("open");
    await expect(card(page, first.number)).not.toHaveAttribute("open");
    await expect(mark(page, last.number)).toHaveAttribute("aria-current", "true");

    // A card opened lower down brings its mark back into the strip's view.
    await summary(page, first.number).tap();
    await strip.scrollIntoViewIfNeeded();
    await expect(mark(page, first.number)).toBeInViewport();
  });

  test("phone: the layout is one column and cards read top to bottom", async ({ page }, info) => {
    test.skip(info.project.name !== "phone", "the phone project");
    await arrive(page);
    const lefts = await section(page)
      .locator(".built-prs, .built-side")
      .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().left)));
    expect(new Set(lefts).size).toBe(1);
    await summary(page, 11).tap();
    const inside = await card(page, 11).evaluate((el) => {
      const outer = el.getBoundingClientRect();
      return [...el.querySelectorAll("*")].every((child) => {
        const r = child.getBoundingClientRect();
        return r.width === 0 || (r.left >= outer.left - 1 && r.right <= outer.right + 1);
      });
    });
    expect(inside).toBe(true);
  });

  test("no horizontal page scroll at 320 px, closed or open", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await arrive(page);
    expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
    await summary(page, 11).click();
    await summary(page, 11).scrollIntoViewIfNeeded();
    expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
    await section(page).locator(".adrs").scrollIntoViewIfNeeded();
    expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
    // Everything but the strip's own content fits the column.
    const wide = await section(page).evaluate((el) =>
      [...el.querySelectorAll<HTMLElement>("*")]
        .filter((child) => !child.closest(".tl-track"))
        .filter((child) => child.getBoundingClientRect().right > window.innerWidth + 1)
        .map((child) => child.className),
    );
    expect(wide).toEqual([]);
  });
});

test.describe("how it was built, with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("a card opens with no animation, from a mark and from its summary", async ({ page }) => {
    await arrive(page);
    await mark(page, 11).click();
    await expect(card(page, 11)).toHaveAttribute("open");
    await expect(card(page, 11).locator(".pr-panel")).toHaveCSS("animation-name", "none");
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await summary(page, 3).click();
    await expect(card(page, 3)).toHaveAttribute("open");
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await expect(mark(page, 3)).toHaveAttribute("aria-current", "true");
  });
});

test.describe("how it was built, with motion", () => {
  test("the only motion is the card's reveal, and nothing transitions on the timeline", async ({
    page,
  }) => {
    await arrive(page);
    await summary(page, 2).click();
    await expect(card(page, 2).locator(".pr-panel")).toHaveCSS("animation-name", "reveal");
    await expect(mark(page, 2)).toHaveAttribute("aria-current", "true");
    for (const selector of [".tl-prs a", ".tl-mark", ".tl-branch", ".tl-dot"]) {
      const duration = await section(page)
        .locator(selector)
        .first()
        .evaluate((el) => getComputedStyle(el).transitionDuration);
      expect(duration).toBe("0s");
    }
  });
});
