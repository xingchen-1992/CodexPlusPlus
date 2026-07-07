# 当前 Windows/macOS 发版与下载同步流程

本文是当前有效流程。旧的服务器带宽保护文档只能作为背景参考，不能替代本文。

## 核心原则

- 正式发版必须在 Windows 本机 `H:\迅雷下载\codex管理应用\CodexPlusPlus` 发起。
- Linux 服务器 `/home/codex-plus-leishen` 只能用于查看历史代码、同步功能差异和维护官网 JSON，不允许作为正式发版机器。
- 禁止在 Linux 服务器上升版本、打 tag、创建 GitHub Release、运行 Windows/macOS 打包、运行 NSIS、压 Windows ZIP/DMG 或上传 Release assets。
- 服务器上如果有临时功能改动，先用 `git log` / `git diff` 查清楚，再回到 Windows 本机合并、测试、打包和发布。

## 资产承载

- `latest.json` 只给管理工具自动更新使用：Windows 只暴露 `*-updater.exe` 和 legacy-updater 兼容别名；macOS 暴露匹配架构的 `*-macos-x64.dmg` / `*-macos-arm64.dmg`。
- `download-latest.json` 只给官网下载页使用，暴露 Windows `*-online.exe`、完整离线 ZIP，以及 macOS DMG。
- 官网下载页必须读取 `download-latest.json`，并排除 `updater` / `legacy-updater`。
- 自动更新用 Windows `*-updater.exe` 和 macOS DMG 都优先放 `https://leishenai.cn/` 下载服务器；`latest.json` 可以继续由官网域名提供，但其中的下载 URL 应指向下载服务器。
- 700MB+ 离线 ZIP 优先放 `https://leishenai.cn/` 下载服务器或 CDN，不要放 `www.leishen-ai.cn` 官网服务器直出。

当前下载服务器：

```text
ssh -p 22 -o ServerAliveInterval=10 -o ServerAliveCountMax=6 root@39.105.46.156
https://leishenai.cn/tools/codex-plus/releases/<version>/
/home/admin/design-site/tools/codex-plus/releases/<version>/
```

当前官网服务器：

```text
ssh -p 22 -o ServerAliveInterval=10 -o ServerAliveCountMax=6 root@45.207.197.181
/home/claude-realy-service/public/tools/codex-plus/
https://www.leishen-ai.cn/tools/codex-plus/
```

## 发布顺序

1. 在 Windows 本机修改代码、跑测试、构建虚拟机测试包。
2. 虚拟机验证通过后，在 Windows 本机升版本、提交、打 tag、推送分支和 tag。
3. 用临时 `GH_TOKEN` / `GITHUB_TOKEN` 创建 GitHub Release，让 GitHub Actions 生成正式资产。
4. 将自动更新用 Windows `*-updater.exe`、macOS DMG、用户下载用 `*-online.exe` 和 `*-windows-x64.zip` 上传到 `leishenai.cn` 下载服务器，必须先进 `.staging`，校验 sha256 和 size 后再移动到公开目录。
5. 更新官网服务器的 `latest.json`，让 Windows updater / legacy-updater 和 macOS DMG URL 指向 `https://leishenai.cn/tools/codex-plus/releases/<version>/...`。
6. 更新官网服务器的 `download-latest.json`，让 Windows online/offline 和 macOS DMG URL 指向 `https://leishenai.cn/tools/codex-plus/releases/<version>/...`。
7. `latest.json` 继续保持自动更新专用，不要把 offline ZIP 或用户下载入口混进去。
8. 如果 `www.leishen-ai.cn` 有多个 A 记录，必须把 `latest.json` 和 `download-latest.json` 同步到每一个实际承载官网的节点。

## 必查验证

```bash
curl -fsS https://www.leishen-ai.cn/health
curl -fsSL https://www.leishen-ai.cn/tools/codex-plus/latest.json
curl -fsSL https://www.leishen-ai.cn/tools/codex-plus/download-latest.json
curl -fsSL https://www.leishen-ai.cn/tools/codex-plus/ | grep -E 'download-latest\.json|updater|legacy-updater'
curl -I https://leishenai.cn/tools/codex-plus/releases/<version>/CodexPlusOfficial-<version-without-v>-windows-x64-updater.exe
curl -I https://leishenai.cn/tools/codex-plus/releases/<version>/CodexPlusOfficial-<version-without-v>-windows-x64.zip
curl -I https://leishenai.cn/tools/codex-plus/releases/<version>/CodexPlusOfficial-<version-without-v>-macos-arm64.dmg
curl -I https://leishenai.cn/tools/codex-plus/releases/<version>/CodexPlusOfficial-<version-without-v>-macos-x64.dmg
curl -r 0-1048575 -o /dev/null -w "%{http_code} %{size_download} %{speed_download}\n" https://leishenai.cn/tools/codex-plus/releases/<version>/CodexPlusOfficial-<version-without-v>-windows-x64.zip
```

如果 `nslookup www.leishen-ai.cn` 返回多个 IP，对每个 IP 还要执行：

```bash
curl --resolve www.leishen-ai.cn:443:<IP> -fsSL https://www.leishen-ai.cn/tools/codex-plus/latest.json
curl --resolve www.leishen-ai.cn:443:<IP> -fsSL https://www.leishen-ai.cn/tools/codex-plus/download-latest.json
curl --resolve www.leishen-ai.cn:443:<IP> -fsSL https://www.leishen-ai.cn/tools/codex-plus/ | grep -E 'download-latest\.json|updater|legacy-updater'
```

所有节点都返回新版本；`latest.json` 的 Windows updater / legacy-updater 和 macOS DMG 指向 `leishenai.cn`；Windows 用户下载选择为 `purpose=offline` 或人工确认的 `purpose=installer`，且不得指向 `*-updater.exe`。
