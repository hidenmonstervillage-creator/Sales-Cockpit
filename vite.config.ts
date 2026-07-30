import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Stamped once per `vite build` / per dev-server start, so the running app can
// say which copy it is (localhost vs the Netlify deploy).
const BUILD_TIME = new Date().toISOString();

// Relative base so `dist/` can be served from any local folder or deploy subpath.
export default defineConfig({
  base: "./",
  plugins: [react()],
  define: {
    "import.meta.env.VITE_BUILD_TIME": JSON.stringify(BUILD_TIME),
  },
  server: { port: 5180, open: false },
  build: {
    outDir: "dist",
    // Everything is bundled locally — no CDN, no runtime fetches.
    assetsInlineLimit: 0,
  },
});
