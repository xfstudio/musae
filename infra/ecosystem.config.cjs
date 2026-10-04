const path = require("node:path");

const root = path.resolve(__dirname, "..");
module.exports = {
  apps: ["api", "browser", "web"].map((service) => ({
    name: `musae-${service}`,
    cwd: root,
    script: path.join(root, "infra/start-service.mjs"),
    args: service,
    interpreter: process.execPath,
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    exp_backoff_restart_delay: 1000,
    min_uptime: "10s",
    max_restarts: 10,
    kill_timeout: 35000,
    shutdown_with_message: true,
    time: true,
    merge_logs: true,
    out_file: path.join(root, `artifacts/production-${service}.out.log`),
    error_file: path.join(root, `artifacts/production-${service}.error.log`),
    max_memory_restart: service === "api" ? "2G" : "1G",
    env: { NODE_ENV: "production" },
  })),
};
