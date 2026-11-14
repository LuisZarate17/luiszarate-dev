import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * About and contact, the last scene (concept A; spec 5.2, 5.5, 6.3). The address is selectable
 * text with a copy button and never a mailto link; the photo and the resume render only when
 * their files exist.
 */
const EMAIL = "lz.zarate.1@gmail.com";
const GITHUB = "https://github.com/LuisZarate17";
const LINKEDIN = "https://www.linkedin.com/in/luiszarate1";
const PLACEHOLDER = /lorem|ipsum|placeholder|\btodo\b|\btbd\b|coming soon|example\.(com|org)/i;

const photoDir = join(process.cwd(), "src", "assets", "about");
const hasPhoto = existsSync(photoDir) && readdirSync(photoDir).some((f) => /^photo\./.test(f));
const hasResume = existsSync(join(process.cwd(), "public", "resume.pdf"));

const section = (page: Page) => page.locator("main > section#contact");
const email = (page: Page) => section(page).locator(".contact-email");
const copy = (page: Page) => section(page).getByRole("button", { name: "Copy email" });
const status = (page: Page) => section(page).getByRole("status");
const strip = (page: Page) => page.getByRole("navigation", { name: "Scenes" });

/** Puts the section's top under the top bar. */
async function arrive(page: Page) {
  await page.goto("/");
  // The hero arms its pin after load, which changes the page's height: scroll after that.
  await page.waitForLoadState("load");
  await section(page).evaluate((el) => el.scrollIntoView({ behavior: "instant", block: "start" }));
  await expect(section(page).locator("h2")).toBeInViewport();
}

const pageOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const clipboard = (page: Page) => page.evaluate(() => navigator.clipboard.readText());
const selected = (page: Page) => page.evaluate(() => window.getSelection()?.toString() ?? "");

test.describe("contact, without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("is the last section, with its heading, the bio and the address as text", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("main > section").last()).toHaveAttribute("id", "contact");
    await expect(section(page).getByRole("heading", { level: 2 })).toHaveText("Contact");
    await expect(section(page)).toHaveAttribute("aria-labelledby", "contact-title");
    await expect(section(page).locator(".slug")).toHaveText(/SC 06\s+INT\. PORTFOLIO — LAST SCENE/);
    await expect(email(page)).toBeVisible();
    await expect(email(page)).toHaveText(EMAIL);
    const bio = (await section(page).locator(".about-bio").textContent())!.trim();
    expect(bio).toMatch(/^I'm Luis Zarate, a full-stack engineer\./);
    expect(bio.match(/[.!?](\s|$)/g)).toHaveLength(3);
    for (const name of ["LabQ", "Bifrost", "Cougar Connect", "Mastery Pilot"])
      expect(bio).toContain(name);
  });

  test("links to GitHub and LinkedIn; every outside link is noopener noreferrer", async ({
    page,
  }) => {
    await page.goto("/");
    const github = section(page).getByRole("link", { name: "github.com/LuisZarate17" });
    const linkedin = section(page).getByRole("link", { name: "linkedin.com/in/luiszarate1" });
    await expect(github).toHaveAttribute("href", GITHUB);
    await expect(linkedin).toHaveAttribute("href", LINKEDIN);
    const outside = section(page).locator('a[href^="http"]');
    expect(await outside.count()).toBeGreaterThanOrEqual(3);
    for (const link of await outside.all()) {
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      await expect(link).not.toHaveAttribute("target");
    }
    await expect(section(page).locator("footer")).toContainText(/© \d{4} Luis Zarate/);
    await expect(section(page).getByRole("link", { name: "Source of this site" })).toHaveAttribute(
      "href",
      "https://github.com/LuisZarate17/luiszarate-dev",
    );
  });

  test("the copy button stays hidden where it cannot work", async ({ page }) => {
    await page.goto("/");
    await expect(section(page).locator("button[data-copy]")).toBeHidden();
    await expect(status(page)).toBeEmpty();
  });

  test("there is no mailto link on the page, and the source does not spell the address", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    await expect(page.locator('a[href^="mailto" i]')).toHaveCount(0);
    const html = await (await request.get("/")).text();
    expect(html).not.toMatch(/mailto/i);
    expect(html).not.toContain(EMAIL);
    // The address is in the page once, as text.
    expect(await page.locator("body").innerText()).toContain(EMAIL);
    expect(await page.getByText(EMAIL).count()).toBe(1);
  });

  test("the photo and the resume appear only when their files exist; nothing stands in", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(section(page).locator("img")).toHaveCount(hasPhoto ? 1 : 0);
    await expect(section(page).locator('a[href$="resume.pdf"]')).toHaveCount(hasResume ? 1 : 0);
    await expect(page.locator('a[href$=".pdf"]')).toHaveCount(hasResume ? 1 : 0);
    if (hasPhoto) {
      const img = section(page).locator("img");
      await expect(img).toHaveAttribute("alt", "Luis Zarate");
      const box = (await img.boundingBox())!;
      expect([Math.round(box.width), Math.round(box.height)]).toEqual([96, 96]);
    }
    await expect(section(page).locator("dl.contact > div")).toHaveCount(hasResume ? 4 : 3);
    expect(await section(page).innerText()).not.toMatch(PLACEHOLDER);
    // No empty rows, no empty links, no image without a source.
    for (const row of await section(page).locator("dl.contact dd").all())
      expect((await row.innerText()).trim().length).toBeGreaterThan(0);
    for (const link of await section(page).locator("a").all())
      expect((await link.innerText()).trim().length).toBeGreaterThan(0);
  });
});

test.describe("contact", () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  });

  test("copies the address by keyboard and announces it", async ({ page }) => {
    await arrive(page);
    await expect(copy(page)).toBeVisible();
    await expect(status(page)).toHaveAttribute("role", "status");
    await copy(page).focus();
    await page.keyboard.press("Enter");
    await expect(status(page)).toHaveText("Copied");
    expect(await clipboard(page)).toBe(EMAIL);
    await expect(copy(page)).toBeFocused();
    await expect(copy(page)).toHaveAccessibleName("Copy email");
    // Space works too, and a second press is announced again.
    await page.evaluate(() => navigator.clipboard.writeText(""));
    await page.keyboard.press("Space");
    await expect(status(page)).toHaveText("Copied");
    expect(await clipboard(page)).toBe(EMAIL);
  });

  test("the button is reached by Tab, right after the address", async ({ page }) => {
    await arrive(page);
    await section(page)
      .locator("h2")
      .evaluate((el) => {
        el.setAttribute("tabindex", "-1");
        (el as HTMLElement).focus();
      });
    await page.keyboard.press("Tab");
    await expect(copy(page)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      section(page).getByRole("link", { name: "github.com/LuisZarate17" }),
    ).toBeFocused();
  });

  test("the announcement clears, so it is not read again later", async ({ page }) => {
    await page.clock.install();
    await arrive(page);
    await copy(page).click();
    await page.clock.runFor(100);
    await expect(status(page)).toHaveText("Copied");
    await page.clock.runFor(4100);
    await expect(status(page)).toBeEmpty();
  });

  test("without clipboard access it selects the address and says so", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: () => Promise.reject(new Error("denied")) },
      });
    });
    await arrive(page);
    await copy(page).click();
    await expect(status(page)).toHaveText("Selected, ready to copy");
    expect(await selected(page)).toBe(EMAIL);
  });

  test("with no clipboard API at all it still selects the address", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    });
    await arrive(page);
    await copy(page).click();
    await expect(status(page)).toHaveText("Selected, ready to copy");
    expect(await selected(page)).toBe(EMAIL);
  });

  test("the address is selectable text: one click selects all of it", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "a mouse click; touch selects by long press");
    await arrive(page);
    await expect(email(page)).toHaveCSS("user-select", "all");
    await email(page).click();
    expect(await selected(page)).toBe(EMAIL);
  });

  test("the strip item cuts to the section and focuses its heading", async ({ page }) => {
    await page.goto("/");
    await strip(page).getByRole("link", { name: "Scene 6: Contact" }).click();
    await expect(section(page).locator("h2")).toBeFocused();
    await expect(page).toHaveURL(/#contact$/);
    await expect(strip(page).locator("[aria-current]")).toHaveAccessibleName("Scene 6: Contact");
  });

  test("it fills the frame and ends in the letterbox colour, against the bottom bar", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("load");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const m = await page.evaluate(() => {
      const el = document.querySelector("#contact")!;
      const end = el.querySelector("footer")!;
      const top = document.querySelector(".frame-bar--top")!.getBoundingClientRect();
      const bottom = document.querySelector(".frame-bar--bottom")!;
      return {
        height: el.getBoundingClientRect().height,
        frame: bottom.getBoundingClientRect().top - top.bottom,
        gap: bottom.getBoundingClientRect().top - end.getBoundingClientRect().bottom,
        endColor: getComputedStyle(end).backgroundColor,
        barColor: getComputedStyle(bottom).backgroundColor,
        sectionColor: getComputedStyle(el).backgroundColor,
        bodyColor: getComputedStyle(document.body).backgroundColor,
        world: el.closest("[data-world]"),
      };
    });
    expect(m.height).toBeGreaterThanOrEqual(m.frame - 1);
    expect(Math.abs(m.gap)).toBeLessThanOrEqual(1);
    expect(m.endColor).toBe(m.barColor);
    // A scene with no world: the base colour.
    expect(m.sectionColor).toBe(m.bodyColor);
    expect(m.world).toBeNull();
    // The end of the page is the end of the seventh section.
    await expect(page.locator("#timecode")).toHaveText("00:03:30:00");
    await expect(page.locator("#strip-counter-current")).toHaveText("06");
  });

  test("layout: two columns on a desktop window, one on a phone; targets are 44 px", async ({
    page,
  }, info) => {
    await arrive(page);
    const who = (await section(page).locator(".about-who").boundingBox())!;
    const contact = (await section(page).locator("dl.contact").boundingBox())!;
    if (info.project.name === "desktop") {
      expect(contact.x).toBeGreaterThan(who.x + who.width);
      // The whole scene is one frame: nothing to scroll for.
      const box = (await section(page).boundingBox())!;
      expect(box.height).toBeLessThanOrEqual(page.viewportSize()!.height - 2 * 56 + 1);
    } else {
      expect(contact.y).toBeGreaterThanOrEqual(who.y + who.height);
      expect(Math.abs(contact.x - who.x)).toBeLessThanOrEqual(1);
    }
    const targets = [copy(page), ...(await section(page).locator("a").all())];
    for (const target of targets) {
      const box = (await target.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
    expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
  });

  test("has no horizontal scroll at 320 px, and the address and the strip fit", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await arrive(page);
    expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
    for (const part of [email(page), copy(page), ...(await section(page).locator("a").all())]) {
      const box = (await part.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(320);
    }
    // The address stays on one line.
    expect((await email(page).boundingBox())!.height).toBeLessThan(40);
    // With six items, every current name still sits inside its own item.
    for (const id of ["labq", "bifrost", "cougar-connect", "mastery-pilot", "build", "contact"]) {
      await page.evaluate((sceneId) => {
        const el = document.getElementById(sceneId)!;
        const start = el.parentElement?.classList.contains("scene-pin") ? el.parentElement : el;
        window.scrollTo(0, start.getBoundingClientRect().top + window.scrollY + 60);
      }, id);
      const current = strip(page).locator("a[aria-current]");
      await expect(current).toHaveAttribute("href", `#${id}`);
      const fit = await current.evaluate((a) => {
        const link = a.getBoundingClientRect();
        const name = a.querySelector(".strip-name")!.getBoundingClientRect();
        return { left: name.left - link.left, right: link.right - name.right };
      });
      expect(fit.left, id).toBeGreaterThanOrEqual(0);
      expect(fit.right, id).toBeGreaterThanOrEqual(0);
    }
    expect(
      await strip(page)
        .locator("ol")
        .evaluate((el) => el.scrollWidth - el.clientWidth),
    ).toBeLessThanOrEqual(0);
  });

  test("no console errors while using it", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));
    await arrive(page);
    await copy(page).click();
    await expect(status(page)).toHaveText("Copied");
    expect(errors).toEqual([]);
  });
});

test.describe("contact, by touch", () => {
  test.use({ hasTouch: true });

  test("a tap copies the address and announces it", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await arrive(page);
    await copy(page).tap();
    await expect(status(page)).toHaveText("Copied");
    expect(await clipboard(page)).toBe(EMAIL);
    await expect(status(page)).toBeVisible();
  });
});

test.describe("contact, with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("looks and works the same: nothing in the section animates", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/#contact");
    await expect(section(page).locator("h2")).toBeInViewport();
    await expect(email(page)).toHaveText(EMAIL);
    // Reduced motion shows the start of the current section: the seventh, counting the hero.
    await expect(page.locator("#timecode")).toHaveText("00:03:00:00");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    expect(
      await page.evaluate(
        () => document.getElementById("contact")!.getAnimations({ subtree: true }).length,
      ),
    ).toBe(0);
    // The button's 120 ms colour change is kept (spec 4.6); the copy itself is instant.
    await copy(page).click();
    await expect(status(page)).toHaveText("Copied");
    expect(await clipboard(page)).toBe(EMAIL);
    // The cut to it is an instant jump, and focus still moves.
    await page.evaluate(() => window.scrollTo(0, 0));
    await strip(page).getByRole("link", { name: "Scene 6: Contact" }).click();
    await expect(section(page).locator("h2")).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
  });
});

test.describe("contact, without motion preference", () => {
  test("nothing in the section animates or transitions on arrival", async ({ page }) => {
    await arrive(page);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    expect(
      await page.evaluate(
        () => document.getElementById("contact")!.getAnimations({ subtree: true }).length,
      ),
    ).toBe(0);
  });
});
