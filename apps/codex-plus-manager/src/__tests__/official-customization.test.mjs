import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appSource = fs.readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const launcherSource = fs.readFileSync(
  new URL("../../../../crates/codex-plus-core/src/launcher.rs", import.meta.url),
  "utf8",
);
const launcherAppSource = fs.readFileSync(
  new URL("../../../codex-plus-launcher/src/main.rs", import.meta.url),
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

test("launcher does not download the curated plugin marketplace before opening Codex", () => {
  assert.match(launcherSource, /ensure_openai_curated_marketplace_config\(&home\)/);
  assert.doesNotMatch(launcherSource, /initialize_openai_curated_marketplace_and_configure\(&home\)\s*\.await/);
});

test("existing Codex activation path still applies forced Chinese launch arguments", () => {
  const activateExisting = launcherAppSource.match(/async fn activate_existing_codex_app[\s\S]*?\n}\n\nfn helper_start_error_is_existing_helper/);
  assert.ok(activateExisting, "activate_existing_codex_app should exist");
  assert.match(activateExisting[0], /let codex_extra_args = codex_plus_core::launcher::effective_codex_extra_args\(&settings\);/);
  assert.match(activateExisting[0], /\.launch_codex\([\s\S]*&codex_extra_args[\s\S]*\)/);
  assert.doesNotMatch(activateExisting[0], /&settings\.codex_extra_args/);
});

test("settings page only shows the official network proxy switch", () => {
  assert.match(appSource, /Codex 直连网络代理/);
  assert.match(appSource, /启用 Codex 直连代理/);
  assert.match(appSource, /const proxyEnabled = form\.codexNetworkProxyEnabled && officialNetworkProxyAllowed/);
  assert.match(appSource, /function isOfficialNetworkProxyAllowed/);
  assert.match(appSource, /codexNetworkProxyEnabled: alreadyUsingOfficial \? normalized\.codexNetworkProxyEnabled : true/);
  assert.match(appSource, /codexNetworkProxyAvailable: false/);
  assert.doesNotMatch(appSource, /测试代理连通性/);
  assert.doesNotMatch(appSource, /自动检测 v2rayN\/xray 本地代理/);
  assert.doesNotMatch(appSource, /代理协议/);
  assert.doesNotMatch(appSource, /代理主机/);
  assert.doesNotMatch(appSource, /代理端口/);
  assert.doesNotMatch(appSource, /当前状态/);
});
