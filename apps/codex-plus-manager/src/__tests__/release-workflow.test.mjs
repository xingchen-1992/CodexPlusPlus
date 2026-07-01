import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflowSource = fs.readFileSync(new URL("../../../../.github/workflows/release-assets.yml", import.meta.url), "utf8");
const macosPackageSource = fs.readFileSync(new URL("../../../../scripts/installer/macos/package-dmg.sh", import.meta.url), "utf8");

test("release workflow verifies NSIS before building Windows installer", () => {
  assert.match(workflowSource, /Install NSIS with retry/);
  assert.match(workflowSource, /if \(\$LASTEXITCODE -ne 0\)/);
  assert.match(workflowSource, /Get-Command makensis/);
  assert.match(workflowSource, /NSIS makensis\.exe was not found/);
});

test("release workflow publishes a Windows ZIP with bundled Codex MSIX", () => {
  assert.match(workflowSource, /Download Codex Windows MSIX/);
  assert.match(workflowSource, /CodexOfficialApp-x64\.msix/);
  assert.match(workflowSource, /package-root/);
  assert.match(workflowSource, /\$resourcesDir = "\$packageRoot\/安装资源"/);
  assert.match(workflowSource, /Copy-Item \$setup "\$packageRoot\/双击安装\.exe"/);
  assert.match(workflowSource, /Copy-Item \$msix "\$resourcesDir\/CodexOfficialApp-x64\.msix"/);
  assert.equal(workflowSource.includes("请先解压后运行安装程序"), false);
  assert.match(workflowSource, /Compress-Archive/);
  assert.match(workflowSource, /-Path "\$packageRoot\/\*"/);
  assert.match(workflowSource, /CodexPlusOfficial-\$\{version\}-windows-x64\.zip/);
  assert.match(workflowSource, /files: dist\/windows\/\*\.zip/);
});

test("release workflow caches heavyweight dependencies and official app downloads", () => {
  assert.match(workflowSource, /cache: npm/);
  assert.match(workflowSource, /actions\/cache@v4/);
  assert.match(workflowSource, /Swatinem\/rust-cache@v2/);
  assert.match(workflowSource, /Cache Rust build artifacts/);
  assert.match(workflowSource, /mozilla-actions\/sccache-action/);
  assert.match(workflowSource, /Cache Codex Windows MSIX/);
  assert.match(workflowSource, /Cache Codex macOS app zip/);
  assert.match(workflowSource, /npm ci --prefer-offline --no-audit --no-fund/);
  assert.equal(workflowSource.includes("npm install --package-lock=false"), false);
});

test("release workflow bundles a managed Node runtime for clean computers", () => {
  assert.match(workflowSource, /NODE_WINDOWS_X64_ZIP_URL/);
  assert.match(workflowSource, /Cache Node Windows runtime/);
  assert.match(workflowSource, /Download Node Windows runtime/);
  assert.match(workflowSource, /dist\/windows\/app\/resources\/node/);
  assert.match(workflowSource, /NODE_MACOS_ARM64_TGZ_URL/);
  assert.match(workflowSource, /Cache Node macOS runtime/);
  assert.match(workflowSource, /Download Node macOS runtime/);
  assert.match(workflowSource, /NODE_RUNTIME_SOURCE=%s/);
  assert.match(macosPackageSource, /bundle_node_runtime_if_present/);
  assert.match(macosPackageSource, /Contents\/Resources\/node/);
});

test("release workflow bundles official Codex app into macOS DMGs", () => {
  assert.match(workflowSource, /Download Codex macOS app bundle/);
  assert.match(workflowSource, /CODEX_DARWIN_ARCH: \$\{\{ matrix\.arch \}\}/);
  assert.match(workflowSource, /CODEX_MACOS_ARM64_ZIP_URL/);
  assert.match(workflowSource, /Codex-darwin-arm64-26\.623\.70822\.zip/);
  assert.match(workflowSource, /Codex-darwin-x64-26\.623\.70822\.zip/);
  assert.match(workflowSource, /case "\$CODEX_DARWIN_ARCH" in/);
  assert.match(workflowSource, /CODEX_APP_SOURCE=%s/);
  assert.match(workflowSource, /Contents\/Resources\/Codex\.app/);
});
