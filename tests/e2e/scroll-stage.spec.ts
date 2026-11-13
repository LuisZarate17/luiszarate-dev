import { expect, test, type Page } from "@playwright/test";

// Scroll staging (spec 4.4, ADR-007): LabQ and Bifrost hold in the frame on a large desktop
// screen and the scroll plays their simulations. Everywhere else they are ordinary blocks.
const PINNED = ["labq", "bifrost"];
const PLAIN = ["cougar-connect", "mastery-pilot"];
const DESKTOP = { width: 1440, height: 900 };
const BAR = 56;
const FRAME = DESKTOP.height - 2 * BAR;
const TRAVEL = FRAME * 0.75;

const wrapper = (page: Page, id: string) => page.locator(`main > .scene-pin[data-scene="${id}"]`);
const armed = (page: Page, id: string) =>
  wrapper(page, id).evaluate((el) => el.classList.contains("is-armed"));

/** Two frames: one for the scroll event's read, one for React to commit what it dispatched. */
async function settle(page: Page) {
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );
}

async function open(page: Page, url = "/") {
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  await settle(page);
}

/** Scrolls to a point of a scene's hold: 0 is where it starts, 1 where it ends. */
async function scrollToProgress(page: Page, id: string, progress: number) {
  await page.evaluate(
    ([sceneId, p, travel]) => {
      const el = document.querySelector<HTMLElement>(`[data-scene="${sceneId}"]`)!;
      const barTop = parseFloat(getComputedStyle(document.body).paddingTop);
      const top = el.getBoundingClientRect().top + window.scrollY - barTop;
      window.scrollTo(0, top + (p as number) * (travel as number));
    },
    [id, progress, TRAVEL] as const,
  );
  await settle(page);
}

/** Scrolls through part of a hold in small steps, as a wheel would. */
async function scrollThrough(page: Page, id: string, from: number, to: number) {
  const steps = Math.max(1, Math.round(Math.abs(to - from) / 0.05));
  for (let i = 0; i <= steps; i++) {
    await scrollToProgress(page, id, from + ((to - from) * i) / steps);
  }
}

async function hydrated(page: Page, id: string) {
  await expect(page.locator(`#${id} astro-island`)).not.toHaveAttribute("ssr", /.*/, {
    timeout: 10_000,
  });
  await settle(page);
}

const top = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el) => el.getBoundingClientRect().top);

const labqReadout = (page: Page) => page.locator("#labq .sim-readout-value").allTextContents();
const bifrostState = (page: Page) =>
  page.locator("#bifrost .sim-still").getAttribute("data-sim-state");

test.describe("scroll staging on a large desktop screen", () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "pinning is a desktop behavior");
    await page.setViewportSize(DESKTOP);
    await open(page);
  });

  test("LabQ and Bifrost are armed; Cougar Connect and Mastery Pilot never are", async ({
    page,
  }) => {
    for (const id of PINNED) {
      expect(await armed(page, id)).toBe(true);
      const heights = await wrapper(page, id).evaluate((el) => ({
        wrapper: el.getBoundingClientRect().height,
        scene: el.querySelector(".scene")!.getBoundingClientRect().height,
        position: getComputedStyle(el.querySelector(".scene")!).position,
      }));
      // The hold is 75% of the frame of extra scroll.
      expect(heights.scene).toBeCloseTo(FRAME, 0);
      expect(heights.wrapper).toBeCloseTo(FRAME + TRAVEL, 0);
      expect(heights.position).toBe("sticky");
    }
    for (const id of PLAIN) {
      await expect(page.locator(`main > section#${id}`)).toHaveCount(1);
      await expect(page.locator(`.scene-pin #${id}`)).toHaveCount(0);
    }
    await expect(page.locator(".scene-pin")).toHaveCount(2);
    await expect(page.locator(".is-armed .scene")).toHaveCount(2);
  });

  test("no ancestor of a pinned scene scrolls, so sticky holds in every browser", async ({
    page,
  }) => {
    const overflows = await page.evaluate(() => {
      const found: string[] = [];
      for (const el of document.querySelectorAll(".scene-pin")) {
        for (let a = el.parentElement; a; a = a.parentElement) {
          const { overflowX, overflowY } = getComputedStyle(a);
          found.push(overflowX, overflowY);
        }
      }
      return [...new Set(found)];
    });
    for (const value of overflows) expect(["visible", "clip"]).toContain(value);
  });

  test("the scene holds in the frame and only the simulation changes", async ({ page }) => {
    await scrollToProgress(page, "labq", 0);
    await hydrated(page, "labq");
    const rects = () =>
      page.evaluate(() =>
        ["#labq", "#labq h2", "#labq .stats", "#labq .scene-links", "#labq .sim-stage"].map((s) => {
          const r = document.querySelector(s)!.getBoundingClientRect();
          return [r.top, r.left, r.width, r.height].map(Math.round).join(",");
        }),
      );
    const before = await rects();
    expect(await top(page, "#labq")).toBeCloseTo(BAR, 0);
    for (const p of [0.25, 0.5, 0.75, 1]) {
      await scrollToProgress(page, "labq", p);
      expect(await rects()).toEqual(before);
    }
    // Past the hold the scene leaves with the scroll, like any block.
    await scrollToProgress(page, "labq", 1.2);
    expect(await top(page, "#labq")).toBeCloseTo(BAR - 0.2 * TRAVEL, 0);
  });

  test("scrolling through LabQ plays the race: without, then with the constraint", async ({
    page,
  }) => {
    await scrollToProgress(page, "labq", 0);
    await hydrated(page, "labq");
    // At the start of the hold nothing has played: the scene shows its still.
    await expect(page.locator("#labq .labq-still")).toBeVisible();

    const seen: string[] = [];
    const steps = 40;
    for (let i = 1; i <= steps; i++) {
      await scrollToProgress(page, "labq", i / steps);
      const state = await page.locator("#labq canvas").getAttribute("data-sim-state");
      const values = (await labqReadout(page)).join(" / ");
      const frame = `${state}: ${values}`;
      if (seen.at(-1) !== frame) seen.push(frame);
    }
    // The end states arrive in order, with the runs between them.
    expect(seen).toEqual([
      "running: 0 / 0 / 0",
      "without: 50 / 0 / 1,225",
      "running: 0 / 0 / 0",
      "with: 1 / 49 / 0",
    ]);

    // After the hold the controls are the visitor's again.
    await scrollToProgress(page, "labq", 1.1);
    await page.getByRole("button", { name: "Without constraint" }).click();
    await expect
      .poll(() => page.locator("#labq canvas").getAttribute("data-sim-state"), { timeout: 5000 })
      .toBe("without");
    expect(await labqReadout(page)).toEqual(["50", "0", "1,225"]);
  });

  test("leaving a LabQ hold part-way settles the run it reached; above it, the still", async ({
    page,
  }) => {
    await scrollToProgress(page, "labq", 0);
    await hydrated(page, "labq");
    await scrollThrough(page, "labq", 0, 0.5);
    await expect(page.locator("#labq canvas")).toHaveAttribute("data-sim-state", "without");
    // Scrolling back above the hold returns the stage to its still.
    await scrollThrough(page, "labq", 0.5, -0.2);
    await expect(page.locator("#labq .labq-still")).toBeVisible();
    await expect(page.locator("#labq canvas")).toHaveCount(0);
  });

  test("scrolling through Bifrost types the diff, applies it, and Undo works after", async ({
    page,
  }) => {
    await scrollToProgress(page, "bifrost", 0);
    await hydrated(page, "bifrost");
    expect(await bifrostState(page)).toBe("review");

    await scrollThrough(page, "bifrost", 0, 0.25);
    expect(await bifrostState(page)).toBe("typing");
    const typed = await page.locator('#bifrost .bifrost-row[data-typed="yes"]').count();
    expect(typed).toBeGreaterThan(0);
    expect(typed).toBeLessThan(12);
    // A scrubbed frame is held: it does not type on by itself.
    await page.waitForTimeout(300);
    expect(await page.locator('#bifrost .bifrost-row[data-typed="yes"]').count()).toBe(typed);

    await scrollThrough(page, "bifrost", 0.25, 0.7);
    expect(await bifrostState(page)).toBe("review");
    await expect(page.locator('#bifrost .bifrost-row[data-typed="yes"]')).toHaveCount(12);
    await expect(page.locator("#bifrost .sim-readout")).toContainText("unchanged");

    await scrollThrough(page, "bifrost", 0.7, 1);
    expect(await bifrostState(page)).toBe("applied");
    await expect(page.locator("#bifrost .bifrost-chip")).toHaveText("Applied");
    await expect(page.locator("#bifrost .sim-readout")).toContainText("edited");

    // Past the hold the card stays applied and is live: Undo restores the file.
    await scrollThrough(page, "bifrost", 1, 1.15);
    expect(await bifrostState(page)).toBe("applied");
    await page.locator("#bifrost .sim-controls").getByRole("button", { name: "Undo" }).click();
    expect(await bifrostState(page)).toBe("undone");
    await expect(page.locator("#bifrost .sim-readout")).toContainText("restored, byte for byte");
  });

  test("a card released mid-hold is live: Deny works on it", async ({ page }) => {
    await scrollToProgress(page, "bifrost", 0);
    await hydrated(page, "bifrost");
    await scrollThrough(page, "bifrost", 0, 0.3);
    expect(await bifrostState(page)).toBe("typing");
    // Opening the drawer ends the hold; the half-typed card finishes as Review.
    await page.locator("#bifrost details.drawer > summary").click();
    await settle(page);
    expect(await armed(page, "bifrost")).toBe(false);
    expect(await bifrostState(page)).toBe("review");
    await page.locator("#bifrost .sim-controls").getByRole("button", { name: "Deny" }).click();
    expect(await bifrostState(page)).toBe("declined");
  });

  test("an armed scene does not also play by itself when it comes into view", async ({ page }) => {
    for (const id of PINNED) {
      // Fully in view, just short of the hold.
      await scrollToProgress(page, id, -0.05);
      await hydrated(page, id);
    }
    await scrollToProgress(page, "bifrost", -0.05);
    await page.waitForTimeout(700);
    expect(await bifrostState(page)).toBe("review");
    await expect(page.locator('#bifrost .bifrost-row[data-typed="yes"]')).toHaveCount(12);
    await scrollToProgress(page, "labq", -0.05);
    await page.waitForTimeout(700);
    await expect(page.locator("#labq .labq-still")).toBeVisible();
    await expect(page.locator("#labq canvas")).toHaveCount(0);
  });

  test("opening the drawer releases the pin and closing it arms it again, in place", async ({
    page,
  }) => {
    await scrollToProgress(page, "bifrost", 0.5);
    await hydrated(page, "bifrost");
    const summary = "#bifrost details.drawer > summary";
    const before = await top(page, summary);

    await page.locator(summary).click();
    await settle(page);
    expect(await armed(page, "bifrost")).toBe(false);
    expect(
      await wrapper(page, "bifrost").evaluate((el) => getComputedStyle(el, "::after").content),
    ).toBe("none");
    // The bar the visitor pressed has not moved, and the scene is still on screen.
    expect(Math.abs((await top(page, summary)) - before)).toBeLessThanOrEqual(1);
    await expect(page.locator("#bifrost .drawer-panel")).toBeInViewport();

    // Scrolling no longer drives the simulation: the card stays as the release left it.
    expect(await bifrostState(page)).toBe("review");
    await page.evaluate(() => window.scrollBy(0, 200));
    await settle(page);
    await page.evaluate(() => window.scrollBy(0, -200));
    await settle(page);
    expect(await bifrostState(page)).toBe("review");

    const open = await top(page, summary);
    await page.locator(summary).click();
    await settle(page);
    expect(await armed(page, "bifrost")).toBe(true);
    expect(Math.abs((await top(page, summary)) - open)).toBeLessThanOrEqual(1);
  });

  test("disarming and arming keep a later scene where it is on screen", async ({ page }) => {
    await page.evaluate(() => {
      const scene = document.getElementById("cougar-connect")!;
      window.scrollTo(0, scene.getBoundingClientRect().top + window.scrollY - 200);
    });
    await settle(page);
    const before = await top(page, "#cougar-connect");
    const extra = () =>
      page.evaluate(() =>
        [...document.querySelectorAll(".scene-pin")].map((el) =>
          Math.round(
            el.getBoundingClientRect().height -
              el.firstElementChild!.getBoundingClientRect().height,
          ),
        ),
      );
    expect(await extra()).toEqual([TRAVEL, TRAVEL]);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(() => armed(page, "labq")).toBe(false);
    expect(await armed(page, "bifrost")).toBe(false);
    await settle(page);
    expect(await extra()).toEqual([0, 0]);
    expect(Math.abs((await top(page, "#cougar-connect")) - before)).toBeLessThanOrEqual(1);

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect.poll(() => armed(page, "labq")).toBe(true);
    await settle(page);
    expect(await extra()).toEqual([TRAVEL, TRAVEL]);
    expect(Math.abs((await top(page, "#cougar-connect")) - before)).toBeLessThanOrEqual(1);
  });

  test("disarming mid-hold keeps the pinned scene where it is", async ({ page }) => {
    await scrollToProgress(page, "bifrost", 0.6);
    expect(await top(page, "#bifrost")).toBeCloseTo(BAR, 0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(() => armed(page, "bifrost")).toBe(false);
    await settle(page);
    expect(await top(page, "#bifrost")).toBeCloseTo(BAR, 0);
  });

  test("the timecode and the strip count sections across pinned scenes", async ({ page }) => {
    const strip = page.getByRole("navigation", { name: "Scenes" });
    const timecode = page.locator("#timecode");
    const expected = [
      { id: "labq", counter: "01", name: "Scene 1: LabQ", minute: "00:00:" },
      { id: "bifrost", counter: "02", name: "Scene 2: Bifrost", minute: "00:01:" },
    ];
    for (const s of expected) {
      for (const p of [0.1, 0.5, 0.9]) {
        await scrollToProgress(page, s.id, p);
        await expect(strip.locator("[aria-current]")).toHaveCount(1);
        await expect(strip.getByRole("link", { name: s.name })).toHaveAttribute(
          "aria-current",
          "true",
        );
        await expect(page.locator("#strip-counter-current")).toHaveText(s.counter);
        await expect(timecode).toHaveText(new RegExp(`^${s.minute}`));
      }
    }
    // Six sections of 30 seconds: hero, LabQ, Bifrost, Cougar Connect, Mastery Pilot. Each
    // scene starts on its own half minute, so the wrappers are counted once each.
    const starts = { labq: 30, bifrost: 60, "cougar-connect": 90, "mastery-pilot": 120 };
    await page.emulateMedia({ reducedMotion: "reduce" });
    await settle(page);
    for (const [id, seconds] of Object.entries(starts)) {
      await page.evaluate((sceneId) => {
        const el = document.getElementById(sceneId)!;
        window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 56 + 10);
      }, id);
      const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
      const ss = String(seconds % 60).padStart(2, "0");
      await expect(timecode).toHaveText(`00:${mm}:${ss}:00`);
    }
  });

  test("the timecode keeps running while a scene holds", async ({ page }) => {
    const seconds = async () => {
      const [, m, s, f] = (await page.locator("#timecode").textContent())!.trim().split(":");
      return Number(m) * 60 + Number(s) + Number(f) / 24;
    };
    await scrollToProgress(page, "labq", 0.1);
    const early = await seconds();
    await scrollToProgress(page, "labq", 0.9);
    const late = await seconds();
    expect(late).toBeGreaterThan(early + 5);
    expect(late).toBeLessThan(60);
  });

  test("a strip link lands on each scene's top, from above and from below", async ({ page }) => {
    const strip = page.getByRole("navigation", { name: "Scenes" });
    const scenes = [
      { id: "labq", name: "Scene 1: LabQ" },
      { id: "bifrost", name: "Scene 2: Bifrost" },
      { id: "cougar-connect", name: "Scene 3: Cougar Connect" },
      { id: "mastery-pilot", name: "Scene 4: Mastery Pilot" },
    ];
    for (const s of [...scenes, ...scenes.toReversed()]) {
      await strip.getByRole("link", { name: s.name }).click();
      await expect(page.locator(`#${s.id} h2`)).toBeFocused();
      await expect(page).toHaveURL(new RegExp(`#${s.id}$`));
      expect(Math.abs((await top(page, `#${s.id}`)) - BAR)).toBeLessThanOrEqual(1);
      await expect(strip.getByRole("link", { name: s.name })).toHaveAttribute(
        "aria-current",
        "true",
      );
    }
    // From inside its own hold, the link goes back to the start of the scene.
    await scrollToProgress(page, "bifrost", 0.6);
    const held = await page.evaluate(() => window.scrollY);
    await strip.getByRole("link", { name: "Scene 2: Bifrost" }).click();
    await expect(page.locator("#bifrost h2")).toBeFocused();
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeCloseTo(held - 0.6 * TRAVEL, 0);
  });

  test("loading the page on a scene's hash lands on that scene", async ({ page }) => {
    for (const id of ["bifrost", "cougar-connect"]) {
      await open(page, `/#${id}`);
      expect(await armed(page, "labq")).toBe(true);
      expect(Math.abs((await top(page, `#${id}`)) - BAR)).toBeLessThanOrEqual(1);
    }
  });

  test("Tab reaches every control and link in a pinned scene without the page jumping", async ({
    page,
  }) => {
    for (const id of PINNED) {
      await scrollToProgress(page, id, 0.5);
      await hydrated(page, id);
      const scrollY = await page.evaluate(() => window.scrollY);
      const count = await page.evaluate((sceneId) => {
        const scene = document.getElementById(sceneId)!;
        const all = [
          ...scene.querySelectorAll<HTMLElement>("a[href], button, summary, [tabindex='0']"),
        ];
        all[0]!.focus({ preventScroll: true });
        return all.length;
      }, id);
      expect(count).toBeGreaterThanOrEqual(4);
      const reached = new Set<string>();
      for (let i = 0; i < count; i++) {
        const where = await page.evaluate((sceneId) => {
          const el = document.activeElement as HTMLElement;
          const r = el.getBoundingClientRect();
          return {
            inside: document.getElementById(sceneId)!.contains(el),
            name: `${el.tagName}:${el.textContent?.trim().slice(0, 24)}`,
            visible: r.top >= 56 && r.bottom <= window.innerHeight - 56,
            scrollY: window.scrollY,
          };
        }, id);
        expect(where.inside).toBe(true);
        // Everything in a held scene is already inside the frame, so focus never scrolls it.
        expect(where.visible).toBe(true);
        expect(where.scrollY).toBe(scrollY);
        reached.add(where.name);
        if (i < count - 1) await page.keyboard.press("Tab");
      }
      expect(reached.size).toBe(count);
      expect([...reached].some((n) => n.startsWith("A:Repository"))).toBe(true);
      // Bifrost has a details drawer; LabQ has none.
      expect([...reached].some((n) => n.startsWith("SUMMARY:"))).toBe(id === "bifrost");
      expect(await armed(page, id)).toBe(true);
    }
  });

  test("keyboard scrolling moves through a hold and out of it", async ({ page }) => {
    await scrollToProgress(page, "labq", 0);
    await hydrated(page, "labq");
    const start = await page.evaluate(() => window.scrollY);
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press("PageDown");
      await page.waitForTimeout(250);
    }
    // Three pages is more than the hold: the visitor is never trapped in it.
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(start + TRAVEL);
    await expect(page.locator("#labq canvas")).toHaveAttribute("data-sim-state", "with");
  });
});

test.describe("scroll staging is off where the spec says so", () => {
  const expectPlain = async (page: Page) => {
    for (const id of PINNED) {
      await expect(wrapper(page, id)).toHaveCount(1);
      expect(await armed(page, id)).toBe(false);
      const { extra, position } = await wrapper(page, id).evaluate((el) => {
        const scene = el.querySelector(".scene")!;
        return {
          extra: el.getBoundingClientRect().height - scene.getBoundingClientRect().height,
          position: getComputedStyle(scene).position,
        };
      });
      // A plain block: no extra height, nothing sticky.
      expect(Math.abs(extra)).toBeLessThanOrEqual(0.5);
      expect(position).toBe("relative");
    }
  };

  test("on a phone", async ({ page }, info) => {
    test.skip(info.project.name !== "phone", "the phone project");
    await open(page);
    expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
    await expectPlain(page);
    // Scrolling through the scene drives nothing: the simulation waits for a tap.
    await page.locator("#bifrost .sim-stage").scrollIntoViewIfNeeded();
    await hydrated(page, "bifrost");
    await page.evaluate(() => window.scrollBy(0, 200));
    await settle(page);
    expect(await bifrostState(page)).toBe("review");
  });

  test("in a short window (1024 x 700)", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "a desktop window");
    await page.setViewportSize({ width: 1024, height: 700 });
    await open(page);
    await expectPlain(page);
  });

  test("when the scene does not fit the frame", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "a desktop window");
    await page.setViewportSize(DESKTOP);
    await open(page);
    expect(await armed(page, "labq")).toBe(true);
    // Make LabQ's content taller than the frame: it must release, and re-arm when it fits again.
    await page.evaluate(() => {
      const pad = document.createElement("div");
      pad.id = "pad";
      pad.style.height = "400px";
      document.querySelector("#labq .scene-meta")!.append(pad);
    });
    await expect.poll(() => armed(page, "labq")).toBe(false);
    expect(await armed(page, "bifrost")).toBe(true);
    await page.evaluate(() => document.getElementById("pad")!.remove());
    await expect.poll(() => armed(page, "labq")).toBe(true);
  });

  test("when a window is resized below the limits, and back", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "a desktop window");
    await page.setViewportSize(DESKTOP);
    await open(page);
    expect(await armed(page, "bifrost")).toBe(true);
    await page.setViewportSize({ width: 1000, height: 900 });
    await expect.poll(() => armed(page, "bifrost")).toBe(false);
    await expectPlain(page);
    await page.setViewportSize(DESKTOP);
    await expect.poll(() => armed(page, "bifrost")).toBe(true);
  });

  test("with reduced motion", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "a desktop window");
    await page.setViewportSize(DESKTOP);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    await expectPlain(page);
  });

  test("with a coarse pointer on a desktop-size screen", async ({ browser }, info) => {
    test.skip(info.project.name !== "desktop", "a desktop window");
    const context = await browser.newContext({ viewport: DESKTOP, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await open(page);
    expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
    expect(await page.evaluate(() => innerWidth >= 1024 && innerHeight >= 760)).toBe(true);
    await expectPlain(page);
    await context.close();
  });

  test("without JavaScript", async ({ browser }, info) => {
    test.skip(info.project.name !== "desktop", "a desktop window");
    const context = await browser.newContext({ viewport: DESKTOP, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");
    await expectPlain(page);
    await context.close();
  });

  test("the staging module is not loaded on a page where no scene pins", async ({ page }) => {
    const requested: string[] = [];
    page.on("request", (r) => requested.push(r.url()));
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(requested.filter((u) => /scroll-stage/.test(u))).toHaveLength(1);

    // The same page with its pin wrappers renamed away.
    requested.length = 0;
    await page.route("**/", async (route) => {
      const response = await route.fetch();
      const body = (await response.text()).replaceAll('class="scene-pin"', 'class="scene-plain"');
      await route.fulfill({ response, body });
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".scene-pin")).toHaveCount(0);
    await expect(page.locator(".scene-plain")).toHaveCount(2);
    expect(requested.filter((u) => /scroll-stage/.test(u))).toHaveLength(0);
  });
});
