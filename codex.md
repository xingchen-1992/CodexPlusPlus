# Codex 本地构建与清理规则

本仓库是 Codex 定制桌面端项目。服务器磁盘有限，禁止把本地编译缓存长期留在仓库里。

## 1. 构建产物规则

- `target/` 是 Rust/Cargo 编译缓存，不是业务数据，也不是用户文件。
- 本地验证后如果不需要继续增量编译，必须及时清理 `target/`。
- 优先使用 `cargo clean` 清理本仓库的 Cargo 构建产物。
- 不要把 `target/`、临时安装包、临时下载件、调试产物提交到 Git。
- 正式 Windows/macOS 安装包优先通过 GitHub Actions 或专用 Runner 构建，不在业务服务器上长期保留本地编译缓存。

## 2. 本地验证建议

- 只做 Rust 检查时，优先跑最小范围命令，例如：
  - `cargo check -p codex-plus-core`
  - `cargo test -p codex-plus-core --test cdp_bridge`
  - `cargo test -p codex-plus-core --test updater`
- 不要无目的反复跑全量构建、全量测试或 release 构建。
- 如果需要临时隔离构建缓存，可以使用临时目录：
  - `CARGO_TARGET_DIR=/tmp/codex-plus-cargo-target cargo check -p codex-plus-core`
  - 验证结束后用 `cargo clean --target-dir /tmp/codex-plus-cargo-target` 清理。

## 3. 发布规则

- 正式版本发布后，只保留 GitHub Release 和业务服务器下载目录里的最终安装包。
- 业务服务器下载目录只放用户需要下载的文件和 `latest.json`。
- 不要把 GitHub Actions 下载下来的中间产物、临时解压目录、调试目录长期留在仓库中。

## 4. 磁盘检查规则

- 每次大版本打包前后检查：
  - `du -sh target 2>/dev/null || true`
  - `df -h /`
- 如果 `target/` 超过 5G，先确认是否还需要增量编译；不需要就清理。
- 不要手动删除 `/var/lib/docker/overlay2`。Docker 清理必须使用 Docker 命令。

