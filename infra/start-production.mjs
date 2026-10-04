import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const steps = [
  [
    "docker",
    ["compose", "--env-file", ".env", "-f", "infra/compose.production.yaml", "up", "-d", "--wait"],
  ],
  [
    process.execPath,
    ["node_modules/pm2/bin/pm2", "startOrRestart", "infra/ecosystem.config.cjs", "--update-env"],
  ],
  [process.execPath, ["node_modules/pm2/bin/pm2", "save"]],
];
for (const [command, args] of steps) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
