import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = parseEnv(readFileSync(resolve(root, ".env"), "utf8"));
const apiUrl = new URL(config.EXPO_PUBLIC_API_URL ?? config.PUBLIC_API_URL);
if (apiUrl.protocol !== "https:") throw new Error("Production API URL must use HTTPS");
// Pass only the public URL to Expo; private API credentials stay server-side.
const env = {
  ...process.env,
  NODE_ENV: "production",
  EXPO_NO_DOTENV: "1",
  EXPO_PUBLIC_API_URL: apiUrl.origin,
};
const steps = [
  [".", "node_modules/typescript/bin/tsc", ["-p", "tsconfig.build.json"]],
  ["apps/worker", "node_modules/typescript/bin/tsc", ["-p", "tsconfig.build.json"]],
  [
    "apps/mobile",
    "node_modules/expo/bin/cli",
    ["export", "--platform", "web", "--output-dir", "dist/web", "--clear"],
  ],
];
for (const [directory, cli, args] of steps) {
  const cwd = resolve(root, directory);
  const result = spawnSync(process.execPath, [resolve(cwd, cli), ...args], {
    cwd,
    env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
