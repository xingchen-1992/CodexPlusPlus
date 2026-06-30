import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appSource = fs.readFileSync(new URL("../App.tsx", import.meta.url), "utf8");

test("Codex CLI tools are consolidated into the maintenance page", () => {
  const routeType = appSource.match(/type Route = ([^;]+);/);
  assert.ok(routeType, "Route type should exist");
  assert.equal(routeType[1].includes('"codexCli"'), false, "Codex CLI should not be a standalone route");

  const routes = appSource.match(/const routes:[\s\S]*?=\s*\[([\s\S]*?)\];/);
  assert.ok(routes, "routes should exist");
  assert.equal(routes[1].includes('id: "codexCli"'), false, "Sidebar should not show a standalone Codex CLI entry");

  assert.equal(appSource.includes('route === "codexCli"'), false, "App should not render a standalone Codex CLI screen");
  assert.equal(appSource.includes("function CodexCliScreen"), false, "Standalone Codex CLI screen should be removed");

  const maintenance = appSource.match(/function MaintenanceScreen[\s\S]*?\n}\n\nfunction AboutScreen/);
  assert.ok(maintenance, "MaintenanceScreen should exist");
  assert.match(maintenance[0], /<OfficialSetupPanel\s+mode="full"/);
  assert.match(maintenance[0], /onCopyDesktopPrompt=\{\(\) => void actions\.copyCodexCliPrompt\(\)\}/);
  assert.match(maintenance[0], /onInstallCodexCli=\{\(\) => void actions\.installCodexCliEnvironment\(\)\}/);
  assert.match(maintenance[0], /onOpenNodeInstaller=\{\(\) => void actions\.openNodeInstaller\(\)\}/);
});
