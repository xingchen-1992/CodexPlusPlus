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
  assert.match(commandsSource, /CODEX_WINDOWS_INSTALL_COMMAND: &str = "winget install Codex -s msstore"/);
  assert.match(commandsSource, /CODEX_OFFICIAL_INSTALL_URL: &str = "https:\/\/developers\.openai\.com\/codex\/app"/);
  assert.match(commandsSource, /CODEX_WINDOWS_INSTALL_URL: &str = "https:\/\/developers\.openai\.com\/codex\/app\/windows"/);
  assert.match(commandsSource, /Windows：已打开 Codex 官方安装窗口/);
  assert.match(commandsSource, /如果安装失败/);
  assert.match(commandsSource, /Read-Host/);
  assert.match(tauriLibSource, /commands::install_codex_app/);
});

test("overview install Codex button uses a clear download/install label", () => {
  const panel = fs.readFileSync(new URL("../components/OfficialBalancePanel.tsx", import.meta.url), "utf8");
  assert.match(panel, /codexReady \? "打开 Codex" : "安装 Codex"/);
});
