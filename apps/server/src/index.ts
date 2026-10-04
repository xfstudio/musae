import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { readConfig } from "./config.ts";
import { createStore } from "./db.ts";

const config = readConfig();
const db = await createStore({
  dataDir: `${config.dataDir}/postgres`,
  databaseUrl: config.databaseUrl,
});
await db.recoverInterruptedActions();
const { app, agent } = await createApp(db, config);
if (config.taskWorkerEnabled) agent.start();
const server = serve({ fetch: app.fetch, port: config.port, hostname: config.host }, () =>
  console.log(`Musae ${config.mode} API ready at ${config.publicUrl}`),
);
let stopping = false;
const shutdown = () => {
  if (stopping) return;
  stopping = true;
  // Streamed responses can remain open after the client has gone away. Drain
  // briefly, then close them so Windows/PM2 can finish a graceful restart.
  const drain = setTimeout(() => {
    if ("closeAllConnections" in server) server.closeAllConnections();
  }, 5000);
  drain.unref();
  const deadline = setTimeout(() => process.exit(1), 30000);
  deadline.unref();
  void Promise.all([new Promise<void>((resolve) => server.close(() => resolve())), agent.stop()])
    .then(() => db.close())
    .then(() => {
      clearTimeout(drain);
      clearTimeout(deadline);
      process.exit(0);
    })
    .catch(() => {
      console.error("[Musae] Graceful shutdown failed");
      process.exit(1);
    });
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
