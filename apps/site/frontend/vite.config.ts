import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const ANALYTICS_FE_PORT = Number(process.env.ANALYTICS_FE_PORT ?? 8011);
const ANALYTICS_BE_PORT = Number(process.env.ANALYTICS_BE_PORT ?? 8010);
// Em GitHub Pages o site fica sob /rft-monorepo/. Em Cloudflare ou domínio
// próprio fica sob /. Controlado via env var SITE_BASE.
const SITE_BASE = process.env.SITE_BASE ?? "/";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: SITE_BASE,
  resolve: {
    alias: {
      "@":           path.resolve(import.meta.dirname, "src"),
      "@rft/shared": path.resolve(import.meta.dirname, "../../../packages/shared/src"),
    },
  },
  publicDir: path.resolve(import.meta.dirname, "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
      allow: [
        path.resolve(import.meta.dirname),
        path.resolve(import.meta.dirname, "../../../packages/shared"),
      ],
    },
    // Em dev, o Vite do site age como reverse-proxy "tipo nginx":
    //   /analytics/*  → analytics-frontend (Vite)  :8011
    //   /trpc/*       → analytics-backend (Express) :8010
    //   /api/*        → analytics-backend (Express) :8010
    // Assim os mesmos links funcionam em dev e em prod sem condicional no código.
    proxy: {
      "/analytics": {
        target: `http://localhost:${ANALYTICS_FE_PORT}`,
        changeOrigin: true,
        ws: true,
        // Garante que `/analytics` sem trailing slash vire `/analytics/` —
        // o Vite do analytics tem `base: "/analytics/"` e exige a barra.
        rewrite: (p) => (p === "/analytics" ? "/analytics/" : p),
      },
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
