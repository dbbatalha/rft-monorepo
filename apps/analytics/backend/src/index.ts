// Analytics backend entry point.
// Exposes /trpc (and a /healthz) on ANALYTICS_BE_PORT (default 8010).
// In production a reverse proxy (nginx) routes /analytics/api/* here.
import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

const PORT = Number(process.env.ANALYTICS_BE_PORT ?? process.env.PORT ?? 8010);

async function main() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.get("/healthz", (_req, res) => res.json({ ok: true }));

  app.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const server = createServer(app);
  server.listen(PORT, () => {
    console.log(`[analytics-backend] listening on http://localhost:${PORT}/`);
    console.log(`[analytics-backend] tRPC at  http://localhost:${PORT}/trpc/*`);
  });
}

main().catch((err) => {
  console.error("[analytics-backend] fatal:", err);
  process.exit(1);
});
