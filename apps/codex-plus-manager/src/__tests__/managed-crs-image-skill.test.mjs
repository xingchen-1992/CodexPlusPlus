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

test("managed skill UI stays simple and has no separate update controls", () => {
  const card = appSource.match(/function ManagedSkillCard[\s\S]*?\n}\n\nfunction ContextEntryEditor/);
  assert.ok(card, "ManagedSkillCard should exist");
  for (const text of ["立即检查更新", "已是最新", "Node.js 已检测", "自动更新", "内置托管", "等待检查", "正在自动检查"]) {
    assert.equal(card[0].includes(text), false, `managed skill card should not show ${text}`);
  }
  assert.match(appSource, /const MANAGED_SKILLS/);
  assert.match(appSource, /id: CRS_IMAGE_SKILL_ID/);
  for (const id of ["humanizer-zh", "ppt-master", "slide-image-editable-pptx", "markitdown", "spreadsheets"]) {
    assert.match(appSource, new RegExp(`id: "${id}"`));
  }
  assert.match(card[0], /role="switch"/);
});

test("tools page does not run crs-image update checks when switching into the page", () => {
  const manager = appSource.match(/function RelayContextManager[\s\S]*?\n}\n\nfunction ManagedSkillCard/);
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

test("startup syncs managed skill and silently repairs plugin marketplace", () => {
  const startup = appSource.match(/useEffect\(\(\) => \{[\s\S]*?void ensureManagedSkillsForCodex\(\{ silent: true, settingsOverride: startupSettings \}\);[\s\S]*?\n\s*\}, \[\]\);/);
  assert.ok(startup, "startup effect should sync managed skills");
  assert.equal(startup[0].includes("checkPluginMarketplacePrompt"), false);
  assert.match(appSource, /ensurePluginMarketplaceReadyForCodex/);
  const managedSync = appSource.match(/async function ensureManagedSkillsForCodex[\s\S]*?return installResult;\n\s*}/);
  assert.ok(managedSync, "managed skill sync should exist");
  assert.match(managedSync[0], /await ensurePluginMarketplaceReadyForCodex\(\{ silent: true \}\)/);
  assert.match(managedSync[0], /for \(const managedSkill of MANAGED_SKILLS\)/);
});

test("managed skills are installed from the official domain and hidden from manual editing", () => {
  assert.match(commandsSource, /MANAGED_SKILL_SOURCES/);
  for (const id of ["humanizer-zh", "ppt-master", "slide-image-editable-pptx", "markitdown", "spreadsheets"]) {
    assert.match(commandsSource, new RegExp(`id: "${id}"`));
    assert.match(commandsSource, new RegExp(`https://www\\.leishen-ai\\.cn/tools/codex-plus/managed-skills/${id}/SKILL\\.md\\?v=`));
  }
  assert.match(appSource, /MANAGED_SKILL_IDS\.has\(id\.trim\(\)\)/);
  assert.match(appSource, /MANAGED_SKILL_IDS\.has\(entry\.id\)/);
});

test("managed crs-image node detection does not flash a Windows console", () => {
  const nodeDetected = commandsSource.match(/fn node_detected\(\) -> bool \{[\s\S]*?\n\}/);
  assert.ok(nodeDetected, "node_detected should exist");
  assert.match(nodeDetected[0], /windows_create_no_window/);
  assert.match(nodeDetected[0], /creation_flags/);
});

test("managed crs-image can run on the bundled Node runtime", () => {
  assert.match(commandsSource, /fn managed_node_bin_dirs\(\) -> Vec<PathBuf>/);
  assert.match(commandsSource, /fn managed_node_executable\(\) -> Option<PathBuf>/);
  assert.match(commandsSource, /crs_image_command_shim\(&paths\.client_path, managed_node_executable\(\)\.as_deref\(\)\)/);
  assert.match(commandsSource, /managed_node_bin_dirs\(\)/);
  assert.match(commandsSource, /resources.*node/);
});

test("update button appears from automatic startup check and gives immediate installing state", () => {
  assert.match(appSource, /const \[updateInstalling, setUpdateInstalling\]/);
  assert.match(appSource, /checkUpdate\(true,\s*\{[^}]*promptAvailable: true[^}]*\}\)/);
  assert.match(appSource, /setUpdateInstalling\(true\)/);
  assert.match(appSource, /更新中/);
  assert.match(appSource, /disabled=\{updateInstalling\}/);
});
