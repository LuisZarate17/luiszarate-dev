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

/** Fraction of the bottom pixel row of `.hero` (as the visitor sees it) that is `fill`. */
async function bottomRowShare(page: Page, fill: number[]): Promise<number> {
  const box = (await hero(page).boundingBox())!;
  const row = await rowsMatching(
    page,
    await page.screenshot({
      clip: { x: box.x, y: box.y + box.height - 1, width: box.width, height: 1 },
    }),
    fill,
  );
  return row[0] ?? 0;
}

/** Tab to the Pause button and press it, so no pointer event is involved. */
async function pauseWithKeyboard(page: Page) {
  const pause = page.getByRole("button", { name: "Pause" });
  for (let i = 0; i < 20 && !(await pause.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press("Tab");
  }
  await expect(pause).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
  await page.waitForTimeout(300);
}

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
    await pauseWithKeyboard(page);
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
      .poll(() => bottomRowShare(page, fill), { timeout: 8000 })
      .toBeGreaterThanOrEqual(0.95);
    // The line stays put while the hero scrolls away with scene 1 (40 px past the end of the pin).
    await page.evaluate((y) => scrollTo(0, y + 40), pin.frame);
    await expect
      .poll(() => bottomRowShare(page, fill), { timeout: 8000 })
      .toBeGreaterThanOrEqual(0.95);
    await page.evaluate((y) => scrollTo(0, y), pin.frame);
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
    // ...and the first project's line is on the hero's bottom edge: the last canvas row is amber.
    // (Read back from the 2D canvas; a WebGL canvas cannot be read without preserveDrawingBuffer.)
    const fill = await tokenRgb(page, "--w-labq-fill");
    await expect
      .poll(() =>
        page.evaluate((fill) => {
          const c = document.querySelector<HTMLCanvasElement>(".hero-field canvas")!;
          const { data } = c.getContext("2d")!.getImageData(0, c.height - 1, c.width, 1);
          let n = 0;
          for (let x = 0; x < c.width; x++)
            if (
              Math.abs((data[x * 4] ?? 0) - (fill[0] ?? 0)) <= 6 &&
              Math.abs((data[x * 4 + 1] ?? 0) - (fill[1] ?? 0)) <= 6 &&
              Math.abs((data[x * 4 + 2] ?? 0) - (fill[2] ?? 0)) <= 6
            )
              n++;
          return n / c.width;
        }, fill),
      )
      .toBeGreaterThanOrEqual(0.95);
  });

  test("phone: the WebGL line is on the hero's bottom edge at p = 1", async ({ page }) => {
    test.skip(isDesktop(page), "phone behaviour");
    await live(page);
    await page.evaluate(() =>
      scrollTo(0, document.querySelector<HTMLElement>(".hero")!.offsetHeight * 0.85),
    );
    const fill = await tokenRgb(page, "--w-labq-fill");
    await expect
      .poll(() => bottomRowShare(page, fill), { timeout: 8000 })
      .toBeGreaterThanOrEqual(0.95);
  });

  test("scrolling to the end of the hero and back to the top re-forms the name", async ({
    page,
  }) => {
    await live(page);
    await page.waitForTimeout(2200); // past the intro, so a paused frame is a settled pose
    await pauseWithKeyboard(page);
    const before = await hero(page).screenshot();
    const frame = await page.evaluate(
      () => document.querySelector<HTMLElement>(".hero")!.offsetHeight,
    );
    const steps = [frame * 0.5, frame, frame * 3, frame, frame * 0.4, 0];
    for (const y of steps) {
      await page.evaluate((y) => scrollTo(0, y), y);
      await page.waitForTimeout(150);
    }
    await expect
      .poll(async () => (await hero(page).screenshot()).equals(before), { timeout: 5000 })
      .toBe(true);
  });

  test("a quick scroll out and back does not strand the field", async ({ page }) => {
    // Regression: an IntersectionObserver that kept only the oldest entry of a batch left the
    // hero "out of view" after a fast round trip, with the loop stopped for good.
    await live(page);
    await page.waitForTimeout(1200);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 8 });
    await page.evaluate(async () => {
      const h = document.querySelector<HTMLElement>(".hero")!.offsetHeight;
      for (let i = 0; i < 6; i++) {
        scrollTo(0, h * 3);
        await new Promise((r) => requestAnimationFrame(r));
        scrollTo(0, 0);
        await new Promise((r) => requestAnimationFrame(r));
      }
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await page.waitForTimeout(600);
    const a = await hero(page).screenshot();
    await expect
      .poll(async () => !(await hero(page).screenshot()).equals(a), { timeout: 4000 })
      .toBe(true);
  });
});

/**
 * The line, read from the WebGL drawing buffer itself. Screenshots of a WebGL canvas that is
 * mostly scrolled out of view are unreliable under SwiftShader at some pixel ratios (at 1x and
 * 3x the compositor shows the canvas empty although the buffer holds the line: readPixels
 * sees it, `elementFromPoint` and the canvas rect are right), so the screenshot tests above run
 * at the Pixel 7 ratio, and this test asserts the same thing on the buffer for every ratio. The
 * buffer is made readable by forcing `preserveDrawingBuffer` on the hero's context only.
 */
test.describe("the line in the WebGL drawing buffer", () => {
  const phone = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
  const cases = [
    {
      name: "desktop 1x, 40 px past the pin",
      opts: { viewport: { width: 1440, height: 900 } },
      desktop: true,
    },
    { name: "phone 1x", opts: { ...phone, deviceScaleFactor: 1 }, desktop: false },
    { name: "phone 3x", opts: { ...phone, deviceScaleFactor: 3 }, desktop: false },
  ];
  for (const { name, opts, desktop } of cases) {
    test(name, async ({ browser }) => {
      const context = await browser.newContext(opts);
      const page = await context.newPage();
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext as (
          this: HTMLCanvasElement,
          type: string,
          attrs?: object,
        ) => unknown;
        (HTMLCanvasElement.prototype as unknown as { getContext: unknown }).getContext = function (
          this: HTMLCanvasElement,
          type: string,
          attrs?: object,
        ) {
          const next =
            type === "webgl2" && attrs ? { ...attrs, preserveDrawingBuffer: true } : attrs;
          return original.call(this, type, next);
        };
      });
      await live(page);
      const frame = await page.evaluate(
        () => document.querySelector<HTMLElement>(".hero")!.offsetHeight,
      );
      await page.evaluate((y) => scrollTo(0, y), desktop ? frame + 40 : frame * 0.85);
      const fill = await tokenRgb(page, "--w-labq-fill");
      await expect
        .poll(
          () =>
            page.evaluate((fill) => {
              const c = document.querySelector<HTMLCanvasElement>(".hero-field canvas")!;
              const gl = c.getContext("webgl2") as WebGL2RenderingContext;
              const row = new Uint8Array(c.width * 4); // the bottom row: GL's origin is bottom-left
              gl.readPixels(0, 0, c.width, 1, gl.RGBA, gl.UNSIGNED_BYTE, row);
              let n = 0;
              for (let x = 0; x < c.width; x++)
                if (
                  Math.abs((row[x * 4] ?? 0) - (fill[0] ?? 0)) <= 6 &&
                  Math.abs((row[x * 4 + 1] ?? 0) - (fill[1] ?? 0)) <= 6 &&
                  Math.abs((row[x * 4 + 2] ?? 0) - (fill[2] ?? 0)) <= 6
                )
                  n++;
              return n / c.width;
            }, fill),
          { timeout: 8000 },
        )
        .toBeGreaterThanOrEqual(0.95);
      await context.close();
    });
  }
});

test("a lost WebGL context falls back to the still, and a restored one cuts back to the field", async ({
  page,
}) => {
  await live(page);
  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(".hero-field canvas")!;
    const gl = canvas.getContext("webgl2")!;
    const ext = gl.getExtension("WEBGL_lose_context")!;
    (window as unknown as { __lose: typeof ext }).__lose = ext;
    ext.loseContext();
  });
  await expect(hero(page)).toHaveClass(/hero--still/);
  await expect(hero(page)).not.toHaveClass(/hero--live/);
  await expect(page.locator("h1")).toHaveCSS("opacity", "1");
  await expect(page.locator(".hero-pin")).not.toHaveClass(/is-armed/);
  // Nothing may put the field back over the dead canvas: scroll, resize and Pause all try.
  await page.evaluate(() => scrollTo(0, 120));
  await page.setViewportSize({ width: (page.viewportSize()?.width ?? 1000) - 30, height: 700 });
  await page.waitForTimeout(600);
  await expect(hero(page)).not.toHaveClass(/hero--live/);
  await page.evaluate(() => scrollTo(0, 0));
  await page.evaluate(() =>
    (window as unknown as { __lose: { restoreContext(): void } }).__lose.restoreContext(),
  );
  await expect(hero(page)).toHaveClass(/hero--live/, { timeout: 10_000 });
  await expect(hero(page)).not.toHaveClass(/hero--still/);
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
