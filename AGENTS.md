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
- 禁止把 GitHub Token、账号密码、私钥等凭证写入 `AGENTS.md`、代码、脚本或任何可提交文件；发布时只允许从临时环境变量、CI Secret 或密码库读取，例如 `GH_TOKEN` / `GITHUB_TOKEN`。
- 覆盖文件前确认
- 不擅自改 Cargo.toml、package.json、.gitignore（除非任务必需）

## 官方管理工具发布约定

- 新版本先修改、验证、提交、打 tag，再通过 GitHub Release 触发 Actions 生成 Windows 安装包。
- 当前优先发布 Windows 包；macOS 包不要在 Linux 服务器本地强行打包。
- Actions 产物同步到 `/home/claude-realy-service/public/tools/codex-plus/releases/<version>/` 后，再更新 `/home/claude-realy-service/public/tools/codex-plus/latest.json`。
- 自动更新源必须优先暴露完整 ZIP 包，不要把单独的 Windows `*-setup.exe` 作为旧客户端自动更新入口；否则可能缺少随包 Codex App / Node / 安装资源。
- `crs-image`、托管 Skills、Node runtime、Codex App 相关改动必须考虑“干净电脑首次安装即可使用”，不能只验证已有环境的电脑。

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
