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

test("official api key save always configures the topup provider and live codex files", () => {
  assert.match(commandsSource, /const OFFICIAL_RELAY_NAME: &str = "总量包";/);
  assert.match(commandsSource, /fn upsert_official_api_key_settings/);
  assert.match(commandsSource, /profile\.name = OFFICIAL_RELAY_NAME\.to_string\(\);/);
  assert.match(commandsSource, /apply_named_pure_api_config_to_home_with_protocol/);
  assert.match(commandsSource, /OFFICIAL_RELAY_NAME,\s*\)/);
  assert.match(commandsSource, /backfill_relay_profile_from_home/);
  assert.match(commandsSource, /store\.save\(&settings_for_wrapper\)/);
  assert.doesNotMatch(commandsSource, /already_configured_settings/);
  assert.doesNotMatch(commandsSource, /本次只刷新额度/);
});
