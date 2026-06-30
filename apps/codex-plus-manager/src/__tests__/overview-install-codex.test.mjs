import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appSource = fs.readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const commandsSource = fs.readFileSync(new URL("../../src-tauri/src/commands.rs", import.meta.url), "utf8");
const tauriLibSource = fs.readFileSync(new URL("../../src-tauri/src/lib.rs", import.meta.url), "utf8");

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
  assert.match(panel, />\s*打开 Codex\s*</);
  assert.match(panel, /onClick=\{onOpenCodex\}/);
  assert.doesNotMatch(panel, /安装 Codex/);
  assert.doesNotMatch(panel, /official-codex-install-guide/);
  assert.doesNotMatch(panel, /apps\.microsoft\.com\/detail\/9plm9xgg6vks/);
});

test("overview delegates Codex app installation to the Windows package", () => {
  assert.doesNotMatch(appSource, /installCodexFromOverview/);
  assert.doesNotMatch(appSource, /codexAppInstallBusy/);
  assert.doesNotMatch(appSource, /onInstallCodex=\{/);
  assert.match(appSource, /onOpenCodex=\{\(\) => void actions\.launch\(\)\}/);
});
