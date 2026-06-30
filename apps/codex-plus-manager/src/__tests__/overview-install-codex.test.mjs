import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appSource = fs.readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const commandsSource = fs.readFileSync(new URL("../../src-tauri/src/commands.rs", import.meta.url), "utf8");
const tauriLibSource = fs.readFileSync(new URL("../../src-tauri/src/lib.rs", import.meta.url), "utf8");

test("overview install Codex action starts the official install flow instead of repairing entrypoints", () => {
  const action = appSource.match(/const installCodexFromOverview = async \(\) => \{[\s\S]*?\n  \};/);
  assert.ok(action, "installCodexFromOverview should exist");
  assert.equal(action[0].includes("ensureOfficialReadyForLaunch"), false, "installing Codex should not require an API Key first");
  assert.equal(action[0].includes("installEntrypoints"), false, "installing Codex should not repair manager shortcuts");
  assert.match(action[0], /"install_codex_app"/);
  assert.match(action[0], /refreshOverview\(true\)/);
  assert.match(action[0], /showNotice\("安装 Codex"/);
});

test("overview install Codex guidance tells users how to continue after automatic install is unavailable", () => {
  assert.match(commandsSource, /CODEX_WINDOWS_INSTALL_COMMAND: &str = "winget install --id 9PLM9XGG6VKS --exact --source msstore --accept-source-agreements --accept-package-agreements --silent --disable-interactivity"/);
  assert.match(commandsSource, /CODEX_OFFICIAL_INSTALL_URL: &str = "https:\/\/developers\.openai\.com\/codex\/app"/);
  assert.match(commandsSource, /CODEX_WINDOWS_STORE_URL: &str =\s*"https:\/\/apps\.microsoft\.com\/detail\/9plm9xgg6vks\?hl=zh-CN&gl=SC"/);
  assert.match(commandsSource, /Windows：Codex 自动安装流程已完成/);
  assert.match(commandsSource, /--accept-source-agreements/);
  assert.match(commandsSource, /--accept-package-agreements/);
  assert.match(commandsSource, /--disable-interactivity/);
  assert.match(commandsSource, /CREATE_NO_WINDOW/);
  assert.match(commandsSource, /creation_flags\(CREATE_NO_WINDOW\)/);
  assert.match(tauriLibSource, /commands::install_codex_app/);
});

test("windows Codex install script is ascii-only and falls back to Microsoft Store", () => {
  const scriptMatch = commandsSource.match(/fn codex_app_install_script_windows\(\) -> &'static str \{\s*r#\"([\s\S]*?)\"#\s*\}/);
  assert.ok(scriptMatch, "windows install script should exist");
  const script = scriptMatch[1];
  assert.equal(/[^\x00-\x7F]/.test(script), false, "PowerShell 5 reads UTF-8 scripts as ANSI unless a BOM is present; keep this generated script ASCII-only");
  assert.match(script, /winget @installArgs/);
  assert.match(script, /--accept-package-agreements/);
  assert.match(script, /\$storeUrl = 'https:\/\/apps\.microsoft\.com\/detail\/9plm9xgg6vks\?hl=zh-CN&gl=SC'/);
  assert.match(script, /Start-Process \$storeUrl/);
});

test("overview install Codex button uses a clear download/install label", () => {
  const panel = fs.readFileSync(new URL("../components/OfficialBalancePanel.tsx", import.meta.url), "utf8");
  assert.match(panel, /codexReady \? "打开 Codex" : codexInstallBusy \? "安装中" : "安装 Codex"/);
  assert.match(panel, /disabled=\{busy \|\| codexInstallBusy\}/);
  assert.match(panel, /\{!codexReady \? \(/);
  assert.match(panel, /https:\/\/apps\.microsoft\.com\/detail\/9plm9xgg6vks\?hl=zh-CN&gl=SC/);
  assert.match(panel, /微软商店/);
  assert.match(panel, /安装完成后/);
});

test("overview install Codex action shows background installing state", () => {
  const action = appSource.match(/const installCodexFromOverview = async \(\) => \{[\s\S]*?\n  \};/);
  assert.ok(action, "installCodexFromOverview should exist");
  assert.match(appSource, /const \[codexAppInstallBusy, setCodexAppInstallBusy\] = useState\(false\)/);
  assert.match(action[0], /setCodexAppInstallBusy\(true\)/);
  assert.match(action[0], /正在后台安装 Codex/);
  assert.match(action[0], /finally \{\s*setCodexAppInstallBusy\(false\);/);
});
