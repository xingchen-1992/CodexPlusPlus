import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appSource = fs.readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const commandsSource = fs.readFileSync(new URL("../../src-tauri/src/commands.rs", import.meta.url), "utf8");

test("tools page puts Skills before MCP", () => {
  const options = appSource.match(/const contextKindOptions[\s\S]*?=\s*\[([\s\S]*?)\];/);
  assert.ok(options, "contextKindOptions should exist");
  assert.ok(
    options[1].indexOf('kind: "skill"') < options[1].indexOf('kind: "mcp"'),
    "Skills should be listed before MCP",
  );
});

test("managed crs-image skill UI stays simple and has no separate update controls", () => {
  const card = appSource.match(/function ManagedCrsImageSkillCard[\s\S]*?\n}\n\nfunction ContextEntryEditor/);
  assert.ok(card, "ManagedCrsImageSkillCard should exist");
  for (const text of ["立即检查更新", "已是最新", "Node.js 已检测", "自动更新", "内置托管", "等待检查", "正在自动检查"]) {
    assert.equal(card[0].includes(text), false, `managed skill card should not show ${text}`);
  }
  assert.match(card[0], /CRS Image 图片生成/);
  assert.match(card[0], /role="switch"/);
});

test("tools page does not run crs-image update checks when switching into the page", () => {
  const manager = appSource.match(/function RelayContextManager[\s\S]*?\n}\n\nfunction ManagedCrsImageSkillCard/);
  assert.ok(manager, "RelayContextManager should exist");
  assert.equal(manager[0].includes("checkCrsImageSkill"), false);
  assert.equal(manager[0].includes("crsImageAutoChecked"), false);
});

test("opening or restarting Codex syncs managed skills first", () => {
  assert.match(appSource, /ensureManagedSkillsForCodex/);
  const ready = appSource.match(/const ensureOfficialReadyForLaunch[\s\S]*?return true;\n\s*};/);
  assert.ok(ready, "ensureOfficialReadyForLaunch should exist");
  assert.match(ready[0], /await ensureManagedSkillsForCodex\(\{ silent: true \}\)/);
});

test("startup syncs managed skill without prompting for plugin marketplace repair", () => {
  const startup = appSource.match(/useEffect\(\(\) => \{[\s\S]*?void ensureManagedSkillsForCodex\(\{ silent: true, settingsOverride: startupSettings \}\);[\s\S]*?\n\s*\}, \[\]\);/);
  assert.ok(startup, "startup effect should sync managed skills");
  assert.equal(startup[0].includes("checkPluginMarketplacePrompt"), false);
});

test("managed crs-image node detection does not flash a Windows console", () => {
  const nodeDetected = commandsSource.match(/fn node_detected\(\) -> bool \{[\s\S]*?\n\}/);
  assert.ok(nodeDetected, "node_detected should exist");
  assert.match(nodeDetected[0], /windows_create_no_window/);
  assert.match(nodeDetected[0], /creation_flags/);
});

test("update button appears from automatic startup check and gives immediate installing state", () => {
  assert.match(appSource, /const \[updateInstalling, setUpdateInstalling\]/);
  assert.match(appSource, /checkUpdate\(true,\s*\{[^}]*promptAvailable: true[^}]*\}\)/);
  assert.match(appSource, /setUpdateInstalling\(true\)/);
  assert.match(appSource, /更新中/);
  assert.match(appSource, /disabled=\{updateInstalling\}/);
});
