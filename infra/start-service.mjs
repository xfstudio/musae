import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseEnv } from "node:util";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
// A restart must use the saved deployment settings, not PM2's old environment.
Object.assign(process.env, parseEnv(readFileSync(resolve(root, ".env"), "utf8")));
process.env.NODE_ENV = "production";
process.env.DO_NOT_TRACK = "1";
process.env.COPILOTKIT_TELEMETRY_DISABLED = "true";

const services = {
  api: "dist/apps/server/src/index.js",
  browser: "apps/worker/dist/index.js",
  web: "infra/serve-web.mjs",
};
const service = services[process.argv[2]];
if (!service) throw new Error("Expected service: api, browser or web");

// PM2 uses IPC shutdown on Windows, where POSIX signals are unavailable.
process.on("message", (message) => {
  if (message === "shutdown") process.emit("SIGTERM");
});
await import(pathToFileURL(resolve(root, service)).href);
