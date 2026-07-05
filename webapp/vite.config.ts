import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Standalone (non-Replit) build config. The app is a pure client-side SPA that
// fetches its data from https://kasp-content-hub.vercel.app/Hub/data.json and
// links to files under /Content/. It is served at the site root on Vercel, so
// base is "/". Build output goes to ./dist, which is copied to the repo root.
export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
