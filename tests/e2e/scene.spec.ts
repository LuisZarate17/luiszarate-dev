import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

interface Project {
  id: string;
  title: string;
  credit: string;
  slug: string;
  role: string;
  repo: string;
  live: string | undefined;
  stats: number;
}

/** Reads the fields these tests need from a project file's front matter. */
function readProject(id: string): Project {
  const lines = readFileSync(`src/content/projects/${id}.md`, "utf8").split("\n");
  const end = lines.indexOf("---", 1);
  const front = lines.slice(1, end);
  const scalar = (key: string): string | undefined => {
    const i = front.findIndex((l) => l.startsWith(`${key}:`));
    if (i < 0) return undefined;
    const rest = (front[i] ?? "").slice(key.length + 1).trim();
    if (rest === ">-" || rest === ">") {
      const parts: string[] = [];
      for (const l of front.slice(i + 1)) {
        if (!l.startsWith("  ")) break;
        parts.push(l.trim());
      }
      return parts.join(" ");
    }
    return rest.replace(/^"(.*)"$/, "$1");
  };
  return {
    id,
    title: scalar("title") ?? "",
    credit: scalar("credit") ?? "",
    slug: scalar("slug") ?? "",
    role: scalar("role") ?? "",
    repo: scalar("repo") ?? "",
    live: scalar("live"),
    stats: front.filter((l) => /^\s*(- \{ )?value:/.test(l)).length,
  };
}

const projects = ["labq", "bifrost", "cougar-connect", "mastery-pilot"].map(readProject);

for (const project of projects) {
  test.describe(project.id, () => {
    const scene = (page: import("@playwright/test").Page) => page.locator(`section#${project.id}`);

    test("has its contract, slug, badge, credit and image", async ({ page }) => {
      await page.goto("/");
      const s = scene(page);
      await expect(s).toHaveAttribute("data-world", project.id);
      await expect(s).toHaveAttribute("aria-labelledby", `${project.id}-title`);
      await expect(s.locator(`h2#${project.id}-title`)).toContainText(project.title, {
        ignoreCase: true,
      });
      await expect(s.locator(".slug-loc")).toHaveText(project.slug, { ignoreCase: true });
      await expect(s.locator(".credit-badge")).toHaveText(
        project.credit === "team" ? /^team project$/i : /^solo project$/i,
      );
      await expect(s.locator("p.credit")).toContainText(project.role);
      const img = s.locator(".sim-still img");
      await expect(img).toHaveAttribute("alt", /.{40,}/);
      await expect(s.locator("figcaption")).not.toBeEmpty();
    });

    test("has the right primary link and a stat per metric", async ({ page }) => {
      await page.goto("/");
      const s = scene(page);
      const primary = s.locator(".btn-primary");
      await expect(primary).toHaveCount(1);
      await expect(primary).toHaveAttribute("href", project.live ?? project.repo);
      await expect(s.locator(".scene-links a")).toHaveCount(project.live ? 2 : 1);
      await expect(s.locator(".scene-links a[href='" + project.repo + "']")).toHaveCount(1);
      await expect(s.locator("dl.stats .stat")).toHaveCount(project.stats);
    });

    test(
      project.id === "bifrost" ? "opens the drawer with the keyboard" : "has no drawer",
      async ({ page }) => {
        await page.goto("/");
        const drawer = scene(page).locator(".drawer");
        if (project.id !== "bifrost") {
          await expect(drawer).toHaveCount(0);
          return;
        }
        const summary = drawer.locator("> summary");
        await summary.scrollIntoViewIfNeeded();
        await summary.focus();
        await expect(drawer).not.toHaveAttribute("open", "");
        await page.keyboard.press("Enter");
        await expect(drawer).toHaveAttribute("open", "");
        await expect(drawer.locator(".drawer-panel h3", { hasText: "Stack" })).toBeVisible();
        await expect(drawer.locator(".drawer-panel h3", { hasText: "Notes" })).toBeVisible();
        await page.keyboard.press("Space");
        await expect(drawer).not.toHaveAttribute("open", "");
      },
    );
  });
}

test("team projects are marked as team projects", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".credit-badge", { hasText: /team project/i })).toHaveCount(2);
  for (const id of ["cougar-connect", "mastery-pilot"]) {
    await expect(page.locator(`#${id} .credit-badge`)).toHaveText(/team project/i);
  }
});

test("the arrow stat reads as 'to' for assistive tech", async ({ page }) => {
  await page.goto("/");
  const stat = page.locator("#labq dl.stats dd").first();
  await expect(stat).toHaveText(/50\s*to\s*1/);
  await expect(stat.locator("svg")).toHaveAttribute("aria-hidden", "true");
});

test("only Bifrost has a Notes group", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#bifrost .drawer-panel")).toContainText(
    "The model comparison run was stopped early; the repo's write-up says what that leaves unproven.",
  );
  await expect(page.locator(".drawer")).toHaveCount(1);
});

test("reduced motion: the open drawer shows its panel without animation", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  await page.locator("#bifrost .drawer > summary").click();
  const animations = await page
    .locator("#bifrost .drawer-panel")
    .evaluate((el) => el.getAnimations().length);
  expect(animations).toBe(0);
  await expect(page.locator("#bifrost .drawer-panel")).toBeVisible();
  await context.close();
});

test("no horizontal scroll at 320 px", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 700 } });
  const page = await context.newPage();
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await context.close();
});

test("opening the drawer does not move its bar", async ({ page }) => {
  test.skip(page.viewportSize()?.width !== 1440, "measured at 1440 x 900");
  await page.goto("/");
  const summary = page.locator("#bifrost .drawer > summary");
  await summary.scrollIntoViewIfNeeded();
  const before = (await summary.boundingBox())?.y ?? 0;
  await summary.click();
  await expect(page.locator("#bifrost .drawer")).toHaveAttribute("open", "");
  await page.waitForTimeout(100);
  const after = (await summary.boundingBox())?.y ?? 0;
  expect(Math.abs(after - before)).toBeLessThanOrEqual(1);
});
