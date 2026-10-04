import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";

const webRoot = resolve("apps/mobile/dist/web");
if (!existsSync(resolve(webRoot, "index.html"))) {
  throw new Error("Web build missing. Run pnpm build:production first.");
}
process.chdir(webRoot);
const app = new Hono();
app.use("*", async (c, next) => {
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Cache-Control", "no-cache");
  await next();
});
app.get("/health", (c) => c.json({ status: "ok", service: "musae-web" }));
app.use("*", serveStatic({ root: "." }));
app.get("*", async (c, next) => {
  if (!c.req.header("accept")?.includes("text/html")) return c.notFound();
  return serveStatic({ path: "index.html" })(c, next);
});
const port = Number(process.env.WEB_PORT ?? 8081);
const hostname = process.env.WEB_HOST ?? "127.0.0.1";
const server = serve({ fetch: app.fetch, port, hostname }, () => {
  console.log(`Musae production web listening on http://${hostname}:${port}`);
});
const shutdown = () => server.close(() => process.exit(0));
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
