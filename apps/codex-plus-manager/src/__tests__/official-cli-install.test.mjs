import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const commandsSource = fs.readFileSync(new URL("../../src-tauri/src/commands.rs", import.meta.url), "utf8");
const scriptMarketSource = fs.readFileSync(new URL("../../../../crates/codex-plus-core/src/script_market.rs", import.meta.url), "utf8");

test("Codex CLI installer opens a visible terminal instead of running silently", () => {
  const install = commandsSource.match(/fn install_codex_cli_blocking\(\) -> CommandResult<Value> \{[\s\S]*?\n\}/);
  assert.ok(install, "install_codex_cli_blocking should exist");
  assert.match(install[0], /open_codex_cli_install_terminal\(\)/);
  assert.equal(install[0].includes(".output()"), false, "installer should not block invisibly on command output");
  assert.equal(install[0].includes("windows_create_no_window"), false, "installer should not hide the install terminal");

  assert.match(commandsSource, /powershell(?:\.exe)?/i);
  assert.match(commandsSource, /"start",\s*"",\s*"powershell\.exe"/);
  assert.match(commandsSource, /Read-Host/);
  assert.match(commandsSource, /open"\)\s*\.args\(\["-a",\s*"Terminal"/);
  assert.match(commandsSource, /npm install -g @openai\/codex/);
  assert.match(commandsSource, /codex --version/);
});

test("official setup detection uses an expanded command search path", () => {
  assert.match(commandsSource, /fn command_search_path\(\)/);
  assert.match(commandsSource, /fn apply_command_search_path/);
  assert.match(commandsSource, /APPDATA/);
  assert.match(commandsSource, /ProgramFiles/);
  assert.match(commandsSource, /\.npm-global/);
  assert.match(commandsSource, /\/opt\/homebrew\/bin/);

  const readVersion = commandsSource.match(/fn read_command_version\(command: &str, arg: &str\) -> Option<String> \{[\s\S]*?\n\}/);
  assert.ok(readVersion, "read_command_version should exist");
  assert.match(readVersion[0], /apply_command_search_path\(&mut command\)/);

  const nodeDetected = commandsSource.match(/fn node_detected\(\) -> bool \{[\s\S]*?\n\}/);
  assert.ok(nodeDetected, "node_detected should exist");
  assert.match(nodeDetected[0], /apply_command_search_path\(&mut command\)/);
});

test("managed crs-image assets are fetched from the official domain without cache", () => {
  assert.match(commandsSource, /CRS_IMAGE_CLIENT_URL: &str = "https:\/\/www\.leishen-ai\.cn\/tools\/crs-image\.mjs\?v=1\.0\.3"/);
  assert.match(commandsSource, /CRS_IMAGE_SKILL_URL: &str = "https:\/\/www\.leishen-ai\.cn\/tools\/crs-image-skill\/SKILL\.md\?v=1\.0\.3"/);
  assert.match(scriptMarketSource, /CACHE_CONTROL/);
  assert.match(scriptMarketSource, /PRAGMA/);
});
