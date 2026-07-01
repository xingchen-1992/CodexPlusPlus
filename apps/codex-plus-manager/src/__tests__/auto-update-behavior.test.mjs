import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appSource = fs.readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const stylesSource = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const updateSource = fs.readFileSync(new URL("../../../../crates/codex-plus-core/src/update.rs", import.meta.url), "utf8");

test("manager checks updates on startup and while running without auto-installing", () => {
  assert.match(appSource, /type UpdateCheckOptions = \{[\s\S]*autoInstall\?: boolean/);
  assert.doesNotMatch(appSource, /checkUpdate\(true,\s*\{[^}]*autoInstall: true/);
  assert.match(appSource, /checkUpdate\(true,\s*\{[^}]*notifyAvailable: false[^}]*\}\)/);
  assert.match(appSource, /UPDATE_POLL_INTERVAL_MS/);
  assert.match(appSource, /window\.setInterval\(\(\) => \{[\s\S]*checkUpdate\(true,\s*\{[^}]*notifyAvailable: true[^}]*\}\)/);
});

test("only topbar update button is visible and asks before installing", () => {
  assert.doesNotMatch(appSource, /className="update-dot"/);
  assert.doesNotMatch(stylesSource, /\.update-dot/);
  assert.match(appSource, /className="topbar-update-version update-pulse"/);
  assert.match(appSource, /confirmAndPerformUpdate/);
  assert.match(appSource, /确定更新/);
  assert.match(appSource, /正在下载更新安装包/);
  assert.match(appSource, /更新管理工具，不会影响 Codex 应用当前正常使用/);
  assert.match(stylesSource, /@keyframes update-version-pulse/);
  assert.match(stylesSource, /\.topbar-update-version\.update-pulse/);
});

test("Windows self-update prefers the small setup executable over the full ZIP package", () => {
  assert.match(updateSource, /fn is_windows_setup_asset/);
  assert.match(updateSource, /fn is_windows_full_package_asset/);
  assert.match(updateSource, /is_windows_setup_asset\(name\)\s*\{\s*return 0;/);
  assert.match(updateSource, /is_windows_full_package_asset\(name\)\s*\{\s*return 1;/);
});
