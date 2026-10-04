# musae.ai 生产部署

三个域名通过现有 Cloudflare Tunnel 转发到本机，公网 HTTPS 由 Cloudflare 提供。

| 服务 | 公网地址 | 本机监听 | 健康检查 |
| --- | --- | --- | --- |
| 网页 | https://musae.ai | `0.0.0.0:8081` | `/health` |
| API | https://api.musae.ai | `127.0.0.1:8787` | `/api/health` |
| 浏览器 Worker | https://web.musae.ai | `127.0.0.1:8790` | `/health` |

公网访问使用标准 HTTPS 端口，无需在域名后添加本机端口。Worker 的业务接口要求 `WORKER_TOKEN`，网页用户使用 `.env` 中的 `MUSAE_ACCESS_KEY` 登录。

## 配置与构建

需要 Node.js 22+、pnpm 和正在运行的 Docker Engine。参考根目录 `.env.production.example`，将生产配置合并到私有 `.env`，保留已有密钥。
`WORKSPACE_MODE=live`、`AGENT_BACKEND=model`，并配置模型、CopilotKit Intelligence 项目密钥、登录密钥和 32 字节 base64 加密密钥。

```powershell
pnpm install --frozen-lockfile
pnpm build:production
pnpm start:production
pnpm exec pm2 save
```

构建脚本编译 API 与 Worker，再清除 Metro 缓存并导出生产网页。网页的 API 地址来自 `.env` 的 `EXPO_PUBLIC_API_URL`，在构建时写入静态文件；修改该地址后必须重新构建。

启动命令先等待 PostgreSQL 容器健康，再通过 PM2 启动三个独立进程，异常退出自动重启。启动包装器每次都读取当前 `.env`，避免旧进程环境覆盖部署配置；Windows 停止进程时通过 IPC 触发关闭数据库和浏览器的退出流程。

已有开发服务占用 8081、8787、8790 时，先停止这些开发进程。生产环境使用 `infra/compose.production.yaml` 的 PostgreSQL 17，数据库端口仅绑定 `127.0.0.1:55432`，数据位于 Docker 命名卷 `musae-production_production-postgres`。`POSTGRES_PASSWORD` 与 `DATABASE_URL` 中的密码必须一致。

本次部署时，旧示例 PGlite 数据库在重启恢复阶段报检查点错误，因此生产环境使用独立新数据库，文档及签名密钥使用 `.musae/production`。旧 `.musae/postgres`、文件和完整部署备份均保留，旧工作区记录尚未迁移。浏览器资料仍使用 `.musae/browser-profiles`；CopilotKit Intelligence 仍使用已有项目。

## Windows 启动与运维

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File infra/install-startup.ps1
pnpm status:production
pnpm logs:production
pnpm stop:production
```

安装脚本为当前 Windows 用户创建隐藏启动快捷方式；若 Docker 尚未运行，会隐藏启动 Docker Desktop 并重试。**该方式在用户登录 Windows 后启动**；Cloudflared 已作为 Windows 自动服务运行。主机须保持开机、联网，用户登录后应用才会恢复。

日志位于 `artifacts/production-{api,browser,web}.{out,error}.log`。部署备份位于 `artifacts/deployment-*`，其中包括私有配置，不应公开或提交。定期使用 `docker compose --env-file .env -f infra/compose.production.yaml exec -T postgres pg_dump -U musae -d musae` 导出数据库，并备份 `.musae/production` 的文档和签名密钥。

## 验证与回滚

```powershell
curl.exe --noproxy "*" https://musae.ai/health
curl.exe --noproxy "*" https://api.musae.ai/api/health
curl.exe --noproxy "*" https://web.musae.ai/health
```

API 应报告 `mode=live`；没有访问密钥的 `/api/session` 请求和没有 Worker token 的 `/sessions` 请求应返回 401。主域名登录后应能访问工作区、聊天和浏览器。

后续升级若失败，停止上述三个 PM2 进程，将同一生产备份中的 `.env`、服务端构建及网页构建恢复到对应目录，再启动，正常代码回滚保留当前 PostgreSQL 数据卷。首次部署前的示例库备份存在上述检查点问题，不能直接用于恢复可运行的 API。不要执行 `docker compose down -v`，该命令会删除生产数据卷。

Google OAuth 如需启用，回调地址为 `https://api.musae.ai/api/google/callback`，并须在 Google 控制台登记。
