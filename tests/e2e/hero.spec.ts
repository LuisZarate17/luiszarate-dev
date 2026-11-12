import { expect, test, type Page } from "@playwright/test";

/**
 * The 3D hero (HERO-SPEC 7.4). Headless Chromium has no hardware GL, so these run against a
 * build made with PUBLIC_HERO_TEST_HOOKS=1 (the Playwright web server does that) and use
 * `?hero=gl` (full tier) and `?hero=2d` (lite tier) to force a tier; software GL comes from the
 * launch flags in playwright.config.ts.
 */
const GL = "/?hero=gl";
const LITE = "/?hero=2d";

const hero = (page: Page) => page.locator(".hero");
const live = async (page: Page, url = GL) => {
  await page.goto(url);
  await expect(hero(page)).toHaveClass(/hero--live/, { timeout: 10_000 });
};
const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;

/** Counts pixels of a PNG within `tol` of `rgb` in each row of the image (decoded in the page). */
async function rowsMatching(page: Page, png: Buffer, rgb: number[], tol = 6): Promise<number[]> {
  return page.evaluate(
    async ({ b64, rgb, tol }) => {
      const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
      const bmp = await createImageBitmap(blob);
      const c = new OffscreenCanvas(bmp.width, bmp.height);
      const ctx = c.getContext("2d")!;
      ctx.drawImage(bmp, 0, 0);
      const { data, width, height } = ctx.getImageData(0, 0, bmp.width, bmp.height);
      const rows: number[] = [];
      for (let y = 0; y < height; y++) {
        let n = 0;
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          if (
            Math.abs((data[i] ?? 0) - (rgb[0] ?? 0)) <= tol &&
            Math.abs((data[i + 1] ?? 0) - (rgb[1] ?? 0)) <= tol &&
            Math.abs((data[i + 2] ?? 0) - (rgb[2] ?? 0)) <= tol
          )
            n++;
        }
        rows.push(n / width);
      }
      return rows;
    },
    { b64: png.toString("base64"), rgb, tol },
  );
}

const tokenRgb = (page: Page, name: string) =>
  page.evaluate((n) => {
    const hex = getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  }, name);

test.describe("hero", () => {
  test("goes live: canvas visible, the h1 off but still the heading", async ({ page }) => {
    await live(page);
    await expect(page.locator(".hero-field canvas")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Luis Zarate" })).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCSS("opacity", "0");
    await expect(hero(page)).toHaveAttribute("data-hero-tier", "full");
  });

  test("the lite tier draws a non-blank canvas", async ({ page }) => {
    await live(page, LITE);
    await expect(hero(page)).toHaveAttribute("data-hero-tier", "lite");
    await page.waitForTimeout(500);
    const opaque = await page.evaluate(() => {
      const c = document.querySelector<HTMLCanvasElement>(".hero-field canvas")!;
      const { data } = c.getContext("2d")!.getImageData(0, 0, c.width, c.height);
      let n = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] === 255) n++;
      return n;
    });
    expect(opaque).toBeGreaterThan(1000);
  });

  test("the WebGL canvas is not blank", async ({ page }) => {
    await live(page);
    await page.waitForTimeout(2500);
    const bg = await tokenRgb(page, "--color-bg");
    const rows = await rowsMatching(page, await hero(page).screenshot(), bg, 2);
    const blank = rows.filter((r) => r > 0.999).length;
    expect(blank).toBeLessThan(rows.length * 0.95);
  });

  for (const [label, url] of [
    ["default", "/"],
    ["full tier", GL],
    ["lite tier", LITE],
  ] as const) {
    test(`no console or page errors (${label})`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(url);
      await page.waitForTimeout(1500);
      await page.evaluate(() =>
        scrollTo(0, document.querySelector<HTMLElement>(".hero")!.offsetHeight),
      );
      await page.waitForTimeout(500);
      expect(errors).toEqual([]);
    });
  }

  test("pause works from the keyboard and freezes the field", async ({ page }) => {
    await live(page);
    const pause = page.getByRole("button", { name: "Pause" });
    for (let i = 0; i < 20 && !(await pause.evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press("Tab");
    }
    await expect(pause).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
    await page.waitForTimeout(300);
    const a = await hero(page).screenshot();
    await page.waitForTimeout(600);
    const b = await hero(page).screenshot();
    expect(a.equals(b)).toBe(true);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
    await expect
      .poll(async () => !(await hero(page).screenshot()).equals(b), { timeout: 3000 })
      .toBe(true);
  });

  test("desktop: the pin ends on the first project's line at the hero's bottom edge", async ({
    page,
  }) => {
    test.skip(!isDesktop(page), "desktop pins; phones do not");
    await live(page);
    const pin = await page.evaluate(() => {
      const h = document.querySelector<HTMLElement>(".hero")!;
      const p = document.querySelector<HTMLElement>(".hero-pin")!;
      return {
        frame: h.offsetHeight,
        wrapper: p.offsetHeight,
        position: getComputedStyle(h).position,
      };
    });
    expect(pin.position).toBe("sticky");
    expect(pin.wrapper).toBe(pin.frame * 2);
    await page.evaluate((y) => scrollTo(0, y), pin.frame);
    const fill = await tokenRgb(page, "--w-labq-fill");
    await expect
      .poll(
        async () => {
          const box = (await hero(page).boundingBox())!;
          const row = await rowsMatching(
            page,
            await page.screenshot({
              clip: { x: box.x, y: box.y + box.height - 1, width: box.width, height: 1 },
            }),
            fill,
          );
          return row[0] ?? 0;
        },
        { timeout: 8000 },
      )
      .toBeGreaterThanOrEqual(0.95);
    const edges = await page.evaluate(() => ({
      heroBottom: document.querySelector(".hero")!.getBoundingClientRect().bottom,
      sceneTop: document.querySelector("#labq")!.getBoundingClientRect().top,
    }));
    expect(Math.abs(edges.heroBottom - edges.sceneTop)).toBeLessThanOrEqual(1);
  });

  test("timecode and scene tracking follow the taller pinned hero", async ({ page }) => {
    test.skip(!isDesktop(page), "desktop pins; phones do not");
    await live(page);
    const frame = await page.evaluate(
      () => document.querySelector<HTMLElement>(".hero")!.offsetHeight,
    );
    const tc = page.locator("#timecode");
    await page.evaluate((y) => scrollTo(0, y), frame);
    // Still inside section 0 (the hero and its pin), so under 30 seconds and past 0.
    await expect
      .poll(
        async () =>
          (await tc.textContent())!.startsWith("00:00:") &&
          (await tc.textContent()) !== "00:00:00:00",
      )
      .toBe(true);
    await expect(page.locator(".strip [aria-current]")).toHaveCount(0);
    await page.evaluate(() => {
      const el = document.getElementById("labq")!;
      scrollTo(0, el.getBoundingClientRect().top + scrollY + el.offsetHeight / 2 - innerHeight / 2);
    });
    await expect(page.locator(".strip [aria-current]")).toHaveCount(1);
    await expect.poll(async () => (await tc.textContent())!.startsWith("00:00:")).toBe(true);
  });

  test("phone: the hero does not pin, and the cards are gone at 85%", async ({ page }) => {
    test.skip(isDesktop(page), "phone behaviour");
    await live(page, LITE);
    expect(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth)).toBe(
      true,
    );
    expect(await hero(page).evaluate((el) => getComputedStyle(el).position)).not.toBe("sticky");
    await page.evaluate(() =>
      scrollTo(0, document.querySelector<HTMLElement>(".hero")!.offsetHeight * 0.85),
    );
    await expect
      .poll(() =>
        page.evaluate(() => {
          const c = document.querySelector<HTMLCanvasElement>(".hero-field canvas")!;
          const { data } = c.getContext("2d")!.getImageData(0, 0, c.width, c.height);
          const skip = 14; // the line's rows at the bottom edge
          let n = 0;
          for (let y = 0; y < c.height - skip; y++)
            for (let x = 0; x < c.width; x++) if ((data[(y * c.width + x) * 4 + 3] ?? 0) > 0) n++;
          return n;
        }),
      )
      .toBe(0);
  });
});

test.describe("hero with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("shows the CSS still: no canvas, no pin, no Pause", async ({ page }) => {
    await page.goto(GL);
    await page.waitForTimeout(1500);
    await expect(hero(page)).not.toHaveClass(/hero--live/);
    await expect(page.locator(".hero-field canvas")).toBeHidden();
    await expect(page.locator("h1")).toHaveCSS("opacity", "1");
    await expect(page.locator(".hero-plates")).toHaveCSS("display", "block");
    await expect(page.getByRole("button", { name: /Pause|Play/ })).toHaveCount(0);
    const heights = await page.evaluate(() => ({
      pin: document.querySelector<HTMLElement>(".hero-pin")!.offsetHeight,
      hero: document.querySelector<HTMLElement>(".hero")!.offsetHeight,
    }));
    expect(heights.pin).toBe(heights.hero);
  });
});

test.describe("hero without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("shows the solid h1 and the plates behind it", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Luis Zarate" })).toBeVisible();
    await expect(page.locator("h1")).toHaveCSS("opacity", "1");
    await expect(page.locator(".hero-plates")).toHaveCSS("display", "block");
  });
});

test("the e2e build has the test-only query overrides switched on", async ({ page }) => {
  await page.goto("/");
  await expect(hero(page)).toHaveAttribute("data-hero-hooks", "on");
});
