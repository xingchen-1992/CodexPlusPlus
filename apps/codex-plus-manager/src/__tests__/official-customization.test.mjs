import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appSource = fs.readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const launcherSource = fs.readFileSync(
  new URL("../../../../crates/codex-plus-core/src/launcher.rs", import.meta.url),
  "utf8",
);

test("script market route is hidden from the sidebar", () => {
  const routes = appSource.match(/const routes:[\s\S]*?=\s*\[([\s\S]*?)\];/);
  assert.ok(routes, "routes should exist");
  assert.equal(routes[1].includes('id: "userScripts"'), false);
  assert.equal(routes[1].includes("脚本市场"), false);
});

test("empty legacy default relay is not shown as a provider", () => {
  assert.match(appSource, /relayProfiles: \[\]/);
  assert.match(appSource, /isEmptyLegacyDefaultRelayProfile/);
  assert.match(appSource, /\.filter\(\(profile\) => !isEmptyLegacyDefaultRelayProfile\(profile, settings\)\)/);
  const legacyDefaultFilter = appSource.match(/function isEmptyLegacyDefaultRelayProfile[\s\S]*?\n}\n/);
  assert.ok(legacyDefaultFilter, "legacy default filter should exist");
  assert.equal(legacyDefaultFilter[0].includes("profile.apiKey.trim()"), false);
  assert.equal(legacyDefaultFilter[0].includes("profile.configContents.trim()"), false);
  assert.equal(legacyDefaultFilter[0].includes("profile.authContents.trim()"), false);
  assert.match(appSource, /暂无供应商配置。购买总量包或在概览保存 API Key 后会自动生成“总量包”。/);
  assert.doesNotMatch(appSource, /scrubbedProfiles\.length \? scrubbedProfiles : defaultSettings\.relayProfiles/);
});

test("launcher initializes the curated plugin marketplace before opening Codex", () => {
  assert.match(launcherSource, /initialize_openai_curated_marketplace_and_configure\(&home\)\s*\.await/);
  assert.doesNotMatch(launcherSource, /match crate::plugin_marketplace::ensure_openai_curated_marketplace_config\(&home\)/);
});
