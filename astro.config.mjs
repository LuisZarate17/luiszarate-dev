// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // The Vercel address for now. It changes at launch, when the domain is connected (roadmap
  // phase 10): canonical URLs, share-card URLs, public/robots.txt and public/sitemap.xml follow it.
  site: "https://luiszarate-dev.vercel.app",
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
