import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const commandsSource = fs.readFileSync(new URL("../../src-tauri/src/commands.rs", import.meta.url), "utf8");

test("Codex CLI installer opens a visible terminal instead of running silently", () => {
  const install = commandsSource.match(/fn install_codex_cli_blocking\(\) -> CommandResult<Value> \{[\s\S]*?\n\}/);
  assert.ok(install, "install_codex_cli_blocking should exist");
  assert.match(install[0], /open_codex_cli_install_terminal\(\)/);
  assert.equal(install[0].includes(".output()"), false, "installer should not block invisibly on command output");
  assert.equal(install[0].includes("windows_create_no_window"), false, "installer should not hide the install terminal");

  assert.match(commandsSource, /powershell(?:\.exe)?/i);
  assert.match(commandsSource, /"start",\s*"",\s*"powershell\.exe"/);
  assert.match(commandsSource, /Read-Host/);
  assert.match(commandsSource, /std::process::Command::new\("open"\)/);
  assert.match(commandsSource, /command\.args\(\["-a",\s*"Terminal"\]\)/);
  assert.match(commandsSource, /npm install -g @openai\/codex/);
  assert.match(commandsSource, /codex --version/);
  assert.match(commandsSource, /fn codex_cli_install_script_windows\(\) -> String/);
  assert.match(commandsSource, /fn codex_cli_install_script_unix\(\) -> String/);
  assert.match(commandsSource, /powershell_single_quote/);
  assert.match(commandsSource, /\$env:NPM_CONFIG_PREFIX = \$npmPrefix/);
  assert.match(commandsSource, /\$env:PATH = "\$npmBin;" \+ \{path_line\}/);
  assert.match(commandsSource, /export NPM_CONFIG_PREFIX="\$npm_prefix"/);
  assert.match(commandsSource, /export PATH="\$npm_bin":\{path_line\}/);
  assert.match(commandsSource, /\)\) \{\{/);
  assert.match(commandsSource, /\n\}\}\nnode --version/);
});

test("official setup detection uses an expanded command search path", () => {
  assert.match(commandsSource, /fn command_search_path\(\)/);
  assert.match(commandsSource, /fn apply_command_search_path/);
  assert.match(commandsSource, /APPDATA/);
  assert.match(commandsSource, /ProgramFiles/);
  assert.match(commandsSource, /\.npm-global/);
  assert.match(commandsSource, /managed_npm_global_bin_dir\(\)/);
  assert.match(commandsSource, /\/opt\/homebrew\/bin/);

  const readVersion = commandsSource.match(/fn read_command_version\(command: &str, arg: &str\) -> Option<String> \{[\s\S]*?\n\}/);
  assert.ok(readVersion, "read_command_version should exist");
  assert.match(readVersion[0], /apply_command_search_path\(&mut command\)/);

  const nodeDetected = commandsSource.match(/fn node_detected\(\) -> bool \{[\s\S]*?\n\}/);
  assert.ok(nodeDetected, "node_detected should exist");
  assert.match(nodeDetected[0], /apply_command_search_path\(&mut command\)/);
});

test("managed crs-image assets are bundled into the manager", () => {
  assert.match(commandsSource, /CRS_IMAGE_CLIENT_URL: &str = "bundled:\/\/managed-skills\/crs-image\.mjs"/);
  assert.match(commandsSource, /CRS_IMAGE_SKILL_URL: &str = "bundled:\/\/managed-skills\/crs-image\/SKILL\.md"/);
  assert.match(commandsSource, /const CRS_IMAGE_CLIENT: &str = include_str!\("\.\.\/managed-skills\/crs-image\.mjs"\);/);
  assert.match(commandsSource, /const CRS_IMAGE_SKILL: &str = include_str!\("\.\.\/managed-skills\/crs-image\/SKILL\.md"\);/);
});
