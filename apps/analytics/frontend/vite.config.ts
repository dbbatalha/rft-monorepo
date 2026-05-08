import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const ANALYTICS_FE_PORT = Number(process.env.ANALYTICS_FE_PORT ?? 8011);
const ANALYTICS_BE_PORT = Number(process.env.ANALYTICS_BE_PORT ?? 8010);
// Em GitHub Pages, o analytics fica em /rft-monorepo/analytics/.
// Em Cloudflare ou domínio próprio, fica em /analytics/.
// O SITE_BASE controla o prefixo do site (ex.: /rft-monorepo/);
// concatenamos com /analytics/ pra obter o base do analytics.
const SITE_BASE = process.env.SITE_BASE ?? "/";
const ANALYTICS_BASE = (SITE_BASE.replace(/\/$/, "") + "/analytics/").replace(/^\/\//, "/");

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: ANALYTICS_BASE,
  resolve: {
    alias: {
      "@":            path.resolve(import.meta.dirname, "src"),
      "@rft/shared":  path.resolve(import.meta.dirname, "../../../packages/shared/src"),
      "@rft/backend": path.resolve(import.meta.dirname, "../backend/src"),
    },
  },
  publicDir: path.resolve(import.meta.dirname, "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: ANALYTICS_FE_PORT,
    fs: {
      strict: true,
      deny: ["**/.*"],
      allow: [
        path.resolve(import.meta.dirname),
        path.resolve(import.meta.dirname, "../backend"),
        path.resolve(import.meta.dirname, "../../../packages/shared"),
      ],
    },
    // Proxy /trpc and /api to the analytics backend in dev
    proxy: {
      "/trpc": {
        target: `http://localhost:${ANALYTICS_BE_PORT}`,
        changeOrigin: true,
      },
      "/api": {
        target: `http://localhost:${ANALYTICS_BE_PORT}`,
        changeOrigin: true,
      },
    },
  },
});
