# AGENTS.md

本文件为 CodexPlusPlus fork 的工作规范，指导 agent 在本仓库工作。

## 项目概述

本仓库是 [BigPizzaV3/CodexPlusPlus](https://github.com/BigPizzaV3/CodexPlusPlus) 的 fork，目标是实现「按模型粒度配置上下文窗口与自动压缩阈值」feature（对应 issue #1171 / #931）。

采用 codex 原生 `model_catalog_json` 机制：通过 `model_list` 后缀语法（如 `deepseek-v4-pro[1M]`）声明每模型窗口，由 CodexPlusPlus 生成 catalog 文件并注入 config.toml 指针，codex 客户端运行时按模型识别各自窗口。

当前还承载 Codex 官方管理工具 / 启动器 / 桌面端定制工作。项目根目录固定为：`/home/codex-plus-leishen`；对应用户下载页和线上更新源在：`/home/claude-realy-service/public/tools/codex-plus/`，公网入口：`https://www.leishen-ai.cn/tools/codex-plus/`。

## 仓库结构

- `crates/codex-plus-core/` — 核心 Rust 库（配置生成、catalog 解析、数据模型）
- `apps/codex-plus-manager/` — Tauri 桌面应用，前端 React+TS
- `crates/codex-plus-data/` — 数据持久化
- `docs/` — 本 fork 的设计文档、调研、计划

## 关键代码位置

- 数据模型：`crates/codex-plus-core/src/settings.rs` 的 `RelayProfile` 结构体
- 配置生成：`crates/codex-plus-core/src/relay_config.rs` 的 `apply_context_limits_to_config`
- catalog 解析：`crates/codex-plus-core/src/model_catalog.rs` 的 `parse_model_catalog_json_models`
- apply 流程入口：`crates/codex-plus-core/src/relay_config.rs` 的 `apply_relay_profile_to_home_with_switch_rules_and_computer_use_guard`
- 前端模型列表：`apps/codex-plus-manager/src/App.tsx` 的 `modelList` textarea

## 安全规则

- 禁止批量删除、rm -rf、rmdir /s
- 删除只能单个文件，删除前确认
- 禁止 sudo、提权、curl | bash
- 禁止泄露密钥、.env、auth.json、config.toml 凭据
- GitHub 发布认证按用户提供的方式执行；优先使用临时环境变量 `GH_TOKEN` / `GITHUB_TOKEN`、CI Secret、密码库，或 `git -c http.extraheader` 这种单次命令认证方式。
- Token、账号密码、私钥等凭据只按用户指定方式读取和使用；不要擅自改变认证方式，也不要把实际凭据混入代码、Release 说明、latest.json、发布包等会分发给用户的文件。
- 禁止触发 GitHub 图形登录、浏览器登录、设备码登录或 Git Credential Manager 弹窗；如果当前没有 `GH_TOKEN` / `GITHUB_TOKEN` 或已配置好的非交互凭据，必须停止发布并说明缺少临时认证。
- 覆盖文件前确认
- 不擅自改 Cargo.toml、package.json、.gitignore（除非任务必需）

## 官方管理工具发布约定

- 正式发版必须在 Windows 本机 `H:\迅雷下载\codex管理应用\CodexPlusPlus` 发起；Linux 服务器 `/home/codex-plus-leishen` 只能用于查看历史代码、同步功能差异和维护官网 JSON，不允许作为正式发版机器。
- 禁止在 Linux 服务器上执行正式发版链路：不要在 `/home/codex-plus-leishen` 里升版本、打 tag、创建 GitHub Release、运行 `cargo build --release` 打 Windows/macOS 包、运行 NSIS、压 Windows ZIP/DMG 或上传 Release assets。
- 服务器上如发现需要同步的功能，先用 `git log` / `git diff` 查清楚改动，再回到 Windows 本机合并、测试、打包、提交、tag、发 GitHub Release。
- 新版本先修改、验证、提交、打 tag，再通过 GitHub Release 触发 Actions 生成 Windows 安装包。
- 推送分支、推送 tag、创建 GitHub Release 和上传资产只能使用非交互认证；不得让命令弹出 “Connect to GitHub / Sign in” 等登录窗口。
- 当前正式发布 Windows 和 macOS 包；Windows 包必须在 Windows 本机或 GitHub Actions Windows runner 打包，macOS DMG 必须由 GitHub Actions macOS runner 打包，禁止在 Linux 服务器本地强行打包。
- 正式对外发版必须保持 Windows 和 macOS 同一个版本号；某个平台 CI 失败或版本已半发布时，不能覆盖远端 tag，必须升新版本重新发布。
- macOS DMG 打包时，Node runtime 和官方 Codex App 都必须解压/挂载到 GitHub runner 临时目录或其他不会被打包脚本清理的位置，再分别通过 `NODE_RUNTIME_SOURCE`、`CODEX_APP_SOURCE` 传给 `scripts/installer/macos/package-dmg.sh`。打包脚本只能清理 `dist/macos/stage`、旧 `.dmg` 和临时图标文件，禁止重新使用 `rm -rf "$DIST"`，避免把刚解压的 Node / Codex App 源目录删除。
- macOS DMG 必须同时内置 `Contents/Resources/node/bin/node` 和官方 `Codex.app`，Actions 验证必须检查两者存在且可执行；不能只因为 DMG 生成成功就认为 macOS 包可用。
- Actions 打包和上传 Release assets 不占官网服务器带宽；官网服务器带宽风险来自“服务器拉取 Release 大文件”和“用户集中从官网服务器下载大文件”。
- 700MB+ offline ZIP 不建议由官网服务器直出，优先放对象存储/CDN 或 `https://leishenai.cn/` 下载服务器；`download-latest.json` 里的 offline ZIP URL 优先指向 CDN/下载服务器。如果 offline ZIP 已放 CDN 或 `leishenai.cn`，不要强行改成 `www.leishen-ai.cn`。
- 官网服务器 `/home/claude-realy-service` 优先只维护 `latest.json`、`download-latest.json`、`components.json` 等小 JSON；下载 payload 优先由 `https://leishenai.cn/` 承载，包括 Windows 自动更新用 `*-updater.exe`、macOS DMG 和用户下载用 `*-online.exe` / offline ZIP。
- 当前下载加速服务器为 `39.105.46.156`，域名 `https://leishenai.cn/`，Nginx 根目录 `/home/admin/design-site`，下载资产路径 `/home/admin/design-site/tools/codex-plus/releases/<version>/`。
- 上传到 `leishenai.cn` 的 updater、macOS DMG、online、大 ZIP 和安装器必须先进 `.staging`，校验 sha256 和 size 后再发布到公开目录；发布后用 `curl -I` 和 1MB Range 请求验证 HTTPS、`Content-Length`、下载链路。
- 新下载服务器 `https://leishenai.cn/tools/codex-plus/latest.json`、`download-latest.json`、`components.json` 必须和旧官网 JSON 同步到同一版本；如果新服务器清单仍是旧版本，禁止把客户端默认更新源切到新服务器，也不能宣布发版完成。
- 若临时必须让官网服务器托管大 ZIP，必须避开高峰期、限速串行同步、先进 `.staging`、校验 sha256 和 size 后再发布，并明确“用户下载仍可能打满出口带宽”的风险。
- 官网服务器禁止无限速 `curl` / `wget` 下载 GitHub Release 大文件；默认同步限速 `2m`，常规最高 `3m`，`6m` 只允许人工确认低峰期临时使用；禁止并发下载多个 Release assets。
- Actions 产物同步到 `https://leishenai.cn/tools/codex-plus/releases/<version>/`、`/home/claude-realy-service/public/tools/codex-plus/releases/<version>/` 或对象存储/CDN 后，再更新新下载服务器和官网每个节点的 `latest.json`、`download-latest.json`、`components.json`。
- 升级内置官方 Codex Desktop / Codex App 时，必须同时 bump `.github/workflows/release-assets.yml` 里的 `CODEX_WINDOWS_X64_MSIX_CACHE_KEY` 和 `CODEX_MACOS_APP_CACHE_KEY`，让 Windows `CodexOfficialApp-x64.msix` 与 macOS 官方 DMG 都重新下载；不要只更新其中一个平台。
- 自动更新源 `latest.json` 只允许暴露 Windows 轻量 `*-updater.exe`、为旧客户端兼容而保留的 `*-legacy-setup.exe` 别名，以及 macOS DMG；兼容别名也必须指向同一个 updater 小文件，禁止把 Windows 完整离线 ZIP 作为管理工具自动更新入口。
- 官网下载清单使用 `download-latest.json`，可暴露 Windows 在线安装器 `*-online.exe`、完整离线 ZIP 和 macOS DMG。Windows 离线 ZIP 仍必须包含 `点我双击安装.exe` 与 `RequiredFiles/`。
- macOS 官网下载当前为临时策略：`download-latest.json` 和官网下载页两个 mac 卡片暂时只提供官方 Codex 的 `arm64` / `x64` DMG（`Codex-mac-arm64.dmg`、`Codex-mac-x64.dmg`）。对外 URL 优先指向 `https://leishenai.cn/tools/codex-plus/releases/<version>/Codex-mac-*.dmg` 这类下载服务器镜像文件；镜像文件内容来自官方 Codex 安装包，不要再把 `CodexPlusOfficial-*-macos-*.dmg` 暴露给普通用户下载，直到 Apple 签名/公证链路补齐后再恢复。
- 官网下载页 `/tools/codex-plus/index.html` 必须读取 `download-latest.json`，并显式排除 `purpose=updater` / `purpose=legacy-updater`；用户可见下载按钮不得链接到 `*-updater.exe`。
- `latest.json` 的 Windows updater / legacy-updater 和 macOS DMG URL 优先指向 `https://leishenai.cn/tools/codex-plus/releases/<version>/...`；`download-latest.json` 的用户下载 URL 也可指向同一下载服务器。`latest.json` 仍是管理工具自动更新专用，不要因为迁移用户下载大包而把 updater 入口混入官网下载页。
- `latest.json`、`download-latest.json`、`components.json` 不得写入任何 token、密码、私钥；如果 `latest.json` 是单文件 bind mount，必须原地覆盖，不要用 `mv` / `os.replace` 换 inode。
- 同步官网前后必须执行 `nslookup www.leishen-ai.cn`。如果域名返回多个 A 记录，必须把 `index.html`、`latest.json`、`download-latest.json`、`components.json`、`*-updater.exe`、`*-online.exe` 同步到每一个实际承载官网的节点，或先确认 DNS 已移除旧节点；任一 IP 仍返回旧版都不能宣布发版完成。
- 多 A 记录场景必须用 `curl --resolve www.leishen-ai.cn:443:<IP>` 逐个验证 `latest.json`、`download-latest.json`、下载页源码、updater/online 响应头，确认所有节点版本和下载逻辑一致。
- 多 A 记录场景也必须逐 IP 验证客服链路：每个实际承载官网的节点都要能访问 Chatwoot。没有本机 `chatwoot-support` / `rails:3000` 的节点，不得把 `CHATWOOT_SUPPORT_INTERNAL_BASE_URL` 保持为 `http://rails:3000`；应改为 `https://support.leishen-ai.cn` 等明确可达地址，或部署同网络内带 `rails` 别名的轻量反代，并确认 `/portal/support/conversation` 不再出现 `getaddrinfo EAI_AGAIN rails`。
- 同步期间持续检查 `curl -fsS https://www.leishen-ai.cn/health`、`docker compose -p claude-realy-service-home ps`、`docker stats --no-stream`；如果 SSH 卡顿、`/health` 变慢、API 转发受影响，立即停止下载：`pkill -f 'curl .*CodexPlusOfficial' || true`。
- 不重启 `/home/claude-realy-service`、不执行 `./rebuild-and-deploy.sh`，除非人工明确确认；不要直接 `docker compose up -d claude-relay`。
- Codex App、Python、Node runtime 必须作为组件按需安装：在线安装器缺哪个下哪个，完整离线包把组件放进 `RequiredFiles/`，管理工具小版本自更新不要重复下载这些大组件。
- `crs-image`、托管 Skills、Node runtime、Codex App 相关改动必须考虑“干净电脑首次安装即可使用”，不能只验证已有环境的电脑。
- 管理工具打开 Codex 时只能写入自己负责的配置项，禁止全量覆盖用户在 Codex App 里修改的外观、偏好、功能开关等设置。修改 `~/.codex/config.toml` 时必须保留未知根配置和未知表，只替换 `model`、`model_provider`、`model_providers`、上下文、模型 catalog 等管理工具管辖字段。
- 同一轮虚拟机测试发现问题后，只要重新修改代码并重新给测试包，就必须升一个新的小版本号并新建对应版本目录，不要覆盖旧测试包目录，避免虚拟机拿错包。

## 命令执行

- 执行 bash 命令前确认
- 不运行未知脚本、不擅自装依赖
- 测试用 cargo test，不另起工具链
- 禁止并行运行重负载命令，尤其是 `cargo test`、`cargo build`、`npm run build`、`npm run vite:build`、Docker 重建、安装包打包、全量测试等会大量占用 CPU、内存或磁盘 IO 的任务。
- 禁止在未确认的情况下运行全量构建/全量测试，例如 `cargo test --workspace`、`cargo build --release`、完整 Docker rebuild、Windows/macOS 安装包打包。
- 必须验证时优先跑最小范围测试；Rust/Cargo 命令默认加资源限制，例如 `CARGO_BUILD_JOBS=1`，必要时使用 `nice` / `ionice` 降低优先级。
- 执行任何可能占用大量 IO/内存/CPU 的命令前，必须先明确告知用户影响并获得确认；执行中发现服务器变慢、IO 或内存升高，应立即停止继续追加重任务。
- 不能为了“验证更完整”把多个重命令放进 `multi_tool_use.parallel` 并行执行；轻量 `rg`、`sed`、`git status` 这类读取命令才允许并行。

## 编码规范

- 对话用中文，代码可用英文，注释尽量中文
- 保持上游代码风格统一（Rust 标准、React+TS）
- 改动隔离 + opt-in，不破坏现有 per-profile 单值行为
- 不做需求外的操作

## 测试约定

- 沿用上游 `#[test]` + tempfile 风格（见 `crates/codex-plus-core/tests/relay_config.rs`）
- 断言读 config.toml 文本，如 `assert!(config.contains("model_catalog_json"))`
- 改行为要同步改/加对应测试

## 与上游同步

- `upstream` = https://github.com/BigPizzaV3/CodexPlusPlus.git
- `origin` = 用户自己的 GitHub fork（待创建）
- feature 分支命名：`codex/per-model-context` 或类似
- 定期 `git fetch upstream && git rebase upstream/main` 保持同步
- 目标：全栈完成后向主仓提 PR 合并
