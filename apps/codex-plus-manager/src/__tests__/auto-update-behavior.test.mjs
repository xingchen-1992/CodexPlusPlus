import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appSource = fs.readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const stylesSource = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");

test("manager auto-updates on startup and checks periodically while running", () => {
  assert.match(appSource, /type UpdateCheckOptions = \{[\s\S]*autoInstall\?: boolean/);
  assert.match(appSource, /checkUpdate\(true,\s*\{[^}]*autoInstall: true[^}]*\}\)/);
  assert.match(appSource, /UPDATE_POLL_INTERVAL_MS/);
  assert.match(appSource, /window\.setInterval\(\(\) => \{[\s\S]*checkUpdate\(true,\s*\{[^}]*notifyAvailable: true[^}]*\}\)/);
});

test("visible update button explains that Codex keeps running", () => {
  assert.match(appSource, /className="topbar-update-version update-pulse"/);
  assert.match(appSource, /更新管理工具，不会影响 Codex 应用当前正常使用/);
  assert.match(stylesSource, /@keyframes update-version-pulse/);
  assert.match(stylesSource, /\.topbar-update-version\.update-pulse/);
});
