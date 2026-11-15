import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/**
 * Share metadata (phase 9): canonical URL, Open Graph and Twitter card tags, the share image,
 * robots.txt and the sitemap. Requests only, so one project is enough.
 */
const site = /site:\s*"([^"]+)"/.exec(readFileSync("astro.config.mjs", "utf8"))?.[1] ?? "";

test.describe("share metadata", () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "desktop", "no layout involved");
  });

  test("the home page has a canonical URL and complete share cards", async ({ page }) => {
    expect(site).toMatch(/^https:\/\/[^/]+$/);
    await page.goto("/");
    const content = (selector: string) => page.locator(selector).getAttribute("content");
    const title = await page.title();
    const description = await content('meta[name="description"]');
    expect(description?.length ?? 0).toBeGreaterThan(50);

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${site}/`);
    expect(await content('meta[property="og:url"]')).toBe(`${site}/`);
    expect(await content('meta[property="og:type"]')).toBe("website");
    expect(await content('meta[property="og:title"]')).toBe(title);
    expect(await content('meta[property="og:description"]')).toBe(description);
    expect(await content('meta[property="og:image"]')).toBe(`${site}/og.png`);
    expect(await content('meta[property="og:image:width"]')).toBe("1200");
    expect(await content('meta[property="og:image:height"]')).toBe("630");
    expect(await content('meta[property="og:image:alt"]')).toContain("Luis Zarate");
    expect(await content('meta[name="twitter:card"]')).toBe("summary_large_image");
    expect(await content('meta[name="twitter:title"]')).toBe(title);
    expect(await content('meta[name="twitter:image"]')).toBe(`${site}/og.png`);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  });

  test("the share image is a 1200 x 630 PNG", async ({ request }) => {
    const response = await request.get("/og.png");
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
    const bytes = await response.body();
    expect(bytes.subarray(1, 4).toString("latin1")).toBe("PNG");
    // IHDR: width and height are the two big-endian integers after the chunk header.
    expect(bytes.readUInt32BE(16)).toBe(1200);
    expect(bytes.readUInt32BE(20)).toBe(630);
    // Small enough for every share-card fetcher.
    expect(bytes.length).toBeLessThan(300 * 1024);
  });

  test("robots.txt and the sitemap name the site", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("User-agent: *");
    expect(robots).toContain(`Sitemap: ${site}/sitemap.xml`);
    expect(robots).not.toMatch(/^Disallow: \//m);

    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])).toEqual([`${site}/`]);
  });
});
