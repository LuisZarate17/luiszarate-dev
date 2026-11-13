import { defineConfig, devices } from "@playwright/test";

// PORT lets parallel worktrees run their own server.
const PORT = Number(process.env.PORT ?? 4321);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
    // Headless Chromium has no hardware GL: software GL lets the hero's WebGL tier run.
    launchOptions: { args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] },
  },
  // Desktop is the design target; the phone project guards that mobile still works.
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // PUBLIC_HERO_TEST_HOOKS switches on the hero's ?hero= query overrides, and PUBLIC_SIM_PROBE the
    // /sim-probe/ fixture page, for this build only.
    command: `PUBLIC_HERO_TEST_HOOKS=1 PUBLIC_SIM_PROBE=1 npm run build && npm run preview -- --port ${PORT} --ignore-lock`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
