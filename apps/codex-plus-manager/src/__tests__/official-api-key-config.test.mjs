import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..", "..");
const commandsSource = readFileSync(
  join(repoRoot, "apps", "codex-plus-manager", "src-tauri", "src", "commands.rs"),
  "utf8",
);
const appSource = readFileSync(
  join(repoRoot, "apps", "codex-plus-manager", "src", "App.tsx"),
  "utf8",
);
const officialSource = readFileSync(
  join(repoRoot, "apps", "codex-plus-manager", "src", "official.ts"),
  "utf8",
);

test("official api key save only patches the topup endpoint and does not backfill live codex files", () => {
  assert.match(commandsSource, /const OFFICIAL_RELAY_NAME: &str = "总量包";/);
  assert.match(commandsSource, /fn upsert_official_api_key_settings/);
  assert.match(commandsSource, /profile\.name = OFFICIAL_RELAY_NAME\.to_string\(\);/);
  assert.match(commandsSource, /enum OfficialApiKeyWriteMode/);
  assert.match(commandsSource, /apply_named_pure_api_endpoint_to_home_with_protocol/);
  assert.match(commandsSource, /OFFICIAL_RELAY_NAME,\s*\)/);
  const command = commandsSource.match(/pub fn configure_official_api_key[\s\S]*?\nfn upsert_official_api_key_settings/);
  assert.ok(command, "configure_official_api_key should exist");
  assert.doesNotMatch(command[0], /backfill_relay_profile_from_home/);
  assert.doesNotMatch(command[0], /store\.save\(&settings_for_wrapper\)/);
  assert.doesNotMatch(commandsSource, /already_configured_settings/);
  assert.doesNotMatch(commandsSource, /本次只刷新额度/);
});

test("opening codex only fills missing official live files instead of rewriting every launch", () => {
  assert.match(officialSource, /writeMode: options\.writeMode \|\| "always"/);
  const ready = appSource.match(/const ensureOfficialReadyForLaunch[\s\S]*?return true;\n\s*};/);
  assert.ok(ready, "ensureOfficialReadyForLaunch should exist");
  assert.match(ready[0], /writeMode: "missing"/);
  assert.match(ready[0], /正在确认供应商 URL 和 API Key/);
});

test("supplier switching does not snapshot live codex files before switching", () => {
  const switcher = appSource.match(/const switchRelayProfile = async[\s\S]*?setRelaySwitching\(false\);\n\s*}\n\s*};/);
  assert.ok(switcher, "switchRelayProfile should exist");
  assert.doesNotMatch(switcher[0], /snapshotActiveRelayFilesBeforeSwitch/);
});
